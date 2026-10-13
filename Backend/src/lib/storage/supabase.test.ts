import { describe, expect, it } from "vitest";
import { NotFoundError } from "../errors.js";
import { createSupabaseStorage } from "./supabase.js";

/**
 * The Supabase Storage driver against a fake Storage API: the requests it makes (paths, keys,
 * headers) and how it reads the answers. The real project is checked online in Step 1.5's smoke
 * test (upload, download, a missing file).
 */

interface Seen {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

function fakeStorage(answer: (seen: Seen) => Response) {
  const calls: Seen[] = [];
  const fetchFake = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = typeof init?.body === "string" ? init.body : init?.body ? "<bytes>" : null;
    const seen = { method: init?.method ?? "GET", url: String(input), headers, body };
    calls.push(seen);
    return answer(seen);
  }) as typeof fetch;
  const storage = createSupabaseStorage({ url: "https://abcd.supabase.co/", serviceRoleKey: "service-key", bucket: "applicant-files", fetch: fetchFake });
  return { storage, calls };
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

describe("the Supabase Storage driver (Step 1.5, GAPS G-B03)", () => {
  it("asks for a one-time upload link and gives the browser a PUT with only the content type", async () => {
    const { storage, calls } = fakeStorage(() => json({ url: "/object/upload/sign/applicant-files/applications/a1/f1?token=abc" }));
    const link = await storage.createUploadLink("applications/a1/f1", { contentType: "application/pdf", maxBytes: 10, expiresInSeconds: 600 });
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "https://abcd.supabase.co/storage/v1/object/upload/sign/applicant-files/applications/a1/f1",
      headers: { apikey: "service-key", authorization: "Bearer service-key" },
    });
    expect(link).toMatchObject({
      url: "https://abcd.supabase.co/storage/v1/object/upload/sign/applicant-files/applications/a1/f1?token=abc",
      method: "PUT",
      headers: { "content-type": "application/pdf", "x-upsert": "false" },
    });
    // The service role key never reaches the browser.
    expect(JSON.stringify(link)).not.toContain("service-key");
  });

  it("signs a short download link that saves the file under its name", async () => {
    const { storage, calls } = fakeStorage(() => json({ signedURL: "/object/sign/applicant-files/profiles/u1/f2?token=xyz" }));
    const url = await storage.createDownloadLink("profiles/u1/f2", { expiresInSeconds: 120, fileName: "my id card.pdf", contentType: "application/pdf" });
    expect(calls[0]).toMatchObject({ method: "POST", url: "https://abcd.supabase.co/storage/v1/object/sign/applicant-files/profiles/u1/f2", body: '{"expiresIn":120}' });
    expect(url).toBe("https://abcd.supabase.co/storage/v1/object/sign/applicant-files/profiles/u1/f2?token=xyz&download=my%20id%20card.pdf");
  });

  it("reads a file's size, and says a missing file is missing", async () => {
    const { storage } = fakeStorage((seen) =>
      seen.url.endsWith("/present") ? new Response(null, { status: 200, headers: { "content-length": "2048" } }) : new Response("not found", { status: 400 }),
    );
    expect(await storage.statObject("applications/a1/present")).toEqual({ sizeBytes: 2048 });
    expect(await storage.statObject("applications/a1/absent")).toBeNull();
  });

  it("falls back to the object's details when the size isn't on the HEAD answer", async () => {
    const { storage, calls } = fakeStorage((seen) => (seen.method === "HEAD" ? new Response(null, { status: 200 }) : json({ size: 512 })));
    expect(await storage.statObject("applications/a1/f3")).toEqual({ sizeBytes: 512 });
    expect(calls[1]?.url).toBe("https://abcd.supabase.co/storage/v1/object/info/applicant-files/applications/a1/f3");
  });

  it("streams a stored file to the API (for the content check), and refuses a missing one", async () => {
    const { storage } = fakeStorage((seen) => (seen.url.endsWith("/here") ? new Response("%PDF-1.4 hello", { status: 200 }) : new Response("not found", { status: 404 })));
    const chunks: Buffer[] = [];
    for await (const chunk of await storage.getObject("applications/a1/here")) chunks.push(Buffer.from(chunk as Uint8Array));
    expect(Buffer.concat(chunks).toString()).toBe("%PDF-1.4 hello");
    await expect(storage.getObject("applications/a1/gone")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses a key that could leave the bucket's folders, and reports Storage's own errors", async () => {
    const { storage } = fakeStorage(() => new Response("boom", { status: 500 }));
    await expect(storage.createDownloadLink("../secret", { expiresInSeconds: 60, fileName: "x", contentType: "x" })).rejects.toThrow(/Invalid storage key/);
    await expect(storage.createUploadLink("applications/a1/f1", { contentType: "application/pdf", maxBytes: 1, expiresInSeconds: 60 })).rejects.toThrow(/500 boom/);
  });
});
