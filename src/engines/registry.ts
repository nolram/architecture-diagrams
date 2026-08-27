import type { DiagramEngine } from "./types.js";
import { architectureEngine } from "./architecture.js";
import { umlClassEngine } from "./uml-class/index.js";
import { umlSequenceEngine } from "./uml-sequence/index.js";
import { c4Engine } from "./c4/index.js";
import { erEngine } from "./er/index.js";

const engines: Record<string, DiagramEngine> = {
  architecture: architectureEngine,
  "uml-class": umlClassEngine,
  "uml-sequence": umlSequenceEngine,
  c4: c4Engine,
  er: erEngine,
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
    "uml-sequence": "UML sequence diagrams -- participants (objects or actors), synchronous/asynchronous/reply/self messages, activation bars, and alt/loop/opt/par fragments.",
    c4: "System Context / Container / Component diagrams -- people, systems, external systems, containers, and components.",
    er: "Entity-relationship diagrams -- entities with attributes (PK/FK), weak entities, and crow's-foot relationships (one / zero-or-one / many / zero-or-many).",
  };
}
