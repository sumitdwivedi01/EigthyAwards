"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { AnswerValue, Application, Question, SaveAnswersResult } from "@/lib/api-types";

/**
 * Autosave for the application form (spec §5.6; the lead's focus: nothing lost). Each change is
 * kept on screen and queued; a few seconds after typing stops, or when the applicant moves to
 * another step, the queued answers are sent in one save. A failed save keeps them queued and
 * tries again; the API's message for a wrong answer appears next to its question, while the other
 * answers still save. Leaving the page with unsaved answers asks first.
 */

/** What an input holds while typing: numbers stay text until they are sent. */
export type LocalValue = string | boolean | null;

export type SaveState =
  | { kind: "saved"; at: Date | null }
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "retrying"; message: string }
  | { kind: "stopped"; message: string };

const SAVE_AFTER_MS = 1500;
const RETRY_AFTER_MS = 5000;

/** The value an input shows for a stored answer. */
export function toLocal(question: Question, stored: AnswerValue | undefined): LocalValue {
  if (stored === undefined) return question.type === "YES_NO" ? null : "";
  if (typeof stored === "number") return String(stored);
  return stored;
}

/** What is sent for what an input holds: the API checks it, and says so if it is wrong. */
export function toSend(question: Question, local: LocalValue): AnswerValue | null {
  if (local === null) return null;
  if (typeof local === "boolean") return local;
  if (question.type === "NUMBER") {
    const text = local.trim();
    if (text === "") return null;
    return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
  }
  return local;
}

export function useAutosave(applicationId: string, initial: Record<string, LocalValue>, onSaved: (application: Application) => void) {
  const [values, setValues] = useState<Record<string, LocalValue>>(initial);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ kind: "saved", at: null });
  const queued = useRef(new Map<string, AnswerValue | null>());
  const saving = useRef(false);
  const stopped = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const schedule = useCallback((delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current || stopped.current || queued.current.size === 0) return;
    const batch = Object.fromEntries(queued.current);
    queued.current.clear();
    saving.current = true;
    setState({ kind: "saving" });
    try {
      const result = await api.put<SaveAnswersResult>(`/applications/${applicationId}/answers`, { answers: batch });
      onSaved(result.application);
      setProblems((previous) => {
        const next = { ...previous };
        for (const key of Object.keys(batch)) delete next[key];
        for (const problem of result.problems) next[problem.questionKey] = problem.message;
        return next;
      });
      setState(queued.current.size > 0 ? { kind: "pending" } : { kind: "saved", at: new Date() });
    } catch (error) {
      // Put the answers back unless newer ones were typed meanwhile: nothing is lost.
      for (const [key, value] of Object.entries(batch)) {
        if (!queued.current.has(key)) queued.current.set(key, value);
      }
      if (error instanceof ApiError && (error.status === 409 || error.status === 404 || error.status === 401)) {
        // The deadline passed, the application was submitted elsewhere, or the session ended.
        stopped.current = true;
        setState({ kind: "stopped", message: messageOf(error) });
      } else {
        setState({ kind: "retrying", message: messageOf(error) });
        schedule(RETRY_AFTER_MS);
      }
    } finally {
      saving.current = false;
      if (!stopped.current && queued.current.size > 0 && !timer.current) schedule(SAVE_AFTER_MS);
    }
  }, [applicationId, onSaved, schedule]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  /** A change from an input: shown at once, saved shortly after. */
  const change = useCallback(
    (question: Question, local: LocalValue) => {
      setValues((previous) => ({ ...previous, [question.key ?? ""]: local }));
      queued.current.set(question.key ?? "", toSend(question, local));
      if (!stopped.current) {
        setState({ kind: "pending" });
        schedule(SAVE_AFTER_MS);
      }
    },
    [schedule],
  );

  useEffect(() => {
    // Leaving with answers not yet saved: the browser asks first.
    const warn = (event: BeforeUnloadEvent) => {
      if (queued.current.size > 0 || saving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      // Moving to another page inside the app: what is queued is still sent.
      void flushRef.current();
    };
  }, []);

  return { values, problems, state, change, flush };
}
