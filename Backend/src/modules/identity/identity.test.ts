import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { setClock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { hashPassword } from "../../lib/password.js";
import { createCycle, createUser } from "../../../tests/helpers/factories.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";

useTestDatabase();

const PASSWORD = "correct horse battery";
const PDF = Buffer.from("%PDF-1.4\n% a tiny test document\n");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

async function personWithPassword(email = "asha@example.test", password = PASSWORD) {
  return createUser({ email, name: "Asha Rao", passwordHash: await hashPassword(password) });
}

async function signedIn(app: Express, email = "asha@example.test", password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

function sessionCookie(res: request.Response): string {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith("awards_session=")) ?? "";
}

describe("registering and logging in (spec §5.1)", () => {
  it("registers an applicant and signs them in with an httpOnly cookie, never returning the password hash", async () => {
    const agent = request.agent(createApp());
    const res = await agent
      .post("/api/auth/register")
      .send({ name: "  Asha   Rao ", email: " Asha@Example.TEST ", password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: "asha@example.test", name: "Asha Rao", home: "applicant", roles: [] });
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|sessionVersion|\$2[aby]\$/);
    const me = await agent.get("/api/me");
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("asha@example.test");
  });

  it("refuses Asha@Example.com when asha@example.com already has an account", async () => {
    await personWithPassword("asha@example.com");
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ name: "Asha", email: "Asha@Example.com", password: PASSWORD });
    expect(res.status).toBe(409);
    expect(await db.user.count()).toBe(1);
  });

  it("refuses a password shorter than 8 characters or longer than bcrypt can use", async () => {
    for (const password of ["short", "x".repeat(73)]) {
      const res = await request(createApp())
        .post("/api/auth/register")
        .send({ name: "Asha", email: "asha@example.test", password });
      expect(res.status).toBe(400);
      expect(res.body.error.details).toEqual([expect.objectContaining({ path: "password" })]);
    }
  });

  it("gives 401 for a wrong password, and the same answer for an unknown email", async () => {
    await personWithPassword();
    const app = createApp();
    const wrong = await request(app).post("/api/auth/login").send({ email: "asha@example.test", password: "wrong one" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.test", password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
    expect(sessionCookie(wrong)).toBe("");
  });

  it("logs in whatever the letter case of the email, and never returns the hash", async () => {
    await personWithPassword();
    const res = await request(createApp()).post("/api/auth/login").send({ email: "ASHA@example.test", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it("refuses a deactivated account, even with the right password", async () => {
    await personWithPassword();
    await db.user.update({ where: { email: "asha@example.test" }, data: { deactivatedAt: new Date() } });
    const res = await request(createApp()).post("/api/auth/login").send({ email: "asha@example.test", password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it("asks for a login without a valid session, and after logging out", async () => {
    await personWithPassword();
    const app = createApp();
    expect((await request(app).get("/api/me")).status).toBe(401);
    expect((await request(app).get("/api/me").set("Cookie", "awards_session=not-a-token")).status).toBe(401);
    const agent = await signedIn(app);
    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/me")).status).toBe(401);
  });

  it("ends a session when it is older than the session length", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    setClock(new Date(Date.now() + 13 * 60 * 60 * 1000));
    expect((await agent.get("/api/me")).status).toBe(401);
  });

  it("refuses a deactivated account's open session at once", async () => {
    const person = await personWithPassword();
    const agent = await signedIn(createApp());
    await db.user.update({ where: { id: person.id }, data: { deactivatedAt: new Date() } });
    expect((await agent.get("/api/me")).status).toBe(401);
  });
});

describe("roles are read from the database on every request (ADR 0003)", () => {
  it("shows a new role, and drops a revoked one, within the same session", async () => {
    const person = await personWithPassword();
    const { award } = await createCycle();
    const agent = await signedIn(createApp());
    expect((await agent.get("/api/me")).body.home).toBe("applicant");

    const role = await db.roleAssignment.create({ data: { userId: person.id, role: "AWARD_STAFF", awardId: award.id } });
    const asStaff = await agent.get("/api/me");
    expect(asStaff.body).toMatchObject({ home: "staff", areas: ["staff", "applicant"] });
    expect(asStaff.body.roles).toEqual([
      { role: "AWARD_STAFF", award: { id: award.id, name: award.name }, department: null, cycle: null },
    ]);

    await db.roleAssignment.update({ where: { id: role.id }, data: { revokedAt: new Date() } });
    expect((await agent.get("/api/me")).body).toMatchObject({ home: "applicant", roles: [] });
  });
});

describe("My profile (spec §5.21)", () => {
  it("edits the name and phone, normalised on save", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    const res = await agent.patch("/api/me/profile").send({ name: "  Asha   K Rao ", phone: "098765 43210" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Asha K Rao", phone: "+919876543210" });
    const removed = await agent.patch("/api/me/profile").send({ phone: null });
    expect(removed.body.phone).toBeNull();
  });

  it("refuses a phone that isn't a 10-digit Indian number", async () => {
    await personWithPassword();
    const res = await (await signedIn(createApp())).patch("/api/me/profile").send({ phone: "12345" });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: "phone" })]);
  });

  it("refuses a password change with a wrong current password", async () => {
    await personWithPassword();
    const res = await (await signedIn(createApp()))
      .post("/api/me/password")
      .send({ currentPassword: "not my password", newPassword: "a brand new password" });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: "currentPassword" })]);
  });

  it("changes the password: other sessions end, this one continues, an email goes out, and it is audited without the password", async () => {
    const person = await personWithPassword();
    const app = createApp();
    const otherDevice = await signedIn(app);
    const thisDevice = await signedIn(app);
    const NEW = "a brand new password";

    const res = await thisDevice.post("/api/me/password").send({ currentPassword: PASSWORD, newPassword: NEW });
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toMatch(/^awards_session=/);
    expect(res.body.passwordChangedAt).not.toBeNull();

    expect((await otherDevice.get("/api/me")).status).toBe(401);
    expect((await thisDevice.get("/api/me")).status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: person.email, password: PASSWORD })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: person.email, password: NEW })).status).toBe(200);

    const [email] = await db.emailLog.findMany({ where: { template: "password-changed" } });
    expect(email).toMatchObject({ to: person.email, status: "PENDING" });
    const events = await db.auditEvent.findMany({ where: { action: "user.password_changed" } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ actorId: person.id, entityId: person.id });
    const recorded = JSON.stringify([events, email]);
    expect(recorded).not.toContain(PASSWORD);
    expect(recorded).not.toContain(NEW);
  });

  it("refuses a new password equal to the current one", async () => {
    await personWithPassword();
    const res = await (await signedIn(createApp()))
      .post("/api/me/password")
      .send({ currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(res.status).toBe(400);
  });

  it("keeps a LinkedIn link, only to a LinkedIn profile", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    for (const url of ["https://example.com/asha", "javascript:alert(1)", "https://linkedin.com.evil.test/in/asha"]) {
      expect((await agent.put("/api/me/linkedin").send({ url })).status).toBe(400);
    }
    const saved = await agent.put("/api/me/linkedin").send({ url: "https://www.linkedin.com/in/asha-rao" });
    expect(saved.status).toBe(200);
    expect(saved.body.linkedinUrl).toBe("https://www.linkedin.com/in/asha-rao");
    expect((await agent.put("/api/me/linkedin").send({ url: null })).body.linkedinUrl).toBeNull();
  });
});

describe("the identity document, given once on the profile (§5.20, ADR 0012)", () => {
  async function startUpload(agent: request.Agent, body: Record<string, unknown> = {}) {
    return agent.post("/api/me/identity-document/uploads").send({
      fileName: "passport.pdf",
      contentType: "application/pdf",
      sizeBytes: PDF.length,
      consent: true,
      ...body,
    });
  }

  it("uploads through a short-lived link straight to storage, then puts it on the profile (audited)", async () => {
    const person = await personWithPassword();
    const agent = await signedIn(createApp());
    const started = await startUpload(agent);
    expect(started.status).toBe(201);
    expect(started.body.upload).toMatchObject({ method: "PUT", headers: { "content-type": "application/pdf" } });

    const put = await agent.put(started.body.upload.url).set("Content-Type", "application/pdf").send(PDF);
    expect(put.status).toBe(204);
    const set = await agent.put("/api/me/identity-document").send({ fileId: started.body.fileId });
    expect(set.status).toBe(200);
    expect(set.body.identityDocument).toMatchObject({ fileName: "passport.pdf" });

    const file = await db.fileAsset.findUniqueOrThrow({ where: { id: started.body.fileId } });
    expect(file).toMatchObject({ kind: "IDENTITY_PROOF", ownerUserId: person.id, applicationId: null, status: "READY" });
    expect(file.consentAt).not.toBeNull();
    const user = await db.user.findUniqueOrThrow({ where: { id: person.id } });
    expect(user.identityFileId).toBe(file.id);
    expect(await db.auditEvent.count({ where: { action: "user.identity_document_added" } })).toBe(1);
  });

  it("records a replacement, and the profile then uses the new document", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    const ids: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      const started = await startUpload(agent);
      await agent.put(started.body.upload.url).set("Content-Type", "application/pdf").send(PDF);
      await agent.put("/api/me/identity-document").send({ fileId: started.body.fileId });
      ids.push(started.body.fileId as string);
    }
    const [replaced] = await db.auditEvent.findMany({ where: { action: "user.identity_document_replaced" } });
    expect(replaced).toMatchObject({ before: { identityFileId: ids[0] }, after: { identityFileId: ids[1] } });
  });

  it("asks for consent, and accepts only PDF, JPG or PNG up to 10 MB", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    expect((await startUpload(agent, { consent: false })).status).toBe(400);
    expect((await startUpload(agent, { consent: undefined })).status).toBe(400);
    expect((await startUpload(agent, { contentType: "text/html" })).status).toBe(400);
    expect((await startUpload(agent, { sizeBytes: 11 * 1024 * 1024 })).status).toBe(400);
  });

  it("refuses a file whose content isn't what it claims to be", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    const started = await startUpload(agent, { sizeBytes: PNG.length });
    await agent.put(started.body.upload.url).set("Content-Type", "application/pdf").send(PNG);
    const set = await agent.put("/api/me/identity-document").send({ fileId: started.body.fileId });
    expect(set.status).toBe(400);
    expect((await db.user.findFirstOrThrow()).identityFileId).toBeNull();
  });

  it("refuses an upload bigger than declared, of another type, or a second time through the same link", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    const started = await startUpload(agent);
    const url = started.body.upload.url as string;
    expect((await agent.put(url).set("Content-Type", "application/pdf").send(Buffer.concat([PDF, PDF]))).status).toBe(400);
    expect((await agent.put(url).set("Content-Type", "image/png").send(PDF)).status).toBe(400);
    expect((await agent.put(url).set("Content-Type", "application/pdf").send(PDF)).status).toBe(204);
    expect((await agent.put(url).set("Content-Type", "application/pdf").send(PDF)).status).toBe(409);
  });

  it("refuses a changed or expired upload link", async () => {
    await personWithPassword();
    const agent = await signedIn(createApp());
    const started = await startUpload(agent);
    const url = started.body.upload.url as string;
    expect((await agent.put(`${url}x`).set("Content-Type", "application/pdf").send(PDF)).status).toBe(403);
    setClock(new Date(Date.now() + 11 * 60 * 1000));
    expect((await agent.put(url).set("Content-Type", "application/pdf").send(PDF)).status).toBe(403);
  });

  it("refuses to put a file on the profile before it is uploaded, or someone else's file", async () => {
    await personWithPassword();
    await personWithPassword("ravi@example.test");
    const app = createApp();
    const asha = await signedIn(app);
    const ravi = await signedIn(app, "ravi@example.test");
    const started = await startUpload(asha);
    expect((await asha.put("/api/me/identity-document").send({ fileId: started.body.fileId })).status).toBe(409);
    await asha.put(started.body.upload.url).set("Content-Type", "application/pdf").send(PDF);
    expect((await ravi.put("/api/me/identity-document").send({ fileId: started.body.fileId })).status).toBe(404);
  });
});

describe("request safety (GAPS G-B11, G-B16, G-C12)", () => {
  it("refuses a write that comes from another site", async () => {
    await personWithPassword();
    const app = createApp();
    const foreign = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: "asha@example.test", password: PASSWORD });
    expect(foreign.status).toBe(403);
    const own = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "asha@example.test", password: PASSWORD });
    expect(own.status).toBe(200);
  });

  it("tells every cache never to store an API response", async () => {
    await personWithPassword();
    const res = await (await signedIn(createApp())).get("/api/me");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("slows down repeated failed logins for one email, without blocking other people", async () => {
    await personWithPassword();
    await personWithPassword("ravi@example.test");
    const app = createApp({ loginLimitPerEmail: 2 });
    const attempt = (email: string, password: string) =>
      request(app).post("/api/auth/login").send({ email, password });
    expect((await attempt("asha@example.test", "wrong 1")).status).toBe(401);
    expect((await attempt("asha@example.test", "wrong 2")).status).toBe(401);
    expect((await attempt("asha@example.test", PASSWORD)).status).toBe(429);
    expect((await attempt("ravi@example.test", PASSWORD)).status).toBe(200);
  });
});
