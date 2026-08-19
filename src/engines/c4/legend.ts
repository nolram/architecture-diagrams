import type { C4Element, C4Spec } from "./schema.js";
import type { Theme } from "../../render/theme.js";
import { renderLegend, type LegendEntry } from "../../render/legend.js";
import { escapeXml } from "../../render/svg-utils.js";

/** the legend's heading, keyed by the C4 zoom level -- this is what makes `level` visible in the output */
export const C4_LEVEL_TITLES = {
  context: "System Context",
  container: "Container",
  component: "Component",
} as const;

const C4_TYPE_LABELS: Record<C4Element["type"], string> = {
  person: "Person",
  system: "System",
  "external-system": "External system",
  container: "Container",
  component: "Component",
};

/** canonical display order for the legend entries */
const CANONICAL_ORDER: C4Element["type"][] = ["person", "system", "external-system", "container", "component"];

/**
 * A legend is only worth drawing when the diagram actually mixes element types --
 * a single-type diagram has nothing to explain, so we skip it to avoid noise.
 */
export function shouldShowC4Legend(spec: C4Spec): boolean {
  const types = new Set(spec.elements.map((el) => el.type));
  return types.size >= 2;
}

/** one entry per element type present in the diagram, in canonical order */
export function computeC4LegendEntries(spec: C4Spec, theme: Theme): LegendEntry[] {
  const present = new Set(spec.elements.map((el) => el.type));
  return CANONICAL_ORDER.filter((t) => present.has(t)).map((t) => ({
    color: theme.c4[t].stroke,
    label: C4_TYPE_LABELS[t],
  }));
}

const TITLE_HEIGHT = 20;
const TITLE_GAP = 10;

export interface RenderedC4Legend {
  svg: string;
  height: number;
}

/**
 * Draws the C4 legend at origin (0,0) -- the caller positions it via
 * <g transform="translate(x,y)">. It is a color key for the element types
 * present in the diagram, headed by the zoom level (context/container/component).
 */
export function renderC4Legend(spec: C4Spec, theme: Theme, maxWidth: number): RenderedC4Legend {
  const entries = computeC4LegendEntries(spec, theme);
  if (entries.length === 0) return { svg: "", height: 0 };

  const title = `<text x="0" y="14" font-family='${theme.fontFamily}' font-size="13" font-weight="700" fill="${theme.sublabelColor}">${escapeXml(C4_LEVEL_TITLES[spec.level])}</text>`;
  const body = renderLegend(entries, maxWidth, theme);
  const bodyBlock = `<g transform="translate(0, ${TITLE_HEIGHT + TITLE_GAP})">${body.svg}</g>`;

  return { svg: `<g>${title}\n${bodyBlock}</g>`, height: TITLE_HEIGHT + TITLE_GAP + body.height };
}
