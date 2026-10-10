import { describe, expect, it } from "vitest";
import { db } from "../../lib/db.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { createDepartment, createUser } from "../../../tests/helpers/factories.js";
import { recordAudit } from "./service.js";

useTestDatabase();

describe("recordAudit (spec §5.15, rule 3)", () => {
  it("records who did what, in which role, with before, after and reason", async () => {
    const pa = await createUser();
    await db.$transaction(async (tx) => {
      await recordAudit(tx, {
        actorId: pa.id,
        actorRole: "LEADER_PA",
        action: "department.renamed",
        entityType: "department",
        entityId: "d1",
        before: { name: "Enrgy" },
        after: { name: "Energy" },
        reason: "Spelling fix",
      });
    });
    const [event] = await db.auditEvent.findMany();
    expect(event).toMatchObject({
      actorId: pa.id,
      actorRole: "LEADER_PA",
      action: "department.renamed",
      before: { name: "Enrgy" },
      after: { name: "Energy" },
      reason: "Spelling fix",
    });
  });

  it("is undone together with the change it describes when the transaction fails", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await tx.department.create({ data: { name: "Safety" } });
        await recordAudit(tx, {
          actorId: null,
          actorRole: null,
          action: "department.created",
          entityType: "department",
          entityId: "d2",
        });
        throw new Error("something later in the same change failed");
      }),
    ).rejects.toThrow();
    expect(await db.department.count()).toBe(0);
    expect(await db.auditEvent.count()).toBe(0);
  });

  it("rolls back the change when the audit write itself fails", async () => {
    await createDepartment({ name: "Existing" });
    await expect(
      db.$transaction(async (tx) => {
        await tx.department.create({ data: { name: "Quality" } });
        // An invalid actor id makes the audit insert fail (foreign key).
        await recordAudit(tx, {
          actorId: "00000000-0000-4000-8000-000000000000",
          actorRole: "AWARD_STAFF",
          action: "department.created",
          entityType: "department",
          entityId: "d3",
        });
      }),
    ).rejects.toThrow();
    expect(await db.department.findFirst({ where: { name: "Quality" } })).toBeNull();
  });

  it("refuses an event that doesn't follow the naming rule", async () => {
    await expect(
      recordAudit(db, { actorId: null, actorRole: null, action: "Changed", entityType: "x", entityId: "1" }),
    ).rejects.toThrow();
  });
});
