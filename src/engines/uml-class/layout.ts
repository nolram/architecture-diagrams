import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api.js";
import type { UmlClassSpec } from "./schema.js";
import { estimateUmlClassSize } from "./geometry.js";
import { runElkLayout, type LayoutResult } from "../../layout/run-layout.js";

export interface BuiltUmlGraph {
  elkGraph: ElkNode;
  direction: "right" | "down";
}

/**
 * UML class diagrams read best top-down (superclass on top, subclass below),
 * so `auto` resolves to `down` -- unlike the architecture engine's fan-out
 * heuristic, which is tuned for infrastructure graphs. An explicit direction
 * always wins.
 */
function resolveUmlDirection(spec: UmlClassSpec): "right" | "down" {
  if (spec.direction !== "auto") return spec.direction;
  return "down";
}

export function buildUmlElkGraph(spec: UmlClassSpec): BuiltUmlGraph {
  const direction = resolveUmlDirection(spec);

  const children: ElkNode[] = spec.classes.map((cls) => {
    const size = estimateUmlClassSize(cls);
    return { id: cls.id, width: size.width, height: size.height };
  });

  const edges: ElkExtendedEdge[] = spec.relationships.map((rel, i) => ({
    // stable id = index of the relationship in spec.relationships, used to
    // reconnect computed routes back to the original spec at render time
    id: `edge_${i}`,
    sources: [rel.from],
    targets: [rel.to],
  }));

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction === "down" ? "DOWN" : "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "96",
      "elk.spacing.edgeNode": "32",
      "elk.layered.spacing.edgeNodeBetweenLayers": "32",
      "elk.spacing.edgeLabel": "12",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
    },
    children,
    edges: edges.length > 0 ? edges : undefined,
  };

  return { elkGraph, direction };
}

export async function layoutUmlClass(spec: UmlClassSpec): Promise<LayoutResult> {
  const { elkGraph, direction } = buildUmlElkGraph(spec);
  return runElkLayout(elkGraph, direction);
}
