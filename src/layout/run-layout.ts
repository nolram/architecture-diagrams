import ElkCtorImport from "elkjs";
import type { ELK as ElkApi, ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api.js";

// elkjs é um pacote CJS/UMD sem "exports" no package.json; sob moduleResolution
// NodeNext o TS infere o default import como o namespace do módulo em vez do
// construtor. O cast abaixo contorna essa divergência entre os .d.ts e o runtime real.
const ElkCtor = ElkCtorImport as unknown as new () => ElkApi;
import type { DiagramSpec } from "../spec/schema.js";
import { buildElkGraph } from "./build-graph.js";

export interface AbsoluteBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeRoute {
  id: string;
  points: { x: number; y: number }[];
  /** canto superior-esquerdo do box reservado pelo ELK para o label (não o centro) */
  labelPosition?: { x: number; y: number };
  labelSize?: { width: number; height: number };
}

export interface LayoutResult {
  width: number;
  height: number;
  /** direção efetivamente usada (já resolvida, mesmo quando a spec pediu "auto") */
  direction: "right" | "down";
  nodes: Map<string, AbsoluteBox>;
  groups: Map<string, AbsoluteBox>;
  edges: Map<string, EdgeRoute>;
}

const elk = new ElkCtor();

export async function layoutSpec(spec: DiagramSpec): Promise<LayoutResult> {
  const { elkGraph, direction } = buildElkGraph(spec);
  const laidOut = (await elk.layout(elkGraph)) as ElkNode;

  const nodes = new Map<string, AbsoluteBox>();
  const groups = new Map<string, AbsoluteBox>();
  const containerOffsets = new Map<string, { x: number; y: number }>();
  const allEdges: ElkExtendedEdge[] = [];

  containerOffsets.set("root", { x: 0, y: 0 });

  function walk(node: ElkNode, parentAbsX: number, parentAbsY: number) {
    const absX = parentAbsX + (node.x ?? 0);
    const absY = parentAbsY + (node.y ?? 0);
    const isContainer = Array.isArray(node.children);

    if (isContainer && node.id !== "root") {
      groups.set(node.id, { id: node.id, x: absX, y: absY, width: node.width ?? 0, height: node.height ?? 0 });
      containerOffsets.set(node.id, { x: absX, y: absY });
    } else if (!isContainer) {
      nodes.set(node.id, { id: node.id, x: absX, y: absY, width: node.width ?? 0, height: node.height ?? 0 });
    }

    if (node.edges) allEdges.push(...node.edges);
    for (const child of node.children ?? []) {
      walk(child, absX, absY);
    }
  }

  walk(laidOut, 0, 0);

  const edges = new Map<string, EdgeRoute>();
  for (const edge of allEdges) {
    const containerId = edge.container ?? "root";
    const offset = containerOffsets.get(containerId) ?? { x: 0, y: 0 };
    const points: { x: number; y: number }[] = [];
    for (const section of edge.sections ?? []) {
      points.push({ x: section.startPoint.x + offset.x, y: section.startPoint.y + offset.y });
      for (const bend of section.bendPoints ?? []) {
        points.push({ x: bend.x + offset.x, y: bend.y + offset.y });
      }
      points.push({ x: section.endPoint.x + offset.x, y: section.endPoint.y + offset.y });
    }
    const label = edge.labels?.[0];
    const labelPosition =
      label && label.x !== undefined && label.y !== undefined
        ? { x: label.x + offset.x, y: label.y + offset.y }
        : undefined;
    const labelSize =
      label && label.width !== undefined && label.height !== undefined
        ? { width: label.width, height: label.height }
        : undefined;
    edges.set(edge.id, { id: edge.id, points, labelPosition, labelSize });
  }

  return {
    width: laidOut.width ?? 0,
    height: laidOut.height ?? 0,
    direction,
    nodes,
    groups,
    edges,
  };
}
