import type { Metadata } from "next";
import { ApplyPage } from "@/features/applying/apply-page";

export const metadata: Metadata = { title: "Apply" };

export default async function Apply({ params }: PageProps<"/applicant/apply/[cycleId]">) {
  const { cycleId } = await params;
  return <ApplyPage cycleId={cycleId} />;
}
