import type { ErCardinality, ErEntity, ErRelationship, ErSpec } from "./schema.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";
import { getTheme, type Theme } from "../../render/theme.js";
import { escapeXml } from "../../render/svg-utils.js";
import type { ComposeResult } from "../../render/compose.js";
import {
  ER_BOX_PAD_X,
  ER_COMPARTMENT_PAD,
  ER_LINE_HEIGHT,
  erAttributeLine,
  erAttributeCompartmentHeight,
  erEdgeLabelSize,
  erNameCompartmentHeight,
} from "./geometry.js";

const CANVAS_MARGIN = 32;
const TITLE_HEIGHT = 56;
const CARD_RADIUS = 10;

// crow's-foot marker extents along the edge (how far the marker reaches from
// the box boundary), used to shorten the main line so it does not run under them
const MARKER_EXTENT: Record<ErCardinality, number> = {
  one: 10,
  many: 12,
  "zero-or-one": 20,
  "zero-or-many": 22,
};

interface Point {
  x: number;
  y: number;
}

function angleDeg(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function unitVec(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function baseline(lineTop: number, fontSize: number): number {
  return lineTop + ER_LINE_HEIGHT / 2 + fontSize * 0.35;
}

function renderEntity(entity: ErEntity, box: AbsoluteBox, theme: Theme): string {
  const w = box.width;
  const h = box.height;

  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${w}" height="${h}" rx="${CARD_RADIUS}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>`,
  );
  if (entity.weak === true) {
    parts.push(
      `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="7" fill="none" stroke="${theme.cardBorder}" stroke-width="1"/>`,
    );
  }

  // name compartment
  const nameY = baseline(ER_COMPARTMENT_PAD, 15);
  parts.push(
    `<text x="${w / 2}" y="${nameY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${theme.labelColor}">${escapeXml(entity.name)}</text>`,
  );

  let y = erNameCompartmentHeight();

  // attributes compartment
  if ((entity.attributes?.length ?? 0) > 0) {
    parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${theme.cardBorder}" stroke-width="1"/>`);
    entity.attributes!.forEach((a, i) => {
      const lineTop = y + ER_COMPARTMENT_PAD + i * ER_LINE_HEIGHT;
      const textY = baseline(lineTop, 12);
      let textX = ER_BOX_PAD_X;
      if (a.key) {
        const badgeW = a.key === "primary" ? 22 : 20;
        const badgeY = lineTop + (ER_LINE_HEIGHT - 14) / 2;
        parts.push(
          `<rect x="${ER_BOX_PAD_X}" y="${badgeY}" width="${badgeW}" height="14" rx="4" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}"/>`,
        );
        parts.push(
          `<text x="${ER_BOX_PAD_X + badgeW / 2}" y="${badgeY + 7 + 10 * 0.35}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="10" fill="${theme.edgeLabelColor}">${a.key === "primary" ? "PK" : "FK"}</text>`,
        );
        textX = ER_BOX_PAD_X + badgeW + 6;
      }
      const underline = a.key ? ' text-decoration="underline"' : "";
      parts.push(
        `<text x="${textX}" y="${textY}" font-family='${theme.fontFamily}' font-size="12"${underline} fill="${theme.labelColor}">${escapeXml(erAttributeLine(a))}</text>`,
      );
    });
    y += erAttributeCompartmentHeight(entity.attributes!.length);
  }

  return `<g transform="translate(${box.x}, ${box.y})">
${parts.join("\n")}
</g>`;
}

/** crow's-foot marker geometry in local coords (edge runs along +x from 0 outward) */
function crowFootMarker(card: ErCardinality, theme: Theme): string {
  const stroke = `fill="none" stroke="${theme.edgeColor}" stroke-width="2" stroke-linecap="round"`;
  let out = "";
  if (card === "one" || card === "zero-or-one") {
    out += `<line x1="10" y1="-6" x2="10" y2="6" ${stroke}/>`;
  } else {
    out += `<line x1="12" y1="-7" x2="0" y2="0" ${stroke}/>`;
    out += `<line x1="12" y1="7" x2="0" y2="0" ${stroke}/>`;
  }
  if (card === "zero-or-one") {
    out += `<circle cx="16" cy="0" r="4" fill="${theme.cardBg}" stroke="${theme.edgeColor}" stroke-width="2"/>`;
  } else if (card === "zero-or-many") {
    out += `<circle cx="18" cy="0" r="4" fill="${theme.cardBg}" stroke="${theme.edgeColor}" stroke-width="2"/>`;
  }
  return out;
}

function renderErEdge(rel: ErRelationship, route: EdgeRoute, theme: Theme): string {
  const points = route.points;
  if (points.length < 2) return "";

  const from = points[0];
  const to = points[points.length - 1];
  const fromDir = unitVec(from, points[1]);
  const toDir = unitVec(points[points.length - 2], to);

  const lineStart = { x: from.x + MARKER_EXTENT[rel.fromCardinality] * fromDir.x, y: from.y + MARKER_EXTENT[rel.fromCardinality] * fromDir.y };
  const lineEnd = { x: to.x - MARKER_EXTENT[rel.toCardinality] * toDir.x, y: to.y - MARKER_EXTENT[rel.toCardinality] * toDir.y };

  const linePoints = [lineStart, ...points.slice(1, -1), lineEnd];
  const d = linePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const dash = rel.identifying === true ? "" : ' stroke-dasharray="7 5"';
  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="2"${dash}/>`;

  const fromAngle = angleDeg(from, points[1]);
  const toAngle = angleDeg(points[points.length - 2], to);
  const markers =
    `<g transform="translate(${from.x} ${from.y}) rotate(${fromAngle})">${crowFootMarker(rel.fromCardinality, theme)}</g>` +
    `<g transform="translate(${to.x} ${to.y}) rotate(${toAngle})">${crowFootMarker(rel.toCardinality, theme)}</g>`;

  let label = "";
  if (rel.label) {
    // Prefer the box ELK reserved for this label (layout.ts tells ELK the same
    // size via erEdgeLabelSize) -- that's what keeps parallel edges' pills from
    // overlapping. Fall back to the route midpoint if ELK gave no position.
    const fontSize = 10;
    const size = route.labelSize ?? erEdgeLabelSize(rel.label);
    const mid =
      route.labelPosition
        ? { x: route.labelPosition.x + size.width / 2, y: route.labelPosition.y + size.height / 2 }
        : points.length >= 3
          ? points[Math.floor(points.length / 2)]
          : { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    label =
      `<rect x="${mid.x - size.width / 2}" y="${mid.y - size.height / 2}" width="${size.width}" height="${size.height}" rx="4" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}"/>` +
      `<text x="${mid.x}" y="${mid.y + fontSize * 0.35}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="${fontSize}" fill="${theme.edgeLabelColor}">${escapeXml(rel.label)}</text>`;
  }

  return path + markers + label;
}

export async function composeEr(
  spec: ErSpec,
  layout: LayoutResult,
  baseDir = process.cwd(),
): Promise<ComposeResult> {
  const theme = getTheme(spec.theme);
  const warnings: string[] = [];

  const entitiesById = new Map(spec.entities.map((e) => [e.id, e]));

  const edgeParts = spec.relationships
    .map((rel, i) => {
      const route = layout.edges.get(`edge_${i}`);
      if (!route) return "";
      return renderErEdge(rel, route, theme);
    })
    .filter(Boolean);

  const entityParts = [...layout.nodes.values()].map((box) => renderEntity(entitiesById.get(box.id)!, box, theme));

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
${entityParts.join("\n")}
</g>
</svg>`;

  return { svg, warnings };
}
