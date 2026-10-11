import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type request from "supertest";
import { expect } from "vitest";
import { db } from "../../src/lib/db.js";
import { istToday } from "../../src/modules/applications/dates.js";
import { createAwardWithCycle, staffWithDepartment } from "./award-setup.js";
import { createOrganisation } from "./factories.js";
import { applicantPerson, signIn } from "./http.js";

/** Tiny files whose first bytes are what they claim to be. */
export const PDF = Buffer.from("%PDF-1.4\n% a tiny test document\n");
export const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** One question of each Phase 1 type; every one is required except the file question. */
export const APPLY_FORM = {
  sections: [
    {
      title: "About the site",
      questions: [
        { type: "SHORT_TEXT", label: "Site name", maxLength: 40 },
        { type: "NUMBER", label: "Employees", min: 1, max: 100_000 },
        { type: "SINGLE_CHOICE", label: "Sector", options: [{ label: "Steel" }, { label: "Cement" }] },
      ],
    },
    {
      title: "Safety",
      questions: [
        { type: "LONG_TEXT", label: "How do you train people?" },
        { type: "YES_NO", label: "External audit this year?" },
        { type: "FILE_UPLOAD", label: "Audit report", required: false, maxFiles: 2, fileTypes: ["pdf", "png"] },
      ],
    },
  ],
};

export interface Questions {
  siteName: string;
  employees: string;
  sector: string;
  sectorSteel: string;
  training: string;
  audit: string;
  report: string;
}

export interface OpenAward {
  staff: request.Agent;
  departmentId: string;
  awardId: string;
  cycleId: string;
  roundId: string;
  categories: { general: string; large: string };
  q: Questions;
}

export interface AwardOptions {
  feePaise?: number;
  /** The "Large" category's own fee; by default it uses the cycle's fee. */
  largeFeePaise?: number | null;
  maxEntries?: number | null;
  blindJudging?: boolean;
}

/** A published award, open for applications, set up through the API as staff do on screen. */
export async function openAward(app: Express, options: AwardOptions = {}): Promise<OpenAward> {
  const tag = randomUUID().slice(0, 8);
  const { staff, department, domain } = await staffWithDepartment(app, { email: `staff.${tag}@example.test`, jury: 1 });
  const ids = await createAwardWithCycle(staff, department.id, domain.id, `Award ${tag}`);
  const general = await staff.post(`/api/cycles/${ids.cycleId}/categories`).send({ name: "General" });
  const large = await staff.post(`/api/cycles/${ids.cycleId}/categories`).send({ name: "Large", feePaise: options.largeFeePaise ?? null });
  expect(large.status, JSON.stringify(large.body)).toBe(201);
  const categories = {
    general: general.body.categories.find((c: { name: string }) => c.name === "General").id as string,
    large: large.body.categories.find((c: { name: string }) => c.name === "Large").id as string,
  };
  const draft = await staff.put(`/api/cycles/${ids.cycleId}/form-draft`).send(APPLY_FORM);
  expect(draft.status, JSON.stringify(draft.body)).toBe(200);
  const published = await staff.post(`/api/cycles/${ids.cycleId}/form-versions`).send({ changeSummary: "First version" });
  expect(published.status, JSON.stringify(published.body)).toBe(201);
  const [about, safety] = published.body.draft.sections;
  const q: Questions = {
    siteName: about.questions[0].key,
    employees: about.questions[1].key,
    sector: about.questions[2].key,
    sectorSteel: about.questions[2].options[0].key,
    training: safety.questions[0].key,
    audit: safety.questions[1].key,
    report: safety.questions[2].key,
  };
  const sheet = await staff.put(`/api/rounds/${ids.roundId}/scoring-sheet`).send({
    sections: [{ title: "Safety", weight: 100, indicators: [{ label: "Training", type: "SCORE", weight: 100, questionKey: q.training }] }],
  });
  expect(sheet.body.issues, JSON.stringify(sheet.body)).toEqual([]);
  const settings = {
    feePaise: options.feePaise ?? 0,
    blindJudging: options.blindJudging ?? false,
    ...(options.maxEntries !== undefined && { maxEntries: options.maxEntries }),
  };
  expect((await staff.patch(`/api/cycles/${ids.cycleId}`).send(settings)).status).toBe(200);
  const publishedCycle = await staff.post(`/api/cycles/${ids.cycleId}/publish`).send({});
  expect(publishedCycle.status, JSON.stringify(publishedCycle.body)).toBe(200);
  return { staff, departmentId: department.id, awardId: ids.awardId, cycleId: ids.cycleId, roundId: ids.roundId, categories, q };
}

/** Every required answer, valid. */
export function completeAnswers(q: Questions) {
  return {
    [q.siteName]: "Pune works",
    [q.employees]: 1200,
    [q.sector]: q.sectorSteel,
    [q.training]: "Every shift starts with a ten-minute safety talk.",
    [q.audit]: true,
  };
}

export async function addIdentityDocument(agent: request.Agent): Promise<string> {
  const started = await agent
    .post("/api/me/identity-document/uploads")
    .send({ fileName: "passport.pdf", contentType: "application/pdf", sizeBytes: PDF.length, consent: true });
  expect(started.status, JSON.stringify(started.body)).toBe(201);
  expect((await agent.put(started.body.upload.url).set("Content-Type", "application/pdf").send(PDF)).status).toBe(204);
  expect((await agent.put("/api/me/identity-document").send({ fileId: started.body.fileId })).status).toBe(200);
  return started.body.fileId as string;
}

export async function setLinkedin(agent: request.Agent, url = "https://www.linkedin.com/in/test-person"): Promise<void> {
  expect((await agent.put("/api/me/linkedin").send({ url })).status).toBe(200);
}

export interface Applicant {
  userId: string;
  email: string;
  organisationId: string;
  agent: request.Agent;
}

/** An applicant in an organisation (a new one unless given), with the profile proof unless told not to. */
export async function applicant(
  app: Express,
  options: { organisationId?: string; profile?: boolean; email?: string } = {},
): Promise<Applicant> {
  const email = options.email ?? `applicant.${randomUUID().slice(0, 8)}@example.test`;
  const user = await applicantPerson(email);
  const organisationId = options.organisationId ?? (await createOrganisation()).id;
  await db.organisationMember.create({ data: { organisationId, userId: user.id } });
  const agent = await signIn(app, email);
  if (options.profile !== false) {
    await addIdentityDocument(agent);
    await setLinkedin(agent);
  }
  return { userId: user.id, email, organisationId, agent };
}

export async function start(person: Applicant, award: OpenAward, categoryId = award.categories.general) {
  return person.agent.post(`/api/cycles/${award.cycleId}/applications`).send({ categoryId });
}

/** Uploads a proof of employment dated `documentDate` (today in India by default) and makes it current. */
export async function addEmploymentProof(agent: request.Agent, applicationId: string, documentDate = istToday(new Date())) {
  const started = await agent
    .post(`/api/applications/${applicationId}/employment-proof/uploads`)
    .send({ fileName: "id-card.pdf", contentType: "application/pdf", sizeBytes: PDF.length, documentDate, consent: true });
  if (started.status !== 201) return started;
  expect((await agent.put(started.body.upload.url).set("Content-Type", "application/pdf").send(PDF)).status).toBe(204);
  return agent.put(`/api/applications/${applicationId}/employment-proof`).send({ fileId: started.body.fileId });
}

export async function addEvidence(agent: request.Agent, applicationId: string, questionKey: string, bytes = PDF, contentType = "application/pdf") {
  const started = await agent
    .post(`/api/applications/${applicationId}/files`)
    .send({ questionKey, fileName: "report.pdf", contentType, sizeBytes: bytes.length });
  if (started.status !== 201) return started;
  expect((await agent.put(started.body.upload.url).set("Content-Type", contentType).send(bytes)).status).toBe(204);
  return agent.put(`/api/applications/${applicationId}/files/${started.body.fileId}`).send({});
}

/** Starts, pays if needed, answers everything, adds the proof and submits; returns the submit response. */
export async function applyFully(person: Applicant, award: OpenAward, categoryId = award.categories.general) {
  const started = await start(person, award, categoryId);
  expect(started.status, JSON.stringify(started.body)).toBe(201);
  const id = started.body.id as string;
  if (!started.body.fee.paid && started.body.fee.amountPaise > 0) {
    expect((await person.agent.post(`/api/applications/${id}/payment`).send({})).status).toBe(200);
  }
  const saved = await person.agent.put(`/api/applications/${id}/answers`).send({ answers: completeAnswers(award.q) });
  expect(saved.body.problems, JSON.stringify(saved.body)).toEqual([]);
  expect((await addEmploymentProof(person.agent, id)).status).toBe(200);
  const submitted = await person.agent.post(`/api/applications/${id}/submit`).send({});
  return { id, submitted };
}

/** Moves the cycle's deadline into the past (the clock can't jump: sessions would expire). */
export async function passDeadline(cycleId: string): Promise<void> {
  await db.cycle.update({ where: { id: cycleId }, data: { deadlineAt: new Date(Date.now() - 60_000) } });
}
