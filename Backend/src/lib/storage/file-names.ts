/** Keeps a file name readable but harmless: no folders, no control characters. */
export function cleanFileName(name: string): string {
  return name.replace(/[\\/\p{Cc}]/gu, "_").trim().slice(0, 200) || "document";
}
