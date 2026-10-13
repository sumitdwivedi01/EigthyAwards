import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { clock } from "../clock.js";
import { NotFoundError } from "../errors.js";
import { assertValidStorageKey, type StorageDriver } from "./types.js";

/**
 * Production storage: a private Supabase Storage bucket (Step 1.5, GAPS G-B03). The API talks to
 * Storage's REST API with the service role key; the browser only ever gets short-lived signed
 * links, issued after the API's own access check, so file bytes never pass through the API or the
 * Vercel proxy. Paths: /storage/v1/object/... as Supabase's storage-js uses them.
 */
export interface SupabaseStorageOptions {
  /** The project URL, e.g. https://abcd.supabase.co */
  url: string;
  serviceRoleKey: string;
  bucket: string;
  /** For tests. */
  fetch?: typeof fetch;
}

/** Supabase answers 400 (with "not found" in the body) or 404 for a missing object. */
const missing = (status: number) => status === 400 || status === 404;

export function createSupabaseStorage(options: SupabaseStorageOptions): StorageDriver {
  const base = `${options.url.replace(/\/+$/, "")}/storage/v1`;
  const call = options.fetch ?? fetch;
  const auth = { apikey: options.serviceRoleKey, authorization: `Bearer ${options.serviceRoleKey}` };

  function objectPath(key: string): string {
    assertValidStorageKey(key);
    // Keys are lower-case letters, digits, "/", "_", "-" and ".": nothing to encode.
    return `${options.bucket}/${key}`;
  }

  async function failure(what: string, response: Response): Promise<Error> {
    const text = await response.text().catch(() => "");
    return new Error(`Supabase Storage ${what} failed: ${response.status} ${text.slice(0, 200)}`);
  }

  async function bufferOf(body: Buffer | Readable): Promise<Buffer> {
    if (Buffer.isBuffer(body)) return body;
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    return Buffer.concat(chunks);
  }

  return {
    async putObject(key, body) {
      const response = await call(`${base}/object/${objectPath(key)}`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/octet-stream", "x-upsert": "false" },
        body: new Uint8Array(await bufferOf(body)),
      });
      if (!response.ok) throw await failure("upload", response);
    },

    async getObject(key) {
      const response = await call(`${base}/object/${objectPath(key)}`, { headers: auth });
      if (missing(response.status)) throw new NotFoundError("File not found.");
      if (!response.ok || !response.body) throw await failure("download", response);
      return Readable.fromWeb(response.body as WebReadableStream<Uint8Array>);
    },

    async statObject(key) {
      const head = await call(`${base}/object/${objectPath(key)}`, { method: "HEAD", headers: auth });
      if (missing(head.status)) return null;
      if (!head.ok) throw await failure("check", head);
      const length = Number(head.headers.get("content-length"));
      if (Number.isFinite(length) && head.headers.get("content-length") !== null) return { sizeBytes: length };
      // No length on the HEAD answer: ask for the object's details instead.
      const info = await call(`${base}/object/info/${objectPath(key)}`, { headers: auth });
      if (missing(info.status)) return null;
      if (!info.ok) throw await failure("check", info);
      const details = (await info.json()) as { size?: number; metadata?: { size?: number } };
      const size = details.size ?? details.metadata?.size;
      if (typeof size !== "number") throw new Error("Supabase Storage didn't say the file's size.");
      return { sizeBytes: size };
    },

    async createUploadLink(key, link) {
      // One upload of this key; without x-upsert Supabase refuses it once the object exists.
      const response = await call(`${base}/object/upload/sign/${objectPath(key)}`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw await failure("upload link", response);
      const { url } = (await response.json()) as { url?: string };
      if (!url) throw new Error("Supabase Storage didn't return an upload link.");
      return {
        url: `${base}${url}`,
        method: "PUT",
        headers: { "content-type": link.contentType, "x-upsert": "false" },
        // Supabase's upload token itself lasts two hours; the API checks the file when it is confirmed.
        expiresAt: new Date(clock.now().getTime() + link.expiresInSeconds * 1000),
      };
    },

    async createDownloadLink(key, link) {
      const response = await call(`${base}/object/sign/${objectPath(key)}`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: link.expiresInSeconds }),
      });
      if (!response.ok) throw await failure("download link", response);
      const { signedURL } = (await response.json()) as { signedURL?: string };
      if (!signedURL) throw new Error("Supabase Storage didn't return a download link.");
      // "download" makes the browser save the file under its name, as the disk driver's links do.
      const joiner = signedURL.includes("?") ? "&" : "?";
      return `${base}${signedURL}${joiner}download=${encodeURIComponent(link.fileName)}`;
    },
  };
}
