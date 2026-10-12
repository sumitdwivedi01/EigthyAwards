import type { Metadata } from "next";
import { RoundPage } from "@/features/judging/round-page";

export const metadata: Metadata = { title: "Round review" };

export default async function DepartmentRound({ params }: PageProps<"/department/rounds/[id]">) {
  const { id } = await params;
  return <RoundPage roundId={id} area="department" />;
}
