import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { auditActions, completeSetup, createAwardWithCycle, DAY, openDates, staffWithDepartment } from "../../../tests/helpers/award-setup.js";
import { createAwardDomain } from "../../../tests/helpers/factories.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";

useTestDatabase();

describe("staff create their award department's one award (spec §5.3, ADR 0021)", () => {
  it("gives it a page address from its name, lists it as the staff's award, and audits it", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const res = await staff
      .post("/api/awards")
      .send({ departmentId: department.id, domainId: domain.id, name: "  Safety   Excellence Award ", description: "Safest plants." });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Safety Excellence Award", siteSlug: "safety-excellence-award", cycles: [] });
    const mine = await staff.get("/api/awards/mine");
    expect(mine.body.map((a: { id: string }) => a.id)).toEqual([res.body.id]);
    expect(await auditActions()).toContain("award.created");
    // The leader's list of award departments names each one's award.
    const leader = await signIn(app, (await platformPerson("leader@example.test", [{ role: "LEADER" }])).email);
    const departments = await leader.get("/api/departments");
    expect(departments.body.find((d: { id: string }) => d.id === department.id).award).toEqual({ id: res.body.id, name: "Safety Excellence Award" });
  });

  it("refuses a second award in the same award department, whatever its name", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const base = { departmentId: department.id, domainId: domain.id, description: "An award." };
    expect((await staff.post("/api/awards").send({ ...base, name: "Energy Award" })).status).toBe(201);
    for (const name of ["ENERGY award", "Water Award"]) {
      const second = await staff.post("/api/awards").send({ ...base, name });
      expect(second.status).toBe(409);
      expect(second.body.error).toMatchObject({ details: { reason: "DEPARTMENT_HAS_AWARD" } });
      expect(second.body.error.message).toMatch(/already runs its award, "Energy Award".*new award department/);
    }
    expect(await db.award.count({ where: { departmentId: department.id } })).toBe(1);
  });

  it("creates only one when two staff of the department create an award at the same moment", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    await platformPerson("second.staff@example.test", [{ role: "DEPT_STAFF", departmentId: department.id }]);
    const colleague = await signIn(app, "second.staff@example.test");
    const base = { departmentId: department.id, domainId: domain.id, description: "An award." };
    const results = await Promise.all([
      staff.post("/api/awards").send({ ...base, name: "Energy Award" }),
      colleague.post("/api/awards").send({ ...base, name: "Water Award" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.award.count({ where: { departmentId: department.id } })).toBe(1);
  });

  it("refuses a retired domain, and another department's award", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const base = { departmentId: department.id, domainId: domain.id, description: "An award." };
    const retired = await createAwardDomain("Old domain");
    await db.awardDomain.update({ where: { id: retired.id }, data: { retiredAt: new Date() } });
    expect((await staff.post("/api/awards").send({ ...base, name: "Another", domainId: retired.id })).status).toBe(400);

    const other = await staffWithDepartment(app, { email: "other@example.test" });
    expect((await staff.post("/api/awards").send({ ...base, departmentId: other.department.id, name: "Someone else's award" })).status).toBe(403);
  });

  it("is run by every staff member of the award department, never by another department's staff", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { awardId, cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
    // Added to the department after the award was created, and not its creator: still runs it.
    await platformPerson("second.staff@example.test", [{ role: "DEPT_STAFF", departmentId: department.id }]);
    const colleague = await signIn(app, "second.staff@example.test");
    expect((await colleague.get(`/api/awards/${awardId}`)).status).toBe(200);
    expect((await colleague.get("/api/awards/mine")).body.map((a: { id: string }) => a.id)).toEqual([awardId]);
    expect((await colleague.patch(`/api/cycles/${cycleId}`).send({ feePaise: 50_000 })).status).toBe(200);

    const other = await staffWithDepartment(app, { email: "other@example.test" });
    expect((await other.staff.get(`/api/awards/${awardId}`)).status).toBe(403);
    expect((await other.staff.get("/api/awards/mine")).body).toEqual([]);
  });

  it("gives a second award with the same name in another department its own address", async () => {
    const app = createApp();
    const first = await staffWithDepartment(app);
    const second = await staffWithDepartment(app, { email: "other@example.test" });
    const a = await first.staff.post("/api/awards").send({ departmentId: first.department.id, domainId: first.domain.id, name: "Kaizen", description: "x" });
    const b = await second.staff.post("/api/awards").send({ departmentId: second.department.id, domainId: second.domain.id, name: "Kaizen", description: "x" });
    expect([a.body.siteSlug, b.body.siteSlug]).toEqual(["kaizen", "kaizen-2"]);
  });

  it("refuses a jury member on a staff endpoint, and staff of another award", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
    await platformPerson("juror@example.test", [{ role: "JURY", departmentId: department.id }]);
    const juror = await signIn(app, "juror@example.test");
    expect((await juror.get(`/api/cycles/${cycleId}`)).status).toBe(403);
    expect((await juror.post("/api/awards").send({ departmentId: department.id, domainId: domain.id, name: "Juror's award", description: "x" })).status).toBe(403);

    const other = await staffWithDepartment(app, { email: "other@example.test" });
    expect((await other.staff.get(`/api/cycles/${cycleId}`)).status).toBe(403);
    expect((await other.staff.patch(`/api/cycles/${cycleId}`).send({ feePaise: 100 })).status).toBe(403);
  });
});

describe("an edition (cycle) and its settings", () => {
  it("starts as a draft with one written round of 1 juror per application, Shortlisted or Rejected", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
    const setup = await staff.get(`/api/cycles/${cycleId}`);
    expect(setup.body).toMatchObject({
      label: "2026",
      status: "DRAFT",
      state: "DRAFT",
      feePaise: 0,
      blindJudging: false,
      maxEntries: null,
      categories: [],
      round: {
        number: 1,
        type: "DOCUMENT_REVIEW",
        juryMin: 1,
        juryMax: 1,
        juryAvailable: 3,
        resultLabels: [
          { label: "Shortlisted", advances: true },
          { label: "Rejected", advances: false },
        ],
      },
    });
  });

  it("refuses a deadline before the opening date and a second edition with the same name", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { awardId, cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
    const backwards = await staff
      .post(`/api/awards/${awardId}/cycles`)
      .send({ label: "2027", opensAt: "2027-02-01T00:00:00+05:30", deadlineAt: "2027-01-01T00:00:00+05:30" });
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.details).toEqual([expect.objectContaining({ path: "deadlineAt" })]);
    // Once the first edition is finished, a new one may not reuse its name.
    await db.cycle.update({ where: { id: cycleId }, data: { status: "RESULTS_PUBLISHED" } });
    expect((await staff.post(`/api/awards/${awardId}/cycles`).send({ label: "2026", ...openDates() })).status).toBe(400);
    await db.cycle.update({ where: { id: cycleId }, data: { status: "DRAFT" } });
    const swapped = await staff.patch(`/api/cycles/${cycleId}`).send({ deadlineAt: new Date(Date.now() - 2 * DAY).toISOString() });
    expect(swapped.status).toBe(400);
  });

  it("runs one edition at a time: the next one starts once the current one's results are published (ADR 0021)", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { awardId, cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
    const next = () => staff.post(`/api/awards/${awardId}/cycles`).send({ label: "2027", ...openDates() });

    // A draft is still being set up.
    let res = await next();
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ details: { reason: "EDITION_RUNNING" } });
    expect(res.body.error.message).toMatch(/2026 edition is still being set up/);
    expect((await staff.get(`/api/awards/${awardId}`)).body.newEditionBlockedReason).toMatch(/still being set up/);

    // Published and open, or closed with applications still to judge: still running.
    await db.cycle.update({ where: { id: cycleId }, data: { status: "PUBLISHED" } });
    res = await next();
    expect(res.body.error.message).toMatch(/2026 edition is still running/);

    // Its deadline passed with nothing submitted: nothing to judge, so the next one may start.
    await db.cycle.update({ where: { id: cycleId }, data: { status: "CLOSED", deadlineAt: new Date(Date.now() - DAY) } });
    expect((await staff.get(`/api/awards/${awardId}`)).body.newEditionBlockedReason).toBeNull();
    res = await next();
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    // And now that one runs: no third edition at the same time.
    expect((await staff.post(`/api/awards/${awardId}/cycles`).send({ label: "2028", ...openDates() })).status).toBe(409);
  });

  it("starts the next edition once the current one's results are published", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { awardId, cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
    await db.cycle.update({ where: { id: cycleId }, data: { status: "RESULTS_PUBLISHED" } });
    const res = await staff.post(`/api/awards/${awardId}/cycles`).send({ label: "2027", ...openDates() });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const award = await staff.get(`/api/awards/${awardId}`);
    expect(award.body.cycles.map((c: { label: string }) => c.label).sort()).toEqual(["2026", "2027"]);
  });

  it("keeps categories with their own fee, unique by name", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
    await staff.patch(`/api/cycles/${cycleId}`).send({ feePaise: 1_000_000 });
    const msme = await staff.post(`/api/cycles/${cycleId}/categories`).send({ name: "MSME", feePaise: 250_000 });
    expect(msme.status).toBe(201);
    expect((await staff.post(`/api/cycles/${cycleId}/categories`).send({ name: "Large" })).status).toBe(201);
    expect((await staff.post(`/api/cycles/${cycleId}/categories`).send({ name: "msme" })).status).toBe(400);
    const setup = await staff.get(`/api/cycles/${cycleId}`);
    expect(setup.body).toMatchObject({
      feePaise: 1_000_000,
      categories: [
        { name: "Large", feePaise: null },
        { name: "MSME", feePaise: 250_000 },
      ],
    });
  });

  it("refuses a jury minimum of 0, or a minimum above the maximum (ADR 0013)", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { roundId } = await createAwardWithCycle(staff, department.id, domain.id);
    expect((await staff.patch(`/api/rounds/${roundId}`).send({ juryMin: 0 })).status).toBe(400);
    expect((await staff.patch(`/api/rounds/${roundId}`).send({ juryMin: 3, juryMax: 2 })).status).toBe(400);
    const ok = await staff.patch(`/api/rounds/${roundId}`).send({ juryMin: 2, juryMax: 3 });
    expect(ok.status).toBe(200);
    expect(ok.body.round).toMatchObject({ juryMin: 2, juryMax: 3 });
    const renamed = await staff
      .patch(`/api/rounds/${roundId}`)
      .send({ resultLabels: [{ label: "Winner", advances: false }, { label: "Not selected" }] });
    expect(renamed.body.round.resultLabels).toEqual([
      { label: "Winner", advances: false },
      { label: "Not selected", advances: false },
    ]);
    expect((await staff.patch(`/api/rounds/${roundId}`).send({ resultLabels: [{ label: "Only one" }] })).status).toBe(400);
  });
});

describe("the publish check (spec §5.3)", () => {
  it("refuses an incomplete edition with a clear 409 that lists every issue at once", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app, { jury: 1 });
    const { cycleId, roundId } = await createAwardWithCycle(staff, department.id, domain.id);
    await staff.patch(`/api/rounds/${roundId}`).send({ juryMin: 2, juryMax: 3 });
    const res = await staff.post(`/api/cycles/${cycleId}/publish`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.details.reason).toBe("PUBLISH_BLOCKED");
    expect(res.body.error.details.issues).toEqual([
      "Add at least one entry category.",
      "Publish the questions first: there is no published version yet.",
      "Scoring sheet: The scoring sheet needs at least one section with an indicator.",
      "Up to 3 jurors per application are needed, but the department's jury list has 1.",
    ]);
    expect((await db.cycle.findUniqueOrThrow({ where: { id: cycleId } })).status).toBe("DRAFT");
  });

  it("refuses an edition whose deadline has passed", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { cycleId, roundId } = await createAwardWithCycle(staff, department.id, domain.id);
    await completeSetup(staff, cycleId, roundId);
    await db.cycle.update({
      where: { id: cycleId },
      data: { opensAt: new Date(Date.now() - 10 * DAY), deadlineAt: new Date(Date.now() - DAY) },
    });
    const res = await staff.post(`/api/cycles/${cycleId}/publish`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.details.issues).toEqual(["The deadline has already passed: set a later one."]);
  });

  it("publishes a complete edition, then fixes its fee, blind judging, dates and categories", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { cycleId, roundId, awardId } = await createAwardWithCycle(staff, department.id, domain.id);
    await completeSetup(staff, cycleId, roundId);
    expect((await staff.get(`/api/cycles/${cycleId}`)).body.publishIssues).toEqual([]);

    const published = await staff.post(`/api/cycles/${cycleId}/publish`).send({});
    expect(published.status).toBe(200);
    expect(published.body).toMatchObject({ status: "PUBLISHED", state: "OPEN", settingsFixed: true });
    expect(await db.awardSite.findUniqueOrThrow({ where: { awardId } })).toMatchObject({ status: "PUBLISHED" });
    expect(await auditActions()).toContain("cycle.published");

    for (const change of [{ feePaise: 500 }, { blindJudging: true }, { deadlineAt: new Date(Date.now() + 60 * DAY).toISOString() }]) {
      const res = await staff.patch(`/api/cycles/${cycleId}`).send(change);
      expect(res.status, JSON.stringify(change)).toBe(409);
    }
    expect((await staff.post(`/api/cycles/${cycleId}/categories`).send({ name: "Late" })).status).toBe(409);
    expect((await staff.post(`/api/cycles/${cycleId}/publish`).send({})).status).toBe(409);
    // The entry limit can still change (spec §5.20: staff can raise it).
    expect((await staff.patch(`/api/cycles/${cycleId}`).send({ maxEntries: 500 })).body.maxEntries).toBe(500);
  });
});
