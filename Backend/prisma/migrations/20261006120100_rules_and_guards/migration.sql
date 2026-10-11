-- Database-level guards that Prisma's schema language cannot express.
-- The services check all of these first (with friendly errors); these are the second line of
-- defence, so no bug, script or manual query can break the rules.

-- ─────────────── Append-only history (rule 3, rule 4, spec §5.10, §5.15) ───────────────

CREATE OR REPLACE FUNCTION forbid_change_to_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION forbid_change_to_history();
CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_change_to_history();

-- Published form versions are immutable (rule 4).
CREATE TRIGGER form_versions_append_only
  BEFORE UPDATE OR DELETE ON "form_versions"
  FOR EACH ROW EXECUTE FUNCTION forbid_change_to_history();
CREATE TRIGGER form_versions_no_truncate
  BEFORE TRUNCATE ON "form_versions"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_change_to_history();

CREATE TRIGGER disqualification_events_append_only
  BEFORE UPDATE OR DELETE ON "disqualification_events"
  FOR EACH ROW EXECUTE FUNCTION forbid_change_to_history();
CREATE TRIGGER disqualification_events_no_truncate
  BEFORE TRUNCATE ON "disqualification_events"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_change_to_history();

-- ─────────────── Roles: each role has exactly its own kind of scope (spec §3, §10) ───────────────

ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_scope_check" CHECK (
  (role IN ('LEADER', 'LEADER_PA')
    AND "departmentId" IS NULL AND "awardId" IS NULL AND "cycleId" IS NULL)
  OR (role IN ('DEPT_HEAD', 'DEPT_STAFF')
    AND "departmentId" IS NOT NULL AND "awardId" IS NULL AND "cycleId" IS NULL)
  OR (role = 'AWARD_STAFF'
    AND "awardId" IS NOT NULL AND "departmentId" IS NULL AND "cycleId" IS NULL)
  OR (role = 'JURY'
    AND "cycleId" IS NOT NULL AND "departmentId" IS NULL AND "awardId" IS NULL)
);

-- ─────────────── Organisations: data consistency (spec §5.2, §5.18) ───────────────

ALTER TABLE "organisations"
  ADD CONSTRAINT "organisations_pan_format_check"
    CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  ADD CONSTRAINT "organisations_gstin_check"
    CHECK (gstin IS NULL OR (
      gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
      AND substring(gstin FROM 3 FOR 10) = pan
    )),
  ADD CONSTRAINT "organisations_state_code_check" CHECK ("stateCode" ~ '^[0-9]{2}$'),
  ADD CONSTRAINT "organisations_pincode_check" CHECK (pincode ~ '^[1-9][0-9]{5}$'),
  ADD CONSTRAINT "organisations_phone_check" CHECK (phone ~ '^\+91[1-9][0-9]{9}$'),
  ADD CONSTRAINT "organisations_legal_name_check" CHECK (btrim("legalName") <> '');

ALTER TABLE "users" ADD CONSTRAINT "users_name_check" CHECK (btrim(name) <> '');
ALTER TABLE "departments" ADD CONSTRAINT "departments_name_check" CHECK (btrim(name) <> '');
ALTER TABLE "award_domains" ADD CONSTRAINT "award_domains_name_check" CHECK (btrim(name) <> '');
ALTER TABLE "organisation_types" ADD CONSTRAINT "organisation_types_name_check" CHECK (btrim(name) <> '');
ALTER TABLE "awards" ADD CONSTRAINT "awards_name_check" CHECK (btrim(name) <> '');

-- ─────────────── Cycles, categories, rounds ───────────────

ALTER TABLE "cycles"
  ADD CONSTRAINT "cycles_fee_check" CHECK ("feePaise" >= 0),
  ADD CONSTRAINT "cycles_dates_check" CHECK ("deadlineAt" > "opensAt");

ALTER TABLE "entry_categories"
  ADD CONSTRAINT "entry_categories_fee_check" CHECK ("feePaise" IS NULL OR "feePaise" >= 0);

ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_version_check" CHECK (version >= 1);

-- Document review rounds have no panel; on-site rounds have a panel size (ADR 0008).
ALTER TABLE "rounds"
  ADD CONSTRAINT "rounds_number_check" CHECK (number >= 1),
  ADD CONSTRAINT "rounds_panel_check" CHECK (
    (type = 'DOCUMENT_REVIEW' AND "panelMin" IS NULL AND "panelMax" IS NULL)
    OR (type = 'ON_SITE' AND "panelMin" >= 1 AND "panelMax" >= "panelMin")
  );

-- ─────────────── Files and payments ───────────────

-- 10 MB per file (spec §5.6).
ALTER TABLE "file_assets"
  ADD CONSTRAINT "file_assets_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760);

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK ("amountPaise" > 0);

-- ─────────────── Judging ───────────────

-- Whole numbers 0 to 10, or 0/1 for Yes/No (decided 6 Oct 2026).
ALTER TABLE "indicator_scores" ADD CONSTRAINT "indicator_scores_value_check" CHECK (value BETWEEN 0 AND 10);

ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_revoked_check" CHECK (
  (status = 'REVOKED') = ("revokedAt" IS NOT NULL)
);

-- In a DOCUMENT_REVIEW round an application has exactly one active (non-revoked) evaluation
-- (spec §3: one jury member per application). ON_SITE rounds allow a panel.
-- The advisory lock serialises concurrent assignments of the same application.
CREATE OR REPLACE FUNCTION evaluations_one_active_in_document_round() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'REVOKED'
     AND EXISTS (SELECT 1 FROM "rounds" r WHERE r.id = NEW."roundId" AND r.type = 'DOCUMENT_REVIEW') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW."roundId"::text || NEW."applicationId"::text, 0));
    IF EXISTS (
      SELECT 1 FROM "evaluations" e
      WHERE e."roundId" = NEW."roundId"
        AND e."applicationId" = NEW."applicationId"
        AND e.status <> 'REVOKED'
        AND e.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'A document review round allows one active evaluation per application'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER evaluations_one_active_in_document_round
  BEFORE INSERT OR UPDATE OF status, "roundId", "applicationId" ON "evaluations"
  FOR EACH ROW EXECUTE FUNCTION evaluations_one_active_in_document_round();
