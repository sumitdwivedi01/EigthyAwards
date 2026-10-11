/**
 * Web addresses for award pages (/awards/<slug>): lower-case letters and digits in groups joined by
 * single hyphens, 2 to 60 characters. The database checks the same pattern (award_sites_slug_check).
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MIN = 2;
export const SLUG_MAX = 60;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length >= SLUG_MIN && slug.length <= SLUG_MAX;
}

/** "Safety Excellence Award 2026!" → "safety-excellence-award-2026". Never empty: falls back to "award". */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
  return slug.length >= SLUG_MIN ? slug : "award";
}
