import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateErSpec } from "../src/engines/er/index.js";

type Result = ReturnType<typeof validateErSpec>;

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
  type: "er",
  version: "1",
  entities: [{ id: "a", name: "A" }],
};

describe("er spec validation", () => {
  test("accepts a valid spec and applies defaults", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A", attributes: [{ name: "x" }] },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b" }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.spec.theme, "clean-light");
    assert.equal(result.spec.direction, "auto");
    assert.equal(result.spec.relationships[0].fromCardinality, "one");
    assert.equal(result.spec.relationships[0].toCardinality, "many");
  });

  test("defaults relationships to an empty array", () => {
    const result = validateErSpec(base);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.spec.relationships, []);
  });

  test("requires the type discriminator", () => {
    const result = validateErSpec({ version: "1", entities: [{ id: "a", name: "A" }] });
    assert.equal(result.ok, false);
  });

  test("requires version '1'", () => {
    const result = validateErSpec({ type: "er", version: "2", entities: [{ id: "a", name: "A" }] });
    assert.equal(result.ok, false);
  });

  test("rejects an empty entities array, naming the requirement", () => {
    const result = validateErSpec({ type: "er", version: "1", entities: [] });
    assert.equal(result.ok, false);
    const messages = errorMessages(result);
    assert.ok(messages.some((m) => m.includes("at least one entity")), "error should mention at least one entity");
  });

  test("rejects a duplicate entity id with the field path", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "a", name: "A2" },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("entities.1.id"), `expected entities.1.id in ${JSON.stringify(paths)}`);
  });

  test("rejects a self-relationship with the field path", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [{ id: "a", name: "A" }],
      relationships: [{ from: "a", to: "a" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("relationships.0.to"), `expected relationships.0.to in ${JSON.stringify(paths)}`);
  });

  test("rejects a relationship pointing at a nonexistent entity, naming it and listing defined entities", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [{ id: "a", name: "A" }],
      relationships: [{ from: "a", to: "ghost" }],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("relationships.0.to"), `expected relationships.0.to in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("ghost")), "error should name the missing entity");
    assert.ok(messages.some((m) => m.includes("a")), "error should list the defined entities");
  });

  test("rejects an invalid cardinality, listing the allowed values", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b", fromCardinality: "exactly-two" }],
    });
    assert.equal(result.ok, false);
    const messages = errorMessages(result);
    assert.ok(
      messages.some((m) => m.includes("one") && m.includes("zero-or-one") && m.includes("many") && m.includes("zero-or-many")),
      "error should list the four allowed cardinalities",
    );
  });

  test("accepts all four cardinalities on both ends", () => {
    const cards = ["one", "zero-or-one", "many", "zero-or-many"];
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: cards.map((c) => ({ from: "a", to: "b", fromCardinality: c, toCardinality: c })),
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("rejects a weak entity without an identifying relationship", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "w", name: "W", weak: true },
        { id: "a", name: "A" },
      ],
      relationships: [{ from: "a", to: "w" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("entities.0.weak"), `expected entities.0.weak in ${JSON.stringify(paths)}`);
  });

  test("accepts a weak entity with an identifying relationship (from side)", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "w", name: "W", weak: true },
      ],
      relationships: [{ from: "a", to: "w", identifying: true }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("accepts a weak entity with an identifying relationship (to side)", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "w", name: "W", weak: true },
      ],
      relationships: [{ from: "w", to: "a", identifying: true }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("accepts a non-weak entity with no identifying relationship", () => {
    const result = validateErSpec({
      type: "er",
      version: "1",
      entities: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      relationships: [{ from: "a", to: "b" }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });
});
