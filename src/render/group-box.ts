import type { DiagramGroup } from "../spec/schema.js";
import type { AbsoluteBox } from "../layout/run-layout.js";
import type { Theme } from "./theme.js";
import { escapeXml } from "./svg-utils.js";

const GROUP_RADIUS = 18;
const CHIP_HEIGHT = 26;
const CHIP_PAD_X = 12;
const CHAR_WIDTH = 6.6;

export function renderGroupBox(group: DiagramGroup, box: AbsoluteBox, theme: Theme): string {
  const style = theme.groupStyles[group.style];
  const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : "";
  const chipWidth = group.label.length * CHAR_WIDTH + CHIP_PAD_X * 2;
  const chipX = box.x + 16;
  const chipY = box.y - CHIP_HEIGHT / 2;

  return `<g>
  <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${GROUP_RADIUS}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"${dash}/>
  <rect x="${chipX}" y="${chipY}" width="${chipWidth}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="${style.labelBg}" stroke="${style.stroke}" stroke-width="1"/>
  <text x="${chipX + chipWidth / 2}" y="${chipY + CHIP_HEIGHT / 2 + 4}" font-family='${theme.fontFamily}' font-size="12" font-weight="700" letter-spacing="0.3" text-anchor="middle" fill="${style.labelColor}">${escapeXml(group.label.toUpperCase())}</text>
</g>`;
}
