/**
 * Seed data. Safe to run again: it only adds what is missing.
 * Phase 1 seeds the master data lists. Phase 2 adds the leader (from LEADER_EMAIL and
 * LEADER_PASSWORD), a PA, departments and staff; Phase 11 adds the full demo data.
 * Everything goes through the same normalisers as the services (GAPS G-H09).
 */
import { db } from "../src/lib/db.js";
import { normalizeName } from "../src/lib/normalize.js";

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
];

async function main(): Promise<void> {
  for (const raw of AWARD_DOMAINS) {
    const name = normalizeName(raw);
    await db.awardDomain.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const raw of ORGANISATION_TYPES) {
    const name = normalizeName(raw);
    await db.organisationType.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(
    `Seeded ${AWARD_DOMAINS.length} award domains and ${ORGANISATION_TYPES.length} organisation types.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
