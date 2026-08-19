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

/**
 * Wraps `text` into lines that each fit within `maxWidth` px (estimated via
 * `charWidth`), breaking on word boundaries. If the result exceeds `maxLines`,
 * the overflow is folded into the last line and truncated with an ellipsis.
 * Returns an empty array for blank input.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  charWidth: number,
  maxLines: number,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const maxChars = Math.max(3, Math.floor(maxWidth / charWidth + 1e-6));
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  // clamp any line that still overflows (e.g. a single very long word)
  const clamped = lines.map((line) =>
    line.length > maxChars ? truncateToWidth(line, maxWidth, charWidth) : line,
  );

  if (clamped.length <= maxLines) return clamped;
  const kept = clamped.slice(0, maxLines);
  const overflow = clamped.slice(maxLines).join(" ");
  kept[kept.length - 1] = truncateToWidth(`${kept[kept.length - 1]} ${overflow}`, maxWidth, charWidth);
  return kept;
}
