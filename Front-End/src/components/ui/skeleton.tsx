import { cn } from "cn";

/** A grey placeholder that pulses while something loads. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden {...props} />;
}

export { Skeleton };
