import Link from "next/link";
import { AwardIcon, FileTextIcon, ScaleIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenAwards } from "@/features/public/open-awards";

const POINTS = [
  { icon: FileTextIcon, title: "Apply once, reuse everything", text: "Your organisation's details and your identity proof are kept once and used for every award." },
  { icon: ScaleIcon, title: "Judged fairly", text: "Several jurors score each application alone; the final score is their exact average." },
  { icon: ShieldCheckIcon, title: "Every change on record", text: "Who changed a score, when and why is kept, and approved results never change." },
];

/** The public front door: what the platform is, the awards open right now, and where to go next. */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <AwardIcon className="size-5" aria-hidden />
            </span>
            Awards Platform
          </span>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Button asChild variant="ghost">
              <Link href="/register">Create an account</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary-soft/70 to-background">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[3fr_2fr] lg:py-20">
            <div className="grid content-center gap-5">
              <p className="text-eyebrow">For organisations, jurors and award teams</p>
              <h1 className="text-4xl font-semibold text-balance sm:text-5xl">One place for every award programme</h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Apply on behalf of your organisation, score entries as a juror, or run an award from set-up to published results.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/register">Create an account to apply</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Staff, jury and department heads receive their login from their organiser.</p>
            </div>
            <ul className="grid content-center gap-3">
              {POINTS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3 rounded-xl border bg-card/80 p-4 shadow-card">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{title}</span>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <OpenAwards />
        </section>
      </main>
      <footer className="border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">Awards Platform · one platform for every award programme.</p>
      </footer>
    </div>
  );
}
