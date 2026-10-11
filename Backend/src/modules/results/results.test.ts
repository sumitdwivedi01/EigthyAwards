import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { applicant, applyFully, passDeadline } from "../../../tests/helpers/applying.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { assign, departmentHead, judgingAward, scoreAndSubmit, verifyProof, WORKED, type Entry, type JudgingAward } from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

/**
 * Two categories with two applications each, judged by one juror and approved:
 * General: g1 79.20, g2 50.40 · Large: l1 78.20, l2 78.20 (a tie).
 */
async function approvedRound(): Promise<{ award: JudgingAward; g1: Entry; g2: Entry; l1: Entry; l2: Entry }> {
  const award = await judgingAward(app);
  const make = async (categoryId: string) => {
    const person = await applicant(app);
    const { id } = await applyFully(person, award, categoryId);
    await verifyProof(award, id);
    return { id, person };
  };
  const g1 = await make(award.categories.general);
  const g2 = await make(award.categories.general);
  const l1 = await make(award.categories.large);
  const l2 = await make(award.categories.large);
  await passDeadline(award.cycleId);
  await assign(award, [g1.id, g2.id, l1.id, l2.id], [award.jury[0]!.id]);
  await scoreAndSubmit(award, award.jury[0]!, g1.id, WORKED[1]);
  await scoreAndSubmit(award, award.jury[0]!, g2.id, WORKED[2]);
  await scoreAndSubmit(award, award.jury[0]!, l1.id, WORKED[0]);
  await scoreAndSubmit(award, award.jury[0]!, l2.id, WORKED[0]);
  expect((await award.staff.post(`/api/rounds/${award.roundId}/send-for-approval`).send({})).status).toBe(200);
  const head = await departmentHead(app, award.departmentId);
  expect((await head.post(`/api/rounds/${award.roundId}/approve`).send({})).status).toBe(200);
  return { award, g1, g2, l1, l2 };
}

async function labelOf(applicationId: string) {
  return (await db.roundResult.findFirstOrThrow({ where: { applicationId } })).resultLabel;
}

describe("a round's results (spec §5.12)", () => {
  it("gives no result before the head approves the round", async () => {
    const award = await judgingAward(app);
    const person = await applicant(app);
    const { id } = await applyFully(person, award);
    await verifyProof(award, id);
    await passDeadline(award.cycleId);
    await assign(award, [id], [award.jury[0]!.id]);
    await scoreAndSubmit(award, award.jury[0]!, id, WORKED[0]);
    const res = await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "TOP_N", n: 1 });
    expect(res.status).toBe(409);
    expect((await award.staff.post(`/api/rounds/${award.roundId}/publish-results`).send({})).status).toBe(409);
    expect(await db.roundResult.count()).toBe(0);
  });

  it("shortlists the top N of each category, ties at the cut included", async () => {
    const { award, g1, g2, l1, l2 } = await approvedRound();
    const res = await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "TOP_N", n: 1 });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect([await labelOf(g1.id), await labelOf(g2.id), await labelOf(l1.id), await labelOf(l2.id)]).toEqual([
      "Shortlisted",
      "Rejected",
      "Shortlisted",
      "Shortlisted",
    ]);
    expect(res.body.applications.find((a: { id: string }) => a.id === l1.id)).toMatchObject({ rank: 1, tied: true });
  });

  it("shortlists everyone at or above a minimum final score", async () => {
    const { award, g1, g2, l1 } = await approvedRound();
    await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "MIN_SCORE", minScore: "78.20" });
    expect([await labelOf(g1.id), await labelOf(g2.id), await labelOf(l1.id)]).toEqual(["Shortlisted", "Rejected", "Shortlisted"]);
    await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "MIN_SCORE", minScore: "78.21" });
    expect(await labelOf(l1.id)).toBe("Rejected");
  });

  it("lets staff settle a result by hand, with one of the round's results only", async () => {
    const { award, l2 } = await approvedRound();
    const bad = await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "MANUAL", labels: [{ applicationId: l2.id, label: "Gold" }] });
    expect(bad.status).toBe(400);
    const ok = await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "MANUAL", labels: [{ applicationId: l2.id, label: "rejected" }] });
    expect(ok.status).toBe(200);
    expect(await labelOf(l2.id)).toBe("Rejected");
    // The head and the leader can't decide results.
    const head = await departmentHead(app, award.departmentId, "second.head@example.test");
    expect((await head.put(`/api/rounds/${award.roundId}/results`).send({ mode: "TOP_N", n: 1 })).status).toBe(403);
  });

  it("publishes only when every application has a result; then each applicant sees theirs and is emailed", async () => {
    const { award, g1, g2 } = await approvedRound();
    await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "MANUAL", labels: [{ applicationId: g1.id, label: "Shortlisted" }] });
    const early = await award.staff.post(`/api/rounds/${award.roundId}/publish-results`).send({});
    expect(early.status).toBe(409);
    expect(early.body.error.message).toMatch(/3 applications have no result yet/);

    // Before publishing, the applicant still sees Under review.
    expect((await g1.person.agent.get(`/api/applications/${g1.id}`)).body.status).toMatchObject({ code: "UNDER_REVIEW" });

    await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "TOP_N", n: 1 });
    const published = await award.staff.post(`/api/rounds/${award.roundId}/publish-results`).send({});
    expect(published.status, JSON.stringify(published.body)).toBe(200);
    expect(published.body.round.status).toBe("RESULTS_PUBLISHED");
    expect((await db.cycle.findUniqueOrThrow({ where: { id: award.cycleId } })).status).toBe("RESULTS_PUBLISHED");

    expect((await g1.person.agent.get(`/api/applications/${g1.id}`)).body.status).toEqual({
      code: "RESULT",
      label: "Shortlisted",
      message: "Keep an eye on your email; we will contact you soon.",
    });
    const mine = (await g2.person.agent.get("/api/applications/mine")).body;
    expect(mine[0].status).toMatchObject({ code: "RESULT", label: "Rejected", message: "Better luck next time." });
    // The applicant and the organisation's official email, for each of the four.
    expect(await db.emailLog.count({ where: { template: "results-published" } })).toBe(8);
    expect((await award.staff.post(`/api/rounds/${award.roundId}/publish-results`).send({})).status).toBe(409);
    expect((await award.staff.put(`/api/rounds/${award.roundId}/results`).send({ mode: "TOP_N", n: 2 })).status).toBe(409);
  });
});
