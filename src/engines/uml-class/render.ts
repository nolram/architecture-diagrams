import type { UmlClass, UmlClassSpec, UmlRelationship } from "./schema.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";
import { getTheme, type Theme } from "../../render/theme.js";
import { escapeXml } from "../../render/svg-utils.js";
import type { ComposeResult } from "../../render/compose.js";
import {
  UML_BOX_PAD_X,
  UML_COMPARTMENT_PAD,
  UML_LINE_HEIGHT,
  attributeLine,
  methodLine,
  nameCompartmentHeight,
  memberCompartmentHeight,
} from "./geometry.js";

const CANVAS_MARGIN = 32;
const TITLE_HEIGHT = 56;
const CARD_RADIUS = 10;

// marker geometry (distances measured along the edge, from the box boundary)
const DIAMOND_RADIUS = 7;
const TRIANGLE_LENGTH = 12;
const TRIANGLE_HALF_WIDTH = 6;
const ARROW_LENGTH = 8;
const ARROW_HALF_WIDTH = 3.5;

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
  return lineTop + UML_LINE_HEIGHT / 2 + fontSize * 0.35;
}

function renderClass(cls: UmlClass, box: AbsoluteBox, theme: Theme): string {
  const w = box.width;
  const h = box.height;

  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${w}" height="${h}" rx="${CARD_RADIUS}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>`,
  );

  const hasAttrs = (cls.attributes?.length ?? 0) > 0;
  const hasMethods = (cls.methods?.length ?? 0) > 0;

  // name compartment
  const nameH = nameCompartmentHeight(cls.stereotype);
  if (cls.stereotype) {
    const stereoY = baseline(UML_COMPARTMENT_PAD, 11);
    parts.push(
      `<text x="${w / 2}" y="${stereoY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="11" font-style="italic" fill="${theme.sublabelColor}">«${escapeXml(cls.stereotype)}»</text>`,
    );
    const nameY = baseline(UML_COMPARTMENT_PAD + UML_LINE_HEIGHT, 15);
    const italic = cls.abstract ? ' font-style="italic"' : "";
    parts.push(
      `<text x="${w / 2}" y="${nameY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="15" font-weight="600"${italic} fill="${theme.labelColor}">${escapeXml(cls.name)}</text>`,
    );
  } else {
    const nameY = baseline(UML_COMPARTMENT_PAD, 15);
    const italic = cls.abstract ? ' font-style="italic"' : "";
    parts.push(
      `<text x="${w / 2}" y="${nameY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="15" font-weight="600"${italic} fill="${theme.labelColor}">${escapeXml(cls.name)}</text>`,
    );
  }

  let y = nameH;

  // attributes compartment
  if (hasAttrs) {
    parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${theme.cardBorder}" stroke-width="1"/>`);
    cls.attributes!.forEach((a, i) => {
      const lineTop = y + UML_COMPARTMENT_PAD + i * UML_LINE_HEIGHT;
      const textY = baseline(lineTop, 12);
      const underline = a.static ? ' text-decoration="underline"' : "";
      parts.push(
        `<text x="${UML_BOX_PAD_X}" y="${textY}" font-family='${theme.fontFamily}' font-size="12"${underline} fill="${theme.labelColor}">${escapeXml(attributeLine(a))}</text>`,
      );
    });
    y += memberCompartmentHeight(cls.attributes!.length);
  }

  // methods compartment
  if (hasMethods) {
    parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${theme.cardBorder}" stroke-width="1"/>`);
    cls.methods!.forEach((m, i) => {
      const lineTop = y + UML_COMPARTMENT_PAD + i * UML_LINE_HEIGHT;
      const textY = baseline(lineTop, 12);
      const underline = m.static ? ' text-decoration="underline"' : "";
      parts.push(
        `<text x="${UML_BOX_PAD_X}" y="${textY}" font-family='${theme.fontFamily}' font-size="12"${underline} fill="${theme.labelColor}">${escapeXml(methodLine(m))}</text>`,
      );
    });
    y += memberCompartmentHeight(cls.methods!.length);
  }

  return `<g transform="translate(${box.x}, ${box.y})">
${parts.join("\n")}
</g>`;
}

function renderUmlEdge(rel: UmlRelationship, route: EdgeRoute, theme: Theme): string {
  const points = route.points;
  if (points.length < 2) return "";

  const from = points[0];
  const to = points[points.length - 1];
  const fromDir = unitVec(from, points[1]);
  const toDir = unitVec(points[points.length - 2], to);

  const dashed = rel.kind === "dependency" || rel.kind === "realization";

  let lineStart = from;
  let lineEnd = to;
  let marker = "";

  if (rel.kind === "aggregation" || rel.kind === "composition") {
    const r = DIAMOND_RADIUS;
    lineStart = { x: from.x + 2 * r * fromDir.x, y: from.y + 2 * r * fromDir.y };
    const angle = angleDeg(from, points[1]);
    const fill = rel.kind === "composition" ? theme.edgeColor : "none";
    marker = `<polygon points="0,0 ${r},${-r} ${2 * r},0 ${r},${r}" fill="${fill}" stroke="${theme.edgeColor}" stroke-width="2" transform="translate(${from.x} ${from.y}) rotate(${angle})"/>`;
  } else if (rel.kind === "inheritance" || rel.kind === "realization") {
    const L = TRIANGLE_LENGTH;
    const W = TRIANGLE_HALF_WIDTH;
    lineEnd = { x: to.x - L * toDir.x, y: to.y - L * toDir.y };
    const angle = angleDeg(points[points.length - 2], to);
    marker = `<polygon points="0,0 ${-L},${-W} ${-L},${W}" fill="none" stroke="${theme.edgeColor}" stroke-width="2" transform="translate(${to.x} ${to.y}) rotate(${angle})"/>`;
  } else if (rel.kind === "dependency") {
    const L = ARROW_LENGTH;
    const W = ARROW_HALF_WIDTH;
    lineEnd = { x: to.x - L * toDir.x, y: to.y - L * toDir.y };
    const angle = angleDeg(points[points.length - 2], to);
    marker = `<path d="M${-L},${-W} L0,0 L${-L},${W}" fill="none" stroke="${theme.edgeColor}" stroke-width="2" transform="translate(${to.x} ${to.y}) rotate(${angle})"/>`;
  }

  const linePoints = [lineStart, ...points.slice(1, -1), lineEnd];
  const d = linePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const dash = dashed ? ' stroke-dasharray="7 5"' : "";
  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="2"${dash}/>`;

  return path + marker + renderUmlEdgeLabels(rel, from, to, fromDir, toDir, theme);
}

function renderUmlEdgeLabels(
  rel: UmlRelationship,
  from: Point,
  to: Point,
  fromDir: Point,
  toDir: Point,
  theme: Theme,
): string {
  let out = "";
  const fontSize = 10;

  const fromParts = [rel.fromRole, rel.fromMultiplicity].filter((s): s is string => Boolean(s));
  if (fromParts.length > 0) {
    const perp = { x: -fromDir.y, y: fromDir.x };
    const bx = from.x + 28 * fromDir.x + 12 * perp.x;
    const by = from.y + 28 * fromDir.y + 12 * perp.y;
    fromParts.forEach((text, i) => {
      out += `<text x="${bx}" y="${by + i * 12}" font-family='${theme.fontFamily}' font-size="${fontSize}" fill="${theme.edgeLabelColor}">${escapeXml(text)}</text>`;
    });
  }

  const toParts = [rel.toRole, rel.toMultiplicity].filter((s): s is string => Boolean(s));
  if (toParts.length > 0) {
    const perp = { x: -toDir.y, y: toDir.x };
    const bx = to.x - 28 * toDir.x + 12 * perp.x;
    const by = to.y - 28 * toDir.y + 12 * perp.y;
    toParts.forEach((text, i) => {
      out += `<text x="${bx}" y="${by + i * 12}" font-family='${theme.fontFamily}' font-size="${fontSize}" fill="${theme.edgeLabelColor}">${escapeXml(text)}</text>`;
    });
  }

  return out;
}

export async function composeUmlClass(
  spec: UmlClassSpec,
  layout: LayoutResult,
  baseDir = process.cwd(),
): Promise<ComposeResult> {
  const theme = getTheme(spec.theme);
  const warnings: string[] = [];

  const classesById = new Map(spec.classes.map((c) => [c.id, c]));

  const edgeParts = spec.relationships
    .map((rel, i) => {
      const route = layout.edges.get(`edge_${i}`);
      if (!route) return "";
      return renderUmlEdge(rel, route, theme);
    })
    .filter(Boolean);

  const classParts = [...layout.nodes.values()].map((box) => renderClass(classesById.get(box.id)!, box, theme));

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
${classParts.join("\n")}
</g>
</svg>`;

  return { svg, warnings };
}
