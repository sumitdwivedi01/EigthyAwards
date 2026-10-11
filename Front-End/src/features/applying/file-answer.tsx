"use client";

import { useRef, useState } from "react";
import { DownloadIcon, PaperclipIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, messageOf } from "@/lib/api-client";
import type { Application, FileType, FileView, Question, UploadStart } from "@/lib/api-types";
import type { FieldIds } from "./question-field";
import { downloadFile, fileSize, MAX_FILE_BYTES, uploadFile } from "./use-applying";

const TYPE_NAMES: Record<FileType, string> = { pdf: "PDF", jpg: "JPG", png: "PNG", docx: "Word", xlsx: "Excel" };

/** The content type each file kind is uploaded as; the API checks it against the question and the bytes. */
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function contentTypeOf(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? file.type;
}

/** A file question: its files, and adding or removing them while the application is a draft. */
export function FileAnswer({
  applicationId,
  question,
  files,
  editable,
  ids,
  onUpdated,
}: {
  applicationId: string;
  question: Question;
  files: FileView[];
  editable: boolean;
  ids: FieldIds;
  onUpdated: (application: Application) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const types = question.fileTypes ?? [];
  const maxFiles = question.maxFiles ?? 1;
  const full = files.length >= maxFiles;

  async function add(file: File) {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("A file can be at most 10 MB.");
      return;
    }
    setBusy("upload");
    try {
      const application = await uploadFile(
        () =>
          api.post<UploadStart>(`/applications/${applicationId}/files`, {
            questionKey: question.key,
            fileName: file.name,
            contentType: contentTypeOf(file),
            sizeBytes: file.size,
          }),
        file,
        (fileId) => api.put<Application>(`/applications/${applicationId}/files/${fileId}`, {}),
      );
      onUpdated(application);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(fileId: string) {
    setError(null);
    setBusy(fileId);
    try {
      onUpdated(await api.delete<Application>(`/applications/${applicationId}/files/${fileId}`));
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  async function download(fileId: string) {
    setError(null);
    try {
      await downloadFile(fileId);
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  return (
    <div role="group" aria-labelledby={ids.labelId} aria-describedby={ids.describedBy} className="grid gap-2">
      {files.length === 0 && !editable && <p className="text-sm text-muted-foreground">No files.</p>}
      {files.length > 0 && (
        <ul className="grid gap-1.5">
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden />
              <span className="min-w-0 break-all">{file.fileName}</span>
              <span className="text-xs text-muted-foreground">{fileSize(file.sizeBytes)}</span>
              <span className="ml-auto flex gap-1">
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => void download(file.id)} aria-label={`Download ${file.fileName}`}>
                  <DownloadIcon aria-hidden />
                </Button>
                {editable && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => void remove(file.id)}
                    aria-label={`Remove ${file.fileName}`}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            className="sr-only"
            id={ids.id}
            tabIndex={-1}
            accept={types.map((t) => (t === "jpg" ? ".jpg,.jpeg" : `.${t}`)).join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void add(file);
            }}
          />
          <Button type="button" size="sm" variant="outline" disabled={full || busy !== null} onClick={() => input.current?.click()}>
            <PaperclipIcon aria-hidden />
            {busy === "upload" ? "Uploading…" : "Add a file"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {types.map((t) => TYPE_NAMES[t]).join(", ")} · up to 10 MB each · {full ? "the most files this question takes" : `at most ${maxFiles} ${maxFiles === 1 ? "file" : "files"}`}
          </span>
        </div>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
