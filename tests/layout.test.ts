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

  test("labels de edges em leque (mesmo source, vários targets) não se sobrepõem", async () => {
    // Reproduz o caso real que colidia visualmente: um node com 3 edges de
    // saída pra nodes irmãos, cada uma com label. Regressão para a correção
    // que passou a informar largura/altura de label ao ELK (build-graph.ts).
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
    label: sessão R/W
`);
    const layout = await layoutSpec(spec);
    const boxes = [...layout.edges.values()]
      .filter((route) => route.labelPosition && route.labelSize)
      .map((route) => ({ ...route.labelPosition!, ...route.labelSize! }));

    assert.equal(boxes.length, 3);
    for (const box of boxes) {
      // se isso for 0, o ELK não recebeu dimensão de label nenhuma e não reservou
      // espaço pra ele — é exatamente essa regressão que a checagem de overlap
      // abaixo, sozinha, não pega (um box de área zero nunca "sobrepõe" nada).
      assert.ok(box.width > 0, "label deveria ter largura reservada > 0");
      assert.ok(box.height > 0, "label deveria ter altura reservada > 0");
    }

    const overlaps = (
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        assert.ok(!overlaps(boxes[i], boxes[j]), `labels ${i} e ${j} se sobrepõem: ${JSON.stringify(boxes[i])} / ${JSON.stringify(boxes[j])}`);
      }
    }
  });

  describe("direction: auto", () => {
    test("mantém 'right' quando nenhum node tem fan-out/fan-in >= 3", async () => {
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

    test("escolhe 'down' quando um node tem fan-out >= 3 (caso real: gateway -> 3 serviços)", async () => {
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

    test("escolhe 'down' quando um node tem fan-in >= 3 (convergência, não só fan-out)", async () => {
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

    test("direction explícita na spec sempre prevalece sobre a heurística", async () => {
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
      assert.equal(layout.direction, "right", "direction explícita não deveria ser sobrescrita pela heurística");
    });
  });
});
