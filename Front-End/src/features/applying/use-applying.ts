"use client";

import { useQuery } from "@tanstack/react-query";
import { api, uploadToLink } from "@/lib/api-client";
import type { Application, ApplyInfo, DownloadLink, MyApplicationRow, StaffApplication, StaffApplicationList, UploadStart } from "@/lib/api-types";

export const MY_APPLICATIONS_KEY = ["applications", "mine"] as const;
export const applicationKey = (id: string) => ["applications", id] as const;
export const applyInfoKey = (cycleId: string) => ["cycles", cycleId, "apply"] as const;
export const staffListKey = (cycleId: string, query: string) => ["cycles", cycleId, "applications", query] as const;
export const reviewKey = (id: string) => ["applications", id, "review"] as const;

export function useMyApplications() {
  return useQuery({ queryKey: MY_APPLICATIONS_KEY, queryFn: () => api.get<MyApplicationRow[]>("/applications/mine") });
}

export function useApplication(id: string) {
  return useQuery({ queryKey: applicationKey(id), queryFn: () => api.get<Application>(`/applications/${id}`) });
}

export function useApplyInfo(cycleId: string) {
  return useQuery({ queryKey: applyInfoKey(cycleId), queryFn: () => api.get<ApplyInfo>(`/cycles/${cycleId}/apply`) });
}

export function useStaffApplications(cycleId: string, query: string) {
  return useQuery({
    queryKey: staffListKey(cycleId, query),
    queryFn: () => api.get<StaffApplicationList>(`/cycles/${cycleId}/applications${query ? `?${query}` : ""}`),
  });
}

export function useReview(id: string) {
  return useQuery({ queryKey: reviewKey(id), queryFn: () => api.get<StaffApplication>(`/applications/${id}/review`) });
}

/**
 * Uploads one file the way every upload works (GAPS G-B03): the API checks and issues a link, the
 * browser sends the bytes straight to storage, then the API checks the bytes and uses the file.
 */
export async function uploadFile<T>(start: () => Promise<UploadStart>, file: File, confirm: (fileId: string) => Promise<T>): Promise<T> {
  const started = await start();
  await uploadToLink(started.upload, file);
  return confirm(started.fileId);
}

/**
 * Downloads a file through a short-lived link, issued after the API's access check. The link
 * answers as an attachment, so the page stays where it is (and no pop-up blocker gets in the way).
 */
export async function downloadFile(fileId: string): Promise<void> {
  const link = await api.get<DownloadLink>(`/files/${fileId}`);
  window.location.assign(link.url);
}

/** The most a file may weigh (spec §5.6); the API and the storage link refuse more too. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
