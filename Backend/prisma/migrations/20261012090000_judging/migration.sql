-- Step 1.4: assignment, judging and results (spec §5.8–§5.12, ADR 0019).
-- Generated with `prisma migrate diff`, then completed by hand with the CHECKs and triggers at the
-- end, which Prisma's schema language can't express.

-- A conflict recorded by mistake is removed with a reason and kept (decided 11 Oct): the unique
-- pair becomes "one active conflict per jury member and organisation".
DROP INDEX "conflicts_juryUserId_organisationId_key";

ALTER TABLE "conflicts" ADD COLUMN     "removeReason" TEXT,
ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedById" UUID;

-- ΣP and n next to the final score, so anyone can redo it by hand (ADR 0019).
ALTER TABLE "round_results" ADD COLUMN     "evaluationCount" INTEGER,
ADD COLUMN     "totalPoints" INTEGER;

CREATE INDEX "conflicts_organisationId_idx" ON "conflicts"("organisationId");

CREATE UNIQUE INDEX "conflicts_one_active_key" ON "conflicts"("juryUserId", "organisationId") WHERE ("removedAt" IS NULL);

ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────── Hand-written guards ───────────────

-- Removed means all three: when, by whom and why.
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_removed_check" CHECK (
  ("removedAt" IS NULL) = ("removedById" IS NULL) AND ("removedAt" IS NULL) = ("removeReason" IS NULL)
);

-- The final score is exactly F₂ = ⌊(ΣP + 5n) ÷ (10n)⌋ ÷ 100 of the stored ΣP and n (ADR 0019): the
-- three are set together, n is at least 1, and ΣP is at most 100,000 points per evaluation.
-- PostgreSQL divides integers by truncating, which is the floor for these non-negative numbers.
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_score_check" CHECK (
  ("finalScore" IS NULL) = ("totalPoints" IS NULL)
  AND ("totalPoints" IS NULL) = ("evaluationCount" IS NULL)
  AND (
    "evaluationCount" IS NULL
    OR (
      "evaluationCount" >= 1
      AND "totalPoints" BETWEEN 0 AND 100000 * "evaluationCount"
      AND "finalScore" * 100 = ("totalPoints" + 5 * "evaluationCount") / (10 * "evaluationCount")
    )
  )
);
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_rank_check" CHECK (rank IS NULL OR rank >= 1);

-- Results never shift (GAPS G-C14): once written at approval, the score, ΣP, n and the rank stay as
-- they are; only the label and its publishing change. Results are never deleted.
CREATE OR REPLACE FUNCTION round_results_scores_fixed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'round_results are kept: DELETE is not allowed';
  END IF;
  IF NEW."finalScore" IS DISTINCT FROM OLD."finalScore"
     OR NEW."totalPoints" IS DISTINCT FROM OLD."totalPoints"
     OR NEW."evaluationCount" IS DISTINCT FROM OLD."evaluationCount"
     OR NEW.rank IS DISTINCT FROM OLD.rank THEN
    RAISE EXCEPTION 'A round result''s score and rank are fixed once the round is approved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER round_results_scores_fixed
  BEFORE UPDATE OR DELETE ON "round_results"
  FOR EACH ROW EXECUTE FUNCTION round_results_scores_fixed();

-- Rule R3: after the department head approves a round (or staff close an on-site round), nobody can
-- change its scores. The services refuse first; these triggers refuse even a direct query.
-- Every RAISE here keeps the default SQLSTATE (P0001): Prisma's pg adapter drops the message of
-- 23001 restrict_violation (see 20261006120200_fix_guard_errors_and_null_checks).
CREATE OR REPLACE FUNCTION round_is_locked(round_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "rounds" r
    WHERE r.id = round_id AND r.status IN ('APPROVED', 'CLOSED', 'RESULTS_PUBLISHED')
  );
$$;

CREATE OR REPLACE FUNCTION evaluations_locked_after_approval() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF round_is_locked(CASE WHEN TG_OP = 'INSERT' THEN NEW."roundId" ELSE OLD."roundId" END) THEN
    RAISE EXCEPTION 'The round''s scores are locked: % on evaluations is not allowed', TG_OP;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER evaluations_locked_after_approval
  BEFORE INSERT OR UPDATE OR DELETE ON "evaluations"
  FOR EACH ROW EXECUTE FUNCTION evaluations_locked_after_approval();

-- Indicator scores and question comments belong to an evaluation, so they lock with its round.
CREATE OR REPLACE FUNCTION evaluation_parts_locked_after_approval() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  evaluation_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD."evaluationId" ELSE NEW."evaluationId" END;
BEGIN
  IF EXISTS (
    SELECT 1 FROM "evaluations" e WHERE e.id = evaluation_id AND round_is_locked(e."roundId")
  ) THEN
    RAISE EXCEPTION 'The round''s scores are locked: % on % is not allowed', TG_OP, TG_TABLE_NAME;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER indicator_scores_locked_after_approval
  BEFORE INSERT OR UPDATE OR DELETE ON "indicator_scores"
  FOR EACH ROW EXECUTE FUNCTION evaluation_parts_locked_after_approval();

CREATE TRIGGER question_comments_locked_after_approval
  BEFORE INSERT OR UPDATE OR DELETE ON "question_comments"
  FOR EACH ROW EXECUTE FUNCTION evaluation_parts_locked_after_approval();

-- A locked round never goes back: Approved and Closed only move on to Results published, which is
-- final (spec §4).
CREATE OR REPLACE FUNCTION rounds_locked_status_forward_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('APPROVED', 'CLOSED') AND NEW.status NOT IN (OLD.status, 'RESULTS_PUBLISHED') THEN
    RAISE EXCEPTION 'A locked round can''t go from % back to %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'RESULTS_PUBLISHED' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'A round whose results are published can''t change status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rounds_locked_status_forward_only
  BEFORE UPDATE OF status ON "rounds"
  FOR EACH ROW EXECUTE FUNCTION rounds_locked_status_forward_only();
