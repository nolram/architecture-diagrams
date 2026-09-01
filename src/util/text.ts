// Shared text-measurement helpers used by both the layout layer (to reserve
// space) and the render layer (to place text). Kept dependency-free so any
// layer can import them without inverting the spec -> layout -> render
// separation.

/** default maximum number of wrapped lines before overflow is folded into an ellipsis */
export const DEFAULT_WRAP_MAX_LINES = 6;

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

/** memoization cache for wrapText, keyed by the four arguments */
const wrapTextCache = new Map<string, string[]>();

/**
 * Drops every memoized wrap result. The cache is process-lifetime and unbounded,
 * so long-lived hosts (the MCP server, `render --watch`) must clear it once per
 * render to keep it from growing with every distinct sublabel ever seen. The
 * within-a-render benefit is unaffected: the layout pass warms the cache and the
 * render pass hits it.
 */
export function clearWrapTextCache(): void {
  wrapTextCache.clear();
}

/**
 * Wraps `text` into lines that each fit within `maxWidth` px (estimated via
 * `charWidth`), breaking on word boundaries. If the result exceeds `maxLines`,
 * the overflow is folded into the last line and truncated with an ellipsis.
 * Returns an empty array for blank input. Results are memoized per argument set.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  charWidth: number,
  maxLines: number,
): string[] {
  const key = `${text}\u0000${maxWidth}\u0000${charWidth}\u0000${maxLines}`;
  const cached = wrapTextCache.get(key);
  if (cached) return [...cached];

  const trimmed = text.trim();
  if (!trimmed) {
    wrapTextCache.set(key, []);
    return [];
  }
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

  let result: string[];
  if (clamped.length <= maxLines) {
    result = clamped;
  } else {
    const kept = clamped.slice(0, maxLines);
    const overflow = clamped.slice(maxLines).join(" ");
    kept[kept.length - 1] = truncateToWidth(`${kept[kept.length - 1]} ${overflow}`, maxWidth, charWidth);
    result = kept;
  }
  wrapTextCache.set(key, result);
  return [...result];
}
