import Link from "next/link";
import { AwardIcon } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="grid w-full max-w-sm gap-6">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold">
          <AwardIcon className="size-5 text-primary" aria-hidden />
          Awards Platform
        </Link>
        {children}
      </div>
    </main>
  );
}
