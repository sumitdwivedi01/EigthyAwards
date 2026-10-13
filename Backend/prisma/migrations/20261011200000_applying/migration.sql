-- Step 1.3: applying (spec §5.6, §5.20).
-- Generated with `prisma migrate diff`, then completed by hand with the CHECK at the end.

-- One payment per application: the fee is paid once and never refunded (spec §5.6). Two clicks on
-- "Pay" at the same moment can't both write a payment.
DROP INDEX "payments_applicationId_idx";
CREATE UNIQUE INDEX "payments_applicationId_key" ON "payments"("applicationId");

-- A file taken off a draft answer, or an employment proof that was replaced, is kept and marked
-- (nothing an applicant produced is deleted).
ALTER TABLE "file_assets" ADD COLUMN     "removedAt" TIMESTAMP(3);

-- An evidence file always answers one question of the form.
ALTER TABLE "file_assets"
  ADD CONSTRAINT "file_assets_question_check" CHECK (kind <> 'EVIDENCE' OR "questionKey" IS NOT NULL);
