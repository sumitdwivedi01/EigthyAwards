import type { Express } from "express";
import type request from "supertest";
import { expect } from "vitest";
import { db } from "../../src/lib/db.js";
import { createAwardDomain, createDepartment } from "./factories.js";
import { platformPerson, signIn } from "./http.js";

/**
 * A department with its staff member signed in and a jury list, ready to set up awards through
 * the API, the way staff do on screen.
 */
export async function staffWithDepartment(app: Express, options: { jury?: number; email?: string } = {}) {
  const department = await createDepartment();
  const domain = await createAwardDomain();
  const email = options.email ?? "staff@example.test";
  await platformPerson(email, [{ role: "DEPT_STAFF", departmentId: department.id }]);
  for (let i = 0; i < (options.jury ?? 3); i += 1) {
    await platformPerson(`juror${i}.${department.id.slice(0, 6)}@example.test`, [{ role: "JURY", departmentId: department.id }]);
  }
  const staff = await signIn(app, email);
  return { department, domain, staff };
}

export const DAY = 24 * 60 * 60 * 1000;

/** Opening yesterday, closing in 30 days: open for applications as soon as it is published. */
export function openDates(now = Date.now()) {
  return { opensAt: new Date(now - DAY).toISOString(), deadlineAt: new Date(now + 30 * DAY).toISOString() };
}

export async function createAwardWithCycle(staff: request.Agent, departmentId: string, domainId: string, name = "Safety Excellence Award") {
  const award = await staff.post("/api/awards").send({ departmentId, domainId, name, description: "Safest plants of the year." });
  expect(award.status, JSON.stringify(award.body)).toBe(201);
  const cycle = await staff.post(`/api/awards/${award.body.id}/cycles`).send({ label: "2026", ...openDates() });
  expect(cycle.status, JSON.stringify(cycle.body)).toBe(201);
  return { awardId: award.body.id as string, cycleId: cycle.body.id as string, roundId: cycle.body.round.id as string };
}

/** Two sections, one with a text and a yes/no question, one with a choice; published as version 1. */
export const SAMPLE_FORM = {
  sections: [
    {
      title: "Training",
      questions: [
        { type: "LONG_TEXT", label: "Describe your safety training" },
        { type: "YES_NO", label: "Did an external auditor visit this year?" },
      ],
    },
    {
      title: "Incidents",
      questions: [{ type: "SINGLE_CHOICE", label: "How are incidents reported?", options: [{ label: "On paper" }, { label: "In an app" }] }],
    },
  ],
};

/** Everything the publish check asks for: a category, published questions, a complete scoring sheet. */
export async function completeSetup(staff: request.Agent, cycleId: string, roundId: string) {
  expect((await staff.post(`/api/cycles/${cycleId}/categories`).send({ name: "Large manufacturing" })).status).toBe(201);
  const draft = await staff.put(`/api/cycles/${cycleId}/form-draft`).send(SAMPLE_FORM);
  expect(draft.status, JSON.stringify(draft.body)).toBe(200);
  const published = await staff.post(`/api/cycles/${cycleId}/form-versions`).send({ changeSummary: "First version" });
  expect(published.status, JSON.stringify(published.body)).toBe(201);
  const [training, incidents] = published.body.draft.sections;
  const sheet = await staff.put(`/api/rounds/${roundId}/scoring-sheet`).send({
    sections: [
      {
        title: "Training",
        weight: 40,
        indicators: [
          { label: "Quality of training", type: "SCORE", weight: 60, questionKey: training.questions[0].key },
          { label: "External audit", type: "YES_NO", weight: 40, questionKey: training.questions[1].key },
        ],
      },
      {
        title: "Incidents",
        weight: 60,
        indicators: [{ label: "Reporting", type: "SCORE", weight: 100, questionKey: incidents.questions[0].key }],
      },
    ],
  });
  expect(sheet.status, JSON.stringify(sheet.body)).toBe(200);
  expect(sheet.body.issues).toEqual([]);
}

export async function auditActions(): Promise<string[]> {
  return (await db.auditEvent.findMany({ select: { action: true }, orderBy: { createdAt: "asc" } })).map((e) => e.action);
}
