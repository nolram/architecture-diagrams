import type { C4Element, C4Relationship } from "./schema.js";
import { wrapText } from "../../render/svg-utils.js";

export type C4ElementKind = C4Element["type"];

export interface C4ElementSize {
  width: number;
  height: number;
}

// Per-char width estimates, calibrated the same way as src/layout/geometry.ts
// (render sample text through resvg, which pins "Noto Sans", and measure the
// actual pixel width, adding a few percent of headroom).
/** element name: 15px, weight 600 (same style as the architecture node label) */
export const C4_NAME_CHAR_WIDTH = 9.3;
/** description line: 12px, regular (same style as the architecture sublabel) */
export const C4_DESC_CHAR_WIDTH = 7.4;

export const C4_BASE_WIDTH = 220;
export const C4_BASE_HEIGHT = 64;
export const C4_MAX_WIDTH = 320;
export const C4_DESC_LINE_HEIGHT = 18;
export const C4_BOX_PAD_X = 12;

// Icon badge geometry (mirrors the architecture family's node-card badge).
export const C4_ICON_BADGE_SIZE = 40;
export const C4_ICON_BADGE_MARGIN = 14;
export const C4_ICON_TEXT_GAP = 12;
/** horizontal space the icon badge + its margins consume on the left of a card */
export const C4_ICON_SPACE = C4_ICON_BADGE_MARGIN + C4_ICON_BADGE_SIZE + C4_ICON_TEXT_GAP;

/** the person silhouette box (head + shoulders + the name below) */
export const PERSON_SIZE = { width: 96, height: 120 };

/** C4 convention: technology is rendered in parentheses after the description */
export function combineDescription(description?: string, technology?: string): string {
  if (description && technology) return `${description} (${technology})`;
  if (description) return description;
  if (technology) return technology;
  return "";
}

/**
 * Sizes an element box from its text. This is the single source of truth for
 * an element's (width, height): the layout passes it to ELK and the renderer
 * uses the same constants to place the text, so the two always agree.
 *
 * The description is wrapped to fit the box width (capped at `maxLines`), so
 * long descriptions grow the box's height instead of being truncated.
 */
export function estimateElementSize(element: C4Element, maxLines = 4, isBoundary = false): C4ElementSize {
  if (element.type === "person") {
    const desc = combineDescription(element.description, element.technology);
    if (!desc) return { width: PERSON_SIZE.width, height: PERSON_SIZE.height };
    const lines = wrapText(desc, PERSON_SIZE.width - 16, C4_DESC_CHAR_WIDTH, maxLines);
    return { width: PERSON_SIZE.width, height: PERSON_SIZE.height + lines.length * C4_DESC_LINE_HEIGHT };
  }

  // a boundary renders a title, not a badge, so its icon (if any) is ignored and
  // must not reserve the badge's width
  const hasIcon = Boolean(element.icon) && !isBoundary;
  const iconSpace = hasIcon ? C4_ICON_SPACE : 0;
  const nameW = element.name.length * C4_NAME_CHAR_WIDTH;
  const desc = combineDescription(element.description, element.technology);
  const descW = desc.length * C4_DESC_CHAR_WIDTH;
  const width = Math.min(
    C4_MAX_WIDTH,
    Math.max(C4_BASE_WIDTH, Math.max(nameW, descW) + C4_BOX_PAD_X * 2 + iconSpace),
  );
  const textMaxWidth = width - C4_BOX_PAD_X * 2 - iconSpace;
  const descLines = desc ? wrapText(desc, textMaxWidth, C4_DESC_CHAR_WIDTH, maxLines).length : 0;
  const height = C4_BASE_HEIGHT + descLines * C4_DESC_LINE_HEIGHT;
  return { width, height };
}

/** edge label: 11px, weight 600 (same style as the architecture edge label) */
export const C4_EDGE_LABEL_CHAR_WIDTH = 6.8;
export const C4_EDGE_LABEL_PAD_X = 16;
export const C4_EDGE_LABEL_LINE_HEIGHT = 16;
export const C4_EDGE_LABEL_PAD_Y = 4;
/** maximum label width before the text wraps onto additional lines */
export const C4_EDGE_LABEL_MAX_WIDTH = 200;

export interface C4EdgeLabelSize {
  width: number;
  height: number;
}

/**
 * Estimated size of a relationship label's pill. Used to inform ELK (which
 * only reserves space between parallel edges if it knows the label size) and
 * as the fallback when drawing the pill at render time.
 *
 * The label text is wrapped to fit `C4_EDGE_LABEL_MAX_WIDTH` (capped at
 * `maxLines`), so long labels grow the pill's height instead of being
 * truncated.
 */
export function edgeLabelSize(relationship: C4Relationship, maxLines = 4): C4EdgeLabelSize | null {
  const text = combineDescription(relationship.description, relationship.technology);
  if (text.length === 0) return null;
  const lines = wrapText(text, C4_EDGE_LABEL_MAX_WIDTH, C4_EDGE_LABEL_CHAR_WIDTH, maxLines);
  const maxLineLen = Math.max(...lines.map((line) => line.length));
  return {
    width: maxLineLen * C4_EDGE_LABEL_CHAR_WIDTH + C4_EDGE_LABEL_PAD_X,
    height: lines.length * C4_EDGE_LABEL_LINE_HEIGHT + C4_EDGE_LABEL_PAD_Y,
  };
}
