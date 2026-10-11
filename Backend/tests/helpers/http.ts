import type { Express } from "express";
import request from "supertest";
import { expect } from "vitest";
import type { Role } from "../../src/generated/prisma/client.js";
import { db } from "../../src/lib/db.js";
import { hashPassword } from "../../src/lib/password.js";
import { createApplicantAccount, createPlatformAccount } from "./factories.js";

/** The password every test account gets. */
export const PASSWORD = "correct horse battery";

/** A signed-in browser: keeps the session cookie between requests. */
export async function signIn(app: Express, email: string, password = PASSWORD): Promise<request.Agent> {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  expect(res.status, `login as ${email}`).toBe(200);
  return agent;
}

/** A platform account with the test password, holding the given scoped roles. */
export async function platformPerson(
  email: string,
  roles: { role: Role; departmentId?: string; awardId?: string }[] = [],
) {
  const user = await createPlatformAccount({ email, name: email.split("@")[0], passwordHash: await hashPassword(PASSWORD) });
  for (const r of roles) {
    await db.roleAssignment.create({
      data: { userId: user.id, role: r.role, departmentId: r.departmentId ?? null, awardId: r.awardId ?? null },
    });
  }
  return user;
}

export async function applicantPerson(email: string) {
  return createApplicantAccount({ email, name: email.split("@")[0], passwordHash: await hashPassword(PASSWORD) });
}
