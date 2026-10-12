"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageTitle } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/features/auth/use-me";
import { DetailsForm, PasswordForm } from "./profile-forms";
import { ProofDocuments } from "./proof-documents";

/**
 * My profile, for every account (§5.21). The proof tab, what an applicant gives once for every
 * application (§5.20), is only for those the API gives the Applying area: applicant accounts (ADR 0016).
 * `?tab=proof` opens that tab straight away (links from the application form).
 */
export function ProfilePage() {
  return (
    <Suspense>
      <Profile />
    </Suspense>
  );
}

function Profile() {
  const me = useMe();
  const searchParams = useSearchParams();
  if (!me.data) return null;
  const applies = me.data.areas.includes("applicant");
  const requested = searchParams.get("tab");
  const initial = requested === "proof" && applies ? "proof" : requested === "password" ? "password" : "details";
  return (
    <>
      <PageTitle title="My profile" description={applies ? "Your details, your password, and the proof you give once for every application." : "Your details and your password."} />
      <Tabs defaultValue={initial}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          {applies && <TabsTrigger value="proof">Proof for applying</TabsTrigger>}
        </TabsList>
        <TabsContent value="details">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>Your name is shown to the people you work with on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <DetailsForm me={me.data} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Change your password</CardTitle>
              <CardDescription>You need your current password. Afterwards every other device is signed out, and we email you to confirm.</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm me={me.data} />
            </CardContent>
          </Card>
        </TabsContent>
        {applies && (
          <TabsContent value="proof">
            <ProofDocuments me={me.data} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
