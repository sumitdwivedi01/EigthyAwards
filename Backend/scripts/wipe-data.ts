/**
 * Empties every table of the platform's database, keeping its structure: the schema, the
 * migrations record, row-level security (G-B04) and the triggers that keep history append-only.
 * Used before `npm run db:seed` and `npm run demo:data` to start a demo from scratch (docs/DEMO.md).
 *
 *   npm run db:wipe                          shows which database it would empty, and stops
 *   npm run db:wipe -- --confirm <host>      empties it; <host> must be the database's host name
 *
 * The connection comes from .env, or from the file named by ENV_FILE (for production: .env.live).
 * Files already in storage are not touched (empty the Supabase bucket in its dashboard if wanted).
 *
 * The append-only triggers also refuse TRUNCATE, so they are switched off for the one transaction
 * that empties the tables and switched on again before it commits. The table owner may do that
 * (ALTER TABLE ... DISABLE TRIGGER USER), so no superuser is needed: Supabase works as Docker does.
 * If anything fails, the transaction rolls back and every trigger stays on.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: process.env["ENV_FILE"] ?? ".env", quiet: true });

function target(): { host: string; database: string } {
  const raw = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
  if (!raw) throw new Error("No DIRECT_URL or DATABASE_URL in the environment file.");
  const url = new URL(raw);
  return { host: url.hostname, database: url.pathname.replace(/^\//, "") };
}

async function main(): Promise<void> {
  const { host, database } = target();
  // Prefer the direct connection for this one-off job, as the migrations do.
  if (process.env["DIRECT_URL"]) process.env["DATABASE_URL"] = process.env["DIRECT_URL"];

  const confirmAt = process.argv.indexOf("--confirm");
  const confirmed = confirmAt >= 0 ? process.argv[confirmAt + 1] : undefined;
  console.log(`Database: ${database} on ${host} (environment file: ${process.env["ENV_FILE"] ?? ".env"})`);
  if (confirmed !== host) {
    console.log("Nothing was changed. To empty every table of this database, run again with:");
    console.log(`  npm run db:wipe -- --confirm ${host}`);
    process.exitCode = confirmed === undefined ? 0 : 1;
    return;
  }

  const { db } = await import("../src/lib/db.js");
  try {
    const rows = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename`;
    if (rows.length === 0) throw new Error("No tables found: run the migrations first (npx prisma migrate deploy).");
    const tables = rows.map((row) => `"public"."${row.tablename}"`);
    await db.$transaction(
      async (tx) => {
        for (const table of tables) await tx.$executeRawUnsafe(`ALTER TABLE ${table} DISABLE TRIGGER USER`);
        await tx.$executeRawUnsafe(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
        for (const table of tables) await tx.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE TRIGGER USER`);
      },
      { timeout: 120_000, maxWait: 30_000 },
    );
    const [check] = await db.$queryRaw<{ users: bigint; applications: bigint }[]>`
      SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM applications) AS applications`;
    console.log(`Emptied ${tables.length} tables (users now ${check?.users ?? "?"}, applications ${check?.applications ?? "?"}).`);
    console.log("Next: npx prisma db seed, then npm run demo:data (docs/DEMO.md).");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
