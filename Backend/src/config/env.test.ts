import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const valid = {
  NODE_ENV: "test",
  PORT: "4000",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://awards:awards@localhost:5433/awards_test",
  AUTH_SECRET: "x".repeat(32),
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_USER: "",
  MAIL_FROM: "Awards <no-reply@awards.local>",
};

describe("environment validation (fail fast at start-up)", () => {
  it("accepts a complete configuration and applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(4000);
    expect(env.STORAGE_DRIVER).toBe("disk");
    expect(env.SMTP_USER).toBeUndefined();
  });

  it("refuses to start when a required variable is missing, naming it", () => {
    const { DATABASE_URL: _omitted, ...withoutDb } = valid;
    expect(() => parseEnv(withoutDb)).toThrow(/DATABASE_URL/);
  });

  it("refuses a short AUTH_SECRET", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("runs without an SMTP server (production writes emails to the log) and keeps the database connection unencrypted by default", () => {
    const { SMTP_HOST: _host, SMTP_PORT: _port, MAIL_FROM: _from, ...noMail } = valid;
    const env = parseEnv(noMail);
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.MAIL_FROM).toMatch(/Awards Platform/);
    expect(env.DATABASE_SSL).toBe("off");
    expect(parseEnv({ ...valid, DATABASE_SSL: "require" }).DATABASE_SSL).toBe("require");
    expect(() => parseEnv({ ...valid, DATABASE_SSL: "maybe" })).toThrow(/DATABASE_SSL/);
  });

  it("needs the Supabase project and key for Supabase Storage, and refuses disk storage in production (Step 1.5)", () => {
    expect(() => parseEnv({ ...valid, STORAGE_DRIVER: "supabase" })).toThrow(/SUPABASE_URL[\s\S]*SUPABASE_SERVICE_ROLE_KEY/);
    const supabase = parseEnv({
      ...valid,
      STORAGE_DRIVER: "supabase",
      SUPABASE_URL: "https://abcd.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });
    expect(supabase).toMatchObject({ STORAGE_DRIVER: "supabase", SUPABASE_BUCKET: "applicant-files" });
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).toThrow(/STORAGE_DRIVER/);
  });
});
