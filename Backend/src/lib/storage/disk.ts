import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { NotFoundError } from "../errors.js";
import { assertValidStorageKey, type StorageDriver } from "./types.js";

/** Development storage on the local disk, outside the web root. */
export function createDiskStorage(rootDir: string): StorageDriver {
  const root = path.resolve(rootDir);

  function resolveKey(key: string): string {
    assertValidStorageKey(key);
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) {
      throw new Error(`Storage key escapes the storage root: ${key}`);
    }
    return full;
  }

  return {
    async putObject(key, body) {
      const target = resolveKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      // Write to a temporary file first, then rename: readers never see a half-written file.
      const temp = `${target}.${randomUUID()}.tmp`;
      const source = Buffer.isBuffer(body) ? Readable.from([body]) : body;
      await pipeline(source, createWriteStream(temp));
      await rename(temp, target);
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
  };
}
