"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRoundIcon, PlusIcon, UserMinusIcon, UsersIcon } from "lucide-react";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, messageOf } from "@/lib/api-client";
import type { Area, HeadPerson, ListedPerson, PersonWithPassword } from "@/lib/api-types";
import { showApiErrors } from "@/lib/forms";
import { DepartmentThemeCard } from "./department-theme";
import { TemporaryPasswordCard } from "./temporary-password-card";
import { usePeople, useRefreshPeople } from "./use-people";

type ListKind = "staff" | "jury";

const LISTS: Record<ListKind, { title: string; description: string; add: string; empty: string; work: (n: number) => string }> = {
  staff: {
    title: "Staff",
    description: "Every staff member sets up and runs the department's award.",
    add: "Add a staff member",
    empty: "No staff yet. Add the people who will set up and run your award.",
    work: (n) => (n > 0 ? "has worked on the award" : "no work on the award yet"),
  },
  jury: {
    title: "Jury",
    description: "The experts who judge the department's award. After each deadline, staff assign applications to people on this list.",
    add: "Add a juror",
    empty: "No jury yet. Add the experts who will score applications.",
    work: (n) => (n === 1 ? "1 assignment" : `${n} assignments`),
  },
};

/**
 * An award department's page (ADR 0017, ADR 0020, ADR 0021): its head(s), its staff and jury
 * lists, its theme and its award's page. The head keeps them; the leader only sees them (and can give a locked-out head
 * a new temporary password). The API says which actions the viewer has; this page shows only those.
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

  if (people.isPending) return <LoadingState label="Loading the award department" lines={6} />;
  if (people.error) return <ErrorState error={people.error} onRetry={() => void people.refetch()} />;
  const { department, canManage, heads, staff, jury } = people.data;
  const back = area === "leader" ? { href: "/leader/departments", label: "All award departments" } : { href: "/department", label: "Your award department" };

  return (
    <>
      <PageTitle
        back={back}
        eyebrow={department.externalOrganiser ? "External award organiser" : "Award department"}
        title={department.name}
        description={
          canManage
            ? "Your staff, your jury and your award's page. New people get a temporary password, shown to you once; they choose their own at the first login."
            : "The award department's people, theme and award page, to see. Its head manages them."
        }
      />
      <div className="grid gap-6">
        {issued && <TemporaryPasswordCard {...issued} onDone={() => setIssued(null)} />}
        <Card>
          <CardHeader>
            <CardTitle>Head</CardTitle>
            <CardDescription>Runs the award department and approves its award&apos;s judged rounds.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {heads.map((head) => (
              <PersonRow key={head.id} person={head} departmentId={departmentId} canIssuePassword={head.canIssuePassword} onIssued={setIssued} />
            ))}
          </CardContent>
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <PersonList kind="staff" people={staff} departmentId={departmentId} canManage={canManage} onIssued={setIssued} />
          <PersonList kind="jury" people={jury} departmentId={departmentId} canManage={canManage} onIssued={setIssued} />
        </div>
        <DepartmentThemeCard departmentId={departmentId} />
      </div>
    </>
  );
}

function PersonList({ kind, people, departmentId, canManage, onIssued }: { kind: ListKind; people: ListedPerson[]; departmentId: string; canManage: boolean; onIssued: (issued: Issued) => void }) {
  const list = LISTS[kind];
  const [adding, setAdding] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="size-5 text-muted-foreground" aria-hidden />
          {list.title}
          <Badge variant="secondary">{people.length}</Badge>
        </CardTitle>
        <CardDescription>{list.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {people.length === 0 ? (
          <EmptyState compact title="Nobody yet" description={canManage ? list.empty : undefined} />
        ) : (
          <ul className="grid gap-2">
            {people.map((person) => (
              <li key={person.id}>
                <PersonRow
                  person={person}
                  departmentId={departmentId}
                  canIssuePassword={person.canIssuePassword}
                  onIssued={onIssued}
                  work={list.work(person.workCount)}
                  removal={canManage ? { kind, canRemove: person.canRemove } : undefined}
                />
              </li>
            ))}
          </ul>
        )}
        {canManage &&
          (adding ? (
            <AddPersonForm kind={kind} departmentId={departmentId} onIssued={onIssued} onClose={() => setAdding(false)} />
          ) : (
            <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>
              <PlusIcon aria-hidden />
              {list.add}
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}

function PersonRow({
  person,
  departmentId,
  canIssuePassword,
  onIssued,
  work,
  removal,
}: {
  person: HeadPerson;
  departmentId: string;
  canIssuePassword: boolean;
  onIssued: (issued: Issued) => void;
  work?: string;
  removal?: { kind: ListKind; canRemove: boolean };
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

  const initials = person.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-2 rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary" aria-hidden>
          {initials}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {person.name}
            {person.waitingForFirstLogin && <Badge variant="warning">Hasn&apos;t logged in yet</Badge>}
          </span>
          <span className="text-sm text-muted-foreground">
            {person.email}
            {work && ` · ${work}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {confirming === null ? (
            <>
              {canIssuePassword && (
                <Button size="sm" variant="ghost" onClick={() => setConfirming("password")}>
                  <KeyRoundIcon aria-hidden />
                  New temporary password
                </Button>
              )}
              {removal && (
                <Button size="sm" variant="ghost" onClick={() => setConfirming("remove")} disabled={!removal.canRemove} title={removal.canRemove ? undefined : "People who already have work here can't be removed yet."}>
                  <UserMinusIcon aria-hidden />
                  Remove
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">{confirming === "password" ? "Their current password stops working and they are signed out." : "They lose access to this department."}</span>
              <Button size="sm" variant={confirming === "remove" ? "destructive" : "default"} disabled={busy} onClick={() => void act(confirming)}>
                {confirming === "password" ? "Issue it" : "Yes, remove"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
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

function AddPersonForm({ kind, departmentId, onIssued, onClose }: { kind: ListKind; departmentId: string; onIssued: (issued: Issued) => void; onClose: () => void }) {
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
        onClose();
      } else {
        setNotice(`${result.person.name} already had an account and is now on the list.`);
      }
    } catch (error) {
      showApiErrors(error, form.setError, ["name", "email"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="surface grid gap-4 p-4" noValidate>
      <p className="font-semibold">{LISTS[kind].add}</p>
      <FormError message={errors.root?.server?.message} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Name" error={errors.name?.message}>
          {(control) => <Input {...control} autoComplete="off" autoFocus {...form.register("name")} />}
        </FormField>
        <FormField label="Email" hint="Their login. An existing account is added as it is." error={errors.email?.message}>
          {(control) => <Input {...control} type="email" autoComplete="off" {...form.register("email")} />}
        </FormField>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding…" : "Add"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <FormNotice message={notice} />
      </div>
    </form>
  );
}
