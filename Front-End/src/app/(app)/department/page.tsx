import type { Metadata } from "next";
import { DepartmentHome } from "@/features/areas/area-homes";

export const metadata: Metadata = { title: "Department" };

export default function Department() {
  return <DepartmentHome />;
}
