import type { C4Element, C4Relationship } from "./schema.js";

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
 */
export function estimateElementSize(element: C4Element): C4ElementSize {
  if (element.type === "person") {
    const hasText = combineDescription(element.description, element.technology).length > 0;
    return { width: PERSON_SIZE.width, height: PERSON_SIZE.height + (hasText ? C4_DESC_LINE_HEIGHT : 0) };
  }

  const nameW = element.name.length * C4_NAME_CHAR_WIDTH;
  const descW = combineDescription(element.description, element.technology).length * C4_DESC_CHAR_WIDTH;
  const width = Math.min(C4_MAX_WIDTH, Math.max(C4_BASE_WIDTH, Math.max(nameW, descW) + C4_BOX_PAD_X * 2));
  const height = C4_BASE_HEIGHT + (descW > 0 ? C4_DESC_LINE_HEIGHT : 0);
  return { width, height };
}

export const C4_EDGE_LABEL_HEIGHT = 20;
/** edge label: 11px, weight 600 (same style as the architecture edge label) */
export const C4_EDGE_LABEL_CHAR_WIDTH = 6.8;
export const C4_EDGE_LABEL_PAD_X = 16;

export interface C4EdgeLabelSize {
  width: number;
  height: number;
}

/**
 * Estimated size of a relationship label's pill. Used to inform ELK (which
 * only reserves space between parallel edges if it knows the label size) and
 * as the fallback when drawing the pill at render time.
 */
export function edgeLabelSize(relationship: C4Relationship): C4EdgeLabelSize | null {
  const text = combineDescription(relationship.description, relationship.technology);
  if (text.length === 0) return null;
  return { width: text.length * C4_EDGE_LABEL_CHAR_WIDTH + C4_EDGE_LABEL_PAD_X, height: C4_EDGE_LABEL_HEIGHT };
}
