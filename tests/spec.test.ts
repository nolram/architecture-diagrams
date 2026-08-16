import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadSpecFromText, validateSpec } from "../src/spec/index.js";

function errorPaths(result: ReturnType<typeof validateSpec>): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.path);
}

describe("spec validation", () => {
  test("accepts a minimal valid spec and applies defaults", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.spec.theme, "clean-light");
    assert.equal(result.spec.direction, "auto");
    assert.equal(result.spec.nodes[0].category, "generic");
    assert.equal(result.spec.nodes[0].shape, "card");
    assert.deepEqual(result.spec.groups, []);
    assert.deepEqual(result.spec.edges, []);
  });

  test("icon field accepts a catalog key and 'file:<path>.svg'", () => {
    const catalogKey = validateSpec({ version: "1", nodes: [{ id: "a", label: "A", icon: "aws:lambda" }] });
    assert.equal(catalogKey.ok, true);

    const fileIcon = validateSpec({ version: "1", nodes: [{ id: "a", label: "A", icon: "file:./assets/logo.svg" }] });
    assert.equal(fileIcon.ok, true);

    const missingExtension = validateSpec({ version: "1", nodes: [{ id: "a", label: "A", icon: "file:./assets/logo" }] });
    assert.equal(missingExtension.ok, false);

    const malformed = validateSpec({ version: "1", nodes: [{ id: "a", label: "A", icon: "not-a-valid-icon-key" }] });
    assert.equal(malformed.ok, false);
  });

  test("accepts a full spec with nested groups and edges", () => {
    const result = validateSpec({
      version: "1",
      title: "Test",
      nodes: [
        { id: "web", label: "Web", group: "vpc" },
        { id: "db", label: "DB", group: "private" },
      ],
      groups: [
        { id: "vpc", label: "VPC", style: "vpc" },
        { id: "private", label: "Private", style: "subnet", parent: "vpc" },
      ],
      edges: [{ from: "web", to: "db", label: "SQL" }],
    });
    assert.equal(result.ok, true);
  });

  test("rejects a duplicate node id", () => {
    const result = validateSpec({
      version: "1",
      nodes: [
        { id: "a", label: "A" },
        { id: "a", label: "A2" },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.some((p) => p === "nodes.1.id"));
  });

  test("rejects a node and a group sharing the same id (shared namespace)", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "shared", label: "A" }],
      groups: [{ id: "shared", label: "G" }],
    });
    errorPaths(result);
  });

  test("rejects an edge pointing at a nonexistent node", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
      edges: [{ from: "a", to: "ghost" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("edges.0.to"));
  });

  test("rejects node.group pointing at a nonexistent group", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A", group: "ghost" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("nodes.0.group"));
  });

  test("rejects group.parent pointing at a nonexistent group", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
      groups: [{ id: "g", label: "G", parent: "ghost" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("groups.0.parent"));
  });

  test("rejects a group that is its own parent", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
      groups: [{ id: "g", label: "G", parent: "g" }],
    });
    errorPaths(result);
  });

  test("rejects a parent cycle between groups", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
      groups: [
        { id: "g1", label: "G1", parent: "g2" },
        { id: "g2", label: "G2", parent: "g1" },
      ],
    });
    errorPaths(result);
  });

  test("rejects a spec with no nodes", () => {
    const result = validateSpec({ version: "1", nodes: [] });
    assert.equal(result.ok, false);
  });

  test("loadSpecFromText reports a malformed YAML error without throwing", () => {
    const result = loadSpecFromText("version: '1'\nnodes: [this is not: valid: yaml");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors[0].message.toLowerCase().includes("yaml"));
  });
});
