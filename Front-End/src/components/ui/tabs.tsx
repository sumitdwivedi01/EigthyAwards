"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";

/**
 * Tabs that read like a row of labelled sections. `line` (the default) underlines the open one;
 * `pills` groups them in a tray. Both wrap on a phone instead of scrolling sideways.
 */
function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} className={cn("group/tabs flex gap-4 data-horizontal:flex-col", className)} {...props} />;
}

const tabsListVariants = cva("group/tabs-list flex w-full flex-wrap items-center text-muted-foreground group-data-vertical/tabs:flex-col", {
  variants: {
    variant: {
      line: "gap-1 border-b",
      pills: "w-fit gap-1 rounded-lg bg-muted p-1",
    },
  },
  defaultVariants: {
    variant: "line",
  },
});

function TabsList({ className, variant = "line", ...props }: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({ variant }), className)} {...props} />;
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-11 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Line tabs: an underline that sits on the list's border.
        "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:rounded-b-none group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:hover:bg-muted/60 group-data-[variant=line]/tabs-list:data-active:border-b-primary",
        // Pills: the open one is a white card.
        "group-data-[variant=pills]/tabs-list:h-9 group-data-[variant=pills]/tabs-list:data-active:bg-card group-data-[variant=pills]/tabs-list:data-active:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
