import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateErSpec, layoutEr, composeEr } from "../src/engines/er/index.js";
import type { ErSpec } from "../src/engines/er/index.js";

async function renderEr(raw: unknown): Promise<string> {
  const result = validateErSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  const spec: ErSpec = result.spec;
  const layout = await layoutEr(spec);
  const { svg, warnings } = await composeEr(spec, layout);
  assert.deepEqual(warnings, []);
  return svg;
}

describe("er render", () => {
  test("produces a valid <svg> document", async () => {
    const svg = await renderEr({
      type: "er",
      version: "1",
      title: "T",
      entities: [{ id: "a", name: "Account" }],
    });
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok(svg.trimEnd().endsWith("</svg>"));
    assert.ok(svg.includes("Account"));
  });

  test("renders a title when present and omits it when absent", async () => {
    const withTitle = await renderEr({
      type: "er",
      version: "1",
      title: "Banking Model",
      entities: [{ id: "a", name: "A" }],
    });
    assert.ok(withTitle.includes("Banking Model"), "title text should appear");
    assert.ok(withTitle.includes('font-size="24"'), "title should use font-size 24");

    const noTitle = await renderEr({
      type: "er",
      version: "1",
      entities: [{ id: "a", name: "A" }],
    });
    assert.ok(!noTitle.includes('font-size="24"'), "no title text should be rendered");
  });

  test("renders PK and FK badges with an underlined key attribute", async () => {
    const svg = await renderEr({
      type: "er",
      version: "1",
      entities: [
        {
          id: "a",
          name: "A",
          attributes: [
            { name: "id", type: "int", key: "primary" },
            { name: "owner_id", type: "int", key: "foreign" },
          ],
        },
      ],
    });
    assert.ok(svg.includes(">PK<"), "PK badge should be present");
    assert.ok(svg.includes(">FK<"), "FK badge should be present");
    assert.ok(svg.includes('text-decoration="underline"'), "key attribute should be underlined");
  });

  test("renders a double border for weak entities only", async () => {
    const weak = await renderEr({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "w", name: "W", weak: true },
      ],
      relationships: [{ from: "a", to: "w", identifying: true }],
    });
    assert.ok(weak.includes('x="4" y="4"'), "weak entity should have an inner rect");
    assert.ok(weak.includes('rx="7" fill="none"'), "weak entity inner rect should be stroke-only");

    const plain = await renderEr({
      type: "er",
      version: "1",
      entities: [{ id: "a", name: "A" }],
    });
    assert.ok(!plain.includes('rx="7" fill="none"'), "non-weak entity should not have a double border");
  });

  test("renders all four cardinalities with their crow's-foot marker geometry", async () => {
    const svg = await renderEr({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
        { id: "d", name: "D" },
      ],
      relationships: [
        { from: "a", to: "b", fromCardinality: "one", toCardinality: "one" },
        { from: "a", to: "c", fromCardinality: "zero-or-one", toCardinality: "zero-or-one" },
        { from: "a", to: "d", fromCardinality: "many", toCardinality: "many" },
        { from: "b", to: "c", fromCardinality: "zero-or-many", toCardinality: "zero-or-many" },
      ],
    });
    // one: single tick line
    assert.ok(svg.includes('x1="10" y1="-6" x2="10" y2="6"'), "one marker tick should be present");
    // many: two crow's-foot lines
    assert.ok(svg.includes('x1="12" y1="-7" x2="0" y2="0"'), "many marker upper line should be present");
    assert.ok(svg.includes('x1="12" y1="7" x2="0" y2="0"'), "many marker lower line should be present");
    // zero-or-one: tick + small circle
    assert.ok(svg.includes('<circle cx="16" cy="0" r="4"'), "zero-or-one circle should be present");
    // zero-or-many: foot + small circle
    assert.ok(svg.includes('<circle cx="18" cy="0" r="4"'), "zero-or-many circle should be present");
  });

  test("dashes non-identifying edges and keeps identifying edges solid", async () => {
    const svg = await renderEr({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "w", name: "W", weak: true },
      ],
      relationships: [
        { from: "a", to: "b" },
        { from: "a", to: "w", identifying: true },
      ],
    });
    const dashed = (svg.match(/stroke-dasharray="7 5"/g) ?? []).length;
    assert.equal(dashed, 1, "exactly the non-identifying edge should be dashed");
  });

  test("renders a relationship label with a background pill", async () => {
    const svg = await renderEr({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b", label: "owns" }],
    });
    assert.ok(svg.includes(">owns<"), "label text should appear");
    // pill = rounded rect with the theme edgeLabelBg fill (height 16, distinct from the 14px PK/FK badge)
    const pills = (svg.match(/<rect [^>]*height="16" rx="4" fill="rgba\(248, 250, 252, 0\.85\)" stroke="#e2e8f0"\/>/g) ?? []).length;
    assert.equal(pills, 1, "one pill behind the label expected");
  });

  test("parallel edges between the same pair get non-overlapping label pills", async () => {
    // Regression: the layout used to give ELK no label size, so parallel edges
    // were stacked 24px apart and their pills (60-100px wide) collided. The fix
    // passes the label size to ELK (which spaces the edges apart) and draws each
    // pill at ELK's reserved box.
    const svg = await renderEr({
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
        { from: "a", to: "b", label: "licenses" },
      ],
    });

    // every relationship label pill is a rounded rect with height 16 + rx 4 +
    // the theme edgeLabelBg fill (distinct from the 14px PK/FK badge)
    const pillRe = /<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="16" rx="4" fill="rgba\(248, 250, 252, 0\.85\)" stroke="#e2e8f0"\/>/g;
    const pills: { x: number; y: number; w: number; h: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = pillRe.exec(svg)) !== null) {
      pills.push({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: 16 });
    }
    assert.equal(pills.length, 4, "one pill per labeled relationship expected");

    // no two pills may overlap (with a small tolerance for float rounding)
    const EPS = 0.5;
    for (let i = 0; i < pills.length; i++) {
      for (let j = i + 1; j < pills.length; j++) {
        const a = pills[i], b = pills[j];
        const overlaps =
          a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;
        assert.ok(!overlaps, `pills ${i} (${a.x},${a.y}) and ${j} (${b.x},${b.y}) must not overlap`);
      }
    }
  });

  test("escapes an entity name with special characters", async () => {
    const svg = await renderEr({
      type: "er",
      version: "1",
      entities: [{ id: "a", name: "A & B <C>" }],
    });
    assert.ok(!svg.includes(">A & B <C><"), "raw special chars must not appear unescaped");
    assert.ok(svg.includes("A &amp; B &lt;C&gt;"), "name should be XML-escaped");
  });

  test("renders the midnight-dark theme with its dark canvas", async () => {
    const svg = await renderEr({
      type: "er",
      version: "1",
      theme: "midnight-dark",
      entities: [{ id: "a", name: "A" }],
    });
    assert.ok(svg.includes('fill="#0b1220"'), "dark canvas background should be used");
  });
});
