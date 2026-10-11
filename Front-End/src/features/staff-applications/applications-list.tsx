"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { messageOf } from "@/lib/api-client";
import type { ProofStatus, StaffApplicationRow } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { useStaffApplications } from "@/features/applying/use-applying";

export const PROOF_LABELS: Record<ProofStatus, string> = { PENDING: "Proof to check", VERIFIED: "Proof verified", REJECTED: "Proof rejected" };

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

  if (list.isPending && !list.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (list.error) return <p className="text-sm text-destructive">{messageOf(list.error)}</p>;
  const data = list.data;
  if (!data) return null;
  const { counts, entries } = data;
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={`/staff/cycles/${cycleId}`} className="text-muted-foreground underline underline-offset-4">
          {data.cycle.award.name}: {data.cycle.label}
        </Link>
      </p>
      <PageTitle
        title="Applications"
        description={`${data.cycle.award.name} ${data.cycle.label} · deadline ${istDateTime(data.cycle.deadlineAt)} · ${
          entries.limit === null ? `${entries.submitted} submitted` : `${entries.submitted} / ${entries.limit} submitted`
        }`}
      />
      {data.cycle.roundId && (
        <p className="-mt-3 mb-4 text-sm">
          <Link href={`/staff/rounds/${data.cycle.roundId}`} className="underline underline-offset-4">
            Judging: assignment, scores and results
          </Link>
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{counts.byStatus.DRAFT} drafts</Badge>
        <Badge>{counts.byStatus.SUBMITTED} submitted</Badge>
        <Badge variant="outline">{counts.byStatus.NOT_SUBMITTED} not submitted</Badge>
        <Badge variant="secondary">{counts.byProof.PENDING} proofs to check</Badge>
        <Badge variant="secondary">{counts.byProof.VERIFIED} verified</Badge>
        <Badge variant="secondary">{counts.byProof.REJECTED} rejected</Badge>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
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
        <Filter id="proof" label="Proof (submitted)" value={proof} onChange={setProof}>
          <option value="">All</option>
          <option value="PENDING">To check</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </Filter>
      </div>
      {data.applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications match.</p>
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

function Filter({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`filter-${id}`}>{label}</Label>
      <NativeSelect id={`filter-${id}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </NativeSelect>
    </div>
  );
}

function Row({ row }: { row: StaffApplicationRow }) {
  return (
    <li>
      <Card className="py-3">
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href={`/staff/applications/${row.id}`} className="font-medium underline-offset-4 hover:underline">
            {row.organisation.legalName}
          </Link>
          <span className="text-muted-foreground">{row.category.name}</span>
          <Badge variant={row.status === "SUBMITTED" ? "default" : "outline"}>{row.statusLabel}</Badge>
          {row.status === "SUBMITTED" && <Badge variant={row.proofStatus === "REJECTED" ? "destructive" : "secondary"}>{PROOF_LABELS[row.proofStatus]}</Badge>}
          <span className="text-muted-foreground">
            by {row.startedBy.name} · {row.submittedAt ? `submitted ${istDateTime(row.submittedAt)}` : `started ${istDateTime(row.createdAt)}`}
            {row.feeUnpaid && " · fee not paid"}
          </span>
        </CardContent>
      </Card>
    </li>
  );
}
