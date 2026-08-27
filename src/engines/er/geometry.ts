import type { ErAttribute, ErEntity } from "./schema.js";

// Per-char width estimates, calibrated the same way as src/layout/geometry.ts
// (render sample text through resvg, which pins "Noto Sans", and measure the
// actual pixel width, adding a few percent of headroom).
/** entity name: 15px, weight 600 (same style as the UML class name) */
export const ER_NAME_CHAR_WIDTH = 9.3;
/** attribute lines: 12px, regular (same style as the UML member lines) */
export const ER_ATTRIBUTE_CHAR_WIDTH = 7.4;
/** relationship labels: 10px, regular */
export const ER_EDGE_LABEL_CHAR_WIDTH = 6.2;
/** horizontal padding inside a relationship label pill (each side) */
export const ER_EDGE_LABEL_PAD_X = 12;
/** height of a relationship label pill */
export const ER_EDGE_LABEL_HEIGHT = 16;

export interface ErEdgeLabelSize {
  width: number;
  height: number;
}

/**
 * Estimated size of a relationship label's pill. This is the single source of
 * truth: the layout passes it to ELK (which then reserves space between
 * parallel edges so their pills don't collide) and the renderer draws the pill
 * at exactly that size, so the two always agree.
 */
export function erEdgeLabelSize(text: string): ErEdgeLabelSize {
  return { width: text.length * ER_EDGE_LABEL_CHAR_WIDTH + ER_EDGE_LABEL_PAD_X, height: ER_EDGE_LABEL_HEIGHT };
}

export const ER_LINE_HEIGHT = 20;
export const ER_COMPARTMENT_PAD = 10;
export const ER_BOX_PAD_X = 12;
export const ER_MIN_WIDTH = 120;

/** width budget for the PK/FK badge pill + its gap, added to key attribute lines */
export const ER_KEY_BADGE_EXTRA = 28;

/** the exact text drawn for an attribute line, shared by the estimator and the renderer */
export function erAttributeLine(a: ErAttribute): string {
  const type = a.type ? `: ${a.type}` : "";
  return `${a.name}${type}`;
}

export interface ErEntitySize {
  width: number;
  height: number;
}

export function erNameCompartmentHeight(): number {
  return ER_LINE_HEIGHT + ER_COMPARTMENT_PAD * 2;
}

export function erAttributeCompartmentHeight(count: number): number {
  return count * ER_LINE_HEIGHT + ER_COMPARTMENT_PAD * 2;
}

/**
 * Sizes an entity box from its attributes. This is the single source of truth
 * for an entity's (width, height): the layout passes it to ELK and the renderer
 * uses the same constants to place compartments, so the two always agree. Weak
 * entities render a double border drawn inside the box, so `weak` does not
 * change the size.
 */
export function estimateEntitySize(entity: ErEntity): ErEntitySize {
  const nameW = entity.name.length * ER_NAME_CHAR_WIDTH;
  let maxAttrW = 0;
  for (const a of entity.attributes ?? []) {
    maxAttrW = Math.max(maxAttrW, erAttributeLine(a).length * ER_ATTRIBUTE_CHAR_WIDTH + (a.key ? ER_KEY_BADGE_EXTRA : 0));
  }
  const width = Math.max(ER_MIN_WIDTH, Math.max(nameW, maxAttrW) + ER_BOX_PAD_X * 2);

  let height = erNameCompartmentHeight();
  if ((entity.attributes?.length ?? 0) > 0) height += erAttributeCompartmentHeight(entity.attributes!.length);
  return { width, height };
}
