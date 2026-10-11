"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, messageOf } from "@/lib/api-client";
import type { PublicAward } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { entriesText, feeText } from "./public-text";

export const OPEN_AWARDS_KEY = ["public", "awards"] as const;

/** Open awards (spec §5.3): every published edition between its opening date and its deadline. */
export function OpenAwards() {
  const awards = useQuery({ queryKey: OPEN_AWARDS_KEY, queryFn: () => api.get<PublicAward[]>("/public/awards") });
  return (
    <section aria-labelledby="open-awards" className="grid gap-4">
      <h2 id="open-awards" className="text-xl font-semibold">
        Open awards
      </h2>
      {awards.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : awards.error ? (
        <p className="text-sm text-destructive">{messageOf(awards.error)}</p>
      ) : awards.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No award is open for applications right now.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {awards.data.map((award) => (
            <li key={award.slug}>
              <Link
                href={`/awards/${award.slug}`}
                className="grid h-full gap-2 rounded-xl border border-t-4 bg-card p-4 transition-colors hover:bg-muted/50"
                style={{ borderTopColor: award.department.colours.primary }}
              >
                <span className="text-xs text-muted-foreground">
                  {award.department.name} · {award.domain}
                </span>
                <span className="text-lg font-semibold">
                  {award.name} {award.cycle.label}
                </span>
                <span className="line-clamp-2 text-sm text-muted-foreground">{award.description}</span>
                <span className="text-sm">Apply by {istDateTime(award.cycle.deadlineAt)}</span>
                <span className="text-sm text-muted-foreground">
                  {feeText(award.cycle.fee)} · {entriesText(award.cycle.entries)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
