import type { Metadata } from "next";
import { DepartmentsPage } from "@/features/people/departments-page";

export const metadata: Metadata = { title: "Departments" };

export default function LeaderDepartments() {
  return <DepartmentsPage />;
}
