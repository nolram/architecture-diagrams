import { validateC4Spec, type C4Spec } from "./schema.js";
import { layoutC4 } from "./layout.js";
import { renderC4 } from "./render.js";
import type { DiagramEngine } from "../types.js";

export const c4Engine: DiagramEngine = {
  type: "c4",
  validate: validateC4Spec,
  layout: (spec) => layoutC4(spec as C4Spec),
  render: (spec, layout, baseDir) => renderC4(spec as C4Spec, layout, baseDir),
};

export * from "./schema.js";
export * from "./geometry.js";
export * from "./layout.js";
export * from "./legend.js";
export * from "./render.js";
