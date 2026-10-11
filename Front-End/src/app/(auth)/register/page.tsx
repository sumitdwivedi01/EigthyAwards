import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create an applicant account" };

export default function RegisterPage() {
  return (
    <Card className="shadow-raised">
      <CardHeader>
        <CardTitle className="text-2xl">Create an applicant account</CardTitle>
        <CardDescription>
          For people applying for awards on behalf of their organisation. Staff, jury and department heads are given their
          accounts by their organiser; to apply as well, they create an applicant account here with another email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
