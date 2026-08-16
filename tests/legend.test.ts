import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateSpec } from "../src/spec/index.js";
import { getTheme } from "../src/render/theme.js";
import { shouldShowLegend, computeLegendEntries, renderLegend } from "../src/render/legend.js";

function specOrThrow(raw: unknown) {
  const result = validateSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

const theme = getTheme("clean-light");

describe("legend", () => {
  test("does not show a legend when there isn't enough color variety", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", category: "compute" },
        { id: "b", label: "B", category: "compute" },
      ],
    });
    assert.equal(shouldShowLegend(spec), false);
  });

  test("shows a legend with 3+ distinct categories even without groups", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", category: "compute" },
        { id: "b", label: "B", category: "database" },
        { id: "c", label: "C", category: "network" },
      ],
    });
    assert.equal(shouldShowLegend(spec), true);
  });

  test("shows a legend with 2+ distinct group styles even with few categories", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", group: "g1" },
        { id: "b", label: "B", group: "g2" },
      ],
      groups: [
        { id: "g1", label: "G1", style: "vpc" },
        { id: "g2", label: "G2", style: "subnet" },
      ],
    });
    assert.equal(shouldShowLegend(spec), true);
  });

  test("computeLegendEntries deduplicates and preserves first-appearance order (groups before categories)", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", category: "compute", group: "g1" },
        { id: "b", label: "B", category: "compute" },
        { id: "c", label: "C", category: "database" },
      ],
      groups: [{ id: "g1", label: "G1", style: "vpc" }],
    });
    const entries = computeLegendEntries(spec, theme);
    assert.deepEqual(
      entries.map((e) => e.label),
      ["VPC", "Compute", "Database"],
    );
    assert.equal(entries[0].color, theme.groupStyles.vpc.stroke);
    assert.equal(entries[1].color, theme.categoryColors.compute);
  });

  test("renderLegend wraps to a new line when it exceeds the max width", () => {
    const entries = [
      { color: "#111", label: "A Rather Long Category One" },
      { color: "#222", label: "A Rather Long Category Two" },
      { color: "#333", label: "A Rather Long Category Three" },
    ];
    const wide = renderLegend(entries, 2000, theme);
    const narrow = renderLegend(entries, 150, theme);
    assert.ok(wide.height < narrow.height, "with more width available it should fit in fewer rows (smaller height)");
  });

  test("renderLegend with an empty list draws nothing", () => {
    const result = renderLegend([], 1000, theme);
    assert.equal(result.svg, "");
    assert.equal(result.height, 0);
  });
});
