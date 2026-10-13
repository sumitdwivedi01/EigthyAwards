import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import {
  addEmploymentProof,
  addEvidence,
  addIdentityDocument,
  applicant,
  applyFully,
  openAward,
  passDeadline,
  setLinkedin,
  start,
} from "../../../tests/helpers/applying.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";

useTestDatabase();

describe("the award's applications list (spec §12)", () => {
  it("lists every application with counts, filtered by status, category and proof", async () => {
    const app = createApp();
    const award = await openAward(app, { maxEntries: 10 });
    const submitted = await applicant(app);
    const drafting = await applicant(app);
    await applyFully(submitted, award, award.categories.large);
    await start(drafting, award);

    const all = await award.staff.get(`/api/cycles/${award.cycleId}/applications`);
    expect(all.status).toBe(200);
    expect(all.body.entries).toEqual({ submitted: 1, limit: 10 });
    expect(all.body.counts.byStatus).toMatchObject({ DRAFT: 1, SUBMITTED: 1 });
    expect(all.body.counts.byProof).toMatchObject({ PENDING: 1, VERIFIED: 0, REJECTED: 0 });
    expect(all.body.applications).toHaveLength(2);
    // Staff see who applied: the organisation and the person who started it.
    expect(all.body.applications[0]).toMatchObject({ statusLabel: "Submitted", startedBy: { email: submitted.email }, category: { name: "Large" } });

    const filter = async (query: string) => (await award.staff.get(`/api/cycles/${award.cycleId}/applications?${query}`)).body.applications.length;
    expect(await filter("status=DRAFT")).toBe(1);
    expect(await filter(`categoryId=${award.categories.large}`)).toBe(1);
    expect(await filter("proof=PENDING")).toBe(1);
    expect(await filter("proof=VERIFIED")).toBe(0);
  });

  it("lets the department's head and the leader read it; another award's staff and jury are refused", async () => {
    const app = createApp();
    const award = await openAward(app);
    const other = await openAward(app);
    await platformPerson("head@example.test", [{ role: "DEPT_HEAD", departmentId: award.departmentId }]);
    await platformPerson("leader@example.test", [{ role: "LEADER" }]);
    await platformPerson("juror@example.test", [{ role: "JURY", departmentId: award.departmentId }]);
    for (const email of ["head@example.test", "leader@example.test"]) {
      expect((await (await signIn(app, email)).get(`/api/cycles/${award.cycleId}/applications`)).status).toBe(200);
    }
    expect((await (await signIn(app, "juror@example.test")).get(`/api/cycles/${award.cycleId}/applications`)).status).toBe(403);
    expect((await other.staff.get(`/api/cycles/${award.cycleId}/applications`)).status).toBe(403);
  });
});

describe("the proof check (spec §5.20)", () => {
  it("shows staff the profile's identity document and LinkedIn link next to the employment proof", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { id } = await applyFully(kiran, award);
    const review = await award.staff.get(`/api/applications/${id}/review`);
    expect(review.status).toBe(200);
    expect(review.body).toMatchObject({
      status: "SUBMITTED",
      identityDocument: { fileName: "passport.pdf" },
      linkedinUrl: "https://www.linkedin.com/in/test-person",
      employmentProof: { fileName: "id-card.pdf" },
      proof: { status: "PENDING" },
      canCheckProof: true,
      canRelease: true,
    });
  });

  it("verifies, after which the application keeps the identity document staff checked", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { id } = await applyFully(kiran, award);
    const checkedFile = (await db.application.findUniqueOrThrow({ where: { id } })).identityFileId;
    const verified = await award.staff.post(`/api/applications/${id}/proof-check`).send({ decision: "VERIFIED" });
    expect(verified.status).toBe(200);
    expect(verified.body.proof).toMatchObject({ status: "VERIFIED", checkedBy: expect.any(String) });
    expect(await db.auditEvent.count({ where: { action: "application.proof_checked", entityId: id } })).toBe(1);

    await addIdentityDocument(kiran.agent);
    expect((await db.application.findUniqueOrThrow({ where: { id } })).identityFileId).toBe(checkedFile);
  });

  it("rejects with a reason and emails the applicant, who fixes it before the deadline; the check is then pending again", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { id } = await applyFully(kiran, award);
    expect((await award.staff.post(`/api/applications/${id}/proof-check`).send({ decision: "REJECTED" })).status).toBe(400);
    // The proof can't be replaced while it is pending.
    expect((await addEmploymentProof(kiran.agent, id)).status).toBe(409);

    const rejected = await award.staff
      .post(`/api/applications/${id}/proof-check`)
      .send({ decision: "REJECTED", note: "The ID card shows another company's name." });
    expect(rejected.body.proof).toMatchObject({ status: "REJECTED", note: "The ID card shows another company's name." });
    const email = await db.emailLog.findFirstOrThrow({ where: { template: "proof-rejected" } });
    expect(email.to).toBe(kiran.email);
    const mine = await kiran.agent.get(`/api/applications/${id}`);
    expect(mine.body).toMatchObject({ proof: { status: "REJECTED", note: "The ID card shows another company's name." }, canReplaceProof: true });

    const fixed = await addEmploymentProof(kiran.agent, id);
    expect(fixed.status).toBe(200);
    expect(fixed.body.proof).toMatchObject({ status: "PENDING", note: null });
    expect(await db.fileAsset.count({ where: { applicationId: id, kind: "EMPLOYMENT_PROOF", removedAt: { not: null } } })).toBe(1);
  });

  it("lets a fix on the profile reach a submitted application until its proof is verified", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { id } = await applyFully(kiran, award);
    await award.staff.post(`/api/applications/${id}/proof-check`).send({ decision: "REJECTED", note: "The LinkedIn link is someone else's." });
    await setLinkedin(kiran.agent, "https://www.linkedin.com/in/the-right-person");
    expect(await db.application.findUniqueOrThrow({ where: { id } })).toMatchObject({
      linkedinUrl: "https://www.linkedin.com/in/the-right-person",
      proofStatus: "PENDING",
    });
  });

  it("is only for the award's staff, and only for a submitted application", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const deepa = await applicant(app);
    const { id } = await applyFully(kiran, award);
    const draft = await start(deepa, award);
    await platformPerson("head@example.test", [{ role: "DEPT_HEAD", departmentId: award.departmentId }]);
    const head = await signIn(app, "head@example.test");
    expect((await head.post(`/api/applications/${id}/proof-check`).send({ decision: "VERIFIED" })).status).toBe(403);
    expect((await head.get(`/api/applications/${id}/review`)).body.canCheckProof).toBe(false);
    expect((await award.staff.post(`/api/applications/${draft.body.id}/proof-check`).send({ decision: "VERIFIED" })).status).toBe(409);
  });
});

describe("releasing an application (spec §5.2, ADR 0011)", () => {
  it("releases with a reason, audited; the organisation can start again and the starter sees why", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const deepa = await applicant(app, { organisationId: kiran.organisationId });
    const { body } = await start(kiran, award);
    expect((await award.staff.post(`/api/applications/${body.id}/release`).send({})).status).toBe(400);
    const released = await award.staff.post(`/api/applications/${body.id}/release`).send({ reason: "Started by the wrong person" });
    expect(released.body).toMatchObject({ status: "RELEASED", release: { reason: "Started by the wrong person" } });
    expect(await db.auditEvent.findFirstOrThrow({ where: { action: "application.released" } })).toMatchObject({ reason: "Started by the wrong person" });

    expect((await start(deepa, award)).status).toBe(201);
    const kiransRow = (await kiran.agent.get("/api/applications/mine")).body.find((r: { id: string }) => r.id === body.id);
    expect(kiransRow.status).toMatchObject({ label: "Closed", message: expect.stringContaining("Started by the wrong person") });
    // Deepa sees her own application, not the released one.
    expect((await deepa.agent.get("/api/applications/mine")).body.map((r: { id: string }) => r.id)).not.toContain(body.id);
  });

  it("is only for the award's staff", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { body } = await start(kiran, award);
    await platformPerson("leader@example.test", [{ role: "LEADER" }]);
    const leader = await signIn(app, "leader@example.test");
    expect((await leader.post(`/api/applications/${body.id}/release`).send({ reason: "Testing" })).status).toBe(403);
  });
});

describe("reading files (GAPS G-B03)", () => {
  it("gives a short-lived link to the applicant and the award's staff, never to anyone else", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const stranger = await applicant(app);
    const started = await start(kiran, award);
    const withFile = await addEvidence(kiran.agent, started.body.id, award.q.report);
    const fileId = withFile.body.files[award.q.report][0].id;
    await platformPerson("juror@example.test", [{ role: "JURY", departmentId: award.departmentId }]);
    const juror = await signIn(app, "juror@example.test");

    const mine = await kiran.agent.get(`/api/files/${fileId}`);
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ fileName: "report.pdf", contentType: "application/pdf" });
    const download = await kiran.agent.get(mine.body.url);
    expect(download.status).toBe(200);
    expect((await award.staff.get(`/api/files/${fileId}`)).status).toBe(200);
    expect((await stranger.agent.get(`/api/files/${fileId}`)).status).toBe(404);
    expect((await juror.get(`/api/files/${fileId}`)).status).toBe(404);
  });

  it("lets staff read the identity document an application uses, and nobody else's", async () => {
    const app = createApp();
    const award = await openAward(app);
    const other = await openAward(app);
    const kiran = await applicant(app);
    const { id } = await applyFully(kiran, award);
    const identityFileId = (await db.application.findUniqueOrThrow({ where: { id } })).identityFileId as string;
    expect((await award.staff.get(`/api/files/${identityFileId}`)).status).toBe(200);
    expect((await other.staff.get(`/api/files/${identityFileId}`)).status).toBe(404);
    expect((await kiran.agent.get(`/api/files/${identityFileId}`)).status).toBe(200);
  });

  it("stops serving a file taken off a draft; staff still open the draft once the deadline closed it", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const started = await start(kiran, award);
    const withFile = await addEvidence(kiran.agent, started.body.id, award.q.report);
    const fileId = withFile.body.files[award.q.report][0].id;
    await kiran.agent.delete(`/api/applications/${started.body.id}/files/${fileId}`);
    expect((await kiran.agent.get(`/api/files/${fileId}`)).status).toBe(404);
    await passDeadline(award.cycleId);
    expect((await award.staff.get(`/api/applications/${started.body.id}/review`)).body.status).toBe("NOT_SUBMITTED");
  });
});
