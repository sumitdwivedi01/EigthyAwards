"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ME_KEY } from "@/features/auth/use-me";
import { api } from "@/lib/api-client";
import type { Me } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { showApiErrors } from "@/lib/forms";

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  phone: z.string().trim(),
});
type DetailsValues = z.infer<typeof detailsSchema>;

/** Name and phone (§5.21). The email is the login and can't be changed yet. */
export function DetailsForm({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: me.name, phone: me.phone ?? "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: DetailsValues) {
    setNotice(null);
    try {
      const updated = await api.patch<Me>("/me/profile", { name: values.name, phone: values.phone || null });
      queryClient.setQueryData(ME_KEY, updated);
      form.reset({ name: updated.name, phone: updated.phone ?? "" });
      setNotice("Saved.");
    } catch (error) {
      showApiErrors(error, form.setError, ["name", "phone"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-md gap-4" noValidate>
      <FormError message={errors.root?.server?.message} />
      <FormField label="Email" hint="This is your login. Changing it comes later.">
        {(control) => <Input {...control} value={me.email} readOnly disabled />}
      </FormField>
      <FormField label="Name" error={errors.name?.message}>
        {(control) => <Input {...control} autoComplete="name" {...form.register("name")} />}
      </FormField>
      <FormField label="Phone (optional)" hint="A 10-digit Indian number; we store it as +91…" error={errors.phone?.message}>
        {(control) => <Input {...control} type="tel" autoComplete="tel" {...form.register("phone")} />}
      </FormField>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          Save
        </Button>
        <FormNotice message={notice} />
      </div>
    </form>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((values) => values.newPassword === values.confirm, { path: ["confirm"], message: "The passwords don't match." });
type PasswordValues = z.infer<typeof passwordSchema>;

/** Needs the current password; every other device is signed out afterwards (§5.21). */
export function PasswordForm({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ currentPassword, newPassword }: PasswordValues) {
    setNotice(null);
    try {
      const updated = await api.post<Me>("/me/password", { currentPassword, newPassword });
      queryClient.setQueryData(ME_KEY, updated);
      form.reset();
      setNotice("Password changed. You've been signed out on your other devices, and we've emailed you.");
    } catch (error) {
      showApiErrors(error, form.setError, ["currentPassword", "newPassword"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-md gap-4" noValidate>
      {me.passwordChangedAt && (
        <p className="text-sm text-muted-foreground">Last changed {istDateTime(me.passwordChangedAt)}.</p>
      )}
      <FormError message={errors.root?.server?.message} />
      <FormField label="Current password" error={errors.currentPassword?.message}>
        {(control) => <Input {...control} type="password" autoComplete="current-password" {...form.register("currentPassword")} />}
      </FormField>
      <FormField label="New password" hint="At least 8 characters." error={errors.newPassword?.message}>
        {(control) => <Input {...control} type="password" autoComplete="new-password" {...form.register("newPassword")} />}
      </FormField>
      <FormField label="Repeat the new password" error={errors.confirm?.message}>
        {(control) => <Input {...control} type="password" autoComplete="new-password" {...form.register("confirm")} />}
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          Change password
        </Button>
        <FormNotice message={notice} />
      </div>
    </form>
  );
}
