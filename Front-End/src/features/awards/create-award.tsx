"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { FormError, FormField } from "@/components/form-field";
import { EmptyState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import type { AwardDetail, Me } from "@/lib/api-types";
import { showApiErrors } from "@/lib/forms";
import { MY_AWARDS_KEY, useAwardDomains } from "./use-awards";

const schema = z.object({
  departmentId: z.string().min(1, "Pick the department that runs the award."),
  name: z.string().trim().min(2, "Enter the award's name."),
  domainId: z.string().min(1, "Pick the award's subject area."),
  description: z.string().trim().min(1, "Describe the award in a sentence or two."),
});
type Values = z.infer<typeof schema>;

/** Staff create an award in one of their departments (spec §5.3); they then run it. */
export function CreateAwardPage() {
  return <AreaPage area="staff">{(me) => <CreateAward me={me} />}</AreaPage>;
}

function CreateAward({ me }: { me: Me }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const domains = useAwardDomains();
  const departments = me.roles.flatMap((r) => (r.role === "DEPT_STAFF" && r.department ? [r.department] : []));
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { departmentId: departments.length === 1 ? (departments[0]?.id ?? "") : "", name: "", domainId: "", description: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: Values) {
    try {
      const award = await api.post<AwardDetail>("/awards", values);
      await queryClient.invalidateQueries({ queryKey: MY_AWARDS_KEY });
      router.push(`/staff/awards/${award.id}`);
    } catch (error) {
      showApiErrors(error, form.setError, ["departmentId", "name", "domainId", "description"]);
    }
  }

  return (
    <>
      <PageTitle back={{ href: "/staff", label: "Your awards" }} title="Create an award" description="The award lasts from year to year; each year you set up a new edition of it with its own dates, questions and scoring sheet." />
      {departments.length === 0 ? (
        <EmptyState title="You can't create awards yet" description="You aren't on a department's staff. The department's head adds you." />
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>About the award</CardTitle>
            <CardDescription>What visitors read on the award&apos;s page and on Open awards.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
              <FormError message={errors.root?.server?.message} />
              <FormField label="Department" error={errors.departmentId?.message}>
                {(control) => (
                  <NativeSelect {...control} {...form.register("departmentId")}>
                    <option value="">Pick a department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField label="Award name" hint="For example, Safety Excellence Award." error={errors.name?.message}>
                {(control) => <Input {...control} {...form.register("name")} />}
              </FormField>
              <FormField label="Subject area" error={errors.domainId?.message}>
                {(control) => (
                  <Controller
                    control={form.control}
                    name="domainId"
                    render={({ field }) => (
                      <NativeSelect {...control} {...field}>
                        <option value="">Pick a subject area</option>
                        {(domains.data ?? []).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  />
                )}
              </FormField>
              <FormField label="Short description" hint="A sentence or two: what the award recognises and who it is for." error={errors.description?.message}>
                {(control) => <Textarea {...control} rows={4} {...form.register("description")} />}
              </FormField>
              <div>
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create award"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
