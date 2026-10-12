import type { Metadata } from "next";
import { PeoplePage } from "@/features/people/people-page";

export const metadata: Metadata = { title: "Award department" };

export default async function DepartmentPeople({ params }: PageProps<"/department/[id]">) {
  const { id } = await params;
  return <PeoplePage departmentId={id} area="department" />;
}
