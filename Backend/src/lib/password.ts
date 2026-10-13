import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";

/**
 * The same rules at registration, password change and reset (spec §5.21). bcrypt only uses the
 * first 72 bytes of a password, so a longer one is refused instead of being silently cut.
 */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Use at most 72 bytes (about 72 letters).");

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** How long a temporary password works (ADR 0017). */
export const TEMPORARY_PASSWORD_DAYS = 7;

// No 0/o, 1/l/i: the password is read out or typed by hand.
const TEMPORARY_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/**
 * A one-time password for an account someone else creates (ADR 0017): four groups of four random
 * characters, about 79 bits, such as "k7m2-q9xa-3fhp-w8rt".
 */
export function generateTemporaryPassword(): string {
  const groups: string[] = [];
  for (let group = 0; group < 4; group += 1) {
    let text = "";
    for (let i = 0; i < 4; i += 1) text += TEMPORARY_ALPHABET.charAt(randomInt(TEMPORARY_ALPHABET.length));
    groups.push(text);
  }
  return groups.join("-");
}

let dummyHash: Promise<string> | undefined;

/**
 * Runs a comparison that always fails. Used when the email is unknown, so a wrong email takes
 * as long as a wrong password and response times don't reveal which accounts exist.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash("never-a-real-password", env.BCRYPT_ROUNDS);
  await bcrypt.compare(password, await dummyHash);
}
