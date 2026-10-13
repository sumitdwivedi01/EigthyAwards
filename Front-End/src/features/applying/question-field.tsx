"use client";

import { useId, type ReactNode } from "react";
import { CircleAlertIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioCard } from "@/components/ui/radio-card";
import { Textarea } from "@/components/ui/textarea";
import type { AnswerValue, Question } from "@/lib/api-types";
import type { LocalValue } from "./autosave";

export interface FieldIds {
  id: string;
  labelId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

/** Choices and files are groups of controls, named by the question rather than labelling one input. */
const GROUPED = new Set(["SINGLE_CHOICE", "YES_NO", "FILE_UPLOAD"]);

/** The question's wording, help and message around its control, wired together for screen readers. */
export function QuestionShell({ question, number, message, children }: { question: Question; number: number; message?: string; children: (ids: FieldIds) => ReactNode }) {
  const id = useId();
  const labelId = `${id}-label`;
  const helpId = question.help ? `${id}-help` : undefined;
  const messageId = message ? `${id}-message` : undefined;
  const describedBy = [helpId, messageId].filter(Boolean).join(" ") || undefined;
  const wording = (
    <>
      <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground" aria-hidden>
        {number}
      </span>
      {question.label}
      {question.required ? (
        <span className="text-destructive" aria-hidden>
          {" "}
          *
        </span>
      ) : (
        <span className="font-normal text-muted-foreground"> (optional)</span>
      )}
    </>
  );
  return (
    <div className="grid gap-2.5">
      {GROUPED.has(question.type) ? (
        <p id={labelId} className="text-base leading-snug font-semibold">
          {wording}
        </p>
      ) : (
        <label id={labelId} htmlFor={id} className="text-base leading-snug font-semibold">
          {wording}
        </label>
      )}
      {question.help && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {question.help}
        </p>
      )}
      {children({ id, labelId, describedBy, invalid: Boolean(message) })}
      {message && (
        <p id={messageId} className="flex items-start gap-1.5 text-sm font-medium text-destructive" role="alert">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {message}
        </p>
      )}
    </div>
  );
}

/** An editable answer for the text, number, choice and yes/no questions (files have their own). */
export function AnswerInput({ question, value, onChange, onBlur, ids }: { question: Question; value: LocalValue; onChange: (value: LocalValue) => void; onBlur: () => void; ids: FieldIds }) {
  const common = { id: ids.id, "aria-describedby": ids.describedBy, "aria-invalid": ids.invalid, onBlur };
  // A published question carries its limit (the API fills in the standard one).
  const limit = question.maxLength ?? undefined;
  switch (question.type) {
    case "SHORT_TEXT":
      return (
        <div className="grid gap-1">
          <Input {...common} value={typeof value === "string" ? value : ""} maxLength={limit} onChange={(e) => onChange(e.target.value)} />
          <Counter value={value} limit={limit} />
        </div>
      );
    case "LONG_TEXT":
      return (
        <div className="grid gap-1">
          <Textarea {...common} rows={7} value={typeof value === "string" ? value : ""} maxLength={limit} onChange={(e) => onChange(e.target.value)} />
          <Counter value={value} limit={limit} />
        </div>
      );
    case "NUMBER":
      return (
        <Input
          {...common}
          type="number"
          inputMode="decimal"
          className="max-w-52"
          min={question.min ?? undefined}
          max={question.max ?? undefined}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "SINGLE_CHOICE":
      return (
        <div role="radiogroup" aria-labelledby={ids.labelId} aria-describedby={ids.describedBy} className="grid gap-2 sm:grid-cols-2">
          {(question.options ?? []).map((option) => (
            <RadioCard key={option.key} name={`${ids.id}-choice`} value={option.key ?? ""} checked={value === option.key} onChange={() => onChange(option.key ?? "")} title={option.label} />
          ))}
        </div>
      );
    case "YES_NO":
      return (
        <div role="radiogroup" aria-labelledby={ids.labelId} aria-describedby={ids.describedBy} className="grid max-w-md grid-cols-2 gap-2">
          {[
            { label: "Yes", answer: true },
            { label: "No", answer: false },
          ].map(({ label, answer }) => (
            <RadioCard key={label} name={`${ids.id}-yes-no`} value={label} checked={value === answer} onChange={() => onChange(answer)} title={label} />
          ))}
        </div>
      );
    case "FILE_UPLOAD":
      return null;
  }
}

function Counter({ value, limit }: { value: LocalValue; limit: number | undefined }) {
  if (!limit || typeof value !== "string") return null;
  const left = limit - value.length;
  return (
    <p className={`text-right text-xs ${left < 50 ? "font-medium text-warning" : "text-muted-foreground"}`}>
      {value.length} / {limit} characters
    </p>
  );
}

/** A stored answer, for reading: the choice's wording, Yes or No, the number or the text. */
export function answerText(question: Question, value: AnswerValue | undefined): string {
  if (value === undefined) return "No answer";
  if (question.type === "YES_NO") return value === true ? "Yes" : "No";
  if (question.type === "SINGLE_CHOICE") return question.options?.find((o) => o.key === value)?.label ?? String(value);
  return String(value);
}
