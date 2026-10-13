"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { DepartmentSummary, DepartmentTheme, People } from "@/lib/api-types";

export const DEPARTMENTS_KEY = ["departments"] as const;

export function peopleKey(departmentId: string) {
  return ["departments", departmentId, "people"] as const;
}

export function themeKey(departmentId: string) {
  return ["departments", departmentId, "theme"] as const;
}

/** Departments the API lets this person see: all for the leader, their own for a head. */
export function useDepartments() {
  return useQuery({ queryKey: DEPARTMENTS_KEY, queryFn: () => api.get<DepartmentSummary[]>("/departments") });
}

export function usePeople(departmentId: string) {
  return useQuery({ queryKey: peopleKey(departmentId), queryFn: () => api.get<People>(`/departments/${departmentId}/people`) });
}

/** The department's theme and award pages: the head edits them, the leader only sees them (ADR 0020). */
export function useDepartmentTheme(departmentId: string) {
  return useQuery({
    queryKey: themeKey(departmentId),
    queryFn: () => api.get<DepartmentTheme>(`/departments/${departmentId}/theme`),
  });
}

/** After a change to a department's people, its lists and the department counts are re-read. */
export function useRefreshPeople(departmentId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: peopleKey(departmentId) }),
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY }),
    ]);
}
