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
});
