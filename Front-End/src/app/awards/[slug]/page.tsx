import type { Metadata } from "next";
import { PublicAwardPage } from "@/features/public/award-page";

export const metadata: Metadata = { title: "Award" };

/** An award's public page: no login needed. */
export default async function AwardPage({ params }: PageProps<"/awards/[slug]">) {
  const { slug } = await params;
  return <PublicAwardPage slug={slug} />;
}
