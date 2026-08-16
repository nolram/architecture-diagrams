import type { DiagramNode } from "../spec/schema.js";

export const GROUP_PADDING = { top: 52, left: 28, bottom: 28, right: 28 };
const MIN_NODE_WIDTH = 190;
const MAX_NODE_WIDTH = 320;
const CHAR_WIDTH = 7.2;
const BASE_WIDTH = 96;
const NODE_HEIGHT_SIMPLE = 78;
const NODE_HEIGHT_WITH_SUBLABEL = 100;
/** altura extra reservada para as "tampas" elípticas do shape database (topo + base) */
const CYLINDER_CAP_EXTRA = 24;

const ACTOR_MIN_WIDTH = 120;
const ACTOR_MAX_WIDTH = 200;
const ACTOR_CHAR_WIDTH = 6.8;
const ACTOR_BASE_WIDTH = 50;
const ACTOR_HEIGHT_SIMPLE = 108;
const ACTOR_HEIGHT_WITH_SUBLABEL = 128;

export interface NodeSize {
  width: number;
  height: number;
}

export function estimateNodeSize(node: DiagramNode): NodeSize {
  if (node.shape === "actor") {
    const width = Math.min(
      ACTOR_MAX_WIDTH,
      Math.max(ACTOR_MIN_WIDTH, ACTOR_BASE_WIDTH + node.label.length * ACTOR_CHAR_WIDTH),
    );
    const height = node.sublabel ? ACTOR_HEIGHT_WITH_SUBLABEL : ACTOR_HEIGHT_SIMPLE;
    return { width, height };
  }

  const longest = Math.max(node.label.length, node.sublabel?.length ?? 0);
  const width = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, BASE_WIDTH + longest * CHAR_WIDTH));
  const baseHeight = node.sublabel ? NODE_HEIGHT_WITH_SUBLABEL : NODE_HEIGHT_SIMPLE;
  const height = node.shape === "database" ? baseHeight + CYLINDER_CAP_EXTRA : baseHeight;
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
