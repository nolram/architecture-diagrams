import type { DiagramEdge } from "../spec/schema.js";
import type { EdgeRoute } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import { escapeXml } from "./svg-utils.js";

const CHAR_WIDTH = 6.4;
const LABEL_HEIGHT = 20;
const LABEL_PAD_X = 8;

export function renderArrowMarkerDefs(theme: Theme): string {
  return `<marker id="arrow-${theme.name}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="${theme.edgeColor}"/>
  </marker>`;
}

export function renderEdge(edge: DiagramEdge, route: EdgeRoute, theme: Theme): string {
  if (route.points.length < 2) return "";
  const d = route.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const dash = edge.style === "dashed" ? ' stroke-dasharray="7 5"' : "";
  const markerEnd = edge.direction !== "none" ? ` marker-end="url(#arrow-${theme.name})"` : "";
  const markerStart = edge.direction === "bidirectional" ? ` marker-start="url(#arrow-${theme.name})"` : "";

  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="2"${dash}${markerEnd}${markerStart}/>`;

  if (!edge.label || !route.labelPosition) return path;

  const width = edge.label.length * CHAR_WIDTH + LABEL_PAD_X * 2;
  const { x, y } = route.labelPosition;
  const label = `<g>
    <rect x="${x - width / 2}" y="${y - LABEL_HEIGHT / 2}" width="${width}" height="${LABEL_HEIGHT}" rx="6" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}" stroke-width="1"/>
    <text x="${x}" y="${y + 4}" font-family='${theme.fontFamily}' font-size="11" font-weight="600" text-anchor="middle" fill="${theme.edgeLabelColor}">${escapeXml(edge.label)}</text>
  </g>`;
  return path + label;
}
