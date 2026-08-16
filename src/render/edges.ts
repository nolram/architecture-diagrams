import type { DiagramEdge } from "../spec/schema.js";
import type { EdgeRoute } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import { escapeXml } from "./svg-utils.js";

interface Point {
  x: number;
  y: number;
}

const ARROW_LENGTH = 8;
const ARROW_HALF_WIDTH = 3.5;

function angleDeg(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/**
 * Draws an arrowhead as a manually rotated triangle instead of an SVG
 * `<marker orient="auto-start-reverse">`. resvg (our rasterizer) mis-orients
 * markers on multi-segment paths -- it derives the rotation from some blend
 * of the whole path instead of the true tangent of the final segment, so an
 * orthogonally-routed edge that ends going straight down could render its
 * arrowhead pointing sideways. Confirmed with a minimal repro before
 * concluding this was a resvg limitation rather than a bug in our path data.
 * Computing the angle ourselves from the actual last segment sidesteps it.
 */
function renderArrowhead(tip: Point, angle: number, color: string): string {
  return `<path d="M${-ARROW_LENGTH},${-ARROW_HALF_WIDTH} L0,0 L${-ARROW_LENGTH},${ARROW_HALF_WIDTH} Z" fill="${color}" transform="translate(${tip.x} ${tip.y}) rotate(${angle})"/>`;
}

export function renderEdge(edge: DiagramEdge, route: EdgeRoute, theme: Theme): string {
  const points = route.points;
  if (points.length < 2) return "";

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const dash = edge.style === "dashed" ? ' stroke-dasharray="7 5"' : "";
  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="2"${dash}/>`;

  let arrows = "";
  if (edge.direction !== "none") {
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    arrows += renderArrowhead(last, angleDeg(secondLast, last), theme.edgeColor);
  }
  if (edge.direction === "bidirectional") {
    const first = points[0];
    const second = points[1];
    arrows += renderArrowhead(first, angleDeg(second, first), theme.edgeColor);
  }

  if (!edge.label || !route.labelPosition || !route.labelSize) return path + arrows;

  // route.labelPosition is the top-left corner of the box ELK itself reserved
  // for this label (based on the same estimated size it was told about in
  // build-graph.ts) -- that's what keeps parallel edges' labels from
  // overlapping each other.
  const { x, y } = route.labelPosition;
  const { width, height } = route.labelSize;
  const label = `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}" stroke-width="1"/>
    <text x="${x + width / 2}" y="${y + height / 2 + 4}" font-family='${theme.fontFamily}' font-size="11" font-weight="600" text-anchor="middle" fill="${theme.edgeLabelColor}">${escapeXml(edge.label)}</text>
  </g>`;
  return path + arrows + label;
}
