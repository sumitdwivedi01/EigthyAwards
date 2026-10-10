-- Fixes two mistakes in 20261006120100_rules_and_guards, found by the Phase 1 tests.

-- 1. Error codes. The triggers raised SQLSTATE 23001 (restrict_violation) and 23505
--    (unique_violation). Prisma's pg adapter maps those to generic "foreign key" / "unique
--    constraint" errors and drops our message. The default code P0001 (raise_exception) keeps
--    the message, so the services and tests can see which rule refused the write.
CREATE OR REPLACE FUNCTION forbid_change_to_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$;

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
      RAISE EXCEPTION 'A document review round allows one active evaluation per application';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. NULLs in a CHECK. "panelMin >= 1" is NULL (unknown) when panelMin is NULL, and PostgreSQL
--    accepts a CHECK whose result is unknown. So an ON_SITE round with no panel size got in.
--    Every comparison now states IS NOT NULL explicitly.
ALTER TABLE "rounds" DROP CONSTRAINT "rounds_panel_check";
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_panel_check" CHECK (
  (type = 'DOCUMENT_REVIEW' AND "panelMin" IS NULL AND "panelMax" IS NULL)
  OR (type = 'ON_SITE'
      AND "panelMin" IS NOT NULL AND "panelMax" IS NOT NULL
      AND "panelMin" >= 1 AND "panelMax" >= "panelMin")
);
