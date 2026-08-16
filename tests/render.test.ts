import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadSpecFromText } from "../src/spec/index.js";
import { layoutSpec } from "../src/layout/index.js";
import { composeDiagram } from "../src/render/index.js";

async function renderYaml(yaml: string) {
  const parsed = loadSpecFromText(yaml);
  assert.equal(parsed.ok, true, parsed.ok ? undefined : JSON.stringify(parsed.errors));
  if (!parsed.ok) throw new Error("unreachable");
  const layout = await layoutSpec(parsed.spec);
  return composeDiagram(parsed.spec, layout);
}

describe("compose (spec -> layout -> svg)", () => {
  test("generates a valid SVG with no warnings for known icons", async () => {
    const { svg, warnings } = await renderYaml(`
version: '1'
title: Test Diagram
nodes:
  - id: web
    label: Web Server
    icon: aws:lambda
    category: compute
  - id: db
    label: PostgreSQL
    icon: brand:postgresql
    category: database
edges:
  - from: web
    to: db
    label: SQL
`);
    assert.deepEqual(warnings, []);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
    assert.ok(svg.includes("Test Diagram"));
    assert.ok(svg.includes("Web Server"));
    assert.ok(svg.includes("PostgreSQL"));
    assert.ok(svg.includes("SQL"));
  });

  test("an unknown icon produces a warning but still renders an SVG with a fallback", async () => {
    const { svg, warnings } = await renderYaml(`
version: '1'
nodes:
  - id: a
    label: Weird Service
    icon: aws:does-not-exist
edges: []
`);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /aws:does-not-exist/);
    assert.ok(svg.includes("Weird Service"));
    assert.ok(svg.includes(">W<"), "should contain the fallback badge with the label's initial");
  });

  test("escapes label text so it can't break the SVG", async () => {
    const { svg } = await renderYaml(`
version: '1'
nodes:
  - id: a
    label: "<script>alert(1)</script>"
edges: []
`);
    assert.ok(!svg.includes("<script>"));
    assert.ok(svg.includes("&lt;script&gt;"));
  });

  describe("node shapes", () => {
    for (const shape of ["card", "database", "actor", "cloud"]) {
      test(`shape "${shape}" renders with no warnings and no invalid coordinates`, async () => {
        const { svg, warnings } = await renderYaml(`
version: '1'
nodes:
  - id: a
    label: Node ${shape}
    shape: ${shape}
    icon: generic:server
  - id: b
    label: B
edges:
  - from: a
    to: b
`);
        assert.deepEqual(warnings, []);
        assert.ok(svg.includes(`Node ${shape}`));
        assert.ok(!svg.includes("NaN"), "paths/coordinates should not contain NaN");
        assert.ok(!svg.includes("undefined"), "attributes should not contain 'undefined'");
      });
    }

    test("shape 'database' draws a path (cylinder body) in addition to the badge/icon", async () => {
      const { svg } = await renderYaml(`
version: '1'
nodes:
  - id: a
    label: DB
    shape: database
edges: []
`);
      assert.match(svg, /<path d="M0,\d/);
      assert.match(svg, /<ellipse /);
    });

    test("shape 'cloud' draws the cloud silhouette with no card rectangle behind it", async () => {
      const { svg } = await renderYaml(`
version: '1'
nodes:
  - id: a
    label: Internet
    shape: cloud
edges: []
`);
      assert.ok(svg.includes("q-2.28"), "should contain the cloud path");
    });
  });
});
