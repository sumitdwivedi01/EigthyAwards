import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { setClock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { hashPassword } from "../../lib/password.js";
import {
  createApplicantAccount,
  createAwardDomain,
  createDepartment,
  createPlatformAccount,
} from "../../../tests/helpers/factories.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";

useTestDatabase();

const PASSWORD = "correct horse battery";

async function signIn(app: Express, email: string, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

/** A platform account with a known password, holding the given role (if any). */
async function person(email: string, role?: { role: "LEADER" | "DEPT_HEAD" | "DEPT_STAFF" | "JURY"; departmentId?: string }) {
  const user = await createPlatformAccount({ email, name: email.split("@")[0], passwordHash: await hashPassword(PASSWORD) });
  if (role) {
    await db.roleAssignment.create({ data: { userId: user.id, role: role.role, departmentId: role.departmentId ?? null } });
  }
  return user;
}

const newDepartment = {
  name: "  Water   Conservation ",
  externalOrganiser: false,
  head: { name: "Meera Iyer", email: " Head.Water@Example.test " },
};

describe("the leader creates a department with its head (ADR 0017)", () => {
  it("creates the department with the default theme and its head's account with a temporary password, shown once", async () => {
    const app = createApp();
    await person("leader@example.test", { role: "LEADER" });
    const leader = await signIn(app, "leader@example.test");

    const res = await leader.post("/api/departments").send(newDepartment);
    expect(res.status).toBe(201);
    expect(res.body.department).toMatchObject({
      name: "Water Conservation",
      externalOrganiser: false,
      colours: { primary: "#1F4FA8", accent: "#F2A900" },
      heads: [{ name: "Meera Iyer", email: "head.water@example.test", waitingForFirstLogin: true }],
      counts: { staff: 0, jury: 0, awards: 0 },
    });
    const temporaryPassword: string = res.body.temporaryPassword;
    expect(temporaryPassword).toMatch(/^[2-9a-z]{4}(-[2-9a-z]{4}){3}$/);

    const head = await db.user.findUniqueOrThrow({ where: { email: "head.water@example.test" } });
    expect(head).toMatchObject({ accountType: "PLATFORM", mustChangePassword: true });
    expect(head.passwordHash).not.toContain(temporaryPassword);
    // The temporary password is in no audit event, and the list never shows it again.
    const audit = JSON.stringify(await db.auditEvent.findMany());
    expect(audit).toContain("department.created");
    expect(audit).not.toContain(temporaryPassword);
    const list = await leader.get("/api/departments");
    expect(JSON.stringify(list.body)).not.toContain(temporaryPassword);
  });

  it("doesn't let the leader choose the department's theme (ADR 0020)", async () => {
    const app = createApp();
    await person("leader@example.test", { role: "LEADER" });
    const leader = await signIn(app, "leader@example.test");
    const res = await leader.post("/api/departments").send({ ...newDepartment, primaryColour: "#000000" });
    expect(res.status).toBe(400);
    expect(await db.department.count()).toBe(0);
  });

  it("refuses anyone but the leader, and a name already used (ignoring letter case)", async () => {
    const app = createApp();
    const department = await createDepartment({ name: "Energy" });
    await person("head@example.test", { role: "DEPT_HEAD", departmentId: department.id });
    await person("leader@example.test", { role: "LEADER" });
    const head = await signIn(app, "head@example.test");
    expect((await head.post("/api/departments").send(newDepartment)).status).toBe(403);

    const leader = await signIn(app, "leader@example.test");
    const taken = await leader.post("/api/departments").send({ ...newDepartment, name: "ENERGY" });
    expect(taken.status).toBe(400);
    expect(taken.body.error.details).toEqual([
      { path: "name", message: 'A department called "Energy" already exists.' },
    ]);
  });

  it("appoints an existing platform account as head without a new password, but never the leader or an applicant", async () => {
    const app = createApp();
    await person("leader@example.test", { role: "LEADER" });
    const other = await createDepartment();
    await person("head.other@example.test", { role: "DEPT_HEAD", departmentId: other.id });
    await createApplicantAccount({ email: "applicant@example.test" });
    const leader = await signIn(app, "leader@example.test");

    const twoDepartments = await leader
      .post("/api/departments")
      .send({ ...newDepartment, head: { name: "Anyone", email: "head.other@example.test" } });
    expect(twoDepartments.status).toBe(201);
    expect(twoDepartments.body.temporaryPassword).toBeNull();

    for (const email of ["leader@example.test", "applicant@example.test"]) {
      const res = await leader.post("/api/departments").send({ ...newDepartment, name: `Dept ${email}`, head: { name: "X", email } });
      expect(res.status).toBe(400);
      expect(res.body.error.details).toEqual([expect.objectContaining({ path: "head.email" })]);
    }
  });
});

describe("a head keeps the department's staff and jury lists (ADR 0017)", () => {
  async function setup() {
    const app = createApp();
    const department = await createDepartment({ name: "Safety" });
    const otherDepartment = await createDepartment({ name: "FPO" });
    await person("head@example.test", { role: "DEPT_HEAD", departmentId: department.id });
    await person("head.fpo@example.test", { role: "DEPT_HEAD", departmentId: otherDepartment.id });
    return { app, department, otherDepartment, head: await signIn(app, "head@example.test") };
  }

  it("adds staff and jury with temporary passwords, and lists them", async () => {
    const { head, department } = await setup();
    const staff = await head.post(`/api/departments/${department.id}/staff`).send({ name: "Asha Rao", email: "asha@example.test" });
    expect(staff.status).toBe(201);
    expect(staff.body).toMatchObject({ person: { email: "asha@example.test", waitingForFirstLogin: true } });
    expect(typeof staff.body.temporaryPassword).toBe("string");
    const juror = await head.post(`/api/departments/${department.id}/jury`).send({ name: "Anil Mehta", email: "anil@example.test" });
    expect(juror.status).toBe(201);

    const people = await head.get(`/api/departments/${department.id}/people`);
    expect(people.status).toBe(200);
    expect(people.body.heads).toEqual([expect.objectContaining({ email: "head@example.test" })]);
    expect(people.body.staff).toEqual([expect.objectContaining({ email: "asha@example.test", canRemove: true, workCount: 0 })]);
    expect(people.body.jury).toEqual([expect.objectContaining({ email: "anil@example.test", canRemove: true })]);
    expect(JSON.stringify(people.body)).not.toContain(staff.body.temporaryPassword);
  });

  it("works only in the head's own department; staff, jury and other heads are refused", async () => {
    const { app, head, department, otherDepartment } = await setup();
    const elsewhere = await head.post(`/api/departments/${otherDepartment.id}/jury`).send({ name: "X", email: "x@example.test" });
    expect(elsewhere.status).toBe(403);
    expect((await head.get(`/api/departments/${otherDepartment.id}/people`)).status).toBe(403);

    await person("staff@example.test", { role: "DEPT_STAFF", departmentId: department.id });
    const staff = await signIn(app, "staff@example.test");
    expect((await staff.post(`/api/departments/${department.id}/jury`).send({ name: "Y", email: "y@example.test" })).status).toBe(403);
    expect((await staff.get("/api/departments")).status).toBe(403);
  });

  it("adds an existing platform account from another department by email, without a new password", async () => {
    const { head, department, otherDepartment } = await setup();
    await person("vikram@example.test", { role: "JURY", departmentId: otherDepartment.id });
    const res = await head.post(`/api/departments/${department.id}/jury`).send({ name: "Ignored", email: "VIKRAM@example.test" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ person: { email: "vikram@example.test", name: "vikram" }, temporaryPassword: null });
  });

  it("refuses an applicant account, the leader, the department's own head or staff on its jury list, and doubles", async () => {
    const { head, department } = await setup();
    await createApplicantAccount({ email: "applicant@example.test" });
    await person("leader@example.test", { role: "LEADER" });
    await person("staff@example.test", { role: "DEPT_STAFF", departmentId: department.id });
    await person("juror@example.test", { role: "JURY", departmentId: department.id });
    const cases: [string, string][] = [
      ["jury", "applicant@example.test"],
      ["jury", "leader@example.test"],
      ["jury", "head@example.test"],
      ["jury", "staff@example.test"],
      ["staff", "juror@example.test"],
      ["staff", "head@example.test"],
      ["jury", "juror@example.test"],
    ];
    for (const [list, email] of cases) {
      const res = await head.post(`/api/departments/${department.id}/${list}`).send({ name: "Someone", email });
      expect(res.status, `${email} on the ${list} list`).toBe(400);
      expect(res.body.error.details).toEqual([expect.objectContaining({ path: "email" })]);
    }
  });

  it("removes someone with no work yet, keeping the record, and refuses someone who has work", async () => {
    const { head, department } = await setup();
    const staff = await person("staff@example.test", { role: "DEPT_STAFF", departmentId: department.id });
    const busy = await person("busy@example.test", { role: "DEPT_STAFF", departmentId: department.id });
    const award = await db.award.create({
      data: { departmentId: department.id, domainId: (await createAwardDomain()).id, name: "Award", description: "A test award" },
    });
    await db.roleAssignment.create({ data: { userId: busy.id, role: "AWARD_STAFF", awardId: award.id } });

    expect((await head.delete(`/api/departments/${department.id}/staff/${staff.id}`)).status).toBe(204);
    const revoked = await db.roleAssignment.findFirstOrThrow({ where: { userId: staff.id, role: "DEPT_STAFF" } });
    expect(revoked.revokedAt).not.toBeNull();
    expect((await head.delete(`/api/departments/${department.id}/staff/${busy.id}`)).status).toBe(409);
    expect((await head.delete(`/api/departments/${department.id}/staff/${staff.id}`)).status).toBe(404);
  });
});

describe("a temporary password only lets the person set their own (ADR 0017)", () => {
  async function newJuror() {
    const app = createApp();
    const department = await createDepartment();
    await person("head@example.test", { role: "DEPT_HEAD", departmentId: department.id });
    const head = await signIn(app, "head@example.test");
    const res = await head.post(`/api/departments/${department.id}/jury`).send({ name: "Anil Mehta", email: "anil@example.test" });
    return { app, department, head, temporaryPassword: res.body.temporaryPassword as string, userId: res.body.person.id as string };
  }

  it("blocks everything but setting a password, then works normally", async () => {
    const { app, temporaryPassword } = await newJuror();
    const juror = await signIn(app, "anil@example.test", temporaryPassword);
    expect((await juror.get("/api/me")).body).toMatchObject({ mustChangePassword: true });
    const blocked = await juror.get("/api/master-data/award-domains");
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.details).toEqual({ reason: "PASSWORD_CHANGE_REQUIRED" });
    expect((await juror.patch("/api/me/profile").send({ phone: "98765 43210" })).status).toBe(403);

    const set = await juror.post("/api/me/password").send({ currentPassword: temporaryPassword, newPassword: "my own new password" });
    expect(set.status).toBe(200);
    expect(set.body).toMatchObject({ mustChangePassword: false, areas: ["jury"], home: "jury" });
    expect((await juror.get("/api/master-data/award-domains")).status).toBe(200);
    expect(await db.auditEvent.count({ where: { action: "user.password_set" } })).toBe(1);
    expect((await request(app).post("/api/auth/login").send({ email: "anil@example.test", password: temporaryPassword })).status).toBe(401);
  });

  it("expires after 7 days", async () => {
    const { app, temporaryPassword } = await newJuror();
    setClock(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000));
    const res = await request(app).post("/api/auth/login").send({ email: "anil@example.test", password: temporaryPassword });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expired/);
  });

  it("can be replaced by the head: the old password and every session stop working", async () => {
    const { app, head, department, temporaryPassword, userId } = await newJuror();
    const juror = await signIn(app, "anil@example.test", temporaryPassword);
    await juror.post("/api/me/password").send({ currentPassword: temporaryPassword, newPassword: "my own new password" });

    const issued = await head.post(`/api/departments/${department.id}/people/${userId}/temporary-password`).send({});
    expect(issued.status).toBe(200);
    expect(issued.body.person).toMatchObject({ waitingForFirstLogin: true });
    expect((await juror.get("/api/me")).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: "anil@example.test", password: "my own new password" })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: "anil@example.test", password: issued.body.temporaryPassword })).status).toBe(200);
    expect(JSON.stringify(await db.auditEvent.findMany())).not.toContain(issued.body.temporaryPassword);
  });

  it("is issued to a department head only by the leader, and never to oneself", async () => {
    const { app, head, department } = await newJuror();
    const otherHead = await person("head2@example.test", { role: "DEPT_HEAD", departmentId: department.id });
    expect((await head.post(`/api/departments/${department.id}/people/${otherHead.id}/temporary-password`).send({})).status).toBe(403);
    const self = await db.user.findUniqueOrThrow({ where: { email: "head@example.test" } });
    expect((await head.post(`/api/departments/${department.id}/people/${self.id}/temporary-password`).send({})).status).toBe(409);

    await person("leader@example.test", { role: "LEADER" });
    const leader = await signIn(app, "leader@example.test");
    expect((await leader.post(`/api/departments/${department.id}/people/${otherHead.id}/temporary-password`).send({})).status).toBe(200);
  });
});

describe("listing departments", () => {
  it("shows the leader every department and a head only their own", async () => {
    const app = createApp();
    const mine = await createDepartment({ name: "Safety" });
    await createDepartment({ name: "Energy" });
    await person("leader@example.test", { role: "LEADER" });
    await person("head@example.test", { role: "DEPT_HEAD", departmentId: mine.id });
    const leader = await signIn(app, "leader@example.test");
    const head = await signIn(app, "head@example.test");
    expect((await leader.get("/api/departments")).body.map((d: { name: string }) => d.name)).toEqual(["Energy", "Safety"]);
    expect((await head.get("/api/departments")).body.map((d: { name: string }) => d.name)).toEqual(["Safety"]);
  });
});

describe("the leader only looks at a department's people and theme (ADR 0020)", () => {
  async function setup() {
    const app = createApp();
    const department = await createDepartment({ name: "Safety" });
    const head = await person("head@example.test", { role: "DEPT_HEAD", departmentId: department.id });
    const staff = await person("staff@example.test", { role: "DEPT_STAFF", departmentId: department.id });
    const juror = await person("juror@example.test", { role: "JURY", departmentId: department.id });
    await person("leader@example.test", { role: "LEADER" });
    return { app, department, head, staff, juror, leader: await signIn(app, "leader@example.test") };
  }

  it("shows the leader the lists, with no action but a head's new password", async () => {
    const { leader, department } = await setup();
    const people = await leader.get(`/api/departments/${department.id}/people`);
    expect(people.status).toBe(200);
    expect(people.body.canManage).toBe(false);
    expect(people.body.heads).toEqual([expect.objectContaining({ email: "head@example.test", canIssuePassword: true })]);
    expect(people.body.staff).toEqual([expect.objectContaining({ email: "staff@example.test", canIssuePassword: false, canRemove: false })]);
    expect(people.body.jury).toEqual([expect.objectContaining({ email: "juror@example.test", canIssuePassword: false, canRemove: false })]);
  });

  it("refuses the leader adding, removing or resetting staff and jury, and changing the theme", async () => {
    const { leader, department, staff, juror } = await setup();
    const refused = [
      await leader.post(`/api/departments/${department.id}/staff`).send({ name: "Asha Rao", email: "asha@example.test" }),
      await leader.post(`/api/departments/${department.id}/jury`).send({ name: "Anil Mehta", email: "anil@example.test" }),
      await leader.delete(`/api/departments/${department.id}/staff/${staff.id}`),
      await leader.delete(`/api/departments/${department.id}/jury/${juror.id}`),
      await leader.post(`/api/departments/${department.id}/people/${staff.id}/temporary-password`).send({}),
      await leader.post(`/api/departments/${department.id}/people/${juror.id}/temporary-password`).send({}),
      await leader.put(`/api/departments/${department.id}/theme`).send({ primaryColour: "#000000", accentColour: "#FFFFFF" }),
    ];
    expect(refused.map((res) => res.status)).toEqual([403, 403, 403, 403, 403, 403, 403]);
    expect(await db.user.count({ where: { email: { in: ["asha@example.test", "anil@example.test"] } } })).toBe(0);
    expect(await db.roleAssignment.count({ where: { departmentId: department.id, revokedAt: { not: null } } })).toBe(0);
    expect(await db.auditEvent.count()).toBe(0);
  });

  it("still lets the leader give a locked-out head a new temporary password, audited as the leader", async () => {
    const { leader, department, head } = await setup();
    const res = await leader.post(`/api/departments/${department.id}/people/${head.id}/temporary-password`).send({});
    expect(res.status).toBe(200);
    expect(typeof res.body.temporaryPassword).toBe("string");
    expect(await db.auditEvent.findFirstOrThrow({ where: { action: "user.temporary_password_issued" } })).toMatchObject({
      actorRole: "LEADER",
      entityId: head.id,
    });
  });

  it("shows the head the actions the leader doesn't get", async () => {
    const { app, department } = await setup();
    const head = await signIn(app, "head@example.test");
    const people = await head.get(`/api/departments/${department.id}/people`);
    expect(people.body.canManage).toBe(true);
    // A head never resets their own password here, nor another head's.
    expect(people.body.heads).toEqual([expect.objectContaining({ email: "head@example.test", canIssuePassword: false })]);
    expect(people.body.staff).toEqual([expect.objectContaining({ canIssuePassword: true, canRemove: true })]);
    expect(people.body.jury).toEqual([expect.objectContaining({ canIssuePassword: true, canRemove: true })]);
  });
});

describe("the head chooses the department's theme (ADR 0020)", () => {
  async function setup() {
    const app = createApp();
    const department = await createDepartment({ name: "Safety" });
    const other = await createDepartment({ name: "Energy" });
    await person("head@example.test", { role: "DEPT_HEAD", departmentId: department.id });
    await person("head.energy@example.test", { role: "DEPT_HEAD", departmentId: other.id });
    await person("staff@example.test", { role: "DEPT_STAFF", departmentId: department.id });
    await person("leader@example.test", { role: "LEADER" });
    return { app, department, head: await signIn(app, "head@example.test") };
  }

  it("starts with the default colours and saves the head's choice, audited", async () => {
    const { head, department } = await setup();
    const before = await head.get(`/api/departments/${department.id}/theme`);
    expect(before.body).toMatchObject({ primaryColour: "#1F4FA8", accentColour: "#F2A900", footerText: "", canEdit: true, awards: [] });

    const saved = await head
      .put(`/api/departments/${department.id}/theme`)
      .send({ primaryColour: " #0a5c8a ", accentColour: "#ffcc00", footerText: "  Safety awards, since 1995 " });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ primaryColour: "#0A5C8A", accentColour: "#FFCC00", footerText: "Safety awards, since 1995" });
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: "department.theme_changed" } });
    expect(audit).toMatchObject({ actorRole: "DEPT_HEAD", entityId: department.id });
    expect(audit.after).toMatchObject({ primaryColour: "#0A5C8A" });
  });

  it("refuses a colour that isn't #RRGGBB and a footer over 200 characters", async () => {
    const { head, department } = await setup();
    const colour = await head.put(`/api/departments/${department.id}/theme`).send({ primaryColour: "blue", accentColour: "#FFCC00" });
    expect(colour.status).toBe(400);
    expect(colour.body.error.details).toEqual([expect.objectContaining({ path: "primaryColour" })]);
    const footer = await head
      .put(`/api/departments/${department.id}/theme`)
      .send({ primaryColour: "#0A5C8A", accentColour: "#FFCC00", footerText: "x".repeat(201) });
    expect(footer.status).toBe(400);
  });

  it("lets only the department's head change it: staff and other heads are refused, the leader only sees it", async () => {
    const { app, department } = await setup();
    const theme = { primaryColour: "#000000", accentColour: "#FFFFFF" };
    const staff = await signIn(app, "staff@example.test");
    expect((await staff.get(`/api/departments/${department.id}/theme`)).status).toBe(403);
    expect((await staff.put(`/api/departments/${department.id}/theme`).send(theme)).status).toBe(403);
    const otherHead = await signIn(app, "head.energy@example.test");
    expect((await otherHead.put(`/api/departments/${department.id}/theme`).send(theme)).status).toBe(403);
    const leader = await signIn(app, "leader@example.test");
    const seen = await leader.get(`/api/departments/${department.id}/theme`);
    expect(seen.status).toBe(200);
    expect(seen.body.canEdit).toBe(false);
  });
});
