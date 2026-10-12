"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AwardIcon, CalendarIcon, EyeOffIcon, IndianRupeeIcon, UsersIcon } from "lucide-react";
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
        <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-10 sm:px-6 sm:py-14">
          <Link href="/" className="flex w-fit items-center gap-2 text-sm opacity-85 hover:opacity-100">
            <AwardIcon className="size-4" aria-hidden />
            Awards Platform
          </Link>
          <p className="text-sm font-medium opacity-85">
            {a.department.externalOrganiser ? `Organised by ${a.department.name}` : a.department.name} · {a.domain}
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold sm:text-5xl">{a.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full px-3 py-1 font-semibold" style={{ backgroundColor: accent, color: readableTextOn(accent) }}>
              {a.cycle.label}: {STATE_TEXT[a.cycle.state]}
            </span>
            {a.cycle.blindJudging && (
              <span className="inline-flex items-center gap-1 rounded-full border border-current/30 px-3 py-1 opacity-90">
                <EyeOffIcon className="size-3.5" aria-hidden /> Judged blind
              </span>
            )}
          </p>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-8">
          <p className="max-w-2xl text-lg leading-relaxed whitespace-pre-line">{a.description}</p>
          {a.cycle.categories.length > 0 && (
            <section aria-labelledby="categories" className="grid gap-3">
              <h2 id="categories" className="text-xl font-semibold">
                Entry categories
              </h2>
              <p className="text-sm text-muted-foreground">Your organisation applies in one category and competes with the others in it.</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {a.cycle.categories.map((category) => (
                  <li key={category.name} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-muted-foreground">{category.feePaise === 0 ? "Free" : rupees(category.feePaise)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="judging" className="grid gap-2">
            <h2 id="judging" className="text-xl font-semibold">
              How entries are judged
            </h2>
            <p className="max-w-2xl leading-relaxed text-muted-foreground">
              After the deadline, jurors from the organiser&apos;s jury list score each application on a set scoring sheet. Each juror
              scores alone; the application&apos;s score is the exact average of their scores.
              {a.cycle.blindJudging && " Judging is blind: jurors see the answers, never who applied."}
            </p>
          </section>
        </div>
        <aside className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
          <dl className="grid gap-4 rounded-xl border bg-card p-5 shadow-card">
            <Fact icon={CalendarIcon} term="Applications open">
              {istDateTime(a.cycle.opensAt)}
            </Fact>
            <Fact icon={CalendarIcon} term="Deadline">
              {istDateTime(a.cycle.deadlineAt)}
            </Fact>
            <Fact icon={IndianRupeeIcon} term="Entry fee">
              {feeText(a.cycle.fee)}
            </Fact>
            <Fact icon={UsersIcon} term="Entries">
              {entriesText(a.cycle.entries)}
            </Fact>
          </dl>
          {open ? (
            <div className="grid gap-3 rounded-xl border-2 bg-card p-5" style={{ borderColor: primary }}>
              <p className="font-semibold">Ready to apply?</p>
              <p className="text-sm text-muted-foreground">One application per organisation. Log in with an applicant account, or create one first.</p>
              <Button asChild size="lg" style={{ backgroundColor: primary, color: onPrimary }} className="hover:opacity-90">
                <Link href={`/applicant/apply/${a.cycle.id}`}>Apply for this award</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">New here? Create an account</Link>
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground">{STATE_TEXT[a.cycle.state]}.</p>
          )}
        </aside>
      </main>
      <footer className="border-t bg-card">
        <p className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground sm:px-6">{a.department.footerText}</p>
      </footer>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">{children}</div>;
}

function Fact({ icon: Icon, term, children }: { icon: typeof CalendarIcon; term: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="grid gap-0.5">
        <dt className="text-sm text-muted-foreground">{term}</dt>
        <dd className="font-semibold">{children}</dd>
      </div>
    </div>
  );
}
