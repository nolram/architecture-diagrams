import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateUmlClassSpec } from "../src/engines/uml-class/index.js";

type Result = ReturnType<typeof validateUmlClassSpec>;

function errorPaths(result: Result): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.path);
}

function errorMessages(result: Result): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.message);
}

const base = {
  type: "uml-class",
  version: "1",
  classes: [{ id: "a", name: "A" }],
};

describe("uml-class spec validation", () => {
  test("accepts a valid spec and applies defaults", () => {
    const result = validateUmlClassSpec({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "A", attributes: [{ name: "x" }] }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.spec.theme, "clean-light");
    assert.equal(result.spec.direction, "auto");
    assert.deepEqual(result.spec.relationships, []);
    assert.equal(result.spec.classes[0].attributes![0].visibility, "public");
  });

  test("requires the type discriminator", () => {
    const result = validateUmlClassSpec({ version: "1", classes: [{ id: "a", name: "A" }] });
    assert.equal(result.ok, false);
  });

  test("requires version '1'", () => {
    const result = validateUmlClassSpec({ type: "uml-class", version: "2", classes: [{ id: "a", name: "A" }] });
    assert.equal(result.ok, false);
  });

  test("rejects a duplicate class id with the field path", () => {
    const result = validateUmlClassSpec({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "a", name: "A2" },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("classes.1.id"), `expected classes.1.id in ${JSON.stringify(paths)}`);
  });

  test("rejects a relationship pointing at a nonexistent class, naming it", () => {
    const result = validateUmlClassSpec({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "A" }],
      relationships: [{ from: "a", to: "ghost", kind: "association" }],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("relationships.0.to"), `expected relationships.0.to in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("ghost")), "error should name the missing class");
  });

  test("rejects a self-relationship", () => {
    const result = validateUmlClassSpec({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "A" }],
      relationships: [{ from: "a", to: "a", kind: "association" }],
    });
    assert.equal(result.ok, false);
    const paths = errorPaths(result);
    assert.ok(paths.some((p) => p.startsWith("relationships.0")), `expected a relationships.0.* path in ${JSON.stringify(paths)}`);
  });

  test("rejects an unknown relationship kind, listing the allowed kinds", () => {
    const result = validateUmlClassSpec({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b", kind: "friendship" }],
    });
    assert.equal(result.ok, false);
    const messages = errorMessages(result);
    assert.ok(messages.some((m) => m.includes("association") && m.includes("composition")), "error should list allowed kinds");
  });

  test("rejects an invalid visibility value", () => {
    const result = validateUmlClassSpec({
      type: "uml-class",
      version: "1",
      classes: [{ id: "a", name: "A", attributes: [{ name: "x", visibility: "friendly" }] }],
    });
    assert.equal(result.ok, false);
  });

  test("accepts a class with only a name (no members)", () => {
    const result = validateUmlClassSpec(base);
    assert.equal(result.ok, true);
  });

  test("rejects an empty classes array", () => {
    const result = validateUmlClassSpec({ type: "uml-class", version: "1", classes: [] });
    assert.equal(result.ok, false);
  });

  test("accepts all six relationship kinds and optional multiplicity/role", () => {
    const kinds = ["association", "aggregation", "composition", "inheritance", "dependency", "realization"];
    const result = validateUmlClassSpec({
      type: "uml-class",
      version: "1",
      classes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: kinds.map((kind) => ({
        from: "a",
        to: "b",
        kind,
        fromMultiplicity: "1",
        toMultiplicity: "*",
        fromRole: "has",
        toRole: "items",
      })),
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });
});
