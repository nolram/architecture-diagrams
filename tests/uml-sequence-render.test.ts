import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateUmlSequenceSpec } from "../src/engines/uml-sequence/schema.js";
import { buildSequenceLayout } from "../src/engines/uml-sequence/layout.js";
import { composeUmlSequence } from "../src/engines/uml-sequence/render.js";
import type { UmlSequenceSpec } from "../src/engines/uml-sequence/schema.js";
import { ACTIVATION_WIDTH, SELF_LOOP_WIDTH } from "../src/engines/uml-sequence/geometry.js";

async function render(raw: unknown): Promise<{ svg: string; spec: UmlSequenceSpec; layout: ReturnType<typeof buildSequenceLayout> }> {
  const result = validateUmlSequenceSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  const spec: UmlSequenceSpec = result.spec;
  const layout = buildSequenceLayout(spec);
  const { svg, warnings } = await composeUmlSequence(spec, layout);
  assert.deepEqual(warnings, []);
  return { svg, spec, layout };
}

async function renderWithWarnings(raw: unknown): Promise<{ svg: string; warnings: string[]; layout: ReturnType<typeof buildSequenceLayout> }> {
  const result = validateUmlSequenceSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  const spec: UmlSequenceSpec = result.spec;
  const layout = buildSequenceLayout(spec);
  const { svg, warnings } = await composeUmlSequence(spec, layout);
  return { svg, warnings, layout };
}

const base = {
  type: "uml-sequence" as const,
  version: "1" as const,
};

describe("uml-sequence render", () => {
  test("minimal spec renders an svg with both participant names", async () => {
    const { svg } = await render({
      ...base,
      participants: [
        { id: "a", name: "Alice" },
        { id: "b", name: "Bob" },
      ],
    });
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok(svg.trimEnd().endsWith("</svg>"));
    assert.ok(svg.includes("Alice"));
    assert.ok(svg.includes("Bob"));
  });

  test("sync message renders a solid path with a filled arrowhead", async () => {
    const { svg, layout } = await render({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [{ id: "m1", from: "a", to: "b", kind: "sync" }],
    });
    const y = layout.messageYs.get("m1")!;
    const x1 = layout.lifelines.get("a")!.x;
    const x2 = layout.lifelines.get("b")!.x;
    assert.ok(svg.includes(`<path d="M${x1},${y} L${x2 - 10},${y}" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`), "solid sync path expected");
    assert.ok(svg.includes('points="0,0 -10,-4 -10,4" fill="#94a3b8"'), "filled arrowhead expected");
  });

  test("async message renders an open (unfilled) arrowhead", async () => {
    const { svg } = await render({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [{ id: "m1", from: "a", to: "b", kind: "async" }],
    });
    assert.ok(svg.includes('points="0,0 -10,-4 -10,4" fill="none"'), "open arrowhead expected");
  });

  test("reply message renders a dashed path with an open arrowhead", async () => {
    const { svg } = await render({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [{ id: "m1", from: "a", to: "b", kind: "reply" }],
    });
    assert.ok(svg.includes('stroke-dasharray="7 5"'), "dashed reply path expected");
    assert.ok(svg.includes('points="0,0 -10,-4 -10,4" fill="none"'), "open arrowhead expected");
  });

  test("self message renders a 4-point loopback path", async () => {
    const { svg, layout } = await render({
      ...base,
      participants: [{ id: "a", name: "A" }],
      messages: [{ id: "m1", from: "a", to: "a", kind: "self" }],
    });
    const x = layout.lifelines.get("a")!.x;
    const y = layout.messageYs.get("m1")!;
    assert.ok(
      svg.includes(`M${x},${y} L${x + SELF_LOOP_WIDTH},${y} L${x + SELF_LOOP_WIDTH},${y + 20} L${x + 10},${y + 20}`),
      "loopback path expected",
    );
    assert.ok(svg.includes('points="0,0 -10,-4 -10,4" fill="#94a3b8"'), "filled arrowhead at loopback end expected");
  });

  test("actor participant renders a stick figure (circle head) and no box rect", async () => {
    const { svg, layout } = await render({
      ...base,
      participants: [
        { id: "u", name: "User", type: "actor" },
        { id: "s", name: "Server" },
      ],
    });
    assert.ok(svg.includes("<circle"), "actor head circle expected");
    const box = layout.nodes.get("u")!;
    assert.ok(!svg.includes(`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"`), "no box rect for actor");
    assert.ok(svg.includes(">User<"), "actor name expected");
  });

  test("stereotype renders in guillemets above the participant", async () => {
    const { svg } = await render({
      ...base,
      participants: [{ id: "a", name: "A", stereotype: "control" }],
    });
    assert.ok(svg.includes("«control»"), "stereotype with guillemets expected");
  });

  test("activation renders a rect with the activation width", async () => {
    const { svg } = await render({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [
        { id: "m1", from: "a", to: "b", kind: "sync", activation: true },
        { id: "m2", from: "b", to: "a", kind: "reply" },
      ],
    });
    assert.ok(svg.includes(`width="${ACTIVATION_WIDTH}"`), "activation bar expected");
  });

  test("overlapping activations on one lifeline render side by side and warn", async () => {
    const { svg, warnings, layout } = await renderWithWarnings({
      ...base,
      participants: [
        { id: "engine", name: "Engine" },
        { id: "worker", name: "Worker" },
        { id: "queue", name: "Queue" },
      ],
      messages: [
        { id: "c1", from: "engine", to: "worker", kind: "sync", activation: true },
        { id: "c2", from: "engine", to: "queue", kind: "sync", activation: true },
        { id: "c3", from: "queue", to: "engine", kind: "reply" },
        { id: "c4", from: "worker", to: "engine", kind: "reply" },
      ],
    });
    const x = layout.lifelines.get("engine")!.x;
    const baseX = x - ACTIVATION_WIDTH / 2;
    const y1 = layout.messageYs.get("c1")!;
    const y2 = layout.messageYs.get("c2")!;
    assert.ok(
      svg.includes(`<rect x="${baseX}" y="${y1}" width="${ACTIVATION_WIDTH}" height="${layout.messageYs.get("c4")! - y1}"`),
      "first activation bar at the normal x expected",
    );
    assert.ok(
      svg.includes(`<rect x="${baseX + ACTIVATION_WIDTH + 4}" y="${y2}" width="${ACTIVATION_WIDTH}" height="${layout.messageYs.get("c3")! - y2}"`),
      "second activation bar offset by ACTIVATION_WIDTH + 4 expected",
    );
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /engine/);
  });

  test("fragment renders a dashed box, a tab with kind and label, and a separator line", async () => {
    const { svg } = await render({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [
        { id: "m1", from: "a", to: "b" },
        { id: "m2", from: "b", to: "a" },
      ],
      fragments: [{ id: "f1", kind: "alt", label: "success", participants: ["a", "b"], messages: ["m1", "m2"] }],
    });
    assert.ok(svg.includes('stroke-dasharray="6 4"'), "dashed fragment box expected");
    assert.ok(svg.includes(">alt<"), "tab kind expected");
    assert.ok(svg.includes("[success]"), "tab label expected");
    const separator = (svg.match(/<line x1="[^"]+" y1="[^"]+" x2="[^"]+" y2="[^"]+" stroke="#e2e8f0"\/>/g) ?? []).length;
    assert.ok(separator >= 1, "separator line expected for a labeled fragment with 2+ messages");
  });

  test("message label renders above the line", async () => {
    const { svg } = await render({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [{ id: "m1", from: "a", to: "b", label: "do it" }],
    });
    assert.ok(svg.includes(">do it<"), "message label expected");
  });

  test("message label renders a canvasBg rect immediately before the text", async () => {
    const { svg } = await render({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [{ id: "m1", from: "a", to: "b", label: "do it" }],
    });
    const width = "do it".length * 7 + 8;
    const match = svg.match(new RegExp(`<rect x="[^"]+" y="[^"]+" width="${width}" height="16" fill="#f8fafc"/><text[^>]*>do it</text>`));
    assert.ok(match, `canvasBg rect immediately before label text expected (width=${width})`);
  });

  test("self message label renders a canvasBg rect with the label width", async () => {
    const { svg } = await render({
      ...base,
      participants: [{ id: "a", name: "A" }],
      messages: [{ id: "m1", from: "a", to: "a", kind: "self", label: "think" }],
    });
    const width = "think".length * 7 + 8;
    assert.ok(svg.includes(`width="${width}" height="16" fill="#f8fafc"/>`), "canvasBg rect expected");
    assert.match(svg, new RegExp(`<rect x="[^"]+" y="[^"]+" width="${width}" height="16" fill="#f8fafc"/><text[^>]*>think</text>`));
  });

  test("midnight-dark theme uses the dark canvasBg for label background rects", async () => {
    const { svg } = await render({
      ...base,
      theme: "midnight-dark",
      participants: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      messages: [{ id: "m1", from: "a", to: "b", label: "do it" }],
    });
    const width = "do it".length * 7 + 8;
    assert.ok(svg.includes(`width="${width}" height="16" fill="#0b1220"/>`), "dark canvasBg rect expected");
  });

  test("title renders and canvas rect uses the theme canvasBg", async () => {
    const { svg } = await render({
      ...base,
      title: "My Sequence",
      participants: [{ id: "a", name: "A" }],
    });
    assert.ok(svg.includes(">My Sequence<"), "title expected");
    assert.ok(svg.includes('fill="#f8fafc"'), "clean-light canvasBg expected");
  });

  test("midnight-dark theme changes the canvas background", async () => {
    const spec = {
      ...base,
      participants: [{ id: "a", name: "A" }],
    };
    const light = (await render(spec)).svg;
    const dark = (await render({ ...spec, theme: "midnight-dark" })).svg;
    assert.ok(light.includes('fill="#f8fafc"'));
    assert.ok(dark.includes('fill="#0b1220"'));
    assert.notEqual(light, dark);
  });
});
