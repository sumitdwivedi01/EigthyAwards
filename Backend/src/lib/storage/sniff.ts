import type { Readable } from "node:stream";

/** The file types the platform accepts for proof documents, recognised by their first bytes. */
export type SniffedType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

/** Reads the first bytes of a stream, then stops reading. */
export async function readHead(stream: Readable, bytes = 16): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    chunks.push(buffer);
    length += buffer.length;
    if (length >= bytes) break;
  }
  stream.destroy();
  return Buffer.concat(chunks).subarray(0, bytes);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * What a file really is, from its content rather than the name or type the browser claims.
 * Returns null for anything else.
 */
export function detectType(head: Buffer): SniffedType | null {
  if (head.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.subarray(0, 8).equals(PNG_SIGNATURE)) return "image/png";
  if (head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WEBP") {
    return "image/webp";
  }
  return null;
}
