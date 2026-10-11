import Link from "next/link";
import { AwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenAwards } from "@/features/public/open-awards";

/** The public front door: what the platform is, and the awards open right now. */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="grid gap-4">
        <AwardIcon className="size-10 text-primary" aria-hidden />
        <h1 className="text-4xl font-semibold tracking-tight">Awards Platform</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          One place to apply for every award programme, judge entries fairly, and publish the results.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/register">Create an account to apply</Link>
        </Button>
      </div>
      <OpenAwards />
    </main>
  );
}
