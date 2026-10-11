import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError, messageOf } from "@/lib/api-client";

/**
 * What the API said about a builder's save, sorted for the screen: field problems by their path
 * ("sections.0.questions.2.label"), shown next to the field, and everything as a list at the top,
 * so nothing is missed when a field isn't on screen.
 */
export interface BuilderErrors {
  byPath: Record<string, string>;
  list: string[];
}

export const NO_ERRORS: BuilderErrors = { byPath: {}, list: [] };

const NAMES: Record<string, string> = { sections: "Section", questions: "question", options: "choice", indicators: "indicator" };

/** "sections.0.questions.2.label" → "Section 1, question 3". */
function placeOf(path: string): string {
  const parts = path.split(".");
  const place: string[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const name = NAMES[parts[i] ?? ""];
    const index = Number(parts[i + 1]);
    if (!name || !Number.isInteger(index)) break;
    place.push(`${name} ${index + 1}`);
  }
  return place.join(", ");
}

export function builderErrorsOf(error: unknown): BuilderErrors {
  if (!(error instanceof ApiError) || error.fieldErrors.length === 0) {
    const issues = error instanceof ApiError ? error.issues : [];
    return { byPath: {}, list: issues.length > 0 ? issues : [messageOf(error)] };
  }
  const byPath: Record<string, string> = {};
  const list: string[] = [];
  for (const { path, message } of error.fieldErrors) {
    byPath[path] = byPath[path] ? `${byPath[path]} ${message}` : message;
    const place = placeOf(path);
    list.push(place ? `${place}: ${message}` : message);
  }
  return { byPath, list };
}

export function BuilderErrorList({ errors, title }: { errors: BuilderErrors; title: string }) {
  if (errors.list.length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>
        <div className="font-medium">{title}</div>
        <ul className="mt-1 list-disc pl-4">
          {errors.list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/** A field's own problem, under it. */
export function FieldProblem({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}
