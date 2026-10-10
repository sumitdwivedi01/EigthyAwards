import { AppShell } from "@/components/layout/app-shell";

export default function SignedInLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
