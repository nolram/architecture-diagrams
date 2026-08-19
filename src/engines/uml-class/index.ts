import { validateUmlClassSpec, type UmlClassSpec } from "./schema.js";
import { layoutUmlClass } from "./layout.js";
import { composeUmlClass } from "./render.js";
import type { DiagramEngine } from "../types.js";

export const umlClassEngine: DiagramEngine = {
  type: "uml-class",
  validate: validateUmlClassSpec,
  layout: (spec) => layoutUmlClass(spec as UmlClassSpec),
  render: (spec, layout, baseDir) => composeUmlClass(spec as UmlClassSpec, layout, baseDir),
};

export * from "./schema.js";
export * from "./geometry.js";
export * from "./layout.js";
export * from "./render.js";
