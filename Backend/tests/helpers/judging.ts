import type { Express } from "express";
import type request from "supertest";
import { expect } from "vitest";
import { db } from "../../src/lib/db.js";
import { applicant, applyFully, openAward, passDeadline, type Applicant, type AwardOptions, type OpenAward } from "./applying.js";
import { platformPerson, signIn } from "./http.js";

/**
 * A published award ready for judging, set up through the API as staff do on screen: the jury on
 * the department's list, the scoring sheet of ADR 0019's worked example (two sections, four
 * indicators, one Yes/No), and the jury per application.
 */

export interface Juror {
  id: string;
  email: string;
  agent: request.Agent;
}

export interface JudgingAward extends OpenAward {
  jury: Juror[];
  /** The indicator keys of the worked example. */
  ind: { oxygen: string; shade: string; training: string; audit: string };
}

export interface JudgingOptions extends AwardOptions {
  jury?: number;
  juryMin?: number;
  juryMax?: number;
}

export async function judgingAward(app: Express, options: JudgingOptions = {}): Promise<JudgingAward> {
  const award = await openAward(app, options);
  // openAward's department has one juror; add the rest.
  const first = await db.roleAssignment.findFirstOrThrow({
    where: { departmentId: award.departmentId, role: "JURY" },
    select: { user: { select: { id: true, email: true } } },
  });
  const jury: Juror[] = [{ id: first.user.id, email: first.user.email, agent: await signIn(app, first.user.email) }];
  for (let i = 1; i < (options.jury ?? 3); i += 1) {
    const email = `judge${i}.${award.departmentId.slice(0, 6)}@example.test`;
    const user = await platformPerson(email, [{ role: "JURY", departmentId: award.departmentId }]);
    jury.push({ id: user.id, email, agent: await signIn(app, email) });
  }

  // ADR 0019's worked example: Environment (40) with Oxygen (60) and Shade (40); Safety (60) with
  // Training (50) and an audit Yes/No (50).
  const sheet = await award.staff.put(`/api/rounds/${award.roundId}/scoring-sheet`).send({
    sections: [
      {
        title: "Environment",
        weight: 40,
        indicators: [
          { label: "Oxygen efficiency", type: "SCORE", weight: 60, questionKey: award.q.siteName },
          { label: "Shade", type: "SCORE", weight: 40, questionKey: award.q.employees },
        ],
      },
      {
        title: "Safety",
        weight: 60,
        indicators: [
          { label: "Training", type: "SCORE", weight: 50, questionKey: award.q.training },
          { label: "Audit passed", type: "YES_NO", weight: 50, questionKey: award.q.audit },
        ],
      },
    ],
  });
  expect(sheet.status, JSON.stringify(sheet.body)).toBe(200);
  expect(sheet.body.issues).toEqual([]);
  const [environment, safety] = sheet.body.sections;
  const ind = {
    oxygen: environment.indicators[0].key as string,
    shade: environment.indicators[1].key as string,
    training: safety.indicators[0].key as string,
    audit: safety.indicators[1].key as string,
  };
  if (options.juryMin !== undefined || options.juryMax !== undefined) {
    const round = await award.staff.patch(`/api/rounds/${award.roundId}`).send({ juryMin: options.juryMin ?? 1, juryMax: options.juryMax ?? 1 });
    expect(round.status, JSON.stringify(round.body)).toBe(200);
  }
  return { ...award, jury, ind };
}

export interface Entry {
  id: string;
  person: Applicant;
}

/** Applicants from new organisations, each with a full, submitted application. */
export async function submittedEntries(app: Express, award: OpenAward, count: number, categoryId = award.categories.general): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let i = 0; i < count; i += 1) {
    const person = await applicant(app);
    const { id, submitted } = await applyFully(person, award, categoryId);
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(200);
    entries.push({ id, person });
  }
  return entries;
}

export async function verifyProof(award: OpenAward, applicationId: string): Promise<void> {
  const res = await award.staff.post(`/api/applications/${applicationId}/proof-check`).send({ decision: "VERIFIED" });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
}

/** Submitted entries with verified proof, after the deadline: ready to assign. */
export async function readyToAssign(app: Express, award: OpenAward, count: number): Promise<Entry[]> {
  const entries = await submittedEntries(app, award, count);
  for (const entry of entries) await verifyProof(award, entry.id);
  await passDeadline(award.cycleId);
  return entries;
}

export async function assign(award: OpenAward, applicationIds: string[], juryUserIds: string[]) {
  return award.staff.post(`/api/rounds/${award.roundId}/assignments`).send({ applicationIds, juryUserIds });
}

export async function evaluationOf(applicationId: string, juryUserId: string): Promise<string> {
  const evaluation = await db.evaluation.findFirstOrThrow({
    where: { applicationId, juryUserId, status: { not: "REVOKED" } },
    select: { id: true },
  });
  return evaluation.id;
}

export interface Marks {
  oxygen: number;
  shade: number;
  training: number;
  /** 1 = Yes, 0 = No. */
  audit: number;
}

/** A jury member marks every indicator, writes the note and submits. */
export async function scoreAndSubmit(award: JudgingAward, juror: Juror, applicationId: string, marks: Marks, note = "Clear and well evidenced.") {
  const id = await evaluationOf(applicationId, juror.id);
  const saved = await juror.agent.put(`/api/evaluations/${id}/scores`).send({
    scores: { [award.ind.oxygen]: marks.oxygen, [award.ind.shade]: marks.shade, [award.ind.training]: marks.training, [award.ind.audit]: marks.audit },
    overallNote: note,
  });
  expect(saved.status, JSON.stringify(saved.body)).toBe(200);
  const submitted = await juror.agent.post(`/api/evaluations/${id}/submit`).send({});
  expect(submitted.status, JSON.stringify(submitted.body)).toBe(200);
  return id;
}

/** The worked example's three jurors (ADR 0019): points 78,200, 79,200 and 50,400; final 69.27. */
export const WORKED: [Marks, Marks, Marks] = [
  { oxygen: 8, shade: 5, training: 7, audit: 1 },
  { oxygen: 9, shade: 6, training: 6, audit: 1 },
  { oxygen: 7, shade: 6, training: 8, audit: 0 },
];

/** The department's head, signed in. */
export async function departmentHead(app: Express, departmentId: string, email = `head.${departmentId.slice(0, 6)}@example.test`) {
  await platformPerson(email, [{ role: "DEPT_HEAD", departmentId }]);
  return signIn(app, email);
}
