import { z } from "zod";

/** Empty strings in .env files mean "not set". */
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value === undefined || value.trim() === "" ? undefined : value));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.url(),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "must be a postgresql:// connection string"),
  // "require" encrypts the app's database connection without checking the certificate, like
  // libpq's sslmode=require (Supabase's pooler, Step 1.5). Off locally, where Docker has no TLS.
  DATABASE_SSL: z.enum(["off", "require"]).default("off"),
  AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  // How long a login lasts. A password change or deactivation ends sessions earlier (sessionVersion).
  SESSION_MAX_AGE_HOURS: z.coerce.number().int().positive().max(168).default(12),
  // bcrypt's work factor. Tests lower it so they run fast; production keeps the default.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // How many proxies sit in front of the API (the Next.js /api proxy, a hosting load balancer),
  // so req.ip is the visitor's address and login limits count per visitor (Express "trust proxy").
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  // Without an SMTP server (production in Phase 1: a real email provider comes in package 2.6),
  // each email is written to the server log instead of being sent; the EmailLog keeps every one.
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: z.string().min(1).default("Awards Platform <no-reply@awards.example>"),
  // "disk" locally (development and tests); "supabase" online (Step 1.5): Supabase Storage, with
  // the browser uploading and downloading through signed links (GAPS G-B03).
  STORAGE_DRIVER: z.enum(["disk", "supabase"]).default("disk"),
  STORAGE_DISK_ROOT: z.string().min(1).default("./storage"),
  SUPABASE_URL: z.url().optional(),
  // The service role key: full access, so it lives only in the API's environment, never in a browser.
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be a bucket name such as applicant-files").default("applicant-files"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
}).superRefine((value, ctx) => {
  if (value.STORAGE_DRIVER === "supabase") {
    if (!value.SUPABASE_URL) ctx.addIssue({ code: "custom", path: ["SUPABASE_URL"], message: "is required when STORAGE_DRIVER is supabase" });
    if (!value.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({ code: "custom", path: ["SUPABASE_SERVICE_ROLE_KEY"], message: "is required when STORAGE_DRIVER is supabase" });
    }
  }
  // Production keeps files where they survive a restart: Render's disk doesn't.
  if (value.NODE_ENV === "production" && value.STORAGE_DRIVER === "disk") {
    ctx.addIssue({ code: "custom", path: ["STORAGE_DRIVER"], message: "must be supabase in production (the server's disk is wiped on every deploy)" });
  }
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates the environment. Throws one error that names every missing or invalid variable,
 * so a misconfigured server fails at start-up instead of on the first request.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
