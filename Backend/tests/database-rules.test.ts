import { describe, expect, it } from "vitest";
import { db } from "../src/lib/db.js";
import {
  createApplication,
  createCycle,
  createDepartment,
  createFile,
  createOrganisation,
  createRound,
  createSitePage,
  createUser,
  gstinFor,
  randomPan,
} from "./helpers/factories.js";
import { useTestDatabase } from "./helpers/database.js";

useTestDatabase();

// These tests talk to the database directly, on purpose: they prove the database itself refuses
// rule-breaking data even if a service has a bug (the "second line of defence").

describe("append-only history (rule 3, rule 4)", () => {
  it("refuses to update or delete an audit event", async () => {
    const event = await db.auditEvent.create({
      data: { action: "test.created", entityType: "test", entityId: "1" },
    });
    await expect(
      db.auditEvent.update({ where: { id: event.id }, data: { reason: "tampered" } }),
    ).rejects.toThrow(/append-only/);
    await expect(db.auditEvent.delete({ where: { id: event.id } })).rejects.toThrow(/append-only/);
  });

  it("refuses to change a published form version", async () => {
    const { cycle } = await createCycle();
    const version = await db.formVersion.create({
      data: { cycleId: cycle.id, version: 1, schema: { sections: [] }, changeSummary: "First version" },
    });
    await expect(
      db.formVersion.update({ where: { id: version.id }, data: { changeSummary: "edited" } }),
    ).rejects.toThrow(/append-only/);
    await expect(db.formVersion.delete({ where: { id: version.id } })).rejects.toThrow(/append-only/);
  });

  it("refuses to change a published award-site page version (ADR 0009)", async () => {
    const { award } = await createCycle();
    const { page } = await createSitePage(award.id);
    const version = await db.sitePageVersion.create({
      data: { pageId: page.id, version: 1, sections: [], seo: {} },
    });
    await expect(
      db.sitePageVersion.update({ where: { id: version.id }, data: { sections: [{ type: "banner" }] } }),
    ).rejects.toThrow(/append-only/);
    await expect(db.sitePageVersion.delete({ where: { id: version.id } })).rejects.toThrow(/append-only/);
  });

  it("refuses to change disqualification history", async () => {
    const { cycle, category } = await createCycle();
    const application = await createApplication(cycle.id, category.id);
    const staff = await createUser();
    const event = await db.disqualificationEvent.create({
      data: {
        applicationId: application.id,
        action: "DISQUALIFY",
        byUserId: staff.id,
        byRole: "AWARD_STAFF",
        reason: "Fake application",
      },
    });
    await expect(
      db.disqualificationEvent.update({ where: { id: event.id }, data: { reason: "edited" } }),
    ).rejects.toThrow(/append-only/);
  });
});

describe("roles (ADR 0014: five roles, no PA)", () => {
  it("allows exactly one active leader", async () => {
    const first = await createUser();
    const second = await createUser();
    await db.roleAssignment.create({ data: { userId: first.id, role: "LEADER" } });
    await expect(db.roleAssignment.create({ data: { userId: second.id, role: "LEADER" } })).rejects.toThrow();
  });

  it("allows a new leader once the old leader role is revoked", async () => {
    const first = await createUser();
    const second = await createUser();
    const old = await db.roleAssignment.create({ data: { userId: first.id, role: "LEADER" } });
    await db.roleAssignment.update({ where: { id: old.id }, data: { revokedAt: new Date() } });
    await expect(db.roleAssignment.create({ data: { userId: second.id, role: "LEADER" } })).resolves.toBeTruthy();
  });

  it("refuses a role without its proper scope", async () => {
    const user = await createUser();
    const department = await createDepartment();
    // A department head needs a department; the leader must have no scope.
    await expect(db.roleAssignment.create({ data: { userId: user.id, role: "DEPT_HEAD" } })).rejects.toThrow(
      /role_assignments_scope_check/,
    );
    await expect(
      db.roleAssignment.create({ data: { userId: user.id, role: "LEADER", departmentId: department.id } }),
    ).rejects.toThrow(/role_assignments_scope_check/);
  });

  it("refuses the same active role twice in the same scope, but allows many awards for one staff member", async () => {
    const staff = await createUser();
    const { award: awardA } = await createCycle();
    const { award: awardB } = await createCycle();
    await db.roleAssignment.create({ data: { userId: staff.id, role: "AWARD_STAFF", awardId: awardA.id } });
    await db.roleAssignment.create({ data: { userId: staff.id, role: "AWARD_STAFF", awardId: awardB.id } });
    await expect(
      db.roleAssignment.create({ data: { userId: staff.id, role: "AWARD_STAFF", awardId: awardA.id } }),
    ).rejects.toThrow();
    const head = await createUser();
    const department = await createDepartment();
    await db.roleAssignment.create({ data: { userId: head.id, role: "DEPT_HEAD", departmentId: department.id } });
    await expect(
      db.roleAssignment.create({ data: { userId: head.id, role: "DEPT_HEAD", departmentId: department.id } }),
    ).rejects.toThrow();
  });
});

describe("data consistency (spec §5.18)", () => {
  it("treats emails and department names as the same regardless of letter case", async () => {
    await createUser({ email: "asha@example.test" });
    await expect(createUser({ email: "ASHA@Example.test" })).rejects.toThrow();
    await createDepartment({ name: "Energy" });
    await expect(createDepartment({ name: "energy" })).rejects.toThrow();
  });

  it("allows one organisation per PAN", async () => {
    const pan = randomPan();
    await createOrganisation({ pan, gstin: gstinFor(pan) });
    await expect(createOrganisation({ pan, gstin: null })).rejects.toThrow();
  });

  it("refuses a badly formatted PAN, and a GSTIN that doesn't contain the PAN", async () => {
    await expect(createOrganisation({ pan: "abcde1234f", gstin: null })).rejects.toThrow(
      /organisations_pan_format_check/,
    );
    await expect(createOrganisation({ pan: "ABCDE1234F", gstin: gstinFor("ZZZZZ9999Z") })).rejects.toThrow(
      /organisations_gstin_check/,
    );
  });

  it("allows an organisation without a GSTIN (decided 6 Oct)", async () => {
    await expect(createOrganisation({ gstin: null })).resolves.toBeTruthy();
  });

  it("refuses an unnormalised phone or PIN code", async () => {
    await expect(createOrganisation({ phone: "98765 43210" })).rejects.toThrow(/organisations_phone_check/);
    await expect(createOrganisation({ pincode: "011001" })).rejects.toThrow(/organisations_pincode_check/);
  });
});

describe("My profile (ADR 0012)", () => {
  it("stores a person's phone only in the normalised +91 form", async () => {
    await expect(createUser({ phone: "+919876543210" })).resolves.toBeTruthy();
    await expect(createUser({ phone: "98765 43210" })).rejects.toThrow(/users_phone_check/);
  });

  it("accepts only an http(s) LinkedIn link", async () => {
    await expect(createUser({ linkedinUrl: "https://www.linkedin.com/in/asha" })).resolves.toBeTruthy();
    await expect(createUser({ linkedinUrl: "javascript:alert(1)" })).rejects.toThrow(/users_linkedin_check/);
  });
});

describe("one award's data stays apart from another's", () => {
  it("refuses an application whose entry category belongs to a different cycle", async () => {
    const first = await createCycle();
    const second = await createCycle();
    await expect(createApplication(first.cycle.id, second.category.id)).rejects.toThrow();
  });

  it("refuses an evaluation whose round belongs to a different cycle than its application", async () => {
    const first = await createCycle();
    const second = await createCycle();
    const round = await createRound(second.cycle.id);
    const application = await createApplication(first.cycle.id, first.category.id);
    const jury = await createUser();
    await expect(
      db.evaluation.create({
        data: { cycleId: first.cycle.id, roundId: round.id, applicationId: application.id, juryUserId: jury.id },
      }),
    ).rejects.toThrow();
  });
});

describe("one application per organisation per cycle (ADR 0011)", () => {
  it("refuses a second active application from the same organisation in the same cycle", async () => {
    const { cycle, category } = await createCycle();
    const organisation = await createOrganisation();
    await createApplication(cycle.id, category.id, { organisationId: organisation.id });
    // A colleague's start, even if the service check were skipped.
    await expect(createApplication(cycle.id, category.id, { organisationId: organisation.id })).rejects.toThrow();
    expect(await db.application.count({ where: { cycleId: cycle.id, organisationId: organisation.id } })).toBe(1);
  });

  it("refuses it for every active status, including Submitted and Not submitted", async () => {
    const { cycle, category } = await createCycle();
    const organisation = await createOrganisation();
    const first = await createApplication(cycle.id, category.id, { organisationId: organisation.id });
    for (const status of ["SUBMITTED", "NOT_SUBMITTED"] as const) {
      await db.application.update({ where: { id: first.id }, data: { status } });
      await expect(createApplication(cycle.id, category.id, { organisationId: organisation.id })).rejects.toThrow();
    }
  });

  it("frees the place once the application is withdrawn", async () => {
    const { cycle, category } = await createCycle();
    const organisation = await createOrganisation();
    const first = await createApplication(cycle.id, category.id, { organisationId: organisation.id });
    await db.application.update({ where: { id: first.id }, data: { status: "WITHDRAWN", withdrawnAt: new Date() } });
    await expect(createApplication(cycle.id, category.id, { organisationId: organisation.id })).resolves.toBeTruthy();
  });

  it("frees the place once staff release the application, with who, when and why", async () => {
    const { cycle, category } = await createCycle();
    const organisation = await createOrganisation();
    const staff = await createUser();
    const first = await createApplication(cycle.id, category.id, { organisationId: organisation.id });
    await db.application.update({
      where: { id: first.id },
      data: { status: "RELEASED", releasedAt: new Date(), releasedById: staff.id, releaseReason: "Wrong person" },
    });
    await expect(createApplication(cycle.id, category.id, { organisationId: organisation.id })).resolves.toBeTruthy();
  });

  it("allows the same organisation in a different cycle", async () => {
    const first = await createCycle();
    const second = await createCycle();
    const organisation = await createOrganisation();
    await createApplication(first.cycle.id, first.category.id, { organisationId: organisation.id });
    await expect(
      createApplication(second.cycle.id, second.category.id, { organisationId: organisation.id }),
    ).resolves.toBeTruthy();
  });

  it("refuses a release without its reason, and release details on an application that isn't released", async () => {
    const { cycle, category } = await createCycle();
    const staff = await createUser();
    const application = await createApplication(cycle.id, category.id);
    await expect(
      db.application.update({
        where: { id: application.id },
        data: { status: "RELEASED", releasedAt: new Date(), releasedById: staff.id },
      }),
    ).rejects.toThrow(/applications_release_check/);
    await expect(
      db.application.update({
        where: { id: application.id },
        data: { status: "RELEASED", releasedAt: new Date(), releasedById: staff.id, releaseReason: "   " },
      }),
    ).rejects.toThrow(/applications_release_check/);
    await expect(
      db.application.update({ where: { id: application.id }, data: { releaseReason: "Not released" } }),
    ).rejects.toThrow(/applications_release_check/);
  });
});

describe("the entry limit (ADR 0010)", () => {
  it("accepts no limit or a positive one, and refuses zero or less", async () => {
    await expect(createCycle({ maxEntries: null })).resolves.toBeTruthy();
    await expect(createCycle({ maxEntries: 500 })).resolves.toBeTruthy();
    await expect(createCycle({ maxEntries: 0 })).rejects.toThrow(/cycles_max_entries_check/);
    await expect(createCycle({ maxEntries: -1 })).rejects.toThrow(/cycles_max_entries_check/);
  });
});

describe("proof documents (ADR 0010, 0012)", () => {
  it("keeps an identity document on the person's profile, never on an application", async () => {
    const { cycle, category } = await createCycle();
    const applicant = await createUser();
    const application = await createApplication(cycle.id, category.id, { createdById: applicant.id });
    await expect(
      createFile("IDENTITY_PROOF", { ownerUserId: applicant.id, consentAt: new Date() }),
    ).resolves.toBeTruthy();
    await expect(
      createFile("IDENTITY_PROOF", { applicationId: application.id, consentAt: new Date() }),
    ).rejects.toThrow(/file_assets_owner_check/);
  });

  it("refuses a file with two owners, or with none", async () => {
    const { cycle, category } = await createCycle();
    const applicant = await createUser();
    const application = await createApplication(cycle.id, category.id, { createdById: applicant.id });
    await expect(
      createFile("EVIDENCE", { applicationId: application.id, ownerUserId: applicant.id }),
    ).rejects.toThrow(/file_assets_owner_check/);
    await expect(createFile("EVIDENCE")).rejects.toThrow(/file_assets_owner_check/);
    await expect(
      createFile("IDENTITY_PROOF", { applicationId: application.id, ownerUserId: applicant.id, consentAt: new Date() }),
    ).rejects.toThrow(/file_assets_owner_check/);
  });

  it("refuses an employment proof without the date printed on it", async () => {
    const { cycle, category } = await createCycle();
    const application = await createApplication(cycle.id, category.id);
    const base = { applicationId: application.id, consentAt: new Date() };
    await expect(createFile("EMPLOYMENT_PROOF", base)).rejects.toThrow(/file_assets_document_date_check/);
    await expect(
      createFile("EMPLOYMENT_PROOF", { ...base, documentDate: new Date("2026-09-15") }),
    ).resolves.toBeTruthy();
  });

  it("refuses a proof document stored without the uploader's consent", async () => {
    const { cycle, category } = await createCycle();
    const applicant = await createUser();
    const application = await createApplication(cycle.id, category.id, { createdById: applicant.id });
    await expect(createFile("IDENTITY_PROOF", { ownerUserId: applicant.id })).rejects.toThrow(
      /file_assets_consent_check/,
    );
    await expect(
      createFile("EMPLOYMENT_PROOF", { applicationId: application.id, documentDate: new Date("2026-09-15") }),
    ).rejects.toThrow(/file_assets_consent_check/);
    // Ordinary evidence needs no proof consent.
    await expect(createFile("EVIDENCE", { applicationId: application.id })).resolves.toBeTruthy();
  });

  it("records who checked the proof and when, and why a rejection was made", async () => {
    const { cycle, category } = await createCycle();
    const staff = await createUser();
    const application = await createApplication(cycle.id, category.id);
    await expect(
      db.application.update({ where: { id: application.id }, data: { proofStatus: "VERIFIED" } }),
    ).rejects.toThrow(/applications_proof_check/);
    const checked = { proofCheckedById: staff.id, proofCheckedAt: new Date() };
    await expect(
      db.application.update({ where: { id: application.id }, data: { proofStatus: "REJECTED", ...checked } }),
    ).rejects.toThrow(/applications_proof_check/);
    await expect(
      db.application.update({
        where: { id: application.id },
        data: { proofStatus: "REJECTED", ...checked, proofNote: "The employment letter is from 2024" },
      }),
    ).resolves.toBeTruthy();
    await expect(
      db.application.update({ where: { id: application.id }, data: { proofStatus: "VERIFIED", ...checked } }),
    ).resolves.toBeTruthy();
  });
});

describe("award sites (ADR 0009)", () => {
  it("keeps one site address per slug regardless of letter case, and only in lower case", async () => {
    const { award: first } = await createCycle();
    const { award: second } = await createCycle();
    await createSitePage(first.id, "fpo-awards");
    await expect(createSitePage(second.id, "FPO-AWARDS")).rejects.toThrow();
    const { award: third } = await createCycle();
    // citext compares regardless of case, so the CHECK must look at the text itself.
    await expect(db.awardSite.create({ data: { awardId: third.id, slug: "Energy" } })).rejects.toThrow(
      /award_sites_slug_check/,
    );
    await expect(db.awardSite.create({ data: { awardId: third.id, slug: "energy awards" } })).rejects.toThrow(
      /award_sites_slug_check/,
    );
  });

  it("accepts only images, up to 5 MB, with alt text, as site media", async () => {
    const department = await createDepartment();
    const staff = await createUser();
    const image = {
      departmentId: department.id,
      fileName: "banner.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 200_000,
      width: 1600,
      height: 600,
      altText: "Winners on stage",
      uploadedById: staff.id,
    };
    await expect(db.mediaAsset.create({ data: { ...image, storageKey: "media/a" } })).resolves.toBeTruthy();
    await expect(
      db.mediaAsset.create({ data: { ...image, storageKey: "media/b", mimeType: "image/svg+xml" } }),
    ).rejects.toThrow(/media_assets_image_check/);
    await expect(
      db.mediaAsset.create({ data: { ...image, storageKey: "media/c", sizeBytes: 6_000_000 } }),
    ).rejects.toThrow(/media_assets_image_check/);
    await expect(
      db.mediaAsset.create({ data: { ...image, storageKey: "media/d", altText: " " } }),
    ).rejects.toThrow(/media_assets_image_check/);
  });
});

describe("judging guards", () => {
  it("allows several jury per application in a document round, but not the same jury member twice while active (ADR 0013)", async () => {
    const { cycle, category } = await createCycle();
    const round = await createRound(cycle.id, "DOCUMENT_REVIEW", 1, { juryMin: 2, juryMax: 3 });
    const application = await createApplication(cycle.id, category.id);
    const [juryA, juryB, juryC] = [await createUser(), await createUser(), await createUser()];
    const base = { cycleId: cycle.id, roundId: round.id, applicationId: application.id };
    const first = await db.evaluation.create({ data: { ...base, juryUserId: juryA.id } });
    await db.evaluation.create({ data: { ...base, juryUserId: juryB.id } });
    await db.evaluation.create({ data: { ...base, juryUserId: juryC.id } });
    expect(await db.evaluation.count({ where: { roundId: round.id, applicationId: application.id } })).toBe(3);
    // The same jury member can't be given the same application twice...
    await expect(db.evaluation.create({ data: { ...base, juryUserId: juryA.id } })).rejects.toThrow();
    // ...unless the first was revoked (assigned by mistake), which frees it.
    await db.evaluation.update({
      where: { id: first.id },
      data: { status: "REVOKED", revokedAt: new Date(), revokedReason: "Assigned by mistake" },
    });
    await expect(db.evaluation.create({ data: { ...base, juryUserId: juryA.id } })).resolves.toBeTruthy();
  });

  it("allows a panel of several jury members in an on-site round (ADR 0008)", async () => {
    const { cycle, category } = await createCycle();
    const round = await createRound(cycle.id, "ON_SITE");
    const application = await createApplication(cycle.id, category.id);
    const base = { cycleId: cycle.id, roundId: round.id, applicationId: application.id };
    for (let i = 0; i < 3; i += 1) {
      const jury = await createUser();
      await db.evaluation.create({ data: { ...base, juryUserId: jury.id } });
    }
    expect(await db.evaluation.count({ where: { roundId: round.id } })).toBe(3);
  });

  it("refuses scores outside 0 to 10", async () => {
    const { cycle, category } = await createCycle();
    const round = await createRound(cycle.id);
    const application = await createApplication(cycle.id, category.id);
    const jury = await createUser();
    const evaluation = await db.evaluation.create({
      data: { cycleId: cycle.id, roundId: round.id, applicationId: application.id, juryUserId: jury.id },
    });
    await expect(
      db.indicatorScore.create({ data: { evaluationId: evaluation.id, indicatorKey: "ind_a", value: 11 } }),
    ).rejects.toThrow(/indicator_scores_value_check/);
    await expect(
      db.indicatorScore.create({ data: { evaluationId: evaluation.id, indicatorKey: "ind_a", value: 10 } }),
    ).resolves.toBeTruthy();
  });

  it("keeps the jury per application within its limits for each round type (ADR 0013)", async () => {
    const { cycle } = await createCycle();
    const round = (number: number, type: "DOCUMENT_REVIEW" | "ON_SITE", juryMin: number, juryMax: number) =>
      db.round.create({ data: { cycleId: cycle.id, number, type, resultLabels: [], juryMin, juryMax } });
    // Document review: at least 1, and the minimum never above the maximum.
    await expect(round(1, "DOCUMENT_REVIEW", 1, 1)).resolves.toBeTruthy();
    await expect(round(2, "DOCUMENT_REVIEW", 2, 3)).resolves.toBeTruthy();
    await expect(round(3, "DOCUMENT_REVIEW", 0, 1)).rejects.toThrow(/rounds_jury_check/);
    await expect(round(3, "DOCUMENT_REVIEW", 3, 2)).rejects.toThrow(/rounds_jury_check/);
    // On site: a panel of 2 to 5.
    await expect(round(3, "ON_SITE", 2, 5)).resolves.toBeTruthy();
    await expect(round(4, "ON_SITE", 1, 3)).rejects.toThrow(/rounds_jury_check/);
    await expect(round(4, "ON_SITE", 2, 6)).rejects.toThrow(/rounds_jury_check/);
  });
});
