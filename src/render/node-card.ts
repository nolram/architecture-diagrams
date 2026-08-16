import type { DiagramNode } from "../spec/schema.js";
import type { AbsoluteBox } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import type { ResolvedIcon } from "../icons/resolve.js";
import { escapeXml, truncateToWidth } from "./svg-utils.js";

const BADGE_SIZE = 40;
const BADGE_MARGIN = 14;
const CARD_RADIUS = 14;

export function renderNodeCard(node: DiagramNode, box: AbsoluteBox, theme: Theme, icon: ResolvedIcon | null): string {
  const accent = theme.categoryColors[node.category];
  const badgeY = (box.height - BADGE_SIZE) / 2;
  const textX = BADGE_MARGIN + BADGE_SIZE + 12;
  const textMaxWidth = box.width - textX - BADGE_MARGIN;
  const clipId = `clip-badge-${node.id}`;

  const badge = icon
    ? renderIconBadge(icon, accent, clipId, badgeY)
    : renderIconBadge(null, accent, clipId, badgeY);

  const labelY = node.sublabel ? box.height / 2 - 5 : box.height / 2 + 5;
  const label = `<text x="${textX}" y="${labelY}" font-family='${theme.fontFamily}' font-size="15" font-weight="600" fill="${theme.labelColor}">${escapeXml(truncateToWidth(node.label, textMaxWidth))}</text>`;
  const sublabel = node.sublabel
    ? `<text x="${textX}" y="${box.height / 2 + 17}" font-family='${theme.fontFamily}' font-size="12" fill="${theme.sublabelColor}">${escapeXml(truncateToWidth(node.sublabel, textMaxWidth))}</text>`
    : "";

  return `<g transform="translate(${box.x}, ${box.y})">
  <rect x="0" y="0" width="${box.width}" height="${box.height}" rx="${CARD_RADIUS}" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>
  ${badge}
  ${label}
  ${sublabel}
</g>`;
}

function renderIconBadge(icon: ResolvedIcon | null, accent: string, clipId: string, y: number): string {
  const x = BADGE_MARGIN;
  if (icon?.brandHex) {
    // ícone de marca com cor própria (thesvg): fundo neutro, ícone recortado com cantos arredondados
    const inset = 3;
    return `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${BADGE_SIZE}" height="${BADGE_SIZE}" rx="10"/></clipPath>
  <rect x="${x}" y="${y}" width="${BADGE_SIZE}" height="${BADGE_SIZE}" rx="10" fill="#ffffff"/>
  <g clip-path="url(#${clipId})">
    <svg x="${x + inset}" y="${y + inset}" width="${BADGE_SIZE - inset * 2}" height="${BADGE_SIZE - inset * 2}" viewBox="${icon.viewBox}">${icon.body}</svg>
  </g>
  <rect x="${x}" y="${y}" width="${BADGE_SIZE}" height="${BADGE_SIZE}" rx="10" fill="none" stroke="${accent}" stroke-opacity="0.25"/>`;
  }

  const iconInset = 8;
  const inner = icon
    ? `<svg x="${x + iconInset}" y="${y + iconInset}" width="${BADGE_SIZE - iconInset * 2}" height="${BADGE_SIZE - iconInset * 2}" viewBox="${icon.viewBox}">${icon.body}</svg>`
    : "";
  return `<rect x="${x}" y="${y}" width="${BADGE_SIZE}" height="${BADGE_SIZE}" rx="10" fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-opacity="0.35"/>
  ${inner}`;
}
