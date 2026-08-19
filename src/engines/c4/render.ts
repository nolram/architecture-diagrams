import type { C4Element, C4Relationship, C4Spec } from "./schema.js";
import { isActive } from "./schema.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";
import { getTheme, type Theme } from "../../render/theme.js";
import { escapeXml, truncateToWidth, wrapText } from "../../render/svg-utils.js";
import type { ComposeResult } from "../../render/compose.js";
import { resolveIcon, fallbackBadge, type ResolvedIcon } from "../../icons/resolve.js";
import { renderIconBadge } from "../../render/node-card.js";
import {
  C4_BOX_PAD_X,
  C4_DESC_CHAR_WIDTH,
  C4_EDGE_LABEL_CHAR_WIDTH,
  C4_EDGE_LABEL_LINE_HEIGHT,
  C4_EDGE_LABEL_MAX_WIDTH,
  C4_EDGE_LABEL_PAD_Y,
  C4_ICON_BADGE_MARGIN,
  C4_ICON_BADGE_SIZE,
  C4_ICON_SPACE,
  C4_ICON_TEXT_GAP,
  C4_NAME_CHAR_WIDTH,
  combineDescription,
  edgeLabelSize,
} from "./geometry.js";
import { renderC4Legend, shouldShowC4Legend } from "./legend.js";

const CANVAS_MARGIN = 32;
const TITLE_HEIGHT = 56;
const CARD_RADIUS = 10;
const BOUNDARY_RADIUS = 12;

const ARROW_LENGTH = 8;
const ARROW_HALF_WIDTH = 3.5;

/** opacity applied to non-active (deprecated/suspended/planned) elements and relationships */
const STATUS_OPACITY = 0.62;
/** dash pattern for non-active elements/relationships (distinct from the external-system dash) */
const STATUS_DASH = "4 4";
/** height of the status tag pill */
const STATUS_TAG_HEIGHT = 16;
/** clearance (cap-height + margin) kept between the status tag's bottom and the name/title cap-top */
const STATUS_TAG_TEXT_CLEARANCE = 12;

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

function statusDash(el: { status?: string }, typeDash?: string): string {
  // external-system keeps its own (longer) dash; other non-active elements get the status dash
  if (typeDash) return ` stroke-dasharray="${typeDash}"`;
  if (!isActive(el.status)) return ` stroke-dasharray="${STATUS_DASH}"`;
  return "";
}

function statusOpacity(status?: string): string {
  return isActive(status) ? "" : ` opacity="${STATUS_OPACITY}"`;
}

/** small uppercase pill marking a non-active element, drawn in the top-right corner */
function renderStatusTag(status: string | undefined, rightX: number, topY: number, theme: Theme): string {
  if (isActive(status)) return "";
  const label = (status ?? "").toUpperCase();
  const charW = 5.5;
  const padX = 8;
  const tagW = label.length * charW + padX * 2;
  const x = rightX - tagW;
  return `<rect x="${x}" y="${topY}" width="${tagW}" height="${STATUS_TAG_HEIGHT}" rx="8" fill="${theme.sublabelColor}" fill-opacity="0.12" stroke="${theme.sublabelColor}" stroke-opacity="0.35"/>
  <text x="${x + tagW / 2}" y="${topY + 11}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="9" font-weight="600" fill="${theme.sublabelColor}">${label}</text>`;
}

/**
 * Vertical baselines for a card's name + description lines. The single-line
 * cases (0 and 1 description lines) keep the exact positions the renderer used
 * before wrapping existed, so existing short diagrams are pixel-identical;
 * multi-line blocks are centered as a whole.
 */
function cardTextBaselines(boxHeight: number, descLines: number): { nameY: number; descYs: number[] } {
  if (descLines === 0) return { nameY: boxHeight / 2 + 5, descYs: [] };
  if (descLines === 1) return { nameY: boxHeight / 2 - 5, descYs: [boxHeight / 2 + 17] };
  const nameY = (boxHeight - 14 - (descLines - 1) * 18) / 2;
  const descYs = Array.from({ length: descLines }, (_, i) => nameY + 22 + i * 18);
  return { nameY, descYs };
}

function renderPerson(el: C4Element, box: AbsoluteBox, theme: Theme, maxLines: number): string {
  const person = theme.c4.person;
  const cx = box.width / 2;

  // head + shoulders silhouette (no bounding card -- that's what sets people
  // apart from "boxed" elements). Person ignores `icon` (it's a silhouette by
  // C4 convention); the status is conveyed by reduced opacity + a corner tag.
  const head = `<circle cx="${cx}" cy="24" r="14" fill="${person.fill}" stroke="${person.stroke}" stroke-width="2"/>`;
  const shoulders = `<path d="M${cx - 26} 94 L${cx - 26} 58 Q${cx - 26} 46 ${cx} 46 Q${cx + 26} 46 ${cx + 26} 58 L${cx + 26} 94 Z" fill="${person.fill}" stroke="${person.stroke}" stroke-width="2"/>`;

  const nameY = 112;
  const name = `<text x="${cx}" y="${nameY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="14" font-weight="600" fill="${person.labelColor}">${escapeXml(truncateToWidth(el.name, box.width, C4_NAME_CHAR_WIDTH))}</text>`;

  const desc = combineDescription(el.description, el.technology);
  const descLines = desc ? wrapText(desc, box.width - 16, C4_DESC_CHAR_WIDTH, maxLines) : [];
  const descTexts = descLines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${nameY + 16 + i * 18}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="11" fill="${person.labelColor}">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const tag = renderStatusTag(el.status, box.width - 2, 2, theme);

  return `<g transform="translate(${box.x}, ${box.y})"${statusOpacity(el.status)}>
  ${head}
  ${shoulders}
  ${name}
  ${descTexts}
  ${tag}
</g>`;
}

function renderCard(el: C4Element, box: AbsoluteBox, theme: Theme, maxLines: number, icon: ResolvedIcon | null): string {
  const tokens = theme.c4[el.type];
  const typeDash = el.type === "external-system" ? theme.c4["external-system"].dash : undefined;
  const dash = statusDash(el, typeDash);
  const hasIcon = icon !== null;
  const iconSpace = hasIcon ? C4_ICON_SPACE : 0;
  const textMaxWidth = box.width - C4_BOX_PAD_X * 2 - iconSpace;

  const desc = combineDescription(el.description, el.technology);
  const descLines = desc ? wrapText(desc, textMaxWidth, C4_DESC_CHAR_WIDTH, maxLines) : [];
  const hasTag = !isActive(el.status);
  const tagTopY = 8;
  const { nameY: baseNameY, descYs } = cardTextBaselines(box.height, descLines.length);
  // when a status tag is present, keep the name's cap-height clear of the tag's bottom
  const nameY = hasTag ? Math.max(baseNameY, tagTopY + STATUS_TAG_HEIGHT + STATUS_TAG_TEXT_CLEARANCE) : baseNameY;

  let x: number;
  let anchor: "middle" | "start";
  if (hasIcon) {
    x = C4_ICON_BADGE_MARGIN + C4_ICON_BADGE_SIZE + C4_ICON_TEXT_GAP;
    anchor = "start";
  } else {
    x = box.width / 2;
    anchor = "middle";
  }

  const name = `<text x="${x}" y="${nameY}" text-anchor="${anchor}" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${tokens.labelColor}">${escapeXml(truncateToWidth(el.name, textMaxWidth, C4_NAME_CHAR_WIDTH))}</text>`;
  const descTexts = descLines
    .map(
      (line, i) =>
        `<text x="${x}" y="${descYs[i]}" text-anchor="${anchor}" font-family='${theme.fontFamily}' font-size="12" fill="${tokens.labelColor}">${escapeXml(line)}</text>`,
    )
    .join("\n");

  let badge = "";
  if (hasIcon) {
    const accent = tokens.stroke;
    const badgeY = (box.height - C4_ICON_BADGE_SIZE) / 2;
    const clipId = `clip-c4-badge-${el.id}`;
    badge = renderIconBadge(icon, accent, clipId, C4_ICON_BADGE_MARGIN, badgeY, C4_ICON_BADGE_SIZE);
  }

  const tag = renderStatusTag(el.status, box.width - 8, tagTopY, theme);

  return `<g transform="translate(${box.x}, ${box.y})"${statusOpacity(el.status)}>
  <rect x="0" y="0" width="${box.width}" height="${box.height}" rx="${CARD_RADIUS}" fill="${tokens.fill}" stroke="${tokens.stroke}" stroke-width="1.5"${dash} filter="url(#card-shadow)"/>
  ${badge}
  ${name}
  ${descTexts}
  ${tag}
</g>`;
}

function renderBoundary(el: C4Element, box: AbsoluteBox, theme: Theme): string {
  const tokens = theme.c4[el.type];
  const typeDash = el.type === "external-system" ? theme.c4["external-system"].dash : undefined;
  const dash = statusDash(el, typeDash);

  const title = escapeXml(truncateToWidth(el.name, box.width - 32, C4_NAME_CHAR_WIDTH));
  // A boundary's description is a group label: keep it on a single line (truncated)
  // rather than wrapping it, so it never collides with the children below.
  const desc = combineDescription(el.description, el.technology);
  const descText = desc
    ? `<text x="16" y="46" font-family='${theme.fontFamily}' font-size="12" fill="${tokens.labelColor}">${escapeXml(truncateToWidth(desc, box.width - 32, C4_DESC_CHAR_WIDTH))}</text>`
    : "";

  const hasTag = !isActive(el.status);
  // when a status tag is present, lift it so its bottom clears the title's cap-height;
  // the title keeps its normal baseline so it never collides with the description below
  const tagTopY = hasTag ? 0 : 10;

  const tag = renderStatusTag(el.status, box.width - 12, tagTopY, theme);

  return `<g transform="translate(${box.x}, ${box.y})"${statusOpacity(el.status)}>
  <rect x="0" y="0" width="${box.width}" height="${box.height}" rx="${BOUNDARY_RADIUS}" fill="${tokens.fill}" stroke="${tokens.stroke}" stroke-width="1.5"${dash}/>
  <text x="16" y="28" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${tokens.labelColor}">${title}</text>
  ${descText}
  ${tag}
</g>`;
}

function renderC4Edge(rel: C4Relationship, route: EdgeRoute, theme: Theme, maxLines: number): string {
  const points = route.points;
  if (points.length < 2) return "";

  const nonActive = !isActive(rel.status);
  const dash = nonActive ? ` stroke-dasharray="${STATUS_DASH}"` : "";
  const opacity = statusOpacity(rel.status);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="2"${dash}${opacity}/>`;

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const arrow = `<g${opacity}>${renderArrowhead(last, angleDeg(secondLast, last), theme.edgeColor)}</g>`;

  const text = combineDescription(rel.description, rel.technology);
  if (!text) return path + arrow;

  // route.labelPosition is the top-left corner of the box ELK itself reserved
  // for this label (based on the same estimated size it was told about in
  // layout.ts) -- that's what keeps parallel edges' labels from overlapping.
  const size = route.labelSize ?? edgeLabelSize(rel, maxLines)!;
  const pos =
    route.labelPosition ?? {
      x: (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2 - size.width / 2,
      y: (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2 - size.height / 2,
    };

  const lines = wrapText(text, C4_EDGE_LABEL_MAX_WIDTH, C4_EDGE_LABEL_CHAR_WIDTH, maxLines);
  const lineTexts = lines
    .map((line, i) => {
      const y = pos.y + C4_EDGE_LABEL_PAD_Y + (i + 0.8) * C4_EDGE_LABEL_LINE_HEIGHT;
      return `<text x="${pos.x + size.width / 2}" y="${y}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="11" font-weight="600" fill="${theme.edgeLabelColor}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const label = `<g${opacity}>
    <rect x="${pos.x}" y="${pos.y}" width="${size.width}" height="${size.height}" rx="6" fill="${theme.edgeLabelBg}" stroke="${theme.cardBorder}" stroke-width="1"/>
    ${lineTexts}
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
  const maxLines = spec.wrap.maxLines;

  const elementsById = new Map(spec.elements.map((el) => [el.id, el]));

  // Resolve icons for card elements. Person is a silhouette and ignores `icon`
  // (documented in c4-spec.md); boundaries are group containers and render a
  // title instead of a badge.
  const iconByElement = new Map<string, ResolvedIcon | null>();
  for (const el of spec.elements) {
    if (el.type === "person" || !el.icon || !layout.nodes.has(el.id)) {
      if (el.icon && layout.groups.has(el.id)) {
        warnings.push(`icon on boundary "${el.id}" is ignored — boundaries render a title, not a badge`);
      }
      iconByElement.set(el.id, null);
      continue;
    }
    const accent = theme.c4[el.type].stroke;
    const resolved = await resolveIcon(el.icon, accent, baseDir);
    if (resolved.ok) {
      iconByElement.set(el.id, resolved.icon);
    } else {
      const message = resolved.reason
        ? `icon "${el.icon}" (element "${el.id}"): ${resolved.reason}`
        : `icon "${el.icon}" (element "${el.id}") not found in the catalog.${resolved.suggestions.length ? ` Suggestions: ${resolved.suggestions.join(", ")}.` : ""}`;
      warnings.push(message);
      iconByElement.set(el.id, fallbackBadge(el.name, accent));
    }
  }

  const boundaryParts = [...layout.groups.values()].map((box) => renderBoundary(elementsById.get(box.id)!, box, theme));

  const edgeParts = spec.relationships
    .map((rel, i) => {
      const route = layout.edges.get(`edge_${i}`);
      if (!route) return "";
      return renderC4Edge(rel, route, theme, maxLines);
    })
    .filter(Boolean);

  const elementParts = [...layout.nodes.values()].map((box) => {
    const el = elementsById.get(box.id)!;
    if (el.type === "person") return renderPerson(el, box, theme, maxLines);
    return renderCard(el, box, theme, maxLines, iconByElement.get(box.id) ?? null);
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
