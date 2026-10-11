"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRoundIcon } from "lucide-react";
import { z } from "zod";
import { FormError, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { Me } from "@/lib/api-types";
import { AREA_ROUTES } from "@/lib/areas";
import { showApiErrors } from "@/lib/forms";
import { PasswordInput } from "./login-form";
import { ME_KEY } from "./use-me";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter the temporary password you were given."),
    newPassword: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((values) => values.newPassword === values.confirm, { path: ["confirm"], message: "The passwords don't match." });
type Values = z.infer<typeof schema>;

/**
 * Shown instead of every page while the person is on a temporary password (ADR 0017): the API
 * refuses everything else until they choose their own.
 */
export function SetOwnPassword({ me }: { me: Me }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ currentPassword, newPassword }: Values) {
    try {
      const updated = await api.post<Me>("/me/password", { currentPassword, newPassword });
      queryClient.setQueryData(ME_KEY, updated);
      router.replace(updated.home ? AREA_ROUTES[updated.home].href : "/home");
    } catch (error) {
      showApiErrors(error, form.setError, ["currentPassword", "newPassword"]);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-raised">
      <CardHeader>
        <span className="mb-1 grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
          <KeyRoundIcon className="size-5" aria-hidden />
        </span>
        <CardTitle className="text-2xl">Welcome, {me.name}</CardTitle>
        <CardDescription>You signed in with a temporary password. Choose your own to continue; nobody else will know it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Temporary password" hint="The one you were given." error={errors.currentPassword?.message}>
            {(control) => <PasswordInput {...control} autoComplete="current-password" autoFocus {...form.register("currentPassword")} />}
          </FormField>
          <FormField label="Your new password" hint="At least 8 characters." error={errors.newPassword?.message}>
            {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("newPassword")} />}
          </FormField>
          <FormField label="Repeat your new password" error={errors.confirm?.message}>
            {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("confirm")} />}
          </FormField>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Set my password and continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
