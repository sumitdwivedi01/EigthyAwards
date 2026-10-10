import type { Metadata } from "next";
import { StaffHome } from "@/features/areas/area-homes";

export const metadata: Metadata = { title: "Staff" };

export default function Staff() {
  return <StaffHome />;
}
