import { describe, expect, it } from "vitest";
import { db } from "../src/lib/db.js";
import {
  createApplication,
  createCycle,
  createDepartment,
  createOrganisation,
  createRound,
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

describe("roles", () => {
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
    // A department head needs a department; a PA must have no scope.
    await expect(db.roleAssignment.create({ data: { userId: user.id, role: "DEPT_HEAD" } })).rejects.toThrow(
      /role_assignments_scope_check/,
    );
    await expect(
      db.roleAssignment.create({ data: { userId: user.id, role: "LEADER_PA", departmentId: department.id } }),
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
    const pa = await createUser();
    await db.roleAssignment.create({ data: { userId: pa.id, role: "LEADER_PA" } });
    await expect(db.roleAssignment.create({ data: { userId: pa.id, role: "LEADER_PA" } })).rejects.toThrow();
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

describe("judging guards", () => {
  it("allows only one active evaluation per application in a document review round", async () => {
    const { cycle, category } = await createCycle();
    const round = await createRound(cycle.id, "DOCUMENT_REVIEW");
    const application = await createApplication(cycle.id, category.id);
    const [juryA, juryB] = [await createUser(), await createUser()];
    const base = { cycleId: cycle.id, roundId: round.id, applicationId: application.id };
    const first = await db.evaluation.create({ data: { ...base, juryUserId: juryA.id } });
    await expect(db.evaluation.create({ data: { ...base, juryUserId: juryB.id } })).rejects.toThrow(
      /one active evaluation per application/,
    );
    // Once the first is revoked (reassignment), a new jury member can be assigned.
    await db.evaluation.update({
      where: { id: first.id },
      data: { status: "REVOKED", revokedAt: new Date(), revokedReason: "Reassigned" },
    });
    await expect(db.evaluation.create({ data: { ...base, juryUserId: juryB.id } })).resolves.toBeTruthy();
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

  it("refuses a document review round with a panel size, and an on-site round without one", async () => {
    const { cycle } = await createCycle();
    await expect(
      db.round.create({
        data: { cycleId: cycle.id, number: 1, type: "DOCUMENT_REVIEW", resultLabels: [], panelMin: 2, panelMax: 5 },
      }),
    ).rejects.toThrow(/rounds_panel_check/);
    await expect(
      db.round.create({ data: { cycleId: cycle.id, number: 2, type: "ON_SITE", resultLabels: [] } }),
    ).rejects.toThrow(/rounds_panel_check/);
  });
});
