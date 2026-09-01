import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateTimelineSpec, layoutTimeline, estimatePhaseSize } from "../src/engines/timeline/index.js";
import type { TimelineSpec } from "../src/engines/timeline/index.js";

function specOrThrow(raw: unknown): TimelineSpec {
  const result = validateTimelineSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

describe("timeline layout", () => {
  test("gives every phase a finite position and size", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    const layout = await layoutTimeline(spec);
    assert.equal(layout.nodes.size, 2);
    for (const box of layout.nodes.values()) {
      assert.ok(Number.isFinite(box.x) && Number.isFinite(box.y));
      assert.ok(box.width > 0 && box.height > 0);
    }
  });

  test("gives every consecutive pair a flow edge with finite points", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
    });
    const layout = await layoutTimeline(spec);
    assert.equal(layout.edges.size, 2);
    for (let i = 0; i < spec.phases.length - 1; i++) {
      const route = layout.edges.get(`flow_${i}`);
      assert.ok(route, `route flow_${i} should exist`);
      assert.ok(route.points.length >= 2);
      for (const p of route.points) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      }
    }
  });

  test("direction: auto resolves to 'right'", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    const layout = await layoutTimeline(spec);
    assert.equal(layout.direction, "right");
  });

  test("an explicit direction: down wins over the default", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      direction: "down",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    const layout = await layoutTimeline(spec);
    assert.equal(layout.direction, "down");
  });

  test("phases are laid out left-to-right in spec order (direction: right)", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      direction: "right",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
    });
    const layout = await layoutTimeline(spec);
    const a = layout.nodes.get("a")!;
    const b = layout.nodes.get("b")!;
    const c = layout.nodes.get("c")!;
    assert.ok(b.x > a.x + a.width, "phase b should be to the right of phase a");
    assert.ok(c.x > b.x + b.width, "phase c should be to the right of phase b");
  });

  test("phases are laid out top-to-bottom in spec order (direction: down)", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      direction: "down",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
    });
    const layout = await layoutTimeline(spec);
    const a = layout.nodes.get("a")!;
    const b = layout.nodes.get("b")!;
    const c = layout.nodes.get("c")!;
    assert.ok(b.y > a.y + a.height, "phase b should be below phase a");
    assert.ok(c.y > b.y + b.height, "phase c should be below phase b");
  });

  test("a phase with more items is taller than one with fewer", () => {
    const few = estimatePhaseSize({ id: "a", label: "A", kind: "phase", items: ["x"] });
    const many = estimatePhaseSize({ id: "b", label: "B", kind: "phase", items: ["x", "y", "z"] });
    assert.ok(many.height > few.height, `expected ${many.height} > ${few.height}`);
  });

  test("a longer item makes the phase wider", () => {
    const short = estimatePhaseSize({ id: "a", label: "A", kind: "phase", items: ["x"] });
    const long = estimatePhaseSize({ id: "b", label: "B", kind: "phase", items: ["a very long item description"] });
    assert.ok(long.width > short.width, `expected ${long.width} > ${short.width}`);
  });

  test("a longer label makes the phase wider", () => {
    const short = estimatePhaseSize({ id: "a", label: "A", kind: "phase", items: [] });
    const long = estimatePhaseSize({ id: "b", label: "A Very Long Phase Label", kind: "phase", items: [] });
    assert.ok(long.width > short.width, `expected ${long.width} > ${short.width}`);
  });

  test("a non-consecutive relationship gets a route", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
      relationships: [{ from: "a", to: "c", label: "skips" }],
    });
    const layout = await layoutTimeline(spec);
    const route = layout.edges.get("rel_0");
    assert.ok(route, "route rel_0 should exist");
    assert.ok(route.points.length >= 2);
    assert.ok(route.labelPosition, "labeled relationship should have a label position");
    assert.ok(route.labelSize, "labeled relationship should have a label size");
  });

  test("a labeled consecutive relationship gets a label on the flow edge", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      relationships: [{ from: "a", to: "b", label: "unlocks" }],
    });
    const layout = await layoutTimeline(spec);
    const route = layout.edges.get("flow_0");
    assert.ok(route, "route flow_0 should exist");
    assert.ok(route.labelPosition, "labeled flow should have a label position");
    assert.ok(route.labelSize, "labeled flow should have a label size");
  });

  test("canvas dimensions are positive", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    const layout = await layoutTimeline(spec);
    assert.ok(layout.width > 0);
    assert.ok(layout.height > 0);
  });

  test("groups map is empty (no groups in timeline diagrams)", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A" }],
    });
    const layout = await layoutTimeline(spec);
    assert.equal(layout.groups.size, 0);
  });

  test("all coordinates are non-negative (no negative positions)", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
      relationships: [{ from: "a", to: "c", label: "skips" }],
    });
    const layout = await layoutTimeline(spec);
    for (const box of layout.nodes.values()) {
      assert.ok(box.x >= 0, `node ${box.id} x should be >= 0, got ${box.x}`);
      assert.ok(box.y >= 0, `node ${box.id} y should be >= 0, got ${box.y}`);
    }
    for (const route of layout.edges.values()) {
      for (const p of route.points) {
        assert.ok(p.x >= 0, `edge ${route.id} point x should be >= 0, got ${p.x}`);
        assert.ok(p.y >= 0, `edge ${route.id} point y should be >= 0, got ${p.y}`);
      }
    }
  });

  test("flow line passes through the gate diamond center, not the items panel (direction: right)", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      direction: "right",
      phases: [
        { id: "gate0", label: "Gate 0 — Security", kind: "gate", items: ["a", "b", "c"] },
        { id: "wave1", label: "Wave 1 — MVP", kind: "phase", items: ["x", "y"] },
      ],
    });
    const layout = await layoutTimeline(spec);
    const gate = layout.nodes.get("gate0")!;
    const flow = layout.edges.get("flow_0")!;
    const flowY = flow.points[0].y;
    const diamondCenterY = gate.y + 28;
    assert.ok(Math.abs(flowY - diamondCenterY) < 0.01, `flow line y=${flowY} should equal the gate diamond center y=${diamondCenterY}`);
    assert.ok(flowY < gate.y + 56, "flow line should be inside the diamond, not the items panel below it");
  });

  test("down-direction dependency labels are not clipped off the left edge", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      direction: "down",
      phases: [
        { id: "p1", label: "P1" },
        { id: "p2", label: "P2" },
        { id: "p3", label: "P3" },
      ],
      relationships: [{ from: "p1", to: "p3", label: "a long dependency label" }],
    });
    const layout = await layoutTimeline(spec);
    const route = layout.edges.get("rel_0")!;
    assert.ok(route.labelPosition, "labeled relationship should have a label position");
    assert.ok(route.labelPosition.x >= 0, `label position x should be >= 0, got ${route.labelPosition.x}`);
    for (const p of route.points) {
      assert.ok(p.x >= 0, `edge point x should be >= 0, got ${p.x}`);
    }
  });

  test("two non-consecutive relationships route on separate lanes (no overlap)", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      direction: "right",
      phases: [
        { id: "p1", label: "P1" },
        { id: "p2", label: "P2" },
        { id: "p3", label: "P3" },
        { id: "p4", label: "P4" },
      ],
      relationships: [
        { from: "p1", to: "p3", label: "link A" },
        { from: "p2", to: "p4", label: "link B" },
      ],
    });
    const layout = await layoutTimeline(spec);
    const rel0 = layout.edges.get("rel_0")!;
    const rel1 = layout.edges.get("rel_1")!;
    const laneY0 = rel0.points[1].y;
    const laneY1 = rel1.points[1].y;
    assert.ok(Math.abs(laneY0 - laneY1) > 5, `the two relationship lanes should be at different y (${laneY0} vs ${laneY1})`);
  });

  test("a gate with items is taller than a gate without items", () => {
    const bare = estimatePhaseSize({ id: "g", label: "Gate", kind: "gate", items: [] });
    const withItems = estimatePhaseSize({ id: "g", label: "Gate", kind: "gate", items: ["x", "y"] });
    assert.ok(withItems.height > bare.height, `expected ${withItems.height} > ${bare.height}`);
  });

  test("a gate's label compartment is taller than a phase's (diamond room for the label)", () => {
    const gate = estimatePhaseSize({ id: "g", label: "Gate", kind: "gate", items: [] });
    const phase = estimatePhaseSize({ id: "p", label: "Gate", kind: "phase", items: [] });
    assert.ok(gate.height > phase.height, `gate height ${gate.height} should exceed phase height ${phase.height}`);
  });
});
