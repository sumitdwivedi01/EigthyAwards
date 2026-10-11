"use client";

import { useId, type ReactNode } from "react";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

export interface FieldControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

/**
 * A label, the control, an optional hint and the error, wired together for screen readers. The
 * hint sits under the label (read before typing); the error sits under the control (seen after).
 */
export function FormField({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Marks the field "(optional)" after its label. */
  optional?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid gap-2" data-slot="form-field">
      <div className="grid gap-0.5">
        <Label htmlFor={id}>
          {label}
          {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
        </Label>
        {hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-destructive" role="alert">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

/** A problem with the whole form (what the API said when it wasn't about one field). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** A quiet confirmation after a save. */
export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-success" role="status">
      <CircleCheckIcon className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** A short line of advice under a control or a group of them. */
export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
