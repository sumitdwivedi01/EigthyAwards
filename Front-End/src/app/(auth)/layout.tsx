import Link from "next/link";
import { AwardIcon } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-primary-soft/60 to-background px-4 py-12">
      <div className="grid w-full max-w-md gap-6">
        <Link href="/" className="flex items-center justify-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <AwardIcon className="size-5" aria-hidden />
          </span>
          Awards Platform
        </Link>
        {children}
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            See the awards open now
          </Link>
        </p>
      </div>
    </main>
  );
}
