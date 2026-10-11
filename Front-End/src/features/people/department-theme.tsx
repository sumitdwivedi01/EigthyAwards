"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, messageOf } from "@/lib/api-client";
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
  if (theme.isPending) return <p className="text-sm text-muted-foreground">Loading the theme…</p>;
  if (theme.error) return <p className="text-sm text-destructive">{messageOf(theme.error)}</p>;
  return (
    <>
      <ThemeForm theme={theme.data} />
      <AwardPages theme={theme.data} />
    </>
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
      setNotice("Saved. Every award page of the department shows it now.");
    } catch (error) {
      showApiErrors(error, form.setError, ["primaryColour", "accentColour", "footerText"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          {readOnly
            ? "How the department's award pages look. Only its head changes the theme."
            : "How every award page of your department looks: its colours and the line at the foot of the page."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ColourField control={form.control} name="primaryColour" label="Main colour" readOnly={readOnly} error={errors.primaryColour?.message} />
            <ColourField control={form.control} name="accentColour" label="Accent colour" readOnly={readOnly} error={errors.accentColour?.message} />
          </div>
          <FormField label="Footer" hint="Empty shows the department's name." error={errors.footerText?.message}>
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

function ColourField({
  control,
  name,
  label,
  readOnly,
  error,
}: {
  control: Control<Values>;
  name: "primaryColour" | "accentColour";
  label: string;
  readOnly: boolean;
  error?: string;
}) {
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
                className="h-8 w-12 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed"
                value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : "#000000"}
                disabled={readOnly}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              />
              <Input {...props} className="w-32 font-mono uppercase" readOnly={readOnly} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
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
    <div className="overflow-hidden rounded-lg border" aria-label="Preview of an award page">
      <div className="grid gap-2 px-4 py-5" style={{ backgroundColor: main, color: readableTextOn(main) }}>
        <span className="text-xs opacity-80">{name}</span>
        <span className="text-lg font-semibold">Your award&apos;s name</span>
        <span className="w-fit rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: second, color: readableTextOn(second) }}>
          2026: Open for applications
        </span>
      </div>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">{footer.trim() || name}</p>
    </div>
  );
}

function AwardPages({ theme }: { theme: DepartmentTheme }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Award pages</CardTitle>
        <CardDescription>
          Each award has one public page in the department&apos;s theme, live once an edition is published. The award&apos;s
          staff{theme.canEdit ? " and you" : " and the department's head"} choose its address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {theme.awards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No awards yet: the department&apos;s staff create them.</p>
        ) : (
          <ul className="grid gap-2">
            {theme.awards.map((award) => (
              <li key={award.id}>
                <AwardPageRow award={award} departmentId={theme.department.id} canEdit={theme.canEdit} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const slugSchema = z.object({ slug: z.string().trim().min(2, "Use at least 2 characters.") });

function AwardPageRow({
  award,
  departmentId,
  canEdit,
}: {
  award: DepartmentTheme["awards"][number];
  departmentId: string;
  canEdit: boolean;
}) {
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
    <div className="grid gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{award.name}</span>
        {award.live ? <Badge>Live</Badge> : <Badge variant="outline">Not published yet</Badge>}
        {address && <span className="font-mono text-xs text-muted-foreground">{address}</span>}
        <span className="ml-auto flex gap-1">
          {address && award.live && (
            <Button asChild size="sm" variant="ghost">
              <Link href={address} target="_blank">
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
      </div>
      {editing && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Page address" hint="Lower-case letters, digits and hyphens: /awards/your-address" error={errors.slug?.message}>
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
  );
}
