import { TEXT_LIMITS, type FormDefinition, type Question } from "../forms/schemas.js";

/**
 * Checking answers against their questions (spec §5.4, §5.6). Pure functions, so every question
 * type's rules are tested on their own. Answers are stored by question key, as the value the
 * question type uses: text as a string, a number as a number, a choice as its option key, yes/no
 * as true or false. File questions are answered by uploading files, never with a value.
 */

export type AnswerValue = string | number | boolean;

/** The value to store (null: no answer), or the message to show next to the question. */
export type AnswerCheck = { ok: true; value: AnswerValue | null } | { ok: false; message: string };

function textLimit(question: Question): number {
  if (question.type !== "SHORT_TEXT" && question.type !== "LONG_TEXT") return 0;
  return question.maxLength ?? TEXT_LIMITS[question.type].default;
}

function numberRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min != null && max != null) return `Enter a number from ${min} to ${max}.`;
  if (min != null) return `Enter a number of at least ${min}.`;
  return `Enter a number of at most ${max}.`;
}

/** Checks one answer. Empty text, or null, means the question is left unanswered. */
export function checkAnswer(question: Question, raw: unknown): AnswerCheck {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  switch (question.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT": {
      if (typeof raw !== "string") return { ok: false, message: "Type your answer as text." };
      const text = raw.trim();
      if (text === "") return { ok: true, value: null };
      const limit = textLimit(question);
      if (text.length > limit) {
        return { ok: false, message: `Keep your answer to ${limit} characters; it has ${text.length}.` };
      }
      return { ok: true, value: text };
    }
    case "NUMBER": {
      if (typeof raw !== "number" || !Number.isFinite(raw)) return { ok: false, message: "Enter a number." };
      const { min, max } = question;
      if ((min != null && raw < min) || (max != null && raw > max)) return { ok: false, message: numberRange(min, max) };
      return { ok: true, value: raw };
    }
    case "SINGLE_CHOICE": {
      if (typeof raw !== "string" || !(question.options ?? []).some((option) => option.key === raw)) {
        return { ok: false, message: "Pick one of the choices." };
      }
      return { ok: true, value: raw };
    }
    case "YES_NO":
      if (typeof raw !== "boolean") return { ok: false, message: "Answer Yes or No." };
      return { ok: true, value: raw };
    case "FILE_UPLOAD":
      return { ok: false, message: "Add files to this question with its upload button." };
  }
}

export interface FormQuestion extends Question {
  sectionKey: string;
  sectionTitle: string;
}

/** Every question of a form version, in order, with its section. */
export function questionsOf(form: FormDefinition): FormQuestion[] {
  return form.sections.flatMap((section) =>
    section.questions.map((question) => ({ ...question, sectionKey: section.key, sectionTitle: section.title })),
  );
}

/** A question counts as answered when it has a valid stored value, or, for files, at least one file. */
export function isAnswered(question: Question, stored: unknown, fileCount: number): boolean {
  if (question.type === "FILE_UPLOAD") return fileCount > 0;
  const check = checkAnswer(question, stored);
  return check.ok && check.value !== null;
}

export interface SectionProgress {
  key: string;
  answered: number;
  total: number;
}

/** Progress per section: how many of its questions are answered. */
export function progressOf(
  form: FormDefinition,
  answers: ReadonlyMap<string, unknown>,
  fileCounts: ReadonlyMap<string, number>,
): SectionProgress[] {
  return form.sections.map((section) => ({
    key: section.key,
    total: section.questions.length,
    answered: section.questions.filter((q) => isAnswered(q, answers.get(q.key), fileCounts.get(q.key) ?? 0)).length,
  }));
}

export interface MissingAnswer {
  questionKey: string;
  message: string;
}

/**
 * What the form still needs before submitting: each required question without a valid answer,
 * and each stored answer that the question's rules no longer accept.
 */
export function missingAnswers(
  form: FormDefinition,
  answers: ReadonlyMap<string, unknown>,
  fileCounts: ReadonlyMap<string, number>,
): MissingAnswer[] {
  const missing: MissingAnswer[] = [];
  for (const question of questionsOf(form)) {
    const stored = answers.get(question.key);
    if (question.type !== "FILE_UPLOAD" && stored !== undefined) {
      const check = checkAnswer(question, stored);
      if (!check.ok) {
        missing.push({ questionKey: question.key, message: `"${question.label}": ${check.message}` });
        continue;
      }
    }
    if (question.required && !isAnswered(question, stored, fileCounts.get(question.key) ?? 0)) {
      missing.push({
        questionKey: question.key,
        message:
          question.type === "FILE_UPLOAD"
            ? `"${question.label}" needs at least one file.`
            : `"${question.label}" needs an answer.`,
      });
    }
  }
  return missing;
}
