import type { Metadata } from "next";
import { JuryHome } from "@/features/areas/area-homes";

export const metadata: Metadata = { title: "Jury" };

export default function Jury() {
  return <JuryHome />;
}
