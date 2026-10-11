import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { completeSetup, createAwardWithCycle, DAY, staffWithDepartment } from "../../../tests/helpers/award-setup.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { createApplication } from "../../../tests/helpers/factories.js";

useTestDatabase();

async function publishedAward(name: string, change?: (cycleId: string) => Promise<void>) {
  const app = createApp();
  const { staff, department, domain } = await staffWithDepartment(app, { email: `staff.${name.replace(/\W/g, "").toLowerCase()}@example.test` });
  const ids = await createAwardWithCycle(staff, department.id, domain.id, name);
  await completeSetup(staff, ids.cycleId, ids.roundId);
  await staff.patch(`/api/cycles/${ids.cycleId}`).send({ feePaise: 1_000_000, maxEntries: 500 });
  await staff.post(`/api/cycles/${ids.cycleId}/categories`).send({ name: "MSME", feePaise: 250_000 });
  if (change) await change(ids.cycleId);
  expect((await staff.post(`/api/cycles/${ids.cycleId}/publish`).send({})).status).toBe(200);
  return { app, staff, department, ...ids };
}

describe("Open awards and the award page (spec §5.3, §5.19)", () => {
  it("lists only published editions open today, with live fees, categories and the entry counter", async () => {
    const { app, department, cycleId } = await publishedAward("Safety Excellence Award");
    // Drafts are never listed.
    const draft = await staffWithDepartment(app, { email: "draft@example.test" });
    await createAwardWithCycle(draft.staff, draft.department.id, draft.domain.id, "Draft Award");

    const list = await request(app).get("/api/public/awards");
    expect(list.status).toBe(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        slug: "safety-excellence-award",
        name: "Safety Excellence Award",
        department: expect.objectContaining({ name: department.name }),
        cycle: expect.objectContaining({
          label: "2026",
          state: "OPEN",
          categories: [
            { name: "Large manufacturing", feePaise: 1_000_000 },
            { name: "MSME", feePaise: 250_000 },
          ],
          fee: { fromPaise: 250_000, toPaise: 1_000_000 },
          entries: { submitted: 0, limit: 500 },
        }),
      }),
    ]);
    // The counter reads live data: a submitted application shows at once.
    const category = await db.entryCategory.findFirstOrThrow({ where: { cycleId } });
    const application = await createApplication(cycleId, category.id);
    await db.application.update({ where: { id: application.id }, data: { status: "SUBMITTED" } });
    const after = await request(app).get("/api/public/awards/safety-excellence-award");
    expect(after.body.cycle.entries).toEqual({ submitted: 1, limit: 500 });
  });

  it("hides an edition before it opens and after its deadline from Open awards, but its page still shows the dates", async () => {
    const { app, cycleId } = await publishedAward("Energy Award", async (id) => {
      await db.cycle.update({ where: { id }, data: { opensAt: new Date(Date.now() + 5 * DAY), deadlineAt: new Date(Date.now() + 30 * DAY) } });
    });
    expect((await request(app).get("/api/public/awards")).body).toEqual([]);
    expect((await request(app).get("/api/public/awards/energy-award")).body.cycle.state).toBe("SCHEDULED");
    await db.cycle.update({ where: { id: cycleId }, data: { opensAt: new Date(Date.now() - 30 * DAY), deadlineAt: new Date(Date.now() - DAY) } });
    expect((await request(app).get("/api/public/awards")).body).toEqual([]);
    expect((await request(app).get("/api/public/awards/energy-award")).body.cycle.state).toBe("CLOSED");
  });

  it("answers 404 for an unknown address and for an award with only a draft", async () => {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    await createAwardWithCycle(staff, department.id, domain.id, "Draft Only");
    expect((await request(app).get("/api/public/awards/draft-only")).status).toBe(404);
    expect((await request(app).get("/api/public/awards/nothing-here")).status).toBe(404);
  });

  it("lets the award's staff change the address, unique and in the right shape", async () => {
    const { app, staff, awardId } = await publishedAward("Kaizen Competition");
    const other = await publishedAward("Other Award");
    expect((await staff.put(`/api/awards/${awardId}/site`).send({ slug: "Kaizen-2026" })).body).toEqual({ slug: "kaizen-2026" });
    expect((await request(app).get("/api/public/awards/kaizen-2026")).status).toBe(200);
    expect((await staff.put(`/api/awards/${awardId}/site`).send({ slug: "kaizen 2026" })).status).toBe(400);
    const taken = await staff.put(`/api/awards/${awardId}/site`).send({ slug: "other-award" });
    expect(taken.status).toBe(400);
    expect(taken.body.error.details).toEqual([expect.objectContaining({ path: "slug" })]);
    expect((await other.staff.put(`/api/awards/${awardId}/site`).send({ slug: "stolen" })).status).toBe(403);
  });
});

describe("the department's head looks after its award pages (ADR 0020)", () => {
  it("shows the head's theme on the award page at once, and an empty footer as the department's name", async () => {
    const { app, department } = await publishedAward("Safety Excellence Award");
    await platformPerson("head@example.test", [{ role: "DEPT_HEAD", departmentId: department.id }]);
    const head = await signIn(app, "head@example.test");
    await head.put(`/api/departments/${department.id}/theme`).send({ primaryColour: "#0A5C8A", accentColour: "#FFCC00", footerText: "" });

    const page = await request(app).get("/api/public/awards/safety-excellence-award");
    expect(page.body.department).toMatchObject({ colours: { primary: "#0A5C8A", accent: "#FFCC00" }, footerText: department.name });
    const theme = await head.get(`/api/departments/${department.id}/theme`);
    expect(theme.body.awards).toEqual([
      expect.objectContaining({ name: "Safety Excellence Award", slug: "safety-excellence-award", live: true }),
    ]);
  });

  it("lets the head change an award page's address, but not another department's head or the leader", async () => {
    const { app, department, awardId } = await publishedAward("Kaizen Competition");
    await platformPerson("head@example.test", [{ role: "DEPT_HEAD", departmentId: department.id }]);
    const elsewhere = await staffWithDepartment(app, { email: "staff.elsewhere@example.test" });
    await platformPerson("head.elsewhere@example.test", [{ role: "DEPT_HEAD", departmentId: elsewhere.department.id }]);
    await platformPerson("leader@example.test", [{ role: "LEADER" }]);

    const head = await signIn(app, "head@example.test");
    expect((await head.put(`/api/awards/${awardId}/site`).send({ slug: "kaizen" })).body).toEqual({ slug: "kaizen" });
    expect(await db.auditEvent.findFirstOrThrow({ where: { action: "site.address_changed" } })).toMatchObject({ actorRole: "DEPT_HEAD" });
    const otherHead = await signIn(app, "head.elsewhere@example.test");
    expect((await otherHead.put(`/api/awards/${awardId}/site`).send({ slug: "taken-over" })).status).toBe(403);
    const leader = await signIn(app, "leader@example.test");
    expect((await leader.put(`/api/awards/${awardId}/site`).send({ slug: "taken-over" })).status).toBe(403);
  });
});
