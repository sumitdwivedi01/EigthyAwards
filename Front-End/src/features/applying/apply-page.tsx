"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { Application, ApplyInfo } from "@/lib/api-types";
import { istDateTime, rupees } from "@/lib/format";
import { applicationKey, MY_APPLICATIONS_KEY, useApplyInfo } from "./use-applying";

/**
 * Starting an application (spec §5.2, §5.6): the edition, its categories and fees, and the
 * applicant's organisation. If the organisation already has one, the page says so with its status
 * only (ADR 0011); the API makes the decision either way.
 */
export function ApplyPage({ cycleId }: { cycleId: string }) {
  return <AreaPage area="applicant">{() => <Apply cycleId={cycleId} />}</AreaPage>;
}

function Apply({ cycleId }: { cycleId: string }) {
  const info = useApplyInfo(cycleId);
  if (info.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (info.error) return <p className="text-sm text-destructive">{messageOf(info.error)}</p>;
  return <ApplyLoaded info={info.data} />;
}

function feeText(paise: number): string {
  return paise === 0 ? "free" : rupees(paise);
}

function ApplyLoaded({ info }: { info: ApplyInfo }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(info.categories.length === 1 ? (info.categories[0]?.id ?? "") : "");
  const free = info.organisations.filter((o) => o.existing === null);
  const [organisationId, setOrganisationId] = useState(free.length === 1 ? (free[0]?.id ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setProblem(null);
    try {
      const application = await api.post<Application>(`/cycles/${info.cycle.id}/applications`, {
        categoryId,
        ...(organisationId && { organisationId }),
      });
      queryClient.setQueryData(applicationKey(application.id), application);
      await queryClient.invalidateQueries({ queryKey: MY_APPLICATIONS_KEY });
      router.push(`/applicant/applications/${application.id}`);
    } catch (error) {
      setProblem(error instanceof ApiError && error.fieldErrors.length > 0 ? error.fieldErrors.map((f) => f.message).join(" ") : messageOf(error));
      setBusy(false);
    }
  }

  const entries = info.entries.limit === null ? `${info.entries.submitted} submitted so far` : `${info.entries.submitted} / ${info.entries.limit} entries submitted`;
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/applicant" className="text-muted-foreground underline underline-offset-4">
          Applying
        </Link>
      </p>
      <PageTitle title={`${info.award.name} ${info.cycle.label}`} description={`${info.award.department} · ${entries}`} />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>About this award</CardTitle>
            <CardDescription>
              Applications from {istDateTime(info.cycle.opensAt)} to {istDateTime(info.cycle.deadlineAt)}.
              {info.cycle.blindJudging && " Judging is blind: the jury never sees who applied."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p className="whitespace-pre-line">{info.award.description}</p>
            {info.award.slug && (
              <Link href={`/awards/${info.award.slug}`} className="underline underline-offset-4">
                The award&apos;s page
              </Link>
            )}
          </CardContent>
        </Card>

        {info.organisations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Add your organisation first</CardTitle>
              <CardDescription>The award goes to an organisation: register yours, or join it if it is already here.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/applicant/organisation">My organisation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Start your application</CardTitle>
              <CardDescription>One application per organisation for this award. It saves as you go; you can come back any time.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              {info.organisations.some((o) => o.existing) && (
                <ul className="grid gap-2 text-sm">
                  {info.organisations
                    .filter((o) => o.existing)
                    .map((o) => (
                      <li key={o.id} className="rounded-md border px-3 py-2">
                        {o.existing?.mine && o.existing.applicationId ? (
                          <>
                            You already started {o.legalName}&apos;s application ({o.existing.status.label}).{" "}
                            <Link href={`/applicant/applications/${o.existing.applicationId}`} className="underline underline-offset-4">
                              Open it
                            </Link>
                          </>
                        ) : (
                          <>
                            {o.legalName} already has an application for this award ({o.existing?.status.label}), started by a
                            colleague.
                          </>
                        )}
                      </li>
                    ))}
                </ul>
              )}
              {free.length > 0 && info.cycle.open && (
                <>
                  {info.organisations.length > 1 && (
                    <fieldset className="grid gap-2">
                      <legend className="mb-1 text-sm font-medium">Organisation</legend>
                      {free.map((o) => (
                        <label key={o.id} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="organisation" className="size-4 accent-primary" checked={organisationId === o.id} onChange={() => setOrganisationId(o.id)} />
                          {o.legalName}
                        </label>
                      ))}
                    </fieldset>
                  )}
                  <fieldset className="grid gap-2">
                    <legend className="mb-1 text-sm font-medium">Entry category</legend>
                    {info.categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="category" className="size-4 accent-primary" checked={categoryId === category.id} onChange={() => setCategoryId(category.id)} />
                        {category.name}
                        <span className="text-muted-foreground">({feeText(category.feePaise)})</span>
                      </label>
                    ))}
                  </fieldset>
                  {problem && (
                    <p className="text-sm text-destructive" role="alert">
                      {problem}
                    </p>
                  )}
                  <div>
                    <Button onClick={() => void start()} disabled={busy || !categoryId}>
                      {busy ? "Starting…" : "Start application"}
                    </Button>
                  </div>
                </>
              )}
              {!info.cycle.open && <p className="text-sm text-muted-foreground">This award isn&apos;t open for applications now.</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
