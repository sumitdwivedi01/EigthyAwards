import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { applicant, applyFully, start } from "../../../tests/helpers/applying.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { assign, departmentHead, judgingAward, readyToAssign, scoreAndSubmit, WORKED } from "../../../tests/helpers/judging.js";

useTestDatabase();
const app = createApp();

describe("the leadership dashboard (spec §5.14)", () => {
  it("shows the leader every department and award: applications by status, judging progress, approvals, deadlines", async () => {
    const judged = await judgingAward(app, { juryMin: 1, juryMax: 2 });
    const [a, b] = await readyToAssign(app, judged, 2);
    await assign(judged, [a!.id, b!.id], [judged.jury[0]!.id]);
    await scoreAndSubmit(judged, judged.jury[0]!, a!.id, WORKED[0]);
    await scoreAndSubmit(judged, judged.jury[0]!, b!.id, WORKED[1]);
    await judged.staff.post(`/api/rounds/${judged.roundId}/send-for-approval`).send({});

    const open = await judgingAward(app);
    await applyFully(await applicant(app), open);
    await start(await applicant(app), open);

    const leader = await signIn(app, (await platformPerson("leader@example.test", [{ role: "LEADER" }])).email);
    const res = await leader.get("/api/reports/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe("PLATFORM");
    expect(res.body.totals).toMatchObject({ departments: 2, awards: 2, openCycles: 1, submitted: 3, pendingApprovals: 1 });
    expect(res.body.pendingApprovals).toEqual([expect.objectContaining({ roundId: judged.roundId })]);
    expect(res.body.upcomingDeadlines).toEqual([expect.objectContaining({ cycleId: open.cycleId })]);
    const cycles = res.body.departments.flatMap((d: { awards: { cycles: unknown[] }[] }) => d.awards.flatMap((x) => x.cycles));
    const judgedCycle = cycles.find((c: { id: string }) => c.id === judged.cycleId);
    expect(judgedCycle).toMatchObject({
      state: "CLOSED",
      applications: { SUBMITTED: 2, DRAFT: 0 },
      proof: { VERIFIED: 2, PENDING: 0 },
      round: { status: "PENDING_APPROVAL", evaluationsAssigned: 2, evaluationsSubmitted: 2, judged: 2, atMinimum: 2, waitingForApproval: true },
    });
    expect(cycles.find((c: { id: string }) => c.id === open.cycleId)).toMatchObject({ state: "OPEN", applications: { SUBMITTED: 1, DRAFT: 1 } });
    // Counts only: no organisation or person is named.
    expect(JSON.stringify(res.body)).not.toMatch(/legalName|email/);
  });

  it("shows a department head only their own departments", async () => {
    const mine = await judgingAward(app);
    await judgingAward(app);
    const head = await departmentHead(app, mine.departmentId);
    const res = await head.get("/api/reports/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe("DEPARTMENTS");
    expect(res.body.departments.map((d: { id: string }) => d.id)).toEqual([mine.departmentId]);
  });

  it("is refused for staff, jury and applicants", async () => {
    const award = await judgingAward(app);
    expect((await award.staff.get("/api/reports/dashboard")).status).toBe(403);
    expect((await award.jury[0]!.agent.get("/api/reports/dashboard")).status).toBe(403);
    expect((await (await applicant(app)).agent.get("/api/reports/dashboard")).status).toBe(403);
  });
});
