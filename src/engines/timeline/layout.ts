import type { TimelineRelationship, TimelineSpec } from "./schema.js";
import { GATE_DIAMOND_HEIGHT, estimatePhaseSize, timelineEdgeLabelSize } from "./geometry.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";

const PHASE_GAP = 60;
const LANE_SPACING = 28;

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

function nonConsecutiveRelationships(spec: TimelineSpec): { rel: TimelineRelationship; index: number }[] {
  const out: { rel: TimelineRelationship; index: number }[] = [];
  for (let i = 0; i < spec.relationships.length; i++) {
    if (!isConsecutivePair(spec, spec.relationships[i].from, spec.relationships[i].to)) {
      out.push({ rel: spec.relationships[i], index: i });
    }
  }
  return out;
}

export function buildTimelineLayout(spec: TimelineSpec): LayoutResult {
  const direction = resolveTimelineDirection(spec);
  const sizes = spec.phases.map((p) => estimatePhaseSize(p));
  const nodes = new Map<string, AbsoluteBox>();
  const edges = new Map<string, EdgeRoute>();

  if (direction === "right") {
    const anchors = spec.phases.map((p, i) => (p.kind === "gate" ? GATE_DIAMOND_HEIGHT / 2 : sizes[i].height / 2));
    const maxAnchor = Math.max(...anchors);

    const nonConsec = nonConsecutiveRelationships(spec);
    let clearance = 0;
    nonConsec.forEach(({ rel }, k) => {
      const labelH = rel.label ? timelineEdgeLabelSize(rel.label).height : 0;
      clearance = Math.max(clearance, (k + 1) * LANE_SPACING + labelH / 2);
    });

    const flowY = maxAnchor + clearance;

    let x = 0;
    for (let i = 0; i < spec.phases.length; i++) {
      const phase = spec.phases[i];
      const size = sizes[i];
      nodes.set(phase.id, { id: phase.id, x, y: flowY - anchors[i], width: size.width, height: size.height });
      x += size.width + PHASE_GAP;
    }

    for (let i = 0; i < spec.phases.length - 1; i++) {
      const fromBox = nodes.get(spec.phases[i].id)!;
      const toBox = nodes.get(spec.phases[i + 1].id)!;
      const points = [
        { x: fromBox.x + fromBox.width, y: flowY },
        { x: toBox.x, y: flowY },
      ];
      const rel = findConsecutiveRelationship(spec, spec.phases[i].id, spec.phases[i + 1].id);
      if (rel?.label) {
        const labelSize = timelineEdgeLabelSize(rel.label);
        const midX = (points[0].x + points[1].x) / 2;
        edges.set(`flow_${i}`, {
          id: `flow_${i}`,
          points,
          labelPosition: { x: midX - labelSize.width / 2, y: flowY - labelSize.height / 2 },
          labelSize,
        });
      } else {
        edges.set(`flow_${i}`, { id: `flow_${i}`, points });
      }
    }

    nonConsec.forEach(({ rel, index }, k) => {
      const fromBox = nodes.get(rel.from)!;
      const toBox = nodes.get(rel.to)!;
      const fromCenterX = fromBox.x + fromBox.width / 2;
      const toCenterX = toBox.x + toBox.width / 2;
      const laneY = flowY - maxAnchor - (k + 1) * LANE_SPACING;
      const points = [
        { x: fromCenterX, y: fromBox.y },
        { x: fromCenterX, y: laneY },
        { x: toCenterX, y: laneY },
        { x: toCenterX, y: toBox.y },
      ];
      if (rel.label) {
        const labelSize = timelineEdgeLabelSize(rel.label);
        const midX = (fromCenterX + toCenterX) / 2;
        edges.set(`rel_${index}`, {
          id: `rel_${index}`,
          points,
          labelPosition: { x: midX - labelSize.width / 2, y: laneY - labelSize.height / 2 },
          labelSize,
        });
      } else {
        edges.set(`rel_${index}`, { id: `rel_${index}`, points });
      }
    });

    const width = x - PHASE_GAP;
    const height = flowY + Math.max(...spec.phases.map((_, i) => sizes[i].height - anchors[i]));

    return { width, height, direction, nodes, groups: new Map(), edges };
  }

  const anchors = spec.phases.map((p, i) => (p.kind === "gate" ? GATE_DIAMOND_HEIGHT / 2 : sizes[i].width / 2));
  const maxAnchor = Math.max(...anchors);

  const nonConsec = nonConsecutiveRelationships(spec);
  let clearance = 0;
  nonConsec.forEach(({ rel }, k) => {
    const labelW = rel.label ? timelineEdgeLabelSize(rel.label).width : 0;
    clearance = Math.max(clearance, (k + 1) * LANE_SPACING + labelW / 2);
  });

  const flowX = maxAnchor + clearance;

  let y = 0;
  for (let i = 0; i < spec.phases.length; i++) {
    const phase = spec.phases[i];
    const size = sizes[i];
    nodes.set(phase.id, { id: phase.id, x: flowX - anchors[i], y, width: size.width, height: size.height });
    y += size.height + PHASE_GAP;
  }

  for (let i = 0; i < spec.phases.length - 1; i++) {
    const fromBox = nodes.get(spec.phases[i].id)!;
    const toBox = nodes.get(spec.phases[i + 1].id)!;
    const points = [
      { x: flowX, y: fromBox.y + fromBox.height },
      { x: flowX, y: toBox.y },
    ];
    const rel = findConsecutiveRelationship(spec, spec.phases[i].id, spec.phases[i + 1].id);
    if (rel?.label) {
      const labelSize = timelineEdgeLabelSize(rel.label);
      const midY = (points[0].y + points[1].y) / 2;
      edges.set(`flow_${i}`, {
        id: `flow_${i}`,
        points,
        labelPosition: { x: flowX - labelSize.width / 2, y: midY - labelSize.height / 2 },
        labelSize,
      });
    } else {
      edges.set(`flow_${i}`, { id: `flow_${i}`, points });
    }
  }

  nonConsec.forEach(({ rel, index }, k) => {
    const fromBox = nodes.get(rel.from)!;
    const toBox = nodes.get(rel.to)!;
    const fromCenterY = fromBox.y + fromBox.height / 2;
    const toCenterY = toBox.y + toBox.height / 2;
    const laneX = flowX - maxAnchor - (k + 1) * LANE_SPACING;
    const points = [
      { x: fromBox.x, y: fromCenterY },
      { x: laneX, y: fromCenterY },
      { x: laneX, y: toCenterY },
      { x: toBox.x, y: toCenterY },
    ];
    if (rel.label) {
      const labelSize = timelineEdgeLabelSize(rel.label);
      const midY = (fromCenterY + toCenterY) / 2;
      edges.set(`rel_${index}`, {
        id: `rel_${index}`,
        points,
        labelPosition: { x: laneX - labelSize.width / 2, y: midY - labelSize.height / 2 },
        labelSize,
      });
    } else {
      edges.set(`rel_${index}`, { id: `rel_${index}`, points });
    }
  });

  const height = y - PHASE_GAP;
  const width = flowX + Math.max(...spec.phases.map((_, i) => sizes[i].width - anchors[i]));

  return { width, height, direction, nodes, groups: new Map(), edges };
}

export async function layoutTimeline(spec: TimelineSpec): Promise<LayoutResult> {
  return buildTimelineLayout(spec);
}
