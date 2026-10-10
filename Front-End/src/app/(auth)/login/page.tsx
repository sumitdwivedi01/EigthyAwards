import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Applicants, staff, jury, department heads and the leader all log in here.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* The form reads ?next= from the address, which needs a Suspense boundary. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
