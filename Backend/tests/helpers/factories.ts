import { randomInt } from "node:crypto";
import { db } from "../../src/lib/db.js";
import type { Prisma, RoundType } from "../../src/generated/prisma/client.js";

/**
 * Small builders for test data. Each returns the created row and accepts overrides.
 * They write straight to the database (no services yet), which is fine for tests.
 */

let counter = 0;
function unique(): number {
  counter += 1;
  return counter;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function letters(count: number): string {
  let out = "";
  for (let i = 0; i < count; i += 1) out += LETTERS.charAt(randomInt(LETTERS.length));
  return out;
}

/** A random PAN in the right format: 5 letters, 4 digits, 1 letter. */
export function randomPan(): string {
  return `${letters(5)}${String(randomInt(10000)).padStart(4, "0")}${letters(1)}`;
}

/** A GSTIN in the right format containing the given PAN (state 27 = Maharashtra). */
export function gstinFor(pan: string, stateCode = "27"): string {
  return `${stateCode}${pan}1Z${letters(1)}`;
}

export async function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  const n = unique();
  return db.user.create({ data: { email: `user${n}@example.test`, name: `User ${n}`, ...overrides } });
}

export async function createDepartment(overrides: Partial<Prisma.DepartmentUncheckedCreateInput> = {}) {
  return db.department.create({ data: { name: `Department ${unique()}`, ...overrides } });
}

export async function createAwardDomain(name = `Domain ${unique()}`) {
  return db.awardDomain.create({ data: { name } });
}

export async function createOrganisation(overrides: Partial<Prisma.OrganisationUncheckedCreateInput> = {}) {
  const pan = overrides.pan ?? randomPan();
  return db.organisation.create({
    data: {
      legalName: `Organisation ${unique()} Ltd`,
      pan,
      gstin: gstinFor(pan),
      addressLine: "1 Industrial Area",
      city: "Pune",
      stateCode: "27",
      pincode: "411001",
      officialEmail: `office${unique()}@org.example.test`,
      phone: "+919876543210",
      ...overrides,
    },
  });
}

/** A department, a domain, an award and one cycle with one entry category. */
export async function createCycle(overrides: Partial<Prisma.CycleUncheckedCreateInput> = {}) {
  const department = await createDepartment();
  const domain = await createAwardDomain();
  const award = await db.award.create({
    data: {
      departmentId: department.id,
      domainId: domain.id,
      name: `Award ${unique()}`,
      description: "A test award",
    },
  });
  const cycle = await db.cycle.create({
    data: {
      awardId: award.id,
      label: "2026",
      opensAt: new Date("2026-01-01T00:00:00Z"),
      deadlineAt: new Date("2026-03-31T18:29:59Z"),
      ...overrides,
    },
  });
  const category = await db.entryCategory.create({ data: { cycleId: cycle.id, name: "General" } });
  return { department, domain, award, cycle, category };
}

export async function createRound(cycleId: string, type: RoundType = "DOCUMENT_REVIEW", number = 1) {
  return db.round.create({
    data: {
      cycleId,
      number,
      type,
      resultLabels:
        type === "DOCUMENT_REVIEW"
          ? [{ label: "Shortlisted", advances: true }, { label: "Rejected" }]
          : [{ label: "Gold" }, { label: "Silver" }, { label: "Bronze" }, { label: "Participated" }],
      panelMin: type === "ON_SITE" ? 2 : null,
      panelMax: type === "ON_SITE" ? 5 : null,
    },
  });
}

export async function createApplication(cycleId: string, categoryId: string) {
  const organisation = await createOrganisation();
  const applicant = await createUser();
  return db.application.create({
    data: { cycleId, categoryId, organisationId: organisation.id, createdById: applicant.id },
  });
}
