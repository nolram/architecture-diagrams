import type { DiagramEngine } from "./types.js";
import { architectureEngine } from "./architecture.js";
import { umlClassEngine } from "./uml-class/index.js";
import { c4Engine } from "./c4/index.js";

const engines: Record<string, DiagramEngine> = {
  architecture: architectureEngine,
  "uml-class": umlClassEngine,
  c4: c4Engine,
};

export function getEngine(type: string): DiagramEngine | undefined {
  return engines[type];
}

export function engineTypes(): string[] {
  return Object.keys(engines);
}

export function engineDescriptions(): Record<string, string> {
  return {
    architecture: "Components, boundaries (VPC/subnet), and connections with real brand icons.",
    "uml-class": "Classes with attributes/methods and the six UML relationship kinds (association, aggregation, composition, inheritance, dependency, realization).",
    c4: "System Context / Container / Component diagrams -- people, systems, external systems, containers, and components.",
  };
}
