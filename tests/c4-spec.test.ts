import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateC4Spec } from "../src/engines/c4/index.js";

type Result = ReturnType<typeof validateC4Spec>;

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
  type: "c4",
  version: "1",
  elements: [{ id: "a", name: "A", type: "person" }],
};

describe("c4 spec validation", () => {
  test("accepts a minimal valid spec", () => {
    const result = validateC4Spec(base);
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("applies defaults for level, theme, direction and relationships", () => {
    const result = validateC4Spec(base);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.spec.level, "context");
    assert.equal(result.spec.theme, "clean-light");
    assert.equal(result.spec.direction, "auto");
    assert.deepEqual(result.spec.relationships, []);
  });

  test("requires the type discriminator", () => {
    assert.equal(
      validateC4Spec({ type: "architecture", version: "1", elements: base.elements }).ok,
      false,
    );
    assert.equal(validateC4Spec({ version: "1", elements: base.elements }).ok, false);
  });

  test("requires version '1' as a string", () => {
    assert.equal(validateC4Spec({ type: "c4", version: 1, elements: base.elements }).ok, false);
    assert.equal(validateC4Spec({ type: "c4", version: "2", elements: base.elements }).ok, false);
  });

  test("rejects an empty elements array", () => {
    const result = validateC4Spec({ type: "c4", version: "1", elements: [] });
    assert.equal(result.ok, false);
  });

  test("rejects a duplicate element id with the field path", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "a", name: "A", type: "person" },
        { id: "a", name: "A2", type: "system" },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("elements.1.id"), `expected elements.1.id in ${JSON.stringify(paths)}`);
  });

  test("rejects a relationship pointing at a nonexistent element, naming it", () => {
    const toGhost = validateC4Spec({
      ...base,
      relationships: [{ from: "a", to: "ghost" }],
    });
    let paths = errorPaths(toGhost);
    let messages = errorMessages(toGhost);
    assert.ok(paths.includes("relationships.0.to"), `expected relationships.0.to in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("ghost")), "error should name the missing element");

    const fromGhost = validateC4Spec({
      ...base,
      relationships: [{ from: "ghost", to: "a" }],
    });
    paths = errorPaths(fromGhost);
    assert.ok(paths.includes("relationships.0.from"), `expected relationships.0.from in ${JSON.stringify(paths)}`);
  });

  test("rejects a self-relationship", () => {
    const result = validateC4Spec({
      ...base,
      relationships: [{ from: "a", to: "a" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.some((p) => p.startsWith("relationships.0")), `expected a relationships.0.* path in ${JSON.stringify(paths)}`);
  });

  test("rejects a person with a group", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "app", name: "App", type: "system" },
        { id: "user", name: "User", type: "person", group: "app" },
      ],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("elements.1.group"), `expected elements.1.group in ${JSON.stringify(paths)}`);
    assert.ok(
      messages.some((m) => m.includes("person") && m.includes("nested")),
      "error should say people are never nested",
    );
  });

  test("rejects nesting inside a non system/container parent", () => {
    for (const parentType of ["component", "external-system", "person"] as const) {
      const result = validateC4Spec({
        type: "c4",
        version: "1",
        elements: [
          { id: "parent", name: "P", type: parentType },
          { id: "child", name: "C", type: "container", group: "parent" },
        ],
      });
      const messages = errorMessages(result);
      assert.ok(
        messages.some((m) => m.includes("only system and container")),
        `expected a nesting error for ${parentType} parent: ${JSON.stringify(messages)}`,
      );
    }
  });

  test("rejects a group reference to a nonexistent element", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [{ id: "child", name: "C", type: "container", group: "ghost" }],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("elements.0.group"), `expected elements.0.group in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("ghost")), "error should name the missing group");
  });

  test("accepts a container grouped into a system", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "app", name: "App", type: "system" },
        { id: "api", name: "API", type: "container", group: "app" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("accepts a component grouped into a container", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "app", name: "App", type: "system" },
        { id: "api", name: "API", type: "container", group: "app" },
        { id: "auth", name: "Auth", type: "component", group: "api" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("rejects a parent cycle", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "a", name: "A", type: "system", group: "b" },
        { id: "b", name: "B", type: "system", group: "a" },
      ],
    });
    const messages = errorMessages(result);
    assert.ok(messages.some((m) => m.includes("cycle")), `expected a cycle error: ${JSON.stringify(messages)}`);
  });

  test("accepts all five element types", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [
        { id: "p", name: "P", type: "person" },
        { id: "s", name: "S", type: "system" },
        { id: "e", name: "E", type: "external-system" },
        { id: "c", name: "C", type: "container" },
        { id: "m", name: "M", type: "component" },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("rejects an unknown element type", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [{ id: "d", name: "D", type: "database" }],
    });
    const messages = errorMessages(result);
    assert.ok(
      messages.some((m) => m.includes("person") && m.includes("component")),
      "error should list the allowed types",
    );
  });

  test("accepts all three levels and rejects an unknown one", () => {
    for (const level of ["context", "container", "component"] as const) {
      const result = validateC4Spec({ ...base, level });
      assert.equal(result.ok, true, `expected level "${level}" to be accepted`);
    }
    assert.equal(validateC4Spec({ ...base, level: "module" }).ok, false);
  });

  test("accepts a valid icon key on an element", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "A", type: "system", icon: "brand:nodejs" }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("accepts a file: icon reference", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "A", type: "system", icon: "file:./logo.svg" }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("rejects a malformed icon key, naming the field", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "A", type: "system", icon: "not a valid key" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("elements.0.icon"), `expected elements.0.icon in ${JSON.stringify(paths)}`);
  });

  test("accepts every status value on elements and relationships", () => {
    for (const status of ["active", "deprecated", "suspended", "planned"] as const) {
      const el = validateC4Spec({
        type: "c4",
        version: "1",
        elements: [{ id: "a", name: "A", type: "system", status }],
      });
      assert.equal(el.ok, true, `expected element status "${status}" to be accepted`);

      const rel = validateC4Spec({
        type: "c4",
        version: "1",
        elements: [
          { id: "a", name: "A", type: "system" },
          { id: "b", name: "B", type: "system" },
        ],
        relationships: [{ from: "a", to: "b", status }],
      });
      assert.equal(rel.ok, true, `expected relationship status "${status}" to be accepted`);
    }
  });

  test("rejects an unknown status, listing the allowed values", () => {
    const result = validateC4Spec({
      type: "c4",
      version: "1",
      elements: [{ id: "a", name: "A", type: "system", status: "retired" }],
    });
    const messages = errorMessages(result);
    assert.ok(
      messages.some((m) => m.includes("active") && m.includes("planned")),
      `error should list the allowed statuses: ${JSON.stringify(messages)}`,
    );
  });

  test("applies the wrap.maxLines default of 4", () => {
    const result = validateC4Spec(base);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.spec.wrap.maxLines, 4);
  });

  test("accepts an explicit wrap.maxLines and rejects out-of-range values", () => {
    assert.equal(validateC4Spec({ ...base, wrap: { maxLines: 1 } }).ok, true);
    assert.equal(validateC4Spec({ ...base, wrap: { maxLines: 12 } }).ok, true);
    assert.equal(validateC4Spec({ ...base, wrap: { maxLines: 0 } }).ok, false);
    assert.equal(validateC4Spec({ ...base, wrap: { maxLines: 13 } }).ok, false);
    assert.equal(validateC4Spec({ ...base, wrap: { maxLines: 2.5 } }).ok, false);
  });
});
