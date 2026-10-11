"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { FormError, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { Me } from "@/lib/api-types";
import { showApiErrors } from "@/lib/forms";
import { ME_KEY } from "./use-me";

// Only the obvious checks happen here, to help as people type; the API decides (and normalises).
const schema = z
  .object({
    name: z.string().trim().min(1, "Enter your name."),
    email: z.string().trim().min(1, "Enter your email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { path: ["confirm"], message: "The passwords don't match." });
type Values = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ name, email, password }: Values) {
    try {
      const me = await api.post<Me>("/auth/register", { name, email, password });
      queryClient.setQueryData(ME_KEY, me);
      router.replace("/applicant/organisation");
    } catch (error) {
      showApiErrors(error, form.setError, ["name", "email", "password"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormError message={errors.root?.server?.message} />
      <FormField label="Your name" error={errors.name?.message}>
        {(control) => <Input {...control} autoComplete="name" {...form.register("name")} />}
      </FormField>
      <FormField label="Email" hint="Your login, and where we write to you." error={errors.email?.message}>
        {(control) => <Input {...control} type="email" autoComplete="email" {...form.register("email")} />}
      </FormField>
      <FormField label="Password" hint="At least 8 characters." error={errors.password?.message}>
        {(control) => <Input {...control} type="password" autoComplete="new-password" {...form.register("password")} />}
      </FormField>
      <FormField label="Repeat the password" error={errors.confirm?.message}>
        {(control) => <Input {...control} type="password" autoComplete="new-password" {...form.register("confirm")} />}
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
