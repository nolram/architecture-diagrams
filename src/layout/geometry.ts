import type { DiagramNode } from "../spec/schema.js";

export const GROUP_PADDING = { top: 52, left: 28, bottom: 28, right: 28 };
const MIN_NODE_WIDTH = 190;
const MAX_NODE_WIDTH = 320;
const CHAR_WIDTH = 7.2;
const BASE_WIDTH = 96;
const NODE_HEIGHT_SIMPLE = 78;
const NODE_HEIGHT_WITH_SUBLABEL = 100;

export interface NodeSize {
  width: number;
  height: number;
}

export function estimateNodeSize(node: DiagramNode): NodeSize {
  const longest = Math.max(node.label.length, node.sublabel?.length ?? 0);
  const width = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, BASE_WIDTH + longest * CHAR_WIDTH));
  const height = node.sublabel ? NODE_HEIGHT_WITH_SUBLABEL : NODE_HEIGHT_SIMPLE;
  return { width, height };
}

export const EDGE_LABEL_HEIGHT = 20;
const EDGE_LABEL_CHAR_WIDTH = 6.4;
const EDGE_LABEL_PAD_X = 16;

export interface EdgeLabelSize {
  width: number;
  height: number;
}

/**
 * Tamanho estimado do pill de um label de edge. Usado tanto para informar o
 * ELK (que só reserva espaço entre edges paralelas se souber o tamanho do
 * label — sem isso os pills desenhados depois colidem) quanto para desenhar
 * o pill de verdade, garantindo que os dois usem exatamente o mesmo valor.
 */
export function estimateEdgeLabelSize(text: string): EdgeLabelSize {
  return { width: text.length * EDGE_LABEL_CHAR_WIDTH + EDGE_LABEL_PAD_X, height: EDGE_LABEL_HEIGHT };
}
