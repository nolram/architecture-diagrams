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
    // The chip rect is the only rect with height="26" rx="13"; the group's fill
    // rect uses rx="18" and the border is a <path>, so this uniquely identifies chips.
    const chipRects = (svg: string) => svg.match(/<rect[^>]*height="26"[^>]*rx="13"[^>]*\/>/g) ?? [];
    // A group border path is the only stroke path with exactly four arc (A)
    // commands (the rounded corners); edges are pure M/L polylines. Matching on
    // this structural signature avoids colliding with the edge colour, which can
    // equal a group's stroke (e.g. clean-light edgeColor == boundary stroke).
    const borderPaths = (svg: string) =>
      (svg.match(/<path d="[^"]*" fill="none"[^>]*stroke="[^"]*"/g) ?? []).filter((p) => (p.match(/ A[\d.]+,[\d.]+ /g) ?? []).length === 4);

    test("a dashed group's label chip stays transparent and the border is broken behind it", async () => {
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

      // (F2) the chip must stay transparent so it never paints a foreign colour
      // over a parent group's interior when nested.
      const chips = chipRects(svg);
      assert.ok(chips.length >= 2, `expected at least 2 group chips, got ${chips.length}`);
      for (const chip of chips) {
        const fillMatch = chip.match(/fill="([^"]*)"/);
        assert.ok(fillMatch, `chip should have a fill attribute: ${chip}`);
        assert.equal(fillMatch![1], "none", `group chip must stay transparent, got fill="${fillMatch![1]}"`);
      }

      // (F1) the border must be broken where the chip sits, so no line runs
      // through the label. The gapped border is a <path> whose top edge is split
      // into two segments, i.e. it has more than one subpath-start (M command).
      const borders = borderPaths(svg);
      assert.ok(borders.length >= 2, `expected at least 2 group border paths, got ${borders.length}`);
      for (const border of borders) {
        const d = border.match(/d="([^"]*)"/)![1];
        const subpaths = d.match(/M[\d.]+,[\d.]+ /g) ?? [];
        assert.ok(subpaths.length >= 2, `top edge should be split into two segments around the chip gap, got: ${d}`);
      }
    });

    test("a solid group's label chip is also not crossed by its border", async () => {
      const { svg, warnings } = await renderYaml(`
version: '1'
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
    label: "VPC One"
    style: vpc
  - id: g2
    label: "VPC Two"
    style: vpc
edges:
  - from: a
    to: b
`);
      assert.deepEqual(warnings, []);

      const chips = chipRects(svg);
      assert.ok(chips.length >= 2, `expected at least 2 group chips, got ${chips.length}`);
      for (const chip of chips) {
        const fillMatch = chip.match(/fill="([^"]*)"/);
        assert.equal(fillMatch?.[1], "none", `group chip must stay transparent, got fill="${fillMatch?.[1]}"`);
      }

      // vpc border is solid and must still be broken behind the chip.
      const borders = borderPaths(svg);
      assert.ok(borders.length >= 2, `expected at least 2 group border paths, got ${borders.length}`);
      for (const border of borders) {
        const d = border.match(/d="([^"]*)"/)![1];
        const subpaths = d.match(/M[\d.]+,[\d.]+ /g) ?? [];
        assert.ok(subpaths.length >= 2, `top edge should be split into two segments around the chip gap, got: ${d}`);
      }
    });

    test("a nested group's chip stays transparent (no colour notch over the parent)", async () => {
      const { svg, warnings } = await renderYaml(`
version: '1'
theme: clean-light
direction: right
nodes:
  - id: a
    label: "Service A"
    group: az1
  - id: b
    label: "Service B"
    group: az2
groups:
  - id: vpc1
    label: "VPC"
    style: vpc
  - id: az1
    label: "AZ One"
    style: az
    parent: vpc1
  - id: az2
    label: "AZ Two"
    style: az
    parent: vpc1
edges: []
`);
      assert.deepEqual(warnings, []);

      // The az chips sit on the VPC's lavender interior; they must stay
      // transparent so the parent fill shows through (no green notch).
      const chips = chipRects(svg);
      assert.ok(chips.length >= 3, `expected at least 3 group chips (vpc + 2 az), got ${chips.length}`);
      for (const chip of chips) {
        const fillMatch = chip.match(/fill="([^"]*)"/);
        assert.equal(fillMatch?.[1], "none", `group chip must stay transparent, got fill="${fillMatch?.[1]}"`);
      }
    });

    test("a clamped (full-width) label chip legitimately replaces the top edge", async () => {
      // A long label in a parent-constrained (nested) group clamps the chip to
      // the box's full width. There is then no room for a top-edge stub between
      // the chip and the 18px corner radius, so the full-width title chip
      // replaces the top edge. The box must still keep its other three sides and
      // all four rounded corners, and the chip must stay transparent.
      const { svg, warnings } = await renderYaml(`
version: '1'
theme: clean-light
direction: right
nodes:
  - id: a
    label: "Service A"
    group: az1
  - id: b
    label: "Service B"
    group: az2
groups:
  - id: vpc1
    label: "VPC"
    style: vpc
  - id: az1
    label: "A VERY LONG AZ LABEL THAT GETS CLAMPED"
    style: az
    parent: vpc1
  - id: az2
    label: "AZ Two"
    style: az
    parent: vpc1
edges: []
`);
      assert.deepEqual(warnings, []);

      const chips = chipRects(svg);
      assert.ok(chips.length >= 3, `expected at least 3 group chips, got ${chips.length}`);
      for (const chip of chips) {
        const fillMatch = chip.match(/fill="([^"]*)"/);
        assert.equal(fillMatch?.[1], "none", `group chip must stay transparent, got fill="${fillMatch?.[1]}"`);
      }

      // The clamped az border has no top-edge segment (the chip replaces it) but
      // must still carry all four rounded corners and the left/right/bottom edges.
      const borders = borderPaths(svg);
      assert.ok(borders.length >= 3, `expected at least 3 group border paths, got ${borders.length}`);
      const clamped = borders.find((b) => {
        const d = b.match(/d="([^"]*)"/)![1];
        return (d.match(/M[\d.]+,[\d.]+ /g) ?? []).length === 1; // single subpath: no top-edge stub
      });
      assert.ok(clamped, `expected one clamped border with no top-edge stub`);
      const d = clamped!.match(/d="([^"]*)"/)![1];
      assert.equal((d.match(/ A[\d.]+,[\d.]+ /g) ?? []).length, 4, `clamped border must keep all four corners: ${d}`);
      assert.ok(/L[\d.]+,[\d.]+ /.test(d), `clamped border must keep its side/bottom edges: ${d}`);
    });
  });
});
