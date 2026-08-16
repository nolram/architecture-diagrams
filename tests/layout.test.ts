import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadSpecFromText } from "../src/spec/index.js";
import { layoutSpec } from "../src/layout/index.js";

function parseOrThrow(yaml: string) {
  const result = loadSpecFromText(yaml);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

describe("layout", () => {
  test("posiciona dois nodes sem group da esquerda para a direita (direction: right)", async () => {
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
    assert.ok(b.x > a.x, "b deveria estar à direita de a");
  });

  test("groups aninhados: filho fica geometricamente contido no pai (coordenadas absolutas)", async () => {
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

    assert.ok(contains(vpc, priv), "private subnet deveria estar contida na VPC");
    assert.ok(contains(vpc, web), "web deveria estar contido na VPC");
    assert.ok(contains(priv, db), "db deveria estar contido na private subnet");
  });

  test("rotas de edge têm pontos com coordenadas finitas", async () => {
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
    label: liga
`);
    const layout = await layoutSpec(spec);
    assert.equal(layout.edges.size, 1);
    const [route] = layout.edges.values();
    assert.ok(route.points.length >= 2);
    for (const p of route.points) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    }
  });

  test("direction muda a orientação geral do canvas (right = mais largo, down = mais alto)", async () => {
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

    assert.ok(right.width > right.height, "direction right deveria produzir um canvas mais largo que alto");
    assert.ok(down.height > down.width, "direction down deveria produzir um canvas mais alto que largo");
  });
});
