import type { Metadata } from "next";
import { AwardDetailPage } from "@/features/awards/award-detail";

export const metadata: Metadata = { title: "Award" };

export default async function StaffAward({ params }: PageProps<"/staff/awards/[id]">) {
  const { id } = await params;
  return <AwardDetailPage awardId={id} />;
}
