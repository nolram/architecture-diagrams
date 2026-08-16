import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveIcon, fallbackBadge, getCatalogEntry, findSimilarKeys, searchCatalog, ICON_CATALOG } from "../src/icons/index.js";

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url)) + "/fixtures";

describe("icon resolution", () => {
  test("resolves a brand icon (thesvg) with its own color", async () => {
    const result = await resolveIcon("aws:lambda");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.icon.body.length > 0);
    assert.ok(result.icon.brandHex, "brand icon should carry a brandHex");
    assert.match(result.icon.brandHex!, /^#[0-9A-Fa-f]{6}$/);
  });

  test("uses the brand icon's real viewBox, not a fixed value (regression: cropped logos)", async () => {
    // AWS/Azure/GCP use a 64x64 canvas by convention, but generic brand logos
    // (postgres, redis, mongo...) have very different native viewBoxes.
    // Assuming "0 0 64 64" for everyone cropped those logos into an
    // unrecognizable fragment of the top-left corner -- a real bug found in production.
    const cases: [string, string][] = [
      ["brand:postgresql", "0 0 432.071 445.383"],
      ["brand:redis", "0 0 256 220"],
      ["brand:mongodb", "0 0 120 257"],
      ["brand:kafka", "-78.5 0 413 413"],
    ];
    for (const [key, expectedViewBox] of cases) {
      const result = await resolveIcon(key);
      assert.equal(result.ok, true, `${key} should resolve`);
      if (!result.ok) continue;
      assert.equal(result.icon.viewBox, expectedViewBox, `${key} should use its native viewBox`);
      assert.notEqual(result.icon.viewBox, "0 0 64 64", `${key} should not fall back to the generic 64x64`);
    }
  });

  test("icons with a variant don't use the white-on-white version (regression: invisible badges)", async () => {
    // Some thesvg logos only have a white/transparent default version, meant
    // to sit on a dark/colored background -- invisible on our white badge.
    // Found via a visual review of the whole catalog: they resolved "ok" but
    // showed up blank in the diagram. Each of these has `variant: "mono"` in
    // the catalog, pointing at a single-color silhouette instead.
    const keys = ["brand:mysql", "brand:vercel", "brand:nextjs", "brand:angular", "brand:flask", "brand:rust", "brand:go", "brand:php"];
    for (const key of keys) {
      const entry = getCatalogEntry(key)!;
      assert.ok(entry.variant, `${key} should have a variant configured in the catalog`);

      const result = await resolveIcon(key);
      assert.equal(result.ok, true, `${key} should resolve`);
      if (!result.ok) continue;
      assert.ok(
        !/fill="#f{3,6}"/i.test(result.icon.body),
        `${key}: body still contains a white fill (would be invisible on a white badge)`,
      );
    }
  });

  test("resolves a generic icon (mdi) and applies the given accent color", async () => {
    const result = await resolveIcon("generic:database", "#2563eb");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.icon.body.includes("#2563eb"));
    assert.ok(!result.icon.body.includes("currentColor"), "currentColor should have been substituted");
    assert.equal(result.icon.brandHex, undefined, "a generic icon should not have a brandHex");
  });

  test("a key outside the catalog returns ok:false with suggestions", async () => {
    const result = await resolveIcon("aws:this-service-does-not-exist");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.key, "aws:this-service-does-not-exist");
    assert.ok(Array.isArray(result.suggestions));
  });

  test("getCatalogEntry / findSimilarKeys see the real catalog", () => {
    assert.ok(getCatalogEntry("aws:lambda"));
    assert.equal(getCatalogEntry("does:not-exist"), undefined);
    const suggestions = findSimilarKeys("aws:lambda");
    assert.ok(suggestions.includes("aws:lambda"));
  });

  test("fallbackBadge uses the label's uppercase initial", () => {
    const badge = fallbackBadge("weird service", "#e11d48");
    assert.ok(badge.body.includes(">W<"));
    assert.equal(badge.viewBox, "0 0 64 64");
  });

  test("every thesvg icon in the catalog resolves with a numerically sane viewBox", async () => {
    const thesvgEntries = ICON_CATALOG.filter((e) => e.source === "thesvg");
    assert.ok(thesvgEntries.length > 0);
    for (const entry of thesvgEntries) {
      const result = await resolveIcon(entry.key);
      assert.equal(result.ok, true, `${entry.key} should resolve`);
      if (!result.ok) continue;
      const parts = result.icon.viewBox.trim().split(/\s+/).map(Number);
      assert.equal(parts.length, 4, `${entry.key}: viewBox "${result.icon.viewBox}" should have 4 numbers`);
      assert.ok(parts.every((n) => Number.isFinite(n)), `${entry.key}: viewBox "${result.icon.viewBox}" has a non-numeric value`);
      assert.ok(parts[2] > 0 && parts[3] > 0, `${entry.key}: viewBox "${result.icon.viewBox}" has a non-positive width/height`);
    }
  });

  describe("searchCatalog", () => {
    test("matches by key substring", () => {
      const results = searchCatalog("postgres");
      assert.ok(results.some((e) => e.key === "brand:postgresql"));
    });

    test("matches by label substring (case-insensitive)", () => {
      const results = searchCatalog("KUBERNETES");
      assert.ok(results.some((e) => e.key === "brand:kubernetes"));
    });

    test("matches by full category", () => {
      const results = searchCatalog("messaging");
      assert.ok(results.length > 0);
      assert.ok(results.every((e) => e.category === "messaging"));
    });

    test("a term with no match returns an empty list", () => {
      assert.deepEqual(searchCatalog("xyz-no-match-at-all"), []);
    });

    test("the catalog has the expected minimum coverage (regression against the expanded set)", () => {
      assert.ok(ICON_CATALOG.length >= 150, `catalog shrank to ${ICON_CATALOG.length} entries`);
    });
  });

  describe("custom icon (file:...)", () => {
    test("resolves a valid local SVG and preserves its original viewBox", async () => {
      const result = await resolveIcon("file:./custom-icon.svg", undefined, FIXTURES_DIR);
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.icon.viewBox, "0 0 48 48");
      assert.ok(result.icon.body.includes("#ff6b35"));
    });

    test("rejects an SVG containing <script>/an event handler entirely, without trying to sanitize it partially", async () => {
      const result = await resolveIcon("file:./malicious-icon.svg", undefined, FIXTURES_DIR);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.match(result.reason!, /rejected/i);
    });

    test("a missing file fails with a clear reason instead of throwing", async () => {
      const result = await resolveIcon("file:./does-not-exist.svg", undefined, FIXTURES_DIR);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.match(result.reason!, /not found/i);
    });

    test("without a baseDir, it fails with a reason explaining why (instead of trying an arbitrary path)", async () => {
      const result = await resolveIcon("file:./custom-icon.svg");
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.match(result.reason!, /base directory/i);
    });
  });
});
