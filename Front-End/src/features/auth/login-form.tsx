"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon } from "lucide-react";
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

/** A password box with a "show" switch, so a long temporary password can be checked before sending. */
export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className={`pr-12 ${className ?? ""}`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted-foreground hover:text-foreground"
        aria-label={shown ? "Hide the password" : "Show the password"}
        aria-pressed={shown}
      >
        {shown ? <EyeOffIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

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
      router.replace(safeNextPath(searchParams.get("next")) ?? (me.home ? AREA_ROUTES[me.home].href : "/home"));
    } catch (error) {
      showApiErrors(error, form.setError, ["email", "password"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      <FormError message={errors.root?.server?.message} />
      <FormField label="Email address" error={errors.email?.message}>
        {(control) => <Input {...control} type="email" autoComplete="email" inputMode="email" autoFocus {...form.register("email")} />}
      </FormField>
      <FormField label="Password" hint="Given a temporary password? Enter it here; you choose your own next." error={errors.password?.message}>
        {(control) => <PasswordInput {...control} autoComplete="current-password" {...form.register("password")} />}
      </FormField>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Applying for your organisation for the first time?{" "}
        <Link href="/register" className="font-semibold text-primary underline underline-offset-4">
          Create an applicant account
        </Link>
      </p>
    </form>
  );
}
