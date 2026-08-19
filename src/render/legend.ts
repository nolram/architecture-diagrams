import type { DiagramSpec } from "../spec/schema.js";
import type { IconCategory } from "../icons/catalog.js";
import type { GroupStyleVariant, Theme } from "./theme.js";
import { escapeXml } from "./svg-utils.js";

const CATEGORY_LABELS: Record<IconCategory, string> = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  network: "Network",
  security: "Security",
  messaging: "Messaging",
  external: "External",
  generic: "Generic",
};

const GROUP_STYLE_LABELS: Record<GroupStyleVariant, string> = {
  vpc: "VPC",
  subnet: "Subnet",
  az: "Availability zone",
  boundary: "Logical grouping",
  generic: "Group",
};

export interface LegendEntry {
  color: string;
  label: string;
  /** draw the swatch as a dashed line instead of a solid rect (used for "dashed = non-active status") */
  dashed?: boolean;
}

/**
 * The legend only shows up when the diagram actually has enough color
 * variety to be worth explaining -- a handful of elements don't need one,
 * and always showing one would just add visual noise.
 */
export function shouldShowLegend(spec: DiagramSpec): boolean {
  const styles = new Set(spec.groups.map((g) => g.style));
  const categories = new Set(spec.nodes.map((n) => n.category));
  return styles.size >= 2 || categories.size >= 3;
}

/** entries in the order styles/categories first appear in the spec, deduplicated */
export function computeLegendEntries(spec: DiagramSpec, theme: Theme): LegendEntry[] {
  const entries: LegendEntry[] = [];

  const seenStyles = new Set<GroupStyleVariant>();
  for (const group of spec.groups) {
    if (seenStyles.has(group.style)) continue;
    seenStyles.add(group.style);
    entries.push({ color: theme.groupStyles[group.style].stroke, label: GROUP_STYLE_LABELS[group.style] });
  }

  const seenCategories = new Set<IconCategory>();
  for (const node of spec.nodes) {
    if (seenCategories.has(node.category)) continue;
    seenCategories.add(node.category);
    entries.push({ color: theme.categoryColors[node.category], label: CATEGORY_LABELS[node.category] });
  }

  return entries;
}

const SWATCH_SIZE = 12;
const ENTRY_GAP = 22;
const ROW_HEIGHT = 24;
const LABEL_CHAR_WIDTH = 6.2;

export interface RenderedLegend {
  svg: string;
  height: number;
}

/** draws the legend at origin (0,0) -- the caller positions it via <g transform="translate(x,y)"> */
export function renderLegend(entries: LegendEntry[], maxWidth: number, theme: Theme): RenderedLegend {
  if (entries.length === 0) return { svg: "", height: 0 };

  let x = 0;
  let y = 0;
  const parts: string[] = [];

  for (const entry of entries) {
    const textWidth = entry.label.length * LABEL_CHAR_WIDTH;
    const entryWidth = SWATCH_SIZE + 8 + textWidth;
    if (x > 0 && x + entryWidth > maxWidth) {
      x = 0;
      y += ROW_HEIGHT;
    }
    const swatchY = y + (ROW_HEIGHT - SWATCH_SIZE) / 2;
    const swatch = entry.dashed
      // "4 4" matches the C4 non-active status dash (STATUS_DASH in engines/c4/render.ts);
      // not imported to avoid a circular import back into the C4 engine
      ? `<line x1="${x}" y1="${y + ROW_HEIGHT / 2}" x2="${x + SWATCH_SIZE}" y2="${y + ROW_HEIGHT / 2}" stroke="${entry.color}" stroke-width="2.5" stroke-dasharray="4 4"/>`
      : `<rect x="${x}" y="${swatchY}" width="${SWATCH_SIZE}" height="${SWATCH_SIZE}" rx="3" fill="${entry.color}"/>`;
    parts.push(
      swatch,
      `<text x="${x + SWATCH_SIZE + 8}" y="${y + ROW_HEIGHT / 2 + 4}" font-family='${theme.fontFamily}' font-size="12" fill="${theme.sublabelColor}">${escapeXml(entry.label)}</text>`,
    );
    x += entryWidth + ENTRY_GAP;
  }

  const height = y + ROW_HEIGHT;
  return { svg: `<g>${parts.join("\n")}</g>`, height };
}
