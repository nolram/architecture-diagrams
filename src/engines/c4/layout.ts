import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api.js";
import type { C4Relationship, C4Spec } from "./schema.js";
import { C4_DESC_CHAR_WIDTH, C4_NAME_CHAR_WIDTH, combineDescription, edgeLabelSize, estimateElementSize } from "./geometry.js";
import { runElkLayout, type LayoutResult } from "../../layout/run-layout.js";

export interface BuiltC4Graph {
  elkGraph: ElkNode;
  direction: "right" | "down";
}

/**
 * C4 diagrams read best left→right (person on the left, system in the middle,
 * external systems on the right), so `auto` resolves to `right` -- unlike the
 * architecture engine's fan-out heuristic. An explicit direction always wins.
 */
function resolveC4Direction(spec: C4Spec): "right" | "down" {
  return spec.direction === "down" ? "down" : "right";
}

/** container path (from root to immediate parent) for each element, used to find an edge's common ancestor */
function buildContainmentPaths(spec: C4Spec): Map<string, string[]> {
  const parentOf = new Map(spec.elements.map((el) => [el.id, el.group]));

  function pathFor(id: string): string[] {
    const parent = parentOf.get(id);
    return parent ? [...pathFor(parent), parent] : [];
  }

  const paths = new Map<string, string[]>();
  for (const el of spec.elements) {
    paths.set(el.id, pathFor(el.id));
  }
  return paths;
}

function commonPrefixContainer(pathA: string[], pathB: string[]): string | undefined {
  let i = 0;
  while (i < pathA.length && i < pathB.length && pathA[i] === pathB[i]) i++;
  return i > 0 ? pathA[i - 1] : undefined;
}

export function buildC4ElkGraph(spec: C4Spec): BuiltC4Graph {
  const direction = resolveC4Direction(spec);
  const containment = buildContainmentPaths(spec);
  const elementsById = new Map(spec.elements.map((el) => [el.id, el]));

  const childrenOf = new Map<string, string[]>();
  const topLevel: string[] = [];
  for (const el of spec.elements) {
    if (el.group) {
      const list = childrenOf.get(el.group) ?? [];
      list.push(el.id);
      childrenOf.set(el.group, list);
    } else {
      topLevel.push(el.id);
    }
  }

  const edgesByContainer = new Map<string | undefined, { rel: C4Relationship; specIndex: number }[]>();
  spec.relationships.forEach((rel, specIndex) => {
    const container = commonPrefixContainer(containment.get(rel.from) ?? [], containment.get(rel.to) ?? []);
    const list = edgesByContainer.get(container) ?? [];
    list.push({ rel, specIndex });
    edgesByContainer.set(container, list);
  });

  function toElkEdge({ rel, specIndex }: { rel: C4Relationship; specIndex: number }): ElkExtendedEdge {
    // Giving the label a width/height is what makes ELK reserve space between
    // parallel edges during routing -- without it, the pills drawn in the
    // final composition collide, because ELK didn't know it had to space the
    // edges apart.
    const text = combineDescription(rel.description, rel.technology);
    const labelSize = edgeLabelSize(rel, spec.wrap.maxLines);
    return {
      // stable id = index of the relationship in spec.relationships, used to
      // reconnect computed routes back to the original spec at render time
      id: `edge_${specIndex}`,
      sources: [rel.from],
      targets: [rel.to],
      labels: text && labelSize ? [{ text, width: labelSize.width, height: labelSize.height }] : undefined,
    };
  }

  function buildElementNode(id: string): ElkNode {
    const el = elementsById.get(id)!;
    const childIds = childrenOf.get(id) ?? [];
    const size = estimateElementSize(el, spec.wrap.maxLines, childIds.length > 0);
    if (childIds.length === 0) {
      return { id, width: size.width, height: size.height };
    }

    const edges = (edgesByContainer.get(id) ?? []).map(toElkEdge);
    // extra top padding leaves room for the boundary's title (and, when present,
    // its single-line description) so children never overlap the header text
    const hasDesc = combineDescription(el.description, el.technology).length > 0;
    const topPad = 44 + (hasDesc ? 18 : 0);
    // ELK sizes a container to its children + padding and would otherwise clip a
    // long title/description. Give it a minimum width matching the header text so
    // the box grows to fit its own name instead of truncating it (same approach as
    // the architecture engine). For DOWN layouts elkjs rotates the graph, so the
    // (width, height) minimum must be pre-swapped or it lands on the wrong axis.
    const minWidth =
      Math.max(
        el.name.length * C4_NAME_CHAR_WIDTH,
        combineDescription(el.description, el.technology).length * C4_DESC_CHAR_WIDTH,
      ) + 32;
    const minimumSize = direction === "down" ? `(0, ${minWidth})` : `(${minWidth}, 0)`;
    return {
      id,
      width: size.width,
      height: size.height,
      layoutOptions: {
        "elk.padding": `[top=${topPad},left=24,bottom=24,right=24]`,
        "elk.nodeSize.constraints": "MINIMUM_SIZE",
        "elk.nodeSize.minimum": minimumSize,
      },
      children: childIds.map(buildElementNode),
      edges: edges.length > 0 ? edges : undefined,
    };
  }

  const rootEdges = (edgesByContainer.get(undefined) ?? []).map(toElkEdge);

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction.toUpperCase(),
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "96",
      "elk.spacing.edgeNode": "32",
      "elk.layered.spacing.edgeNodeBetweenLayers": "32",
      "elk.spacing.edgeLabel": "12",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
    },
    children: topLevel.map(buildElementNode),
    edges: rootEdges.length > 0 ? rootEdges : undefined,
  };

  return { elkGraph, direction };
}

export async function layoutC4(spec: C4Spec): Promise<LayoutResult> {
  const { elkGraph, direction } = buildC4ElkGraph(spec);
  return runElkLayout(elkGraph, direction);
}
