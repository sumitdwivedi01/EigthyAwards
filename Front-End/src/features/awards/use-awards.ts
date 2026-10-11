"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AwardDetail, CycleSetup, FormBuilder, ListItem, ScoringSheet } from "@/lib/api-types";

export const MY_AWARDS_KEY = ["awards", "mine"] as const;
export const awardKey = (id: string) => ["awards", id] as const;
export const cycleKey = (id: string) => ["cycles", id] as const;
export const formKey = (cycleId: string) => ["cycles", cycleId, "form"] as const;
export const sheetKey = (roundId: string) => ["rounds", roundId, "scoring-sheet"] as const;

export function useMyAwards() {
  return useQuery({ queryKey: MY_AWARDS_KEY, queryFn: () => api.get<AwardDetail[]>("/awards/mine") });
}

export function useAward(id: string) {
  return useQuery({ queryKey: awardKey(id), queryFn: () => api.get<AwardDetail>(`/awards/${id}`) });
}

export function useCycle(id: string) {
  return useQuery({ queryKey: cycleKey(id), queryFn: () => api.get<CycleSetup>(`/cycles/${id}`) });
}

export function useFormBuilder(cycleId: string) {
  return useQuery({ queryKey: formKey(cycleId), queryFn: () => api.get<FormBuilder>(`/cycles/${cycleId}/form`) });
}

export function useScoringSheet(roundId: string) {
  return useQuery({ queryKey: sheetKey(roundId), queryFn: () => api.get<ScoringSheet>(`/rounds/${roundId}/scoring-sheet`) });
}

export function useAwardDomains() {
  return useQuery({
    queryKey: ["master-data", "award-domains"],
    queryFn: () => api.get<ListItem[]>("/master-data/award-domains"),
    staleTime: 5 * 60_000,
  });
}

/**
 * After a change to an edition: the setup (its publish check reads the questions and the scoring
 * sheet too), and the award's list of editions, are read again.
 */
export function useRefreshCycle(cycleId: string, awardId?: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cycleKey(cycleId) }),
      awardId ? queryClient.invalidateQueries({ queryKey: awardKey(awardId) }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: MY_AWARDS_KEY }),
    ]);
}
