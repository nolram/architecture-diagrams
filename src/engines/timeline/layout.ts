import type { TimelineRelationship, TimelineSpec } from "./schema.js";
import { estimatePhaseSize, timelineEdgeLabelSize } from "./geometry.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";

const PHASE_GAP = 60;
const REL_OFFSET = 30;

export function resolveTimelineDirection(spec: TimelineSpec): "right" | "down" {
  return spec.direction === "down" ? "down" : "right";
}

function isConsecutivePair(spec: TimelineSpec, from: string, to: string): boolean {
  for (let i = 0; i < spec.phases.length - 1; i++) {
    const a = spec.phases[i].id;
    const b = spec.phases[i + 1].id;
    if ((a === from && b === to) || (a === to && b === from)) return true;
  }
  return false;
}

function findConsecutiveRelationship(spec: TimelineSpec, from: string, to: string): TimelineRelationship | undefined {
  return spec.relationships.find((r) => (r.from === from && r.to === to) || (r.from === to && r.to === from));
}

export function buildTimelineLayout(spec: TimelineSpec): LayoutResult {
  const direction = resolveTimelineDirection(spec);
  const sizes = spec.phases.map((p) => estimatePhaseSize(p));
  const nodes = new Map<string, AbsoluteBox>();
  const edges = new Map<string, EdgeRoute>();

  if (direction === "right") {
    const maxHeight = Math.max(...sizes.map((s) => s.height));
    const hasNonConsecutive = spec.relationships.some((r) => !isConsecutivePair(spec, r.from, r.to));
    const yShift = hasNonConsecutive ? REL_OFFSET : 0;

    let x = 0;
    for (let i = 0; i < spec.phases.length; i++) {
      const phase = spec.phases[i];
      const size = sizes[i];
      nodes.set(phase.id, { id: phase.id, x, y: (maxHeight - size.height) / 2 + yShift, width: size.width, height: size.height });
      x += size.width + PHASE_GAP;
    }

    const centerY = maxHeight / 2 + yShift;

    for (let i = 0; i < spec.phases.length - 1; i++) {
      const fromBox = nodes.get(spec.phases[i].id)!;
      const toBox = nodes.get(spec.phases[i + 1].id)!;
      const points = [
        { x: fromBox.x + fromBox.width, y: centerY },
        { x: toBox.x, y: centerY },
      ];
      const rel = findConsecutiveRelationship(spec, spec.phases[i].id, spec.phases[i + 1].id);
      if (rel?.label) {
        const labelSize = timelineEdgeLabelSize(rel.label);
        const midX = (points[0].x + points[1].x) / 2;
        edges.set(`flow_${i}`, {
          id: `flow_${i}`,
          points,
          labelPosition: { x: midX - labelSize.width / 2, y: centerY - labelSize.height / 2 },
          labelSize,
        });
      } else {
        edges.set(`flow_${i}`, { id: `flow_${i}`, points });
      }
    }

    for (let i = 0; i < spec.relationships.length; i++) {
      const rel = spec.relationships[i];
      if (isConsecutivePair(spec, rel.from, rel.to)) continue;
      const fromBox = nodes.get(rel.from)!;
      const toBox = nodes.get(rel.to)!;
      const fromCenterX = fromBox.x + fromBox.width / 2;
      const toCenterX = toBox.x + toBox.width / 2;
      const fromTopY = fromBox.y;
      const toTopY = toBox.y;
      const points = [
        { x: fromCenterX, y: fromTopY },
        { x: fromCenterX, y: fromTopY - REL_OFFSET },
        { x: toCenterX, y: toTopY - REL_OFFSET },
        { x: toCenterX, y: toTopY },
      ];
      if (rel.label) {
        const labelSize = timelineEdgeLabelSize(rel.label);
        const midX = (fromCenterX + toCenterX) / 2;
        edges.set(`rel_${i}`, {
          id: `rel_${i}`,
          points,
          labelPosition: { x: midX - labelSize.width / 2, y: fromTopY - REL_OFFSET - labelSize.height / 2 },
          labelSize,
        });
      } else {
        edges.set(`rel_${i}`, { id: `rel_${i}`, points });
      }
    }

    const width = x - PHASE_GAP;
    const height = maxHeight + yShift;

    return { width, height, direction, nodes, groups: new Map(), edges };
  }

  const maxWidth = Math.max(...sizes.map((s) => s.width));
  const hasNonConsecutive = spec.relationships.some((r) => !isConsecutivePair(spec, r.from, r.to));
  const xShift = hasNonConsecutive ? REL_OFFSET : 0;

  let y = 0;
  for (let i = 0; i < spec.phases.length; i++) {
    const phase = spec.phases[i];
    const size = sizes[i];
    nodes.set(phase.id, { id: phase.id, x: (maxWidth - size.width) / 2 + xShift, y, width: size.width, height: size.height });
    y += size.height + PHASE_GAP;
  }

  const centerX = maxWidth / 2 + xShift;

  for (let i = 0; i < spec.phases.length - 1; i++) {
    const fromBox = nodes.get(spec.phases[i].id)!;
    const toBox = nodes.get(spec.phases[i + 1].id)!;
    const points = [
      { x: centerX, y: fromBox.y + fromBox.height },
      { x: centerX, y: toBox.y },
    ];
    const rel = findConsecutiveRelationship(spec, spec.phases[i].id, spec.phases[i + 1].id);
    if (rel?.label) {
      const labelSize = timelineEdgeLabelSize(rel.label);
      const midY = (points[0].y + points[1].y) / 2;
      edges.set(`flow_${i}`, {
        id: `flow_${i}`,
        points,
        labelPosition: { x: centerX - labelSize.width / 2, y: midY - labelSize.height / 2 },
        labelSize,
      });
    } else {
      edges.set(`flow_${i}`, { id: `flow_${i}`, points });
    }
  }

  for (let i = 0; i < spec.relationships.length; i++) {
    const rel = spec.relationships[i];
    if (isConsecutivePair(spec, rel.from, rel.to)) continue;
    const fromBox = nodes.get(rel.from)!;
    const toBox = nodes.get(rel.to)!;
    const fromCenterY = fromBox.y + fromBox.height / 2;
    const toCenterY = toBox.y + toBox.height / 2;
    const fromLeftX = fromBox.x;
    const toLeftX = toBox.x;
    const points = [
      { x: fromLeftX, y: fromCenterY },
      { x: fromLeftX - REL_OFFSET, y: fromCenterY },
      { x: toLeftX - REL_OFFSET, y: toCenterY },
      { x: toLeftX, y: toCenterY },
    ];
    if (rel.label) {
      const labelSize = timelineEdgeLabelSize(rel.label);
      const midY = (fromCenterY + toCenterY) / 2;
      edges.set(`rel_${i}`, {
        id: `rel_${i}`,
        points,
        labelPosition: { x: fromLeftX - REL_OFFSET - labelSize.width / 2, y: midY - labelSize.height / 2 },
        labelSize,
      });
    } else {
      edges.set(`rel_${i}`, { id: `rel_${i}`, points });
    }
  }

  const height = y - PHASE_GAP;
  const width = maxWidth + xShift;

  return { width, height, direction, nodes, groups: new Map(), edges };
}

export async function layoutTimeline(spec: TimelineSpec): Promise<LayoutResult> {
  return buildTimelineLayout(spec);
}
