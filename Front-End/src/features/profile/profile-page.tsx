"use client";

import { PageTitle } from "@/components/layout/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/features/auth/use-me";
import { DetailsForm, PasswordForm } from "./profile-forms";
import { ProofDocuments } from "./proof-documents";

/**
 * My profile, for every account (§5.21). The proof tab, what an applicant gives once for every
 * application (§5.20), is only for those the API gives the Applying area: applicant accounts (ADR 0016).
 */
export function ProfilePage() {
  const me = useMe();
  if (!me.data) return null;
  const applies = me.data.areas.includes("applicant");
  return (
    <>
      <PageTitle
        title="My profile"
        description={
          applies ? "Your details, your password, and the proof you give once for every application." : "Your details and your password."
        }
      />
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          {applies && <TabsTrigger value="proof">Proof for applying</TabsTrigger>}
        </TabsList>
        <TabsContent value="details" className="pt-4">
          <DetailsForm me={me.data} />
        </TabsContent>
        <TabsContent value="password" className="pt-4">
          <PasswordForm me={me.data} />
        </TabsContent>
        {applies && (
          <TabsContent value="proof" className="pt-4">
            <ProofDocuments me={me.data} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
