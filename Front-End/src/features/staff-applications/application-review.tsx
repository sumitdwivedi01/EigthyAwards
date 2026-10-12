"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheckIcon, DownloadIcon, ExternalLinkIcon, HistoryIcon, XIcon } from "lucide-react";
import { Details } from "@/components/layout/blocks";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { HistoryPanel } from "@/features/judging/history-panel";
import { PROOF_LABELS, PROOF_VARIANTS, STATUS_VARIANTS } from "./applications-list";

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
  if (review.isPending) return <LoadingState label="Loading the application" lines={6} />;
  if (review.error) return <ErrorState error={review.error} onRetry={() => void review.refetch()} />;
  const a = review.data;
  return (
    <>
      <PageTitle
        back={{ href: `/staff/cycles/${a.cycle.id}/applications`, label: `Applications: ${a.award.name} ${a.cycle.label}` }}
        eyebrow={a.category.name}
        title={a.organisation.legalName}
        badges={
          <>
            <Badge variant={STATUS_VARIANTS[a.status]}>{a.statusLabel}</Badge>
            {a.status === "SUBMITTED" && <Badge variant={PROOF_VARIANTS[a.proof.status]}>{PROOF_LABELS[a.proof.status]}</Badge>}
          </>
        }
        description={
          <>
            Started by {a.startedBy.name} ({a.startedBy.email})
            {a.submittedAt && ` · submitted ${istDateTime(a.submittedAt)}`}
            {a.fee.amountPaise > 0 && ` · fee ${rupees(a.fee.amountPaise)} ${a.fee.paid ? `paid (${a.fee.reference})` : "not paid"}`}
          </>
        }
      />
      {a.release && (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>
            Released on {istDateTime(a.release.releasedAt)}: {a.release.reason}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <ProofCard application={a} />
          <AnswersCard application={a} />
        </div>
        <div className="grid content-start gap-6">
          <OrganisationCard application={a} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HistoryIcon className="size-5 text-muted-foreground" aria-hidden />
                History
              </CardTitle>
              <CardDescription>Every recorded decision: who, in which role, when, and why.</CardDescription>
            </CardHeader>
            <CardContent>
              <HistoryPanel applicationId={a.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function FileRow({ file, detail }: { file: FileView; detail?: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
        <span className="min-w-0 flex-1 font-medium break-all">{file.fileName}</span>
        <span className="text-sm text-muted-foreground">
          {fileSize(file.sizeBytes)}
          {detail && ` · ${detail}`}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={() => downloadFile(file.id).catch((error: unknown) => setProblem(messageOf(error)))}>
          <DownloadIcon aria-hidden />
          Open
        </Button>
      </div>
      {problem && <p className="text-sm font-medium text-destructive">{problem}</p>}
    </div>
  );
}

function ProofCard({ application }: { application: StaffApplication }) {
  const a = application;
  return (
    <Card className={a.canCheckProof ? "border-warning/40" : undefined}>
      <CardHeader>
        <CardTitle>Proof</CardTitle>
        <CardDescription>The identity document and LinkedIn link from the applicant&apos;s profile, and this application&apos;s proof of employment. Never shown to the jury.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <p className="font-semibold">Photo identity document</p>
          {a.identityDocument ? <FileRow file={a.identityDocument} /> : <p className="text-sm text-muted-foreground">None on the profile.</p>}
        </div>
        <div className="grid gap-2">
          <p className="font-semibold">LinkedIn profile</p>
          {a.linkedinUrl ? (
            <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1.5 font-medium break-all text-primary underline-offset-4 hover:underline">
              {a.linkedinUrl}
              <ExternalLinkIcon className="size-4 shrink-0" aria-hidden />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">None on the profile.</p>
          )}
        </div>
        <div className="grid gap-2">
          <p className="font-semibold">Proof of employment at {a.organisation.legalName}</p>
          {a.employmentProof ? (
            <FileRow file={a.employmentProof} detail={`dated ${istDate(`${a.employmentProof.documentDate}T00:00:00+05:30`)}, uploaded ${istDate(a.employmentProof.uploadedAt)}`} />
          ) : (
            <p className="text-sm text-muted-foreground">None yet.</p>
          )}
        </div>
        {a.proof.status !== "PENDING" && (
          <Alert variant={a.proof.status === "VERIFIED" ? "success" : "destructive"}>
            {a.proof.status === "VERIFIED" ? <CircleCheckIcon /> : <XIcon />}
            <AlertDescription>
              {a.proof.status === "VERIFIED" ? "Verified" : "Rejected"}
              {a.proof.checkedBy && ` by ${a.proof.checkedBy}`}
              {a.proof.checkedAt && ` on ${istDateTime(a.proof.checkedAt)}`}
              {a.proof.note && `: ${a.proof.note}`}
            </AlertDescription>
          </Alert>
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
    <div className="surface grid gap-4 p-4 sm:p-5">
      <div className="grid gap-0.5">
        <p className="font-semibold">Your check</p>
        <p className="text-sm text-muted-foreground">Do the documents show that this person works for {application.organisation.legalName} now?</p>
      </div>
      {rejecting ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="reject-note">Why it is rejected</Label>
            <p className="text-sm text-muted-foreground">The applicant sees this and can fix it until the deadline.</p>
            <Textarea id="reject-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: the ID card shows another company's name." />
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => void decide("REJECTED")} disabled={busy}>
              {busy ? "Rejecting…" : "Reject the proof"}
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => void decide("VERIFIED")} disabled={busy}>
            <CircleCheckIcon aria-hidden />
            {busy ? "Saving…" : "Verify"}
          </Button>
          <Button size="lg" variant="destructive-outline" onClick={() => setRejecting(true)} disabled={busy}>
            <XIcon aria-hidden />
            Reject…
          </Button>
        </div>
      )}
      {problem && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

function OrganisationCard({ application }: { application: StaffApplication }) {
  const o = application.organisation;
  const rows: { label: string; value: string | null }[] = [
    { label: "PAN", value: o.pan },
    { label: "GSTIN", value: o.gstin },
    { label: "Address", value: `${o.addressLine}, ${o.city}, ${o.state.name} ${o.pincode}` },
    { label: "Official email", value: o.officialEmail },
    { label: "Phone", value: o.phone },
    { label: "Type", value: o.organisationType },
    { label: "CIN", value: o.cin },
    { label: "Website", value: o.website },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisation</CardTitle>
        <CardDescription>{o.fromSnapshot ? "As it stood when the application was submitted (frozen at the deadline)." : "Its record as it is now; the application keeps a copy when it is submitted."}</CardDescription>
      </CardHeader>
      <CardContent>
        <Details columns={1} items={rows.filter((r): r is { label: string; value: string } => Boolean(r.value))} />
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
      <CardContent className="grid gap-8">
        {sections.map((section, s) => (
          <section key={section.key} className="grid gap-4">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <dl className="grid gap-4">
              {section.questions.map((question, i) => {
                const key = question.key ?? "";
                return (
                  <div key={key} className="grid gap-1.5 border-l-2 pl-4">
                    <dt className="text-sm text-muted-foreground">
                      {(firstNumbers[s] ?? 1) + i}. {question.label}
                    </dt>
                    <dd className="grid gap-1 whitespace-pre-line">
                      {question.type === "FILE_UPLOAD" ? (application.files[key] ?? []).map((file) => <FileRow key={file.id} file={file} />) : answerText(question, application.answers[key])}
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
