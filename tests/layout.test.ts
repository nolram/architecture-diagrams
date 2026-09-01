import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadSpecFromText } from "../src/spec/index.js";
import { layoutSpec, estimateNodeSize } from "../src/layout/index.js";
import type { DiagramNode } from "../src/spec/schema.js";

function parseOrThrow(yaml: string) {
  const result = loadSpecFromText(yaml);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

describe("layout", () => {
  test("places two nodes with no group left-to-right (direction: right)", async () => {
    const spec = parseOrThrow(`
version: '1'
direction: right
nodes:
  - id: a
    label: A
  - id: b
    label: B
edges:
  - from: a
    to: b
`);
    const layout = await layoutSpec(spec);
    const a = layout.nodes.get("a")!;
    const b = layout.nodes.get("b")!;
    assert.ok(a && b);
    assert.ok(a.width > 0 && a.height > 0);
    assert.ok(b.x > a.x, "b should be to the right of a");
  });

  test("nested groups: child is geometrically contained in the parent (absolute coordinates)", async () => {
    const spec = parseOrThrow(`
version: '1'
nodes:
  - id: browser
    label: Browser
  - id: web
    label: Web
    group: vpc
  - id: db
    label: DB
    group: private
groups:
  - id: vpc
    label: VPC
  - id: private
    label: Private
    parent: vpc
edges:
  - from: browser
    to: web
  - from: web
    to: db
`);
    const layout = await layoutSpec(spec);
    const vpc = layout.groups.get("vpc")!;
    const priv = layout.groups.get("private")!;
    const web = layout.nodes.get("web")!;
    const db = layout.nodes.get("db")!;

    const contains = (outer: typeof vpc, inner: { x: number; y: number; width: number; height: number }) =>
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.width <= outer.x + outer.width &&
      inner.y + inner.height <= outer.y + outer.height;

    assert.ok(contains(vpc, priv), "private subnet should be contained in the VPC");
    assert.ok(contains(vpc, web), "web should be contained in the VPC");
    assert.ok(contains(priv, db), "db should be contained in the private subnet");
  });

  test("edge routes have points with finite coordinates", async () => {
    const spec = parseOrThrow(`
version: '1'
nodes:
  - id: a
    label: A
  - id: b
    label: B
edges:
  - from: a
    to: b
    label: connects
`);
    const layout = await layoutSpec(spec);
    assert.equal(layout.edges.size, 1);
    const [route] = layout.edges.values();
    assert.ok(route.points.length >= 2);
    for (const p of route.points) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    }
  });

  test("direction changes the canvas's overall orientation (right = wider, down = taller)", async () => {
    const chain = (direction: string) => `
version: '1'
direction: ${direction}
nodes:
  - id: a
    label: A
  - id: b
    label: B
  - id: c
    label: C
edges:
  - from: a
    to: b
  - from: b
    to: c
`;
    const right = await layoutSpec(parseOrThrow(chain("right")));
    const down = await layoutSpec(parseOrThrow(chain("down")));

    assert.ok(right.width > right.height, "direction right should produce a canvas wider than it is tall");
    assert.ok(down.height > down.width, "direction down should produce a canvas taller than it is wide");
  });

  test("fan-out edge labels (same source, multiple targets) don't overlap", async () => {
    // Reproduces the real case that visually collided: a node with 3
    // outgoing edges to sibling nodes, each with a label. Regression for the
    // fix that started informing ELK of label width/height (build-graph.ts).
    const spec = parseOrThrow(`
version: '1'
direction: down
nodes:
  - id: gateway
    label: API Gateway
  - id: orders
    label: Orders
  - id: payments
    label: Payments
  - id: redis
    label: Redis
edges:
  - from: gateway
    to: orders
    label: REST
  - from: gateway
    to: payments
    label: REST
  - from: gateway
    to: redis
    label: session R/W
`);
    const layout = await layoutSpec(spec);
    const boxes = [...layout.edges.values()]
      .filter((route) => route.labelPosition && route.labelSize)
      .map((route) => ({ ...route.labelPosition!, ...route.labelSize! }));

    assert.equal(boxes.length, 3);
    for (const box of boxes) {
      // if this is 0, ELK never received a label dimension and didn't reserve
      // space for it -- exactly the regression the overlap check below,
      // on its own, wouldn't catch (a zero-area box never "overlaps" anything).
      assert.ok(box.width > 0, "label should have reserved width > 0");
      assert.ok(box.height > 0, "label should have reserved height > 0");
    }

    const overlaps = (
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        assert.ok(!overlaps(boxes[i], boxes[j]), `labels ${i} and ${j} overlap: ${JSON.stringify(boxes[i])} / ${JSON.stringify(boxes[j])}`);
      }
    }
  });

  describe("direction: auto", () => {
    test("stays 'right' when no node has fan-out/fan-in >= 3", async () => {
      const spec = parseOrThrow(`
version: '1'
nodes:
  - id: web
    label: Web
  - id: cache
    label: Cache
  - id: db
    label: DB
edges:
  - from: web
    to: cache
  - from: web
    to: db
`);
      const layout = await layoutSpec(spec);
      assert.equal(layout.direction, "right");
    });

    test("picks 'down' when a node has fan-out >= 3 (real case: gateway -> 3 services)", async () => {
      const spec = parseOrThrow(`
version: '1'
nodes:
  - id: gateway
    label: Gateway
  - id: a
    label: A
  - id: b
    label: B
  - id: c
    label: C
edges:
  - from: gateway
    to: a
  - from: gateway
    to: b
  - from: gateway
    to: c
`);
      const layout = await layoutSpec(spec);
      assert.equal(layout.direction, "down");
    });

    test("picks 'down' when a node has fan-in >= 3 (convergence, not just fan-out)", async () => {
      const spec = parseOrThrow(`
version: '1'
nodes:
  - id: a
    label: A
  - id: b
    label: B
  - id: c
    label: C
  - id: sink
    label: Sink
edges:
  - from: a
    to: sink
  - from: b
    to: sink
  - from: c
    to: sink
`);
      const layout = await layoutSpec(spec);
      assert.equal(layout.direction, "down");
    });

    test("an explicit direction in the spec always wins over the heuristic", async () => {
      const spec = parseOrThrow(`
version: '1'
direction: right
nodes:
  - id: gateway
    label: Gateway
  - id: a
    label: A
  - id: b
    label: B
  - id: c
    label: C
edges:
  - from: gateway
    to: a
  - from: gateway
    to: b
  - from: gateway
    to: c
`);
      const layout = await layoutSpec(spec);
      assert.equal(layout.direction, "right", "explicit direction should not be overridden by the heuristic");
    });
  });

  describe("estimateNodeSize per shape", () => {
    const base: DiagramNode = {
      id: "n",
      label: "PostgreSQL",
      category: "generic",
      shape: "card",
    };

    test("shape 'database' reserves extra height compared to 'card' (cylinder caps)", () => {
      const card = estimateNodeSize({ ...base, shape: "card" });
      const database = estimateNodeSize({ ...base, shape: "database" });
      assert.equal(database.width, card.width, "width should not change, only the height");
      assert.ok(database.height > card.height);
    });

    test("shape 'actor' has a different layout (icon on top, label below) -- taller, not necessarily wider", () => {
      const card = estimateNodeSize({ ...base, shape: "card" });
      const actor = estimateNodeSize({ ...base, shape: "actor" });
      assert.ok(actor.height > card.height);
    });

    test("longer labels increase the width for every shape", () => {
      for (const shape of ["card", "database", "actor", "cloud"] as const) {
        const short = estimateNodeSize({ ...base, shape, label: "DB" });
        const long = estimateNodeSize({ ...base, shape, label: "Amazon Relational Database Service" });
        assert.ok(long.width >= short.width, `shape ${shape} should get wider with a longer label`);
      }
    });

    test("a sublabel that wraps grows the card's height (width never shrinks)", () => {
      const short = estimateNodeSize({ ...base, sublabel: "Node.js" });
      const long = estimateNodeSize({ ...base, sublabel: "Each role sees only what it needs" });
      assert.ok(long.height > short.height, "a wrapping sublabel should grow the card's height");
      assert.ok(long.width >= short.width, "a wrapping sublabel should not shrink the card's width");
    });

    test("a single-line sublabel keeps the original card height (regression guard)", () => {
      const single = estimateNodeSize({ ...base, sublabel: "Node.js" });
      assert.equal(single.height, 100, "a 1-line sublabel must keep the pre-wrapping card height of 100");
      assert.equal(estimateNodeSize(base).height, 78, "no sublabel keeps the simple card height of 78");
    });

    test("maxLines: 1 folds a wrapping sublabel back to a single line", () => {
      const folded = estimateNodeSize({ ...base, sublabel: "Each role sees only what it needs" }, 1);
      assert.equal(folded.height, 100, "maxLines:1 must fold the sublabel to one line (height 100)");
    });

    test("an actor's wrapping sublabel grows its height too", () => {
      const actorShort = estimateNodeSize({ ...base, shape: "actor", sublabel: "Admin" });
      const actorLong = estimateNodeSize({ ...base, shape: "actor", sublabel: "Each role sees only what it needs" });
      assert.ok(actorLong.height > actorShort.height, "a wrapping sublabel should grow the actor's height");
      assert.equal(actorLong.width, actorShort.width, "width should not change when an actor's sublabel wraps");
    });
  });
});
