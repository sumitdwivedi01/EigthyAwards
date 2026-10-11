"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { CycleState, PublicAward } from "@/lib/api-types";
import { readableTextOn } from "@/lib/colour";
import { istDateTime, rupees } from "@/lib/format";
import { entriesText, feeText } from "./public-text";

const STATE_TEXT: Record<CycleState, string> = {
  DRAFT: "Not published",
  SCHEDULED: "Opens soon",
  OPEN: "Open for applications",
  CLOSED: "Applications closed",
};

/**
 * An award's public page (spec §5.19, simple in Phase 1): the department's colours, and the
 * dates, categories, fees and entry counter read live from the edition, never copied.
 */
export function PublicAwardPage({ slug }: { slug: string }) {
  const award = useQuery({ queryKey: ["public", "award", slug], queryFn: () => api.get<PublicAward>(`/public/awards/${slug}`) });

  if (award.isPending) return <Frame>Loading…</Frame>;
  if (award.error) {
    const missing = award.error instanceof ApiError && award.error.status === 404;
    return (
      <Frame>
        <div className="grid justify-items-center gap-3">
          <p>{missing ? "We couldn't find this award. It may not be published yet." : messageOf(award.error)}</p>
          <Button asChild variant="outline">
            <Link href="/">See open awards</Link>
          </Button>
        </div>
      </Frame>
    );
  }

  const a = award.data;
  const { primary, accent } = a.department.colours;
  // The department's head picks the colours (ADR 0020); text stays readable on any of them.
  const onPrimary = readableTextOn(primary);
  const open = a.cycle.state === "OPEN";
  return (
    <div className="flex flex-1 flex-col">
      <header style={{ backgroundColor: primary, color: onPrimary }}>
        <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-10">
          <Link href="/" className="flex w-fit items-center gap-2 text-sm opacity-80 hover:opacity-100">
            <AwardIcon className="size-4" aria-hidden />
            Awards Platform
          </Link>
          <p className="text-sm opacity-80">
            {a.department.externalOrganiser ? `Organised by ${a.department.name}` : a.department.name} · {a.domain}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{a.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ backgroundColor: accent, color: readableTextOn(accent) }}>
              {a.cycle.label}: {STATE_TEXT[a.cycle.state]}
            </span>
          </p>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-8 px-4 py-8">
        <p className="max-w-2xl text-lg whitespace-pre-line">{a.description}</p>
        <dl className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <Fact term="Applications open">{istDateTime(a.cycle.opensAt)}</Fact>
          <Fact term="Deadline">{istDateTime(a.cycle.deadlineAt)}</Fact>
          <Fact term="Fee">{feeText(a.cycle.fee)}</Fact>
          <Fact term="Entries">{entriesText(a.cycle.entries)}</Fact>
        </dl>
        {a.cycle.categories.length > 0 && (
          <section aria-labelledby="categories" className="grid gap-3">
            <h2 id="categories" className="text-xl font-semibold">
              Categories
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {a.cycle.categories.map((category) => (
                <li key={category.name} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                  {category.name}
                  <span className="text-muted-foreground">{category.feePaise === 0 ? "Free" : rupees(category.feePaise)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="judging" className="grid gap-2">
          <h2 id="judging" className="text-xl font-semibold">
            How entries are judged
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            After the deadline, jurors from the organiser&apos;s jury list score each application on a set scoring sheet; its
            score is the average of their scores.
            {a.cycle.blindJudging && " Judging is blind: jurors see the answers, never who applied."}
          </p>
        </section>
        {open && (
          <div className="grid gap-3 rounded-xl border p-4" style={{ borderColor: primary }}>
            <p className="text-sm">One application per organisation, from an applicant account.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild style={{ backgroundColor: primary, color: onPrimary }} className="hover:opacity-90">
                <Link href={`/applicant/apply/${a.cycle.id}`}>Apply</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">New here? Create an account</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
      <footer className="border-t">
        <p className="mx-auto w-full max-w-4xl px-4 py-6 text-sm text-muted-foreground">{a.department.footerText}</p>
      </footer>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">{children}</div>;
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
