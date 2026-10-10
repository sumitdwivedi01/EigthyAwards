"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AwardIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/features/auth/use-me";
import { ApiError, messageOf } from "@/lib/api-client";
import { AREA_ROUTES } from "@/lib/areas";
import type { Area, Me } from "@/lib/api-types";

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">{children}</div>;
}

/** The frame of every signed-in page: who you are, the areas the API says you may open, log out. */
export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const signedOut = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (signedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, router, pathname]);

  if (me.isPending || signedOut) return <Centered>Loading…</Centered>;
  if (me.error) {
    return (
      <Centered>
        <div className="grid justify-items-center gap-3">
          <p>{messageOf(me.error)}</p>
          <Button variant="outline" onClick={() => void me.refetch()}>
            Try again
          </Button>
        </div>
      </Centered>
    );
  }

  const user = me.data;
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/home" className="flex items-center gap-2 font-semibold">
            <AwardIcon className="size-5 text-primary" aria-hidden />
            Awards Platform
          </Link>
          <nav aria-label="Areas" className="flex flex-wrap gap-1">
            {user.areas.map((area) => (
              <AreaLink key={area} area={area} active={pathname.startsWith(AREA_ROUTES[area].href)} />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant={pathname.startsWith("/me") ? "secondary" : "ghost"} size="sm">
              <Link href="/me">
                <UserRoundIcon aria-hidden />
                {user.name}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOutIcon aria-hidden />
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

function AreaLink({ area, active }: { area: Area; active: boolean }) {
  const { href, label } = AREA_ROUTES[area];
  return (
    <Button asChild variant={active ? "secondary" : "ghost"} size="sm">
      <Link href={href} aria-current={active ? "page" : undefined}>
        {label}
      </Link>
    </Button>
  );
}

/**
 * Shows an area's page only to people the API gave that area. The API still checks every
 * request; this only avoids showing an empty page to someone who can't use it.
 */
export function AreaPage({ area, children }: { area: Area; children: (me: Me) => ReactNode }) {
  const me = useMe();
  if (!me.data) return null;
  if (!me.data.areas.includes(area)) {
    return (
      <div className="grid gap-2">
        <h1 className="text-xl font-semibold">Not available</h1>
        <p className="text-muted-foreground">Your account doesn&apos;t have access to this part of the platform.</p>
      </div>
    );
  }
  return <>{children(me.data)}</>;
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
