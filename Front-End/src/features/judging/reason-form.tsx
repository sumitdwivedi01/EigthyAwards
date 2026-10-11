"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { messageOf } from "@/lib/api-client";

/**
 * A small inline form for an action that needs a reason (taking an assignment back, removing a
 * conflict): the reason is required, and the API's refusal is shown in place.
 */
export function ReasonForm({
  id,
  label,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  id: string;
  label: string;
  submitLabel: string;
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError("Give a reason, in a few words.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-md border bg-muted/40 p-3">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} autoFocus aria-invalid={error !== null} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
