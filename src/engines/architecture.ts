import { validateSpec, type DiagramSpec } from "../spec/index.js";
import { layoutSpec } from "../layout/index.js";
import { composeDiagram } from "../render/index.js";
import type { DiagramEngine } from "./types.js";

export const architectureEngine: DiagramEngine = {
  type: "architecture",
  validate: validateSpec,
  layout: (spec) => layoutSpec(spec as DiagramSpec),
  render: (spec, layout, baseDir) => composeDiagram(spec as DiagramSpec, layout, baseDir),
};
