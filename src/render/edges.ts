import type { DiagramEdge } from "../spec/schema.js";
import type { EdgeRoute } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import { escapeXml } from "./svg-utils.js";

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

  if (!edge.label || !route.labelPosition || !route.labelSize) return path;

  // route.labelPosition é o canto superior-esquerdo do box que o próprio ELK
  // reservou para este label (com base no mesmo tamanho estimado que foi
  // informado a ele em build-graph.ts) — é isso que faz labels de edges
  // paralelas não colidirem mais entre si.
  const { x, y } = route.labelPosition;
  const { width, height } = route.labelSize;
  const label = `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}" stroke-width="1"/>
    <text x="${x + width / 2}" y="${y + height / 2 + 4}" font-family='${theme.fontFamily}' font-size="11" font-weight="600" text-anchor="middle" fill="${theme.edgeLabelColor}">${escapeXml(edge.label)}</text>
  </g>`;
  return path + label;
}
