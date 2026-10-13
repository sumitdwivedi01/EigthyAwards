import type request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import {
  addEmploymentProof,
  addEvidence,
  applicant,
  completeAnswers,
  passDeadline,
  start,
} from "../../../tests/helpers/applying.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { createOrganisation } from "../../../tests/helpers/factories.js";
import { assign, evaluationOf, judgingAward, scoreAndSubmit, verifyProof, WORKED, type JudgingAward } from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

/**
 * Rule R1: "if an award uses blind judging, a jury member cannot see who applied" (the brief;
 * spec §5.7, ADR 0018). The jury views are built from an allow-list, so these tests read every
 * jury response whole and look for anything that identifies the organisation or the applicant.
 */

const ORGANISATION = {
  legalName: "Zenith Forge Private Ltd",
  addressLine: "77 Lotus Road, Satpur MIDC",
  city: "Nashik",
  pincode: "422007",
  officialEmail: "office@zenithforge.example.test",
  phone: "+919812345678",
};

async function entryWithEvidence(award: JudgingAward) {
  const organisation = await createOrganisation(ORGANISATION);
  const person = await applicant(app, { organisationId: organisation.id, email: "meenakshi.blindtest@example.test" });
  const started = await start(person, award);
  const id = started.body.id as string;
  expect((await person.agent.put(`/api/applications/${id}/answers`).send({ answers: completeAnswers(award.q) })).body.problems).toEqual([]);
  expect((await addEvidence(person.agent, id, award.q.report)).status).toBe(200);
  expect((await addEmploymentProof(person.agent, id)).status).toBe(200);
  expect((await person.agent.post(`/api/applications/${id}/submit`).send({})).status).toBe(200);
  await verifyProof(award, id);
  await passDeadline(award.cycleId);
  return { id, organisation, person };
}

/** Everything that would tell a juror who applied. */
function identifying(organisation: { legalName: string; pan: string; gstin: string | null; officialEmail: string; addressLine: string; phone: string }) {
  return [
    organisation.legalName,
    organisation.pan,
    organisation.gstin ?? "",
    organisation.officialEmail,
    organisation.addressLine,
    organisation.phone,
    "meenakshi.blindtest",
    "Nashik",
    "422007",
  ].filter((value) => value.length > 0);
}

function expectNoneOf(body: unknown, values: string[]): void {
  const text = JSON.stringify(body);
  for (const value of values) expect(text, `the jury response contains "${value}"`).not.toContain(value);
}

async function juryResponses(agent: request.Agent, evaluationId: string, award: JudgingAward) {
  return [
    await agent.get("/api/jury/evaluations"),
    await agent.get(`/api/evaluations/${evaluationId}`),
    await agent.put(`/api/evaluations/${evaluationId}/scores`).send({ scores: { [award.ind.oxygen]: 7 }, overallNote: "Draft" }),
    // A refused submit's error, too.
    await agent.post(`/api/evaluations/${evaluationId}/submit`).send({}),
  ];
}

describe("rule R1: blind judging", () => {
  it("never puts the organisation's details, the applicant or a file in any jury response of a blind award", async () => {
    const award = await judgingAward(app, { blindJudging: true });
    const { id, organisation } = await entryWithEvidence(award);
    const juror = award.jury[0]!;
    expect((await assign(award, [id], [juror.id])).status).toBe(201);
    const evaluationId = await evaluationOf(id, juror.id);

    const responses = await juryResponses(juror.agent, evaluationId, award);
    for (const res of responses) expectNoneOf(res.body, identifying(organisation));
    const view = responses[1]!.body;
    expect(view.organisation).toBeNull();
    // The answers as typed are there; the file question shows no files.
    const questions = view.sections.flatMap((s: { questions: unknown[] }) => s.questions);
    expect(questions.find((q: { key: string }) => q.key === award.q.training).answer).toBe("Every shift starts with a ten-minute safety talk.");
    expect(questions.find((q: { key: string }) => q.key === award.q.report)).toMatchObject({ files: [], filesHidden: true, answer: null });
    expect(JSON.stringify(view)).not.toMatch(/fileName|storageKey|identitySnapshot|proof|payment/i);
  });

  it("refuses a jury member's download of any file in a blind award", async () => {
    const award = await judgingAward(app, { blindJudging: true });
    const { id } = await entryWithEvidence(award);
    const juror = award.jury[0]!;
    await assign(award, [id], [juror.id]);
    const evidence = await db.fileAsset.findFirstOrThrow({ where: { applicationId: id, kind: "EVIDENCE" } });
    expect((await juror.agent.get(`/api/files/${evidence.id}`)).status).toBe(404);
    // Staff still can.
    expect((await award.staff.get(`/api/files/${evidence.id}`)).status).toBe(200);
  });

  it("shows the answers, the evidence files and the organisation's name and place in an award that isn't blind, never its PAN, contacts or the applicant", async () => {
    const award = await judgingAward(app, { blindJudging: false });
    const { id, organisation } = await entryWithEvidence(award);
    const juror = award.jury[0]!;
    await assign(award, [id], [juror.id]);
    const view = (await juror.agent.get(`/api/evaluations/${await evaluationOf(id, juror.id)}`)).body;
    expect(view.organisation).toMatchObject({ name: ORGANISATION.legalName, city: "Nashik", state: "Maharashtra" });
    const report = view.sections.flatMap((s: { questions: { key: string }[] }) => s.questions).find((q: { key: string }) => q.key === award.q.report);
    expect(report.files).toHaveLength(1);
    expect((await juror.agent.get(`/api/files/${report.files[0].id}`)).status).toBe(200);
    expectNoneOf(view, [organisation.pan, organisation.gstin ?? "", organisation.officialEmail, organisation.addressLine, organisation.phone, "meenakshi.blindtest"]);
    const home = (await juror.agent.get("/api/jury/evaluations")).body;
    expect(home.departments[0].cycles[0].items[0].organisationName).toBe(ORGANISATION.legalName);
  });

  it("never lets a jury member read a proof document, blind or not", async () => {
    const award = await judgingAward(app, { blindJudging: false });
    const { id, person } = await entryWithEvidence(award);
    const juror = award.jury[0]!;
    await assign(award, [id], [juror.id]);
    const proofs = await db.fileAsset.findMany({ where: { OR: [{ applicationId: id, kind: "EMPLOYMENT_PROOF" }, { ownerUserId: person.userId, kind: "IDENTITY_PROOF" }] } });
    expect(proofs.length).toBeGreaterThanOrEqual(2);
    for (const proof of proofs) expect((await juror.agent.get(`/api/files/${proof.id}`)).status).toBe(404);
  });

  it("never shows a jury member another juror's work, a total or the average", async () => {
    const award = await judgingAward(app, { juryMin: 2, juryMax: 2 });
    const { id } = await entryWithEvidence(award);
    const [first, second] = [award.jury[0]!, award.jury[1]!];
    await assign(award, [id], [first.id, second.id]);
    await scoreAndSubmit(award, first, id, WORKED[0], "A distinctive first note");
    const evaluationId = await evaluationOf(id, second.id);
    const responses = await juryResponses(second.agent, evaluationId, award);
    for (const res of responses) {
      expectNoneOf(res.body, [first.email, "A distinctive first note", "78.20", "78200"]);
      expect(JSON.stringify(res.body)).not.toMatch(/"(points|final|average|totalPoints|score)"/);
    }
    const firstName = (await db.user.findUniqueOrThrow({ where: { id: first.id } })).name;
    for (const res of responses) expect(JSON.stringify(res.body)).not.toContain(firstName);
  });

  it("answers another juror's evaluation with 404", async () => {
    const award = await judgingAward(app);
    const { id } = await entryWithEvidence(award);
    await assign(award, [id], [award.jury[0]!.id]);
    const evaluationId = await evaluationOf(id, award.jury[0]!.id);
    for (const path of [`/api/evaluations/${evaluationId}`]) {
      expect((await award.jury[1]!.agent.get(path)).status).toBe(404);
    }
    expect((await award.jury[1]!.agent.put(`/api/evaluations/${evaluationId}/scores`).send({ overallNote: "x" })).status).toBe(404);
    expect((await award.jury[1]!.agent.post(`/api/evaluations/${evaluationId}/submit`).send({})).status).toBe(404);
  });
});
