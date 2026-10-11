"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MyApplications, OpenAwardsToApply } from "@/features/applying/my-applications";
import { MyAwards } from "@/features/awards/my-awards";
import { useMe } from "@/features/auth/use-me";
import { ApprovalQueueCard, Dashboard } from "@/features/judging/dashboard";
import { JuryAssignments } from "@/features/judging/jury-assignments";
import type { Me, Role } from "@/lib/api-types";
import { AREA_ROUTES } from "@/lib/areas";

/** /home: sends the person to the area the API chose for them, once they have one. */
export function HomeRedirect() {
  const me = useMe();
  const router = useRouter();
  const home = me.data?.home;
  useEffect(() => {
    if (home) router.replace(AREA_ROUTES[home].href);
  }, [home, router]);
  if (me.data && !home) return <NothingAssignedYet />;
  return <p className="text-sm text-muted-foreground">Loading…</p>;
}

/** A platform account with no role yet: usually a juror before an award's staff add them to its jury. */
function NothingAssignedYet() {
  return (
    <>
      <PageTitle title="Welcome" description="Your account is ready." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Nothing is assigned to you yet</CardTitle>
          <CardDescription>
            When an award&apos;s staff add you to its jury, or give you a role, your work appears here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/me">My profile</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function scopesOf(me: Me, role: Role): string[] {
  return me.roles
    .filter((r) => r.role === role)
    .map((r) => r.department?.name ?? r.award?.name ?? "")
    .filter(Boolean);
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
            <MyApplications />
            <OpenAwardsToApply />
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
            <MyAwards canCreate={scopesOf(me, "DEPT_STAFF").length > 0} />
            <ScopeList
              title="Your departments"
              items={scopesOf(me, "DEPT_STAFF")}
              empty="You aren't on a department's staff yet."
            />
            <Card>
              <CardHeader>
                <CardTitle>Judging</CardTitle>
                <CardDescription>
                  After an edition&apos;s deadline, open the award and choose Judging on the edition: assign each application to
                  jury from the department&apos;s list, follow the scores, send the round for approval, then give and publish the
                  results.
                </CardDescription>
              </CardHeader>
            </Card>
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
          <PageTitle title="Department" description="Your department's people, awards and approvals." />
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Departments you head</CardTitle>
                <CardDescription>
                  You run each one: add your staff and jury (they get a temporary password to start with) and choose how its
                  award pages look.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {me.roles
                    .filter((r) => r.role === "DEPT_HEAD" && r.department)
                    .map((r) => (
                      <li key={r.department?.id} className="flex items-center justify-between gap-3 text-sm">
                        {r.department?.name}
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/department/${r.department?.id}`}>Open</Link>
                        </Button>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
            <ApprovalQueueCard />
            <Dashboard roundHref={(roundId) => `/department/rounds/${roundId}`} />
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
            <ScopeList title="Departments you judge for" items={scopesOf(me, "JURY")} empty="None yet." />
            <JuryAssignments />
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
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Departments</CardTitle>
                <CardDescription>
                  Create a department with its head. Each department then runs itself; you can see its people, theme and award
                  pages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link href="/leader/departments">Open departments</Link>
                </Button>
              </CardContent>
            </Card>
            <Dashboard roundHref={(roundId) => `/leader/rounds/${roundId}`} />
          </div>
        </>
      )}
    </AreaPage>
  );
}
