import { mkdtemp, readdir } from "node:fs/promises";
import * as fsp from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { text } from "node:stream/consumers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setClock } from "../clock.js";
import { NotFoundError } from "../errors.js";
import { createDiskStorage } from "./disk.js";
import { signGrant, verifyGrant } from "./signed-links.js";

const SECRET = "test-signing-secret-at-least-32-characters";

describe("disk storage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "awards-storage-"));
  });
  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  it("stores, reads back and reports the size of an object", async () => {
    const storage = createDiskStorage(root, { signingSecret: SECRET });
    await storage.putObject("originals/app-1/file-1", Buffer.from("hello"));
    expect(await text(await storage.getObject("originals/app-1/file-1"))).toBe("hello");
    expect(await storage.statObject("originals/app-1/file-1")).toEqual({ sizeBytes: 5 });
  });

  it("reports a missing object", async () => {
    const storage = createDiskStorage(root, { signingSecret: SECRET });
    expect(await storage.statObject("originals/missing")).toBeNull();
    await expect(storage.getObject("originals/missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses keys that could escape the storage folder", async () => {
    const storage = createDiskStorage(root, { signingSecret: SECRET });
    for (const key of ["../secret", "originals/../../secret", "/etc/passwd", "Originals/x", ""]) {
      await expect(storage.putObject(key, Buffer.from("x"))).rejects.toThrow();
    }
  });

  it("leaves nothing behind when an upload fails half-way", async () => {
    const storage = createDiskStorage(root, { signingSecret: SECRET });
    const failing = new Readable({
      read() {
        this.push("partial");
        this.destroy(new Error("connection lost"));
      },
    });
    await expect(storage.putObject("uploads/broken", failing)).rejects.toThrow(/connection lost/);
    expect(await storage.statObject("uploads/broken")).toBeNull();
    expect(await readdir(path.join(root, "uploads"))).toEqual([]);
  });

  it("issues an upload link for one key and content type, which expires", async () => {
    const storage = createDiskStorage(root, { signingSecret: SECRET });
    setClock(new Date("2026-10-10T10:00:00Z"));
    const link = await storage.createUploadLink("profiles/u/f", {
      contentType: "application/pdf",
      maxBytes: 1000,
      expiresInSeconds: 600,
    });
    expect(link).toMatchObject({ method: "PUT", headers: { "content-type": "application/pdf" } });
    expect(link.expiresAt.toISOString()).toBe("2026-10-10T10:10:00.000Z");
    const token = link.url.replace("/api/uploads/", "");
    expect(verifyGrant(token, SECRET, "put", new Date("2026-10-10T10:09:59Z"))).toMatchObject({
      k: "profiles/u/f",
      t: "application/pdf",
      m: 1000,
    });
    expect(verifyGrant(token, SECRET, "put", new Date("2026-10-10T10:10:00Z"))).toBeNull();
  });
});

describe("signed storage links", () => {
  const now = new Date("2026-10-10T10:00:00Z");
  const grant = { a: "put" as const, k: "profiles/u/f", t: "image/png", m: 10, e: now.getTime() / 1000 + 60 };

  it("refuses a link signed with another secret, changed, or used for another action", () => {
    const token = signGrant(grant, SECRET);
    expect(verifyGrant(token, SECRET, "put", now)).not.toBeNull();
    expect(verifyGrant(token, "another-secret-of-at-least-32-characters", "put", now)).toBeNull();
    expect(verifyGrant(token, SECRET, "get", now)).toBeNull();
    const [body, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...grant, k: "profiles/someone-else/f" })).toString("base64url");
    expect(verifyGrant(`${forged}.${signature}`, SECRET, "put", now)).toBeNull();
    expect(verifyGrant(`${body}`, SECRET, "put", now)).toBeNull();
    expect(verifyGrant("not-a-token", SECRET, "put", now)).toBeNull();
  });
});
