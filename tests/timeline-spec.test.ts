import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateTimelineSpec } from "../src/engines/timeline/index.js";

type Result = ReturnType<typeof validateTimelineSpec>;

function errorPaths(result: Result): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.path);
}

function errorMessages(result: Result): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.message);
}

const base = {
  type: "timeline",
  version: "1",
  phases: [{ id: "a", label: "A" }],
};

describe("timeline spec validation", () => {
  test("accepts a valid spec and applies defaults", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [
        { id: "gate0", label: "Gate 0", kind: "gate", items: ["item1"] },
        { id: "wave1", label: "Wave 1" },
      ],
      relationships: [{ from: "gate0", to: "wave1", label: "unlocks" }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.spec.theme, "clean-light");
    assert.equal(result.spec.direction, "auto");
    assert.equal(result.spec.phases[0].kind, "gate");
    assert.equal(result.spec.phases[1].kind, "phase");
  });

  test("defaults relationships to an empty array", () => {
    const result = validateTimelineSpec(base);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.spec.relationships, []);
  });

  test("defaults phase kind to 'phase'", () => {
    const result = validateTimelineSpec(base);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.spec.phases[0].kind, "phase");
  });

  test("defaults phase items to an empty array", () => {
    const result = validateTimelineSpec(base);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.spec.phases[0].items, []);
  });

  test("requires the type discriminator", () => {
    const result = validateTimelineSpec({ version: "1", phases: [{ id: "a", label: "A" }] });
    assert.equal(result.ok, false);
  });

  test("requires version '1'", () => {
    const result = validateTimelineSpec({ type: "timeline", version: "2", phases: [{ id: "a", label: "A" }] });
    assert.equal(result.ok, false);
  });

  test("rejects an empty phases array, naming the requirement", () => {
    const result = validateTimelineSpec({ type: "timeline", version: "1", phases: [] });
    assert.equal(result.ok, false);
    const messages = errorMessages(result);
    assert.ok(messages.some((m) => m.includes("at least one phase")), "error should mention at least one phase");
  });

  test("rejects a duplicate phase id with the field path", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "a", label: "A2" },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("phases.1.id"), `expected phases.1.id in ${JSON.stringify(paths)}`);
  });

  test("rejects a self-relationship with the field path", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A" }],
      relationships: [{ from: "a", to: "a" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("relationships.0.to"), `expected relationships.0.to in ${JSON.stringify(paths)}`);
  });

  test("rejects a relationship pointing at a nonexistent phase, naming it and listing defined phases", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A" }],
      relationships: [{ from: "a", to: "ghost" }],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("relationships.0.to"), `expected relationships.0.to in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("ghost")), "error should name the missing phase");
    assert.ok(messages.some((m) => m.includes("a")), "error should list the defined phases");
  });

  test("rejects an invalid phase id with special characters", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [{ id: "a b", label: "A" }],
    });
    assert.equal(result.ok, false);
  });

  test("accepts gate and phase kinds", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [
        { id: "g", label: "G", kind: "gate" },
        { id: "p", label: "P", kind: "phase" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("rejects an invalid kind value", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [{ id: "a", label: "A", kind: "milestone" }],
    });
    assert.equal(result.ok, false);
  });

  test("accepts a relationship without a label", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      relationships: [{ from: "a", to: "b" }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("accepts a relationship with a label", () => {
    const result = validateTimelineSpec({
      type: "timeline",
      version: "1",
      phases: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      relationships: [{ from: "a", to: "b", label: "unlocks" }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("accepts both themes", () => {
    for (const theme of ["clean-light", "midnight-dark"]) {
      const result = validateTimelineSpec({ ...base, theme });
      assert.equal(result.ok, true, `theme ${theme} should be valid`);
    }
  });

  test("accepts all directions", () => {
    for (const direction of ["auto", "right", "down"]) {
      const result = validateTimelineSpec({ ...base, direction });
      assert.equal(result.ok, true, `direction ${direction} should be valid`);
    }
  });
});
