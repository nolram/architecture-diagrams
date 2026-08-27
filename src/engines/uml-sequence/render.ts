import type { UmlSequenceFragment, UmlSequenceMessage, UmlSequenceParticipant, UmlSequenceSpec } from "./schema.js";
import type { SequenceLayout } from "./layout.js";
import type { AbsoluteBox } from "../../layout/run-layout.js";
import { getTheme, type Theme } from "../../render/theme.js";
import { escapeXml } from "../../render/svg-utils.js";
import type { ComposeResult } from "../../render/compose.js";
import { ACTIVATION_WIDTH, CHAR_WIDTH, FRAGMENT_TAB_HEIGHT, SELF_LOOP_DROP, SELF_LOOP_WIDTH } from "./geometry.js";

const CANVAS_MARGIN = 32;
const TITLE_HEIGHT = 56;
const ARROW_LENGTH = 10;
const ARROW_HALF_WIDTH = 4;

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

function renderFragment(f: UmlSequenceFragment, box: AbsoluteBox, layout: SequenceLayout, theme: Theme): string {
  const parts: string[] = [];
  parts.push(
    `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="6" fill="none" stroke="${theme.cardBorder}" stroke-dasharray="6 4"/>`,
  );

  // the tab must never be wider than the fragment box: truncate the guard label (with an ellipsis) to fit
  const TAB_PAD = 8; // horizontal padding inside the tab (text starts at box.x + TAB_PAD)
  const maxChars = Math.max(4, Math.floor((box.width - 2 * TAB_PAD) / 7));
  let tabLabel = f.label ?? "";
  if (f.label && f.kind.length + tabLabel.length + 4 > maxChars) {
    const room = Math.max(1, maxChars - f.kind.length - 4); // leave room for " [" and "]"
    tabLabel = tabLabel.slice(0, room) + "…";
  }
  const tabWidth = (f.kind.length + (tabLabel ? tabLabel.length + 4 : 0)) * 7 + 2 * TAB_PAD;
  parts.push(
    `<rect x="${box.x}" y="${box.y}" width="${tabWidth}" height="${FRAGMENT_TAB_HEIGHT}" fill="${theme.cardBg}" stroke="${theme.cardBorder}"/>`,
  );
  const labelPart = tabLabel ? ` [${escapeXml(tabLabel)}]` : "";
  parts.push(
    `<text x="${box.x + 8}" y="${box.y + 16}" font-family='${theme.fontFamily}' font-size="12" fill="${theme.labelColor}"><tspan font-weight="700">${escapeXml(f.kind)}</tspan>${labelPart}</text>`,
  );

  if (f.label && f.messages.length >= 2) {
    const y = layout.messageYs.get(f.messages[1])!;
    parts.push(`<line x1="${box.x}" y1="${y}" x2="${box.x + box.width}" y2="${y}" stroke="${theme.cardBorder}"/>`);
  }

  return parts.join("\n");
}

function renderMessage(m: UmlSequenceMessage, routePoints: Point[], theme: Theme): string {
  const points = routePoints;
  if (points.length < 2) return "";

  const from = points[0];
  const to = points[points.length - 1];
  const toDir = unitVec(points[points.length - 2], to);
  const lineEnd = { x: to.x - ARROW_LENGTH * toDir.x, y: to.y - ARROW_LENGTH * toDir.y };
  const angle = angleDeg(points[points.length - 2], to);

  const open = m.kind === "async" || m.kind === "reply";
  const dash = m.kind === "reply" ? ' stroke-dasharray="7 5"' : "";

  const linePoints = [from, ...points.slice(1, -1), lineEnd];
  const d = linePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const path = `<path d="${d}" fill="none" stroke="${theme.edgeColor}" stroke-width="1.5"${dash}/>`;
  const marker = `<polygon points="0,0 ${-ARROW_LENGTH},${-ARROW_HALF_WIDTH} ${-ARROW_LENGTH},${ARROW_HALF_WIDTH}" fill="${open ? "none" : theme.edgeColor}" stroke="${theme.edgeColor}" stroke-width="2" transform="translate(${to.x} ${to.y}) rotate(${angle})"/>`;

  let label = "";
  if (m.label) {
    const bgWidth = m.label.length * CHAR_WIDTH + 8;
    if (m.kind === "self") {
      const x = from.x + SELF_LOOP_WIDTH + 8;
      const y = from.y + SELF_LOOP_DROP / 2 + 4;
      label = `<rect x="${x}" y="${y - 11}" width="${bgWidth}" height="16" fill="${theme.canvasBg}"/>` +
        `<text x="${x}" y="${y}" text-anchor="start" font-family='${theme.fontFamily}' font-size="12" fill="${theme.labelColor}">${escapeXml(m.label)}</text>`;
    } else {
      const x = (points[0].x + points[1].x) / 2;
      const y = from.y - 6;
      label = `<rect x="${x - bgWidth / 2}" y="${y - 11}" width="${bgWidth}" height="16" fill="${theme.canvasBg}"/>` +
        `<text x="${x}" y="${y}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="12" fill="${theme.labelColor}">${escapeXml(m.label)}</text>`;
    }
  }

  return path + marker + label;
}

function renderParticipant(p: UmlSequenceParticipant, box: AbsoluteBox, theme: Theme): string {
  const cx = box.x + box.width / 2;

  if (p.type === "actor") {
    const parts: string[] = [];
    if (p.stereotype) {
      parts.push(
        `<text x="${cx}" y="${box.y - 6}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="11" font-style="italic" fill="${theme.sublabelColor}">«${escapeXml(p.stereotype)}»</text>`,
      );
    }
    parts.push(`<circle cx="${cx}" cy="${box.y + 7}" r="7" fill="none" stroke="${theme.edgeColor}" stroke-width="2"/>`);
    parts.push(`<line x1="${cx}" y1="${box.y + 14}" x2="${cx}" y2="${box.y + 34}" stroke="${theme.edgeColor}" stroke-width="2"/>`);
    parts.push(`<line x1="${cx - 12}" y1="${box.y + 20}" x2="${cx + 12}" y2="${box.y + 20}" stroke="${theme.edgeColor}" stroke-width="2"/>`);
    parts.push(`<line x1="${cx}" y1="${box.y + 34}" x2="${cx - 10}" y2="${box.y + 50}" stroke="${theme.edgeColor}" stroke-width="2"/>`);
    parts.push(`<line x1="${cx}" y1="${box.y + 34}" x2="${cx + 10}" y2="${box.y + 50}" stroke="${theme.edgeColor}" stroke-width="2"/>`);
    parts.push(
      `<text x="${cx}" y="${box.y + box.height + 14}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="12" fill="${theme.labelColor}">${escapeXml(p.name)}</text>`,
    );
    return parts.join("\n");
  }

  const parts: string[] = [];
  if (p.stereotype) {
    parts.push(
      `<text x="${cx}" y="${box.y - 6}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="11" font-style="italic" fill="${theme.sublabelColor}">«${escapeXml(p.stereotype)}»</text>`,
    );
  }
  parts.push(
    `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="8" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.5" filter="url(#card-shadow)"/>`,
  );
  parts.push(
    `<text x="${cx}" y="${box.y + box.height / 2 + 4}" text-anchor="middle" font-family='${theme.fontFamily}' font-size="13" font-weight="600" fill="${theme.labelColor}">${escapeXml(p.name)}</text>`,
  );
  return parts.join("\n");
}

export async function composeUmlSequence(
  spec: UmlSequenceSpec,
  layout: SequenceLayout,
  baseDir = process.cwd(),
): Promise<ComposeResult> {
  const theme = getTheme(spec.theme);
  const warnings: string[] = [];
  warnings.push(...layout.activationWarnings);

  const fragmentParts = spec.fragments
    .map((f) => {
      const box = layout.groups.get(f.id);
      if (!box) return "";
      return renderFragment(f, box, layout, theme);
    })
    .filter(Boolean);

  const lifelineParts = spec.participants
    .map((p) => {
      const ll = layout.lifelines.get(p.id);
      if (!ll) return "";
      return `<line x1="${ll.x}" y1="${ll.top}" x2="${ll.x}" y2="${ll.bottom}" stroke="${theme.edgeColor}" stroke-width="1" stroke-dasharray="4 4"/>`;
    })
    .filter(Boolean);

  const activationParts = layout.activations
    .map((a) => {
      const ll = layout.lifelines.get(a.participantId);
      if (!ll) return "";
      return `<rect x="${ll.x - ACTIVATION_WIDTH / 2 + a.xOffset}" y="${a.top}" width="${ACTIVATION_WIDTH}" height="${a.bottom - a.top}" fill="${theme.cardBg}" stroke="${theme.edgeColor}" stroke-width="1.5"/>`;
    })
    .filter(Boolean);

  const messageParts = spec.messages
    .map((m) => {
      const route = layout.edges.get(m.id);
      if (!route) return "";
      return renderMessage(m, route.points, theme);
    })
    .filter(Boolean);

  const participantParts = spec.participants
    .map((p) => {
      const box = layout.nodes.get(p.id);
      if (!box) return "";
      return renderParticipant(p, box, theme);
    })
    .filter(Boolean);

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
 ${fragmentParts.join("\n")}
 ${lifelineParts.join("\n")}
 ${activationParts.join("\n")}
 ${messageParts.join("\n")}
 ${participantParts.join("\n")}
 </g>
 </svg>`;

  return { svg, warnings };
}
