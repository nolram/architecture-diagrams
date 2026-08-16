import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateSpec } from "../src/spec/index.js";
import { getTheme } from "../src/render/theme.js";
import { shouldShowLegend, computeLegendEntries, renderLegend } from "../src/render/legend.js";

function specOrThrow(raw: unknown) {
  const result = validateSpec(raw);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  if (!result.ok) throw new Error("unreachable");
  return result.spec;
}

const theme = getTheme("clean-light");

describe("legend", () => {
  test("não mostra legenda quando não há variedade de cor suficiente", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", category: "compute" },
        { id: "b", label: "B", category: "compute" },
      ],
    });
    assert.equal(shouldShowLegend(spec), false);
  });

  test("mostra legenda com 3+ categorias distintas mesmo sem groups", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", category: "compute" },
        { id: "b", label: "B", category: "database" },
        { id: "c", label: "C", category: "network" },
      ],
    });
    assert.equal(shouldShowLegend(spec), true);
  });

  test("mostra legenda com 2+ estilos de group distintos mesmo com poucas categorias", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", group: "g1" },
        { id: "b", label: "B", group: "g2" },
      ],
      groups: [
        { id: "g1", label: "G1", style: "vpc" },
        { id: "g2", label: "G2", style: "subnet" },
      ],
    });
    assert.equal(shouldShowLegend(spec), true);
  });

  test("computeLegendEntries deduplica e preserva a ordem de primeira aparição (groups antes de categories)", () => {
    const spec = specOrThrow({
      version: "1",
      nodes: [
        { id: "a", label: "A", category: "compute", group: "g1" },
        { id: "b", label: "B", category: "compute" },
        { id: "c", label: "C", category: "database" },
      ],
      groups: [{ id: "g1", label: "G1", style: "vpc" }],
    });
    const entries = computeLegendEntries(spec, theme);
    assert.deepEqual(
      entries.map((e) => e.label),
      ["VPC", "Computação", "Banco de dados"],
    );
    assert.equal(entries[0].color, theme.groupStyles.vpc.stroke);
    assert.equal(entries[1].color, theme.categoryColors.compute);
  });

  test("renderLegend quebra linha quando excede a largura máxima", () => {
    const entries = [
      { color: "#111", label: "Categoria Bem Comprida Um" },
      { color: "#222", label: "Categoria Bem Comprida Dois" },
      { color: "#333", label: "Categoria Bem Comprida Três" },
    ];
    const wide = renderLegend(entries, 2000, theme);
    const narrow = renderLegend(entries, 150, theme);
    assert.ok(wide.height < narrow.height, "com mais largura disponível deveria caber em menos linhas (altura menor)");
  });

  test("renderLegend com lista vazia não desenha nada", () => {
    const result = renderLegend([], 1000, theme);
    assert.equal(result.svg, "");
    assert.equal(result.height, 0);
  });
});
