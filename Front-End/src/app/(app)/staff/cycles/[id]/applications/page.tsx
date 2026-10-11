import type { Metadata } from "next";
import { ApplicationsListPage } from "@/features/staff-applications/applications-list";

export const metadata: Metadata = { title: "Applications" };

export default async function CycleApplications({ params }: PageProps<"/staff/cycles/[id]/applications">) {
  const { id } = await params;
  return <ApplicationsListPage cycleId={id} />;
}
