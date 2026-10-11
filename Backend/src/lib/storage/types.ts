import type { Readable } from "node:stream";

/** Where the browser sends one file, directly to storage (GAPS G-B03). */
export interface UploadLink {
  url: string;
  method: "PUT";
  /** Headers the upload must carry (the content type the link was issued for). */
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface UploadLinkOptions {
  contentType: string;
  /** The upload is refused beyond this size. */
  maxBytes: number;
  expiresInSeconds: number;
}

export interface DownloadLinkOptions {
  expiresInSeconds: number;
  /** The name the browser saves the file under. */
  fileName: string;
  contentType: string;
}

/**
 * Where file bytes live. Modules only see this interface, so switching from local disk
 * (development) to Supabase Storage (production, Step 1.5) touches no module code.
 * The API checks who may upload or read a file, then hands out a short-lived link, so file bytes
 * never pass through the Vercel proxy or the API's JSON routes (GAPS G-B03).
 * Keys look like "profiles/<userId>/<fileId>" or "applications/<applicationId>/<fileId>".
 */
export interface StorageDriver {
  putObject(key: string, body: Buffer | Readable): Promise<void>;
  /** Throws NotFoundError if the object does not exist. */
  getObject(key: string): Promise<Readable>;
  /** Returns null if the object does not exist. */
  statObject(key: string): Promise<{ sizeBytes: number } | null>;
  /** A link for exactly one upload of this key; refused once the object exists. */
  createUploadLink(key: string, options: UploadLinkOptions): Promise<UploadLink>;
  /** A link to read this object, issued only after the API's access check. */
  createDownloadLink(key: string, options: DownloadLinkOptions): Promise<string>;
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
