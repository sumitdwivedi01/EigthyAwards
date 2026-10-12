import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { assign, departmentHead, judgingAward, readyToAssign, scoreAndSubmit, WORKED } from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

/**
 * Rule R3: "every score change after submission records who, when, old value, new value and why.
 * Approved rounds can't be changed." (the brief; spec §5.11, §5.15).
 */

async function submittedOne() {
  const award = await judgingAward(app);
  const [entry] = await readyToAssign(app, award, 1);
  await assign(award, [entry!.id], [award.jury[0]!.id]);
  const evaluationId = await scoreAndSubmit(award, award.jury[0]!, entry!.id, WORKED[0]);
  return { award, entry: entry!, evaluationId };
}

describe("rule R3: score changes after submission", () => {
  it("refuses a change without a reason", async () => {
    const { award, evaluationId } = await submittedOne();
    const res = await award.staff.post(`/api/evaluations/${evaluationId}/score-changes`).send({ changes: [{ indicatorKey: award.ind.training, value: 9 }] });
    expect(res.status).toBe(400);
    const blank = await award.staff.post(`/api/evaluations/${evaluationId}/score-changes`).send({ changes: [{ indicatorKey: award.ind.training, value: 9 }], reason: "  " });
    expect(blank.status).toBe(400);
    expect(await db.indicatorScore.findFirstOrThrow({ where: { evaluationId, indicatorKey: award.ind.training } })).toMatchObject({ value: 7 });
  });

  it("records who, when, the old value, the new value and why, and the final score follows", async () => {
    const { award, entry, evaluationId } = await submittedOne();
    const before = Date.now();
    const res = await award.staff
      .post(`/api/evaluations/${evaluationId}/score-changes`)
      .send({ changes: [{ indicatorKey: award.ind.training, value: 9 }], reason: "Juror typed 7 for 9, confirmed by phone" });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    // 78,200 + 60 × 50 × 2 = 84,200.
    expect(res.body.applications[0].final).toEqual({ totalPoints: 84_200, count: 1, display: "84.20" });
    const event = await db.auditEvent.findFirstOrThrow({ where: { action: "score.changed" } });
    const staff = await db.user.findFirstOrThrow({ where: { email: { startsWith: "staff." } } });
    expect(event).toMatchObject({
      actorId: staff.id,
      actorRole: "AWARD_STAFF",
      entityType: "application",
      entityId: entry.id,
      reason: "Juror typed 7 for 9, confirmed by phone",
      before: expect.objectContaining({ evaluationId, indicatorKey: award.ind.training, value: 7 }),
      after: expect.objectContaining({ evaluationId, indicatorKey: award.ind.training, value: 9 }),
    });
    expect(event.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);

    // The application's history shows it to staff, the head and the leader, never the jury.
    const history = await award.staff.get(`/api/applications/${entry.id}/history`);
    expect(history.status).toBe(200);
    expect(history.body[0]).toMatchObject({ action: "score.changed", reason: "Juror typed 7 for 9, confirmed by phone", actorRole: "AWARD_STAFF" });
    expect(history.body[0].summary).toMatch(/Training .*: 7 → 9/);
    const head = await departmentHead(app, award.departmentId);
    expect((await head.get(`/api/applications/${entry.id}/history`)).status).toBe(200);
    expect((await award.jury[0]!.agent.get(`/api/applications/${entry.id}/history`)).status).toBe(403);
  });

  it("rolls the change back when its audit event can't be written", async () => {
    const { award, evaluationId } = await submittedOne();
    // A fault in the audit table, injected for this test only.
    await db.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_score_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'score.changed' THEN RAISE EXCEPTION 'audit write failed (test)'; END IF;
        RETURN NEW;
      END; $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER fail_score_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_score_audit()`);
    try {
      const res = await award.staff
        .post(`/api/evaluations/${evaluationId}/score-changes`)
        .send({ changes: [{ indicatorKey: award.ind.training, value: 9 }], reason: "Correction" });
      expect(res.status).toBe(500);
      expect(await db.indicatorScore.findFirstOrThrow({ where: { evaluationId, indicatorKey: award.ind.training } })).toMatchObject({ value: 7 });
    } finally {
      await db.$executeRawUnsafe("DROP TRIGGER fail_score_audit ON audit_events");
      await db.$executeRawUnsafe("DROP FUNCTION fail_score_audit()");
    }
  });

  it("is staff only: the jury, the head and the leader can't change a submitted score", async () => {
    const { award, evaluationId } = await submittedOne();
    const head = await departmentHead(app, award.departmentId);
    const leader = await signIn(app, (await platformPerson("leader@example.test", [{ role: "LEADER" }])).email);
    const body = { changes: [{ indicatorKey: award.ind.training, value: 9 }], reason: "Correction" };
    for (const agent of [award.jury[0]!.agent, head, leader]) {
      expect((await agent.post(`/api/evaluations/${evaluationId}/score-changes`).send(body)).status).toBe(403);
    }
  });

  it("refuses correcting an evaluation that isn't submitted", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    await assign(award, [entry!.id], [award.jury[0]!.id]);
    const evaluation = await db.evaluation.findFirstOrThrow({ where: { applicationId: entry!.id } });
    const res = await award.staff
      .post(`/api/evaluations/${evaluation.id}/score-changes`)
      .send({ changes: [{ indicatorKey: award.ind.training, value: 9 }], reason: "Correction" });
    expect(res.status).toBe(409);
  });

  it("allows corrections while the round waits for approval, and refuses every change once approved", async () => {
    const { award, evaluationId } = await submittedOne();
    const head = await departmentHead(app, award.departmentId);
    expect((await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({})).status).toBe(200);
    const waiting = await award.staff
      .post(`/api/evaluations/${evaluationId}/score-changes`)
      .send({ changes: [{ indicatorKey: award.ind.shade, value: 6 }], reason: "Head spotted a typo" });
    expect(waiting.status, JSON.stringify(waiting.body)).toBe(200);

    expect((await head.post(`/api/rounds/${award.roundId}/approve`).send({})).status).toBe(200);
    const after = await award.staff
      .post(`/api/evaluations/${evaluationId}/score-changes`)
      .send({ changes: [{ indicatorKey: award.ind.shade, value: 9 }], reason: "Too late" });
    expect(after.status).toBe(409);
    // Even a direct query is refused by the database.
    await expect(
      db.indicatorScore.update({ where: { evaluationId_indicatorKey: { evaluationId, indicatorKey: award.ind.shade } }, data: { value: 10 } }),
    ).rejects.toThrow(/locked/);
    await expect(db.evaluation.update({ where: { id: evaluationId }, data: { overallNote: "changed" } })).rejects.toThrow(/locked/);
    await expect(db.round.update({ where: { id: award.roundId }, data: { status: "JUDGING" } })).rejects.toThrow(/locked round/);
  });
});
