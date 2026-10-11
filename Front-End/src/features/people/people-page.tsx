"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, messageOf } from "@/lib/api-client";
import type { Area, ListedPerson, Person, PersonWithPassword } from "@/lib/api-types";
import { showApiErrors } from "@/lib/forms";
import { TemporaryPasswordCard } from "./temporary-password-card";
import { usePeople, useRefreshPeople } from "./use-people";

type ListKind = "staff" | "jury";

const LISTS: Record<ListKind, { title: string; description: string; add: string; work: (n: number) => string }> = {
  staff: {
    title: "Staff",
    description: "Staff create and run the department's awards.",
    add: "Add a staff member",
    work: (n) => (n === 1 ? "1 award" : `${n} awards`),
  },
  jury: {
    title: "Jury",
    description:
      "The experts who judge the department's awards. After each deadline, staff assign applications to people on this list.",
    add: "Add a juror",
    work: (n) => (n === 1 ? "1 assignment" : `${n} assignments`),
  },
};

/**
 * A department's people (ADR 0017): its head(s), its staff list and its jury list. The head keeps
 * them; the leader can too, in any department. Every decision is the API's; this page shows them.
 */
export function PeoplePage({ departmentId, area }: { departmentId: string; area: Extract<Area, "department" | "leader"> }) {
  return <AreaPage area={area}>{() => <People departmentId={departmentId} area={area} />}</AreaPage>;
}

interface Issued {
  name: string;
  email: string;
  password: string;
}

function People({ departmentId, area }: { departmentId: string; area: "department" | "leader" }) {
  const people = usePeople(departmentId);
  const [issued, setIssued] = useState<Issued | null>(null);

  if (people.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (people.error) return <p className="text-sm text-destructive">{messageOf(people.error)}</p>;
  const { department, heads, staff, jury } = people.data;
  const back = area === "leader" ? { href: "/leader/departments", label: "All departments" } : { href: "/department", label: "Department" };

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={back.href} className="text-muted-foreground underline underline-offset-4">
          {back.label}
        </Link>
      </p>
      <PageTitle
        title={`${department.name}: people`}
        description="New people get a temporary password, shown to you once. They choose their own at the first login."
      />
      <div className="grid gap-6">
        {issued && <TemporaryPasswordCard {...issued} onDone={() => setIssued(null)} />}
        <Card>
          <CardHeader>
            <CardTitle>Head</CardTitle>
            <CardDescription>Approves the department&apos;s judged rounds.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {heads.map((head) => (
              <PersonRow
                key={head.id}
                person={head}
                departmentId={departmentId}
                // Only the leader issues a new password to a head (the API refuses anyone else).
                canIssuePassword={area === "leader"}
                onIssued={setIssued}
              />
            ))}
          </CardContent>
        </Card>
        <PersonList kind="staff" people={staff} departmentId={departmentId} onIssued={setIssued} />
        <PersonList kind="jury" people={jury} departmentId={departmentId} onIssued={setIssued} />
      </div>
    </>
  );
}

function PersonList({
  kind,
  people,
  departmentId,
  onIssued,
}: {
  kind: ListKind;
  people: ListedPerson[];
  departmentId: string;
  onIssued: (issued: Issued) => void;
}) {
  const list = LISTS[kind];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{list.title}</CardTitle>
        <CardDescription>{list.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody yet.</p>
        ) : (
          <ul className="grid gap-2">
            {people.map((person) => (
              <li key={person.id}>
                <PersonRow
                  person={person}
                  departmentId={departmentId}
                  canIssuePassword
                  onIssued={onIssued}
                  removal={{ kind, canRemove: person.canRemove, work: list.work(person.workCount) }}
                />
              </li>
            ))}
          </ul>
        )}
        <AddPersonForm kind={kind} departmentId={departmentId} onIssued={onIssued} />
      </CardContent>
    </Card>
  );
}

function PersonRow({
  person,
  departmentId,
  canIssuePassword,
  onIssued,
  removal,
}: {
  person: Person;
  departmentId: string;
  canIssuePassword: boolean;
  onIssued: (issued: Issued) => void;
  removal?: { kind: ListKind; canRemove: boolean; work: string };
}) {
  const refresh = useRefreshPeople(departmentId);
  const [confirming, setConfirming] = useState<"password" | "remove" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "password" | "remove") {
    setBusy(true);
    setError(null);
    try {
      if (action === "password") {
        const result = await api.post<PersonWithPassword>(`/departments/${departmentId}/people/${person.id}/temporary-password`);
        if (result.temporaryPassword) {
          onIssued({ name: result.person.name, email: result.person.email, password: result.temporaryPassword });
        }
      } else if (removal) {
        await api.delete(`/departments/${departmentId}/${removal.kind}/${person.id}`);
      }
      await refresh();
      setConfirming(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1 rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{person.name}</span>
        <span className="text-sm text-muted-foreground">{person.email}</span>
        {person.waitingForFirstLogin && <Badge variant="outline">Hasn&apos;t logged in yet</Badge>}
        {removal && <span className="text-xs text-muted-foreground">{removal.work}</span>}
        <div className="ml-auto flex flex-wrap gap-1">
          {confirming === null ? (
            <>
              {canIssuePassword && (
                <Button size="sm" variant="ghost" onClick={() => setConfirming("password")}>
                  New temporary password
                </Button>
              )}
              {removal && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirming("remove")}
                  disabled={!removal.canRemove}
                  title={removal.canRemove ? undefined : "People who already have work here can't be removed yet."}
                >
                  Remove
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="self-center text-xs text-muted-foreground">
                {confirming === "password"
                  ? "Their current password stops working and they are signed out."
                  : "They lose access to this department."}
              </span>
              <Button size="sm" variant={confirming === "remove" ? "destructive" : "default"} disabled={busy} onClick={() => void act(confirming)}>
                {confirming === "password" ? "Issue it" : "Remove"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const personSchema = z.object({
  name: z.string().trim().min(1, "Enter the person's name."),
  email: z.string().trim().min(1, "Enter their email address."),
});
type PersonValues = z.infer<typeof personSchema>;

function AddPersonForm({
  kind,
  departmentId,
  onIssued,
}: {
  kind: ListKind;
  departmentId: string;
  onIssued: (issued: Issued) => void;
}) {
  const refresh = useRefreshPeople(departmentId);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<PersonValues>({ resolver: zodResolver(personSchema), defaultValues: { name: "", email: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: PersonValues) {
    setNotice(null);
    try {
      const result = await api.post<PersonWithPassword>(`/departments/${departmentId}/${kind}`, values);
      await refresh();
      form.reset();
      if (result.temporaryPassword) {
        onIssued({ name: result.person.name, email: result.person.email, password: result.temporaryPassword });
      } else {
        setNotice(`${result.person.name} already had an account and is now on the list.`);
      }
    } catch (error) {
      showApiErrors(error, form.setError, ["name", "email"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 border-t pt-4" noValidate>
      <p className="text-sm font-medium">{LISTS[kind].add}</p>
      <FormError message={errors.root?.server?.message} />
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start">
        <FormField label="Name" error={errors.name?.message}>
          {(control) => <Input {...control} autoComplete="off" {...form.register("name")} />}
        </FormField>
        <FormField label="Email" hint="Their login. An existing account is added as it is." error={errors.email?.message}>
          {(control) => <Input {...control} type="email" autoComplete="off" {...form.register("email")} />}
        </FormField>
        <Button type="submit" className="md:mt-[1.375rem]" disabled={isSubmitting}>
          {isSubmitting ? "Adding…" : "Add"}
        </Button>
      </div>
      <FormNotice message={notice} />
    </form>
  );
}
