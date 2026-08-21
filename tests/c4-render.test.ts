import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateC4Spec, layoutC4, renderC4, estimateElementSize } from "../src/engines/c4/index.js";
import type { C4Spec } from "../src/engines/c4/index.js";
import { wrapText } from "../src/render/svg-utils.js";

async function renderC4Svg(raw: unknown): Promise<string> {
  const result = validateC4Spec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  const spec: C4Spec = result.spec;
  const layout = await layoutC4(spec);
  const { svg, warnings } = await renderC4(spec, layout);
  assert.deepEqual(warnings, []);
  return svg;
}

describe("c4 render", () => {
  test("produces a well-formed <svg> document", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "A", type: "person" }],
    });
    assert.ok(svg.startsWith("<svg"), "svg should open with <svg");
    assert.ok(svg.trimEnd().endsWith("</svg>"), "svg should close with </svg>");
    assert.ok(svg.includes('width="'), "svg should have a width");
    assert.ok(svg.includes('height="'), "svg should have a height");
    assert.ok(svg.includes('viewBox="'), "svg should have a viewBox");
  });

  test("a person renders a circle silhouette and no card rect", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [{ id: "user", name: "Alice", type: "person" }],
    });
    assert.ok(svg.includes("<circle"), "person head should be a circle");
    assert.ok(svg.includes("Alice"), "person name should be present");
    const rects = (svg.match(/<rect /g) ?? []).length;
    assert.equal(rects, 1, "only the canvas background rect should be present for a lone person");
    assert.ok(svg.includes('<rect x="0" y="0"'), "the single rect should be the canvas background");
  });

  test("a leaf system renders a rect card with its name", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "user", name: "User", type: "person" },
        { id: "app", name: "Billing", type: "system" },
      ],
      relationships: [{ from: "user", to: "app" }],
    });
    assert.ok(svg.includes("<rect"), "system card should be a rect");
    assert.ok(svg.includes("Billing"), "system name should be present");
  });

  test("an external-system renders a dashed rect", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "user", name: "User", type: "person" },
        { id: "ext", name: "Gateway", type: "external-system" },
      ],
      relationships: [{ from: "user", to: "ext" }],
    });
    assert.ok(svg.includes("<rect"), "external-system card should be a rect");
    assert.ok(svg.includes('stroke-dasharray="6 5"'), "external-system border should be dashed");
  });

  test("a system with children renders as a boundary titled with its name", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "app", name: "App", type: "system" },
        { id: "api", name: "API", type: "container", group: "app" },
      ],
    });
    assert.ok(svg.includes('rx="12"'), "boundary rect should use the boundary corner radius");
    assert.ok(svg.includes("App"), "boundary title should be present");
    assert.ok(svg.includes("API"), "child element should be present");
  });

  test("renders description and technology combined as 'description (technology)'", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "a", name: "Widget", type: "system", description: "Does things", technology: "Go" },
      ],
    });
    assert.ok(svg.includes("Does things (Go)"), "combined description (technology) should be present");
  });

  test("escapes element names with special characters", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "A & B <test>", type: "system" }],
    });
    assert.ok(svg.includes("A &amp; B &lt;test&gt;"), "name should be XML-escaped");
    assert.ok(!svg.includes("<test>"), "raw special chars must not appear unescaped");
  });

  test("renders a relationship description as an edge label", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "user", name: "User", type: "person" },
        { id: "app", name: "App", type: "system" },
      ],
      relationships: [{ from: "user", to: "app", description: "sends events" }],
    });
    assert.ok(svg.includes("sends events"), "relationship description should be present");
  });

  test("renders the spec title when set", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      title: "My Diagram",
      elements: [{ id: "a", name: "A", type: "person" }],
    });
    assert.ok(svg.includes("My Diagram"), "title should be present");
  });

  test("a boundary with children also renders its description and technology", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "app", name: "App", type: "system", description: "Sells things", technology: "Node.js" },
        { id: "api", name: "API", type: "container", group: "app" },
      ],
    });
    assert.ok(svg.includes("Sells things (Node.js)"), "boundary should show the combined description (technology)");
  });

  test("shows a legend headed by the level when multiple element types are present", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      level: "context",
      elements: [
        { id: "user", name: "User", type: "person" },
        { id: "app", name: "App", type: "system" },
        { id: "ext", name: "Ext", type: "external-system" },
      ],
    });
    assert.ok(svg.includes("System Context"), "legend should be headed by the context level title");
    assert.ok(svg.includes("Person"), "legend should list the person type");
    assert.ok(svg.includes("External system"), "legend should list the external-system type");
  });

  test("the legend heading follows the level (container / component)", async () => {
    // use element types that do NOT include the level word, so the heading is unambiguous
    const container = await renderC4Svg({
      type: "c4",
      version: "1",
      level: "container",
      elements: [
        { id: "app", name: "App", type: "system" },
        { id: "ext", name: "Ext", type: "external-system" },
      ],
    });
    assert.ok(container.includes(">Container<"), "container level should head the legend");

    const component = await renderC4Svg({
      type: "c4",
      version: "1",
      level: "component",
      elements: [
        { id: "app", name: "App", type: "system" },
        { id: "ext", name: "Ext", type: "external-system" },
      ],
    });
    assert.ok(component.includes(">Component<"), "component level should head the legend");
  });

  test("omits the legend when the diagram has a single element type", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "a", name: "A", type: "system" },
        { id: "b", name: "B", type: "system" },
      ],
    });
    assert.ok(!svg.includes("System Context"), "no legend heading for a single-type diagram");
    assert.ok(!svg.includes(">Person<"), "no legend entries for a single-type diagram");
  });

  test("the dark theme emits midnight-dark tokens", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      theme: "midnight-dark",
      elements: [
        { id: "user", name: "User", type: "person" },
        { id: "app", name: "App", type: "system" },
      ],
    });
    assert.ok(svg.includes("#0b1220"), "dark canvas background should be present");
    assert.ok(svg.includes("#1e3a8a"), "dark system fill should be present");
  });

  test("parallel edges (same from/to) both render their labels", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "a", name: "A", type: "person" },
        { id: "b", name: "B", type: "system" },
      ],
      relationships: [
        { from: "a", to: "b", description: "charges" },
        { from: "a", to: "b", description: "refunds" },
      ],
    });
    assert.ok(svg.includes("charges"), "first parallel edge label should be present");
    assert.ok(svg.includes("refunds"), "second parallel edge label should be present");
  });

  test("an element with a resolvable icon renders an icon badge", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "API", type: "system", icon: "brand:nodejs" }],
    });
    // the badge is a 40x40 rounded rect drawn before the card text
    assert.ok(/<rect[^>]*width="40"[^>]*height="40"/.test(svg), "icon badge rect should be present");
  });

  test("a person ignores its icon (keeps the silhouette)", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "Alice", type: "person", icon: "brand:nodejs" }],
    });
    assert.ok(svg.includes("<circle"), "person should still render a silhouette");
    assert.ok(!/<rect[^>]*width="40"[^>]*height="40"/.test(svg), "person should not get an icon badge");
  });

  test("a non-active element renders dashed, dimmed, and tagged", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "Legacy", type: "system", status: "deprecated" }],
    });
    assert.ok(svg.includes('stroke-dasharray="4 4"'), "non-active element border should be dashed");
    assert.ok(svg.includes('opacity="0.62"'), "non-active element should be dimmed");
    assert.ok(svg.includes(">DEPRECATED<"), "non-active element should carry a status tag");
  });

  test("an active element carries no status tag", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "App", type: "system", status: "active" }],
    });
    assert.ok(!svg.includes(">DEPRECATED<"), "active element should not be tagged deprecated");
    assert.ok(!svg.includes('opacity="0.62"'), "active element should not be dimmed");
  });

  test("a non-active relationship renders a dashed line", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        { id: "a", name: "A", type: "person" },
        { id: "b", name: "B", type: "system" },
      ],
      relationships: [{ from: "a", to: "b", status: "suspended" }],
    });
    assert.ok(svg.includes('stroke-dasharray="4 4"'), "non-active relationship should be dashed");
  });

  test("a long description wraps onto multiple lines", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        {
          id: "a",
          name: "Widget",
          type: "system",
          description:
            "This is a deliberately very long description that should wrap across several lines instead of being truncated to a single line with an ellipsis.",
        },
      ],
    });
    // a wrapped description produces more than one description <text> line
    const descLines = (svg.match(/font-size="12"[^>]*>/g) ?? []).length;
    assert.ok(descLines >= 2, `expected a wrapped (multi-line) description, got ${descLines} lines`);
  });

  test("wrap.maxLines: 1 folds overflow into an ellipsis", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      wrap: { maxLines: 1 },
      elements: [
        {
          id: "a",
          name: "Widget",
          type: "system",
          description:
            "This is a deliberately very long description that should be folded into a single line with a trailing ellipsis when maxLines is 1.",
        },
      ],
    });
    assert.ok(svg.includes("…"), "overflow should be folded into an ellipsis");
  });

  test("an unresolvable icon falls back to a badge and emits a warning", async () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "API", type: "system", icon: "brand:does-not-exist" }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
    if (!result.ok) throw new Error("unreachable");
    const layout = await layoutC4(result.spec);
    const { svg, warnings } = await renderC4(result.spec, layout);
    assert.ok(warnings.length >= 1, "a warning should be emitted for the missing icon");
    assert.ok(/<rect[^>]*width="40"[^>]*height="40"/.test(svg), "a fallback badge should still be drawn");
  });

  test("a boundary with an icon emits a warning, renders no badge, and reserves no icon width", async () => {
    // a boundary's icon is ignored for sizing (it renders a title, not a badge)
    const withIcon = estimateElementSize({ id: "b", name: "Boundary", type: "system", icon: "brand:nodejs" }, 4, true);
    const withoutIcon = estimateElementSize({ id: "b", name: "Boundary", type: "system" }, 4, true);
    assert.equal(withIcon.width, withoutIcon.width, "a boundary's icon should not reserve width");
    assert.equal(withIcon.height, withoutIcon.height, "a boundary's icon should not affect height");

    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "b", name: "Boundary", type: "system", icon: "brand:nodejs" },
        { id: "c", name: "Child", type: "container", group: "b" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
    if (!result.ok) throw new Error("unreachable");
    const layout = await layoutC4(result.spec);
    const { svg, warnings } = await renderC4(result.spec, layout);
    assert.ok(
      warnings.some((w) => w.includes('icon on boundary "b" is ignored')),
      `a warning should be emitted for the boundary icon: ${JSON.stringify(warnings)}`,
    );
    assert.ok(!/<rect[^>]*width="40"[^>]*height="40"/.test(svg), "the boundary should not render an icon badge");
  });

  test("a boundary description stays single-line even with a high wrap.maxLines", async () => {
    const longDesc =
      "Orchestrates batch payment processing, settlement, reconciliation, idempotency, retries, and reporting across the whole pipeline.";
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      wrap: { maxLines: 12 },
      elements: [
        { id: "b", name: "Boundary", type: "system", description: longDesc },
        { id: "c", name: "Child", type: "container", group: "b" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
    if (!result.ok) throw new Error("unreachable");
    const layout = await layoutC4(result.spec);
    const { svg, warnings } = await renderC4(result.spec, layout);
    assert.deepEqual(warnings, []);
    const boundaryDescCount = (svg.match(/<text x="16" y="46"/g) ?? []).length;
    assert.equal(boundaryDescCount, 1, "the boundary description should be a single line (not wrapped)");
  });

  test("wrapText clamps a single word longer than the max width", () => {
    // a single word longer than maxChars cannot be broken, so it is truncated
    const lines = wrapText("supercalifragilisticexpialidocious", 50, 7.4, 4);
    assert.equal(lines.length, 1, "a single long word should produce one line");
    assert.ok(lines[0].includes("…"), "the long word should be truncated with an ellipsis");
    const maxChars = Math.floor(50 / 7.4 + 1e-6);
    assert.ok(lines[0].length <= maxChars, `clamped line (${lines[0].length}) should fit within maxChars (${maxChars})`);
  });

  test("wrap.maxLines: 16 renders (upper bound works)", async () => {
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      wrap: { maxLines: 16 },
      elements: [
        {
          id: "a",
          name: "Widget",
          type: "system",
          description:
            "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty",
        },
      ],
    });
    assert.ok(svg.includes("Widget"), "the element should render");
    const descLines = (svg.match(/font-size="12"[^>]*>/g) ?? []).length;
    assert.ok(descLines >= 2, `expected a wrapped (multi-line) description, got ${descLines} lines`);
  });

  test("a long name and description render whole (no ellipsis) at the default wrap", async () => {
    // the agrow-style case that used to truncate: a 38-char name and a ~130-char
    // description must both fit without an ellipsis now that boxes grow.
    const svg = await renderC4Svg({
      type: "c4",
      version: "1",
      elements: [
        {
          id: "a",
          name: "Agrow Pay — Core Banking (WhatsMoney)",
          type: "system",
          description:
            "Recebe, valida, processa e liquida os lotes de pagamento a fornecedores, decidindo a trilha por janela TED e IdParticipant.",
          technology: ".NET / Azure",
        },
      ],
    });
    assert.ok(svg.includes("Agrow Pay — Core Banking (WhatsMoney)"), "the full name should render (not truncated)");
    assert.ok(!svg.includes("…"), "no ellipsis should appear for a description that fits");
  });

  test("a status tag and a long name co-occur without overlapping", async () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "a", name: "A Very Long Element Name That Extends Toward The Right Side", type: "system", status: "deprecated" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
    if (!result.ok) throw new Error("unreachable");
    const layout = await layoutC4(result.spec);
    const { svg, warnings } = await renderC4(result.spec, layout);
    assert.deepEqual(warnings, []);
    assert.ok(svg.includes(">DEPRECATED<"), "the status tag should be present");
    const nameMatch = svg.match(/<text[^>]*y="(\d+(?:\.\d+)?)"[^>]*font-size="15"[^>]*font-weight="600"/);
    assert.ok(nameMatch, "the name text should be present");
    if (!nameMatch) return;
    const nameY = Number(nameMatch[1]);
    const tagBottom = 8 + 16; // tag top (8) + tag height (16)
    const nameCapTop = nameY - 11; // approximate cap-height for a 15px font
    assert.ok(nameCapTop > tagBottom, `name cap-top (${nameCapTop}) should clear the tag bottom (${tagBottom})`);
  });

  test("a boundary status tag clears the title without pushing it into the description", async () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "b", name: "Boundary", type: "system", description: "A description below the title.", status: "deprecated" },
        { id: "c", name: "Child", type: "container", group: "b" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
    if (!result.ok) throw new Error("unreachable");
    const layout = await layoutC4(result.spec);
    const { svg, warnings } = await renderC4(result.spec, layout);
    assert.deepEqual(warnings, []);
    assert.ok(svg.includes(">DEPRECATED<"), "the status tag should be present");

    // the title keeps its normal baseline (28) instead of being pushed into the description (46)
    const titleMatch = svg.match(/<text x="16" y="(\d+(?:\.\d+)?)"[^>]*font-size="15"[^>]*font-weight="600"/);
    assert.ok(titleMatch, "the boundary title should be present");
    if (!titleMatch) return;
    const titleY = Number(titleMatch[1]);
    assert.equal(titleY, 28, "the boundary title should stay at its normal baseline");

    // the tag's bottom must clear the title's cap-height
    const tagMatch = svg.match(/<rect[^>]*y="(\d+(?:\.\d+)?)"[^>]*height="16"[^>]*rx="8"/);
    assert.ok(tagMatch, "the status tag rect should be present");
    if (!tagMatch) return;
    const tagBottom = Number(tagMatch[1]) + 16;
    const titleCapTop = titleY - 11; // approximate cap-height for a 15px font
    assert.ok(tagBottom < titleCapTop, `tag bottom (${tagBottom}) should clear the title cap-top (${titleCapTop})`);
  });
});
