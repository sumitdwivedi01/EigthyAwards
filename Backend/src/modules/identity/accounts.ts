import { clock } from "../../lib/clock.js";
import type { Tx } from "../../lib/db.js";
import { ValidationError } from "../../lib/errors.js";
import { normalizeEmail, normalizeName } from "../../lib/normalize.js";
import { generateTemporaryPassword, hashPassword, TEMPORARY_PASSWORD_DAYS } from "../../lib/password.js";

/**
 * Platform accounts that someone else creates (ADR 0017): the leader creates department heads, and
 * a head (or the leader) creates staff and jury. Until email invites arrive (package 2.3), a new
 * account gets a temporary password that its creator passes on, and that must be replaced at
 * first login. These helpers run inside the calling service's transaction, after that service has
 * checked who may do this; they check no permissions themselves.
 */

export interface PersonInput {
  email: string;
  name: string;
}

export interface PlatformAccount {
  userId: string;
  name: string;
  email: string;
  /** Only for an account created now: returned once to its creator, never stored in plain text or logged. */
  temporaryPassword: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function emailRefused(path: string, message: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

async function temporaryPasswordFields(): Promise<{
  password: string;
  data: { passwordHash: string; mustChangePassword: true; temporaryPasswordExpiresAt: Date };
}> {
  const password = generateTemporaryPassword();
  return {
    password,
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(clock.now().getTime() + TEMPORARY_PASSWORD_DAYS * DAY_MS),
    },
  };
}

/**
 * The platform account with this email, created with a temporary password if there is none.
 * An email that belongs to an applicant account is refused: applicants never hold roles
 * (ADR 0016), so the person needs a separate account with another email. Refusals name the
 * form field the email came from (`emailPath`), so the screen shows them next to it.
 */
export async function findOrCreatePlatformAccount(tx: Tx, input: PersonInput, emailPath: string): Promise<PlatformAccount> {
  const email = normalizeEmail(input.email);
  const existing = await tx.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, accountType: true, deactivatedAt: true },
  });
  if (existing) {
    if (existing.accountType === "APPLICANT") {
      throw emailRefused(emailPath, "This email belongs to an applicant account, which can't hold a role. Use another email.");
    }
    if (existing.deactivatedAt) {
      throw emailRefused(emailPath, "This account has been deactivated.");
    }
    return { userId: existing.id, name: existing.name, email: existing.email, temporaryPassword: null };
  }
  const { password, data } = await temporaryPasswordFields();
  const user = await tx.user.create({
    data: { email, accountType: "PLATFORM", name: normalizeName(input.name), ...data },
    select: { id: true, name: true, email: true },
  });
  return { userId: user.id, name: user.name, email: user.email, temporaryPassword: password };
}

/**
 * Replaces the person's password with a new temporary one: the old password stops working and
 * every session of theirs ends at once. Returns the new temporary password, once.
 */
export async function replaceWithTemporaryPassword(tx: Tx, userId: string): Promise<string> {
  const { password, data } = await temporaryPasswordFields();
  await tx.user.update({ where: { id: userId }, data: { ...data, sessionVersion: { increment: 1 } } });
  return password;
}
