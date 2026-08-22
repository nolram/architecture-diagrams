import type { IconCategory } from "../icons/catalog.js";
import type { DiagramSpec } from "../spec/schema.js";

/** the node shapes the architecture schema allows */
export type NodeShape = "card" | "database" | "actor" | "cloud";

/** how confident we are in a detection (so an LLM/user can prune) */
export type Confidence = "high" | "medium" | "low";

/** a single detected technology, with the evidence that produced it */
export interface DetectedTech {
  /** canonical technology name, e.g. "postgres", "redis", "express" */
  tech: string;
  /** a valid icon catalog key, e.g. "brand:postgresql" */
  iconKey: string;
  category: IconCategory;
  shape: NodeShape;
  confidence: Confidence;
  /** where the evidence came from, e.g. "package.json:dependencies.pg" or "docker-compose.yml:services.db.image" */
  source: string;
  /** a hint for the LLM: this tech likely talks to another detected tech (e.g. "web" suggests an edge to "api") */
  suggestsEdge?: string;
}

/** the result of analyzing a codebase: the detected stack + a renderable draft spec */
export interface DetectionResult {
  /** the detected stack, with evidence (for an LLM/user to refine) */
  detected: DetectedTech[];
  /** a valid architecture spec, ready to render */
  draftSpec: DiagramSpec;
  /** ambiguous / low-confidence items, for the LLM/user */
  warnings: string[];
}
