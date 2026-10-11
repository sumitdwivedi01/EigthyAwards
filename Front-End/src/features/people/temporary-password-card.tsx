"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shows a temporary password the one time the API returns it (ADR 0017). It isn't stored
 * anywhere on screen after "Done": the person who created the account passes it on privately.
 */
export function TemporaryPasswordCard({
  name,
  email,
  password,
  onDone,
}: {
  name: string;
  email: string;
  password: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40" role="status">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="size-4" aria-hidden />
          Temporary password for {name}
        </CardTitle>
        <CardDescription>
          This is the only time it is shown. Give it to {name} privately, in person or by phone, with their login email ({email}).
          It works for 7 days, and at the first login they choose their own password.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="font-mono text-lg tracking-wider select-all" aria-label="Temporary password">
          {password}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" size="sm" onClick={onDone}>
            Done, I&apos;ve noted it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
