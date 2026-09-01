import type { C4Element, C4Relationship } from "./schema.js";
import { wrapText } from "../../util/text.js";

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
/**
 * Generous width ceiling so C4 boxes grow to fit their text (names on one line,
 * descriptions wrapped) instead of truncating -- C4 diagrams carry real
 * descriptions. Still capped so a single very long string cannot blow up the
 * layout; overflow beyond the cap wraps and is folded at `wrap.maxLines`.
 */
export const C4_MAX_WIDTH = 480;
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
/** horizontal padding kept on each side of a person's name/description text */
export const PERSON_PAD_X = 8;

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
    // the person box grows to fit its name on one line (a person is the actor,
    // its name should never be truncated). It also grows (up to the shared
    // C4_MAX_WIDTH cap) so the description wraps to at most `maxLines` lines
    // instead of being truncated -- a person carries the same real descriptions
    // as a card, so it gets the same room to hold them.
    const nameWidth = element.name.length * C4_NAME_CHAR_WIDTH + PERSON_PAD_X * 2;
    if (!desc) return { width: Math.max(PERSON_SIZE.width, nameWidth), height: PERSON_SIZE.height };

    let width = Math.max(PERSON_SIZE.width, nameWidth);
    // wrapText clamps to maxLines (folding overflow into an ellipsis), so detect
    // truncation by the ellipsis and widen the box until the description fits
    // whole within maxLines -- or until the shared C4_MAX_WIDTH cap is reached.
    let lines = wrapText(desc, width - PERSON_PAD_X * 2, C4_DESC_CHAR_WIDTH, maxLines);
    while (lines.some((l) => l.includes("…")) && width < C4_MAX_WIDTH) {
      width += 16;
      lines = wrapText(desc, width - PERSON_PAD_X * 2, C4_DESC_CHAR_WIDTH, maxLines);
    }
    return { width, height: PERSON_SIZE.height + lines.length * C4_DESC_LINE_HEIGHT };
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
