import type { Metadata } from "next";
import { DepartmentsPage } from "@/features/people/departments-page";

export const metadata: Metadata = { title: "Award departments" };

export default function LeaderDepartments() {
  return <DepartmentsPage />;
}
