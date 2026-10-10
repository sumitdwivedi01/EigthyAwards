import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "../config/env.js";
import { clock } from "./clock.js";

/**
 * The login session (ADR 0003): a signed token that names only the user and their session
 * version. Roles are never in it; they are loaded from the database on every request.
 * Raising the user's sessionVersion (password change, reset, deactivation) ends every session
 * signed with an older one.
 */
export const SESSION_COOKIE = "awards_session";
export const SESSION_MAX_AGE_MS = env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000;

const ISSUER = "eightyawards-api";
const key = new TextEncoder().encode(env.AUTH_SECRET);
const claimsSchema = z.object({ sub: z.uuid(), sv: z.number().int().min(0) });

export interface SessionClaims {
  userId: string;
  sessionVersion: number;
}

export async function signSession(claims: SessionClaims): Promise<string> {
  const issuedAt = Math.floor(clock.now().getTime() / 1000);
  return new SignJWT({ sv: claims.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_MS / 1000)
    .sign(key);
}

/** Returns the claims of a valid, unexpired token, or null for anything else. */
export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      currentDate: clock.now(),
    });
    const claims = claimsSchema.safeParse(payload);
    return claims.success ? { userId: claims.data.sub, sessionVersion: claims.data.sv } : null;
  } catch {
    return null;
  }
}
