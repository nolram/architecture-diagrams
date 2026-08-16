import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveIcon, fallbackBadge, getCatalogEntry, findSimilarKeys, searchCatalog, ICON_CATALOG } from "../src/icons/index.js";

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url)) + "/fixtures";

describe("icon resolution", () => {
  test("resolve um ícone de marca (thesvg) com cor própria", async () => {
    const result = await resolveIcon("aws:lambda");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.icon.body.length > 0);
    assert.ok(result.icon.brandHex, "ícone de marca deveria trazer brandHex");
    assert.match(result.icon.brandHex!, /^#[0-9A-Fa-f]{6}$/);
  });

  test("resolve um ícone genérico (mdi) e aplica a cor de destaque recebida", async () => {
    const result = await resolveIcon("generic:database", "#2563eb");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.icon.body.includes("#2563eb"));
    assert.ok(!result.icon.body.includes("currentColor"), "currentColor deveria ter sido substituído");
    assert.equal(result.icon.brandHex, undefined, "ícone genérico não deveria ter brandHex");
  });

  test("chave fora do catálogo retorna ok:false com sugestões", async () => {
    const result = await resolveIcon("aws:this-service-does-not-exist");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.key, "aws:this-service-does-not-exist");
    assert.ok(Array.isArray(result.suggestions));
  });

  test("getCatalogEntry / findSimilarKeys enxergam o catálogo real", () => {
    assert.ok(getCatalogEntry("aws:lambda"));
    assert.equal(getCatalogEntry("does:not-exist"), undefined);
    const suggestions = findSimilarKeys("aws:lambda");
    assert.ok(suggestions.includes("aws:lambda"));
  });

  test("fallbackBadge usa a inicial do label em maiúscula", () => {
    const badge = fallbackBadge("weird service", "#e11d48");
    assert.ok(badge.body.includes(">W<"));
    assert.equal(badge.viewBox, "0 0 64 64");
  });

  describe("searchCatalog", () => {
    test("bate por substring da key", () => {
      const results = searchCatalog("postgres");
      assert.ok(results.some((e) => e.key === "brand:postgresql"));
    });

    test("bate por substring do label (case-insensitive)", () => {
      const results = searchCatalog("KUBERNETES");
      assert.ok(results.some((e) => e.key === "brand:kubernetes"));
    });

    test("bate por category inteira", () => {
      const results = searchCatalog("messaging");
      assert.ok(results.length > 0);
      assert.ok(results.every((e) => e.category === "messaging"));
    });

    test("termo sem match nenhum retorna lista vazia", () => {
      assert.deepEqual(searchCatalog("xyz-nao-existe-nada-parecido"), []);
    });

    test("catálogo tem cobertura mínima esperada (regressão contra o expandido)", () => {
      assert.ok(ICON_CATALOG.length >= 150, `catálogo encolheu para ${ICON_CATALOG.length} entradas`);
    });
  });

  describe("ícone customizado (file:...)", () => {
    test("resolve um SVG local válido e preserva o viewBox original", async () => {
      const result = await resolveIcon("file:./custom-icon.svg", undefined, FIXTURES_DIR);
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.icon.viewBox, "0 0 48 48");
      assert.ok(result.icon.body.includes("#ff6b35"));
    });

    test("recusa SVG com <script>/handler de evento inteiro, sem tentar sanitizar parcialmente", async () => {
      const result = await resolveIcon("file:./malicious-icon.svg", undefined, FIXTURES_DIR);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.match(result.reason!, /recusado/i);
    });

    test("arquivo inexistente falha com motivo claro em vez de lançar exceção", async () => {
      const result = await resolveIcon("file:./nao-existe.svg", undefined, FIXTURES_DIR);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.match(result.reason!, /não encontrado/i);
    });

    test("sem baseDir, falha com um motivo explicando o porquê (em vez de tentar um caminho arbitrário)", async () => {
      const result = await resolveIcon("file:./custom-icon.svg");
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.match(result.reason!, /diretório base/i);
    });
  });
});
