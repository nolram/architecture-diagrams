import type { DiagramEngine } from "./types.js";
import { architectureEngine } from "./architecture.js";
import { umlClassEngine } from "./uml-class/index.js";

const engines: Record<string, DiagramEngine> = {
  architecture: architectureEngine,
  "uml-class": umlClassEngine,
};

export function getEngine(type: string): DiagramEngine | undefined {
  return engines[type];
}

export function engineTypes(): string[] {
  return Object.keys(engines);
}
