import type { DiagramSpec } from "../spec/schema.js";
import type { LayoutResult } from "../layout/run-layout.js";
import { resolveIcon, fallbackBadge, type ResolvedIcon } from "../icons/resolve.js";
import { getTheme } from "./theme.js";
import { renderNode } from "./node-card.js";
import { renderGroupBox } from "./group-box.js";
import { renderEdge } from "./edges.js";
import { shouldShowLegend, computeLegendEntries, renderLegend } from "./legend.js";
import { escapeXml } from "./svg-utils.js";

export interface ComposeResult {
  svg: string;
  warnings: string[];
}

const CANVAS_MARGIN = 32;
const TITLE_HEIGHT = 56;

export async function composeDiagram(spec: DiagramSpec, layout: LayoutResult, baseDir = process.cwd()): Promise<ComposeResult> {
  const theme = getTheme(spec.theme);
  const warnings: string[] = [];

  const iconByNode = new Map<string, ResolvedIcon | null>();
  for (const node of spec.nodes) {
    if (!node.icon) {
      iconByNode.set(node.id, null);
      continue;
    }
    const accent = theme.categoryColors[node.category];
    const resolved = await resolveIcon(node.icon, accent, baseDir);
    if (resolved.ok) {
      iconByNode.set(node.id, resolved.icon);
    } else {
      const message = resolved.reason
        ? `icon "${node.icon}" (node "${node.id}"): ${resolved.reason}`
        : `icon "${node.icon}" (node "${node.id}") not found in the catalog.${resolved.suggestions.length ? ` Suggestions: ${resolved.suggestions.join(", ")}.` : ""}`;
      warnings.push(message);
      iconByNode.set(node.id, fallbackBadge(node.label, accent));
    }
  }

  const groupsById = new Map(spec.groups.map((g) => [g.id, g]));
  const nodesById = new Map(spec.nodes.map((n) => [n.id, n]));

  const groupParts = [...layout.groups.values()].map((box) => renderGroupBox(groupsById.get(box.id)!, box, theme));

  const edgeParts = spec.edges
    .map((edge, i) => {
      const route = layout.edges.get(`edge_${i}`);
      if (!route) return "";
      return renderEdge(edge, route, theme);
    })
    .filter(Boolean);

  const nodeParts = [...layout.nodes.values()].map((box) =>
    renderNode(nodesById.get(box.id)!, box, theme, iconByNode.get(box.id) ?? null, spec.wrap.maxLines),
  );

  const offsetX = CANVAS_MARGIN;
  const offsetY = CANVAS_MARGIN + (spec.title ? TITLE_HEIGHT : 0);
  const width = layout.width + CANVAS_MARGIN * 2;

  const legend = shouldShowLegend(spec) ? renderLegend(computeLegendEntries(spec, theme), layout.width, theme) : null;
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
${groupParts.join("\n")}
${edgeParts.join("\n")}
${nodeParts.join("\n")}
</g>
${legendBlock}
</svg>`;

  return { svg, warnings };
}
