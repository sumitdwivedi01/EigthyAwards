import type { RequestHandler } from "express";
import { ForbiddenError } from "../lib/errors.js";

/** What a person signed in with a temporary password may still do. */
const OPEN_WHILE_TEMPORARY = new Set([
  "GET /health",
  "GET /me",
  "POST /me/password",
  "POST /auth/login",
  "POST /auth/logout",
]);

/**
 * A person signed in with a temporary password must set their own before anything else works
 * (ADR 0017), so whoever passed the temporary password on never keeps a usable login. Every
 * other request answers 403 with reason PASSWORD_CHANGE_REQUIRED, which the screens use to send
 * the person to "Set your password".
 */
export const requireOwnPassword: RequestHandler = (req, _res, next) => {
  if (req.actor?.mustChangePassword && !OPEN_WHILE_TEMPORARY.has(`${req.method} ${req.path}`)) {
    next(new ForbiddenError("Set your own password first.", { reason: "PASSWORD_CHANGE_REQUIRED" }));
    return;
  }
  next();
};
