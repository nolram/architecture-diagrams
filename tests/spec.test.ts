import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadSpecFromText, validateSpec } from "../src/spec/index.js";

function errorPaths(result: ReturnType<typeof validateSpec>): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.path);
}

describe("spec validation", () => {
  test("aceita uma spec mínima válida e aplica defaults", () => {
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

  test("aceita uma spec completa com groups aninhados e edges", () => {
    const result = validateSpec({
      version: "1",
      title: "Teste",
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

  test("rejeita id de node duplicado", () => {
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

  test("rejeita node e group com o mesmo id (namespace compartilhado)", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "shared", label: "A" }],
      groups: [{ id: "shared", label: "G" }],
    });
    errorPaths(result);
  });

  test("rejeita edge apontando para node inexistente", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
      edges: [{ from: "a", to: "ghost" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("edges.0.to"));
  });

  test("rejeita node.group apontando para group inexistente", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A", group: "ghost" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("nodes.0.group"));
  });

  test("rejeita group.parent apontando para group inexistente", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
      groups: [{ id: "g", label: "G", parent: "ghost" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("groups.0.parent"));
  });

  test("rejeita group que é parent de si mesmo", () => {
    const result = validateSpec({
      version: "1",
      nodes: [{ id: "a", label: "A" }],
      groups: [{ id: "g", label: "G", parent: "g" }],
    });
    errorPaths(result);
  });

  test("rejeita ciclo de parent entre groups", () => {
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

  test("rejeita spec sem nenhum node", () => {
    const result = validateSpec({ version: "1", nodes: [] });
    assert.equal(result.ok, false);
  });

  test("loadSpecFromText reporta erro de YAML malformado sem lançar exceção", () => {
    const result = loadSpecFromText("version: '1'\nnodes: [this is not: valid: yaml");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors[0].message.toLowerCase().includes("yaml"));
  });
});
