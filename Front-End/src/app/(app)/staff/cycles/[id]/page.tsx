import type { Metadata } from "next";
import { CycleSetupPage } from "@/features/awards/cycle-setup";

export const metadata: Metadata = { title: "Edition setup" };

export default async function StaffCycle({ params }: PageProps<"/staff/cycles/[id]">) {
  const { id } = await params;
  return <CycleSetupPage cycleId={id} />;
}
