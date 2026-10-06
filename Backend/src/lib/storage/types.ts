import type { Readable } from "node:stream";

/**
 * Where file bytes live. Modules only see this interface, so switching from local disk
 * (development) to Supabase Storage (production, Phase 6) touches no module code.
 * Keys look like "originals/<applicationId>/<fileId>" or "masked/<applicationId>/<fileId>".
 */
export interface StorageDriver {
  putObject(key: string, body: Buffer | Readable): Promise<void>;
  /** Throws NotFoundError if the object does not exist. */
  getObject(key: string): Promise<Readable>;
  /** Returns null if the object does not exist. */
  statObject(key: string): Promise<{ sizeBytes: number } | null>;
}

/** Lower-case letters, digits, "/", "_", "-" and "."; no empty, "." or ".." segments. */
export function assertValidStorageKey(key: string): void {
  const segments = key.split("/");
  const valid =
    /^[a-z0-9][a-z0-9/_.-]*$/.test(key) &&
    segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
  if (!valid) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}
