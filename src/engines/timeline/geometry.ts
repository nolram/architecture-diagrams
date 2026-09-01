import type { TimelinePhase } from "./schema.js";

export const TIMELINE_LABEL_CHAR_WIDTH = 9.3;
export const TIMELINE_ITEM_CHAR_WIDTH = 7.4;
export const TIMELINE_EDGE_LABEL_CHAR_WIDTH = 6.2;
export const TIMELINE_EDGE_LABEL_PAD_X = 12;
export const TIMELINE_EDGE_LABEL_HEIGHT = 16;

export interface TimelineEdgeLabelSize {
  width: number;
  height: number;
}

export function timelineEdgeLabelSize(text: string): TimelineEdgeLabelSize {
  return { width: text.length * TIMELINE_EDGE_LABEL_CHAR_WIDTH + TIMELINE_EDGE_LABEL_PAD_X, height: TIMELINE_EDGE_LABEL_HEIGHT };
}

export const TIMELINE_LINE_HEIGHT = 20;
export const TIMELINE_COMPARTMENT_PAD = 10;
export const TIMELINE_BOX_PAD_X = 12;
export const TIMELINE_MIN_WIDTH = 140;

export const TIMELINE_BULLET_EXTRA = 16;

export interface TimelinePhaseSize {
  width: number;
  height: number;
}

export function timelineLabelCompartmentHeight(): number {
  return TIMELINE_LINE_HEIGHT + TIMELINE_COMPARTMENT_PAD * 2;
}

export function timelineItemsCompartmentHeight(count: number): number {
  return count * TIMELINE_LINE_HEIGHT + TIMELINE_COMPARTMENT_PAD * 2;
}

export function estimatePhaseSize(phase: TimelinePhase): TimelinePhaseSize {
  const labelW = phase.label.length * TIMELINE_LABEL_CHAR_WIDTH;
  let maxItemW = 0;
  for (const item of phase.items ?? []) {
    maxItemW = Math.max(maxItemW, item.length * TIMELINE_ITEM_CHAR_WIDTH);
  }
  const width = Math.max(TIMELINE_MIN_WIDTH, Math.max(labelW, maxItemW + TIMELINE_BULLET_EXTRA) + TIMELINE_BOX_PAD_X * 2);

  let height = timelineLabelCompartmentHeight();
  if ((phase.items?.length ?? 0) > 0) height += timelineItemsCompartmentHeight(phase.items!.length);
  return { width, height };
}
