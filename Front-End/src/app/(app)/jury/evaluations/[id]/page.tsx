import type { Metadata } from "next";
import { ScoringPage } from "@/features/judging/scoring-page";

export const metadata: Metadata = { title: "Scoring" };

export default async function JuryEvaluation({ params }: PageProps<"/jury/evaluations/[id]">) {
  const { id } = await params;
  return <ScoringPage evaluationId={id} />;
}
