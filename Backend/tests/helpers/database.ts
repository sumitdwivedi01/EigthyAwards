import { afterAll, beforeEach } from "vitest";
import { db } from "../../src/lib/db.js";

/**
 * Empties every table. The append-only triggers also block TRUNCATE, so the reset runs with
 * session_replication_role = replica, which skips triggers for this one transaction. That needs a
 * superuser: true for the local Docker database and the CI service, never for production.
 */
export async function resetDatabase(): Promise<void> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"public"."${row.tablename}"`).join(", ");
  await db.$transaction([
    db.$executeRawUnsafe("SET LOCAL session_replication_role = replica"),
    db.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`),
  ]);
}

/** Call at the top of an integration test file: a clean database for every test. */
export function useTestDatabase(): void {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await db.$disconnect();
  });
}
