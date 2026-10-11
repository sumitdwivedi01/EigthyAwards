import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { applyFully, passDeadline } from "../../../tests/helpers/applying.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { createOrganisation } from "../../../tests/helpers/factories.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { assign, departmentHead, judgingAward, readyToAssign, scoreAndSubmit, verifyProof, WORKED } from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

/**
 * Rule R2: "a jury member is never given an application from an organisation they have a recorded
 * conflict with. The server refuses it." (the brief; spec §5.8).
 */
describe("rule R2: recorded conflicts of interest", () => {
  it("refuses assigning a conflicted pair, even when the screen is bypassed", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    const juror = award.jury[0]!;
    const recorded = await award.staff
      .post(`/api/cycles/${award.cycleId}/conflicts`)
      .send({ juryUserId: juror.id, organisationId: entry!.person.organisationId, note: "Former employee" });
    expect(recorded.status, JSON.stringify(recorded.body)).toBe(201);

    const res = await assign(award, [entry!.id], [juror.id]);
    expect(res.status).toBe(409);
    expect(res.body.error.details.problems[0]).toMatchObject({ applicationId: entry!.id, juryUserId: juror.id });
    expect(res.body.error.details.problems[0].message).toMatch(/recorded conflict/);
    expect(await db.evaluation.count({ where: { applicationId: entry!.id } })).toBe(0);
  });

  it("applies to every award: a conflict recorded in one award blocks the pair in another", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    const juror = award.jury[0]!;
    // The same organisation applies to a second award of another department, where the juror also judges.
    const other = await judgingAward(app);
    await db.roleAssignment.create({ data: { userId: juror.id, role: "JURY", departmentId: other.departmentId } });
    const second = await applyFully(entry!.person, other);
    await verifyProof(other, second.id);
    await passDeadline(other.cycleId);

    await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: juror.id, organisationId: entry!.person.organisationId });
    const res = await assign(other, [second.id], [juror.id]);
    expect(res.status).toBe(409);
    expect(res.body.error.details.problems[0].message).toMatch(/recorded conflict/);
  });

  it("leaves the conflicted juror out of that application's picker on the board", async () => {
    const award = await judgingAward(app);
    const [entry, clean] = await readyToAssign(app, award, 2);
    const juror = award.jury[1]!;
    await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: juror.id, organisationId: entry!.person.organisationId });
    const board = await award.staff.get(`/api/rounds/${award.roundId}/assignment-board`);
    const row = (id: string) => board.body.applications.find((a: { id: string }) => a.id === id);
    expect(row(entry!.id).conflictedJuryIds).toEqual([juror.id]);
    expect(row(clean!.id).conflictedJuryIds).toEqual([]);
    expect(board.body.conflicts).toHaveLength(1);
    expect(board.body.conflicts[0]).toMatchObject({ juror: { id: juror.id }, note: null });
  });

  it("takes back an unsubmitted assignment when the conflict is recorded late, and flags a submitted one", async () => {
    const award = await judgingAward(app, { juryMin: 1, juryMax: 2 });
    const [entry] = await readyToAssign(app, award, 1);
    const [done, open] = [award.jury[0]!, award.jury[1]!];
    await assign(award, [entry!.id], [done.id, open.id]);
    await scoreAndSubmit(award, done, entry!.id, WORKED[0]);

    const lateOpen = await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: open.id, organisationId: entry!.person.organisationId });
    expect(lateOpen.body).toMatchObject({ revoked: 1, flagged: 0 });
    expect(await db.evaluation.findFirstOrThrow({ where: { juryUserId: open.id } })).toMatchObject({ status: "REVOKED" });

    const lateDone = await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: done.id, organisationId: entry!.person.organisationId });
    expect(lateDone.body).toMatchObject({ revoked: 0, flagged: 1 });
    // Flagged for staff; it still counts (decided 11 Oct).
    const board = await award.staff.get(`/api/rounds/${award.roundId}/assignment-board`);
    expect(board.body.applications[0].evaluations).toEqual([expect.objectContaining({ juror: expect.objectContaining({ id: done.id }), conflictFlagged: true })]);
    const judging = await award.staff.get(`/api/rounds/${award.roundId}/judging`);
    expect(judging.body.applications[0].final).toMatchObject({ count: 1, display: "78.20" });
  });

  it("is recorded and removed by the award's staff or the department's head, never the leader or jury", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    const body = { juryUserId: award.jury[0]!.id, organisationId: entry!.person.organisationId };
    const leader = await signIn(app, (await platformPerson("leader@example.test", [{ role: "LEADER" }])).email);
    expect((await leader.post(`/api/cycles/${award.cycleId}/conflicts`).send(body)).status).toBe(403);
    expect((await award.jury[1]!.agent.post(`/api/cycles/${award.cycleId}/conflicts`).send(body)).status).toBe(403);
    const head = await departmentHead(app, award.departmentId);
    const recorded = await head.post(`/api/cycles/${award.cycleId}/conflicts`).send(body);
    expect(recorded.status).toBe(201);
    expect(await db.auditEvent.findFirstOrThrow({ where: { action: "conflict.recorded" } })).toMatchObject({ actorRole: "DEPT_HEAD" });
    expect((await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send(body)).status).toBe(409);
  });

  it("refuses a juror off the list or an organisation that didn't apply", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    const outsider = await platformPerson("outsider@example.test", []);
    const offList = await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: outsider.id, organisationId: entry!.person.organisationId });
    expect(offList.status).toBe(400);
    const stranger = await createOrganisation();
    const notApplied = await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: award.jury[0]!.id, organisationId: stranger.id });
    expect(notApplied.status).toBe(400);
  });

  it("removes a conflict recorded by mistake with a reason, keeps it, and allows the assignment again", async () => {
    const award = await judgingAward(app);
    const [entry] = await readyToAssign(app, award, 1);
    const juror = award.jury[0]!;
    const recorded = await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: juror.id, organisationId: entry!.person.organisationId });
    const id = recorded.body.conflict.id as string;
    expect((await award.staff.post(`/api/cycles/${award.cycleId}/conflicts/${id}/remove`).send({})).status).toBe(400);
    expect((await award.staff.post(`/api/cycles/${award.cycleId}/conflicts/${id}/remove`).send({ reason: "Wrong juror picked" })).status).toBe(204);
    expect(await db.conflict.findUniqueOrThrow({ where: { id } })).toMatchObject({ removeReason: "Wrong juror picked" });
    expect(await db.auditEvent.findFirstOrThrow({ where: { action: "conflict.removed" } })).toMatchObject({ reason: "Wrong juror picked" });
    expect((await assign(award, [entry!.id], [juror.id])).status).toBe(201);
    // It can be recorded again later.
    expect((await award.staff.post(`/api/cycles/${award.cycleId}/conflicts`).send({ juryUserId: juror.id, organisationId: entry!.person.organisationId })).status).toBe(201);
  });
});
