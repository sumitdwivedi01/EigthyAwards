import type { Metadata } from "next";
import { PeoplePage } from "@/features/people/people-page";

export const metadata: Metadata = { title: "Award department" };

export default async function LeaderDepartmentPeople({ params }: PageProps<"/leader/departments/[id]">) {
  const { id } = await params;
  return <PeoplePage departmentId={id} area="leader" />;
}
