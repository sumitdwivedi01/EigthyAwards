"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronRightIcon, FileTextIcon, FilterIcon } from "lucide-react";
import { ListRow, Stat } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { ApplicationStatus, ProofStatus, StaffApplicationRow } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { useStaffApplications } from "@/features/applying/use-applying";

export const PROOF_LABELS: Record<ProofStatus, string> = { PENDING: "Proof to check", VERIFIED: "Proof verified", REJECTED: "Proof rejected" };
export const PROOF_VARIANTS: Record<ProofStatus, "warning" | "success" | "destructive"> = { PENDING: "warning", VERIFIED: "success", REJECTED: "destructive" };
export const STATUS_VARIANTS: Record<ApplicationStatus, "info" | "outline" | "secondary" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "info",
  WITHDRAWN: "secondary",
  NOT_SUBMITTED: "secondary",
  RELEASED: "destructive",
};

/** An edition's applications for its staff (spec §12): filters by status, category and proof. */
export function ApplicationsListPage({ cycleId }: { cycleId: string }) {
  return <AreaPage area="staff">{() => <ApplicationsList cycleId={cycleId} />}</AreaPage>;
}

function ApplicationsList({ cycleId }: { cycleId: string }) {
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [proof, setProof] = useState("");
  const query = new URLSearchParams({ ...(status && { status }), ...(categoryId && { categoryId }), ...(proof && { proof }) }).toString();
  const list = useStaffApplications(cycleId, query);

  if (list.isPending && !list.data) return <LoadingState label="Loading the applications" lines={6} />;
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  const data = list.data;
  if (!data) return null;
  const { counts, entries } = data;
  const filtered = Boolean(status || categoryId || proof);
  return (
    <>
      <PageTitle
        back={{ href: `/staff/cycles/${cycleId}`, label: `${data.cycle.award.name}: ${data.cycle.label}` }}
        eyebrow={`${data.cycle.award.name} ${data.cycle.label} · deadline ${istDateTime(data.cycle.deadlineAt)}`}
        title="Applications"
        description="Open a submitted application to check its proof of employment. Unverified applications can't be assigned to jury."
        actions={
          data.cycle.roundId && (
            <Button asChild>
              <Link href={`/staff/rounds/${data.cycle.roundId}`}>
                Judging
                <ChevronRightIcon aria-hidden />
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="submitted" value={entries.limit === null ? counts.byStatus.SUBMITTED : `${counts.byStatus.SUBMITTED} / ${entries.limit}`} tone="primary" />
        <Stat label="drafts" value={counts.byStatus.DRAFT} />
        <Stat label="not submitted" value={counts.byStatus.NOT_SUBMITTED} />
        <Stat label="proofs to check" value={counts.byProof.PENDING} tone={counts.byProof.PENDING > 0 ? "warning" : "neutral"} />
        <Stat label="verified" value={counts.byProof.VERIFIED} tone="success" />
        <Stat label="rejected" value={counts.byProof.REJECTED} />
      </div>
      <div className="mb-6 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[auto_1fr_1fr_1fr] sm:items-end">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground sm:pb-3">
          <FilterIcon className="size-4" aria-hidden /> Show
        </span>
        <Filter id="status" label="Status" value={status} onChange={setStatus}>
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="NOT_SUBMITTED">Not submitted</option>
          <option value="RELEASED">Released</option>
        </Filter>
        <Filter id="category" label="Category" value={categoryId} onChange={setCategoryId}>
          <option value="">All</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Filter>
        <Filter id="proof" label="Proof (submitted only)" value={proof} onChange={setProof}>
          <option value="">All</option>
          <option value="PENDING">To check</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </Filter>
      </div>
      {data.applications.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title={filtered ? "No applications match these filters" : "No applications yet"}
          description={filtered ? "Try a wider filter." : "Applications appear here as organisations start them."}
          action={
            filtered && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("");
                  setCategoryId("");
                  setProof("");
                }}
              >
                Clear the filters
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-2">
          {data.applications.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </ul>
      )}
    </>
  );
}

function Filter({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`filter-${id}`}>{label}</Label>
      <NativeSelect id={`filter-${id}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </NativeSelect>
    </div>
  );
}

function Row({ row }: { row: StaffApplicationRow }) {
  return (
    <ListRow>
      <div className="grid min-w-0 flex-1 gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/staff/applications/${row.id}`} className="text-base font-semibold underline-offset-4 hover:underline">
            {row.organisation.legalName}
          </Link>
          <Badge variant={STATUS_VARIANTS[row.status]}>{row.statusLabel}</Badge>
          {row.status === "SUBMITTED" && <Badge variant={PROOF_VARIANTS[row.proofStatus]}>{PROOF_LABELS[row.proofStatus]}</Badge>}
        </span>
        <span className="text-sm text-muted-foreground">
          {row.category.name} · by {row.startedBy.name} · {row.submittedAt ? `submitted ${istDateTime(row.submittedAt)}` : `started ${istDateTime(row.createdAt)}`}
          {row.feeUnpaid && " · fee not paid"}
        </span>
      </div>
      <Button asChild size="sm" variant={row.status === "SUBMITTED" && row.proofStatus === "PENDING" ? "default" : "outline"}>
        <Link href={`/staff/applications/${row.id}`}>
          {row.status === "SUBMITTED" && row.proofStatus === "PENDING" ? "Check proof" : "Open"}
          <ChevronRightIcon aria-hidden />
        </Link>
      </Button>
    </ListRow>
  );
}
