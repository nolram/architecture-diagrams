import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateUmlClassSpec, layoutUmlClass, composeUmlClass } from "../src/engines/uml-class/index.js";
import type { UmlClassSpec } from "../src/engines/uml-class/index.js";

async function renderUml(raw: unknown): Promise<string> {
  const result = validateUmlClassSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  const spec: UmlClassSpec = result.spec;
  const layout = await layoutUmlClass(spec);
  const { svg, warnings } = await composeUmlClass(spec, layout);
  assert.deepEqual(warnings, []);
  return svg;
}

describe("uml-class render", () => {
  test("produces a valid <svg> document", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      title: "T",
      classes: [{ id: "a", name: "A" }],
    });
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok(svg.trimEnd().endsWith("</svg>"));
    assert.ok(svg.includes("A"));
  });

  test("renders all six relationship kinds with their marker geometry", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [
        { from: "a", to: "b", kind: "association" },
        { from: "a", to: "b", kind: "aggregation" },
        { from: "a", to: "b", kind: "composition" },
        { from: "a", to: "b", kind: "inheritance" },
        { from: "a", to: "b", kind: "dependency" },
        { from: "a", to: "b", kind: "realization" },
      ],
    });
    // hollow + filled diamond (aggregation + composition)
    assert.ok(svg.includes('points="0,0 7,-7 14,0 7,7"'), "diamond marker should be present");
    assert.ok(svg.includes('fill="none"'), "hollow diamond should be stroke-only");
    // hollow triangle (inheritance + realization)
    assert.ok(svg.includes('points="0,0 -12,-6 -12,6"'), "triangle marker should be present");
    // open arrow (dependency)
    assert.ok(svg.includes('d="M-8,-3.5 L0,0 L-8,3.5"'), "open arrow should be present");
    // dependency + realization are dashed
    assert.ok(svg.includes('stroke-dasharray="7 5"'), "dashed edges should be present");
  });

  test("a class with attributes and methods renders 3 compartments (2 separators)", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [
        {
          id: "a",
          name: "A",
          attributes: [{ name: "x", type: "int", visibility: "public" }],
          methods: [{ name: "m", return: "void", visibility: "public" }],
        },
      ],
    });
    const separators = (svg.match(/<line x1="0" y1=/g) ?? []).length;
    assert.equal(separators, 2, "name|attributes and attributes|methods separators expected");
    assert.ok(svg.includes("+ x: int"));
    assert.ok(svg.includes("+ m(): void"));
  });

  test("a class with only a name renders a single compartment (no separators)", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "Solo" }],
    });
    const separators = (svg.match(/<line x1="0" y1=/g) ?? []).length;
    assert.equal(separators, 0);
  });

  test("renders a stereotype with guillemets above the name", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "Payable", stereotype: "interface" }],
    });
    assert.ok(svg.includes("«interface»"), "stereotype should be wrapped in guillemets");
  });

  test("renders an abstract class name in italics", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "AbstractOrder", abstract: true }],
    });
    assert.ok(svg.includes('font-style="italic"'), "abstract name should be italic");
    assert.ok(svg.includes("AbstractOrder"));
  });

  test("renders all four visibility symbols", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [
        {
          id: "a",
          name: "A",
          attributes: [
            { name: "pub", visibility: "public" },
            { name: "priv", visibility: "private" },
            { name: "prot", visibility: "protected" },
            { name: "pkg", visibility: "package" },
          ],
        },
      ],
    });
    assert.ok(svg.includes("+ pub"), "public symbol +");
    assert.ok(svg.includes("- priv"), "private symbol -");
    assert.ok(svg.includes("# prot"), "protected symbol #");
    assert.ok(svg.includes("~ pkg"), "package symbol ~");
  });

  test("underlines a static member", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [
        {
          id: "a",
          name: "A",
          attributes: [{ name: "shared", type: "int", visibility: "public", static: true }],
        },
      ],
    });
    assert.ok(svg.includes('text-decoration="underline"'), "static member should be underlined");
  });

  test("renders multiplicity and role labels when set", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [
        {
          from: "a",
          to: "b",
          kind: "composition",
          fromMultiplicity: "1",
          toMultiplicity: "*",
          fromRole: "has",
          toRole: "items",
        },
      ],
    });
    assert.ok(svg.includes(">has<"), "fromRole should appear");
    assert.ok(svg.includes(">items<"), "toRole should appear");
    assert.ok(svg.includes(">1<"), "fromMultiplicity should appear");
    assert.ok(svg.includes(">*<"), "toMultiplicity should appear");
  });

  test("escapes a class name with special characters", async () => {
    const svg = await renderUml({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "A & B <C>" }],
    });
    assert.ok(!svg.includes(">A & B <C><"), "raw special chars must not appear unescaped");
    assert.ok(svg.includes("A &amp; B &lt;C&gt;"), "name should be XML-escaped");
  });
});
