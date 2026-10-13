import type { Metadata } from "next";
import { ApplicationReviewPage } from "@/features/staff-applications/application-review";

export const metadata: Metadata = { title: "Application" };

export default async function StaffApplication({ params }: PageProps<"/staff/applications/[id]">) {
  const { id } = await params;
  return <ApplicationReviewPage applicationId={id} />;
}
