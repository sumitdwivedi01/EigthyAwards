import type { Metadata } from "next";
import { ApplicationPage } from "@/features/applying/application-page";

export const metadata: Metadata = { title: "Application" };

export default async function MyApplication({ params }: PageProps<"/applicant/applications/[id]">) {
  const { id } = await params;
  return <ApplicationPage applicationId={id} />;
}
