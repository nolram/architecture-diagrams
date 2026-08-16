import type { DiagramSpec } from "../spec/schema.js";

/**
 * Decides `right` vs `down` when the spec asks for `direction: auto` (default).
 *
 * Heuristic: looks at the highest degree (fan-out or fan-in) of any node in
 * the graph. With `elk.direction: RIGHT`, nodes that share the same "layer"
 * end up stacked vertically within it -- a node with many parallel edges
 * (e.g. an API gateway connecting to 3+ services) forces a narrow, tall,
 * cramped layer. With `DOWN` those parallel edges become a horizontal row,
 * which accommodates fan-out/fan-in much better.
 *
 * Motivated by a real case: a gateway with out-degree 3 (orders/payments/
 * redis) produced overlapping cards with `right` and came out clean with `down`.
 */
export function resolveDirection(spec: DiagramSpec): "right" | "down" {
  if (spec.direction !== "auto") return spec.direction;

  // out-degree and in-degree are counted separately (not summed): a node
  // with 2 outputs and 1 input isn't the same kind of bottleneck as a node
  // with 3 outputs -- it's the largest isolated fan-out OR fan-in that
  // stretches an ELK layer.
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const edge of spec.edges) {
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const maxDegree = Math.max(0, ...outDegree.values(), ...inDegree.values());
  return maxDegree >= 3 ? "down" : "right";
}
