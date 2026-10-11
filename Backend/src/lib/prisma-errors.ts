import { Prisma } from "../generated/prisma/client.js";

/**
 * A unique index refused the write (Prisma P2002). Services check first and give a friendly
 * error; this catches the race where two requests pass the check at the same moment.
 */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
