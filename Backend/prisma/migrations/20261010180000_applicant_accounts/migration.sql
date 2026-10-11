-- Applicant accounts and platform accounts (ADR 0016, decided by the owner on 10 Oct 2026).
-- Only applicant accounts create or join an organisation, start applications and keep the profile
-- proof; only platform accounts (the leader, department heads, staff and jury) hold roles and
-- judge. Someone who does both uses two accounts, with two email addresses.
-- Generated with `prisma migrate diff`, then completed by hand: the backfill, a CHECK, and the
-- triggers that keep the two kinds apart even if a service has a bug.

CREATE TYPE "AccountType" AS ENUM ('APPLICANT', 'PLATFORM');

-- Existing accounts: one with an active role is a platform account, every other one an applicant
-- account. Seeded jury have no role until they join a cycle's pool, so the seed marks them.
ALTER TABLE "users" ADD COLUMN "accountType" "AccountType";
UPDATE "users" u SET "accountType" = CASE
  WHEN EXISTS (SELECT 1 FROM "role_assignments" r WHERE r."userId" = u.id AND r."revokedAt" IS NULL)
    THEN 'PLATFORM'::"AccountType"
  ELSE 'APPLICANT'::"AccountType"
END;
ALTER TABLE "users" ALTER COLUMN "accountType" SET NOT NULL;

-- The profile proof belongs to applicant accounts only (spec §5.20).
ALTER TABLE "users" ADD CONSTRAINT "users_profile_proof_check" CHECK (
  "accountType" = 'APPLICANT' OR ("linkedinUrl" IS NULL AND "identityFileId" IS NULL)
);

-- One guard for every table that points at a user who must be of one kind. Its arguments: the
-- column holding the user's id, the account type it needs, and the message. A missing user is
-- left to the foreign key.
CREATE FUNCTION require_account_type() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  user_id uuid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
BEGIN
  IF user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = user_id AND u."accountType"::text <> TG_ARGV[1]) THEN
    RAISE EXCEPTION '%', TG_ARGV[2];
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER role_assignments_platform_accounts_only
  BEFORE INSERT OR UPDATE OF "userId" ON "role_assignments"
  FOR EACH ROW EXECUTE FUNCTION require_account_type(
    'userId', 'PLATFORM', 'Only platform accounts hold roles: this is an applicant account');

CREATE TRIGGER evaluations_platform_accounts_only
  BEFORE INSERT OR UPDATE OF "juryUserId" ON "evaluations"
  FOR EACH ROW EXECUTE FUNCTION require_account_type(
    'juryUserId', 'PLATFORM', 'Only platform accounts judge: this is an applicant account');

CREATE TRIGGER organisation_members_applicant_accounts_only
  BEFORE INSERT OR UPDATE OF "userId" ON "organisation_members"
  FOR EACH ROW EXECUTE FUNCTION require_account_type(
    'userId', 'APPLICANT', 'Only applicant accounts join an organisation: this is a platform account');

CREATE TRIGGER applications_applicant_accounts_only
  BEFORE INSERT OR UPDATE OF "createdById" ON "applications"
  FOR EACH ROW EXECUTE FUNCTION require_account_type(
    'createdById', 'APPLICANT', 'Only applicant accounts start an application: this is a platform account');

-- Only an identity document has an owner (file_assets_owner_check).
CREATE TRIGGER file_assets_applicant_accounts_only
  BEFORE INSERT OR UPDATE OF "ownerUserId" ON "file_assets"
  FOR EACH ROW EXECUTE FUNCTION require_account_type(
    'ownerUserId', 'APPLICANT', 'Only applicant accounts keep an identity document: this is a platform account');

-- The type is fixed once the account is in use, so a change can't leave rows of the wrong kind
-- behind. An unused account may still change (the seed marks the jury accounts it made earlier).
CREATE FUNCTION account_type_fixed_once_used() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."accountType" IS DISTINCT FROM OLD."accountType" AND (
       EXISTS (SELECT 1 FROM "role_assignments" r WHERE r."userId" = NEW.id)
    OR EXISTS (SELECT 1 FROM "evaluations" e WHERE e."juryUserId" = NEW.id)
    OR EXISTS (SELECT 1 FROM "organisation_members" m WHERE m."userId" = NEW.id)
    OR EXISTS (SELECT 1 FROM "applications" a WHERE a."createdById" = NEW.id)
    OR EXISTS (SELECT 1 FROM "file_assets" f WHERE f."ownerUserId" = NEW.id)
  ) THEN
    RAISE EXCEPTION 'The account type is fixed once the account has roles, evaluations, organisations, applications or documents';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_account_type_fixed_once_used
  BEFORE UPDATE OF "accountType" ON "users"
  FOR EACH ROW EXECUTE FUNCTION account_type_fixed_once_used();
