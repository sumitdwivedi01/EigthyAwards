import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { assign, evaluationOf, judgingAward, readyToAssign, scoreAndSubmit, WORKED } from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

describe("a jury member scoring a document round (spec §5.9)", () => {
  it("lists the juror's own assignments per department and award, with counts", async () => {
    const award = await judgingAward(app);
    const [a, b] = await readyToAssign(app, award, 2);
    await assign(award, [a!.id, b!.id], [award.jury[0]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, a!.id, WORKED[0]);
    const home = await award.jury[0]!.agent.get("/api/jury/evaluations");
    expect(home.status).toBe(200);
    expect(home.body.totals).toEqual({ assigned: 2, submitted: 1 });
    expect(home.body.departments[0].cycles[0]).toMatchObject({ assigned: 2, submitted: 1, closed: false });
    // Another juror has nothing.
    expect((await award.jury[1]!.agent.get("/api/jury/evaluations")).body.totals).toEqual({ assigned: 0, submitted: 0 });
  });

  it("saves draft marks as the juror goes, and locks the scoring sheet at the first mark", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id]);
    const id = await evaluationOf(a!.id, award.jury[0]!.id);
    const juror = award.jury[0]!.agent;
    const saved = await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.oxygen]: 8 }, comments: { [award.q.training]: "Good drills" } });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    expect(saved.body).toMatchObject({ status: "IN_PROGRESS", scores: { [award.ind.oxygen]: 8 }, comments: { [award.q.training]: "Good drills" } });
    expect(saved.body.missing).toHaveLength(4);
    // Clearing a mark.
    const cleared = await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.oxygen]: null } });
    expect(cleared.body.scores).toEqual({});
    expect((await db.scoringSheet.findUniqueOrThrow({ where: { roundId: award.roundId } })).lockedAt).not.toBeNull();
    const edit = await award.staff.put(`/api/rounds/${award.roundId}/scoring-sheet`).send({ sections: [] });
    expect(edit.status).toBe(409);
  });

  it("refuses marks outside 0 to 10, Yes/No other than 0 or 1, and unknown indicators", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id]);
    const id = await evaluationOf(a!.id, award.jury[0]!.id);
    const juror = award.jury[0]!.agent;
    expect((await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.oxygen]: 11 } })).status).toBe(400);
    expect((await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.oxygen]: 7.5 } })).status).toBe(400);
    const yesNo = await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.audit]: 5 } });
    expect(yesNo.status).toBe(400);
    expect(yesNo.body.error.details[0].message).toBe("Choose Yes or No.");
    expect((await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { ind_aaaaaaaaaa: 5 } })).status).toBe(400);
  });

  it("refuses submitting with a missing indicator or an empty overall note", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id]);
    const id = await evaluationOf(a!.id, award.jury[0]!.id);
    const juror = award.jury[0]!.agent;
    await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.oxygen]: 8, [award.ind.shade]: 5, [award.ind.training]: 7 }, overallNote: "Fine" });
    const missingMark = await juror.post(`/api/evaluations/${id}/submit`).send({});
    expect(missingMark.status).toBe(400);
    expect(missingMark.body.error.message).toBe('Give a mark for "Audit passed".');
    await juror.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.audit]: 1 }, overallNote: "   " });
    const missingNote = await juror.post(`/api/evaluations/${id}/submit`).send({});
    expect(missingNote.status).toBe(400);
    expect(missingNote.body.error.message).toBe("Write the overall note.");
  });

  it("refuses the juror's edits once submitted", async () => {
    const award = await judgingAward(app);
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id]);
    const id = await scoreAndSubmit(award, award.jury[0]!, a!.id, WORKED[0]);
    const view = await award.jury[0]!.agent.get(`/api/evaluations/${id}`);
    expect(view.body).toMatchObject({ status: "SUBMITTED", canEdit: false, missing: [] });
    const edit = await award.jury[0]!.agent.put(`/api/evaluations/${id}/scores`).send({ scores: { [award.ind.oxygen]: 2 } });
    expect(edit.status).toBe(409);
    expect((await award.jury[0]!.agent.post(`/api/evaluations/${id}/submit`).send({})).status).toBe(409);
  });
});

describe("the final score (spec §5.5, ADR 0019)", () => {
  it("is the exact average of three jury: 78,200, 79,200 and 50,400 points give 69.27", async () => {
    const award = await judgingAward(app, { juryMin: 3, juryMax: 3 });
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], award.jury.map((j) => j.id));
    for (const [index, marks] of WORKED.entries()) await scoreAndSubmit(award, award.jury[index]!, a!.id, marks);
    const judging = await award.staff.get(`/api/rounds/${award.roundId}/judging`);
    expect(judging.status).toBe(200);
    const row = judging.body.applications[0];
    expect(row.evaluations.map((e: { points: number }) => e.points).sort()).toEqual([50_400, 78_200, 79_200]);
    expect(row.evaluations.map((e: { score: string }) => e.score).sort()).toEqual(["50.40", "78.20", "79.20"]);
    expect(row.final).toEqual({ totalPoints: 207_800, count: 3, display: "69.27" });
    expect(row).toMatchObject({ rank: 1, minimumMet: true });
  });

  it("never counts a revoked evaluation", async () => {
    const award = await judgingAward(app, { juryMin: 1, juryMax: 3 });
    const [a] = await readyToAssign(app, award, 1);
    await assign(award, [a!.id], [award.jury[0]!.id, award.jury[1]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, a!.id, WORKED[0]);
    // The second juror marks everything but is taken back before submitting.
    const second = await evaluationOf(a!.id, award.jury[1]!.id);
    await award.jury[1]!.agent.put(`/api/evaluations/${second}/scores`).send({
      scores: { [award.ind.oxygen]: 0, [award.ind.shade]: 0, [award.ind.training]: 0, [award.ind.audit]: 0 },
      overallNote: "Weak",
    });
    await award.staff.post(`/api/evaluations/${second}/revoke`).send({ reason: "Reassigned" });
    const row = (await award.staff.get(`/api/rounds/${award.roundId}/judging`)).body.applications[0];
    expect(row.final).toEqual({ totalPoints: 78_200, count: 1, display: "78.20" });
    expect(row.evaluations).toHaveLength(1);
  });

  it("gives equal final scores the same rank within a category (1, 2, 2, 4)", async () => {
    const award = await judgingAward(app);
    const entries = await readyToAssign(app, award, 4);
    await assign(award, entries.map((e) => e.id), [award.jury[0]!.id]);
    const marks = [WORKED[1], WORKED[0], WORKED[0], WORKED[2]];
    for (const [index, entry] of entries.entries()) await scoreAndSubmit(award, award.jury[0]!, entry.id, marks[index]!);
    const rows = (await award.staff.get(`/api/rounds/${award.roundId}/judging`)).body.applications;
    const rankOf = (id: string) => rows.find((r: { id: string }) => r.id === id);
    expect(entries.map((e) => rankOf(e.id).rank)).toEqual([1, 2, 2, 4]);
    expect(entries.map((e) => rankOf(e.id).tied)).toEqual([false, true, true, false]);
  });
});
