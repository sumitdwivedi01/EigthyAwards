import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { clock } from "../clock.js";
import { NotFoundError } from "../errors.js";
import { signGrant } from "./signed-links.js";
import { assertValidStorageKey, type StorageDriver } from "./types.js";

export interface DiskStorageOptions {
  /** Signs the upload and download links (src/lib/storage/disk-routes.ts checks them). */
  signingSecret: string;
  /** Where the API serves those links, as the browser sees it (same origin through the proxy). */
  linkBase?: string;
}

/** Development storage on the local disk, outside the web root. */
export function createDiskStorage(rootDir: string, options: DiskStorageOptions): StorageDriver {
  const root = path.resolve(rootDir);
  const linkBase = options.linkBase ?? "/api";

  function resolveKey(key: string): string {
    assertValidStorageKey(key);
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) {
      throw new Error(`Storage key escapes the storage root: ${key}`);
    }
    return full;
  }

  function expiry(seconds: number): number {
    return Math.floor(clock.now().getTime() / 1000) + seconds;
  }

  return {
    async putObject(key, body) {
      const target = resolveKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      // Write to a temporary file first, then rename: readers never see a half-written file,
      // and a failed or refused upload leaves nothing behind.
      const temp = `${target}.${randomUUID()}.tmp`;
      const source = Buffer.isBuffer(body) ? Readable.from([body]) : body;
      try {
        await pipeline(source, createWriteStream(temp));
        await rename(temp, target);
      } catch (error) {
        await rm(temp, { force: true });
        throw error;
      }
    },

    async getObject(key) {
      const target = resolveKey(key);
      try {
        await stat(target);
      } catch {
        throw new NotFoundError("File not found.");
      }
      return createReadStream(target);
    },

    async statObject(key) {
      try {
        const info = await stat(resolveKey(key));
        return { sizeBytes: info.size };
      } catch {
        return null;
      }
    },

    async createUploadLink(key, { contentType, maxBytes, expiresInSeconds }) {
      assertValidStorageKey(key);
      const e = expiry(expiresInSeconds);
      const token = signGrant({ a: "put", k: key, t: contentType, m: maxBytes, e }, options.signingSecret);
      return {
        url: `${linkBase}/uploads/${token}`,
        method: "PUT",
        headers: { "content-type": contentType },
        expiresAt: new Date(e * 1000),
      };
    },

    async createDownloadLink(key, { expiresInSeconds, fileName, contentType }) {
      assertValidStorageKey(key);
      const token = signGrant(
        { a: "get", k: key, t: contentType, n: fileName, e: expiry(expiresInSeconds) },
        options.signingSecret,
      );
      return `${linkBase}/downloads/${token}`;
    },
  };
}
