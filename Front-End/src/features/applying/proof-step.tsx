"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2Icon, CircleAlertIcon, DownloadIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { Application, UploadStart } from "@/lib/api-types";
import { istDate } from "@/lib/format";
import { contentTypeOf } from "./file-answer";
import { downloadFile, MAX_FILE_BYTES, uploadFile } from "./use-applying";

const PROOF_LABELS = { PENDING: "Not checked yet", VERIFIED: "Verified by the award team", REJECTED: "Rejected" } as const;

/**
 * The proof step (spec §5.20): the identity document and LinkedIn link from the profile, given
 * once for every application, and this application's recent proof of employment with the date
 * printed on it. The API checks the date and the file; this step shows what it says.
 */
export function ProofStep({ application, onUpdated }: { application: Application; onUpdated: (application: Application) => void }) {
  const { profile, employmentProof, proof } = application;
  const submitted = application.submittedAt !== null;
  return (
    <div className="grid gap-5">
      {submitted && (
        <div className="grid gap-1 text-sm">
          <p>
            <span className="font-medium">Proof check:</span> {PROOF_LABELS[proof.status]}
            {proof.checkedAt && proof.status !== "PENDING" && <span className="text-muted-foreground"> on {istDate(proof.checkedAt)}</span>}
          </p>
          {proof.status === "REJECTED" && proof.note && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>
                {proof.note}
                {application.canReplaceProof && " Fix it before the deadline: replace the document on My profile, or upload a new proof of employment below."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <section aria-labelledby="profile-proof" className="grid gap-2">
        <h3 id="profile-proof" className="text-sm font-medium">
          From your profile (used for every application)
        </h3>
        <ul className="grid gap-1.5 text-sm">
          <ProfileItem done={profile.identityDocument !== null}>
            Photo identity document{profile.identityDocument && `: ${profile.identityDocument.fileName}`}
          </ProfileItem>
          <ProfileItem done={profile.linkedinUrl !== null}>
            LinkedIn profile{profile.linkedinUrl && `: ${profile.linkedinUrl}`}
          </ProfileItem>
        </ul>
        {(!profile.identityDocument || !profile.linkedinUrl || application.canReplaceProof) && (
          <p className="text-xs text-muted-foreground">
            Add or change them on{" "}
            <Link href="/me" className="underline underline-offset-4">
              My profile
            </Link>
            ; this application uses them from there.
          </p>
        )}
      </section>

      <section aria-labelledby="employment-proof" className="grid gap-2">
        <h3 id="employment-proof" className="text-sm font-medium">
          Recent proof of employment at {application.organisation.legalName}
        </h3>
        <p className="text-xs text-muted-foreground">
          A company ID card, a letter on company letterhead, or a payslip with the salary hidden, dated within the last 3 months.
        </p>
        {employmentProof && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />
            <span className="min-w-0 break-all">{employmentProof.fileName}</span>
            <span className="text-xs text-muted-foreground">dated {istDate(`${employmentProof.documentDate}T00:00:00+05:30`)}</span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => void downloadFile(employmentProof.id)}
              aria-label={`Download ${employmentProof.fileName}`}
            >
              <DownloadIcon aria-hidden />
            </Button>
          </div>
        )}
        {application.canReplaceProof && <ProofUpload application={application} replacing={employmentProof !== null} onUpdated={onUpdated} />}
      </section>
    </div>
  );
}

function ProfileItem({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {done ? (
        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Done" />
      ) : (
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Missing" />
      )}
      <span className="min-w-0 break-all">{children}</span>
    </li>
  );
}

function ProofUpload({
  application,
  replacing,
  onUpdated,
}: {
  application: Application;
  replacing: boolean;
  onUpdated: (application: Application) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<{ date?: string; file?: string; form?: string }>({});

  async function upload() {
    if (!file) {
      setProblems({ file: "Choose the document." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setProblems({ file: "A file can be at most 10 MB." });
      return;
    }
    setBusy(true);
    setProblems({});
    try {
      const updated = await uploadFile(
        () =>
          api.post<UploadStart>(`/applications/${application.id}/employment-proof/uploads`, {
            fileName: file.name,
            contentType: contentTypeOf(file),
            sizeBytes: file.size,
            documentDate: date,
            consent,
          }),
        file,
        (fileId) => api.put<Application>(`/applications/${application.id}/employment-proof`, { fileId }),
      );
      onUpdated(updated);
      setFile(null);
      setDate("");
      setConsent(false);
      if (input.current) input.current.value = "";
    } catch (caught) {
      // The API's messages go next to their fields: the date's rules, the file's type, the consent.
      const byField = caught instanceof ApiError ? caught.fieldErrors : [];
      const next: { date?: string; file?: string; form?: string } = {};
      for (const item of byField) {
        if (item.path === "documentDate") next.date = item.message;
        else if (item.path === "contentType" || item.path === "fileId" || item.path === "sizeBytes") next.file = item.message;
        else next.form = [next.form, item.message].filter(Boolean).join(" ");
      }
      if (byField.length === 0) next.form = messageOf(caught);
      setProblems(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">{replacing ? "Upload a new proof" : "Upload the proof"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="proof-date">Date on the document</Label>
          <Input id="proof-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(problems.date)} />
          {problems.date && (
            <p className="text-xs text-destructive" role="alert">
              {problems.date}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="proof-file">Document (PDF, JPG or PNG, up to 10 MB)</Label>
          <Input
            ref={input}
            id="proof-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            aria-invalid={Boolean(problems.file)}
          />
          {problems.file && (
            <p className="text-xs text-destructive" role="alert">
              {problems.file}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="proof-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" />
        <Label htmlFor="proof-consent" className="text-sm leading-snug font-normal">
          I agree that the platform keeps this document to confirm that I work for {application.organisation.legalName}. Only
          this award&apos;s team sees it, never the jury. It is deleted 12 months after the award&apos;s results.
        </Label>
      </div>
      {problems.form && (
        <p className="text-sm text-destructive" role="alert">
          {problems.form}
        </p>
      )}
      <div>
        <Button type="button" onClick={() => void upload()} disabled={busy}>
          {busy ? "Uploading…" : "Upload proof"}
        </Button>
      </div>
    </div>
  );
}
