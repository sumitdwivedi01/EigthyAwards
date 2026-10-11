import type { Metadata } from "next";
import { MyOrganisation } from "@/features/organisations/my-organisation";

export const metadata: Metadata = { title: "My organisation" };

export default function MyOrganisationPage() {
  return <MyOrganisation />;
}
