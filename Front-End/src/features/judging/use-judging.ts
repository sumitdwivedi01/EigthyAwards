"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "@/lib/api-client";
import type { ApprovalQueue, AssignmentBoard, Dashboard, HistoryEvent, Judging, JuryEvaluation, JuryHome } from "@/lib/api-types";

export const boardKey = (roundId: string) => ["rounds", roundId, "board"] as const;
export const judgingKey = (roundId: string) => ["rounds", roundId, "judging"] as const;
export const JURY_HOME_KEY = ["jury", "evaluations"] as const;
export const evaluationKey = (id: string) => ["evaluations", id] as const;
export const APPROVALS_KEY = ["approvals"] as const;
export const DASHBOARD_KEY = ["reports", "dashboard"] as const;
export const historyKey = (applicationId: string) => ["applications", applicationId, "history"] as const;

export function useBoard(roundId: string) {
  return useQuery({ queryKey: boardKey(roundId), queryFn: () => api.get<AssignmentBoard>(`/rounds/${roundId}/assignment-board`) });
}

export function useJudging(roundId: string) {
  return useQuery({ queryKey: judgingKey(roundId), queryFn: () => api.get<Judging>(`/rounds/${roundId}/judging`) });
}

export function useJuryHome() {
  return useQuery({ queryKey: JURY_HOME_KEY, queryFn: () => api.get<JuryHome>("/jury/evaluations") });
}

export function useJuryEvaluation(id: string) {
  return useQuery({ queryKey: evaluationKey(id), queryFn: () => api.get<JuryEvaluation>(`/evaluations/${id}`) });
}

export function useApprovals(enabled = true) {
  return useQuery({ queryKey: APPROVALS_KEY, queryFn: () => api.get<ApprovalQueue>("/approvals"), enabled });
}

export function useDashboard() {
  return useQuery({ queryKey: DASHBOARD_KEY, queryFn: () => api.get<Dashboard>("/reports/dashboard") });
}

export function useHistory(applicationId: string, enabled: boolean) {
  return useQuery({
    queryKey: historyKey(applicationId),
    queryFn: () => api.get<HistoryEvent[]>(`/applications/${applicationId}/history`),
    enabled,
  });
}

/** After any change in a round, its board, judging view and the dashboards are read again. */
export function useRefreshRound(roundId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    (judging?: Judging) => {
      if (judging) queryClient.setQueryData(judgingKey(roundId), judging);
      void queryClient.invalidateQueries({ queryKey: ["rounds", roundId] });
      void queryClient.invalidateQueries({ queryKey: APPROVALS_KEY });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    [queryClient, roundId],
  );
}
