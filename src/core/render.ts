import { getEngine, engineTypes } from "../engines/index.js";
import type { DiagramEngine } from "../engines/index.js";
import type { SpecValidationError } from "../spec/schema.js";
import { svgToPng, svgToPdf } from "../export/index.js";
import { parse } from "yaml";
import process from "node:process";

export function readType(raw: unknown): string {
  if (typeof raw === "object" && raw !== null && "type" in raw) {
    const t = (raw as { type: unknown }).type;
    if (typeof t === "string") return t;
  }
  return "architecture";
}

export class SpecError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function formatErrors(errors: SpecValidationError[]): string {
  return errors.map((e) => `  - ${e.path ? `[${e.path}] ` : ""}${e.message}`).join("\n");
}

export type ValidateSpecTextResult =
  | { ok: true; engine: DiagramEngine; spec: unknown }
  | { ok: false; errors: SpecValidationError[] };

export function validateSpecText(specText: string): ValidateSpecTextResult {
  let raw: unknown;
  try {
    raw = parse(specText);
  } catch (err) {
    return { ok: false, errors: [{ path: "", message: `Invalid YAML: ${(err as Error).message}` }] };
  }

  const type = readType(raw);
  const engine = getEngine(type);
  if (!engine) {
    return {
      ok: false,
      errors: [{ path: "type", message: `unknown diagram type "${type}". Allowed types: ${engineTypes().join(", ")}` }],
    };
  }

  const result = engine.validate(raw);
  if (!result.ok) return { ok: false, errors: result.errors };

  return { ok: true, engine, spec: result.spec };
}

export interface RenderSpecOptions {
  png?: boolean;
  pdf?: boolean;
  scale?: number;
  baseDir?: string;
}

export interface RenderSpecResult {
  svg: string;
  png?: Buffer;
  pdf?: Buffer;
  warnings: string[];
  direction: "right" | "down";
  directionAuto: boolean;
}

export async function renderSpec(specText: string, opts: RenderSpecOptions = {}): Promise<RenderSpecResult> {
  const v = validateSpecText(specText);
  if (!v.ok) throw new SpecError(formatErrors(v.errors));

  const layout = await v.engine.layout(v.spec);
  const { svg, warnings } = await v.engine.render(v.spec, layout, opts.baseDir ?? process.cwd());
  const scale = opts.scale ?? 2;
  const png = opts.png ? svgToPng(svg, scale) : undefined;
  const pdf = opts.pdf ? await svgToPdf(svg, scale) : undefined;
  const directionAuto = (v.spec as { direction?: string }).direction === "auto";
  return { svg, png, pdf, warnings, direction: layout.direction, directionAuto };
}
