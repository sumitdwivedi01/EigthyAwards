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
  AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  // How long a login lasts. A password change or deactivation ends sessions earlier (sessionVersion).
  SESSION_MAX_AGE_HOURS: z.coerce.number().int().positive().max(168).default(12),
  // bcrypt's work factor. Tests lower it so they run fast; production keeps the default.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // How many proxies sit in front of the API (the Next.js /api proxy, a hosting load balancer),
  // so req.ip is the visitor's address and login limits count per visitor (Express "trust proxy").
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: z.string().min(1),
  // Only "disk" exists until Step 1.5 adds the driver for Supabase Storage.
  STORAGE_DRIVER: z.enum(["disk"]).default("disk"),
  STORAGE_DISK_ROOT: z.string().min(1).default("./storage"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
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
