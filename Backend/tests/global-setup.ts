import { execSync } from "node:child_process";

/** Brings the test database up to the latest migration once, before any test file runs. */
export default function setup(): void {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
