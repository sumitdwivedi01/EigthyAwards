"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Building2Icon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import type { CreatedDepartment, DepartmentSummary } from "@/lib/api-types";
import { showApiErrors } from "@/lib/forms";
import { TemporaryPasswordCard } from "./temporary-password-card";
import { DEPARTMENTS_KEY, useDepartments } from "./use-people";

/**
 * The leader's departments (ADR 0017, ADR 0020): every department, and a new one with its head.
 * A department then runs itself: its head adds the staff and jury and chooses the theme; the
 * leader can look at each one.
 */
export function DepartmentsPage() {
  const [creating, setCreating] = useState(false);
  return (
    <AreaPage area="leader">
      {() => (
        <>
          <PageTitle
            back={{ href: "/leader", label: "Across the platform" }}
            title="Departments"
            description="Each department runs its own awards. You create one with its head; the head then adds their staff and jury and chooses how their award pages look."
            actions={
              !creating && (
                <Button onClick={() => setCreating(true)}>
                  <PlusIcon aria-hidden />
                  New department
                </Button>
              )
            }
          />
          <div className="grid gap-6">
            {creating && <NewDepartment onClose={() => setCreating(false)} />}
            <DepartmentList onCreate={() => setCreating(true)} />
          </div>
        </>
      )}
    </AreaPage>
  );
}

function DepartmentList({ onCreate }: { onCreate: () => void }) {
  const departments = useDepartments();
  if (departments.isPending) return <LoadingState label="Loading the departments" lines={5} />;
  if (departments.error) return <ErrorState error={departments.error} onRetry={() => void departments.refetch()} />;
  if (departments.data.length === 0) {
    return (
      <EmptyState
        icon={Building2Icon}
        title="No departments yet"
        description="Create the first one with its head."
        action={
          <Button onClick={onCreate}>
            <PlusIcon aria-hidden />
            New department
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {departments.data.map((department) => (
        <DepartmentCard key={department.id} department={department} />
      ))}
    </div>
  );
}

function DepartmentCard({ department }: { department: DepartmentSummary }) {
  const colour = department.colours?.primary ?? "var(--primary)";
  return (
    <Card className="overflow-hidden">
      <div className="-mt-(--card-spacing) h-1.5" style={{ backgroundColor: colour }} aria-hidden />
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {department.name}
          {department.externalOrganiser && <Badge variant="outline">External organiser</Badge>}
        </CardTitle>
        <CardDescription>
          {department.heads.length > 0 ? `Head: ${department.heads.map((h) => h.name + (h.waitingForFirstLogin ? " (hasn't logged in yet)" : "")).join(", ")}` : "No head"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {department.counts.staff} staff · {department.counts.jury} jury · {department.counts.awards} {department.counts.awards === 1 ? "award" : "awards"}
        </span>
        <Button asChild variant="outline">
          <Link href={`/leader/departments/${department.id}`}>
            View
            <ChevronRightIcon aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Enter the department's name."),
  externalOrganiser: z.boolean(),
  headName: z.string().trim().min(1, "Enter the head's name."),
  headEmail: z.string().trim().min(1, "Enter the head's email address."),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  name: "",
  externalOrganiser: false,
  headName: "",
  headEmail: "",
};

function NewDepartment({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<CreatedDepartment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;
  const externalOrganiser = useWatch({ control: form.control, name: "externalOrganiser" });

  async function onSubmit(values: Values) {
    setNotice(null);
    try {
      const result = await api.post<CreatedDepartment>("/departments", {
        name: values.name,
        externalOrganiser: values.externalOrganiser,
        head: { name: values.headName, email: values.headEmail },
      });
      await queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
      form.reset(EMPTY);
      if (result.temporaryPassword) setCreated(result);
      else setNotice(`${result.department.name} is created. ${result.head.name} already had an account and now heads it.`);
    } catch (error) {
      // The head's fields come back as "head.name" and "head.email".
      showApiErrors(error, form.setError, ["name"], {
        "head.name": "headName",
        "head.email": "headEmail",
      });
    }
  }

  if (created?.temporaryPassword) {
    return (
      <TemporaryPasswordCard
        name={created.head.name}
        email={created.head.email}
        password={created.temporaryPassword}
        onDone={() => {
          setNotice(`${created.department.name} is created, with ${created.head.name} as its head.`);
          setCreated(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>New department</CardTitle>
        <CardDescription>
          The head gets an account with a temporary password, shown to you once. If the email already has an account, it is used as it is. The head
          then runs the department: its staff, jury and theme.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <FormError message={errors.root?.server?.message} />
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Department name" error={errors.name?.message}>
              {(control) => <Input {...control} autoFocus {...form.register("name")} />}
            </FormField>
            <div className="flex items-start gap-3 self-end pb-2">
              <Checkbox id="external-organiser" checked={externalOrganiser} onCheckedChange={(value) => form.setValue("externalOrganiser", value === true)} className="mt-0.5" />
              <Label htmlFor="external-organiser" className="leading-snug font-normal">
                An external award organiser (runs its own awards here, under its own brand)
              </Label>
            </div>
            <FormField label="Head's name" error={errors.headName?.message}>
              {(control) => <Input {...control} autoComplete="off" {...form.register("headName")} />}
            </FormField>
            <FormField label="Head's email" hint="Their login." error={errors.headEmail?.message}>
              {(control) => <Input {...control} type="email" autoComplete="off" {...form.register("headEmail")} />}
            </FormField>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create department"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <FormNotice message={notice} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
