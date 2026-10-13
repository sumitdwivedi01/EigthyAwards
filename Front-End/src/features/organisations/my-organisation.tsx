"use client";

import { useState } from "react";
import { Building2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { Details } from "@/components/layout/blocks";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Organisation } from "@/lib/api-types";
import { EditOrganisationForm, JoinOrganisationForm, RegisterOrganisationForm, useMyOrganisations } from "./organisation-forms";

/**
 * My organisation (§5.2): the award goes to the organisation, one record per PAN. The first
 * person from a company registers it; colleagues join it. Only applicant accounts have one (ADR 0016).
 */
export function MyOrganisation() {
  return <AreaPage area="applicant">{() => <OrganisationsOfMine />}</AreaPage>;
}

function OrganisationsOfMine() {
  const organisations = useMyOrganisations();
  const [adding, setAdding] = useState(false);

  if (organisations.isPending) return <LoadingState label="Loading your organisation" lines={5} />;
  if (organisations.error) return <ErrorState error={organisations.error} onRetry={() => void organisations.refetch()} />;

  const mine = organisations.data;
  return (
    <>
      <PageTitle
        back={{ href: "/applicant", label: "Applying" }}
        title="My organisation"
        description="You apply on behalf of your organisation. Its details are kept once and used for every award."
        actions={
          mine.length > 0 &&
          !adding && (
            <Button variant="outline" onClick={() => setAdding(true)}>
              <PlusIcon aria-hidden />
              Add another organisation
            </Button>
          )
        }
      />
      <div className="grid gap-6">
        {mine.map((organisation) => (
          <OrganisationCard key={organisation.id} organisation={organisation} />
        ))}
        {(mine.length === 0 || adding) && (
          <Card>
            <CardHeader>
              <CardTitle>{mine.length === 0 ? "Add your organisation" : "Add another organisation"}</CardTitle>
              <CardDescription>
                Has a colleague already registered your organisation here? Then join it with its PAN and GSTIN. Otherwise, register it: you only do this
                once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddOrganisation />
            </CardContent>
          </Card>
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
      <TabsList variant="pills">
        <TabsTrigger value="register">Register it (new here)</TabsTrigger>
        <TabsTrigger value="join">Join it (already registered)</TabsTrigger>
      </TabsList>
      <TabsContent value="register">
        <RegisterOrganisationForm
          onPanRegistered={(pan) => {
            setJoinPan(pan);
            setTab("join");
          }}
        />
      </TabsContent>
      <TabsContent value="join">
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
        <CardTitle className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
            <Building2Icon className="size-5" aria-hidden />
          </span>
          {organisation.legalName}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">PAN {organisation.pan}</Badge>
          {organisation.gstin ? <Badge variant="secondary">GSTIN {organisation.gstin}</Badge> : <Badge variant="outline">No GSTIN</Badge>}
          {organisation.organisationType && <Badge variant="outline">{organisation.organisationType.name}</Badge>}
        </CardDescription>
        {!editing && (
          <CardAction>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon aria-hidden />
              Edit details
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <EditOrganisationForm organisation={organisation} onDone={() => setEditing(false)} />
        ) : (
          <Details
            items={[
              { label: "Registered address", value: `${organisation.addressLine}, ${organisation.city}, ${organisation.state.name} ${organisation.pincode}` },
              { label: "Official email", value: organisation.officialEmail },
              { label: "Phone", value: organisation.phone },
              ...(organisation.cin ? [{ label: "CIN", value: organisation.cin }] : []),
              ...(organisation.website ? [{ label: "Website", value: organisation.website }] : []),
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
