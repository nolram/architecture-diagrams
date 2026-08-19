import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateUmlClassSpec, layoutUmlClass, estimateUmlClassSize } from "../src/engines/uml-class/index.js";
import type { UmlClassSpec } from "../src/engines/uml-class/index.js";

function specOrThrow(raw: unknown): UmlClassSpec {
  const result = validateUmlClassSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

describe("uml-class layout", () => {
  test("gives every class a finite position and size", async () => {
    const spec = specOrThrow({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b", kind: "association" }],
    });
    const layout = await layoutUmlClass(spec);
    assert.equal(layout.nodes.size, 2);
    for (const box of layout.nodes.values()) {
      assert.ok(Number.isFinite(box.x) && Number.isFinite(box.y));
      assert.ok(box.width > 0 && box.height > 0);
    }
  });

  test("gives every relationship a route with finite points", async () => {
    const spec = specOrThrow({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [
        { from: "a", to: "b", kind: "association" },
        { from: "b", to: "a", kind: "dependency" },
      ],
    });
    const layout = await layoutUmlClass(spec);
    assert.equal(layout.edges.size, 2);
    for (const route of layout.edges.values()) {
      assert.ok(route.points.length >= 2);
      for (const p of route.points) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      }
    }
  });

  test("direction: auto resolves to 'down'", async () => {
    const spec = specOrThrow({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b", kind: "inheritance" }],
    });
    const layout = await layoutUmlClass(spec);
    assert.equal(layout.direction, "down");
  });

  test("an explicit direction: right wins over the default", async () => {
    const spec = specOrThrow({
      type: "uml-class",
      version: "1",
      direction: "right",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b", kind: "inheritance" }],
    });
    const layout = await layoutUmlClass(spec);
    assert.equal(layout.direction, "right");
  });

  test("a class with more members is taller than one with fewer", () => {
    const few = estimateUmlClassSize({ id: "a", name: "A", attributes: [{ name: "x", visibility: "public" }] });
    const many = estimateUmlClassSize({
      id: "b",
      name: "B",
      attributes: [
        { name: "x", visibility: "public" },
        { name: "y", visibility: "public" },
        { name: "z", visibility: "public" },
      ],
      methods: [{ name: "m", visibility: "public" }],
    });
    assert.ok(many.height > few.height, `expected ${many.height} > ${few.height}`);
  });

  test("a longer member line makes the class wider", () => {
    const short = estimateUmlClassSize({
      id: "a",
      name: "A",
      attributes: [{ name: "x", type: "int", visibility: "public" }],
    });
    const long = estimateUmlClassSize({
      id: "b",
      name: "B",
      attributes: [{ name: "aVeryLongAttributeName", type: "SomeExtremelyLongTypeName", visibility: "public" }],
    });
    assert.ok(long.width > short.width, `expected ${long.width} > ${short.width}`);
  });
});
