import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildSequenceLayout } from "../src/engines/uml-sequence/layout.js";
import type { UmlSequenceMessage, UmlSequenceParticipant, UmlSequenceSpec } from "../src/engines/uml-sequence/schema.js";
import {
  ACTOR_HEIGHT,
  ACTOR_NAME_SPACE,
  ACTOR_WIDTH,
  COLUMN_GAP,
  FIRST_MESSAGE_GAP,
  FRAGMENT_HEADER_GAP,
  FRAGMENT_PAD_X,
  LIFELINE_TAIL,
  PARTICIPANT_BOX_HEIGHT,
  ROW_HEIGHT,
  SELF_LOOP_DROP,
  SELF_LOOP_WIDTH,
  STEREOTYPE_SPACE,
  estimateParticipantWidth,
} from "../src/engines/uml-sequence/geometry.js";

const p = (id: string, name: string, extra: Partial<UmlSequenceParticipant> = {}): UmlSequenceParticipant => ({
  id,
  name,
  type: "object",
  ...extra,
});

const m = (id: string, from: string, to: string, extra: Partial<UmlSequenceMessage> = {}): UmlSequenceMessage => ({
  id,
  from,
  to,
  kind: "sync",
  ...extra,
});

function spec(overrides: Partial<UmlSequenceSpec> = {}): UmlSequenceSpec {
  return {
    type: "uml-sequence",
    version: "1",
    theme: "clean-light",
    direction: "auto",
    participants: [p("a", "A"), p("b", "B")],
    messages: [],
    fragments: [],
    ...overrides,
  };
}

function serialize(layout: ReturnType<typeof buildSequenceLayout>): string {
  return JSON.stringify({
    width: layout.width,
    height: layout.height,
    direction: layout.direction,
    nodes: [...layout.nodes.entries()],
    groups: [...layout.groups.entries()],
    edges: [...layout.edges.entries()],
    lifelines: [...layout.lifelines.entries()],
    activations: layout.activations,
    messageYs: [...layout.messageYs.entries()],
  });
}

describe("uml-sequence layout", () => {
  test("two participants + one sync message: centers, message y, nodes, edge route", () => {
    const s = spec({ messages: [m("m1", "a", "b")] });
    const layout = buildSequenceLayout(s);

    const wA = estimateParticipantWidth("A");
    const wB = estimateParticipantWidth("B");
    const cA = wA / 2;
    const cB = cA + wA / 2 + COLUMN_GAP + wB / 2;

    assert.equal(layout.lifelines.get("a")!.x, cA);
    assert.equal(layout.lifelines.get("b")!.x, cB);

    const lifelineTop = PARTICIPANT_BOX_HEIGHT;
    assert.equal(layout.messageYs.get("m1"), lifelineTop + FIRST_MESSAGE_GAP);

    assert.deepEqual(layout.nodes.get("a"), { id: "a", x: 0, y: 0, width: wA, height: PARTICIPANT_BOX_HEIGHT });
    assert.deepEqual(layout.nodes.get("b"), { id: "b", x: cB - wB / 2, y: 0, width: wB, height: PARTICIPANT_BOX_HEIGHT });

    const edge = layout.edges.get("m1")!;
    assert.equal(edge.points.length, 2);
    assert.deepEqual(edge.points, [
      { x: cA, y: lifelineTop + FIRST_MESSAGE_GAP },
      { x: cB, y: lifelineTop + FIRST_MESSAGE_GAP },
    ]);

    assert.equal(layout.direction, "down");
    assert.equal(layout.width, cB + wB / 2);
    assert.equal(layout.height, lifelineTop + FIRST_MESSAGE_GAP + LIFELINE_TAIL);
  });

  test("message ys strictly increase in spec order", () => {
    const s = spec({
      messages: [m("m1", "a", "b"), m("m2", "b", "a"), m("m3", "a", "b")],
    });
    const layout = buildSequenceLayout(s);
    const ys = [layout.messageYs.get("m1")!, layout.messageYs.get("m2")!, layout.messageYs.get("m3")!];
    assert.ok(ys[0] < ys[1], `m1 (${ys[0]}) < m2 (${ys[1]})`);
    assert.ok(ys[1] < ys[2], `m2 (${ys[1]}) < m3 (${ys[2]})`);
    assert.equal(ys[1] - ys[0], ROW_HEIGHT);
    assert.equal(ys[2] - ys[1], ROW_HEIGHT);
  });

  test("fragment box bounds and the extra header gap before its first message", () => {
    const s = spec({
      messages: [m("m1", "a", "b"), m("m2", "b", "a"), m("m3", "a", "b")],
      fragments: [{ id: "f1", kind: "alt", label: "valid", participants: ["a", "b"], messages: ["m2", "m3"] }],
    });
    const layout = buildSequenceLayout(s);

    const g = layout.groups.get("f1")!;
    const y1 = layout.messageYs.get("m1")!;
    const y2 = layout.messageYs.get("m2")!;
    const y3 = layout.messageYs.get("m3")!;

    assert.ok(g.y < y2, `fragment top (${g.y}) < first covered message y (${y2})`);
    assert.ok(y2 < y3, "first covered message y < last covered message y");
    assert.ok(y3 < g.y + g.height, `last covered message y (${y3}) < fragment bottom (${g.y + g.height})`);

    const xA = layout.lifelines.get("a")!.x;
    const xB = layout.lifelines.get("b")!.x;
    assert.ok(g.x < Math.min(xA, xB), `fragment left (${g.x}) < min covered lifeline x (${Math.min(xA, xB)})`);
    assert.ok(Math.max(xA, xB) < g.x + g.width, `max covered lifeline x (${Math.max(xA, xB)}) < fragment right (${g.x + g.width})`);

    assert.equal(g.x, Math.min(xA, xB) - FRAGMENT_PAD_X);
    assert.equal(g.x + g.width, Math.max(xA, xB) + FRAGMENT_PAD_X);
    assert.equal(g.y, y2 - FRAGMENT_HEADER_GAP);
    assert.equal(g.y + g.height, y3 + 16);

    // the fragment's first message sits ROW_HEIGHT + FRAGMENT_HEADER_GAP below the previous one
    assert.equal(y2 - y1, ROW_HEIGHT + FRAGMENT_HEADER_GAP);
  });

  test("activation with a reply spans from the message to the reply", () => {
    const s = spec({ messages: [m("m1", "a", "b", { activation: true }), m("m2", "b", "a")] });
    const layout = buildSequenceLayout(s);
    assert.equal(layout.activations.length, 1);
    assert.deepEqual(layout.activations[0], {
      participantId: "a",
      top: layout.messageYs.get("m1")!,
      bottom: layout.messageYs.get("m2")!,
    });
  });

  test("activation without a reply falls back to ROW_HEIGHT", () => {
    const s = spec({ messages: [m("m1", "a", "b", { activation: true })] });
    const layout = buildSequenceLayout(s);
    assert.equal(layout.activations.length, 1);
    assert.deepEqual(layout.activations[0], {
      participantId: "a",
      top: layout.messageYs.get("m1")!,
      bottom: layout.messageYs.get("m1")! + ROW_HEIGHT,
    });
  });

  test("self message activation is a ROW_HEIGHT bar on the same participant", () => {
    const s = spec({ messages: [m("m1", "a", "a", { kind: "self", activation: true })] });
    const layout = buildSequenceLayout(s);
    assert.equal(layout.activations.length, 1);
    assert.deepEqual(layout.activations[0], {
      participantId: "a",
      top: layout.messageYs.get("m1")!,
      bottom: layout.messageYs.get("m1")! + ROW_HEIGHT,
    });
  });

  test("self message route is a 4-point loopback to the right", () => {
    const s = spec({ messages: [m("m1", "a", "a", { kind: "self" })] });
    const layout = buildSequenceLayout(s);
    const x = layout.lifelines.get("a")!.x;
    const y = layout.messageYs.get("m1")!;
    assert.deepEqual(layout.edges.get("m1")!.points, [
      { x, y },
      { x: x + SELF_LOOP_WIDTH, y },
      { x: x + SELF_LOOP_WIDTH, y: y + SELF_LOOP_DROP },
      { x, y: y + SELF_LOOP_DROP },
    ]);
  });

  test("actor participant gets an ACTOR-sized node and a lifeline at its center", () => {
    const s = spec({
      participants: [p("user", "User", { type: "actor" }), p("svc", "Service")],
      messages: [m("m1", "user", "svc")],
    });
    const layout = buildSequenceLayout(s);

    const node = layout.nodes.get("user")!;
    assert.equal(node.width, ACTOR_WIDTH);
    assert.equal(node.height, ACTOR_HEIGHT);
    assert.equal(layout.lifelines.get("user")!.x, node.x + node.width / 2);
    // the actor's name sits below the figure, so the lifeline starts after the name space
    assert.equal(layout.lifelines.get("user")!.top, ACTOR_HEIGHT + ACTOR_NAME_SPACE);
  });

  test("stereotype space is reserved only when some participant has a stereotype", () => {
    const layoutWith = buildSequenceLayout(spec({ participants: [p("a", "A", { stereotype: "control" }), p("b", "B")] }));
    assert.equal(layoutWith.nodes.get("a")!.y, STEREOTYPE_SPACE);
    assert.equal(layoutWith.lifelines.get("a")!.top, STEREOTYPE_SPACE + PARTICIPANT_BOX_HEIGHT);

    const layoutWithout = buildSequenceLayout(spec());
    assert.equal(layoutWithout.nodes.get("a")!.y, 0);
    assert.equal(layoutWithout.lifelines.get("a")!.top, PARTICIPANT_BOX_HEIGHT);
  });

  test("layout is deterministic for the same spec", () => {
    const s = spec({
      participants: [p("user", "User", { type: "actor" }), p("ctrl", "OrderCtrl", { stereotype: "control" }), p("repo", "OrderRepo")],
      messages: [
        m("m1", "user", "ctrl", { activation: true }),
        m("m2", "ctrl", "repo"),
        m("m3", "repo", "ctrl"),
        m("m4", "ctrl", "ctrl", { kind: "self" }),
      ],
      fragments: [{ id: "f1", kind: "alt", participants: ["ctrl", "repo"], messages: ["m2", "m3"] }],
    });
    assert.equal(serialize(buildSequenceLayout(s)), serialize(buildSequenceLayout(s)));
  });

  test("a spec with no messages still produces lifelines with a tail", () => {
    const layout = buildSequenceLayout(spec());
    for (const id of ["a", "b"]) {
      const ll = layout.lifelines.get(id)!;
      assert.equal(ll.bottom, ll.top + LIFELINE_TAIL);
    }
    assert.equal(layout.height, PARTICIPANT_BOX_HEIGHT + LIFELINE_TAIL);
  });
});
