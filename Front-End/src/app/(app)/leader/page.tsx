import type { Metadata } from "next";
import { LeaderHome } from "@/features/areas/area-homes";

export const metadata: Metadata = { title: "Leader" };

export default function Leader() {
  return <LeaderHome />;
}
