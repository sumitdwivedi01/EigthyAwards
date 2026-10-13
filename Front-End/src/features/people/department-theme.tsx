"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, PaletteIcon } from "lucide-react";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { ListRow } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { DepartmentTheme } from "@/lib/api-types";
import { readableTextOn } from "@/lib/colour";
import { showApiErrors } from "@/lib/forms";
import { themeKey, useDepartmentTheme } from "./use-people";

/**
 * The department's theme and its award pages (ADR 0020). Its head chooses the colours and the
 * footer of every award page, and can change each page's address; the leader only sees them.
 */
export function DepartmentThemeCard({ departmentId }: { departmentId: string }) {
  const theme = useDepartmentTheme(departmentId);
  if (theme.isPending) return <LoadingState label="Loading the theme" />;
  if (theme.error) return <ErrorState error={theme.error} onRetry={() => void theme.refetch()} />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ThemeForm theme={theme.data} />
      <AwardPages theme={theme.data} />
    </div>
  );
}

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour such as #1F4FA8.");
const schema = z.object({
  primaryColour: hex,
  accentColour: hex,
  footerText: z.string().trim().max(200, "Keep the footer to 200 characters."),
});
type Values = z.infer<typeof schema>;

function valuesOf(theme: DepartmentTheme): Values {
  return { primaryColour: theme.primaryColour, accentColour: theme.accentColour, footerText: theme.footerText };
}

function ThemeForm({ theme }: { theme: DepartmentTheme }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesOf(theme) });
  const { errors, isSubmitting } = form.formState;
  const readOnly = !theme.canEdit;

  async function onSubmit(values: Values) {
    setNotice(null);
    try {
      const saved = await api.put<DepartmentTheme>(`/departments/${theme.department.id}/theme`, values);
      queryClient.setQueryData(themeKey(theme.department.id), saved);
      await queryClient.invalidateQueries({ queryKey: ["public"] });
      form.reset(valuesOf(saved));
      setNotice("Saved. The award's page shows it now.");
    } catch (error) {
      showApiErrors(error, form.setError, ["primaryColour", "accentColour", "footerText"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PaletteIcon className="size-5 text-muted-foreground" aria-hidden />
          Theme
        </CardTitle>
        <CardDescription>
          {readOnly ? "How the department's award pages look. Only its head changes the theme." : "How every award page of your department looks: its colours and the line at the foot of the page."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <FormError message={errors.root?.server?.message} />
          <div className="grid gap-5 sm:grid-cols-2">
            <ColourField control={form.control} name="primaryColour" label="Main colour" readOnly={readOnly} error={errors.primaryColour?.message} />
            <ColourField control={form.control} name="accentColour" label="Accent colour" readOnly={readOnly} error={errors.accentColour?.message} />
          </div>
          <FormField label="Footer line" hint="Empty shows the department's name." error={errors.footerText?.message}>
            {(control) => <Input {...control} readOnly={readOnly} placeholder={theme.department.name} {...form.register("footerText")} />}
          </FormField>
          <Preview control={form.control} name={theme.department.name} />
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save theme"}
              </Button>
              <FormNotice message={notice} />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ColourField({ control, name, label, readOnly, error }: { control: Control<Values>; name: "primaryColour" | "accentColour"; label: string; readOnly: boolean; error?: string }) {
  return (
    <FormField label={label} error={error}>
      {(props) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`${label}: pick`}
                className="size-11 cursor-pointer rounded-lg border bg-card p-1 disabled:cursor-not-allowed"
                value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : "#000000"}
                disabled={readOnly}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              />
              <Input {...props} className="w-36 font-mono uppercase" readOnly={readOnly} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
            </div>
          )}
        />
      )}
    </FormField>
  );
}

/** What an award page's top looks like with these colours (the page itself reads them live). */
function Preview({ control, name }: { control: Control<Values>; name: string }) {
  const [primary, accent, footer] = useWatch({ control, name: ["primaryColour", "accentColour", "footerText"] });
  const valid = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value.trim());
  const main = valid(primary) ? primary.trim() : "#1F4FA8";
  const second = valid(accent) ? accent.trim() : "#F2A900";
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">Preview</p>
      <div className="overflow-hidden rounded-lg border shadow-xs" aria-label="Preview of an award page">
        <div className="grid gap-2 px-5 py-6" style={{ backgroundColor: main, color: readableTextOn(main) }}>
          <span className="text-xs opacity-80">{name}</span>
          <span className="text-xl font-semibold">Your award&apos;s name</span>
          <span className="w-fit rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: second, color: readableTextOn(second) }}>
            2026: Open for applications
          </span>
        </div>
        <p className="border-t bg-card px-5 py-2.5 text-xs text-muted-foreground">{footer.trim() || name}</p>
      </div>
    </div>
  );
}

function AwardPages({ theme }: { theme: DepartmentTheme }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Award page</CardTitle>
        <CardDescription>
          The award has one public page in this theme, live once an edition is published. The award&apos;s staff
          {theme.canEdit ? " and you" : " and the department's head"} choose its address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {theme.awards.length === 0 ? (
          <EmptyState compact title="No award yet" description="The department's staff create its award." />
        ) : (
          <ul className="grid gap-2">
            {theme.awards.map((award) => (
              <AwardPageRow key={award.id} award={award} departmentId={theme.department.id} canEdit={theme.canEdit} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const slugSchema = z.object({ slug: z.string().trim().min(2, "Use at least 2 characters.") });

function AwardPageRow({ award, departmentId, canEdit }: { award: DepartmentTheme["awards"][number]; departmentId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const form = useForm<z.infer<typeof slugSchema>>({ resolver: zodResolver(slugSchema), defaultValues: { slug: award.slug ?? "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ slug }: z.infer<typeof slugSchema>) {
    try {
      await api.put<{ slug: string }>(`/awards/${award.id}/site`, { slug });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: themeKey(departmentId) }),
        queryClient.invalidateQueries({ queryKey: ["awards"] }),
        queryClient.invalidateQueries({ queryKey: ["public"] }),
      ]);
      setEditing(false);
    } catch (error) {
      showApiErrors(error, form.setError, ["slug"]);
    }
  }

  const address = award.slug ? `/awards/${award.slug}` : null;
  return (
    <ListRow className="items-start">
      <div className="grid min-w-0 flex-1 gap-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {award.name}
          {award.live ? <Badge variant="success">Live</Badge> : <Badge variant="outline">Not published yet</Badge>}
        </span>
        {address && <span className="font-mono text-xs text-muted-foreground">{address}</span>}
        {editing && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 grid gap-3" noValidate>
            <FormError message={errors.root?.server?.message} />
            <FormField label="Page address" hint="Lower-case letters, digits and hyphens, after /awards/" error={errors.slug?.message}>
              {(control) => <Input {...control} {...form.register("slug")} />}
            </FormField>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                Save address
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
      <span className="flex gap-1">
        {address && award.live && (
          <Button asChild size="sm" variant="ghost">
            <Link href={address} target="_blank">
              <ExternalLinkIcon aria-hidden />
              Open
            </Link>
          </Button>
        )}
        {canEdit && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Change address
          </Button>
        )}
      </span>
    </ListRow>
  );
}
