-- The decisions of 7 to 9 October 2026 (docs/proposals/0.7-backend-changes.md, B1 to B4 and B6):
-- award sites (ADR 0009), proof documents and the entry limit (ADR 0010, 0012), one application
-- per organisation with release (ADR 0011), several jury per application (ADR 0013), and no PA
-- role (ADR 0014). Generated with `prisma migrate diff`, then completed by hand with what Prisma
-- can't express: CHECK constraints, triggers, and the enum switches around them.
-- Every CHECK states IS NULL / IS NOT NULL explicitly (the NULL trap in docs/ai-notes.md #5).

-- ─────────────── New enums ───────────────

CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "SiteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- ─────────────── Changed enums ───────────────
-- PostgreSQL can't drop an enum value, and a value added with ADD VALUE can't be used in the same
-- transaction (the CHECKs below use the new FileKind values). So each changed enum is rebuilt:
-- create the new type, switch the columns, swap the names.

-- ApplicationStatus: REJECTED_DUPLICATE removed, RELEASED added (ADR 0011).
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'WITHDRAWN', 'NOT_SUBMITTED', 'RELEASED');
ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "applications" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING ("status"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "ApplicationStatus_old";
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- FileKind: IDENTITY_PROOF and EMPLOYMENT_PROOF added (ADR 0010, 0012).
BEGIN;
CREATE TYPE "FileKind_new" AS ENUM ('EVIDENCE', 'MASKED_EVIDENCE', 'IDENTITY_PROOF', 'EMPLOYMENT_PROOF');
ALTER TABLE "file_assets" ALTER COLUMN "kind" TYPE "FileKind_new" USING ("kind"::text::"FileKind_new");
ALTER TYPE "FileKind" RENAME TO "FileKind_old";
ALTER TYPE "FileKind_new" RENAME TO "FileKind";
DROP TYPE "FileKind_old";
COMMIT;

-- Role: LEADER_PA removed (ADR 0014). The scope CHECK and the single-leader index compare the
-- column with role values, so they are dropped before the switch and re-created after it.
BEGIN;
ALTER TABLE "role_assignments" DROP CONSTRAINT "role_assignments_scope_check";
DROP INDEX "role_assignments_single_leader_key";
CREATE TYPE "Role_new" AS ENUM ('LEADER', 'DEPT_HEAD', 'DEPT_STAFF', 'AWARD_STAFF', 'JURY');
ALTER TABLE "role_assignments" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "disqualification_events" ALTER COLUMN "byRole" TYPE "Role_new" USING ("byRole"::text::"Role_new");
ALTER TABLE "audit_events" ALTER COLUMN "actorRole" TYPE "Role_new" USING ("actorRole"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
CREATE UNIQUE INDEX "role_assignments_single_leader_key" ON "role_assignments"("role") WHERE (role = 'LEADER' AND "revokedAt" IS NULL);
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_scope_check" CHECK (
  (role = 'LEADER'
    AND "departmentId" IS NULL AND "awardId" IS NULL AND "cycleId" IS NULL)
  OR (role IN ('DEPT_HEAD', 'DEPT_STAFF')
    AND "departmentId" IS NOT NULL AND "awardId" IS NULL AND "cycleId" IS NULL)
  OR (role = 'AWARD_STAFF'
    AND "awardId" IS NOT NULL AND "departmentId" IS NULL AND "cycleId" IS NULL)
  OR (role = 'JURY'
    AND "cycleId" IS NOT NULL AND "departmentId" IS NULL AND "awardId" IS NULL)
);
COMMIT;

-- ─────────────── People: My profile and profile proof (ADR 0012) ───────────────

ALTER TABLE "users"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "identityFileId" UUID;

ALTER TABLE "users"
  ADD CONSTRAINT "users_phone_check" CHECK (phone IS NULL OR phone ~ '^\+91[1-9][0-9]{9}$'),
  ADD CONSTRAINT "users_linkedin_check" CHECK ("linkedinUrl" IS NULL OR "linkedinUrl" ~ '^https?://\S+$');

CREATE UNIQUE INDEX "users_identityFileId_key" ON "users"("identityFileId");
CREATE INDEX "organisation_members_userId_idx" ON "organisation_members"("userId");

-- ─────────────── Cycles: the entry limit (ADR 0010) ───────────────

ALTER TABLE "cycles" ADD COLUMN "maxEntries" INTEGER;
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_max_entries_check" CHECK ("maxEntries" IS NULL OR "maxEntries" > 0);

-- ─────────────── Rounds: jury per application (ADR 0013) ───────────────
-- panelMin and panelMax become juryMin and juryMax, required, for both round types.

ALTER TABLE "rounds" DROP CONSTRAINT "rounds_panel_check";
ALTER TABLE "rounds" RENAME COLUMN "panelMin" TO "juryMin";
ALTER TABLE "rounds" RENAME COLUMN "panelMax" TO "juryMax";
UPDATE "rounds" SET "juryMin" = COALESCE("juryMin", 1), "juryMax" = COALESCE("juryMax", 1);
ALTER TABLE "rounds"
  ALTER COLUMN "juryMin" SET DEFAULT 1,
  ALTER COLUMN "juryMin" SET NOT NULL,
  ALTER COLUMN "juryMax" SET DEFAULT 1,
  ALTER COLUMN "juryMax" SET NOT NULL;
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_jury_check" CHECK (
  (type = 'DOCUMENT_REVIEW' AND "juryMin" >= 1 AND "juryMax" >= "juryMin")
  OR (type = 'ON_SITE' AND "juryMin" >= 2 AND "juryMax" >= "juryMin" AND "juryMax" <= 5)
);

-- ─────────────── Evaluations: several jury per application (ADR 0013) ───────────────
-- The old rule "exactly one active evaluation per application in a document round" goes. The
-- same jury member still can't hold the same application twice while active; revoking frees it.
-- The juryMax ceiling is counted by the service under a lock on the application (a CHECK can't
-- count rows).

DROP TRIGGER "evaluations_one_active_in_document_round" ON "evaluations";
DROP FUNCTION evaluations_one_active_in_document_round();
DROP INDEX "evaluations_roundId_applicationId_juryUserId_key";
CREATE UNIQUE INDEX "evaluations_one_active_per_jury_key" ON "evaluations"("roundId", "applicationId", "juryUserId") WHERE (status <> 'REVOKED');
CREATE INDEX "evaluations_roundId_applicationId_idx" ON "evaluations"("roundId", "applicationId");

-- ─────────────── Files: proof documents and their owners (ADR 0010, 0012) ───────────────
-- IDENTITY_PROOF belongs to a user (the profile); every other kind belongs to an application.

ALTER TABLE "file_assets" DROP CONSTRAINT "file_assets_applicationId_fkey";
ALTER TABLE "file_assets"
  ADD COLUMN "ownerUserId" UUID,
  ADD COLUMN "documentDate" DATE,
  ADD COLUMN "consentAt" TIMESTAMP(3),
  ADD COLUMN "purgedAt" TIMESTAMP(3),
  ALTER COLUMN "applicationId" DROP NOT NULL;

ALTER TABLE "file_assets"
  ADD CONSTRAINT "file_assets_owner_check" CHECK (
    (kind = 'IDENTITY_PROOF' AND "ownerUserId" IS NOT NULL AND "applicationId" IS NULL)
    OR (kind <> 'IDENTITY_PROOF' AND "applicationId" IS NOT NULL AND "ownerUserId" IS NULL)
  ),
  -- The "within 3 months of upload" rule depends on clock.now(), so it stays in the service.
  ADD CONSTRAINT "file_assets_document_date_check" CHECK (kind <> 'EMPLOYMENT_PROOF' OR "documentDate" IS NOT NULL),
  ADD CONSTRAINT "file_assets_consent_check" CHECK (kind NOT IN ('IDENTITY_PROOF', 'EMPLOYMENT_PROOF') OR "consentAt" IS NOT NULL);

CREATE INDEX "file_assets_ownerUserId_idx" ON "file_assets"("ownerUserId");

-- ─────────────── Applications: release, proof status, profile proof used ───────────────

DROP INDEX "applications_cycleId_organisationId_idx";
ALTER TABLE "applications"
  DROP COLUMN "duplicateFlag",
  ADD COLUMN "identityFileId" UUID,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "proofStatus" "ProofStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "proofCheckedById" UUID,
  ADD COLUMN "proofCheckedAt" TIMESTAMP(3),
  ADD COLUMN "proofNote" TEXT,
  ADD COLUMN "releasedAt" TIMESTAMP(3),
  ADD COLUMN "releasedById" UUID,
  ADD COLUMN "releaseReason" TEXT;

ALTER TABLE "applications"
  -- The three release fields are set exactly when the status is RELEASED (ADR 0011).
  ADD CONSTRAINT "applications_release_check" CHECK (
    (status = 'RELEASED'
      AND "releasedAt" IS NOT NULL AND "releasedById" IS NOT NULL
      AND "releaseReason" IS NOT NULL AND btrim("releaseReason") <> '')
    OR (status <> 'RELEASED'
      AND "releasedAt" IS NULL AND "releasedById" IS NULL AND "releaseReason" IS NULL)
  ),
  -- A decided proof check names who decided and when; a rejection needs its reason.
  ADD CONSTRAINT "applications_proof_check" CHECK (
    "proofStatus" = 'PENDING'
    OR ("proofCheckedById" IS NOT NULL AND "proofCheckedAt" IS NOT NULL
      AND ("proofStatus" = 'VERIFIED' OR ("proofNote" IS NOT NULL AND btrim("proofNote") <> '')))
  ),
  ADD CONSTRAINT "applications_linkedin_check" CHECK ("linkedinUrl" IS NULL OR "linkedinUrl" ~ '^https?://\S+$');

-- One active application per organisation per cycle: WITHDRAWN and RELEASED don't count (ADR 0011).
CREATE UNIQUE INDEX "applications_one_active_per_organisation_key" ON "applications"("cycleId", "organisationId") WHERE (status <> 'WITHDRAWN' AND status <> 'RELEASED');
CREATE INDEX "applications_cycleId_status_idx" ON "applications"("cycleId", "status");
CREATE INDEX "applications_identityFileId_idx" ON "applications"("identityFileId");

-- ─────────────── Award sites (ADR 0009) ───────────────

CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "altText" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id"),
    -- Images only, 5 MB, with alt text (§5.19).
    CONSTRAINT "media_assets_image_check" CHECK (
      "mimeType" IN ('image/jpeg', 'image/png', 'image/webp')
      AND "sizeBytes" > 0 AND "sizeBytes" <= 5242880
      AND width > 0 AND height > 0
      AND btrim("altText") <> ''
    )
);

CREATE TABLE "brand_kits" (
    "id" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "logoAssetId" UUID,
    "primaryColour" TEXT NOT NULL,
    "accentColour" TEXT NOT NULL,
    "fontKey" TEXT NOT NULL,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "footerText" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brand_kits_colours_check" CHECK (
      "primaryColour" ~ '^#[0-9A-Fa-f]{6}$' AND "accentColour" ~ '^#[0-9A-Fa-f]{6}$'
    ),
    CONSTRAINT "brand_kits_font_check" CHECK (btrim("fontKey") <> '')
);

-- slug and customDomain are citext (unique regardless of case), and citext's ~ ignores case,
-- so the format checks compare the text value to force lower case.
CREATE TABLE "award_sites" (
    "id" UUID NOT NULL,
    "awardId" UUID NOT NULL,
    "slug" CITEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'DRAFT',
    "themeOverrides" JSONB NOT NULL DEFAULT '{}',
    "customDomain" CITEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "award_sites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "award_sites_slug_check" CHECK (
      slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug::text) BETWEEN 2 AND 60
    ),
    CONSTRAINT "award_sites_custom_domain_check" CHECK (
      "customDomain" IS NULL
      OR "customDomain"::text ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    )
);

CREATE TABLE "site_pages" (
    "id" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "slug" CITEXT NOT NULL,
    "title" TEXT NOT NULL,
    "navOrder" INTEGER NOT NULL DEFAULT 0,
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "draftSections" JSONB NOT NULL DEFAULT '[]',
    "draftSeo" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_pages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_pages_slug_check" CHECK (
      slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug::text) <= 60
    ),
    CONSTRAINT "site_pages_title_check" CHECK (btrim(title) <> '')
);

CREATE TABLE "site_page_versions" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "sections" JSONB NOT NULL,
    "seo" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" UUID,

    CONSTRAINT "site_page_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_page_versions_version_check" CHECK (version >= 1)
);

-- A published page version is immutable, like a form version.
CREATE TRIGGER site_page_versions_append_only
  BEFORE UPDATE OR DELETE ON "site_page_versions"
  FOR EACH ROW EXECUTE FUNCTION forbid_change_to_history();
CREATE TRIGGER site_page_versions_no_truncate
  BEFORE TRUNCATE ON "site_page_versions"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_change_to_history();

CREATE UNIQUE INDEX "media_assets_storageKey_key" ON "media_assets"("storageKey");
CREATE INDEX "media_assets_departmentId_idx" ON "media_assets"("departmentId");
CREATE UNIQUE INDEX "brand_kits_departmentId_key" ON "brand_kits"("departmentId");
CREATE UNIQUE INDEX "award_sites_awardId_key" ON "award_sites"("awardId");
CREATE UNIQUE INDEX "award_sites_slug_key" ON "award_sites"("slug");
CREATE UNIQUE INDEX "award_sites_customDomain_key" ON "award_sites"("customDomain");
CREATE UNIQUE INDEX "site_pages_siteId_slug_key" ON "site_pages"("siteId", "slug");
CREATE UNIQUE INDEX "site_page_versions_pageId_version_key" ON "site_page_versions"("pageId", "version");

-- ─────────────── Foreign keys ───────────────

ALTER TABLE "users" ADD CONSTRAINT "users_identityFileId_fkey" FOREIGN KEY ("identityFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_identityFileId_fkey" FOREIGN KEY ("identityFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_proofCheckedById_fkey" FOREIGN KEY ("proofCheckedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "award_sites" ADD CONSTRAINT "award_sites_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "awards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "award_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_page_versions" ADD CONSTRAINT "site_page_versions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "site_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_page_versions" ADD CONSTRAINT "site_page_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
