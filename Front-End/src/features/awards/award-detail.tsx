"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { ListRow } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { AwardDetail, CycleSetup } from "@/lib/api-types";
import { fromIstInput, istDateTime } from "@/lib/format";
import { showApiErrors } from "@/lib/forms";
import { StateBadge } from "./state-badge";
import { awardKey, MY_AWARDS_KEY, useAward } from "./use-awards";

/** One award: its editions (one per year), a new edition, and its page address. */
export function AwardDetailPage({ awardId }: { awardId: string }) {
  return <AreaPage area="staff">{() => <AwardDetailView awardId={awardId} />}</AreaPage>;
}

function AwardDetailView({ awardId }: { awardId: string }) {
  const award = useAward(awardId);
  if (award.isPending) return <LoadingState label="Loading the award" lines={5} />;
  if (award.error) return <ErrorState error={award.error} onRetry={() => void award.refetch()} />;
  const a = award.data;
  const published = a.cycles.some((cycle) => cycle.status !== "DRAFT");
  return (
    <>
      <PageTitle
        back={{ href: "/staff", label: "Your awards" }}
        eyebrow={`${a.department.name} · ${a.domain.name}`}
        title={a.name}
        description={a.description}
        actions={
          a.siteSlug &&
          published && (
            <Button asChild variant="outline">
              <Link href={`/awards/${a.siteSlug}`} target="_blank">
                <ExternalLinkIcon aria-hidden />
                Open the public page
              </Link>
            </Button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Editions</CardTitle>
            <CardDescription>Each edition has its own dates, fee, categories, questions and scoring sheet.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.cycles.length === 0 ? (
              <EmptyState compact title="No edition yet" description="Create the first one on the right. Give it the year as its name." />
            ) : (
              <ul className="grid gap-2">
                {a.cycles.map((cycle) => (
                  <ListRow key={cycle.id}>
                    <div className="grid min-w-0 flex-1 gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{cycle.label}</span>
                        <StateBadge state={cycle.state} />
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {istDateTime(cycle.opensAt)} to {istDateTime(cycle.deadlineAt)}
                      </span>
                    </div>
                    <span className="flex flex-wrap gap-2">
                      {cycle.status !== "DRAFT" && (
                        <Button asChild variant="outline">
                          <Link href={`/staff/cycles/${cycle.id}/applications`}>Applications</Link>
                        </Button>
                      )}
                      {cycle.status !== "DRAFT" && cycle.roundId && (
                        <Button asChild variant="outline">
                          <Link href={`/staff/rounds/${cycle.roundId}`}>Judging</Link>
                        </Button>
                      )}
                      <Button asChild variant={cycle.status === "DRAFT" ? "default" : "ghost"}>
                        <Link href={`/staff/cycles/${cycle.id}`}>Set up</Link>
                      </Button>
                    </span>
                  </ListRow>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <NewEdition award={a} />
          <PageAddress award={a} />
        </div>
      </div>
    </>
  );
}

const editionSchema = z.object({
  label: z.string().trim().min(1, "Name this edition, for example 2026."),
  opensAt: z.string().min(1, "Pick the opening date and time."),
  deadlineAt: z.string().min(1, "Pick the deadline."),
});
type EditionValues = z.infer<typeof editionSchema>;

function NewEdition({ award }: { award: AwardDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<EditionValues>({
    resolver: zodResolver(editionSchema),
    defaultValues: { label: String(new Date().getFullYear()), opensAt: "", deadlineAt: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: EditionValues) {
    try {
      const cycle = await api.post<CycleSetup>(`/awards/${award.id}/cycles`, {
        label: values.label,
        opensAt: fromIstInput(values.opensAt),
        deadlineAt: fromIstInput(values.deadlineAt),
      });
      await Promise.all([queryClient.invalidateQueries({ queryKey: awardKey(award.id) }), queryClient.invalidateQueries({ queryKey: MY_AWARDS_KEY })]);
      router.push(`/staff/cycles/${cycle.id}`);
    } catch (error) {
      showApiErrors(error, form.setError, ["label", "opensAt", "deadlineAt"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New edition</CardTitle>
        <CardDescription>Times are India time. You set everything else up on the next screen.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Edition name" hint="Usually the year." error={errors.label?.message}>
            {(control) => <Input {...control} {...form.register("label")} />}
          </FormField>
          <FormField label="Applications open" error={errors.opensAt?.message}>
            {(control) => <Input {...control} type="datetime-local" {...form.register("opensAt")} />}
          </FormField>
          <FormField label="Deadline" error={errors.deadlineAt?.message}>
            {(control) => <Input {...control} type="datetime-local" {...form.register("deadlineAt")} />}
          </FormField>
          <div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusIcon aria-hidden />
              {isSubmitting ? "Creating…" : "Create edition"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const slugSchema = z.object({ slug: z.string().trim().min(2, "Use at least 2 characters.") });

function PageAddress({ award }: { award: AwardDetail }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<z.infer<typeof slugSchema>>({ resolver: zodResolver(slugSchema), defaultValues: { slug: award.siteSlug ?? "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ slug }: z.infer<typeof slugSchema>) {
    setNotice(null);
    try {
      const saved = await api.put<{ slug: string }>(`/awards/${award.id}/site`, { slug });
      form.reset({ slug: saved.slug });
      await queryClient.invalidateQueries({ queryKey: awardKey(award.id) });
      setNotice("Saved.");
    } catch (error) {
      showApiErrors(error, form.setError, ["slug"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public page address</CardTitle>
        <CardDescription>The page shows the department&apos;s colours and fills in the dates, categories, fees and the entry counter by itself. It goes live when an edition is published.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Address" hint="Lower-case letters, digits and hyphens, after /awards/" error={errors.slug?.message}>
            {(control) => <Input {...control} placeholder="safety-excellence" {...form.register("slug")} />}
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={isSubmitting}>
              Save address
            </Button>
            <FormNotice message={notice} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
