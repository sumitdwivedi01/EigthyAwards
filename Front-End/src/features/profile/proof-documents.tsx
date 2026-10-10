"use client";

import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { FileCheck2Icon } from "lucide-react";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ME_KEY } from "@/features/auth/use-me";
import { api, messageOf, uploadToLink } from "@/lib/api-client";
import type { IdentityUpload, Me } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { showApiErrors } from "@/lib/forms";

/** Only a hint for the file picker; the API checks the type, the size and the content. */
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"] as const;

/**
 * The applicant's proof, given once and reused for every application (§5.20, ADR 0012):
 * the LinkedIn link and a photo identity document. Each application adds its own recent proof of
 * employment (Step 1.3).
 */
export function ProofDocuments({ me }: { me: Me }) {
  return (
    <div className="grid gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        You give these once. Every application you make, for any award, uses them, and each award&apos;s team checks
        them. Jury members never see them.
      </p>
      <LinkedinCard me={me} />
      <IdentityDocumentCard me={me} />
    </div>
  );
}

const linkedinSchema = z.object({ url: z.string().trim() });
type LinkedinValues = z.infer<typeof linkedinSchema>;

function LinkedinCard({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<LinkedinValues>({ resolver: zodResolver(linkedinSchema), defaultValues: { url: me.linkedinUrl ?? "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ url }: LinkedinValues) {
    setNotice(null);
    try {
      const updated = await api.put<Me>("/me/linkedin", { url: url || null });
      queryClient.setQueryData(ME_KEY, updated);
      form.reset({ url: updated.linkedinUrl ?? "" });
      setNotice(updated.linkedinUrl ? "Saved." : "Removed.");
    } catch (error) {
      showApiErrors(error, form.setError, ["url"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LinkedIn profile</CardTitle>
        <CardDescription>A link to your own LinkedIn profile, so the award team can see where you work.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Profile link" hint="For example https://www.linkedin.com/in/your-name" error={errors.url?.message}>
            {(control) => <Input {...control} type="url" inputMode="url" {...form.register("url")} />}
          </FormField>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              Save link
            </Button>
            <FormNotice message={notice} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function IdentityDocumentCard({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!file) return setError("Choose a file first.");
    if (!consent) return setError("Please agree to the platform keeping this document.");
    setBusy(true);
    try {
      // 1. The API records the file and issues a short-lived upload link. 2. The file goes straight
      // to storage. 3. The API checks it and puts it on your profile.
      const started = await api.post<IdentityUpload>("/me/identity-document/uploads", {
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        consent: true,
      });
      await uploadToLink(started.upload, file);
      const updated = await api.put<Me>("/me/identity-document", { fileId: started.fileId });
      queryClient.setQueryData(ME_KEY, updated);
      setFile(null);
      setConsent(false);
      (event.target as HTMLFormElement).reset();
      setNotice("Your identity document is on your profile.");
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo identity document</CardTitle>
        <CardDescription>
          Your PAN card, passport, driving licence, voter ID, or a masked Aadhaar (only the last four digits showing).
          Never upload a full Aadhaar number.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {me.identityDocument ? (
          <p className="flex items-center gap-2 text-sm">
            <FileCheck2Icon className="size-4 text-emerald-600" aria-hidden />
            <span>
              <span className="font-medium">{me.identityDocument.fileName}</span>, added{" "}
              {istDateTime(me.identityDocument.uploadedAt)}. Upload a new one to replace it.
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No identity document yet. You need one before you submit an application.</p>
        )}
        <form onSubmit={onSubmit} className="grid max-w-xl gap-4" noValidate>
          <FormError message={error ?? undefined} />
          <FormField label="File" hint="PDF, JPG or PNG, up to 10 MB.">
            {(control) => (
              <Input
                {...control}
                type="file"
                accept={ACCEPTED.join(",")}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            )}
          </FormField>
          <div className="flex items-start gap-2">
            <Checkbox id="identity-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} />
            <Label htmlFor="identity-consent" className="text-sm leading-snug font-normal">
              I agree that the platform keeps this document to confirm who I am when I apply. Only the teams of the awards I
              apply to see it, never the jury. It is deleted 12 months after the results of the last award that used it.
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Uploading…" : me.identityDocument ? "Replace document" : "Upload document"}
            </Button>
            <FormNotice message={notice} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
