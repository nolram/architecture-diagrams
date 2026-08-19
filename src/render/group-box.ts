import type { DiagramGroup } from "../spec/schema.js";
import type { AbsoluteBox } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import { GROUP_CHIP_CHAR_WIDTH, GROUP_CHIP_PAD_X, GROUP_CHIP_MARGIN } from "../layout/geometry.js";
import { escapeXml, truncateToWidth } from "./svg-utils.js";

const GROUP_RADIUS = 18;
const CHIP_HEIGHT = 26;

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

  return `<g>
  <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${GROUP_RADIUS}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"${dash}/>
  <rect x="${chipX}" y="${chipY}" width="${chipWidth}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="${style.labelBg}" stroke="${style.stroke}" stroke-width="1"/>
  <text x="${chipX + chipWidth / 2}" y="${chipY + CHIP_HEIGHT / 2 + 4}" font-family='${theme.fontFamily}' font-size="12" font-weight="700" letter-spacing="0.3" text-anchor="middle" fill="${style.labelColor}">${escapeXml(label)}</text>
</g>`;
}
