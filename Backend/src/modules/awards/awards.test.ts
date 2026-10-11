import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { auditActions, completeSetup, createAwardWithCycle, DAY, openDates, staffWithDepartment } from "../../../tests/helpers/award-setup.js";
import { createAwardDomain } from "../../../tests/helpers/factories.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";

useTestDatabase();

describe("staff create an award in their department (spec §5.3)", () => {
  it("makes the creator its staff, gives it a page address from its name, and audits it", async () => {
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
  });

  it("refuses a name the department already uses (ignoring case), a retired domain, and another department", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const base = { departmentId: department.id, domainId: domain.id, description: "An award." };
    expect((await staff.post("/api/awards").send({ ...base, name: "Energy Award" })).status).toBe(201);
    const twice = await staff.post("/api/awards").send({ ...base, name: "ENERGY award" });
    expect(twice.status).toBe(400);
    expect(twice.body.error.details).toEqual([expect.objectContaining({ path: "name" })]);

    const retired = await createAwardDomain("Old domain");
    await db.awardDomain.update({ where: { id: retired.id }, data: { retiredAt: new Date() } });
    expect((await staff.post("/api/awards").send({ ...base, name: "Another", domainId: retired.id })).status).toBe(400);

    const other = await staffWithDepartment(app, { email: "other@example.test" });
    expect((await staff.post("/api/awards").send({ ...base, departmentId: other.department.id, name: "Someone else's award" })).status).toBe(403);
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
    expect((await staff.post(`/api/awards/${awardId}/cycles`).send({ label: "2026", ...openDates() })).status).toBe(400);
    const swapped = await staff.patch(`/api/cycles/${cycleId}`).send({ deadlineAt: new Date(Date.now() - 2 * DAY).toISOString() });
    expect(swapped.status).toBe(400);
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
