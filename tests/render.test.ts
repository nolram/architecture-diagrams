import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadSpecFromText } from "../src/spec/index.js";
import { layoutSpec } from "../src/layout/index.js";
import { composeDiagram } from "../src/render/index.js";

async function renderYaml(yaml: string) {
  const parsed = loadSpecFromText(yaml);
  assert.equal(parsed.ok, true, parsed.ok ? undefined : JSON.stringify(parsed.errors));
  if (!parsed.ok) throw new Error("unreachable");
  const layout = await layoutSpec(parsed.spec);
  return composeDiagram(parsed.spec, layout);
}

describe("compose (spec -> layout -> svg)", () => {
  test("gera um SVG válido sem avisos para ícones conhecidos", async () => {
    const { svg, warnings } = await renderYaml(`
version: '1'
title: Diagrama de Teste
nodes:
  - id: web
    label: Web Server
    icon: aws:lambda
    category: compute
  - id: db
    label: PostgreSQL
    icon: brand:postgresql
    category: database
edges:
  - from: web
    to: db
    label: SQL
`);
    assert.deepEqual(warnings, []);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
    assert.ok(svg.includes("Diagrama de Teste"));
    assert.ok(svg.includes("Web Server"));
    assert.ok(svg.includes("PostgreSQL"));
    assert.ok(svg.includes("SQL"));
  });

  test("ícone desconhecido gera aviso mas ainda produz um SVG com fallback", async () => {
    const { svg, warnings } = await renderYaml(`
version: '1'
nodes:
  - id: a
    label: Serviço Estranho
    icon: aws:nao-existe
edges: []
`);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /aws:nao-existe/);
    assert.ok(svg.includes("Serviço Estranho"));
    assert.ok(svg.includes(">S<"), "deveria conter o badge de fallback com a inicial do label");
  });

  test("escapa texto de label para não quebrar o SVG", async () => {
    const { svg } = await renderYaml(`
version: '1'
nodes:
  - id: a
    label: "<script>alert(1)</script>"
edges: []
`);
    assert.ok(!svg.includes("<script>"));
    assert.ok(svg.includes("&lt;script&gt;"));
  });
});
