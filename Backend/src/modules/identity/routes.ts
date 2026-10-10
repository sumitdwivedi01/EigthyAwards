import { Router, type RequestHandler } from "express";
import { rateLimit, MINUTE } from "express-rate-limit";
import { normalizeEmail } from "../../lib/normalize.js";
import { clearSessionCookie, setSessionCookie } from "../../middleware/actor.js";
import { requireSignedIn } from "./access.js";
import {
  changePasswordSchema,
  linkedinSchema,
  loginSchema,
  registerSchema,
  setIdentityDocumentSchema,
  startIdentityUploadSchema,
  updateProfileSchema,
} from "./schemas.js";
import {
  changePassword,
  getMe,
  login,
  register,
  setIdentityDocument,
  setLinkedinUrl,
  startIdentityUpload,
  updateMyProfile,
} from "./service.js";

export interface IdentityRouterOptions {
  /** Failed logins allowed per visitor address in 15 minutes (GAPS G-C12). */
  loginLimitPerIp: number;
  /** Failed logins allowed per email address in 15 minutes. */
  loginLimitPerEmail: number;
}

const tooManyAttempts: RequestHandler = (_req, res) => {
  res.status(429).json({
    error: { code: "TOO_MANY_REQUESTS", message: "Too many failed attempts. Please try again in 15 minutes." },
  });
};

export function buildIdentityRouter(options: IdentityRouterOptions): Router {
  const router = Router();

  // Only failed attempts count. The store is in memory: one API instance (Render), so that's enough.
  const loginLimits = [
    rateLimit({
      windowMs: 15 * MINUTE,
      limit: options.loginLimitPerIp,
      skipSuccessfulRequests: true,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: tooManyAttempts,
    }),
    rateLimit({
      windowMs: 15 * MINUTE,
      limit: options.loginLimitPerEmail,
      skipSuccessfulRequests: true,
      standardHeaders: false,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const email: unknown = req.body?.email;
        return `login:${typeof email === "string" ? normalizeEmail(email) : ""}`;
      },
      handler: tooManyAttempts,
    }),
  ];

  router.post("/auth/register", async (req, res) => {
    const { me, token } = await register(registerSchema.parse(req.body));
    setSessionCookie(res, token);
    res.status(201).json(me);
  });

  router.post("/auth/login", ...loginLimits, async (req, res) => {
    const { me, token } = await login(loginSchema.parse(req.body));
    setSessionCookie(res, token);
    res.json(me);
  });

  router.post("/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get("/me", async (req, res) => {
    res.json(await getMe(requireSignedIn(req.actor)));
  });

  router.patch("/me/profile", async (req, res) => {
    res.json(await updateMyProfile(requireSignedIn(req.actor), updateProfileSchema.parse(req.body)));
  });

  router.post("/me/password", async (req, res) => {
    const { me, token } = await changePassword(requireSignedIn(req.actor), changePasswordSchema.parse(req.body));
    setSessionCookie(res, token);
    res.json(me);
  });

  router.put("/me/linkedin", async (req, res) => {
    res.json(await setLinkedinUrl(requireSignedIn(req.actor), linkedinSchema.parse(req.body)));
  });

  router.post("/me/identity-document/uploads", async (req, res) => {
    const view = await startIdentityUpload(requireSignedIn(req.actor), startIdentityUploadSchema.parse(req.body));
    res.status(201).json(view);
  });

  router.put("/me/identity-document", async (req, res) => {
    res.json(await setIdentityDocument(requireSignedIn(req.actor), setIdentityDocumentSchema.parse(req.body)));
  });

  return router;
}
