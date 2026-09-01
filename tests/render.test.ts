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

  describe("sublabel wrapping", () => {
    test("a long sublabel wraps onto multiple lines instead of truncating", async () => {
      const { svg, warnings } = await renderYaml(`
version: '1'
nodes:
  - id: b
    label: Tailored access control
    sublabel: Each role sees only what it needs
    icon: generic:lock
edges: []
`);
      assert.deepEqual(warnings, []);
      assert.ok(!svg.includes("…"), "the sublabel should wrap, not be truncated with an ellipsis");
      const sublabelLines = (svg.match(/font-size="12"/g) ?? []).length;
      assert.ok(sublabelLines >= 2, `expected a wrapped (multi-line) sublabel, got ${sublabelLines} line(s)`);
    });

    test("a short sublabel renders on a single line (regression guard)", async () => {
      const { svg, warnings } = await renderYaml(`
version: '1'
nodes:
  - id: b
    label: Tailored access control
    sublabel: Node.js
    icon: generic:lock
edges: []
`);
      assert.deepEqual(warnings, []);
      assert.ok(!svg.includes("…"), "a short sublabel should not be truncated");
      const sublabelLines = (svg.match(/font-size="12"/g) ?? []).length;
      assert.equal(sublabelLines, 1, "a short sublabel should render on exactly one line");
    });
  });

  describe("group label pill", () => {
    test("a dashed group's label chip has an opaque background (covers the dashed border)", async () => {
      const { svg, warnings } = await renderYaml(`
version: '1'
title: "Bug repro: style: boundary label overlaps dashed border"
theme: clean-light
direction: right
nodes:
  - id: a
    label: "Service A"
    group: g1
  - id: b
    label: "Service B"
    group: g2
groups:
  - id: g1
    label: "Before migration"
    style: boundary
  - id: g2
    label: "After migration"
    style: boundary
edges:
  - from: a
    to: b
`);
      assert.deepEqual(warnings, []);
      // The group chip rect is the only rect with height="26" rx="13".
      const chipMatches = svg.match(/<rect[^>]*height="26"[^>]*rx="13"[^>]*\/>/g) ?? [];
      assert.ok(chipMatches.length >= 2, `expected at least 2 group chips, got ${chipMatches.length}`);
      for (const chip of chipMatches) {
        const fillMatch = chip.match(/fill="([^"]*)"/);
        assert.ok(fillMatch, `chip should have a fill attribute: ${chip}`);
        assert.notEqual(fillMatch![1], "none", `group chip must have an opaque background, got fill="${fillMatch![1]}"`);
      }
    });

    test("a dashed 'az' group's label chip is opaque in the dark theme too", async () => {
      const { svg, warnings } = await renderYaml(`
version: '1'
theme: midnight-dark
direction: right
nodes:
  - id: a
    label: "Service A"
    group: g1
  - id: b
    label: "Service B"
    group: g2
groups:
  - id: g1
    label: "AZ One"
    style: az
  - id: g2
    label: "AZ Two"
    style: az
edges:
  - from: a
    to: b
`);
      assert.deepEqual(warnings, []);
      const chipMatches = svg.match(/<rect[^>]*height="26"[^>]*rx="13"[^>]*\/>/g) ?? [];
      assert.ok(chipMatches.length >= 2, `expected at least 2 group chips, got ${chipMatches.length}`);
      for (const chip of chipMatches) {
        const fillMatch = chip.match(/fill="([^"]*)"/);
        assert.ok(fillMatch, `chip should have a fill attribute: ${chip}`);
        assert.notEqual(fillMatch![1], "none", `group chip must have an opaque background, got fill="${fillMatch![1]}"`);
      }
    });
  });
});
