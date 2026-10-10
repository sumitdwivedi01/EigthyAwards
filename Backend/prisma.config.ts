// Prisma CLI configuration (Prisma 7). The CLI does not read .env by itself, so load it here.
// Migrations run over DIRECT_URL (a direct connection); the app itself connects with
// DATABASE_URL through the pg driver adapter (src/lib/db.ts), which may be a pooled URL.
// Note: Prisma 7.10's config has no `directUrl` option, even though some Prisma docs mention one.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
    // Scratch database for `prisma migrate diff --from-migrations` (the drift check).
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
