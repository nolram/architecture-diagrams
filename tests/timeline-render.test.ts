import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateTimelineSpec, layoutTimeline, composeTimeline } from "../src/engines/timeline/index.js";
import type { TimelineSpec } from "../src/engines/timeline/index.js";

function specOrThrow(raw: unknown): TimelineSpec {
  const result = validateTimelineSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

async function render(spec: TimelineSpec): Promise<string> {
  const layout = await layoutTimeline(spec);
  const { svg } = await composeTimeline(spec, layout);
  return svg;
}

describe("timeline render", () => {
  test("produces a valid SVG with the correct dimensions", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      title: "Test",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    const svg = await render(spec);
    assert.ok(svg.startsWith("<svg"), "should start with <svg");
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "should have SVG namespace");
    assert.ok(svg.includes("width="), "should have width");
    assert.ok(svg.includes("height="), "should have height");
  });

  test("renders the title when present", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      title: "My Roadmap",
      phases: [{ id: "a", label: "A" }],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("My Roadmap"), "should contain the title text");
  });

  test("omits the title when absent", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A" }],
    });
    const svg = await render(spec);
    assert.ok(!svg.includes("font-size=\"24\""), "should not have a title element");
  });

  test("renders phase labels", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "Phase One" },
        { id: "b", label: "Phase Two" },
      ],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("Phase One"), "should contain phase label A");
    assert.ok(svg.includes("Phase Two"), "should contain phase label B");
  });

  test("renders phase items as bullet points", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A", items: ["First item", "Second item"] },
      ],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("First item"), "should contain first item");
    assert.ok(svg.includes("Second item"), "should contain second item");
    assert.ok(svg.includes("<circle"), "should have bullet circles");
  });

  test("renders a gate as a diamond (polygon)", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "g", label: "Gate 0", kind: "gate" },
        { id: "p", label: "Phase 1", kind: "phase" },
      ],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("<polygon"), "gate should render as a polygon (diamond)");
  });

  test("renders a phase as a rounded rect", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "p", label: "Phase 1", kind: "phase" },
      ],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("<rect"), "phase should render as a rect");
    assert.ok(svg.includes("rx="), "phase rect should have rounded corners");
  });

  test("renders flow arrows between consecutive phases", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("<path"), "should have path elements for arrows");
    assert.ok(svg.includes("<polygon"), "should have arrowhead polygons");
  });

  test("renders relationship labels as pills", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      relationships: [{ from: "a", to: "b", label: "unlocks" }],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("unlocks"), "should contain the relationship label");
  });

  test("renders non-consecutive relationships as dashed lines", async () => {
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
    const svg = await render(spec);
    assert.ok(svg.includes("stroke-dasharray"), "non-consecutive relationship should be dashed");
  });

  test("escapes XML special characters in labels and items", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A <B> & C", items: ["x < y && z"] },
      ],
    });
    const svg = await render(spec);
    assert.ok(!svg.includes("A <B> & C"), "should not contain unescaped special chars in label");
    assert.ok(svg.includes("&lt;"), "should contain escaped <");
    assert.ok(svg.includes("&amp;"), "should contain escaped &");
  });

  test("uses the light theme colors by default", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A" }],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("#f8fafc"), "should use light canvas background");
  });

  test("uses the dark theme colors when specified", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      theme: "midnight-dark",
      phases: [{ id: "a", label: "A" }],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("#0b1220"), "should use dark canvas background");
  });

  test("includes the card-shadow filter in defs", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A" }],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("<defs>"), "should have defs");
    assert.ok(svg.includes("card-shadow"), "should have card-shadow filter");
    assert.ok(svg.includes("feDropShadow"), "should have drop shadow");
  });

  test("a single phase renders without errors", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "Solo" }],
    });
    const svg = await render(spec);
    assert.ok(svg.startsWith("<svg"), "should produce valid SVG");
    assert.ok(svg.includes("Solo"), "should contain the phase label");
  });

  test("a gate with items renders both diamond and items card", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [
        { id: "g", label: "Gate", kind: "gate", items: ["Check 1", "Check 2"] },
      ],
    });
    const svg = await render(spec);
    assert.ok(svg.includes("<polygon"), "should have diamond (polygon)");
    assert.ok(svg.includes("Check 1"), "should contain first item");
    assert.ok(svg.includes("Check 2"), "should contain second item");
  });

  test("returns an empty warnings array", async () => {
    const spec = specOrThrow({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A" }],
    });
    const layout = await layoutTimeline(spec);
    const { warnings } = await composeTimeline(spec, layout);
    assert.deepEqual(warnings, []);
  });
});
