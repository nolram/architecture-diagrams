import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateC4Spec, layoutC4, estimateElementSize } from "../src/engines/c4/index.js";
import type { C4Spec } from "../src/engines/c4/index.js";

function specOrThrow(raw: unknown): C4Spec {
  const result = validateC4Spec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

const fixture = {
  type: "c4",
  version: "1",
  elements: [
    { id: "user", name: "User", type: "person" },
    { id: "app", name: "App", type: "system" },
    { id: "api", name: "API", type: "container", group: "app" },
    { id: "db", name: "Database", type: "external-system" },
  ],
  relationships: [
    { from: "user", to: "api", description: "clicks" },
    { from: "api", to: "db", description: "reads" },
  ],
};

describe("c4 layout", () => {
  test("returns a finite, non-negative canvas size", async () => {
    const layout = await layoutC4(specOrThrow(fixture));
    assert.ok(Number.isFinite(layout.width) && layout.width >= 0, `width=${layout.width}`);
    assert.ok(Number.isFinite(layout.height) && layout.height >= 0, `height=${layout.height}`);
  });

  test("places every element in nodes or groups, with finite boxes", async () => {
    const layout = await layoutC4(specOrThrow(fixture));
    for (const id of ["user", "app", "api", "db"]) {
      const box = layout.nodes.get(id) ?? layout.groups.get(id);
      assert.ok(box, `element "${id}" should be in nodes or groups`);
      if (!box) continue;
      assert.ok(Number.isFinite(box.x) && Number.isFinite(box.y), `finite position for ${id}`);
      assert.ok(box.width > 0 && box.height > 0, `positive size for ${id}`);
    }
    // leaf elements are nodes; the system with a child is a group
    assert.ok(layout.nodes.has("user"), "leaf person should be a node");
    assert.ok(layout.nodes.has("api"), "leaf container should be a node");
    assert.ok(layout.nodes.has("db"), "leaf external-system should be a node");
    assert.ok(layout.groups.has("app"), "system with a child should be a group");
  });

  test("routes every relationship with finite points, keyed edge_<index>", async () => {
    const layout = await layoutC4(specOrThrow(fixture));
    assert.equal(layout.edges.size, 2);
    for (const [i, key] of ["edge_0", "edge_1"].entries()) {
      const route = layout.edges.get(key);
      assert.ok(route, `expected edge ${key} in the layout`);
      if (!route) continue;
      assert.ok(route.points.length >= 2, `edge_${i} should have at least 2 points`);
      for (const p of route.points) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `finite point on ${key}`);
      }
    }
  });

  test("direction: auto resolves to 'right'", async () => {
    const layout = await layoutC4(specOrThrow(fixture));
    assert.equal(layout.direction, "right");
  });

  test("an explicit direction: down is respected", async () => {
    const layout = await layoutC4(specOrThrow({ ...fixture, direction: "down" }));
    assert.equal(layout.direction, "down");
  });

  test("a child element is laid out inside its parent boundary", async () => {
    const layout = await layoutC4(specOrThrow(fixture));
    const parent = layout.groups.get("app");
    const child = layout.nodes.get("api");
    assert.ok(parent, "parent system should be a group");
    assert.ok(child, "child container should be a node");
    if (!parent || !child) return;
    assert.ok(child.x >= parent.x, `child.x ${child.x} >= parent.x ${parent.x}`);
    assert.ok(child.x + child.width <= parent.x + parent.width, `child right edge inside parent`);
    assert.ok(child.y >= parent.y, `child.y ${child.y} >= parent.y ${parent.y}`);
    assert.ok(child.y + child.height <= parent.y + parent.height, `child bottom edge inside parent`);
  });

  test("a longer name makes the element box wider", () => {
    const short = estimateElementSize({ id: "a", name: "A", type: "system" });
    const long = estimateElementSize({ id: "b", name: "An Extremely Long System Name For Sizing", type: "system" });
    assert.ok(long.width > short.width, `expected ${long.width} > ${short.width}`);
  });

  test("a description makes the element box taller", () => {
    const plain = estimateElementSize({ id: "a", name: "A", type: "system" });
    const described = estimateElementSize({ id: "b", name: "B", type: "system", description: "does things" });
    assert.ok(described.height > plain.height, `expected ${described.height} > ${plain.height}`);
  });

  test("direction geometry: 'down' stacks source above target, 'right' puts source left of target", async () => {
    const down = await layoutC4(specOrThrow({ ...fixture, direction: "down" }));
    const downUser = down.nodes.get("user")!;
    const downApi = down.nodes.get("api")!;
    assert.ok(downUser.y < downApi.y, `down: source y ${downUser.y} should be above target y ${downApi.y}`);

    const right = await layoutC4(specOrThrow({ ...fixture, direction: "right" }));
    const rightUser = right.nodes.get("user")!;
    const rightApi = right.nodes.get("api")!;
    assert.ok(rightUser.x < rightApi.x, `right: source x ${rightUser.x} should be left of target x ${rightApi.x}`);
  });

  test("a boundary grows to fit a long name instead of truncating it to its children", async () => {
    const child = { id: "c", name: "C", type: "container", group: "sys" };
    const shortName = await layoutC4(
      specOrThrow({ type: "c4", version: "1", elements: [{ id: "sys", name: "S", type: "system" }, child] }),
    );
    const longName = await layoutC4(
      specOrThrow({
        type: "c4",
        version: "1",
        elements: [{ id: "sys", name: "An Extremely Long System Boundary Name That Must Not Be Truncated", type: "system" }, child],
      }),
    );
    const shortGroup = shortName.groups.get("sys")!;
    const longGroup = longName.groups.get("sys")!;
    assert.ok(longGroup.width > shortGroup.width, `long-name boundary ${longGroup.width} should be wider than short-name ${shortGroup.width}`);
  });

  test("3-level nesting: component inside container inside system stays contained", async () => {
    const layout = await layoutC4(
      specOrThrow({
        type: "c4",
        version: "1",
        elements: [
          { id: "sys", name: "System", type: "system" },
          { id: "cont", name: "Container", type: "container", group: "sys" },
          { id: "comp", name: "Component", type: "component", group: "cont" },
        ],
      }),
    );
    const system = layout.groups.get("sys")!;
    const container = layout.groups.get("cont")!;
    const component = layout.nodes.get("comp")!;
    assert.ok(container.x >= system.x && container.x + container.width <= system.x + system.width, "container inside system (x)");
    assert.ok(container.y >= system.y && container.y + container.height <= system.y + system.height, "container inside system (y)");
    assert.ok(component.x >= container.x && component.x + component.width <= container.x + container.width, "component inside container (x)");
    assert.ok(component.y >= container.y && component.y + component.height <= container.y + container.height, "component inside container (y)");
  });
});
