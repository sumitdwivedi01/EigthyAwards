"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  AwardIcon,
  Building2Icon,
  ChevronLeftIcon,
  ClipboardListIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  ScaleIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { SetOwnPassword } from "@/features/auth/set-own-password";
import { useLogout, useMe } from "@/features/auth/use-me";
import { ApiError, messageOf } from "@/lib/api-client";
import { AREA_ROUTES } from "@/lib/areas";
import type { Area, Me } from "@/lib/api-types";

/** What each area is for, in a few words, next to its icon in the navigation. */
const AREA_META: Record<Area, { hint: string; icon: typeof AwardIcon }> = {
  leader: { hint: "Every award department", icon: LayoutDashboardIcon },
  department: { hint: "Your award's people, theme and approvals", icon: Building2Icon },
  staff: { hint: "Set up and run awards", icon: ClipboardListIcon },
  jury: { hint: "Applications to score", icon: ScaleIcon },
  applicant: { hint: "Your applications", icon: FileTextIcon },
};

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">{children}</div>;
}

/**
 * The frame of every signed-in page: the areas the API says the person may open (a sidebar on a
 * wide screen, a menu on a phone), who they are, and log out. The content column stays
 * comfortably narrow for reading.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
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
  // On a temporary password the API refuses everything else (ADR 0017): no navigation yet.
  const locked = user.mustChangePassword;
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      {!locked && <Sidebar user={user} pathname={pathname} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {!locked && <TopBar user={user} pathname={pathname} />}
        <main className="flex-1">
          <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10", locked ? "max-w-xl" : "max-w-6xl")}>
            {locked ? <SetOwnPassword me={user} /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <Link href="/home" className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <AwardIcon className="size-5" aria-hidden />
      </span>
      Awards Platform
    </Link>
  );
}

function NavList({ user, pathname, onNavigate }: { user: Me; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Areas" className="grid gap-1">
      {user.areas.map((area) => {
        const { href, label } = AREA_ROUTES[area];
        const { hint, icon: Icon } = AREA_META[area];
        const active = pathname.startsWith(href);
        return (
          <Link
            key={area}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/85",
            )}
          >
            <Icon className={cn("size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
            <span className="grid min-w-0 leading-tight">
              <span className="font-semibold">{label}</span>
              <span className="truncate text-xs text-muted-foreground">{hint}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileLinks({ user, pathname, onNavigate }: { user: Me; pathname: string; onNavigate?: () => void }) {
  const logout = useLogout();
  const active = pathname.startsWith("/me");
  return (
    <div className="grid gap-1">
      <Link
        href="/me"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent",
          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/85",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <UserRoundIcon className="size-4.5" aria-hidden />
        </span>
        <span className="grid min-w-0 leading-tight">
          <span className="truncate font-semibold">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">My profile</span>
        </span>
      </Link>
      <Button variant="ghost" className="justify-start px-3 text-muted-foreground" onClick={() => logout.mutate()} disabled={logout.isPending}>
        <LogOutIcon aria-hidden />
        Log out
      </Button>
    </div>
  );
}

function Sidebar({ user, pathname }: { user: Me; pathname: string }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
      <div className="sticky top-0 flex h-screen flex-col gap-6 px-4 py-6">
        <Brand className="px-2" />
        <NavList user={user} pathname={pathname} />
        <div className="mt-auto border-t pt-4">
          <ProfileLinks user={user} pathname={pathname} />
        </div>
      </div>
    </aside>
  );
}

function TopBar({ user, pathname }: { user: Me; pathname: string }) {
  const [open, setOpen] = useState(false);
  // Close the menu when the page changes (state adjusted from the previous render, not an effect).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <Brand />
        <Button variant="outline" size="icon" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close the menu" : "Open the menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <XIcon aria-hidden /> : <MenuIcon aria-hidden />}
        </Button>
      </div>
      {open && (
        <div id="mobile-menu" className="grid gap-4 border-t px-4 py-4">
          <NavList user={user} pathname={pathname} onNavigate={() => setOpen(false)} />
          <div className="border-t pt-4">
            <ProfileLinks user={user} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </header>
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
        <h1 className="text-2xl font-semibold">Not available</h1>
        <p className="text-muted-foreground">Your account doesn&apos;t have access to this part of the platform.</p>
      </div>
    );
  }
  return <>{children(me.data)}</>;
}

/** A link back to where the person came from, above the page title. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
      <ChevronLeftIcon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

/**
 * Every page starts the same way: an optional way back, the title, a line that says what the
 * page is for, and the page's main actions on the right.
 */
export function PageTitle({
  title,
  description,
  eyebrow,
  back,
  badges,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** A small line above the title: the award, the department, the section. */
  eyebrow?: ReactNode;
  back?: { href: string; label: ReactNode };
  /** Status pills shown next to the title. */
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {back && <BackLink href={back.href}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 flex-1 gap-1.5">
          {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {badges}
          </div>
          {description && <p className="max-w-3xl text-base text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
