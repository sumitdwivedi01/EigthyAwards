"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ArrowRightIcon, Building2Icon, CircleCheckIcon, CircleIcon, ScaleIcon } from "lucide-react";
import { NumberedSteps } from "@/components/layout/blocks";
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
  return <p className="text-muted-foreground">Loading…</p>;
}

/** A platform account with no role yet: usually a juror before a head adds them to a jury list. */
function NothingAssignedYet() {
  return (
    <>
      <PageTitle title="Welcome" description="Your account is ready." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Nothing is assigned to you yet</CardTitle>
          <CardDescription>When a department head adds you to their staff or jury, or gives you a role, your work appears here. You can set up your profile meanwhile.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/me">My profile</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(me: Me): string {
  return me.name.split(" ")[0] ?? me.name;
}

function scopesOf(me: Me, role: Role): string[] {
  return me.roles
    .filter((r) => r.role === role)
    .map((r) => r.department?.name ?? r.award?.name ?? "")
    .filter(Boolean);
}

function ScopeList({ title, description, items, empty }: { title: string; description?: string; items: string[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="grid gap-2">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2 font-medium">
                <Building2Icon className="size-4 text-muted-foreground" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Check({ done, children, href }: { done: boolean; children: ReactNode; href: string }) {
  return (
    <li className="flex items-center gap-3">
      {done ? <CircleCheckIcon className="size-5 shrink-0 text-success" aria-label="Done" /> : <CircleIcon className="size-5 shrink-0 text-muted-foreground/60" aria-label="To do" />}
      <span className={done ? "text-muted-foreground" : "font-medium"}>{children}</span>
      {!done && (
        <Link href={href} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Add <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      )}
    </li>
  );
}

export function ApplicantHome() {
  return (
    <AreaPage area="applicant">
      {(me) => {
        const ready = me.organisations.length > 0 && me.identityDocument !== null && me.linkedinUrl !== null;
        return (
          <>
            <PageTitle
              eyebrow={`${greeting()}, ${firstName(me)}`}
              title="Applying"
              description="Apply for awards on behalf of your organisation. Everything you fill in is saved as you go."
            />
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="grid content-start gap-6">
                <MyApplications />
                <OpenAwardsToApply />
              </div>
              <Card className={ready ? "" : "border-primary/30"}>
                <CardHeader>
                  <CardTitle>Before you apply</CardTitle>
                  <CardDescription>Three things, done once. Every application in every award reuses them.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <ul className="grid gap-3">
                    <Check done={me.organisations.length > 0} href="/applicant/organisation">
                      Your organisation{me.organisations.length > 0 && `: ${me.organisations.map((o) => o.legalName).join(", ")}`}
                    </Check>
                    <Check done={me.identityDocument !== null} href="/me?tab=proof">
                      A photo identity document
                    </Check>
                    <Check done={me.linkedinUrl !== null} href="/me?tab=proof">
                      Your LinkedIn profile link
                    </Check>
                  </ul>
                  {ready ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-success">
                      <CircleCheckIcon className="size-4" aria-hidden /> All set: pick an award and apply.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">You can start an application now and add these before you submit.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        );
      }}
    </AreaPage>
  );
}

export function StaffHome() {
  return (
    <AreaPage area="staff">
      {(me) => (
        <>
          <PageTitle eyebrow={`${greeting()}, ${firstName(me)}`} title="Your awards" description="Set up each award's edition on screen, check the applications, and run the judging." />
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <MyAwards canCreate={scopesOf(me, "DEPT_STAFF").length > 0} />
            <div className="grid content-start gap-6">
              <ScopeList title="Your departments" items={scopesOf(me, "DEPT_STAFF")} empty="You aren't on a department's staff yet." />
              <Card>
                <CardHeader>
                  <CardTitle>How an award runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <NumberedSteps
                    steps={[
                      "Create the award and set up its edition: dates, fee, categories, questions and the scoring sheet. Publish it.",
                      "Applicants submit before the deadline. Check each one's proof of employment.",
                      "After the deadline, open Judging on the edition: assign each application to jury, follow their scores, and send the round to your department head.",
                      "Once approved, give the results and publish them. Applicants see theirs at once.",
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </AreaPage>
  );
}

export function DepartmentHome() {
  return (
    <AreaPage area="department">
      {(me) => {
        const departments = me.roles.filter((r) => r.role === "DEPT_HEAD" && r.department);
        return (
          <>
            <PageTitle eyebrow={`${greeting()}, ${firstName(me)}`} title="Your department" description="Your people, how your award pages look, and the rounds waiting for your approval." />
            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{departments.length === 1 ? "Department you head" : "Departments you head"}</CardTitle>
                    <CardDescription>Add your staff and jury (each gets a temporary password to start with) and choose how your award pages look.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {departments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">You don&apos;t head a department yet.</p>
                    ) : (
                      <ul className="grid gap-2">
                        {departments.map((r) => (
                          <li key={r.department?.id} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                            <span className="flex items-center gap-2 font-medium">
                              <Building2Icon className="size-4 text-muted-foreground" aria-hidden />
                              {r.department?.name}
                            </span>
                            <Button asChild size="sm">
                              <Link href={`/department/${r.department?.id}`}>Manage</Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <ApprovalQueueCard />
              </div>
              <Dashboard roundHref={(roundId) => `/department/rounds/${roundId}`} />
            </div>
          </>
        );
      }}
    </AreaPage>
  );
}

export function JuryHome() {
  return (
    <AreaPage area="jury">
      {(me) => (
        <>
          <PageTitle eyebrow={`${greeting()}, ${firstName(me)}`} title="Your assignments" description="The applications assigned to you. Score each one on its own; your marks save as you go." />
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <JuryAssignments />
            <div className="grid content-start gap-6">
              <ScopeList title="Departments you judge for" items={scopesOf(me, "JURY")} empty="None yet." />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScaleIcon className="size-5 text-muted-foreground" aria-hidden />
                    How scoring works
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <NumberedSteps
                    steps={[
                      "Open an application and read its answers.",
                      "Mark each indicator from 0 to 10 (or Yes / No). Your marks save by themselves.",
                      "Write a short overall note and submit. After that, your marks are final.",
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </AreaPage>
  );
}

export function LeaderHome() {
  return (
    <AreaPage area="leader">
      {(me) => (
        <>
          <PageTitle
            eyebrow={`${greeting()}, ${firstName(me)}`}
            title="Across the platform"
            description="Every department and award at a glance. Departments run themselves; you create them and watch."
            actions={
              <Button asChild>
                <Link href="/leader/departments">Departments</Link>
              </Button>
            }
          />
          <Dashboard roundHref={(roundId) => `/leader/rounds/${roundId}`} />
        </>
      )}
    </AreaPage>
  );
}
