import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Signed, short-lived grants for the disk driver's upload and download links: the local stand-in
 * for Supabase Storage's signed URLs. A grant names one action on one key and expires.
 */
const grantSchema = z.object({
  a: z.enum(["put", "get"]),
  k: z.string().min(1),
  /** Content type: the one an upload must carry, or the one a download is served as. */
  t: z.string().min(1),
  /** Upload size ceiling in bytes. */
  m: z.number().int().positive().optional(),
  /** Download file name. */
  n: z.string().optional(),
  /** Expiry, in seconds since the epoch. */
  e: z.number().int(),
});

export type LinkGrant = z.infer<typeof grantSchema>;

function mac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(`storage-link:${body}`).digest("base64url");
}

export function signGrant(grant: LinkGrant, secret: string): string {
  const body = Buffer.from(JSON.stringify(grant)).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

/** The grant, if the token is genuine, unexpired and for this action; otherwise null. */
export function verifyGrant(token: string, secret: string, action: LinkGrant["a"], now: Date): LinkGrant | null {
  const parts = token.split(".");
  const [body, signature] = parts;
  if (parts.length !== 2 || !body || !signature) return null;
  const expected = Buffer.from(mac(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const grant = grantSchema.safeParse(decoded);
  if (!grant.success || grant.data.a !== action || grant.data.e * 1000 <= now.getTime()) return null;
  return grant.data;
}
