-- Case-insensitive text for names and emails that must be unique regardless of case (ADR 0006).
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LEADER', 'LEADER_PA', 'DEPT_HEAD', 'DEPT_STAFF', 'AWARD_STAFF', 'JURY');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('INVITE', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'RESULTS_PUBLISHED');

-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('DOCUMENT_REVIEW', 'ON_SITE');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('NOT_STARTED', 'JUDGING', 'PENDING_APPROVAL', 'SENT_BACK', 'APPROVED', 'CLOSED', 'RESULTS_PUBLISHED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WITHDRAWN', 'NOT_SUBMITTED', 'REJECTED_DUPLICATE');

-- CreateEnum
CREATE TYPE "MaskingStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('EVIDENCE', 'MASKED_EVIDENCE');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'READY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REDO', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'SENT_BACK');

-- CreateEnum
CREATE TYPE "DisqualificationAction" AS ENUM ('DISQUALIFY', 'REINSTATE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "departmentId" UUID,
    "awardId" UUID,
    "cycleId" UUID,
    "grantedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" UUID,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" CITEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_domains" (
    "id" UUID NOT NULL,
    "name" CITEXT NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_types" (
    "id" UUID NOT NULL,
    "name" CITEXT NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "pan" CHAR(10) NOT NULL,
    "gstin" CHAR(15),
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "stateCode" CHAR(2) NOT NULL,
    "pincode" CHAR(6) NOT NULL,
    "officialEmail" CITEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "orgTypeId" UUID,
    "cin" TEXT,
    "website" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_members" (
    "organisationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("organisationId","userId")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "name" CITEXT NOT NULL,
    "domainId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" UUID NOT NULL,
    "awardId" UUID NOT NULL,
    "label" CITEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "feePaise" INTEGER NOT NULL DEFAULT 0,
    "blindJudging" BOOLEAN NOT NULL DEFAULT false,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "draftFormSchema" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_categories" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "name" CITEXT NOT NULL,
    "feePaise" INTEGER,

    CONSTRAINT "entry_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "schema" JSONB NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" UUID,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "RoundType" NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "resultLabels" JSONB NOT NULL,
    "panelMin" INTEGER,
    "panelMax" INTEGER,
    "closedAt" TIMESTAMP(3),
    "closedById" UUID,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_sheets" (
    "id" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "schema" JSONB NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "formVersionId" UUID,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "maskingStatus" "MaskingStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "duplicateFlag" BOOLEAN NOT NULL DEFAULT false,
    "updateRequested" BOOLEAN NOT NULL DEFAULT false,
    "identitySnapshot" JSONB,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "withdrawReason" TEXT,
    "disqualifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "applicationId" UUID NOT NULL,
    "questionKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("applicationId","questionKey")
);

-- CreateTable
CREATE TABLE "masked_answers" (
    "applicationId" UUID NOT NULL,
    "questionKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "maskedById" UUID NOT NULL,
    "maskedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "masked_answers_pkey" PRIMARY KEY ("applicationId","questionKey")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "questionKey" TEXT,
    "kind" "FileKind" NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "maskedFromId" UUID,
    "safeAsIs" BOOLEAN NOT NULL DEFAULT false,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "reference" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflicts" (
    "id" UUID NOT NULL,
    "juryUserId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "note" TEXT,
    "recordedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "juryUserId" UUID NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'ASSIGNED',
    "overallNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "enteredById" UUID,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_scores" (
    "evaluationId" UUID NOT NULL,
    "indicatorKey" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicator_scores_pkey" PRIMARY KEY ("evaluationId","indicatorKey")
);

-- CreateTable
CREATE TABLE "question_comments" (
    "evaluationId" UUID NOT NULL,
    "questionKey" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_comments_pkey" PRIMARY KEY ("evaluationId","questionKey")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "remark" TEXT,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_remarks" (
    "approvalRequestId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "remark" TEXT NOT NULL,

    CONSTRAINT "approval_remarks_pkey" PRIMARY KEY ("approvalRequestId","applicationId")
);

-- CreateTable
CREATE TABLE "disqualification_events" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "action" "DisqualificationAction" NOT NULL,
    "byUserId" UUID NOT NULL,
    "byRole" "Role" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disqualification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_slots" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "note" TEXT,
    "scheduledById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presentation_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_results" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "finalScore" DECIMAL(5,2),
    "rank" INTEGER,
    "resultLabel" TEXT,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "round_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "cycleId" UUID,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "role_assignments_userId_idx" ON "role_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_unscoped_active_key" ON "role_assignments"("userId", "role") WHERE ("revokedAt" IS NULL AND "departmentId" IS NULL AND "awardId" IS NULL AND "cycleId" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_department_active_key" ON "role_assignments"("userId", "role", "departmentId") WHERE ("revokedAt" IS NULL AND "departmentId" IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_award_active_key" ON "role_assignments"("userId", "role", "awardId") WHERE ("revokedAt" IS NULL AND "awardId" IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_cycle_active_key" ON "role_assignments"("userId", "role", "cycleId") WHERE ("revokedAt" IS NULL AND "cycleId" IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_single_leader_key" ON "role_assignments"("role") WHERE (role = 'LEADER' AND "revokedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_type_idx" ON "auth_tokens"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "award_domains_name_key" ON "award_domains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_types_name_key" ON "organisation_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_pan_key" ON "organisations"("pan");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_gstin_key" ON "organisations"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "awards_departmentId_name_key" ON "awards"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cycles_awardId_label_key" ON "cycles"("awardId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "entry_categories_cycleId_name_key" ON "entry_categories"("cycleId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "entry_categories_id_cycleId_key" ON "entry_categories"("id", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_cycleId_version_key" ON "form_versions"("cycleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_id_cycleId_key" ON "form_versions"("id", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_cycleId_number_key" ON "rounds"("cycleId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_id_cycleId_key" ON "rounds"("id", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_sheets_roundId_key" ON "scoring_sheets"("roundId");

-- CreateIndex
CREATE INDEX "applications_cycleId_organisationId_idx" ON "applications"("cycleId", "organisationId");

-- CreateIndex
CREATE INDEX "applications_organisationId_idx" ON "applications"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_id_cycleId_key" ON "applications"("id", "cycleId");

-- CreateIndex
CREATE INDEX "file_assets_applicationId_kind_idx" ON "file_assets"("applicationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_applicationId_idx" ON "payments"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "conflicts_juryUserId_organisationId_key" ON "conflicts"("juryUserId", "organisationId");

-- CreateIndex
CREATE INDEX "evaluations_juryUserId_status_idx" ON "evaluations"("juryUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_roundId_applicationId_juryUserId_key" ON "evaluations"("roundId", "applicationId", "juryUserId");

-- CreateIndex
CREATE INDEX "approval_requests_roundId_idx" ON "approval_requests"("roundId");

-- CreateIndex
CREATE INDEX "disqualification_events_applicationId_createdAt_idx" ON "disqualification_events"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "presentation_slots_roundId_applicationId_key" ON "presentation_slots"("roundId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "round_results_roundId_applicationId_key" ON "round_results"("roundId", "applicationId");

-- CreateIndex
CREATE INDEX "audit_events_cycleId_entityType_entityId_idx" ON "audit_events"("cycleId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_actorRole_createdAt_idx" ON "audit_events"("actorRole", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_status_createdAt_idx" ON "email_logs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "awards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_orgTypeId_fkey" FOREIGN KEY ("orgTypeId") REFERENCES "organisation_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "award_domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "awards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_categories" ADD CONSTRAINT "entry_categories_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_sheets" ADD CONSTRAINT "scoring_sheets_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_categoryId_cycleId_fkey" FOREIGN KEY ("categoryId", "cycleId") REFERENCES "entry_categories"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_formVersionId_cycleId_fkey" FOREIGN KEY ("formVersionId", "cycleId") REFERENCES "form_versions"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masked_answers" ADD CONSTRAINT "masked_answers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masked_answers" ADD CONSTRAINT "masked_answers_maskedById_fkey" FOREIGN KEY ("maskedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_maskedFromId_fkey" FOREIGN KEY ("maskedFromId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_juryUserId_fkey" FOREIGN KEY ("juryUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_roundId_cycleId_fkey" FOREIGN KEY ("roundId", "cycleId") REFERENCES "rounds"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_applicationId_cycleId_fkey" FOREIGN KEY ("applicationId", "cycleId") REFERENCES "applications"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_juryUserId_fkey" FOREIGN KEY ("juryUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_scores" ADD CONSTRAINT "indicator_scores_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_comments" ADD CONSTRAINT "question_comments_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_remarks" ADD CONSTRAINT "approval_remarks_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_remarks" ADD CONSTRAINT "approval_remarks_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disqualification_events" ADD CONSTRAINT "disqualification_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disqualification_events" ADD CONSTRAINT "disqualification_events_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_slots" ADD CONSTRAINT "presentation_slots_roundId_cycleId_fkey" FOREIGN KEY ("roundId", "cycleId") REFERENCES "rounds"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_slots" ADD CONSTRAINT "presentation_slots_applicationId_cycleId_fkey" FOREIGN KEY ("applicationId", "cycleId") REFERENCES "applications"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_slots" ADD CONSTRAINT "presentation_slots_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_roundId_cycleId_fkey" FOREIGN KEY ("roundId", "cycleId") REFERENCES "rounds"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_applicationId_cycleId_fkey" FOREIGN KEY ("applicationId", "cycleId") REFERENCES "applications"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

