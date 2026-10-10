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
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: z.string().min(1),
  // Only "disk" exists until Phase 6 adds the S3-compatible driver for Supabase Storage.
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
