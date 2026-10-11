"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Me } from "@/lib/api-types";

export const ME_KEY = ["me"] as const;

/** The signed-in person, their roles and the areas they may open, as the API sees them. */
export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: () => api.get<Me>("/me"), retry: false });
}

/**
 * Logs out with a full page load to the login page: every cached answer and form state goes with
 * it (a shared computer keeps nothing), and the next person starts from their own home.
 */
export function useLogout() {
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSettled: () => {
      // A full page load on purpose (see above), not a client-side navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    },
  });
}
