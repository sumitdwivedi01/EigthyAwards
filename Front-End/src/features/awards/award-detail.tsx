"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, messageOf } from "@/lib/api-client";
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
  if (award.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (award.error) return <p className="text-sm text-destructive">{messageOf(award.error)}</p>;
  const a = award.data;
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/staff" className="text-muted-foreground underline underline-offset-4">
          My awards
        </Link>
      </p>
      <PageTitle title={a.name} description={`${a.department.name} · ${a.domain.name}`} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Editions</CardTitle>
            <CardDescription>Each edition has its own dates, fee, categories, questions and scoring sheet.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.cycles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No edition yet. Create the first one below.</p>
            ) : (
              <ul className="grid gap-2">
                {a.cycles.map((cycle) => (
                  <li key={cycle.id} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium">{cycle.label}</span>
                    <StateBadge state={cycle.state} />
                    <span className="text-muted-foreground">
                      {istDateTime(cycle.opensAt)} to {istDateTime(cycle.deadlineAt)}
                    </span>
                    <span className="ml-auto flex gap-2">
                      {cycle.status !== "DRAFT" && (
                        <Button asChild size="sm">
                          <Link href={`/staff/cycles/${cycle.id}/applications`}>Applications</Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/staff/cycles/${cycle.id}`}>Set up</Link>
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <NewEdition award={a} />
        <PageAddress award={a} />
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: awardKey(award.id) }),
        queryClient.invalidateQueries({ queryKey: MY_AWARDS_KEY }),
      ]);
      router.push(`/staff/cycles/${cycle.id}`);
    } catch (error) {
      showApiErrors(error, form.setError, ["label", "opensAt", "deadlineAt"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New edition</CardTitle>
        <CardDescription>Times are India time.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Edition name" error={errors.label?.message}>
            {(control) => <Input {...control} {...form.register("label")} />}
          </FormField>
          <FormField label="Opens" error={errors.opensAt?.message}>
            {(control) => <Input {...control} type="datetime-local" {...form.register("opensAt")} />}
          </FormField>
          <FormField label="Deadline" error={errors.deadlineAt?.message}>
            {(control) => <Input {...control} type="datetime-local" {...form.register("deadlineAt")} />}
          </FormField>
          <div>
            <Button type="submit" disabled={isSubmitting}>
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
  // Drafts are never public: the page goes live with the first published edition.
  const published = award.cycles.some((cycle) => cycle.status !== "DRAFT");

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
        <CardTitle>Award page</CardTitle>
        <CardDescription>
          The public page shows the department&apos;s colours, and fills in the dates, categories, fees and the entry counter
          by itself. It goes live when an edition is published.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Page address" hint="Lower-case letters, digits and hyphens: /awards/your-address" error={errors.slug?.message}>
            {(control) => <Input {...control} {...form.register("slug")} />}
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={isSubmitting}>
              Save address
            </Button>
            {award.siteSlug && published && (
              <Link href={`/awards/${award.siteSlug}`} target="_blank" className="text-sm underline underline-offset-4">
                Open the page
              </Link>
            )}
            <FormNotice message={notice} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
