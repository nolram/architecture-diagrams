import type { SpecValidationResult } from "../spec/index.js";
import type { LayoutResult } from "../layout/index.js";
import type { ComposeResult } from "../render/index.js";

/**
 * A diagram engine knows how to validate a raw spec, lay it out, and render it
 * to SVG. The spec parameter is `unknown` so each engine can carry its own spec
 * shape; engines cast internally to their concrete type.
 */
export interface DiagramEngine {
  type: string;
  validate(raw: unknown): SpecValidationResult;
  layout(spec: unknown): Promise<LayoutResult>;
  render(spec: unknown, layout: LayoutResult, baseDir: string): Promise<ComposeResult>;
}
