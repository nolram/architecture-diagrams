import type { C4Element, C4Relationship, C4Spec } from "./schema.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";
import { getTheme, type Theme } from "../../render/theme.js";
import { escapeXml, truncateToWidth } from "../../render/svg-utils.js";
import type { ComposeResult } from "../../render/compose.js";
import { C4_DESC_CHAR_WIDTH, C4_NAME_CHAR_WIDTH, combineDescription, edgeLabelSize } from "./geometry.js";
import { renderC4Legend, shouldShowC4Legend } from "./legend.js";

const CANVAS_MARGIN = 32;
const TITLE_HEIGHT = 56;
const CARD_RADIUS = 10;
const BOUNDARY_RADIUS = 12;

const ARROW_LENGTH = 8;
const ARROW_HALF_WIDTH = 3.5;

interface Point {
  x: number;
  y: number;
}

function angleDeg(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

// marker geometry (distances measured along the edge, from the box boundary)
function renderArrowhead(tip: Point, angle: number, color: string): string {
  return `<path d="M${-ARROW_LENGTH},${-ARROW_HALF_WIDTH} L0,0 L${-ARROW_LENGTH},${ARROW_HALF_WIDTH} Z" fill="${color}" transform="translate(${tip.x} ${tip.y}) rotate(${angle})"/>`;
}

function externalDash(el: C4Element, theme: Theme): string {
  return el.type === "external-system" ? ` stroke-dasharray="${theme.c4["external-system"].dash}"` : "";
}

function renderPerson(el: C4Element, box: AbsoluteBox, theme: Theme): string {
  const person = theme.c4.person;
  const cx = box.width / 2;

  // head + shoulders silhouette (no bounding card -- that's what sets people
  // apart from "boxed" elements)
  const head = `<circle cx="${cx}" cy="24" r="14" fill="${person.fill}" stroke="${person.stroke}" stroke-width="2"/>`;
  const shoulders = `<path d="M${cx - 26} 94 L${cx - 26} 58 Q${cx - 26} 46 ${cx} 46 Q${cx + 26} 46 ${cx + 26} 58 L${cx + 26} 94 Z" fill="${person.fill}" stroke="${person.stroke}" stroke-width="2"/>`;

  const nameY = 112;
  const name = `<text x="${cx}" y="${nameY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="14" font-weight="600" fill="${person.labelColor}">${escapeXml(truncateToWidth(el.name, box.width, C4_NAME_CHAR_WIDTH))}</text>`;

  const desc = combineDescription(el.description, el.technology);
  const descText = desc
    ? `<text x="${cx}" y="${nameY + 16}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="11" fill="${person.labelColor}">${escapeXml(truncateToWidth(desc, box.width, C4_DESC_CHAR_WIDTH))}</text>`
    : "";

  return `<g transform="translate(${box.x}, ${box.y})">
  ${head}
  ${shoulders}
  ${name}
  ${descText}
</g>`;
}

function renderCard(el: C4Element, box: AbsoluteBox, theme: Theme): string {
  const tokens = theme.c4[el.type];
  const dash = externalDash(el, theme);

  const desc = combineDescription(el.description, el.technology);
  const textMaxWidth = box.width - 24;
  const nameY = desc ? box.height / 2 - 5 : box.height / 2 + 5;
  const name = `<text x="${box.width / 2}" y="${nameY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${tokens.labelColor}">${escapeXml(truncateToWidth(el.name, textMaxWidth, C4_NAME_CHAR_WIDTH))}</text>`;
  const descText = desc
    ? `<text x="${box.width / 2}" y="${box.height / 2 + 17}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="12" fill="${tokens.labelColor}">${escapeXml(truncateToWidth(desc, textMaxWidth, C4_DESC_CHAR_WIDTH))}</text>`
    : "";

  return `<g transform="translate(${box.x}, ${box.y})">
  <rect x="0" y="0" width="${box.width}" height="${box.height}" rx="${CARD_RADIUS}" fill="${tokens.fill}" stroke="${tokens.stroke}" stroke-width="1.5"${dash} filter="url(#card-shadow)"/>
  ${name}
  ${descText}
</g>`;
}

function renderBoundary(el: C4Element, box: AbsoluteBox, theme: Theme): string {
  const tokens = theme.c4[el.type];
  const dash = externalDash(el, theme);
  const title = escapeXml(truncateToWidth(el.name, box.width - 32, C4_NAME_CHAR_WIDTH));
  const desc = combineDescription(el.description, el.technology);
  const descText = desc
    ? `<text x="16" y="46" font-family='${theme.fontFamily}' font-size="12" fill="${tokens.labelColor}">${escapeXml(truncateToWidth(desc, box.width - 32, C4_DESC_CHAR_WIDTH))}</text>`
    : "";

  return `<g transform="translate(${box.x}, ${box.y})">
  <rect x="0" y="0" width="${box.width}" height="${box.height}" rx="${BOUNDARY_RADIUS}" fill="${tokens.fill}" stroke="${tokens.stroke}" stroke-width="1.5"${dash}/>
  <text x="16" y="28" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${tokens.labelColor}">${title}</text>
  ${descText}
</g>`;
}

function renderC4Edge(rel: C4Relationship, route: EdgeRoute, theme: Theme): string {
  const points = route.points;
  if (points.length < 2) return "";

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="2"/>`;

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const arrow = renderArrowhead(last, angleDeg(secondLast, last), theme.edgeColor);

  const text = combineDescription(rel.description, rel.technology);
  if (!text) return path + arrow;

  // route.labelPosition is the top-left corner of the box ELK itself reserved
  // for this label (based on the same estimated size it was told about in
  // layout.ts) -- that's what keeps parallel edges' labels from overlapping.
  const size = route.labelSize ?? edgeLabelSize(rel)!;
  const pos =
    route.labelPosition ?? {
      x: (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2 - size.width / 2,
      y: (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2 - size.height / 2,
    };
  const label = `<g>
    <rect x="${pos.x}" y="${pos.y}" width="${size.width}" height="${size.height}" rx="6" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}" stroke-width="1"/>
    <text x="${pos.x + size.width / 2}" y="${pos.y + size.height / 2 + 4}" font-family='${theme.fontFamily}' font-size="11" font-weight="600" text-anchor="middle" fill="${theme.edgeLabelColor}">${escapeXml(text)}</text>
  </g>`;

  return path + arrow + label;
}

export async function renderC4(
  spec: C4Spec,
  layout: LayoutResult,
  baseDir = process.cwd(),
): Promise<ComposeResult> {
  const theme = getTheme(spec.theme);
  const warnings: string[] = [];

  const elementsById = new Map(spec.elements.map((el) => [el.id, el]));

  const boundaryParts = [...layout.groups.values()].map((box) => renderBoundary(elementsById.get(box.id)!, box, theme));

  const edgeParts = spec.relationships
    .map((rel, i) => {
      const route = layout.edges.get(`edge_${i}`);
      if (!route) return "";
      return renderC4Edge(rel, route, theme);
    })
    .filter(Boolean);

  const elementParts = [...layout.nodes.values()].map((box) => {
    const el = elementsById.get(box.id)!;
    if (el.type === "person") return renderPerson(el, box, theme);
    return renderCard(el, box, theme);
  });

  const offsetX = CANVAS_MARGIN;
  const offsetY = CANVAS_MARGIN + (spec.title ? TITLE_HEIGHT : 0);
  const width = layout.width + CANVAS_MARGIN * 2;

  const legend = shouldShowC4Legend(spec) ? renderC4Legend(spec, theme, layout.width) : null;
  const legendGap = legend && legend.height > 0 ? 24 : 0;
  const height = layout.height + offsetY + legendGap + (legend?.height ?? 0) + CANVAS_MARGIN;

  const title = spec.title
    ? `<text x="${CANVAS_MARGIN}" y="${CANVAS_MARGIN + 26}" font-family='${theme.fontFamily}' font-size="24" font-weight="700" fill="${theme.titleColor}">${escapeXml(spec.title)}</text>`
    : "";

  const legendBlock = legend?.svg
    ? `<g transform="translate(${offsetX}, ${offsetY + layout.height + legendGap})">${legend.svg}</g>`
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
 ${boundaryParts.join("\n")}
 ${edgeParts.join("\n")}
 ${elementParts.join("\n")}
 </g>
 ${legendBlock}
 </svg>`;

  return { svg, warnings };
}
