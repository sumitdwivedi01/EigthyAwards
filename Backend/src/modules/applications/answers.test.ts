import { describe, expect, it } from "vitest";
import type { FormDefinition, Question } from "../forms/schemas.js";
import { checkAnswer, missingAnswers, progressOf } from "./answers.js";

const base = { help: "", required: true };
const short: Question = { ...base, key: "q_short00001", type: "SHORT_TEXT", label: "Site name", maxLength: 10 };
const long: Question = { ...base, key: "q_long000001", type: "LONG_TEXT", label: "Training", maxLength: 5000 };
const number: Question = { ...base, key: "q_number0001", type: "NUMBER", label: "Employees", min: 1, max: 500 };
const choice: Question = {
  ...base,
  key: "q_choice0001",
  type: "SINGLE_CHOICE",
  label: "Sector",
  options: [
    { key: "opt_steel0001", label: "Steel" },
    { key: "opt_cement001", label: "Cement" },
  ],
};
const yesNo: Question = { ...base, key: "q_yesno00001", type: "YES_NO", label: "Audited?" };
const file: Question = { ...base, key: "q_file000001", type: "FILE_UPLOAD", label: "Report", maxFiles: 2, fileTypes: ["pdf"] };

describe("checking an answer against its question (spec §5.4)", () => {
  it.each([
    ["short text, not text", short, 42, "Type your answer as text."],
    ["short text, too long", short, "Eleven chars", "Keep your answer to 10 characters; it has 12."],
    ["long text, not text", long, true, "Type your answer as text."],
    ["number, as text", number, "12", "Enter a number."],
    ["number, not finite", number, Number.NaN, "Enter a number."],
    ["number, below the range", number, 0, "Enter a number from 1 to 500."],
    ["number, above the range", number, 501, "Enter a number from 1 to 500."],
    ["choice, not one of the choices", choice, "opt_other0001", "Pick one of the choices."],
    ["choice, its label instead of its key", choice, "Steel", "Pick one of the choices."],
    ["yes/no, as text", yesNo, "yes", "Answer Yes or No."],
    ["file question, with a value", file, "report.pdf", "Add files to this question with its upload button."],
  ])("refuses %s, with its own message", (_case, question, raw, message) => {
    expect(checkAnswer(question, raw)).toEqual({ ok: false, message });
  });

  it.each([
    ["short text, trimmed", short, "  Pune  ", "Pune"],
    ["number at the edge of the range", number, 500, 500],
    ["a decimal number", { ...number, max: null }, 12.5, 12.5],
    ["a choice by its key", choice, "opt_cement001", "opt_cement001"],
    ["yes", yesNo, true, true],
    ["no", yesNo, false, false],
  ])("accepts %s", (_case, question, raw, value) => {
    expect(checkAnswer(question, raw)).toEqual({ ok: true, value });
  });

  it("treats empty text and null as no answer", () => {
    expect(checkAnswer(short, "   ")).toEqual({ ok: true, value: null });
    expect(checkAnswer(number, null)).toEqual({ ok: true, value: null });
  });

  it("names a one-sided range plainly", () => {
    expect(checkAnswer({ ...number, max: null }, 0)).toEqual({ ok: false, message: "Enter a number of at least 1." });
    expect(checkAnswer({ ...number, min: null }, 600)).toEqual({ ok: false, message: "Enter a number of at most 500." });
  });

  it("uses the standard limit when a text question sets none", () => {
    const plain: Question = { ...short, maxLength: undefined };
    expect(checkAnswer(plain, "x".repeat(300))).toEqual({ ok: true, value: "x".repeat(300) });
    expect(checkAnswer(plain, "x".repeat(301)).ok).toBe(false);
  });
});

describe("what a form still needs, and its progress", () => {
  const optional: Question = { ...short, key: "q_optional01", required: false, label: "Website" };
  const form: FormDefinition = {
    sections: [
      { key: "sec_about0001", title: "About", description: "", questions: [short, number, optional] },
      { key: "sec_proof0001", title: "Proof", description: "", questions: [yesNo, file] },
    ],
  };

  it("lists each required question without an answer, and a stored answer the rules now refuse", () => {
    const answers = new Map<string, unknown>([
      [short.key, "Far too long a name"],
      [yesNo.key, false],
    ]);
    expect(missingAnswers(form, answers, new Map())).toEqual([
      { questionKey: short.key, message: '"Site name": Keep your answer to 10 characters; it has 19.' },
      { questionKey: number.key, message: '"Employees" needs an answer.' },
      { questionKey: file.key, message: '"Report" needs at least one file.' },
    ]);
  });

  it("is satisfied by every required answer and file, with optional ones left out", () => {
    const answers = new Map<string, unknown>([
      [short.key, "Pune"],
      [number.key, 10],
      [yesNo.key, false],
    ]);
    expect(missingAnswers(form, answers, new Map([[file.key, 1]]))).toEqual([]);
  });

  it("counts answered questions per section; a No is an answer", () => {
    const answers = new Map<string, unknown>([
      [short.key, "Pune"],
      [yesNo.key, false],
    ]);
    expect(progressOf(form, answers, new Map([[file.key, 2]]))).toEqual([
      { key: "sec_about0001", answered: 1, total: 3 },
      { key: "sec_proof0001", answered: 2, total: 2 },
    ]);
  });
});
