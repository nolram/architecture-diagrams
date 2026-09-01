import type { DiagramGroup } from "../spec/schema.js";
import type { AbsoluteBox } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import { GROUP_CHIP_CHAR_WIDTH, GROUP_CHIP_PAD_X, GROUP_CHIP_MARGIN } from "../layout/geometry.js";
import { escapeXml, truncateToWidth } from "./svg-utils.js";

const GROUP_RADIUS = 18;
const CHIP_HEIGHT = 26;
const BORDER_WIDTH = 2;
/** clearance on each side of the chip so the border gap never touches the chip's own outline */
const GAP_PAD = 3;

export function renderGroupBox(group: DiagramGroup, box: AbsoluteBox, theme: Theme): string {
  const style = theme.groupStyles[group.style];
  const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : "";

  // build-graph.ts already gives the group container a minimum width that
  // fits the chip at full length -- this clamp is just a safety net (e.g. a
  // group nested where the parent further constrains its size) so the chip
  // can never spill past the box's own border no matter what.
  const maxChipWidth = Math.max(GROUP_CHIP_PAD_X * 2, box.width - GROUP_CHIP_MARGIN * 2);
  const maxLabelWidth = maxChipWidth - GROUP_CHIP_PAD_X * 2;
  const label = truncateToWidth(group.label.toUpperCase(), maxLabelWidth, GROUP_CHIP_CHAR_WIDTH);
  const chipWidth = Math.min(maxChipWidth, label.length * GROUP_CHIP_CHAR_WIDTH + GROUP_CHIP_PAD_X * 2);
  const chipX = box.x + GROUP_CHIP_MARGIN;
  const chipY = box.y - CHIP_HEIGHT / 2;

  // The chip sits centred on the box's top border, so a continuous outline would
  // run straight through the label (a strike-through). Instead we split the
  // outline into a fill rect (no stroke) plus a border path that leaves a gap
  // where the chip sits. The chip stays transparent, so whatever is behind it --
  // the box's own fill, or a parent group's fill when nested -- shows through.
  const r = GROUP_RADIUS;
  const x = box.x;
  const y = box.y;
  const w = box.width;
  const h = box.height;
  const topEdgeStart = x + r;
  const topEdgeEnd = x + w - r;
  const gapStart = Math.max(chipX - GAP_PAD, topEdgeStart);
  const gapEnd = Math.min(chipX + chipWidth + GAP_PAD, topEdgeEnd);

  const leftTop = gapStart > topEdgeStart ? `M${topEdgeStart},${y} L${gapStart},${y} ` : "";
  const rightTop = gapEnd < topEdgeEnd ? `M${gapEnd},${y} L${topEdgeEnd},${y} ` : "";
  const borderPath =
    `${leftTop}${rightTop}` +
    `M${x + w - r},${y} ` +
    `A${r},${r} 0 0 1 ${x + w},${y + r} ` +
    `L${x + w},${y + h - r} ` +
    `A${r},${r} 0 0 1 ${x + w - r},${y + h} ` +
    `L${x + r},${y + h} ` +
    `A${r},${r} 0 0 1 ${x},${y + h - r} ` +
    `L${x},${y + r} ` +
    `A${r},${r} 0 0 1 ${x + r},${y}`;

  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${style.fill}"/>
  <path d="${borderPath}" fill="none" stroke="${style.stroke}" stroke-width="${BORDER_WIDTH}"${dash}/>
  <rect x="${chipX}" y="${chipY}" width="${chipWidth}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="${style.labelBg}" stroke="${style.stroke}" stroke-width="1"/>
  <text x="${chipX + chipWidth / 2}" y="${chipY + CHIP_HEIGHT / 2 + 4}" font-family='${theme.fontFamily}' font-size="12" font-weight="700" letter-spacing="0.3" text-anchor="middle" fill="${style.labelColor}">${escapeXml(label)}</text>
</g>`;
}
