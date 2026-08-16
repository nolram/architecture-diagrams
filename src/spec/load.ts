import { parse as parseYaml } from "yaml";
import { validateSpec, type SpecValidationResult } from "./schema.js";

export function loadSpecFromText(text: string): SpecValidationResult {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    return {
      ok: false,
      errors: [{ path: "", message: `Invalid YAML: ${(err as Error).message}` }],
    };
  }
  return validateSpec(raw);
}
