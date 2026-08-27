import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMermaid, MermaidError } from "../src/mermaid/parser.js";
import { importMermaid, convertModel } from "../src/mermaid/convert.js";

// --- parser: node shapes ---

test("parser: recognizes all node shape notations", () => {
  const m = parseMermaid(`flowchart LR
    A[Square]
    B(Rounded)
    C((Circle))
    D(((Stadium)))
    E>Asym]
    F{Diamond}
    G{{Hexagon}}
    H[[Subroutine]]
    I[/Paral/]
    J[(Cylinder)]
  `);
  assert.equal(m.nodes.get("A")?.shape, "square");
  assert.equal(m.nodes.get("B")?.shape, "rounded");
  assert.equal(m.nodes.get("C")?.shape, "circle");
  assert.equal(m.nodes.get("D")?.shape, "stadium");
  assert.equal(m.nodes.get("E")?.shape, "asymmetric");
  assert.equal(m.nodes.get("F")?.shape, "diamond");
  assert.equal(m.nodes.get("G")?.shape, "hexagon");
  assert.equal(m.nodes.get("H")?.shape, "subroutine");
  assert.equal(m.nodes.get("I")?.shape, "parallelogram");
  assert.equal(m.nodes.get("J")?.shape, "cylinder");
  assert.equal(m.nodes.get("C")?.label, "Circle");
  assert.equal(m.nodes.get("H")?.label, "Subroutine");
});

test("parser: a bare id is a square node with an empty label", () => {
  const m = parseMermaid("flowchart LR\n  A --> B\n");
  assert.equal(m.nodes.get("A")?.shape, "square");
  assert.equal(m.nodes.get("A")?.label, "");
});

test("parser: a later shape declaration upgrades a bare id", () => {
  const m = parseMermaid("flowchart LR\n  A --> B\n  B[(db)]\n");
  assert.equal(m.nodes.get("B")?.shape, "cylinder");
  assert.equal(m.nodes.get("B")?.label, "db");
});

// --- parser: edges ---

test("parser: solid forward arrow", () => {
  const m = parseMermaid("flowchart LR\n  A --> B\n");
  assert.deepEqual(m.edges, [{ from: "A", to: "B", style: "solid", direction: "forward" }]);
});

test("parser: dashed arrow", () => {
  const m = parseMermaid("flowchart LR\n  A -.-> B\n");
  assert.equal(m.edges[0].style, "dashed");
  assert.equal(m.edges[0].direction, "forward");
});

test("parser: bidirectional arrow", () => {
  const m = parseMermaid("flowchart LR\n  A <--> B\n");
  assert.equal(m.edges[0].direction, "bidirectional");
});

test("parser: undirected link", () => {
  const m = parseMermaid("flowchart LR\n  A --- B\n");
  assert.equal(m.edges[0].direction, "none");
});

test("parser: thick arrow (==>) is a solid forward edge", () => {
  const m = parseMermaid("flowchart LR\n  A ==> B\n");
  assert.equal(m.edges.length, 1);
  assert.equal(m.edges[0].style, "solid");
  assert.equal(m.edges[0].direction, "forward");
});

test("parser: thick line (==) is an undirected edge", () => {
  const m = parseMermaid("flowchart LR\n  A == B\n");
  assert.equal(m.edges.length, 1);
  assert.equal(m.edges[0].direction, "none");
});

test("parser: thick labeled link (== text ==>)", () => {
  const m = parseMermaid("flowchart LR\n  A == text ==> B\n");
  assert.equal(m.edges.length, 1);
  assert.equal(m.edges[0].label, "text");
});

test("parser: class application (class A red) is dropped, not a node", () => {
  const m = parseMermaid("flowchart LR\n  A[x] --> B[y]\n  class A red\n");
  assert.equal(m.nodes.size, 2);
  assert.ok(m.unsupported.some((s) => s.startsWith("class")));
});

test("parser: left-pointing arrow reverses the flow", () => {
  const m = parseMermaid("flowchart LR\n  A <-- B\n");
  assert.equal(m.edges[0].from, "B");
  assert.equal(m.edges[0].to, "A");
});

test("parser: pipe label", () => {
  const m = parseMermaid("flowchart LR\n  A -->|yes| B\n");
  assert.equal(m.edges[0].label, "yes");
});

test("parser: dash-embedded label", () => {
  const m = parseMermaid("flowchart LR\n  A -- text --> B\n");
  assert.equal(m.edges[0].label, "text");
  assert.equal(m.edges[0].style, "solid");
});

test("parser: dashed dash-embedded label", () => {
  const m = parseMermaid("flowchart LR\n  A -. text .-> B\n");
  assert.equal(m.edges[0].label, "text");
  assert.equal(m.edges[0].style, "dashed");
});

test("parser: chained edges expand into one edge per pair", () => {
  const m = parseMermaid("flowchart LR\n  A --> B --> C\n");
  assert.equal(m.edges.length, 2);
  assert.deepEqual(
    m.edges.map((e) => [e.from, e.to]),
    [
      ["A", "B"],
      ["B", "C"],
    ],
  );
});

// --- parser: subgraphs + direction ---

test("parser: subgraph membership and nesting", () => {
  const m = parseMermaid(`flowchart LR
    subgraph Outer
      A[inner]
      subgraph Inner
        B[deeper]
      end
    end
    C[outside]
  `);
  assert.equal(m.nodeSubgraph.get("A"), "sg1");
  assert.equal(m.nodeSubgraph.get("B"), "sg2");
  assert.equal(m.nodeSubgraph.get("C"), undefined);
  const inner = m.subgraphs.get("sg2");
  assert.equal(inner?.parent, "sg1");
  assert.equal(inner?.title, "Inner");
});

test("parser: subgraph id [title] form uses the title", () => {
  const m = parseMermaid(`flowchart LR
    subgraph myid [My Title]
      A[x]
    end
  `);
  assert.equal(m.subgraphs.get("sg1")?.title, "My Title");
});

test("parser: header direction is captured", () => {
  assert.equal(parseMermaid("flowchart TD\n  A --> B\n").direction, "TD");
  assert.equal(parseMermaid("graph LR\n  A --> B\n").direction, "LR");
  assert.equal(parseMermaid("flowchart BT\n  A --> B\n").direction, "BT");
});

test("parser: a direction statement overrides the header", () => {
  const m = parseMermaid(`flowchart TD
    direction LR
    A --> B
  `);
  assert.equal(m.direction, "LR");
});

test("parser: %% comments are stripped", () => {
  const m = parseMermaid("flowchart LR\n  %% a comment\n  A --> B\n");
  assert.equal(m.nodes.size, 2);
});

// --- parser: errors ---

test("parser: rejects other Mermaid diagram types", () => {
  assert.throws(() => parseMermaid("sequenceDiagram\n  A->>B: hi"), MermaidError);
});

test("parser: rejects an unclosed subgraph", () => {
  assert.throws(() => parseMermaid("flowchart LR\n  subgraph X\n    A[x]\n"), MermaidError);
});

test("parser: rejects a stray end", () => {
  assert.throws(() => parseMermaid("flowchart LR\n  A[x]\n  end"), MermaidError);
});

// --- convert: mapping ---

test("convert: cylinder becomes a database, others become cards", () => {
  const r = importMermaid("flowchart LR\n  A[(db)] --> B[svc] --> C((q))\n");
  const byId = new Map(r.spec.nodes.map((n) => [n.id, n]));
  assert.equal(byId.get("A")?.shape, "database");
  assert.equal(byId.get("B")?.shape, "card");
  assert.equal(byId.get("C")?.shape, "card");
});

test("convert: non-square shapes produce a card warning", () => {
  const r = importMermaid("flowchart LR\n  A{d} --> B((c))\n");
  assert.ok(r.warnings.some((w) => w.includes("diamond")));
  assert.ok(r.warnings.some((w) => w.includes("circle")));
});

test("convert: edge styles and directions map through", () => {
  const r = importMermaid("flowchart LR\n  A --> B\n  C -.-> D\n  E <--> F\n  G --- H\n");
  const edges = r.spec.edges;
  assert.equal(edges[0].style, "solid");
  assert.equal(edges[0].direction, "forward");
  assert.equal(edges[1].style, "dashed");
  assert.equal(edges[2].direction, "bidirectional");
  assert.equal(edges[3].direction, "none");
});

test("convert: edge labels are preserved", () => {
  const r = importMermaid("flowchart LR\n  A -->|yes| B\n");
  assert.equal(r.spec.edges[0].label, "yes");
});

test("convert: subgraphs become boundary groups (nested via parent)", () => {
  const r = importMermaid(`flowchart LR
    subgraph Outer
      A[x]
      subgraph Inner
        B[y]
      end
    end
  `);
  assert.equal(r.spec.groups.length, 2);
  const inner = r.spec.groups.find((g) => g.label === "Inner");
  assert.ok(inner?.parent, "inner group should reference its parent");
  const a = r.spec.nodes.find((n) => n.id === "A");
  const b = r.spec.nodes.find((n) => n.id === "B");
  assert.ok(a?.group, "A should be in a group");
  assert.ok(b?.group, "B should be in a group");
  assert.notEqual(a?.group, b?.group);
});

test("convert: direction maps TD/BT -> down, LR/RL -> right", () => {
  assert.equal(importMermaid("flowchart TD\n  A --> B\n").spec.direction, "down");
  assert.equal(importMermaid("flowchart BT\n  A --> B\n").spec.direction, "down");
  assert.equal(importMermaid("flowchart LR\n  A --> B\n").spec.direction, "right");
  assert.equal(importMermaid("flowchart RL\n  A --> B\n").spec.direction, "right");
});

test("convert: no direction -> auto", () => {
  const r = importMermaid("flowchart\n  A --> B\n");
  assert.equal(r.spec.direction, "auto");
});

test("convert: unsupported statements become warnings, not failures", () => {
  const r = importMermaid(`flowchart LR
    A[x] --> B[y]
    classDef red fill:#f00
    style A stroke-width:2px
    linkStyle 0 stroke:#00f
  `);
  assert.equal(r.spec.nodes.length, 2);
  assert.ok(r.warnings.some((w) => w.includes("classDef")));
  assert.ok(r.warnings.some((w) => w.includes("style")));
  assert.ok(r.warnings.some((w) => w.includes("linkStyle")));
});

test("convert: duplicate edges are deduplicated", () => {
  const r = importMermaid("flowchart LR\n  A --> B\n  A --> B\n");
  assert.equal(r.spec.edges.length, 1);
});

test("convert: self-edges are dropped", () => {
  const r = importMermaid("flowchart LR\n  A --> A\n");
  assert.equal(r.spec.edges.length, 0);
});

test("convert: the result is a valid architecture spec", () => {
  const r = importMermaid("flowchart LR\n  A[x] --> B[y]\n");
  assert.equal(r.spec.type, "architecture");
  assert.equal(r.spec.version, "1");
  assert.ok(r.spec.nodes.length >= 1);
});

test("convert: a diagram with no nodes still yields a valid spec", () => {
  const r = importMermaid("flowchart LR\n");
  assert.ok(r.spec.nodes.length >= 1);
  assert.ok(r.warnings.some((w) => w.toLowerCase().includes("no nodes")));
});

test("convertModel: exported for direct use on a parsed model", () => {
  const m = parseMermaid("flowchart LR\n  A[x] --> B[y]\n");
  const r = convertModel(m);
  assert.equal(r.spec.nodes.length, 2);
});
