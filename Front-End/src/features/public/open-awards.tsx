"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, CalendarIcon, TrophyIcon } from "lucide-react";
import { SectionHeading } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { api } from "@/lib/api-client";
import type { PublicAward } from "@/lib/api-types";
import { readableTextOn } from "@/lib/colour";
import { istDateTime } from "@/lib/format";
import { entriesText, feeText } from "./public-text";

export const OPEN_AWARDS_KEY = ["public", "awards"] as const;

/** Open awards (spec §5.3): every published edition between its opening date and its deadline, as branded cards. */
export function OpenAwards() {
  const awards = useQuery({ queryKey: OPEN_AWARDS_KEY, queryFn: () => api.get<PublicAward[]>("/public/awards") });
  return (
    <section aria-labelledby="open-awards" className="grid gap-5">
      <SectionHeading title={<span id="open-awards">Open for applications</span>} description="Each award is run by its own organiser; open one to read about it and apply." />
      {awards.isPending ? (
        <LoadingState label="Loading the open awards" />
      ) : awards.error ? (
        <ErrorState error={awards.error} onRetry={() => void awards.refetch()} />
      ) : awards.data.length === 0 ? (
        <EmptyState icon={TrophyIcon} title="No award is open right now" description="Awards appear here between their opening date and their deadline." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {awards.data.map((award) => (
            <li key={award.slug}>
              <AwardCard award={award} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AwardCard({ award }: { award: PublicAward }) {
  const { primary, accent } = award.department.colours;
  return (
    <Link href={`/awards/${award.slug}`} className="group grid h-full overflow-hidden rounded-xl border bg-card shadow-card transition-shadow hover:shadow-raised focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
      <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm" style={{ backgroundColor: primary, color: readableTextOn(primary) }}>
        <span className="truncate font-medium opacity-90">{award.department.name}</span>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: accent, color: readableTextOn(accent) }}>
          {award.cycle.label}
        </span>
      </div>
      <div className="grid content-start gap-3 p-5">
        <span className="text-eyebrow">{award.domain}</span>
        <span className="text-lg leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">{award.name}</span>
        <span className="line-clamp-3 text-sm text-muted-foreground">{award.description}</span>
        <dl className="mt-1 grid gap-1.5 text-sm">
          <div className="flex items-start gap-2">
            <CalendarIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <dt className="sr-only">Deadline</dt>
              <dd>Apply by {istDateTime(award.cycle.deadlineAt)}</dd>
            </span>
          </div>
          <div className="flex gap-2 pl-6 text-muted-foreground">
            <dt className="sr-only">Fee and entries</dt>
            <dd>
              {feeText(award.cycle.fee)} · {entriesText(award.cycle.entries)}
            </dd>
          </div>
        </dl>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Read more and apply
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
