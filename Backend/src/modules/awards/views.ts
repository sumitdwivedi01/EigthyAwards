import type { CycleStatus, Prisma, RoundType } from "../../generated/prisma/client.js";

/**
 * Where an edition stands, worked out from its status and the clock (spec §4): a draft; published
 * but not open yet; open for applications; or past its deadline.
 */
export type CycleState = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED";

export function cycleState(cycle: { status: CycleStatus; opensAt: Date; deadlineAt: Date }, now: Date): CycleState {
  if (cycle.status === "DRAFT") return "DRAFT";
  if (now >= cycle.deadlineAt) return "CLOSED";
  return now >= cycle.opensAt ? "OPEN" : "SCHEDULED";
}

/**
 * Why a new edition can't start yet, or null (ADR 0021): an award runs one edition at a time. An
 * edition is finished once its results are published, or once its deadline passed with nothing
 * submitted (there is nothing to judge). A draft is still being set up.
 */
export function newEditionBlocker(
  editions: readonly { label: string; status: CycleStatus; deadlineAt: Date; submitted: number }[],
  now: Date,
): string | null {
  const running = editions.find(
    (e) => e.status !== "RESULTS_PUBLISHED" && !(e.status !== "DRAFT" && now >= e.deadlineAt && e.submitted === 0),
  );
  if (!running) return null;
  return running.status === "DRAFT"
    ? `The ${running.label} edition is still being set up. An award runs one edition at a time: finish and publish that one first.`
    : `The ${running.label} edition is still running. An award runs one edition at a time: the next one can start once its results are published.`;
}

export interface CycleSummaryView {
  id: string;
  label: string;
  status: CycleStatus;
  state: CycleState;
  opensAt: string;
  deadlineAt: string;
  /** The edition's (first) judging round: its assignment board and judging live there. */
  roundId: string | null;
}

export interface AwardView {
  id: string;
  name: string;
  description: string;
  department: { id: string; name: string };
  domain: { id: string; name: string };
  siteSlug: string | null;
  cycles: CycleSummaryView[];
  /** Why a new edition can't start yet (one edition at a time, ADR 0021), or null. */
  newEditionBlockedReason: string | null;
}

// A type, not an interface, so it also fits where plain JSON is expected (the audit history).
export type ResultLabelView = {
  label: string;
  advances: boolean;
};

export interface CycleSetupView {
  id: string;
  label: string;
  status: CycleStatus;
  state: CycleState;
  opensAt: string;
  deadlineAt: string;
  publishedAt: string | null;
  feePaise: number;
  blindJudging: boolean;
  maxEntries: number | null;
  award: { id: string; name: string; department: { id: string; name: string }; siteSlug: string | null };
  categories: { id: string; name: string; feePaise: number | null }[];
  round: {
    id: string;
    number: number;
    type: RoundType;
    juryMin: number;
    juryMax: number;
    resultLabels: ResultLabelView[];
    /** People on the department's jury list: the most jurors an application can get (ADR 0013, 0017). */
    juryAvailable: number;
  };
  /** What still stops publishing; empty when it can be published. */
  publishIssues: string[];
  /** Once published, the fee, blind judging, dates and categories are fixed (spec §5.3); the entry limit may still change. */
  settingsFixed: boolean;
}

export const awardInclude = {
  department: { select: { id: true, name: true } },
  domain: { select: { id: true, name: true } },
  site: { select: { slug: true } },
  cycles: {
    select: {
      id: true,
      label: true,
      status: true,
      opensAt: true,
      deadlineAt: true,
      rounds: { select: { id: true }, orderBy: { number: "asc" }, take: 1 },
      _count: { select: { applications: { where: { status: "SUBMITTED" } } } },
    },
    orderBy: { opensAt: "desc" },
  },
} satisfies Prisma.AwardInclude;

type AwardRecord = Prisma.AwardGetPayload<{ include: typeof awardInclude }>;

export function awardView(award: AwardRecord, now: Date): AwardView {
  return {
    id: award.id,
    name: award.name,
    description: award.description,
    department: award.department,
    domain: award.domain,
    siteSlug: award.site?.slug ?? null,
    cycles: award.cycles.map((cycle) => ({
      id: cycle.id,
      label: cycle.label,
      status: cycle.status,
      state: cycleState(cycle, now),
      opensAt: cycle.opensAt.toISOString(),
      deadlineAt: cycle.deadlineAt.toISOString(),
      roundId: cycle.rounds[0]?.id ?? null,
    })),
    newEditionBlockedReason: newEditionBlocker(
      award.cycles.map((c) => ({ label: c.label, status: c.status, deadlineAt: c.deadlineAt, submitted: c._count.applications })),
      now,
    ),
  };
}

export const cycleSetupInclude = {
  award: {
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      site: { select: { slug: true } },
    },
  },
  categories: { select: { id: true, name: true, feePaise: true }, orderBy: { name: "asc" } },
  rounds: {
    select: { id: true, number: true, type: true, juryMin: true, juryMax: true, resultLabels: true },
    orderBy: { number: "asc" },
  },
} satisfies Prisma.CycleInclude;

export type CycleSetupRecord = Prisma.CycleGetPayload<{ include: typeof cycleSetupInclude }>;
