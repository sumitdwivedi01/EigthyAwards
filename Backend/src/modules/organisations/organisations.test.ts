import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { hashPassword } from "../../lib/password.js";
import { createUser } from "../../../tests/helpers/factories.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";

useTestDatabase();

const PASSWORD = "correct horse battery";

async function signedIn(app: Express, email: string) {
  await createUser({ email, name: email.split("@")[0], passwordHash: await hashPassword(PASSWORD) });
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ email, password: PASSWORD })).status).toBe(200);
  return agent;
}

/** A company as an applicant types it: odd spacing and letter case on purpose. */
const acme = {
  legalName: "  Acme   Steel Ltd ",
  pan: "abcde 1234f",
  gstin: "27-abcde1234f-1z5",
  addressLine: " 12 MIDC   Road ",
  city: "Pune",
  stateCode: "27",
  pincode: "411 001",
  officialEmail: " Office@AcmeSteel.example ",
  phone: "020-2567 8901",
};

describe("registering an organisation (spec §5.2, §5.18)", () => {
  it("saves it normalised, makes the person its first member, and audits it", async () => {
    const app = createApp();
    const asha = await signedIn(app, "asha@example.test");
    const res = await asha.post("/api/organisations").send(acme);
    expect(res.status).toBe(201);
    expect(res.body.warnings).toEqual([]);
    expect(res.body.organisation).toMatchObject({
      legalName: "Acme Steel Ltd",
      pan: "ABCDE1234F",
      gstin: "27ABCDE1234F1Z5",
      addressLine: "12 MIDC Road",
      state: { code: "27", name: "Maharashtra" },
      pincode: "411001",
      officialEmail: "office@acmesteel.example",
      phone: "+912025678901",
    });
    const me = await asha.get("/api/me");
    expect(me.body.organisations).toEqual([{ id: res.body.organisation.id, legalName: "Acme Steel Ltd" }]);
    expect(await db.auditEvent.count({ where: { action: "organisation.created" } })).toBe(1);
  });

  it("refuses a badly formatted PAN, and a GSTIN that doesn't contain the PAN, naming each field", async () => {
    const asha = await signedIn(createApp(), "asha@example.test");
    const badPan = await asha.post("/api/organisations").send({ ...acme, pan: "ABCD1234F" });
    expect(badPan.status).toBe(400);
    expect(badPan.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: "pan" })]));
    const otherPan = await asha.post("/api/organisations").send({ ...acme, gstin: "27ZZZZZ9999Z1Z5" });
    expect(otherPan.status).toBe(400);
    expect(otherPan.body.error.details).toEqual([
      { path: "gstin", message: "Characters 3 to 12 of the GSTIN must be the organisation's PAN." },
    ]);
    expect(await db.organisation.count()).toBe(0);
  });

  it("accepts an organisation without a GSTIN (decided 6 Oct)", async () => {
    const asha = await signedIn(createApp(), "asha@example.test");
    const res = await asha.post("/api/organisations").send({ ...acme, gstin: null });
    expect(res.status).toBe(201);
    expect(res.body.organisation.gstin).toBeNull();
  });

  it("warns, but saves, when the GSTIN's state differs from the address (a branch elsewhere)", async () => {
    const asha = await signedIn(createApp(), "asha@example.test");
    const res = await asha.post("/api/organisations").send({ ...acme, gstin: "29ABCDE1234F1Z5" });
    expect(res.status).toBe(201);
    expect(res.body.warnings).toEqual([expect.stringMatching(/Karnataka.*Maharashtra/)]);
  });

  it("sends a second registration of the same PAN to Join instead", async () => {
    const app = createApp();
    await (await signedIn(app, "asha@example.test")).post("/api/organisations").send(acme);
    const ravi = await signedIn(app, "ravi@example.test");
    const res = await ravi.post("/api/organisations").send({ ...acme, legalName: "ACME STEEL LIMITED", pan: "ABCDE1234F" });
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ reason: "PAN_REGISTERED" });
    expect(await db.organisation.count()).toBe(1);
  });

  it("offers only organisation types that aren't retired", async () => {
    const active = await db.organisationType.create({ data: { name: "Private Limited Company" } });
    const retired = await db.organisationType.create({ data: { name: "Old type", retiredAt: new Date() } });
    const app = createApp();
    expect((await request(app).get("/api/master-data/organisation-types")).body).toEqual([
      { id: active.id, name: "Private Limited Company" },
    ]);
    const asha = await signedIn(app, "asha@example.test");
    const res = await asha.post("/api/organisations").send({ ...acme, orgTypeId: retired.id });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: "orgTypeId" })]);
  });

  it("asks for a login", async () => {
    expect((await request(createApp()).post("/api/organisations").send(acme)).status).toBe(401);
  });
});

describe("joining an organisation (spec §5.2)", () => {
  async function acmeRegistered(app: Express, overrides: Record<string, unknown> = {}) {
    const asha = await signedIn(app, "asha@example.test");
    const res = await asha.post("/api/organisations").send({ ...acme, ...overrides });
    return res.body.organisation as { id: string };
  }

  it("lets `abcde 1234f` with the GSTIN join the existing ABCDE1234F", async () => {
    const app = createApp();
    const organisation = await acmeRegistered(app);
    const ravi = await signedIn(app, "ravi@example.test");
    const res = await ravi.post("/api/organisations/join").send({ pan: "abcde 1234f", gstin: "27abcde1234f1z5" });
    expect(res.status).toBe(200);
    expect(res.body.organisation.id).toBe(organisation.id);
    expect(await db.organisationMember.count({ where: { organisationId: organisation.id } })).toBe(2);
    expect(await db.auditEvent.count({ where: { action: "organisation.member_joined" } })).toBe(1);
  });

  it("needs the GSTIN when the organisation has one, and says which state's is on record", async () => {
    const app = createApp();
    await acmeRegistered(app);
    const ravi = await signedIn(app, "ravi@example.test");
    const withEmail = await ravi.post("/api/organisations/join").send({ pan: "ABCDE1234F", officialEmail: "office@acmesteel.example" });
    expect(withEmail.status).toBe(400);
    expect(withEmail.body.error.details).toEqual([expect.objectContaining({ path: "gstin" })]);
    const wrong = await ravi.post("/api/organisations/join").send({ pan: "ABCDE1234F", gstin: "29ABCDE1234F1Z5" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details[0].message).toMatch(/Maharashtra/);
    expect(await db.organisationMember.count()).toBe(1);
  });

  it("joins an organisation without a GSTIN with its PAN and official email, ignoring letter case", async () => {
    const app = createApp();
    await acmeRegistered(app, { gstin: null });
    const ravi = await signedIn(app, "ravi@example.test");
    const wrong = await ravi.post("/api/organisations/join").send({ pan: "ABCDE1234F", officialEmail: "someone@acmesteel.example" });
    expect(wrong.status).toBe(400);
    const right = await ravi.post("/api/organisations/join").send({ pan: "ABCDE1234F", officialEmail: "OFFICE@acmesteel.example" });
    expect(right.status).toBe(200);
  });

  it("answers 'not found' for an unknown PAN", async () => {
    const ravi = await signedIn(createApp(), "ravi@example.test");
    const res = await ravi.post("/api/organisations/join").send({ pan: "ZZZZZ9999Z", gstin: "27ZZZZZ9999Z1Z5" });
    expect(res.status).toBe(404);
  });

  it("joining twice changes nothing", async () => {
    const app = createApp();
    const organisation = await acmeRegistered(app);
    const ravi = await signedIn(app, "ravi@example.test");
    for (let i = 0; i < 2; i += 1) {
      await ravi.post("/api/organisations/join").send({ pan: "ABCDE1234F", gstin: "27ABCDE1234F1Z5" });
    }
    expect(await db.organisationMember.count({ where: { organisationId: organisation.id } })).toBe(2);
  });
});

describe("seeing and editing an organisation", () => {
  it("gives 404 for another company, to read or to edit", async () => {
    const app = createApp();
    const asha = await signedIn(app, "asha@example.test");
    const organisation = (await asha.post("/api/organisations").send(acme)).body.organisation as { id: string };
    const ravi = await signedIn(app, "ravi@example.test");
    expect((await ravi.get(`/api/organisations/${organisation.id}`)).status).toBe(404);
    expect((await ravi.patch(`/api/organisations/${organisation.id}`).send({ city: "Mumbai" })).status).toBe(404);
    expect((await ravi.get("/api/organisations/mine")).body).toEqual([]);
    expect((await asha.get("/api/organisations/mine")).body).toHaveLength(1);
  });

  it("lets a member edit the profile, normalised, with before and after in the history", async () => {
    const app = createApp();
    const asha = await signedIn(app, "asha@example.test");
    const organisation = (await asha.post("/api/organisations").send(acme)).body.organisation as { id: string };
    const res = await asha.patch(`/api/organisations/${organisation.id}`).send({ city: "  Pimpri   Chinchwad ", pincode: "411018" });
    expect(res.status).toBe(200);
    expect(res.body.organisation).toMatchObject({ city: "Pimpri Chinchwad", pincode: "411018" });
    const [event] = await db.auditEvent.findMany({ where: { action: "organisation.updated" } });
    expect(event).toMatchObject({
      before: { city: "Pune", pincode: "411001" },
      after: { city: "Pimpri Chinchwad", pincode: "411018" },
    });
  });

  it("never lets a member change the PAN", async () => {
    const app = createApp();
    const asha = await signedIn(app, "asha@example.test");
    const organisation = (await asha.post("/api/organisations").send(acme)).body.organisation as { id: string };
    const res = await asha.patch(`/api/organisations/${organisation.id}`).send({ pan: "ZZZZZ9999Z" });
    expect(res.status).toBe(400);
    expect((await db.organisation.findUniqueOrThrow({ where: { id: organisation.id } })).pan).toBe("ABCDE1234F");
  });
});
