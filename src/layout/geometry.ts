import type { DiagramNode } from "../spec/schema.js";
import { wrapText, DEFAULT_WRAP_MAX_LINES } from "../util/text.js";

export const GROUP_PADDING = { top: 52, left: 28, bottom: 28, right: 28 };
const MIN_NODE_WIDTH = 190;
const MAX_NODE_WIDTH = 320;
const BASE_WIDTH = 96;
const NODE_HEIGHT_SIMPLE = 78;
const NODE_HEIGHT_WITH_SUBLABEL = 100;
/** vertical spacing between wrapped sublabel lines */
export const NODE_SUBLABEL_LINE_HEIGHT = 18;
/** icon badge geometry (shared by layout and render so the two always agree) */
export const NODE_BADGE_SIZE = 40;
export const NODE_BADGE_MARGIN = 14;
export const NODE_ICON_TEXT_GAP = 12;
/** extra height reserved for the database shape's elliptical "caps" (top + bottom) */
const CYLINDER_CAP_EXTRA = 24;

// Per-char width estimates below were calibrated by rendering sample text
// through resvg (our rasterizer, which pins the font to "Noto Sans"
// regardless of the SVG's declared font-family -- see export/png.ts) and
// measuring the actual pixel width of the result, with a few percent of
// headroom added on top. A single shared estimate used to be reused across
// every font-size/weight combo in the diagram, which silently underestimated
// the bold 15px node label (real ~9.0px/char, was using 7.2) -- that's what
// let long identifiers like "RemittanceTransferBankController" run past
// their card's edge instead of getting truncated.
/** node label: 15px, weight 600 */
export const NODE_LABEL_CHAR_WIDTH = 9.3;
/** node sublabel: 12px, regular */
export const NODE_SUBLABEL_CHAR_WIDTH = 7.4;

const ACTOR_MIN_WIDTH = 120;
const ACTOR_MAX_WIDTH = 200;
const ACTOR_BASE_WIDTH = 50;
const ACTOR_HEIGHT_SIMPLE = 108;
const ACTOR_HEIGHT_WITH_SUBLABEL = 128;
/** actor label: 14px, weight 600 */
export const ACTOR_LABEL_CHAR_WIDTH = 8.7;
/** actor sublabel: 11px, regular */
export const ACTOR_SUBLABEL_CHAR_WIDTH = 6.9;

export interface NodeSize {
  width: number;
  height: number;
}

export function estimateNodeSize(node: DiagramNode, maxLines = DEFAULT_WRAP_MAX_LINES): NodeSize {
  if (node.shape === "actor") {
    const width = Math.min(
      ACTOR_MAX_WIDTH,
      Math.max(ACTOR_MIN_WIDTH, ACTOR_BASE_WIDTH + node.label.length * ACTOR_LABEL_CHAR_WIDTH),
    );
    const actorTextMaxWidth = width;
    const sublabelLines = node.sublabel ? wrapText(node.sublabel, actorTextMaxWidth, ACTOR_SUBLABEL_CHAR_WIDTH, maxLines).length : 0;
    const baseHeight = node.sublabel ? ACTOR_HEIGHT_WITH_SUBLABEL : ACTOR_HEIGHT_SIMPLE;
    const height = baseHeight + (sublabelLines > 1 ? (sublabelLines - 1) * NODE_SUBLABEL_LINE_HEIGHT : 0);
    return { width, height };
  }

  // label and sublabel render at different sizes/weights (see the char-width
  // constants above), so the one with more characters isn't necessarily the
  // one that needs more pixels -- estimate each independently and let the
  // wider one drive the card's width.
  const labelWidth = node.label.length * NODE_LABEL_CHAR_WIDTH;
  const sublabelWidth = (node.sublabel?.length ?? 0) * NODE_SUBLABEL_CHAR_WIDTH;
  const width = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, BASE_WIDTH + Math.max(labelWidth, sublabelWidth)));
  const textMaxWidth = width - (NODE_BADGE_MARGIN + NODE_BADGE_SIZE + NODE_ICON_TEXT_GAP) - NODE_BADGE_MARGIN;
  const sublabelLines = node.sublabel ? wrapText(node.sublabel, textMaxWidth, NODE_SUBLABEL_CHAR_WIDTH, maxLines).length : 0;
  const baseHeight = node.sublabel ? NODE_HEIGHT_WITH_SUBLABEL : NODE_HEIGHT_SIMPLE;
  const height = (node.shape === "database" ? baseHeight + CYLINDER_CAP_EXTRA : baseHeight) + (sublabelLines > 1 ? (sublabelLines - 1) * NODE_SUBLABEL_LINE_HEIGHT : 0);
  return { width, height };
}

/** group title chip: bold, uppercased, letter-spaced text runs noticeably wider per char than regular body text */
export const GROUP_CHIP_CHAR_WIDTH = 7.8;
export const GROUP_CHIP_PAD_X = 12;
/** gap kept clear on each side of the chip so it never touches the group box's rounded corners/border */
export const GROUP_CHIP_MARGIN = 16;

/** width of the group's title chip if drawn without truncation, used both to size the chip itself and to give the group container a matching minimum width */
export function estimateGroupChipWidth(label: string): number {
  return label.toUpperCase().length * GROUP_CHIP_CHAR_WIDTH + GROUP_CHIP_PAD_X * 2;
}

export const EDGE_LABEL_HEIGHT = 20;
/** edge label: 11px, weight 600 */
const EDGE_LABEL_CHAR_WIDTH = 6.8;
const EDGE_LABEL_PAD_X = 16;

export interface EdgeLabelSize {
  width: number;
  height: number;
}

/**
 * Estimated size of an edge label's pill. Used both to inform ELK (which
 * only reserves space between parallel edges if it knows the label size --
 * without it the pills drawn later collide) and to draw the actual pill,
 * guaranteeing both use exactly the same value.
 */
export function estimateEdgeLabelSize(text: string): EdgeLabelSize {
  return { width: text.length * EDGE_LABEL_CHAR_WIDTH + EDGE_LABEL_PAD_X, height: EDGE_LABEL_HEIGHT };
}
