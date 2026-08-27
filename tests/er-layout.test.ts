import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateErSpec, layoutEr, estimateEntitySize, erAttributeLine } from "../src/engines/er/index.js";
import type { ErSpec } from "../src/engines/er/index.js";

function specOrThrow(raw: unknown): ErSpec {
  const result = validateErSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

describe("er layout", () => {
  test("gives every entity a finite position and size", async () => {
    const spec = specOrThrow({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b" }],
    });
    const layout = await layoutEr(spec);
    assert.equal(layout.nodes.size, 2);
    for (const box of layout.nodes.values()) {
      assert.ok(Number.isFinite(box.x) && Number.isFinite(box.y));
      assert.ok(box.width > 0 && box.height > 0);
    }
  });

  test("gives every relationship a route with finite points", async () => {
    const spec = specOrThrow({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      relationships: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    });
    const layout = await layoutEr(spec);
    assert.equal(layout.edges.size, 2);
    for (let i = 0; i < spec.relationships.length; i++) {
      const route = layout.edges.get(`edge_${i}`);
      assert.ok(route, `route edge_${i} should exist`);
      assert.ok(route.points.length >= 2);
      for (const p of route.points) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      }
    }
  });

  test("direction: auto resolves to 'down'", async () => {
    const spec = specOrThrow({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b" }],
    });
    const layout = await layoutEr(spec);
    assert.equal(layout.direction, "down");
  });

  test("an explicit direction: right wins over the default", async () => {
    const spec = specOrThrow({
      type: "er",
      version: "1",
      direction: "right",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b" }],
    });
    const layout = await layoutEr(spec);
    assert.equal(layout.direction, "right");
  });

  test("labeled edges get a reserved label box from ELK (so parallel pills don't collide)", async () => {
    // Regression: buildErElkGraph used to give ELK no label size, so it stacked
    // parallel edges 24px apart and the renderer's pills (60-100px wide)
    // collided. The layout now passes the label size to ELK, which reserves a
    // box per label and spaces the edges apart.
    const spec = specOrThrow({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [
        { from: "a", to: "b", label: "publishes" },
        { from: "a", to: "b", label: "co-publishes" },
        { from: "a", to: "b", label: "self-publishes" },
      ],
    });
    const layout = await layoutEr(spec);

    const boxes = spec.relationships.map((rel, i) => {
      const route = layout.edges.get(`edge_${i}`)!;
      assert.ok(route.labelPosition, `edge_${i} should have a reserved label position`);
      assert.ok(route.labelSize, `edge_${i} should have a reserved label size`);
      return { x: route.labelPosition!.x, y: route.labelPosition!.y, w: route.labelSize!.width, h: route.labelSize!.height };
    });

    // the reserved boxes must not overlap each other
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const overlaps = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        assert.ok(!overlaps, `reserved label boxes ${i} and ${j} must not overlap`);
      }
    }
  });

  test("an entity with more attributes is taller than one with fewer", () => {
    const few = estimateEntitySize({ id: "a", name: "A", attributes: [{ name: "x" }] });
    const many = estimateEntitySize({
      id: "b",
      name: "B",
      attributes: [
        { name: "x" },
        { name: "y" },
        { name: "z" },
      ],
    });
    assert.ok(many.height > few.height, `expected ${many.height} > ${few.height}`);
  });

  test("a longer attribute line makes the entity wider", () => {
    const short = estimateEntitySize({
      id: "a",
      name: "A",
      attributes: [{ name: "x", type: "int" }],
    });
    const long = estimateEntitySize({
      id: "b",
      name: "B",
      attributes: [{ name: "aVeryLongAttributeName", type: "SomeExtremelyLongTypeName" }],
    });
    assert.ok(long.width > short.width, `expected ${long.width} > ${short.width}`);
  });

  test("a key attribute is wider than the same attribute without a key", () => {
    const plain = estimateEntitySize({
      id: "a",
      name: "A",
      attributes: [{ name: "accountNumber", type: "varchar(64)" }],
    });
    const keyed = estimateEntitySize({
      id: "b",
      name: "B",
      attributes: [{ name: "accountNumber", type: "varchar(64)", key: "primary" }],
    });
    assert.ok(keyed.width > plain.width, `expected ${keyed.width} > ${plain.width}`);
  });

  test("erAttributeLine includes the type when present and omits it when absent", () => {
    assert.equal(erAttributeLine({ name: "x", type: "int" }), "x: int");
    assert.equal(erAttributeLine({ name: "x" }), "x");
  });
});
