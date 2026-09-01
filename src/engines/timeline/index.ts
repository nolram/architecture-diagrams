import { validateTimelineSpec, type TimelineSpec } from "./schema.js";
import { layoutTimeline } from "./layout.js";
import { composeTimeline } from "./render.js";
import type { DiagramEngine } from "../types.js";

export const timelineEngine: DiagramEngine = {
  type: "timeline",
  validate: validateTimelineSpec,
  layout: (spec) => layoutTimeline(spec as TimelineSpec),
  render: (spec, layout, baseDir) => composeTimeline(spec as TimelineSpec, layout, baseDir),
};

export * from "./schema.js";
export * from "./geometry.js";
export * from "./layout.js";
export * from "./render.js";
