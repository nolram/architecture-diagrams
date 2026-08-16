import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolveIcon, fallbackBadge, getCatalogEntry, findSimilarKeys } from "../src/icons/index.js";

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
});
