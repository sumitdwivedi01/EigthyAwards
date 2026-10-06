import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ quiet: true });

const testDatabaseUrl = process.env["TEST_DATABASE_URL"];
// Safety: tests empty the database between cases, so never point them at a real database.
if (!testDatabaseUrl || !/test/i.test(new URL(testDatabaseUrl).pathname)) {
  throw new Error("TEST_DATABASE_URL must be set and its database name must contain 'test'.");
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDatabaseUrl,
      STORAGE_DISK_ROOT: "./storage-test",
    },
    // Tests share one real PostgreSQL database, so test files run one at a time.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
