import type { Metadata } from "next";
import { RoundPage } from "@/features/judging/round-page";

export const metadata: Metadata = { title: "Judging" };

export default async function StaffRound({ params }: PageProps<"/staff/rounds/[id]">) {
  const { id } = await params;
  return <RoundPage roundId={id} area="staff" />;
}
