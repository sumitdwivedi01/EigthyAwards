"use client";

import { ChevronDownIcon, UserRoundIcon } from "lucide-react";

/**
 * The demo's accounts (docs/DEMO.md), shown under the login form only when the deployment sets
 * NEXT_PUBLIC_DEMO_ACCOUNTS=on. Picking one fills in the email; the password is shared privately
 * and never appears here. Only presentation: the API decides what each account may do.
 */
export const DEMO_ACCOUNTS_ON = process.env.NEXT_PUBLIC_DEMO_ACCOUNTS === "on";

interface DemoAccount {
  email: string;
  name: string;
  does: string;
}

const GROUPS: { role: string; accounts: DemoAccount[] }[] = [
  {
    role: "Leader",
    accounts: [{ email: "leader@demo.test", name: "Platform Leader", does: "Every department and award at a glance; creates departments" }],
  },
  {
    role: "Department heads",
    accounts: [
      { email: "head.design@demo.test", name: "Kavita Sharma", does: "Design: a round is waiting for your approval" },
      { email: "head.energy@demo.test", name: "Rohan Kapoor", does: "Energy: approves once staff send the round" },
      { email: "head.she@demo.test", name: "Meera Iyer", does: "Safety: approved, results published" },
      { email: "head.fpo@demo.test", name: "Arjun Patil", does: "FPO Awards team, an external organiser" },
      { email: "head.quality@demo.test", name: "Sanjay Gupta", does: "Quality: people ready, no award yet" },
    ],
  },
  {
    role: "Staff",
    accounts: [
      { email: "staff.imran@demo.test", name: "Imran Sheikh", does: "Energy: check proofs, assign jury, send for approval" },
      { email: "staff.karan@demo.test", name: "Karan Malhotra", does: "Design: give and publish results after approval" },
      { email: "staff.asha@demo.test", name: "Asha Rao", does: "Safety: the full story, from set-up to results" },
      { email: "staff.ravi@demo.test", name: "Ravi Kumar", does: "FPO: an award open for applications" },
      { email: "staff.divya@demo.test", name: "Divya Saxena", does: "Quality: set up a new award live" },
    ],
  },
  {
    role: "Jury",
    accounts: [
      { email: "jury.rajesh@demo.test", name: "Rajesh Iyengar", does: "Energy: scores what staff assign" },
      { email: "jury.shalini@demo.test", name: "Shalini Gupta", does: "Energy: scores what staff assign" },
      { email: "jury.anil@demo.test", name: "Anil Mehta", does: "Safety (blind, submitted) and Energy" },
      { email: "jury.aditi@demo.test", name: "Aditi Bose", does: "Design: submitted evaluations" },
    ],
  },
  {
    role: "Applicants",
    accounts: [
      { email: "applicant.kiran@demo.test", name: "Kiran Desai", does: "Acme Steel: shortlisted in Safety; applied to Energy" },
      { email: "applicant.srinivas@demo.test", name: "Srinivas Rao", does: "Krishna Delta FPO: ready to apply to FPO Excellence" },
      { email: "applicant.ganesh@demo.test", name: "Ganesh Pawar", does: "Sahyadri FPO: a draft to finish and submit" },
      { email: "applicant.anita@demo.test", name: "Anita Jadhav", does: "Ganesh's colleague: can't start a second application" },
      { email: "applicant.bhanwar@demo.test", name: "Bhanwar Lal", does: "Thar Organic: proof rejected, can fix it" },
    ],
  },
];

export function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  return (
    <section aria-labelledby="demo-accounts" className="grid gap-3 border-t pt-5">
      <div className="grid gap-1">
        <h2 id="demo-accounts" className="font-semibold">
          Demo accounts
        </h2>
        <p className="text-sm text-muted-foreground">Pick one to fill in the email, then type the demo password you were given.</p>
      </div>
      {GROUPS.map((group, i) => (
        <details key={group.role} open={i < 2} className="group rounded-lg border bg-muted/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {group.role}
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="grid gap-1 px-2 pb-2">
            {group.accounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => onPick(account.email)}
                  className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <UserRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-sm font-medium">
                      {account.name} <span className="font-normal text-muted-foreground">· {account.email}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{account.does}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
