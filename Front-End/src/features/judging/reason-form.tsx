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
  destructive,
  onSubmit,
  onCancel,
}: {
  id: string;
  label: string;
  submitLabel: string;
  destructive?: boolean;
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
    <form onSubmit={submit} className="surface grid gap-3 p-4">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} autoFocus aria-invalid={error !== null} />
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
