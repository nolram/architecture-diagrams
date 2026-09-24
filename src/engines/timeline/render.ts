import type { TimelinePhase, TimelineSpec } from "./schema.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";
import { getTheme, type Theme } from "../../render/theme.js";
import { escapeXml } from "../../render/svg-utils.js";
import type { ComposeResult } from "../../render/compose.js";
import {
  TIMELINE_BOX_PAD_X,
  TIMELINE_BULLET_EXTRA,
  TIMELINE_COMPARTMENT_PAD,
  TIMELINE_LINE_HEIGHT,
  gateLabelCompartmentHeight,
  timelineEdgeLabelSize,
  timelineItemsCompartmentHeight,
  timelineLabelCompartmentHeight,
} from "./geometry.js";

const CANVAS_MARGIN = 32;
const TITLE_HEIGHT = 56;
const CARD_RADIUS = 10;
const ARROWHEAD_LENGTH = 10;
const ARROWHEAD_HALF_WIDTH = 4;

interface Point {
  x: number;
  y: number;
}

function angleDeg(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function baseline(lineTop: number, fontSize: number): number {
  return lineTop + TIMELINE_LINE_HEIGHT / 2 + fontSize * 0.35;
}

function renderItems(items: string[], startY: number, theme: Theme): string {
  const parts: string[] = [];
  items.forEach((item, i) => {
    const lineTop = startY + TIMELINE_COMPARTMENT_PAD + i * TIMELINE_LINE_HEIGHT;
    const centerY = lineTop + TIMELINE_LINE_HEIGHT / 2;
    parts.push(`<circle cx="${TIMELINE_BOX_PAD_X + 4}" cy="${centerY}" r="3" fill="${theme.edgeColor}"/>`);
    parts.push(
      `<text x="${TIMELINE_BOX_PAD_X + TIMELINE_BULLET_EXTRA}" y="${baseline(lineTop, 12)}" font-family='${theme.fontFamily}' font-size="12" fill="${theme.labelColor}">${escapeXml(item)}</text>`,
    );
  });
  return parts.join("\n");
}

function renderPhaseCard(phase: TimelinePhase, box: AbsoluteBox, theme: Theme): string {
  const w = box.width;
  const h = box.height;
  const labelH = phase.kind === "gate" ? gateLabelCompartmentHeight() : timelineLabelCompartmentHeight();

  if (phase.kind === "gate") {
    const parts: string[] = [];
    parts.push(
      `<polygon points="${w / 2},0 ${w},${labelH / 2} ${w / 2},${labelH} 0,${labelH / 2}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>`,
    );
    const gateLabelY = labelH / 2 + 15 * 0.35;
    parts.push(
      `<text x="${w / 2}" y="${gateLabelY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${theme.labelColor}">${escapeXml(phase.label)}</text>`,
    );
    if (phase.items.length > 0) {
      const itemsH = timelineItemsCompartmentHeight(phase.items.length);
      parts.push(`<rect x="0" y="${labelH}" width="${w}" height="${itemsH}" rx="6" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1"/>`);
      parts.push(renderItems(phase.items, labelH, theme));
    }
    return `<g transform="translate(${box.x}, ${box.y})">
${parts.join("\n")}
</g>`;
  }

  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${w}" height="${h}" rx="${CARD_RADIUS}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>`,
  );
  parts.push(
    `<text x="${w / 2}" y="${baseline(TIMELINE_COMPARTMENT_PAD, 15)}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${theme.labelColor}">${escapeXml(phase.label)}</text>`,
  );
  if (phase.items.length > 0) {
    parts.push(`<line x1="0" y1="${labelH}" x2="${w}" y2="${labelH}" stroke="${theme.cardBorder}" stroke-width="1"/>`);
    parts.push(renderItems(phase.items, labelH, theme));
  }
  return `<g transform="translate(${box.x}, ${box.y})">
${parts.join("\n")}
</g>`;
}

function renderEdge(route: EdgeRoute, dashed: boolean, labelText: string | undefined, theme: Theme): string {
  const points = route.points;
  if (points.length < 2) return "";

  const to = points[points.length - 1];
  const prev = points[points.length - 2];

  const dx = to.x - prev.x;
  const dy = to.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const lineEnd = { x: to.x - (dx / len) * ARROWHEAD_LENGTH, y: to.y - (dy / len) * ARROWHEAD_LENGTH };

  const linePoints = [...points.slice(0, -1), lineEnd];
  const d = linePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const dash = dashed ? ' stroke-dasharray="7 5"' : "";
  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="2"${dash}/>`;

  const angle = angleDeg(prev, to);
  const arrowhead = `<g transform="translate(${to.x} ${to.y}) rotate(${angle})"><polygon points="0,0 -${ARROWHEAD_LENGTH},-${ARROWHEAD_HALF_WIDTH} -${ARROWHEAD_LENGTH},${ARROWHEAD_HALF_WIDTH}" fill="${theme.edgeColor}"/></g>`;

  let label = "";
  if (labelText) {
    const fontSize = 10;
    const size = route.labelSize ?? timelineEdgeLabelSize(labelText);
    const mid = route.labelPosition
      ? { x: route.labelPosition.x + size.width / 2, y: route.labelPosition.y + size.height / 2 }
      : { x: (points[0].x + to.x) / 2, y: (points[0].y + to.y) / 2 };
    label =
      `<rect x="${mid.x - size.width / 2}" y="${mid.y - size.height / 2}" width="${size.width}" height="${size.height}" rx="4" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}"/>` +
      `<text x="${mid.x}" y="${mid.y + fontSize * 0.35}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="${fontSize}" fill="${theme.edgeLabelColor}">${escapeXml(labelText)}</text>`;
  }

  return path + arrowhead + label;
}

export async function composeTimeline(
  spec: TimelineSpec,
  layout: LayoutResult,
  baseDir = process.cwd(),
): Promise<ComposeResult> {
  const theme = getTheme(spec.theme);
  const warnings: string[] = [];

  const phasesById = new Map(spec.phases.map((p) => [p.id, p]));

  const edgeParts: string[] = [];
  for (const [edgeId, route] of layout.edges) {
    const isFlow = edgeId.startsWith("flow_");
    let labelText: string | undefined;

    if (isFlow) {
      const i = parseInt(edgeId.split("_")[1]);
      const fromId = spec.phases[i].id;
      const toId = spec.phases[i + 1].id;
      const rel = spec.relationships.find(
        (r) => (r.from === fromId && r.to === toId) || (r.from === toId && r.to === fromId),
      );
      labelText = rel?.label;
    } else {
      const i = parseInt(edgeId.split("_")[1]);
      labelText = spec.relationships[i]?.label;
    }

    edgeParts.push(renderEdge(route, !isFlow, labelText, theme));
  }

  const phaseParts = [...layout.nodes.values()].map((box) => renderPhaseCard(phasesById.get(box.id)!, box, theme));

  const offsetX = CANVAS_MARGIN;
  const offsetY = CANVAS_MARGIN + (spec.title ? TITLE_HEIGHT : 0);
  const width = layout.width + CANVAS_MARGIN * 2;
  const height = layout.height + offsetY + CANVAS_MARGIN;

  const title = spec.title
    ? `<text x="${CANVAS_MARGIN}" y="${CANVAS_MARGIN + 26}" font-family='${theme.fontFamily}' font-size="24" font-weight="700" fill="${theme.titleColor}">${escapeXml(spec.title)}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <filter id="card-shadow" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="${theme.cardShadowColor}"/>
  </filter>
</defs>
<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.canvasBg}"/>
${title}
<g transform="translate(${offsetX}, ${offsetY})">
${edgeParts.join("\n")}
${phaseParts.join("\n")}
</g>
</svg>`;

  return { svg, warnings };
}
