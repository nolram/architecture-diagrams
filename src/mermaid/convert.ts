import type { DiagramSpec, DiagramNode, DiagramGroup, DiagramEdge } from "../spec/schema.js";
import { DEFAULT_WRAP_MAX_LINES } from "../util/text.js";
import { parseMermaid, MermaidError } from "./parser.js";
import type { MermaidModel, MermaidShape } from "./parser.js";

export interface ImportMermaidResult {
  /** a valid architecture spec, ready to render */
  spec: DiagramSpec;
  /** statements that were recognized but dropped (styling, click handlers, ...) */
  warnings: string[];
}

/** Mermaid shapes that render as a plain card (with a note) */
const CARD_SHAPES = new Set<MermaidShape>([
  "square",
  "rounded",
  "circle",
  "stadium",
  "asymmetric",
  "diamond",
  "hexagon",
  "subroutine",
  "parallelogram",
]);

/** reduce a node id / label to a valid spec id (letters, numbers, '-' or '_') */
function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** convert a parsed Mermaid flowchart model into an architecture spec */
export function convertModel(model: MermaidModel): ImportMermaidResult {
  const warnings: string[] = [];

  // --- groups (one per subgraph; nested via `parent`) ---
  const groups: DiagramGroup[] = [];
  for (const sg of model.subgraphs.values()) {
    groups.push({
      id: sg.id,
      label: sg.title || sg.id,
      style: "boundary",
      ...(sg.parent ? { parent: sg.parent } : {}),
    });
  }

  // --- nodes (and a mermaid-id -> spec-id map for the edges) ---
  const nodes: DiagramNode[] = [];
  const idOf = new Map<string, string>();
  const usedIds = new Set<string>();

  for (const node of model.nodes.values()) {
    let id = sanitizeId(node.id) || "node";
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}_${n}`)) n++;
      id = `${id}_${n}`;
    }
    usedIds.add(id);
    idOf.set(node.id, id);

    const shape = node.shape === "cylinder" ? "database" : "card";
    if (CARD_SHAPES.has(node.shape) && node.shape !== "square") {
      warnings.push(`Node "${node.id}" uses the Mermaid "${node.shape}" shape, which is rendered as a plain card.`);
    }

    const group = model.nodeSubgraph.get(node.id);
    nodes.push({
      id,
      label: node.label || node.id,
      category: shape === "database" ? "database" : "generic",
      shape,
      ...(group ? { group } : {}),
    });
  }

  // --- edges (deduplicated: Mermaid may state the same link twice) ---
  const edges: DiagramEdge[] = [];
  const seenEdges = new Set<string>();
  for (const e of model.edges) {
    const from = idOf.get(e.from);
    const to = idOf.get(e.to);
    if (!from || !to) continue;
    if (from === to) continue; // self-edges are not meaningful in the architecture spec
    const key = `${from}->${to}:${e.style}:${e.direction}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({
      from,
      to,
      style: e.style,
      direction: e.direction,
      ...(e.label ? { label: e.label } : {}),
    });
  }

  // --- direction ---
  let direction: "auto" | "right" | "down" = "auto";
  if (model.direction === "TD" || model.direction === "BT") direction = "down";
  else if (model.direction === "LR" || model.direction === "RL") direction = "right";

  // the schema requires at least one node; keep the empty case valid
  if (nodes.length === 0) {
    nodes.push({ id: "app", label: "Application", category: "generic", shape: "card" });
    warnings.push("The Mermaid diagram contained no nodes; a placeholder node was added.");
  }

  return {
    spec: {
      type: "architecture",
      version: "1",
      title: "Imported from Mermaid",
      theme: "clean-light",
      direction,
      wrap: { maxLines: DEFAULT_WRAP_MAX_LINES },
      nodes,
      groups,
      edges,
    },
    warnings,
  };
}

/** parse a Mermaid flowchart/graph source and convert it to an architecture spec */
export function importMermaid(text: string): ImportMermaidResult {
  const model = parseMermaid(text);

  const warnings = [...model.unsupported.map((s) => `Dropped unsupported statement (not importable): ${s}`)];

  const result = convertModel(model);
  return { spec: result.spec, warnings: [...warnings, ...result.warnings] };
}

export { MermaidError };
