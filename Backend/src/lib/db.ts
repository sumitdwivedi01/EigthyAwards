import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

/**
 * The single Prisma client for this process (each client owns a connection pool).
 * DATABASE_URL may be a pooled connection (Supabase in production); migrations use DIRECT_URL
 * through prisma.config.ts. DATABASE_SSL=require encrypts the connection without checking the
 * certificate (Supabase's pooler presents its own; libpq's sslmode=require does the same).
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  ...(env.DATABASE_SSL === "require" && { ssl: { rejectUnauthorized: false } }),
});

export const db = new PrismaClient({ adapter });

export type Db = typeof db;

/** A Prisma client bound to an open transaction. Audit and outbox writes take one of these. */
export type Tx = Prisma.TransactionClient;
