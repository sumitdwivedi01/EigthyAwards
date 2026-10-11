"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { AreaPage } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, messageOf } from "@/lib/api-client";
import type { FileView, StaffApplication } from "@/lib/api-types";
import { istDate, istDateTime, rupees } from "@/lib/format";
import { answerText } from "@/features/applying/question-field";
import { downloadFile, fileSize, reviewKey, useReview } from "@/features/applying/use-applying";
import { PROOF_LABELS } from "./applications-list";

/**
 * One application as the award's staff see it (spec §5.20, §12): the organisation's identity, the
 * proof documents next to each other with the check, and the answers. The department's head and
 * the leader may look; only the award's staff check proof (the API says which, as canCheckProof).
 */
export function ApplicationReviewPage({ applicationId }: { applicationId: string }) {
  return <AreaPage area="staff">{() => <Review applicationId={applicationId} />}</AreaPage>;
}

function Review({ applicationId }: { applicationId: string }) {
  const review = useReview(applicationId);
  if (review.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (review.error) return <p className="text-sm text-destructive">{messageOf(review.error)}</p>;
  const a = review.data;
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={`/staff/cycles/${a.cycle.id}/applications`} className="text-muted-foreground underline underline-offset-4">
          Applications: {a.award.name} {a.cycle.label}
        </Link>
      </p>
      <div className="mb-6 grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{a.organisation.legalName}</h1>
          <Badge variant={a.status === "SUBMITTED" ? "default" : "outline"}>{a.statusLabel}</Badge>
          {a.status === "SUBMITTED" && <Badge variant={a.proof.status === "REJECTED" ? "destructive" : "secondary"}>{PROOF_LABELS[a.proof.status]}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {a.category.name} · started by {a.startedBy.name} ({a.startedBy.email})
          {a.submittedAt && ` · submitted ${istDateTime(a.submittedAt)}`}
          {a.fee.amountPaise > 0 && ` · fee ${rupees(a.fee.amountPaise)} ${a.fee.paid ? `paid (${a.fee.reference})` : "not paid"}`}
        </p>
        {a.release && (
          <p className="text-sm">
            Released on {istDateTime(a.release.releasedAt)}: {a.release.reason}
          </p>
        )}
      </div>
      <div className="grid gap-6">
        <ProofCard application={a} />
        <OrganisationCard application={a} />
        <AnswersCard application={a} />
      </div>
    </>
  );
}

function FileRow({ file, detail }: { file: FileView; detail?: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="min-w-0 break-all">{file.fileName}</span>
        <span className="text-xs text-muted-foreground">
          {fileSize(file.sizeBytes)}
          {detail && ` · ${detail}`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => downloadFile(file.id).catch((error: unknown) => setProblem(messageOf(error)))}
        >
          <DownloadIcon aria-hidden />
          Open
        </Button>
      </div>
      {problem && <p className="text-xs text-destructive">{problem}</p>}
    </div>
  );
}

function ProofCard({ application }: { application: StaffApplication }) {
  const a = application;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof</CardTitle>
        <CardDescription>
          The identity document and LinkedIn link from the applicant&apos;s profile, and this application&apos;s proof of employment.
          Never shown to the jury.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Photo identity document</p>
          {a.identityDocument ? <FileRow file={a.identityDocument} /> : <p className="text-sm text-muted-foreground">None on the profile.</p>}
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">LinkedIn profile</p>
          {a.linkedinUrl ? (
            <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-sm break-all underline underline-offset-4">
              {a.linkedinUrl}
              <ExternalLinkIcon className="size-3.5" aria-hidden />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">None on the profile.</p>
          )}
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Proof of employment at {a.organisation.legalName}</p>
          {a.employmentProof ? (
            <FileRow
              file={a.employmentProof}
              detail={`dated ${istDate(`${a.employmentProof.documentDate}T00:00:00+05:30`)}, uploaded ${istDate(a.employmentProof.uploadedAt)}`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">None yet.</p>
          )}
        </div>
        {a.proof.status !== "PENDING" && (
          <p className="text-sm">
            {a.proof.status === "VERIFIED" ? "Verified" : "Rejected"}
            {a.proof.checkedBy && ` by ${a.proof.checkedBy}`}
            {a.proof.checkedAt && ` on ${istDateTime(a.proof.checkedAt)}`}
            {a.proof.note && `: ${a.proof.note}`}
          </p>
        )}
        {a.canCheckProof && <ProofDecision application={a} />}
      </CardContent>
    </Card>
  );
}

function ProofDecision({ application }: { application: StaffApplication }) {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function decide(decision: "VERIFIED" | "REJECTED") {
    setBusy(true);
    setProblem(null);
    try {
      const updated = await api.post<StaffApplication>(`/applications/${application.id}/proof-check`, {
        decision,
        ...(decision === "REJECTED" && { note }),
      });
      queryClient.setQueryData(reviewKey(application.id), updated);
      await queryClient.invalidateQueries({ queryKey: ["cycles", application.cycle.id, "applications"] });
      setRejecting(false);
      setNote("");
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Your check</p>
      {rejecting ? (
        <div className="grid gap-2">
          <Label htmlFor="reject-note">Why it is rejected (the applicant sees this, and can fix it until the deadline)</Label>
          <Textarea
            id="reject-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example: the ID card shows another company's name."
          />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => void decide("REJECTED")} disabled={busy}>
              Reject
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void decide("VERIFIED")} disabled={busy}>
            Verify
          </Button>
          <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
            Reject…
          </Button>
        </div>
      )}
      {problem && (
        <p className="text-sm text-destructive" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

function OrganisationCard({ application }: { application: StaffApplication }) {
  const o = application.organisation;
  const rows: [string, string | null][] = [
    ["PAN", o.pan],
    ["GSTIN", o.gstin],
    ["Address", `${o.addressLine}, ${o.city}, ${o.state.name} ${o.pincode}`],
    ["Official email", o.officialEmail],
    ["Phone", o.phone],
    ["Type", o.organisationType],
    ["CIN", o.cin],
    ["Website", o.website],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisation</CardTitle>
        <CardDescription>
          {o.fromSnapshot
            ? "As it stood when the application was submitted (frozen at the deadline)."
            : "Its record as it is now; the application keeps a copy when it is submitted."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-all">{value}</dd>
              </div>
            ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function AnswersCard({ application }: { application: StaffApplication }) {
  const sections = application.form.sections;
  const firstNumbers = sections.map((_, i) => sections.slice(0, i).reduce((sum, s) => sum + s.questions.length, 1));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Answers</CardTitle>
        <CardDescription>Version {application.form.version} of the questions.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {sections.map((section, s) => (
          <section key={section.key} className="grid gap-3">
            <h2 className="font-medium">{section.title}</h2>
            <dl className="grid gap-3">
              {section.questions.map((question, i) => {
                const key = question.key ?? "";
                return (
                  <div key={key} className="grid gap-1">
                    <dt className="text-sm text-muted-foreground">
                      {(firstNumbers[s] ?? 1) + i}. {question.label}
                    </dt>
                    <dd className="grid gap-1 text-sm whitespace-pre-line">
                      {question.type === "FILE_UPLOAD"
                        ? (application.files[key] ?? []).map((file) => <FileRow key={file.id} file={file} />)
                        : answerText(question, application.answers[key])}
                      {question.type === "FILE_UPLOAD" && (application.files[key] ?? []).length === 0 && "No files"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
