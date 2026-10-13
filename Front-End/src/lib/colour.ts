/**
 * Text that stays readable on a department's chosen colour: black or white, whichever has the
 * higher contrast (WCAG 2 relative luminance). Only presentation; the API stores the colours.
 */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableTextOn(hex: string): "#000000" | "#FFFFFF" {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#FFFFFF";
  const l = luminance(hex);
  // Contrast with white is 1.05 / (l + 0.05); with black, (l + 0.05) / 0.05.
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? "#FFFFFF" : "#000000";
}
