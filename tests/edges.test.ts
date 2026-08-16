import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { renderEdge } from "../src/render/edges.js";
import { getTheme } from "../src/render/theme.js";
import type { EdgeRoute } from "../src/layout/run-layout.js";

const theme = getTheme("clean-light");

function edge(direction: "forward" | "bidirectional" | "none" = "forward") {
  return { from: "a", to: "b", style: "solid" as const, direction };
}

function route(points: EdgeRoute["points"]): EdgeRoute {
  return { id: "e", points };
}

function arrowRotations(svg: string): number[] {
  return [...svg.matchAll(/rotate\(([-\d.]+)\)/g)].map((m) => Number(m[1]));
}

describe("edge arrowheads", () => {
  // Regression: resvg mis-orients SVG <marker orient="auto-start-reverse">
  // on multi-segment paths (derives the rotation from a blend of the whole
  // path instead of the true tangent of the final segment) -- confirmed with
  // a minimal repro before switching to manually-rotated arrowhead shapes.
  // These tests pin the angle math itself, independent of the renderer.

  test("straight path ending downward rotates the arrowhead to 90°", () => {
    const svg = renderEdge(edge(), route([{ x: 10, y: 10 }, { x: 10, y: 100 }]), theme);
    assert.deepEqual(arrowRotations(svg), [90]);
  });

  test("straight path ending rightward keeps the arrowhead at 0°", () => {
    const svg = renderEdge(edge(), route([{ x: 10, y: 10 }, { x: 100, y: 10 }]), theme);
    assert.deepEqual(arrowRotations(svg), [0]);
  });

  test("orthogonal bend (right then down) orients by the FINAL segment, not the whole path", () => {
    // This is exactly the shape that triggered the bug: a bend whose overall
    // start->end direction is diagonal, but whose last segment is straight down.
    const svg = renderEdge(
      edge(),
      route([
        { x: 10, y: 10 },
        { x: 10, y: 20 },
        { x: 150, y: 20 },
        { x: 150, y: 80 },
      ]),
      theme,
    );
    assert.deepEqual(arrowRotations(svg), [90]);
  });

  test("orthogonal bend ending leftward orients to 180°", () => {
    const svg = renderEdge(
      edge(),
      route([
        { x: 150, y: 10 },
        { x: 150, y: 20 },
        { x: 10, y: 20 },
      ]),
      theme,
    );
    assert.deepEqual(arrowRotations(svg), [180]);
  });

  test("direction: none draws no arrowhead", () => {
    const svg = renderEdge(edge("none"), route([{ x: 10, y: 10 }, { x: 10, y: 100 }]), theme);
    assert.deepEqual(arrowRotations(svg), []);
  });

  test("direction: bidirectional draws two arrowheads, one at each end, each oriented outward", () => {
    const svg = renderEdge(edge("bidirectional"), route([{ x: 10, y: 10 }, { x: 10, y: 100 }]), theme);
    const rotations = arrowRotations(svg);
    assert.equal(rotations.length, 2);
    assert.ok(rotations.includes(90), "end arrow should point down (90°)");
    assert.ok(rotations.includes(-90), "start arrow should point up, away from the path (-90°)");
  });
});
