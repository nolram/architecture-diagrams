export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Truncates text to roughly fit within `maxWidth` px, given the average
 * character width for its specific font-size/weight (there's no single safe
 * default -- a bold 15px label and a regular 12px sublabel need different
 * estimates, so every call site is expected to pass one calibrated for its
 * own text style).
 */
export function truncateToWidth(text: string, maxWidth: number, charWidth: number): string {
  // the tiny epsilon absorbs float rounding when maxWidth was derived from
  // the exact same charWidth (e.g. a box sized to fit its own label) --
  // without it, a width that should divide evenly can come out a hair under
  // and truncate one character too early.
  const maxChars = Math.max(3, Math.floor(maxWidth / charWidth + 1e-6));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}
