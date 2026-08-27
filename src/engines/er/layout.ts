import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api.js";
import type { ErSpec } from "./schema.js";
import { estimateEntitySize, erEdgeLabelSize } from "./geometry.js";
import { runElkLayout, type LayoutResult } from "../../layout/run-layout.js";

export interface BuiltErGraph {
  elkGraph: ElkNode;
  direction: "right" | "down";
}

/**
 * ER diagrams read best top-down (parent entity on top, dependent below),
 * so `auto` resolves to `down` -- unlike the architecture engine's fan-out
 * heuristic, which is tuned for infrastructure graphs. An explicit direction
 * always wins.
 */
function resolveErDirection(spec: ErSpec): "right" | "down" {
  if (spec.direction !== "auto") return spec.direction;
  return "down";
}

export function buildErElkGraph(spec: ErSpec): BuiltErGraph {
  const direction = resolveErDirection(spec);

  const children: ElkNode[] = spec.entities.map((ent) => {
    const size = estimateEntitySize(ent);
    return { id: ent.id, width: size.width, height: size.height };
  });

  const edges: ElkExtendedEdge[] = spec.relationships.map((rel, i) => ({
    // stable id = index of the relationship in spec.relationships, used to
    // reconnect computed routes back to the original spec at render time
    id: `edge_${i}`,
    sources: [rel.from],
    targets: [rel.to],
    // Giving the label a width/height is what makes ELK reserve space between
    // parallel edges during routing -- without it, edges between the same pair
    // of entities are stacked 24px apart and the pills drawn in the final
    // composition collide (the renderer draws them at ELK's reserved box).
    labels: rel.label ? [{ text: rel.label, ...erEdgeLabelSize(rel.label) }] : undefined,
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

export async function layoutEr(spec: ErSpec): Promise<LayoutResult> {
  const { elkGraph, direction } = buildErElkGraph(spec);
  return runElkLayout(elkGraph, direction);
}
