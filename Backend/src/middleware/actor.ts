import type { RequestHandler, Response } from "express";
import { env } from "../config/env.js";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "../lib/session.js";
import { actorFromSession } from "../modules/identity/service.js";

/**
 * Turns the session cookie into req.actor on every request: the user and their scoped roles,
 * read fresh from the database (ADR 0003). An invalid, expired or outdated session gives null;
 * the service that needs a signed-in user then answers 401.
 */
export const loadActor: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  req.actor = typeof token === "string" && token !== "" ? await actorFromSession(token) : null;
  next();
};

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

/** httpOnly (scripts can't read it), Secure online, SameSite=Lax, first-party through the proxy. */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}
