"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/features/auth/use-me";
import type { Me, Role } from "@/lib/api-types";
import { AREA_ROUTES } from "@/lib/areas";

/** /home: sends the person to the area the API chose for them. */
export function HomeRedirect() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me.data) router.replace(AREA_ROUTES[me.data.home].href);
  }, [me.data, router]);
  return <p className="text-sm text-muted-foreground">Loading…</p>;
}

function scopesOf(me: Me, role: Role): string[] {
  return me.roles
    .filter((r) => r.role === role)
    .map((r) => r.department?.name ?? r.award?.name ?? (r.cycle ? `${r.cycle.awardName} ${r.cycle.label}` : ""))
    .filter(Boolean);
}

function ComingNext({ step, children }: { step: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coming next</CardTitle>
        <CardDescription>{step}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function ScopeList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Check({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2Icon className="size-4 text-emerald-600" aria-label="Done" />
      ) : (
        <CircleIcon className="size-4 text-muted-foreground" aria-label="To do" />
      )}
      {children}
    </li>
  );
}

export function ApplicantHome() {
  return (
    <AreaPage area="applicant">
      {(me) => (
        <>
          <PageTitle title="Applying" description="Apply for awards on behalf of your organisation." />
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Before you apply</CardTitle>
                <CardDescription>You do these once; every application in every award reuses them.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ul className="grid gap-2 text-sm">
                  <Check done={me.organisations.length > 0}>
                    Your organisation{me.organisations.length > 0 && `: ${me.organisations.map((o) => o.legalName).join(", ")}`}
                  </Check>
                  <Check done={me.identityDocument !== null}>A photo identity document on your profile</Check>
                  <Check done={me.linkedinUrl !== null}>Your LinkedIn profile link</Check>
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant={me.organisations.length > 0 ? "outline" : "default"}>
                    <Link href="/applicant/organisation">My organisation</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/me">My profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <ComingNext step="Step 1.3 (12 Oct)">
              Open awards, starting an application (one per organisation), the form with autosave, a recent proof of
              employment, and submitting.
            </ComingNext>
          </div>
        </>
      )}
    </AreaPage>
  );
}

export function StaffHome() {
  return (
    <AreaPage area="staff">
      {(me) => (
        <>
          <PageTitle title="Staff" description="Set up and run your awards." />
          <div className="grid gap-6 md:grid-cols-2">
            <ScopeList
              title="Your departments"
              items={scopesOf(me, "DEPT_STAFF")}
              empty="You aren't on a department's staff yet."
            />
            <ScopeList title="Your awards" items={scopesOf(me, "AWARD_STAFF")} empty="No awards yet: you create them here in Step 1.2." />
            <ComingNext step="Step 1.2 (11 Oct)">
              Create an award, set its dates, fee, categories and entry limit, build its questions and scoring sheet, fill in
              its branded page, and publish it.
            </ComingNext>
          </div>
        </>
      )}
    </AreaPage>
  );
}

export function DepartmentHome() {
  return (
    <AreaPage area="department">
      {(me) => (
        <>
          <PageTitle title="Department" description="Your department's awards, jury and approvals." />
          <div className="grid gap-6 md:grid-cols-2">
            <ScopeList title="Departments you head" items={scopesOf(me, "DEPT_HEAD")} empty="None." />
            <ComingNext step="Step 1.4 (13 Oct)">
              Adding jury to an award&apos;s pool, recording conflicts of interest, and approving a round&apos;s results.
            </ComingNext>
          </div>
        </>
      )}
    </AreaPage>
  );
}

export function JuryHome() {
  return (
    <AreaPage area="jury">
      {(me) => (
        <>
          <PageTitle title="Jury" description="The applications assigned to you." />
          <div className="grid gap-6 md:grid-cols-2">
            <ScopeList title="Awards you judge" items={scopesOf(me, "JURY")} empty="None yet." />
            <ComingNext step="Step 1.4 (13 Oct)">Your assignments and the scoring screen.</ComingNext>
          </div>
        </>
      )}
    </AreaPage>
  );
}

export function LeaderHome() {
  return (
    <AreaPage area="leader">
      {() => (
        <>
          <PageTitle title="Leader" description="One view across every award and department." />
          <ComingNext step="Step 1.4 (13 Oct)">
            The dashboard: applications by status, judging progress, rounds waiting for approval and upcoming deadlines,
            across every department. It is read-only: the leader never changes judging data.
          </ComingNext>
        </>
      )}
    </AreaPage>
  );
}
