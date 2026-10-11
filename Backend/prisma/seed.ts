/**
 * Starter data (PHASES.md Step 1.1): the master lists, the leader, two departments (one an
 * external award organiser) with their heads and brand kits, staff, jury accounts and demo
 * applicants. The leader, heads, staff and jury get platform accounts, the applicants applicant
 * accounts (ADR 0016). Safe to run again: it only adds what is missing, and never resets a password.
 * Everything goes through the same normalisers as the services (GAPS G-H09).
 *
 * Passwords come from the environment, never from the repository (GAPS G-B15):
 *   LEADER_EMAIL, LEADER_PASSWORD  the leader's account (the leader's team uses it, ADR 0014)
 *   DEMO_PASSWORD                  every other demo account
 * Awards are not seeded here: staff set them up on screen in Step 1.2, which is what the brief tests.
 */
import { z } from "zod";
import type { AccountType, Role } from "../src/generated/prisma/client.js";
import { db } from "../src/lib/db.js";
import { normalizeEmail, normalizeName, normalizePhone, normalizeTaxId } from "../src/lib/normalize.js";
import { hashPassword, passwordSchema } from "../src/lib/password.js";

const seedEnv = z
  .object({
    LEADER_EMAIL: z.email(),
    LEADER_PASSWORD: passwordSchema,
    DEMO_PASSWORD: passwordSchema,
  })
  .safeParse(process.env);

// From the brief: business excellence, energy, safety, design, innovation, sustainability,
// and shop-floor competitions such as Kaizen and 5S.
const AWARD_DOMAINS = [
  "Business Excellence",
  "Energy",
  "Safety",
  "Design",
  "Innovation",
  "Sustainability",
  "Shop-floor Improvement (Kaizen, 5S)",
  "Agriculture and Farmer Producer Organisations",
];

const ORGANISATION_TYPES = [
  "Private Limited Company",
  "Public Limited Company",
  "Limited Liability Partnership",
  "Partnership Firm",
  "Sole Proprietorship",
  "Public Sector Undertaking",
  "Government Body",
  "Non-profit / NGO",
  "Cooperative Society",
  "Farmer Producer Organisation",
];

interface Person {
  email: string;
  name: string;
}

const DEPARTMENTS = [
  {
    name: "Safety, Health and Environment",
    head: { email: "head.she@demo.test", name: "Meera Iyer" },
    brand: { primaryColour: "#1F4FA8", accentColour: "#F2A900", fontKey: "inter", footerText: "Safety, Health and Environment department" },
  },
  {
    // An external award organiser, set up as a department and running its awards alone (§3).
    name: "FPO Awards team",
    head: { email: "head.fpo@demo.test", name: "Arjun Patil" },
    brand: { primaryColour: "#2E7D32", accentColour: "#F9A825", fontKey: "poppins", footerText: "FPO Awards: celebrating farmer producer organisations" },
  },
] as const;

/** Staff and the departments they belong to; one works in both (spec §3: one staff, many awards). */
const STAFF: { person: Person; departments: string[] }[] = [
  { person: { email: "staff.asha@demo.test", name: "Asha Rao" }, departments: ["Safety, Health and Environment"] },
  { person: { email: "staff.ravi@demo.test", name: "Ravi Kumar" }, departments: ["FPO Awards team"] },
  {
    person: { email: "staff.neha@demo.test", name: "Neha Singh" },
    departments: ["Safety, Health and Environment", "FPO Awards team"],
  },
];

/** Jury accounts: platform accounts with no role until staff add them to a cycle's pool (G-K19). */
const JURY: Person[] = [
  { email: "jury.anil@demo.test", name: "Anil Mehta" },
  { email: "jury.priya@demo.test", name: "Priya Nair" },
  { email: "jury.vikram@demo.test", name: "Vikram Joshi" },
  { email: "jury.sunita@demo.test", name: "Sunita Reddy" },
  { email: "jury.farhan@demo.test", name: "Farhan Ali" },
  { email: "jury.lakshmi@demo.test", name: "Lakshmi Menon" },
];

/** Kiran is a member of Acme Steel; Deepa, a colleague, joins it on screen; Rahul registers a new company. */
const APPLICANTS: Person[] = [
  { email: "applicant.kiran@demo.test", name: "Kiran Desai" },
  { email: "applicant.deepa@demo.test", name: "Deepa Kulkarni" },
  { email: "applicant.rahul@demo.test", name: "Rahul Verma" },
];

const ACME = {
  legalName: "Acme Steel Ltd",
  pan: "abcde 1234f",
  gstin: "27abcde1234f1z5",
  addressLine: "12 MIDC Road, Bhosari",
  city: "Pune",
  stateCode: "27",
  pincode: "411026",
  officialEmail: "office@acmesteel.example",
  phone: "020 2567 8901",
};

async function upsertPerson(person: Person, password: string, accountType: AccountType): Promise<string> {
  const email = normalizeEmail(person.email);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, accountType: true } });
  if (existing) {
    // Marks a jury account seeded before account types existed (10 Oct). The database refuses the
    // change once an account is in use.
    if (existing.accountType !== accountType) {
      await db.user.update({ where: { id: existing.id }, data: { accountType } });
    }
    return existing.id;
  }
  const created = await db.user.create({
    data: { email, accountType, name: normalizeName(person.name), passwordHash: await hashPassword(password) },
  });
  return created.id;
}

async function grant(
  userId: string,
  role: Role,
  scope: { departmentId?: string },
  grantedById: string | null,
): Promise<void> {
  const active = await db.roleAssignment.findFirst({
    where: { userId, role, departmentId: scope.departmentId ?? null, awardId: null, cycleId: null, revokedAt: null },
  });
  if (!active) {
    await db.roleAssignment.create({ data: { userId, role, departmentId: scope.departmentId ?? null, grantedById } });
  }
}

async function main(): Promise<void> {
  if (!seedEnv.success) {
    throw new Error(
      `Set LEADER_EMAIL, LEADER_PASSWORD and DEMO_PASSWORD in Backend/.env (passwords: at least 8 characters).\n${z.prettifyError(seedEnv.error)}`,
    );
  }
  const { LEADER_EMAIL, LEADER_PASSWORD, DEMO_PASSWORD } = seedEnv.data;

  for (const raw of AWARD_DOMAINS) {
    const name = normalizeName(raw);
    await db.awardDomain.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const raw of ORGANISATION_TYPES) {
    const name = normalizeName(raw);
    await db.organisationType.upsert({ where: { name }, update: {}, create: { name } });
  }

  // The leader: exactly one (a partial unique index enforces it).
  const leaderId = await upsertPerson({ email: LEADER_EMAIL, name: "Platform Leader" }, LEADER_PASSWORD, "PLATFORM");
  const otherLeader = await db.roleAssignment.findFirst({
    where: { role: "LEADER", revokedAt: null, userId: { not: leaderId } },
    include: { user: { select: { email: true } } },
  });
  if (otherLeader) {
    throw new Error(`Another account (${otherLeader.user.email}) is already the leader; LEADER_EMAIL must match it.`);
  }
  await grant(leaderId, "LEADER", {}, null);

  const departmentIds = new Map<string, string>();
  for (const department of DEPARTMENTS) {
    const name = normalizeName(department.name);
    const row = await db.department.upsert({ where: { name }, update: {}, create: { name, createdById: leaderId } });
    departmentIds.set(name, row.id);
    await db.brandKit.upsert({
      where: { departmentId: row.id },
      update: {},
      create: { departmentId: row.id, ...department.brand, socialLinks: [] },
    });
    const headId = await upsertPerson(department.head, DEMO_PASSWORD, "PLATFORM");
    await grant(headId, "DEPT_HEAD", { departmentId: row.id }, leaderId);
  }

  for (const { person, departments } of STAFF) {
    const staffId = await upsertPerson(person, DEMO_PASSWORD, "PLATFORM");
    for (const departmentName of departments) {
      const departmentId = departmentIds.get(normalizeName(departmentName));
      if (!departmentId) throw new Error(`Unknown department ${departmentName}`);
      await grant(staffId, "DEPT_STAFF", { departmentId }, leaderId);
    }
  }

  for (const person of JURY) await upsertPerson(person, DEMO_PASSWORD, "PLATFORM");

  const applicantIds = new Map<string, string>();
  for (const person of APPLICANTS) {
    applicantIds.set(person.email, await upsertPerson(person, DEMO_PASSWORD, "APPLICANT"));
  }

  const kiranId = applicantIds.get("applicant.kiran@demo.test");
  const phone = normalizePhone(ACME.phone);
  if (!kiranId || !phone) throw new Error("Seed data is inconsistent");
  const pan = normalizeTaxId(ACME.pan);
  const acme = await db.organisation.upsert({
    where: { pan },
    update: {},
    create: {
      ...ACME,
      legalName: normalizeName(ACME.legalName),
      pan,
      gstin: normalizeTaxId(ACME.gstin),
      officialEmail: normalizeEmail(ACME.officialEmail),
      phone,
      createdById: kiranId,
    },
  });
  await db.organisationMember.upsert({
    where: { organisationId_userId: { organisationId: acme.id, userId: kiranId } },
    update: {},
    create: { organisationId: acme.id, userId: kiranId },
  });

  const people = [
    LEADER_EMAIL,
    ...DEPARTMENTS.map((d) => d.head.email),
    ...STAFF.map((s) => s.person.email),
    ...JURY.map((j) => j.email),
    ...APPLICANTS.map((a) => a.email),
  ];
  console.log(`Seeded the master lists, ${DEPARTMENTS.length} departments with brand kits, and ${people.length} accounts:`);
  for (const email of people) console.log(`  ${normalizeEmail(email)}`);
  console.log("The leader signs in with LEADER_PASSWORD; every other account with DEMO_PASSWORD.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
