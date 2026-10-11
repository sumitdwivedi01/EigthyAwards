import type { Metadata } from "next";
import { CreateAwardPage } from "@/features/awards/create-award";

export const metadata: Metadata = { title: "Create an award" };

export default function NewAward() {
  return <CreateAwardPage />;
}
