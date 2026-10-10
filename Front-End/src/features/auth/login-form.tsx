"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { FormError, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { Me } from "@/lib/api-types";
import { AREA_ROUTES, safeNextPath } from "@/lib/areas";
import { showApiErrors } from "@/lib/forms";
import { ME_KEY } from "./use-me";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: Values) {
    try {
      const me = await api.post<Me>("/auth/login", values);
      queryClient.setQueryData(ME_KEY, me);
      router.replace(safeNextPath(searchParams.get("next")) ?? AREA_ROUTES[me.home].href);
    } catch (error) {
      showApiErrors(error, form.setError, ["email", "password"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormError message={errors.root?.server?.message} />
      <FormField label="Email" error={errors.email?.message}>
        {(control) => <Input {...control} type="email" autoComplete="email" {...form.register("email")} />}
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        {(control) => <Input {...control} type="password" autoComplete="current-password" {...form.register("password")} />}
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Applying for your organisation for the first time?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
