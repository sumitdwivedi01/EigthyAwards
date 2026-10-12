import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { applicant, applyFully, passDeadline } from "../../../tests/helpers/applying.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { assign, departmentHead, judgingAward, readyToAssign, scoreAndSubmit, submittedEntries, verifyProof, WORKED } from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

describe("assigning applications to jury by hand (spec §5.8, ADR 0013, ADR 0017)", () => {
  it("is refused before the deadline", async () => {
    const award = await judgingAward(app);
    const [entry] = await submittedEntries(app, award, 1);
    await verifyProof(award, entry!.id);
    const res = await assign(award, [entry!.id], [award.jury[0]!.id]);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/after the deadline/);
  });

  it("gives each selected application every chosen juror, and the board counts them", async () => {
    const award = await judgingAward(app, { juryMin: 2, juryMax: 3 });
    const [a, b] = await readyToAssign(app, award, 2);
    const res = await assign(award, [a!.id, b!.id], [award.jury[0]!.id, award.jury[1]!.id]);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const row = res.body.applications.find((x: { id: string }) => x.id === a!.id);
    expect(row).toMatchObject({ assigned: 2, submitted: 0, needs: 0, full: false });
    expect(res.body.jury.find((j: { id: string }) => j.id === award.jury[0]!.id)).toMatchObject({ assigned: 2, submitted: 0, pending: 2 });
    expect(res.body.round.status).toBe("JUDGING");
    expect(await db.evaluation.count({ where: { roundId: award.roundId } })).toBe(4);
    // One email per juror per action, with the count.
    const emails = await db.emailLog.findMany({ where: { template: "jury-assigned" }, select: { to: true, payload: true } });
    expect(emails).toHaveLength(2);
    expect(emails[0]?.payload).toMatchObject({ count: 2 });
  });

  it("shows how many more jury an application needs below the minimum", async () => {
    const award = await judgingAward(app, { juryMin: 2, juryMax: 3 });
    const [a] = await readyToAssign(app, award, 1);
    const res = await assign(award, [a!.id], [award.jury[0]!.id]);
    expect(res.body.applications[0]).toMatchObject({ assigned: 1, needs: 1 });
    expect(res.body.counts.needMoreJury).toBe(1);
  });

  it("refuses going above the maximum, and assigns nothing at all (all or nothing)", async () => {
    const award = await judgingAward(app, { juryMin: 1, juryMax: 2 });
    const [a, b] = await readyToAssign(app, award, 2);
    expect((await assign(award, [a!.id], [award.jury[0]!.id, award.jury[1]!.id])).status).toBe(201);
    const res = await assign(award, [a!.id, b!.id], [award.jury[2]!.id]);
    expect(res.status).toBe(409);
    expect(res.body.error.details.reason).toBe("ASSIGNMENT_REFUSED");
    expect(res.body.error.details.problems[0].message).toMatch(/would have 3 jury; the most is 2/);
    // b was fine, but nothing was assigned.
    expect(await db.evaluation.count({ where: { applicationId: b!.id } })).toBe(0);
  });

  it("never goes above the maximum when two staff assign at the same moment", async () => {
    const award = await judgingAward(app, { juryMin: 1, juryMax: 1 });
    const [a] = await readyToAssign(app, award, 1);
    const other = await signIn(app, (await platformPerson("second.staff@example.test", [{ role: "AWARD_STAFF", awardId: award.awardId }])).email);
    const results = await Promise.all([
      assign(award, [a!.id], [award.jury[0]!.id]),
      other.post(`/api/rounds/${award.roundId}/assignments`).send({ applicationIds: [a!.id], juryUserIds: [award.jury[1]!.id] }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.evaluation.count({ where: { applicationId: a!.id, status: { not: "REVOKED" } } })).toBe(1);
  });

  it("refuses a juror who isn't on the department's list", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    const outsider = await platformPerson("outsider@example.test", []);
    const res = await assign(award, [a!.id], [outsider.id]);
    expect(res.status).toBe(409);
    expect(res.body.error.details.problems[0].message).toMatch(/isn't on the department's jury list/);
  });

  it("refuses the department's own head, even if a role row puts them on the list", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    const head = await platformPerson("head.too@example.test", [
      { role: "DEPT_HEAD", departmentId: award.departmentId },
      { role: "JURY", departmentId: award.departmentId },
    ]);
    const res = await assign(award, [a!.id], [head.id]);
    expect(res.status).toBe(409);
    const board = await award.staff.get(`/api/rounds/${award.roundId}/assignment-board`);
    expect(board.body.jury.map((j: { id: string }) => j.id)).not.toContain(head.id);
  });

  it("refuses the same juror twice", async () => {
    const award = await judgingAward(app, { juryMin: 1, juryMax: 3 });
    const [a] = await readyToAssign(app, award, 1);
    expect((await assign(award, [a!.id], [award.jury[0]!.id])).status).toBe(201);
    const res = await assign(award, [a!.id], [award.jury[0]!.id]);
    expect(res.status).toBe(409);
    expect(res.body.error.details.problems[0].message).toMatch(/already has/);
  });

  it("refuses an application whose proof isn't verified", async () => {
    const award = await judgingAward(app);
    const [pending, rejected] = await submittedEntries(app, award, 2);
    const reject = await award.staff.post(`/api/applications/${rejected!.id}/proof-check`).send({ decision: "REJECTED", note: "The ID card is blurred." });
    expect(reject.status).toBe(200);
    await passDeadline(award.cycleId);
    const res = await assign(award, [pending!.id, rejected!.id], [award.jury[0]!.id]);
    expect(res.status).toBe(409);
    const messages = res.body.error.details.problems.map((p: { message: string }) => p.message).join(" ");
    expect(messages).toMatch(/proof hasn't been checked/);
    expect(messages).toMatch(/proof was rejected/);
    const board = await award.staff.get(`/api/rounds/${award.roundId}/assignment-board`);
    expect(board.body.counts).toMatchObject({ eligible: 0, proofPending: 1, proofRejected: 1 });
  });

  it("is staff only: the head and the leader read the board but can't assign", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    const head = await departmentHead(app, award.departmentId);
    const leader = await signIn(app, (await platformPerson("leader@example.test", [{ role: "LEADER" }])).email);
    for (const agent of [head, leader]) {
      const board = await agent.get(`/api/rounds/${award.roundId}/assignment-board`);
      expect(board.status).toBe(200);
      expect(board.body.can.assign).toBe(false);
      const res = await agent.post(`/api/rounds/${award.roundId}/assignments`).send({ applicationIds: [a!.id], juryUserIds: [award.jury[0]!.id] });
      expect(res.status).toBe(403);
    }
    // Staff of another award can't even read it.
    const stranger = await signIn(app, (await platformPerson("other.staff@example.test", [])).email);
    expect((await stranger.get(`/api/rounds/${award.roundId}/assignment-board`)).status).toBe(403);
  });

  it("takes an unsubmitted assignment back with a reason, and keeps it", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id]);
    const evaluation = await db.evaluation.findFirstOrThrow({ where: { applicationId: a!.id } });
    expect((await award.staff.post(`/api/evaluations/${evaluation.id}/revoke`).send({})).status).toBe(400);
    const res = await award.staff.post(`/api/evaluations/${evaluation.id}/revoke`).send({ reason: "Juror is travelling" });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.applications[0]).toMatchObject({ assigned: 0, needs: 1 });
    expect(await db.evaluation.findUniqueOrThrow({ where: { id: evaluation.id } })).toMatchObject({ status: "REVOKED", revokedReason: "Juror is travelling" });
    // Reassigning: someone else now.
    expect((await assign(award, [a!.id], [award.jury[1]!.id])).status).toBe(201);
  });

  it("refuses taking back a submitted evaluation", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id]);
    const id = await scoreAndSubmit(award, award.jury[0]!, a!.id, WORKED[0]);
    const res = await award.staff.post(`/api/evaluations/${id}/revoke`).send({ reason: "Changed my mind" });
    expect(res.status).toBe(409);
  });

  it("lets the jury per application change until the round is sent, never below what an application has", async () => {
    const award = await judgingAward(app, { juryMin: 1, juryMax: 3 });
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id, award.jury[1]!.id]);
    expect((await award.staff.patch(`/api/rounds/${award.roundId}`).send({ juryMax: 1 })).status).toBe(400);
    expect((await award.staff.patch(`/api/rounds/${award.roundId}`).send({ juryMax: 4 })).body.error.message).toMatch(/jury list has 3/);
    const raised = await award.staff.patch(`/api/rounds/${award.roundId}`).send({ juryMin: 3 });
    expect(raised.status, JSON.stringify(raised.body)).toBe(200);
    const board = await award.staff.get(`/api/rounds/${award.roundId}/assignment-board`);
    expect(board.body.applications[0]).toMatchObject({ assigned: 2, needs: 1 });
    // The result names are fixed once judging has started.
    const labels = await award.staff.patch(`/api/rounds/${award.roundId}`).send({ resultLabels: [{ label: "Winner", advances: true }, { label: "Not selected" }] });
    expect(labels.status).toBe(409);
  });

  it("freezes the proof check once an application is assigned", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id]);
    const res = await award.staff.post(`/api/applications/${a!.id}/proof-check`).send({ decision: "REJECTED", note: "Second look: the ID card is blurred." });
    expect(res.status).toBe(409);
  });

  it("only assigns applications of its own edition", async () => {
    const award = await judgingAward(app);
    const elsewhere = await judgingAward(app);
    const person = await applicant(app);
    const { id } = await applyFully(person, elsewhere);
    await passDeadline(award.cycleId);
    const res = await assign(award, [id], [award.jury[0]!.id]);
    expect(res.status).toBe(409);
    expect(res.body.error.details.problems[0].message).toMatch(/isn't part of this edition/);
  });
});
