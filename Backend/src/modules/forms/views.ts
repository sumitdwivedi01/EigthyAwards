import type { FormDefinition } from "./schemas.js";

export interface FormVersionView {
  version: number;
  changeSummary: string;
  publishedAt: string;
  publishedBy: string | null;
}

/** What the question builder shows: the draft, the published versions, and what is fixed. */
export interface FormView {
  cycleId: string;
  draft: FormDefinition;
  versions: FormVersionView[];
  latestVersion: number | null;
  /** The draft differs from the latest published version (or nothing is published yet). */
  hasUnpublishedChanges: boolean;
  /** Keys in the latest published version: these can't be removed, and their questions can't change type. */
  publishedKeys: string[];
  /** The deadline has passed: the questions can't change any more. */
  locked: boolean;
}
