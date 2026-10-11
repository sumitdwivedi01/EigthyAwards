import type { Metadata } from "next";
import { ProfilePage } from "@/features/profile/profile-page";

export const metadata: Metadata = { title: "My profile" };

export default function MyProfile() {
  return <ProfilePage />;
}
