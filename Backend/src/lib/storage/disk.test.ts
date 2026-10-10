import { mkdtemp } from "node:fs/promises";
import * as fsp from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { text } from "node:stream/consumers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDiskStorage } from "./disk.js";
import { NotFoundError } from "../errors.js";

describe("disk storage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "awards-storage-"));
  });
  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  it("stores, reads back and reports the size of an object", async () => {
    const storage = createDiskStorage(root);
    await storage.putObject("originals/app-1/file-1", Buffer.from("hello"));
    expect(await text(await storage.getObject("originals/app-1/file-1"))).toBe("hello");
    expect(await storage.statObject("originals/app-1/file-1")).toEqual({ sizeBytes: 5 });
  });

  it("reports a missing object", async () => {
    const storage = createDiskStorage(root);
    expect(await storage.statObject("originals/missing")).toBeNull();
    await expect(storage.getObject("originals/missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses keys that could escape the storage folder", async () => {
    const storage = createDiskStorage(root);
    for (const key of ["../secret", "originals/../../secret", "/etc/passwd", "Originals/x", ""]) {
      await expect(storage.putObject(key, Buffer.from("x"))).rejects.toThrow();
    }
  });
});
