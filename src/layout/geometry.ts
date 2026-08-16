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
