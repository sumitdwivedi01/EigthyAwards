import type { Prisma } from "../../generated/prisma/client.js";
import { cycleState, type CycleState } from "../awards/views.js";

/** The public face of an award: only what a visitor may see, never people or applications. */

export interface PublicDepartmentView {
  name: string;
  externalOrganiser: boolean;
  colours: { primary: string; accent: string };
  footerText: string;
}

export interface PublicCycleView {
  label: string;
  opensAt: string;
  deadlineAt: string;
  state: CycleState;
  blindJudging: boolean;
  /** Each category's fee in paise: its own, or the cycle's (spec §5.6). 0 is free. */
  categories: { name: string; feePaise: number }[];
  fee: { fromPaise: number; toPaise: number };
  /** The live counter, "499 / 500" (spec §5.20); limit null means no limit. */
  entries: { submitted: number; limit: number | null };
}

export interface PublicAwardCardView {
  slug: string;
  name: string;
  description: string;
  domain: string;
  department: PublicDepartmentView;
  cycle: PublicCycleView;
}

export type PublicAwardView = PublicAwardCardView;

const DEFAULT_COLOURS = { primary: "#1F4FA8", accent: "#F2A900" };

export const publicCycleInclude = {
  categories: { select: { name: true, feePaise: true }, orderBy: { name: "asc" } },
  award: {
    select: {
      name: true,
      description: true,
      site: { select: { slug: true } },
      domain: { select: { name: true } },
      department: {
        select: {
          name: true,
          externalOrganiser: true,
          brandKit: { select: { primaryColour: true, accentColour: true, footerText: true } },
        },
      },
    },
  },
} satisfies Prisma.CycleInclude;

type PublicCycleRecord = Prisma.CycleGetPayload<{ include: typeof publicCycleInclude }>;

function cycleView(cycle: PublicCycleRecord, submitted: number, now: Date): PublicCycleView {
  const categories = cycle.categories.map((c) => ({ name: c.name, feePaise: c.feePaise ?? cycle.feePaise }));
  const fees = categories.length > 0 ? categories.map((c) => c.feePaise) : [cycle.feePaise];
  return {
    label: cycle.label,
    opensAt: cycle.opensAt.toISOString(),
    deadlineAt: cycle.deadlineAt.toISOString(),
    state: cycleState(cycle, now),
    blindJudging: cycle.blindJudging,
    categories,
    fee: { fromPaise: Math.min(...fees), toPaise: Math.max(...fees) },
    entries: { submitted, limit: cycle.maxEntries },
  };
}

export function publicAwardCardView(cycle: PublicCycleRecord, submitted: number, now: Date): PublicAwardCardView {
  const { award } = cycle;
  const kit = award.department.brandKit;
  return {
    slug: award.site?.slug ?? "",
    name: award.name,
    description: award.description,
    domain: award.domain.name,
    department: {
      name: award.department.name,
      externalOrganiser: award.department.externalOrganiser,
      colours: kit ? { primary: kit.primaryColour, accent: kit.accentColour } : DEFAULT_COLOURS,
      footerText: kit?.footerText ?? award.department.name,
    },
    cycle: cycleView(cycle, submitted, now),
  };
}

export const publicAwardView = publicAwardCardView;
