import { validateUmlSequenceSpec, type UmlSequenceSpec } from "./schema.js";
import { layoutUmlSequence, type SequenceLayout } from "./layout.js";
import { composeUmlSequence } from "./render.js";
import type { DiagramEngine } from "../types.js";

export const umlSequenceEngine: DiagramEngine = {
  type: "uml-sequence",
  validate: validateUmlSequenceSpec,
  layout: (spec) => layoutUmlSequence(spec as UmlSequenceSpec),
  render: (spec, layout, baseDir) => composeUmlSequence(spec as UmlSequenceSpec, layout as SequenceLayout, baseDir),
};

export * from "./schema.js";
export * from "./geometry.js";
export * from "./layout.js";
export * from "./render.js";
