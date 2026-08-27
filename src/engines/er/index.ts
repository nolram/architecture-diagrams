import { validateErSpec, type ErSpec } from "./schema.js";
import { layoutEr } from "./layout.js";
import { composeEr } from "./render.js";
import type { DiagramEngine } from "../types.js";

export const erEngine: DiagramEngine = {
  type: "er",
  validate: validateErSpec,
  layout: (spec) => layoutEr(spec as ErSpec),
  render: (spec, layout, baseDir) => composeEr(spec as ErSpec, layout, baseDir),
};

export * from "./schema.js";
export * from "./geometry.js";
export * from "./layout.js";
export * from "./render.js";
