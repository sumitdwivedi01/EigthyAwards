"use client";

import { useState } from "react";
import { Building2Icon, PencilIcon } from "lucide-react";
import { PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { messageOf } from "@/lib/api-client";
import type { Organisation } from "@/lib/api-types";
import { EditOrganisationForm, JoinOrganisationForm, RegisterOrganisationForm, useMyOrganisations } from "./organisation-forms";

/**
 * My organisation (§5.2): the award goes to the organisation, one record per PAN. The first
 * person from a company registers it; colleagues join it.
 */
export function MyOrganisation() {
  const organisations = useMyOrganisations();
  const [adding, setAdding] = useState(false);

  if (organisations.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (organisations.error) return <p className="text-sm text-destructive">{messageOf(organisations.error)}</p>;

  const mine = organisations.data;
  return (
    <>
      <PageTitle
        title="My organisation"
        description="You apply on behalf of your organisation. Its details are kept once and used for every award."
      />
      <div className="grid gap-6">
        {mine.map((organisation) => (
          <OrganisationCard key={organisation.id} organisation={organisation} />
        ))}
        {mine.length === 0 || adding ? (
          <Card>
            <CardHeader>
              <CardTitle>{mine.length === 0 ? "Add your organisation" : "Add another organisation"}</CardTitle>
              <CardDescription>
                Is your organisation already on the platform (a colleague registered it)? Join it. Otherwise, register it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddOrganisation />
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>
            Add another organisation
          </Button>
        )}
      </div>
    </>
  );
}

function AddOrganisation() {
  const [tab, setTab] = useState<"register" | "join">("register");
  const [joinPan, setJoinPan] = useState<string | undefined>();
  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value === "join" ? "join" : "register")}>
      <TabsList>
        <TabsTrigger value="register">Register</TabsTrigger>
        <TabsTrigger value="join">Join</TabsTrigger>
      </TabsList>
      <TabsContent value="register" className="pt-4">
        <RegisterOrganisationForm
          onPanRegistered={(pan) => {
            setJoinPan(pan);
            setTab("join");
          }}
        />
      </TabsContent>
      <TabsContent value="join" className="pt-4">
        <JoinOrganisationForm
          key={joinPan ?? "join"}
          initialPan={joinPan}
          notice={joinPan ? "An organisation with this PAN is already registered. Join it with its GSTIN (or official email)." : undefined}
        />
      </TabsContent>
    </Tabs>
  );
}

function OrganisationCard({ organisation }: { organisation: Organisation }) {
  const [editing, setEditing] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2Icon className="size-5 text-muted-foreground" aria-hidden />
          {organisation.legalName}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-2">
          <Badge variant="secondary">PAN {organisation.pan}</Badge>
          {organisation.gstin ? <Badge variant="secondary">GSTIN {organisation.gstin}</Badge> : <Badge variant="outline">No GSTIN</Badge>}
          {organisation.organisationType && <Badge variant="outline">{organisation.organisationType.name}</Badge>}
        </CardDescription>
        {!editing && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <PencilIcon aria-hidden />
              Edit
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <EditOrganisationForm organisation={organisation} onDone={() => setEditing(false)} />
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Detail label="Registered address" value={`${organisation.addressLine}, ${organisation.city}, ${organisation.state.name} ${organisation.pincode}`} />
            <Detail label="Official email" value={organisation.officialEmail} />
            <Detail label="Phone" value={organisation.phone} />
            {organisation.cin && <Detail label="CIN" value={organisation.cin} />}
            {organisation.website && <Detail label="Website" value={organisation.website} />}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
