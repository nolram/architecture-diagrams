# Stress test: ER engine

**Status:** All findings resolved — 1 real defect fixed in v0.13 (parallel-edge label pills overlapped); the rest were verified non-findings or accepted as-is. See `IDEAS.md` → "ER: known gaps".
**Date:** 2026-08-27
**Version:** v0.13
**Source:** post-implementation stress pass on the new `er` engine (shipped in v0.13)

---

## 1. Why a stress pass

The unit tests (`tests/er-{spec,layout,render}.test.ts`) verify behavior in
isolation — one entity, one relationship, one cardinality at a time. They do not
exercise the *interactions* that only appear in a realistic diagram: many
entities and dense edge routing, very long names, all 16 cardinality
combinations at once, weak-entity chains, parallel edges between the same pair,
XML-special characters, and degenerate sizes. This pass adds 11 deliberately
adversarial specs (`examples/er/stress/`) and renders each one, then inspects the
SVG for overlaps, clipping, and misalignment that conventional tests miss.

The goal was to find weaknesses *before* release, not to add features.

---

## 2. Method

For each stress spec:

1. Write a valid `type: er` spec targeting one stress dimension.
2. Render it: `npx tsx src/cli.ts examples/er/stress/<name>.yaml --png -o examples/er/stress/<name>.svg`.
3. Confirm the SVG is well-formed XML (`python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parse(sys.argv[1])" <file>`).
4. Re-run the layout and inspect coordinates for overflow, overlap, and clipping:
   - text width (chars × calibrated px) + x-offset vs box width;
   - two label pills at overlapping rectangles;
   - a route's first/last segment shorter than the crow's-foot marker extent
     (the shortened line would overshoot the first bend and cross the marker);
   - a route's interior points landing inside a foreign entity box;
   - raw `&`/`<`/`>` in text nodes (would be invalid XML).

All 11 specs render (exit 0) and produce well-formed XML. The findings below are
visual/semantic, not crashes.

---

## 3. Stress specs

| File | Dimension stressed |
|---|---|
| `many-entities.yaml` | 16 entities, 21 relationships, mixed cardinalities — ELK layout density + edge routing |
| `long-names.yaml` | entity names of 40+ chars, attribute names/types of 50+ chars (with and without `key`) — width estimation in `geometry.ts` vs actual Noto Sans text |
| `all-cardinalities.yaml` | all 16 from×to cardinality combinations — every crow's-foot marker geometry variant at both ends |
| `weak-chain.yaml` | a chain of two weak entities (A→W1, W1→W2 identifying) plus a weak entity with TWO identifying relationships — the weak-entity rule + double-border rendering with attributes |
| `parallel-edges.yaml` | 4 distinct relationships between the SAME pair of entities — ELK parallel-edge routing + label-pill collisions at midpoints |
| `special-chars.yaml` | `&`, `<`, `>`, `"`, `'`, accented/unicode chars, and a name that is pure punctuation — XML escaping |
| `dense-star.yaml` | one central entity connected to 14 others (fan-out), mixed cardinalities — marker placement when many edges leave one box boundary close together |
| `cycle.yaml` | a directed cycle A→B→C→A plus a chord A→C — ELK cycle breaking + marker direction on the back-edge |
| `degenerate-single.yaml` | a single entity with one attribute and no relationships — zero-edge layout + single-node canvas sizing |
| `degenerate-no-attrs.yaml` | two entities with NO attributes, one relationship — name-only box sizing + bare two-node layout |
| `bent-routes.yaml` | same-layer edges (B→C, D→E) + a long multi-bend back-edge (F→A) — marker-extent shortening when the first/last route segment is shorter than the marker extent (10-22px) |

---

## 4. Findings (ranked by severity at the time)

### Fixed in v0.13

- ✅ **Parallel-edge label pills overlapped** (MEDIUM). `buildErElkGraph`
  (`src/engines/er/layout.ts`) built ELK edges with **no** label, so ELK had no
  idea a pill would be drawn and stacked all edges between the same pair of
  entities on parallel lines only 24px apart. The renderer then drew each pill at
  the route midpoint with a width of `label.length × 6.2 + 12` (60-100px for the
  stress labels) — so in `parallel-edges.yaml` all four pills (68/86/99/62px wide)
  sat on the same y and overlapped each other, and in `cycle.yaml` the back-edge
  and chord pills (both centered at y≈240) overlapped. **Fix:** the layout now
  passes each label's size to ELK (`labels: [{ text, width, height }]`, using a new
  shared `erEdgeLabelSize()` in `geometry.ts`), which makes ELK space the edges
  apart and reserve a box per label; the renderer draws each pill at ELK's
  reserved box (`route.labelPosition`/`route.labelSize`) with a midpoint fallback.
  This mirrors the architecture engine, which already solved the identical problem
  (`src/layout/build-graph.ts:78-89` + `src/render/edges.ts:52-63`). After the fix,
  all 11 specs' committed SVGs have zero overlapping pills.

### Verified OK (non-findings)

- **Text overflow** (`long-names.yaml`): box width and text share the same
  calibrated per-char constants (`ER_NAME_CHAR_WIDTH`/`ER_ATTRIBUTE_CHAR_WIDTH`),
  and the estimator adds `ER_BOX_PAD_X × 2` headroom, so no attribute or name runs
  past its box. Confirmed by measuring the longest attribute's right edge against
  the box width (positive margin in every case).
- **Marker overshoot on bent routes** (`bent-routes.yaml`, the suspected bug):
  ELK's orthogonal routing keeps every first/last segment longer than the
  crow's-foot marker extent (10-22px), so the shortened line never overshoots the
  first/last bend. Checked all edges in all specs — no segment is shorter than its
  marker extent.
- **Edges crossing entity boxes** (`many-entities.yaml`, `cycle.yaml`): no route's
  interior points land inside a foreign entity box.
- **XML escaping** (`special-chars.yaml`): `&`, `<`, `>`, `"`, `'` all correctly
  entity-encoded; `café`, `日本語`, `«»` pass through intact; the parser confirms
  well-formedness.
- **Dense star / all cardinalities** (`dense-star.yaml`, `all-cardinalities.yaml`):
  markers at both ends of every edge are placed on the correct tangent; no
  marker overlaps another.

### Accepted as-is (minor)

- **Weak-entity divider pokes past the inner border** (`weak-chain.yaml`, LOW).
  The name/attribute divider line spans the full box width, so it crosses the 4px
  inset double border. It is the same color as the border and visually negligible;
  not worth a special-case clip. Tracked in `IDEAS.md` ("ER: known gaps").

---

## 5. Follow-ups

- The one real defect (parallel-edge pill overlap) is fixed in v0.13 with
  regression tests in `tests/er-layout.test.ts` (ELK reserves non-overlapping
  label boxes) and `tests/er-render.test.ts` (rendered pills don't overlap). Both
  were verified to fail without the fix and pass with it.
- The stress specs are kept in `examples/er/stress/` as a regression corpus:
  re-render them after any layout/render change to the ER engine.
