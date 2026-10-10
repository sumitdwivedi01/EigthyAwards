import type { Metadata } from "next";
import { ApplicantHome } from "@/features/areas/area-homes";

export const metadata: Metadata = { title: "Applying" };

export default function Applicant() {
  return <ApplicantHome />;
}
