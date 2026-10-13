import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, messageOf } from "./api-client";

/**
 * Puts the API's field errors next to the matching inputs, and anything else in the form's root
 * error. The API is the judge; the form only shows what it said. `aliases` maps an API path to a
 * differently named input, such as "head.email" to "headEmail".
 */
export function showApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  aliases: Partial<Record<string, Path<T>>> = {},
): void {
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : [];
  const unmatched: string[] = [];
  for (const item of fieldErrors) {
    const field = aliases[item.path] ?? fields.find((name) => name === item.path);
    if (field) setError(field, { type: "server", message: item.message });
    else unmatched.push(item.message);
  }
  if (fieldErrors.length === 0 || unmatched.length > 0) {
    setError("root.server", { type: "server", message: unmatched.length > 0 ? unmatched.join(" ") : messageOf(error) });
  }
}
