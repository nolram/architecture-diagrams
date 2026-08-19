import type { UmlAttribute, UmlClass, UmlMethod, UmlVisibility } from "./schema.js";

// Per-char width estimates, calibrated the same way as src/layout/geometry.ts
// (render sample text through resvg, which pins "Noto Sans", and measure the
// actual pixel width, adding a few percent of headroom).
/** class name: 15px, weight 600 (same style as the architecture node label) */
export const UML_NAME_CHAR_WIDTH = 9.3;
/** stereotype «...»: 11px, italic */
export const UML_STEREOTYPE_CHAR_WIDTH = 6.5;
/** attribute/method lines: 12px, regular (same style as the architecture sublabel) */
export const UML_MEMBER_CHAR_WIDTH = 7.4;
/** edge role/multiplicity labels: 10px, regular */
export const UML_EDGE_LABEL_CHAR_WIDTH = 6.2;

export const UML_LINE_HEIGHT = 20;
export const UML_COMPARTMENT_PAD = 10;
export const UML_BOX_PAD_X = 12;
export const UML_MIN_WIDTH = 120;

export function visibilitySymbol(v: UmlVisibility): string {
  switch (v) {
    case "public":
      return "+";
    case "private":
      return "-";
    case "protected":
      return "#";
    case "package":
      return "~";
  }
}

/** the exact text drawn for an attribute line, shared by the estimator and the renderer */
export function attributeLine(a: UmlAttribute): string {
  const type = a.type ? `: ${a.type}` : "";
  return `${visibilitySymbol(a.visibility)} ${a.name}${type}`;
}

/** the exact text drawn for a method line, shared by the estimator and the renderer */
export function methodLine(m: UmlMethod): string {
  // UML keeps the parentheses even for a parameterless method: "validate(): boolean"
  const params = m.params ? `(${m.params})` : "()";
  const ret = m.return ? `: ${m.return}` : "";
  return `${visibilitySymbol(m.visibility)} ${m.name}${params}${ret}`;
}

export interface UmlClassSize {
  width: number;
  height: number;
}

export function nameCompartmentHeight(stereotype?: string): number {
  const lines = stereotype ? 2 : 1;
  return lines * UML_LINE_HEIGHT + UML_COMPARTMENT_PAD * 2;
}

export function memberCompartmentHeight(count: number): number {
  return count * UML_LINE_HEIGHT + UML_COMPARTMENT_PAD * 2;
}

/**
 * Sizes a class box from its members. This is the single source of truth for a
 * class's (width, height): the layout passes it to ELK and the renderer uses
 * the same constants to place compartments, so the two always agree.
 */
export function estimateUmlClassSize(cls: UmlClass): UmlClassSize {
  const nameW = cls.name.length * UML_NAME_CHAR_WIDTH;
  const stereoW = cls.stereotype ? (cls.stereotype.length + 4) * UML_STEREOTYPE_CHAR_WIDTH : 0;
  let maxMemberW = 0;
  for (const a of cls.attributes ?? []) maxMemberW = Math.max(maxMemberW, attributeLine(a).length * UML_MEMBER_CHAR_WIDTH);
  for (const m of cls.methods ?? []) maxMemberW = Math.max(maxMemberW, methodLine(m).length * UML_MEMBER_CHAR_WIDTH);
  const width = Math.max(UML_MIN_WIDTH, Math.max(nameW, stereoW, maxMemberW) + UML_BOX_PAD_X * 2);

  let height = nameCompartmentHeight(cls.stereotype);
  if ((cls.attributes?.length ?? 0) > 0) height += memberCompartmentHeight(cls.attributes!.length);
  if ((cls.methods?.length ?? 0) > 0) height += memberCompartmentHeight(cls.methods!.length);
  return { width, height };
}
