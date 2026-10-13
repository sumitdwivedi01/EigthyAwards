"use client";

import type { ReactNode } from "react";
import { CircleAlertIcon, InboxIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { messageOf } from "@/lib/api-client";

/** While something loads: grey lines in the shape of what will appear, never a blank page. */
export function LoadingState({ label = "Loading…", lines = 3, className }: { label?: string; lines?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** When something failed: what went wrong, in plain words, and a way to try again. */
export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-3 text-destructive", className)} role="alert">
      <CircleAlertIcon className="size-5 shrink-0" aria-hidden />
      <p className="flex-1 text-sm font-medium">{messageOf(error)}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** When a list is empty: say so kindly, say why, and offer the next step. */
export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon?: typeof InboxIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** A smaller version for inside a card. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-2 rounded-lg border border-dashed px-4 text-center", compact ? "py-6" : "py-10", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
