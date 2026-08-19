import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateC4Spec, layoutC4, renderC4 } from "../src/engines/c4/index.js";
import type { C4Spec } from "../src/engines/c4/index.js";

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
});
