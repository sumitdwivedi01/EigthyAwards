"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

/** A big number with a small label: counts on a dashboard or at the top of a list. */
export function Stat({ label, value, hint, tone = "neutral", className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "primary" | "warning" | "success"; className?: string }) {
  const tones = {
    neutral: "text-foreground",
    primary: "text-primary",
    warning: "text-warning",
    success: "text-success",
  };
  return (
    <div className={cn("grid gap-0.5 rounded-xl border bg-card px-4 py-3 shadow-card", className)}>
      <p className={cn("text-2xl font-semibold tabular-nums sm:text-3xl", tones[tone])}>{value}</p>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A heading between groups of cards, with an optional line and actions. */
export function SectionHeading({ title, description, actions, as: Tag = "h2", className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; as?: "h2" | "h3"; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-2", className)}>
      <div className="grid gap-1">
        <Tag className={cn("font-semibold", Tag === "h2" ? "text-xl" : "text-base")}>{title}</Tag>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Label and value pairs: a company's details, an application's facts. */
export function Details({ items, columns = 2, className }: { items: { label: ReactNode; value: ReactNode }[]; columns?: 1 | 2 | 3; className?: string }) {
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" };
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols[columns], className)}>
      {items.map((item, i) => (
        <div key={i} className="grid gap-0.5">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A row in a list: the main text on the left, pills and actions to the right, wrapping on a phone. */
export function ListRow({ children, className, tone }: { children: ReactNode; className?: string; tone?: "default" | "muted" | "selected" }) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3",
        tone === "muted" && "bg-muted/40 text-muted-foreground",
        tone === "selected" && "border-primary/40 bg-primary-soft/50",
        tone === "default" || !tone ? "bg-card" : "",
        className,
      )}
    >
      {children}
    </li>
  );
}

/** A numbered step list used in guidance cards: "1. Add your organisation. 2. …" */
export function NumberedSteps({ steps, className }: { steps: ReactNode[]; className?: string }) {
  return (
    <ol className={cn("grid gap-3", className)}>
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
          <span className="pt-0.5 text-sm leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}
