-- Step 1.2 (11 Oct 2026): people created on screen (ADR 0017) and blind judging without masking
-- (ADR 0018). Generated with `prisma migrate diff`, then completed by hand: the jury roles moved
-- to their department before the cycle column goes, the role-scope CHECK re-created (dropping a
-- column silently drops every CHECK that mentions it), and the temporary-password CHECK.

-- ─────────────── The jury role belongs to a department (ADR 0017) ───────────────

-- The old CHECK requires a cycle for JURY, so it goes first.
ALTER TABLE "role_assignments" DROP CONSTRAINT "role_assignments_scope_check";

-- A juror held JURY per cycle; now they are on the jury list of the cycle's department.
UPDATE "role_assignments" r
SET "departmentId" = a."departmentId", "cycleId" = NULL
FROM "cycles" c
JOIN "awards" a ON a.id = c."awardId"
WHERE r.role = 'JURY' AND r."cycleId" = c.id;

ALTER TABLE "role_assignments" DROP CONSTRAINT "role_assignments_cycleId_fkey";
DROP INDEX "role_assignments_cycle_active_key";
DROP INDEX "role_assignments_unscoped_active_key";
ALTER TABLE "role_assignments" DROP COLUMN "cycleId";
CREATE UNIQUE INDEX "role_assignments_unscoped_active_key" ON "role_assignments"("userId", "role") WHERE ("revokedAt" IS NULL AND "departmentId" IS NULL AND "awardId" IS NULL);

ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_scope_check" CHECK (
  (role = 'LEADER'
    AND "departmentId" IS NULL AND "awardId" IS NULL)
  OR (role IN ('DEPT_HEAD', 'DEPT_STAFF', 'JURY')
    AND "departmentId" IS NOT NULL AND "awardId" IS NULL)
  OR (role = 'AWARD_STAFF'
    AND "awardId" IS NOT NULL AND "departmentId" IS NULL)
);

-- ─────────────── Temporary passwords (ADR 0017) ───────────────

ALTER TABLE "users"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "temporaryPasswordExpiresAt" TIMESTAMP(3);

-- Set and cleared together: a temporary password always has its expiry.
ALTER TABLE "users" ADD CONSTRAINT "users_temporary_password_check" CHECK (
  ("mustChangePassword" AND "temporaryPasswordExpiresAt" IS NOT NULL)
  OR (NOT "mustChangePassword" AND "temporaryPasswordExpiresAt" IS NULL)
);

-- ─────────────── Departments: the external-organiser label ───────────────

ALTER TABLE "departments" ADD COLUMN "externalOrganiser" BOOLEAN NOT NULL DEFAULT false;

-- ─────────────── No masking (ADR 0018) ───────────────

ALTER TABLE "masked_answers" DROP CONSTRAINT "masked_answers_applicationId_fkey";
ALTER TABLE "masked_answers" DROP CONSTRAINT "masked_answers_maskedById_fkey";
DROP TABLE "masked_answers";

ALTER TABLE "applications" DROP COLUMN "maskingStatus";
DROP TYPE "MaskingStatus";

ALTER TABLE "file_assets" DROP CONSTRAINT "file_assets_maskedFromId_fkey";
ALTER TABLE "file_assets" DROP COLUMN "maskedFromId", DROP COLUMN "safeAsIs";

-- FileKind without MASKED_EVIDENCE. The three file CHECKs store their values typed as the old enum
-- ('IDENTITY_PROOF'::"FileKind"), so the switch can't compare them: they are dropped before it and
-- re-created after it, unchanged (docs/ai-notes.md #11).
BEGIN;
ALTER TABLE "file_assets"
  DROP CONSTRAINT "file_assets_owner_check",
  DROP CONSTRAINT "file_assets_document_date_check",
  DROP CONSTRAINT "file_assets_consent_check";
CREATE TYPE "FileKind_new" AS ENUM ('EVIDENCE', 'IDENTITY_PROOF', 'EMPLOYMENT_PROOF');
ALTER TABLE "file_assets" ALTER COLUMN "kind" TYPE "FileKind_new" USING ("kind"::text::"FileKind_new");
ALTER TYPE "FileKind" RENAME TO "FileKind_old";
ALTER TYPE "FileKind_new" RENAME TO "FileKind";
DROP TYPE "FileKind_old";
ALTER TABLE "file_assets"
  ADD CONSTRAINT "file_assets_owner_check" CHECK (
    (kind = 'IDENTITY_PROOF' AND "ownerUserId" IS NOT NULL AND "applicationId" IS NULL)
    OR (kind <> 'IDENTITY_PROOF' AND "applicationId" IS NOT NULL AND "ownerUserId" IS NULL)
  ),
  ADD CONSTRAINT "file_assets_document_date_check" CHECK (kind <> 'EMPLOYMENT_PROOF' OR "documentDate" IS NOT NULL),
  ADD CONSTRAINT "file_assets_consent_check" CHECK (kind NOT IN ('IDENTITY_PROOF', 'EMPLOYMENT_PROOF') OR "consentAt" IS NOT NULL);
COMMIT;
