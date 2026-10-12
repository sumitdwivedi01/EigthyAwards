import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * Status pills. Soft tints rather than solid blocks, so a row full of them stays calm; the
 * meaning comes from the colour family (green done, amber waiting, red attention, blue in hand)
 * and always from the words too.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-primary-soft text-primary",
        secondary: "border-transparent bg-muted text-foreground/80",
        success: "border-success/15 bg-success-soft text-success",
        warning: "border-warning/20 bg-warning-soft text-warning",
        info: "border-info/15 bg-info-soft text-info",
        destructive: "border-destructive/15 bg-destructive-soft text-destructive",
        outline: "border-border bg-card text-foreground/80",
        solid: "border-transparent bg-primary text-primary-foreground",
        ghost: "border-transparent hover:bg-muted",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
