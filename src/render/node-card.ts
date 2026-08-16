import type { DiagramNode } from "../spec/schema.js";
import type { AbsoluteBox } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import type { ResolvedIcon } from "../icons/resolve.js";
import { escapeXml, truncateToWidth } from "./svg-utils.js";

const BADGE_SIZE = 40;
const BADGE_MARGIN = 14;
const CARD_RADIUS = 14;

/** cloud silhouette (mdi "cloud", MIT), normalized to a 24x24 viewBox, used as the background of the "cloud" shape */
const CLOUD_PATH_D =
  "M6.5 20q-2.28 0-3.89-1.57Q1 16.85 1 14.58q0-1.95 1.17-3.48q1.18-1.53 3.08-1.95q.63-2.3 2.5-3.72Q9.63 4 12 4q2.93 0 4.96 2.04Q19 8.07 19 11q1.73.2 2.86 1.5q1.14 1.28 1.14 3q0 1.88-1.31 3.19T18.5 20Z";
const CLOUD_VIEWBOX = "0 0 24 24";

export function renderNode(node: DiagramNode, box: AbsoluteBox, theme: Theme, icon: ResolvedIcon | null): string {
  switch (node.shape) {
    case "database":
      return renderDatabaseNode(node, box, theme, icon);
    case "actor":
      return renderActorNode(node, box, theme, icon);
    case "cloud":
      return renderCloudNode(node, box, theme, icon);
    default:
      return renderCardNode(node, box, theme, icon);
  }
}

function labelBlock(node: DiagramNode, textX: number, textMaxWidth: number, box: AbsoluteBox, theme: Theme): string {
  const labelY = node.sublabel ? box.height / 2 - 5 : box.height / 2 + 5;
  const label = `<text x="${textX}" y="${labelY}" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${theme.labelColor}">${escapeXml(truncateToWidth(node.label, textMaxWidth))}</text>`;
  const sublabel = node.sublabel
    ? `<text x="${textX}" y="${box.height / 2 + 17}" font-family='${theme.fontFamily}' font-size="12" fill="${theme.sublabelColor}">${escapeXml(truncateToWidth(node.sublabel, textMaxWidth))}</text>`
    : "";
  return label + sublabel;
}

function renderCardNode(node: DiagramNode, box: AbsoluteBox, theme: Theme, icon: ResolvedIcon | null): string {
  const accent = theme.categoryColors[node.category];
  const badgeY = (box.height - BADGE_SIZE) / 2;
  const textX = BADGE_MARGIN + BADGE_SIZE + 12;
  const textMaxWidth = box.width - textX - BADGE_MARGIN;
  const clipId = `clip-badge-${node.id}`;

  const badge = renderIconBadge(icon, accent, clipId, BADGE_MARGIN, badgeY, BADGE_SIZE);
  const text = labelBlock(node, textX, textMaxWidth, box, theme);

  return `<g transform="translate(${box.x}, ${box.y})">
  <rect x="0" y="0" width="${box.width}" height="${box.height}" rx="${CARD_RADIUS}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>
  ${badge}
  ${text}
</g>`;
}

function renderDatabaseNode(node: DiagramNode, box: AbsoluteBox, theme: Theme, icon: ResolvedIcon | null): string {
  const accent = theme.categoryColors[node.category];
  const w = box.width;
  const h = box.height;
  const capRy = Math.min(16, h * 0.16);

  // cylinder body: two elliptical arcs (top and bottom) joined by the sides
  const bodyPath = `M0,${capRy}
    A${w / 2},${capRy} 0 0 1 ${w},${capRy}
    L${w},${h - capRy}
    A${w / 2},${capRy} 0 0 1 0,${h - capRy}
    Z`;

  // icon/text centered in the cylinder's "body", between the two caps
  const badgeY = capRy + (h - capRy * 2 - BADGE_SIZE) / 2;
  const textX = BADGE_MARGIN + BADGE_SIZE + 12;
  const textMaxWidth = w - textX - BADGE_MARGIN;
  const clipId = `clip-badge-${node.id}`;
  const badge = renderIconBadge(icon, accent, clipId, BADGE_MARGIN, badgeY, BADGE_SIZE);
  const text = labelBlock(node, textX, textMaxWidth, box, theme);

  return `<g transform="translate(${box.x}, ${box.y})">
  <path d="${bodyPath}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>
  <ellipse cx="${w / 2}" cy="${capRy}" rx="${w / 2}" ry="${capRy}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5"/>
  ${badge}
  ${text}
</g>`;
}

function renderActorNode(node: DiagramNode, box: AbsoluteBox, theme: Theme, icon: ResolvedIcon | null): string {
  const accent = theme.categoryColors[node.category];
  const size = 48;
  const badgeX = (box.width - size) / 2;
  const badgeY = 4;
  const clipId = `clip-badge-${node.id}`;
  const badge = renderIconBadge(icon, accent, clipId, badgeX, badgeY, size, /* full circle */ size / 2);

  const labelY = badgeY + size + 20;
  const label = `<text x="${box.width / 2}" y="${labelY}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="14" font-weight="600" fill="${theme.labelColor}">${escapeXml(truncateToWidth(node.label, box.width))}</text>`;
  const sublabel = node.sublabel
    ? `<text x="${box.width / 2}" y="${labelY + 17}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="11" fill="${theme.sublabelColor}">${escapeXml(truncateToWidth(node.sublabel, box.width))}</text>`
    : "";

  // No card/background rect -- just the badge (with its own shadow) and the
  // text below it, to visually set people/external systems apart from
  // "boxed" services.
  return `<g transform="translate(${box.x}, ${box.y})">
  <g filter="url(#card-shadow)">${badge}</g>
  ${label}
  ${sublabel}
</g>`;
}

function renderCloudNode(node: DiagramNode, box: AbsoluteBox, theme: Theme, icon: ResolvedIcon | null): string {
  const accent = theme.categoryColors[node.category];
  const w = box.width;
  const h = box.height;
  const badgeY = (h - BADGE_SIZE) / 2 + h * 0.06;
  const textX = BADGE_MARGIN + BADGE_SIZE + 12;
  const textMaxWidth = w - textX - BADGE_MARGIN;
  const clipId = `clip-badge-${node.id}`;
  const badge = renderIconBadge(icon, accent, clipId, BADGE_MARGIN, badgeY, BADGE_SIZE);
  const text = labelBlock(node, textX, textMaxWidth, box, theme);

  // The shadow filter goes on the outer <g> (real px coordinates) instead of
  // the nested <svg> with its viewBox -- applied inside the tiny (0 0 24 24)
  // viewBox, resvg doesn't follow the path's silhouette and draws a
  // rectangular shadow instead.
  return `<g transform="translate(${box.x}, ${box.y})" filter="url(#card-shadow)">
  <svg x="0" y="0" width="${w}" height="${h}" viewBox="${CLOUD_VIEWBOX}" preserveAspectRatio="none">
    <path d="${CLOUD_PATH_D}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="0.6" vector-effect="non-scaling-stroke"/>
  </svg>
  ${badge}
  ${text}
</g>`;
}

function renderIconBadge(
  icon: ResolvedIcon | null,
  accent: string,
  clipId: string,
  x: number,
  y: number,
  size: number,
  radius = 10,
): string {
  if (icon?.brandHex) {
    // brand icon with its own color (thesvg): neutral background, icon clipped with rounded corners
    const inset = Math.round(size * 0.075);
    return `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}"/></clipPath>
  <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="#ffffff"/>
  <g clip-path="url(#${clipId})">
    <svg x="${x + inset}" y="${y + inset}" width="${size - inset * 2}" height="${size - inset * 2}" viewBox="${icon.viewBox}">${icon.body}</svg>
  </g>
  <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="none" stroke="${accent}" stroke-opacity="0.25"/>`;
  }

  const iconInset = Math.round(size * 0.2);
  const inner = icon
    ? `<svg x="${x + iconInset}" y="${y + iconInset}" width="${size - iconInset * 2}" height="${size - iconInset * 2}" viewBox="${icon.viewBox}">${icon.body}</svg>`
    : "";
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-opacity="0.35"/>
  ${inner}`;
}
