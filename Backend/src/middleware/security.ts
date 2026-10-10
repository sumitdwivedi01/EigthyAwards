import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { ForbiddenError } from "../lib/errors.js";

const appOrigin = new URL(env.APP_URL).origin;
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Cross-site request forgery guard (GAPS G-B11), next to SameSite=Lax cookies: a browser sends
 * an Origin header on every write, so a write whose Origin isn't the frontend is refused.
 * Requests with no Origin come from non-browser clients, which can't carry the user's cookie.
 */
export const requireSameOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get("origin");
  if (WRITES.has(req.method) && origin !== undefined && origin !== appOrigin) {
    next(new ForbiddenError("This request came from another site."));
    return;
  }
  next();
};

/**
 * Vercel's CDN caches responses that the API behind its proxy marks as cacheable (GAPS G-B16),
 * so every API response says "never store" unless a route deliberately opts in (public pages).
 */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};
