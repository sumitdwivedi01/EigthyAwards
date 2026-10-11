import { describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../../lib/db.js";
import type { Mailer, MailMessage } from "../../lib/mailer/types.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { queueEmail } from "./service.js";
import { dispatchPendingEmails } from "./dispatcher.js";
import type { TemplateRegistry } from "./templates.js";

useTestDatabase();

const testTemplates: TemplateRegistry = {
  greeting: {
    payload: z.object({ name: z.string() }),
    render: (payload) => ({ subject: "Hello", text: `Hello ${(payload as { name: string }).name}` }),
  },
};

function fakeMailer(failWith?: Error): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    sent,
    async send(message) {
      if (failWith) throw failWith;
      sent.push(message);
    },
  };
}

describe("email outbox (GAPS G-C03)", () => {
  it("queues an email inside the transaction, normalising the address", async () => {
    await db.$transaction(async (tx) => {
      await queueEmail(tx, { to: "Asha@Example.test", template: "greeting", payload: { name: "Asha" } });
    });
    const [email] = await db.emailLog.findMany();
    expect(email).toMatchObject({ to: "asha@example.test", status: "PENDING", attempts: 0 });
  });

  it("drops the email if the business change rolls back", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await queueEmail(tx, { to: "asha@example.test", template: "greeting", payload: { name: "Asha" } });
        throw new Error("the change failed");
      }),
    ).rejects.toThrow();
    expect(await db.emailLog.count()).toBe(0);
  });

  it("sends pending emails and marks them SENT", async () => {
    await queueEmail(db, { to: "asha@example.test", template: "greeting", payload: { name: "Asha" } });
    const mailer = fakeMailer();
    const result = await dispatchPendingEmails({ db, mailer, templates: testTemplates });
    expect(result).toEqual({ sent: 1, failed: 0, retrying: 0 });
    expect(mailer.sent).toEqual([{ to: "asha@example.test", subject: "Hello", text: "Hello Asha" }]);
    const [email] = await db.emailLog.findMany();
    expect(email?.status).toBe("SENT");
    expect(email?.sentAt).not.toBeNull();
  });

  it("retries a failing email, then marks it FAILED with the error", async () => {
    await queueEmail(db, { to: "asha@example.test", template: "greeting", payload: { name: "Asha" } });
    const mailer = fakeMailer(new Error("SMTP down"));
    expect(await dispatchPendingEmails({ db, mailer, templates: testTemplates, maxAttempts: 2 })).toEqual({
      sent: 0,
      failed: 0,
      retrying: 1,
    });
    expect(await dispatchPendingEmails({ db, mailer, templates: testTemplates, maxAttempts: 2 })).toEqual({
      sent: 0,
      failed: 1,
      retrying: 0,
    });
    const [email] = await db.emailLog.findMany();
    expect(email).toMatchObject({ status: "FAILED", attempts: 2, lastError: "SMTP down" });
  });

  it("fails an email whose template doesn't exist instead of crashing", async () => {
    await queueEmail(db, { to: "asha@example.test", template: "no-such-template", payload: {} });
    const result = await dispatchPendingEmails({ db, mailer: fakeMailer(), templates: testTemplates, maxAttempts: 1 });
    expect(result.failed).toBe(1);
    const [email] = await db.emailLog.findMany();
    expect(email?.lastError).toMatch(/Unknown email template/);
  });

  it("refuses to queue an invalid address", async () => {
    await expect(queueEmail(db, { to: "not-an-email", template: "greeting", payload: {} })).rejects.toThrow();
  });
});
