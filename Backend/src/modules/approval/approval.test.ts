import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { passDeadline } from "../../../tests/helpers/applying.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import {
  assign,
  departmentHead,
  judgingAward,
  readyToAssign,
  scoreAndSubmit,
  submittedEntries,
  verifyProof,
  WORKED,
} from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

describe("sending a round for approval (spec §5.11)", () => {
  it("is refused while an application has fewer submitted evaluations than the minimum", async () => {
    const award = await judgingAward(app, { juryMin: 2, juryMax: 2 });
    const [entry] = await readyToAssign(app, award, 1);
    await assign(award, [entry!.id], [award.jury[0]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, entry!.id, WORKED[0]);
    const res = await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.details.issues.join(" ")).toMatch(/fewer than 2 submitted evaluations/);
    const judging = await award.staff.get(`/api/rounds/${award.roundId}/judging`);
    expect(judging.body.can.sendForApproval).toBe(false);
    expect(judging.body.sendBlockers.join(" ")).toMatch(/has 1 of the 2 submitted evaluations/);
  });

  it("is refused while an evaluation is unfinished or a proof is still unchecked", async () => {
    const award = await judgingAward(app, { juryMin: 1, juryMax: 2 });
    const [entry] = await readyToAssign(app, award, 1);
    await assign(award, [entry!.id], [award.jury[0]!.id, award.jury[1]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, entry!.id, WORKED[0]);
    let res = await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({});
    expect(res.body.error.details.issues.join(" ")).toMatch(/1 evaluation isn't submitted yet/);
    await scoreAndSubmit(award, award.jury[1]!, entry!.id, WORKED[1]);

    // A late application whose proof nobody has checked yet (decided 11 Oct: send waits for it).
    const award2 = await judgingAward(app);
    const [checked] = await submittedEntries(app, award2, 1);
    await submittedEntries(app, award2, 1);
    await verifyProof(award2, checked!.id);
    await passDeadline(award2.cycleId);
    await assign(award2, [checked!.id], [award2.jury[0]!.id]);
    await scoreAndSubmit(award2, award2.jury[0]!, checked!.id, WORKED[0]);
    res = await award2.staff.post(`/api/rounds/${award2.roundId}/send-for-approval`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.details.issues.join(" ")).toMatch(/proof hasn't been checked/);
  });

  it("sends the whole round to the department's head, emails them, and fixes the assignments", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    await departmentHead(app, award.departmentId);
    await assign(award, [entry!.id], [award.jury[0]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, entry!.id, WORKED[0]);
    const res = await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({});
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.round.status).toBe("PENDING_APPROVAL");
    expect(res.body.approvals[0]).toMatchObject({ decision: "PENDING" });
    expect(await db.emailLog.count({ where: { template: "round-sent-for-approval" } })).toBe(1);
    expect((await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({})).status).toBe(409);
    expect((await assign(award, [entry!.id], [award.jury[1]!.id])).status).toBe(409);
    expect((await award.staff.patch(`/api/rounds/${award.roundId}`).send({ juryMax: 2 })).status).toBe(409);
    // The jury can't change anything any more.
    const home = await award.jury[0]!.agent.get("/api/jury/evaluations");
    expect(home.body.departments[0].cycles[0].closed).toBe(true);
  });

  it("is staff only", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    await assign(award, [entry!.id], [award.jury[0]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, entry!.id, WORKED[0]);
    const head = await departmentHead(app, award.departmentId);
    expect((await head.post(`/api/rounds/${award.roundId}/send-for-approval`).send({})).status).toBe(403);
  });
});

describe("the department head's approval (spec §5.11, ADR 0019)", () => {
  async function sentRound() {
    const award = await judgingAward(app, { juryMin: 3, juryMax: 3 });
    const [first, second] = await readyToAssign(app, award, 2);
    await assign(award, [first!.id, second!.id], award.jury.map((j) => j.id));
    for (const [index, marks] of WORKED.entries()) {
      await scoreAndSubmit(award, award.jury[index]!, first!.id, marks);
      await scoreAndSubmit(award, award.jury[index]!, second!.id, WORKED[0]);
    }
    expect((await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({})).status).toBe(200);
    return { award, first: first!, second: second! };
  }

  it("shows the head the queue and the round's ranked scores", async () => {
    const { award } = await sentRound();
    const head = await departmentHead(app, award.departmentId);
    const queue = await head.get("/api/approvals");
    expect(queue.status).toBe(200);
    expect(queue.body.pending).toEqual([expect.objectContaining({ roundId: award.roundId })]);
    const review = await head.get(`/api/rounds/${award.roundId}/judging`);
    expect(review.body.can).toMatchObject({ approve: true, correctScores: false, sendForApproval: false });
    expect(review.body.applications[0].evaluations[0]).toHaveProperty("overallNote");
    // Another department's head sees nothing.
    const otherHead = await signIn(app, (await platformPerson("other.head@example.test", [{ role: "DEPT_HEAD", departmentId: (await judgingAward(app)).departmentId }])).email);
    expect((await otherHead.get("/api/approvals")).body.pending).toEqual([]);
    expect((await otherHead.get(`/api/rounds/${award.roundId}/judging`)).status).toBe(403);
  });

  it("is refused for the leader, the staff and another department's head", async () => {
    const { award } = await sentRound();
    const leader = await signIn(app, (await platformPerson("leader@example.test", [{ role: "LEADER" }])).email);
    expect((await leader.post(`/api/rounds/${award.roundId}/approve`).send({})).status).toBe(403);
    expect((await award.staff.post(`/api/rounds/${award.roundId}/approve`).send({})).status).toBe(403);
    // The leader reads every round.
    expect((await leader.get(`/api/rounds/${award.roundId}/judging`)).status).toBe(200);
  });

  it("locks the round and stores each final score with ΣP, n and its rank in the category", async () => {
    const { award, first, second } = await sentRound();
    const head = await departmentHead(app, award.departmentId);
    const res = await head.post(`/api/rounds/${award.roundId}/approve`).send({ remark: "Well judged" });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.round.status).toBe("APPROVED");
    const stored = await db.roundResult.findMany({ where: { roundId: award.roundId } });
    const of = (id: string) => stored.find((r) => r.applicationId === id);
    expect(of(first.id)).toMatchObject({ totalPoints: 207_800, evaluationCount: 3, rank: 2, resultLabel: null });
    expect(of(first.id)?.finalScore?.toFixed(2)).toBe("69.27");
    expect(of(second.id)).toMatchObject({ totalPoints: 234_600, evaluationCount: 3, rank: 1 });
    expect(of(second.id)?.finalScore?.toFixed(2)).toBe("78.20");
    expect(await db.approvalRequest.findFirstOrThrow({ where: { roundId: award.roundId } })).toMatchObject({ decision: "APPROVED", remark: "Well judged" });
    expect((await head.post(`/api/rounds/${award.roundId}/approve`).send({})).status).toBe(409);
    // The stored results never shift, even by a direct query.
    await expect(db.roundResult.update({ where: { id: of(first.id)!.id }, data: { rank: 5 } })).rejects.toThrow(/fixed/);
  });

  it("gives an application whose proof was rejected the not-advancing result, unjudged", async () => {
    const award = await judgingAward(app);
    const [judged, rejected] = await submittedEntries(app, award, 2);
    await verifyProof(award, judged!.id);
    await award.staff.post(`/api/applications/${rejected!.id}/proof-check`).send({ decision: "REJECTED", note: "Not an employee" });
    await passDeadline(award.cycleId);
    await assign(award, [judged!.id], [award.jury[0]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, judged!.id, WORKED[0]);
    await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({});
    const head = await departmentHead(app, award.departmentId);
    await head.post(`/api/rounds/${award.roundId}/approve`).send({});
    expect(await db.roundResult.findFirstOrThrow({ where: { applicationId: rejected!.id } })).toMatchObject({
      finalScore: null,
      totalPoints: null,
      rank: null,
      resultLabel: "Rejected",
    });
  });
});
