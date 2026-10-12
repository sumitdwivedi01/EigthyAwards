"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "cn";

export interface StepItem {
  key: string;
  title: string;
  /** A short state under the title: "3 / 5 answered", "added". */
  detail?: string;
  done?: boolean;
}

/**
 * The steps of a long task (the application form), each one clickable. A numbered column on a
 * wide screen, a row of chips on a phone, so the person always knows where they are and what is
 * left.
 */
export function Stepper({ steps, current, onSelect, className }: { steps: StepItem[]; current: string; onSelect: (key: string) => void; className?: string }) {
  return (
    <nav aria-label="Steps" className={className}>
      <ol className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        {steps.map((step, i) => {
          const active = step.key === current;
          return (
            <li key={step.key} className="shrink-0 md:shrink">
              <button
                type="button"
                onClick={() => onSelect(step.key)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  active ? "border-primary/40 bg-primary-soft/60" : "border-transparent hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                    step.done ? "bg-success text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? <CheckIcon className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="grid min-w-0 leading-tight">
                  <span className={cn("truncate text-sm font-semibold", active ? "text-foreground" : "text-foreground/85")}>{step.title}</span>
                  {step.detail && <span className="truncate text-xs text-muted-foreground">{step.detail}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
