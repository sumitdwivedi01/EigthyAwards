import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import {
  addEmploymentProof,
  addEvidence,
  applicant,
  applyFully,
  completeAnswers,
  openAward,
  passDeadline,
  PDF,
  PNG,
  start,
} from "../../../tests/helpers/applying.js";
import { platformPerson, signIn } from "../../../tests/helpers/http.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { addMonths, istToday } from "./dates.js";

useTestDatabase();

describe("starting an application (spec §5.2, ADR 0011)", () => {
  it("starts one for the applicant's organisation in an open award, with the latest questions", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const res = await start(kiran, award);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: { code: "PENDING", label: "Pending" },
      category: { id: award.categories.general, name: "General" },
      form: { version: 1 },
      fee: { amountPaise: 0, paid: false },
      editable: true,
      entries: { submitted: 0, limit: null },
    });
    expect(res.body.missing.map((m: { path: string }) => m.path)).toEqual([
      `answers.${award.q.siteName}`,
      `answers.${award.q.employees}`,
      `answers.${award.q.sector}`,
      `answers.${award.q.training}`,
      `answers.${award.q.audit}`,
      "employmentProof",
    ]);
  });

  it("refuses a second start by the same organisation, naming the status only", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const deepa = await applicant(app, { organisationId: kiran.organisationId });
    expect((await start(kiran, award)).status).toBe(201);
    const second = await start(deepa, award);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatchObject({
      message: "Your organisation already has an application for this award (Pending).",
      details: { reason: "ALREADY_STARTED", status: "Pending" },
    });
    expect(JSON.stringify(second.body)).not.toContain(kiran.email);
  });

  it("lets only one of two colleagues starting at the same moment through", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const deepa = await applicant(app, { organisationId: kiran.organisationId });
    const results = await Promise.all([start(kiran, award), start(deepa, award)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.application.count({ where: { cycleId: award.cycleId } })).toBe(1);
  });

  it("shows a colleague the application read-only, with its status and never who started it", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const deepa = await applicant(app, { organisationId: kiran.organisationId });
    const started = await start(kiran, award);
    const mine = await deepa.agent.get("/api/applications/mine");
    expect(mine.body).toEqual([
      expect.objectContaining({ id: started.body.id, mine: false, status: expect.objectContaining({ label: "Pending" }), category: null, proof: null }),
    ]);
    const kiranUser = await db.user.findUniqueOrThrow({ where: { id: kiran.userId } });
    expect(JSON.stringify(mine.body)).not.toContain(kiranUser.name);
    expect(JSON.stringify(mine.body)).not.toContain(kiran.email);
    // The application itself opens only for the person who started it.
    expect((await deepa.agent.get(`/api/applications/${started.body.id}`)).status).toBe(404);
    expect((await deepa.agent.put(`/api/applications/${started.body.id}/answers`).send({ answers: { [award.q.siteName]: "x" } })).status).toBe(404);
  });

  it("answers 404 to another organisation, and refuses platform accounts", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const stranger = await applicant(app);
    const { body } = await start(kiran, award);
    expect((await stranger.agent.get(`/api/applications/${body.id}`)).status).toBe(404);
    await platformPerson("juror@example.test", [{ role: "JURY", departmentId: award.departmentId }]);
    const juror = await signIn(app, "juror@example.test");
    expect((await juror.post(`/api/cycles/${award.cycleId}/applications`).send({ categoryId: award.categories.general })).status).toBe(403);
  });

  it("needs an organisation, a category of this award, and an open award", async () => {
    const app = createApp();
    const award = await openAward(app);
    const other = await openAward(app);
    const loner = await applicant(app);
    await db.organisationMember.deleteMany({ where: { userId: loner.userId } });
    const noOrg = await start(loner, award);
    expect(noOrg.status).toBe(409);
    expect(noOrg.body.error.details.reason).toBe("NO_ORGANISATION");

    const kiran = await applicant(app);
    const wrongCategory = await start(kiran, award, other.categories.general);
    expect(wrongCategory.status).toBe(400);
    expect(wrongCategory.body.error.details).toEqual([expect.objectContaining({ path: "categoryId" })]);

    await passDeadline(award.cycleId);
    expect((await start(kiran, award)).status).toBe(409);
  });
});

describe("the fee (spec §5.6)", () => {
  it("keeps the form locked until the fee is paid, and charges the category's own fee", async () => {
    const app = createApp();
    const award = await openAward(app, { feePaise: 1_000_000, largeFeePaise: 2_500_000 });
    const kiran = await applicant(app);
    const started = await start(kiran, award, award.categories.large);
    const id = started.body.id;
    expect(started.body).toMatchObject({ fee: { amountPaise: 2_500_000, paid: false }, editable: false });
    expect(started.body.missing[0]).toEqual({ path: "fee", message: "Pay the entry fee." });
    const locked = await kiran.agent.put(`/api/applications/${id}/answers`).send({ answers: { [award.q.siteName]: "Pune" } });
    expect(locked.status).toBe(409);
    expect(locked.body.error.details.reason).toBe("FEE_UNPAID");

    const paid = await kiran.agent.post(`/api/applications/${id}/payment`).send({});
    expect(paid.status).toBe(200);
    expect(paid.body).toMatchObject({ fee: { amountPaise: 2_500_000, paid: true }, editable: true });
    expect(paid.body.fee.reference).toMatch(/^DEMO-[0-9A-F]{10}$/);
    expect((await kiran.agent.post(`/api/applications/${id}/payment`).send({})).status).toBe(409);
    expect((await kiran.agent.put(`/api/applications/${id}/answers`).send({ answers: { [award.q.siteName]: "Pune" } })).status).toBe(200);
    // The category, and so the fee, is fixed once paid.
    expect((await kiran.agent.patch(`/api/applications/${id}`).send({ categoryId: award.categories.general })).status).toBe(409);
  });

  it("has nothing to pay in a free award, and lets the category change while it is a draft", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { body } = await start(kiran, award);
    expect(body.editable).toBe(true);
    expect((await kiran.agent.post(`/api/applications/${body.id}/payment`).send({})).status).toBe(409);
    const changed = await kiran.agent.patch(`/api/applications/${body.id}`).send({ categoryId: award.categories.large });
    expect(changed.body.category.name).toBe("Large");
  });
});

describe("filling the form (spec §5.6)", () => {
  it("saves a partial draft, and refuses each wrong answer with its own message while saving the rest", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { body } = await start(kiran, award);
    const { q } = award;
    const saved = await kiran.agent.put(`/api/applications/${body.id}/answers`).send({
      answers: {
        [q.siteName]: "  Pune works  ",
        [q.employees]: 0,
        [q.sector]: "Steel",
        [q.training]: 42,
        [q.audit]: "yes",
      },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.problems).toEqual([
      { questionKey: q.employees, message: "Enter a number from 1 to 100000." },
      { questionKey: q.sector, message: "Pick one of the choices." },
      { questionKey: q.training, message: "Type your answer as text." },
      { questionKey: q.audit, message: "Answer Yes or No." },
    ]);
    expect(saved.body.application.answers).toEqual({ [q.siteName]: "Pune works" });
    expect(saved.body.application.progress).toMatchObject({ answered: 1, total: 6 });

    // Leaving and coming back finds it as it was; empty text clears an answer.
    const again = await kiran.agent.get(`/api/applications/${body.id}`);
    expect(again.body.answers).toEqual({ [q.siteName]: "Pune works" });
    const cleared = await kiran.agent.put(`/api/applications/${body.id}/answers`).send({ answers: { [q.siteName]: "" } });
    expect(cleared.body.application.answers).toEqual({});
  });

  it("adds files to a file question within its kinds and count, checking their content, and removes them", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { body } = await start(kiran, award);
    const id = body.id;
    expect((await addEvidence(kiran.agent, id, award.q.report)).status).toBe(200);
    const second = await addEvidence(kiran.agent, id, award.q.report, PNG, "image/png");
    expect(second.body.files[award.q.report]).toHaveLength(2);
    expect(second.body.progress.sections[1]).toMatchObject({ answered: 1 });
    const third = await addEvidence(kiran.agent, id, award.q.report);
    expect(third.status).toBe(409);
    expect(third.body.error.details.reason).toBe("TOO_MANY_FILES");

    const word = await kiran.agent.post(`/api/applications/${id}/files`).send({
      questionKey: award.q.report,
      fileName: "report.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 100,
    });
    expect(word.status).toBe(400);
    expect(word.body.error.details).toEqual([{ path: "contentType", message: "This question takes PDF, PNG files." }]);
    const notAFile = await kiran.agent.post(`/api/applications/${id}/files`).send({ questionKey: award.q.siteName, fileName: "a.pdf", contentType: "application/pdf", sizeBytes: 10 });
    expect(notAFile.status).toBe(400);

    const removed = await kiran.agent.delete(`/api/applications/${id}/files/${second.body.files[award.q.report][1].id}`);
    expect(removed.body.files[award.q.report]).toHaveLength(1);
    // A file whose bytes aren't what it claims is refused.
    const started = await kiran.agent.post(`/api/applications/${id}/files`).send({ questionKey: award.q.report, fileName: "fake.pdf", contentType: "application/pdf", sizeBytes: PNG.length });
    await kiran.agent.put(started.body.upload.url).set("Content-Type", "application/pdf").send(PNG);
    const fake = await kiran.agent.put(`/api/applications/${id}/files/${started.body.fileId}`).send({});
    expect(fake.status).toBe(400);
    // Nothing is deleted: the removed file is kept, marked.
    expect(await db.fileAsset.count({ where: { applicationId: id, removedAt: { not: null } } })).toBe(1);
  });
});

describe("the proof of employment (spec §5.20, ADR 0012)", () => {
  it("accepts a document dated within the last 3 months, and refuses an older or a future one", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { body } = await start(kiran, award);
    const today = istToday(new Date());
    const tooOld = await addEmploymentProof(kiran.agent, body.id, dayBefore(addMonths(today, -3)));
    expect(tooOld.status).toBe(400);
    expect(tooOld.body.error.details).toEqual([expect.objectContaining({ path: "documentDate" })]);
    expect(tooOld.body.error.details[0].message).toMatch(/within the last 3 months/);
    const future = await addEmploymentProof(kiran.agent, body.id, addMonths(today, 1));
    expect(future.status).toBe(400);
    const edge = await addEmploymentProof(kiran.agent, body.id, addMonths(today, -3));
    expect(edge.status).toBe(200);
    expect(edge.body.employmentProof).toMatchObject({ fileName: "id-card.pdf", documentDate: addMonths(today, -3) });
  });

  it("asks for consent at every upload", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { body } = await start(kiran, award);
    const res = await kiran.agent
      .post(`/api/applications/${body.id}/employment-proof/uploads`)
      .send({ fileName: "id.pdf", contentType: "application/pdf", sizeBytes: PDF.length, documentDate: istToday(new Date()) });
    expect(res.status).toBe(400);
  });
});

function dayBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

describe("submitting (spec §5.6, §5.20)", () => {
  it("is refused while an answer, the employment proof, the identity document or the LinkedIn link is missing", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app, { profile: false });
    const { body } = await start(kiran, award);
    await kiran.agent.put(`/api/applications/${body.id}/answers`).send({ answers: { [award.q.siteName]: "Pune" } });
    const refused = await kiran.agent.post(`/api/applications/${body.id}/submit`).send({});
    expect(refused.status).toBe(400);
    expect(refused.body.error.details.map((d: { path: string }) => d.path)).toEqual([
      `answers.${award.q.employees}`,
      `answers.${award.q.sector}`,
      `answers.${award.q.training}`,
      `answers.${award.q.audit}`,
      "employmentProof",
      "profile.identityDocument",
      "profile.linkedinUrl",
    ]);
  });

  it("submits a complete application: the snapshot, the version, the proof it uses, and the emails", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { id, submitted } = await applyFully(kiran, award);
    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({
      status: { code: "SUBMITTED", label: "Submitted" },
      editable: false,
      missing: [],
      proof: { status: "PENDING" },
      entries: { submitted: 1, limit: null },
    });
    const stored = await db.application.findUniqueOrThrow({ where: { id }, include: { organisation: true, createdBy: true } });
    expect(stored.identitySnapshot).toMatchObject({ legalName: stored.organisation.legalName, pan: stored.organisation.pan });
    expect(stored.identityFileId).toBe(stored.createdBy.identityFileId);
    expect(stored.linkedinUrl).toBe(stored.createdBy.linkedinUrl);
    const emails = await db.emailLog.findMany({ where: { template: "application-submitted" } });
    expect(emails.map((e) => e.to).sort()).toEqual([kiran.email, stored.organisation.officialEmail].sort());
    // Submitted answers are fixed (Save changes is Phase 2), and it can't be submitted twice.
    expect((await kiran.agent.put(`/api/applications/${id}/answers`).send({ answers: completeAnswers(award.q) })).status).toBe(409);
    expect((await kiran.agent.post(`/api/applications/${id}/submit`).send({})).status).toBe(409);
  });

  it("reuses the profile's identity document for an application to a second award", async () => {
    const app = createApp();
    const first = await openAward(app);
    const second = await openAward(app);
    const kiran = await applicant(app);
    const a = await applyFully(kiran, first);
    const b = await applyFully(kiran, second);
    expect(b.submitted.status).toBe(200);
    const [one, two] = await db.application.findMany({ where: { id: { in: [a.id, b.id] } }, select: { identityFileId: true } });
    expect(one?.identityFileId).toBeTruthy();
    expect(one?.identityFileId).toBe(two?.identityFileId);
    expect(await db.fileAsset.count({ where: { kind: "IDENTITY_PROOF" } })).toBe(1);
  });
});

describe("the entry limit (spec §5.20)", () => {
  it("refuses the submission after the limit, and lets only one of two racing for the last place in", async () => {
    const app = createApp();
    const award = await openAward(app, { maxEntries: 2 });
    const first = await applicant(app);
    expect((await applyFully(first, award)).submitted.status).toBe(200);

    const racers = [await applicant(app), await applicant(app)];
    const ids: string[] = [];
    for (const racer of racers) {
      const { body } = await start(racer, award);
      await racer.agent.put(`/api/applications/${body.id}/answers`).send({ answers: completeAnswers(award.q) });
      await addEmploymentProof(racer.agent, body.id);
      ids.push(body.id);
    }
    const results = await Promise.all(racers.map((racer, i) => racer.agent.post(`/api/applications/${ids[i]}/submit`).send({})));
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const refused = results.find((r) => r.status === 409);
    expect(refused?.body.error).toMatchObject({ message: "This award has reached its entry limit.", details: { reason: "ENTRY_LIMIT" } });
    expect(await db.application.count({ where: { cycleId: award.cycleId, status: "SUBMITTED" } })).toBe(2);
    // The refused draft stays saved, and the public counter reads 2 / 2.
    const site = await db.awardSite.findUniqueOrThrow({ where: { awardId: award.awardId } });
    expect((await request(app).get(`/api/public/awards/${site.slug}`)).body.cycle.entries).toEqual({ submitted: 2, limit: 2 });
  });
});

describe("the deadline lock (spec §5.6, §5.7)", () => {
  it("refuses every write after the deadline with 409, and turns drafts into Not submitted", async () => {
    const app = createApp();
    const award = await openAward(app, { feePaise: 50_000 });
    const kiran = await applicant(app);
    const { body } = await start(kiran, award);
    const id = body.id;
    await passDeadline(award.cycleId);
    const writes = [
      await kiran.agent.post(`/api/applications/${id}/payment`).send({}),
      await kiran.agent.put(`/api/applications/${id}/answers`).send({ answers: { [award.q.siteName]: "x" } }),
      await kiran.agent.post(`/api/applications/${id}/files`).send({ questionKey: award.q.report, fileName: "a.pdf", contentType: "application/pdf", sizeBytes: 10 }),
      await kiran.agent.post(`/api/applications/${id}/employment-proof/uploads`).send({ fileName: "a.pdf", contentType: "application/pdf", sizeBytes: 10, documentDate: istToday(new Date()), consent: true }),
      await kiran.agent.patch(`/api/applications/${id}`).send({ categoryId: award.categories.large }),
      await kiran.agent.post(`/api/applications/${id}/submit`).send({}),
    ];
    expect(writes.map((r) => r.status)).toEqual([409, 409, 409, 409, 409, 409]);
    const view = await kiran.agent.get(`/api/applications/${id}`);
    expect(view.body).toMatchObject({ status: { code: "NOT_SUBMITTED", label: "Not submitted" }, editable: false });
    expect(await db.application.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "NOT_SUBMITTED" });
    expect(await db.cycle.findUniqueOrThrow({ where: { id: award.cycleId } })).toMatchObject({ status: "CLOSED" });
    expect(await db.auditEvent.count({ where: { action: "cycle.closed" } })).toBe(1);
  });

  it("keeps a submitted application's organisation snapshot after the organisation's name changes", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { id } = await applyFully(kiran, award);
    const organisation = await db.organisation.findUniqueOrThrow({ where: { id: kiran.organisationId } });
    await passDeadline(award.cycleId);
    const review = await award.staff.get(`/api/applications/${id}/review`);
    expect(review.body.organisation).toMatchObject({ legalName: organisation.legalName, fromSnapshot: true });
    await db.organisation.update({ where: { id: organisation.id }, data: { legalName: "Renamed Industries Ltd" } });
    const after = await award.staff.get(`/api/applications/${id}/review`);
    expect(after.body.organisation.legalName).toBe(organisation.legalName);
    expect((await kiran.agent.get(`/api/applications/${id}`)).body.status).toMatchObject({ label: "Under review" });
  });
});

describe("rule 4: an application opens with its own version of the questions", () => {
  it("keeps showing a submitted application with the version it was submitted with", async () => {
    const app = createApp();
    const award = await openAward(app);
    const kiran = await applicant(app);
    const { id } = await applyFully(kiran, award);
    const deepa = await applicant(app);
    const draft = await start(deepa, award);

    // Staff add a question and publish version 2.
    const form = await award.staff.get(`/api/cycles/${award.cycleId}/form`);
    const sections = form.body.draft.sections;
    sections[0].questions.push({ type: "SHORT_TEXT", label: "Website", required: false, help: "" });
    expect((await award.staff.put(`/api/cycles/${award.cycleId}/form-draft`).send({ sections })).status).toBe(200);
    expect((await award.staff.post(`/api/cycles/${award.cycleId}/form-versions`).send({ changeSummary: "Website added" })).status).toBe(201);

    const submitted = await kiran.agent.get(`/api/applications/${id}`);
    expect(submitted.body.form.version).toBe(1);
    expect(submitted.body.form.sections[0].questions.map((q: { label: string }) => q.label)).not.toContain("Website");
    const following = await deepa.agent.get(`/api/applications/${draft.body.id}`);
    expect(following.body.form.version).toBe(2);
    expect(following.body.form.sections[0].questions.map((q: { label: string }) => q.label)).toContain("Website");
  });
});
