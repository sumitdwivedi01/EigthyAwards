"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * A radio choice drawn as a whole clickable card rather than a small dot: easy to read and to
 * hit. Group several in a `fieldset` with a `legend`.
 */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  disabled,
  title,
  detail,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-xs transition-colors has-checked:border-primary has-checked:bg-primary-soft/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/30 has-disabled:cursor-not-allowed has-disabled:opacity-60 hover:bg-muted/50 has-checked:hover:bg-primary-soft/80",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} className="mt-1 size-4.5 shrink-0 accent-primary" />
      <span className="grid gap-0.5">
        <span className="font-medium">{title}</span>
        {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
      </span>
    </label>
  );
}
