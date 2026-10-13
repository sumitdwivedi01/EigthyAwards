"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2Icon, CircleAlertIcon, EyeOffIcon } from "lucide-react";
import { Details } from "@/components/layout/blocks";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioCard } from "@/components/ui/radio-card";
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
  if (info.isPending) return <LoadingState label="Loading the award" lines={5} />;
  if (info.error) return <ErrorState error={info.error} onRetry={() => void info.refetch()} />;
  return <ApplyLoaded info={info.data} />;
}

function feeText(paise: number): string {
  return paise === 0 ? "Free" : rupees(paise);
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
      <PageTitle back={{ href: "/applicant", label: "Applying" }} eyebrow={info.award.department} title={`${info.award.name} ${info.cycle.label}`} description={entries} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          {info.organisations.length === 0 ? (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>First, add your organisation</CardTitle>
                <CardDescription>The award goes to an organisation, never to a person. Register yours, or join it if a colleague already did.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="lg">
                  <Link href="/applicant/organisation">
                    <Building2Icon aria-hidden /> My organisation
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Start your application</CardTitle>
                <CardDescription>One application per organisation for this award. It saves as you go, so you can come back any time before the deadline.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                {info.organisations.some((o) => o.existing) && (
                  <ul className="grid gap-2">
                    {info.organisations
                      .filter((o) => o.existing)
                      .map((o) => (
                        <li key={o.id}>
                          <Alert variant="info">
                            <CircleAlertIcon />
                            <AlertDescription>
                              {o.existing?.mine && o.existing.applicationId ? (
                                <>
                                  You already started {o.legalName}&apos;s application ({o.existing.status.label}).{" "}
                                  <Link href={`/applicant/applications/${o.existing.applicationId}`} className="font-semibold">
                                    Open it
                                  </Link>
                                </>
                              ) : (
                                <>
                                  {o.legalName} already has an application for this award ({o.existing?.status.label}), started by a colleague. Only
                                  they can open it.
                                </>
                              )}
                            </AlertDescription>
                          </Alert>
                        </li>
                      ))}
                  </ul>
                )}
                {free.length > 0 && info.cycle.open && (
                  <>
                    {info.organisations.length > 1 && (
                      <fieldset className="grid gap-2">
                        <legend className="mb-2 font-semibold">Which organisation is applying?</legend>
                        {free.map((o) => (
                          <RadioCard key={o.id} name="organisation" value={o.id} checked={organisationId === o.id} onChange={() => setOrganisationId(o.id)} title={o.legalName} />
                        ))}
                      </fieldset>
                    )}
                    <fieldset className="grid gap-2">
                      <legend className="mb-2 font-semibold">{info.categories.length === 1 ? "Entry category" : "Choose the entry category"}</legend>
                      {info.categories.map((category) => (
                        <RadioCard
                          key={category.id}
                          name="category"
                          value={category.id}
                          checked={categoryId === category.id}
                          onChange={() => setCategoryId(category.id)}
                          title={category.name}
                          detail={`Entry fee: ${feeText(category.feePaise)}`}
                        />
                      ))}
                    </fieldset>
                    {problem && (
                      <Alert variant="destructive">
                        <CircleAlertIcon />
                        <AlertDescription>{problem}</AlertDescription>
                      </Alert>
                    )}
                    <div>
                      <Button size="lg" onClick={() => void start()} disabled={busy || !categoryId}>
                        {busy ? "Starting…" : "Start the application"}
                      </Button>
                    </div>
                  </>
                )}
                {!info.cycle.open && <p className="text-muted-foreground">This award isn&apos;t open for applications now.</p>}
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>About this award</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-relaxed whitespace-pre-line">{info.award.description}</p>
            <Details
              columns={1}
              items={[
                { label: "Applications open", value: istDateTime(info.cycle.opensAt) },
                { label: "Deadline", value: istDateTime(info.cycle.deadlineAt) },
              ]}
            />
            {info.cycle.blindJudging && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <EyeOffIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                Judged blind: the jury never sees who applied, only the answers.
              </p>
            )}
            {info.award.slug && (
              <Link href={`/awards/${info.award.slug}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                The award&apos;s page
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
