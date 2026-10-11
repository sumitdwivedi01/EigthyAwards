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

let dummyHash: Promise<string> | undefined;

/**
 * Runs a comparison that always fails. Used when the email is unknown, so a wrong email takes
 * as long as a wrong password and response times don't reveal which accounts exist.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash("never-a-real-password", env.BCRYPT_ROUNDS);
  await bcrypt.compare(password, await dummyHash);
}
