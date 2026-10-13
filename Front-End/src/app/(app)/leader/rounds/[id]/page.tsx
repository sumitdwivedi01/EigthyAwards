import type { Metadata } from "next";
import { RoundPage } from "@/features/judging/round-page";

export const metadata: Metadata = { title: "Round" };

export default async function LeaderRound({ params }: PageProps<"/leader/rounds/[id]">) {
  const { id } = await params;
  return <RoundPage roundId={id} area="leader" />;
}
