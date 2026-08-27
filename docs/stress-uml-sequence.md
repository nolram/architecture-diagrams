# Stress test: UML sequence engine

**Status:** All findings fixed — 3 fixed in v0.11, the 2 remaining gaps fixed afterwards (label backgrounds; LIFO activation matching + side-by-side bars). See `IDEAS.md` → "UML sequence: known gaps" and `architecture-diagrams/reference/uml-sequence-spec.md` → "Label backgrounds and activation bars".
**Date:** 2026-08-27
**Version:** v0.11
**Source:** post-implementation stress pass on the new `uml-sequence` engine (shipped in v0.11)

---

## 1. Why a stress pass

The unit tests (`tests/uml-sequence-{spec,layout,render}.test.ts`) verify
behavior in isolation — one participant, one message, one fragment at a time.
They do not exercise the *interactions* that only appear in a realistic diagram:
many lifelines, long labels, fragments spanning a subset of participants,
nested activations, and degenerate sizes. This pass adds 8 deliberately
adversarial specs (`examples/uml/stress/`) and renders each one, then inspects
the SVG for overlaps, clipping, and misalignment that conventional tests miss.

The goal was to find weaknesses *before* release, not to add features.

---

## 2. Method

For each stress spec:

1. Write a valid `type: uml-sequence` spec targeting one stress dimension.
2. Render it: `npx tsx src/cli.ts examples/uml/stress/<name>.yaml -o /tmp/<name>.svg`.
3. Confirm the SVG is well-formed XML (`python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parse(sys.argv[1])" <file>`).
4. Inspect coordinates in the SVG for overflow, overlap, and clipping (label
   length × ~7px vs box width; two elements at the same coordinates; text
   crossing a lifeline; a tab wider than its box).

All 8 specs render (exit 0) and produce well-formed XML. The findings below are
visual/semantic, not crashes.

---

## 3. Stress specs

| File | Dimension stressed |
|---|---|
| `many-participants.yaml` | 8 participants (actors + objects), 13 messages crossing intermediate lifelines, long labels, long actor name in the last column |
| `deep-fragment-nesting.yaml` | 4 fragments (alt/loop/opt/par), a fragment spanning 2 of 6 participants, a very long guard label |
| `self-and-activation.yaml` | many self-messages (loopbacks), nested call/reply chains with activations on every sender |
| `special-chars.yaml` | XML-special and unicode characters in names/labels/stereotypes/guards |
| `single-actor.yaml` | degenerate minimum: one actor, one self-message, one fragment |
| `long-names.yaml` | very long participant names + stereotypes (box-width estimation) |
| `dense-reply-chain.yaml` | 10+ messages in a tight A→B→C→D→C→B→A cascade, every call activated |
| `par-fragment.yaml` | a `par` fragment with a long label + an adjacent `opt` fragment |

---

## 4. Findings (ranked by severity at the time)

### Fixed in v0.11

- ✅ **Fragment tab wider than its box** (HIGH). `render.ts` computed
  `tabWidth = text.length * 7 + 16` with no upper bound, so a long guard label
  produced a tab that ran past the fragment's right edge into neighboring columns
  (e.g. a 97-char guard → a 709px tab inside a 408px box; in `single-actor` the
  tab was 1.6× the whole canvas). **Fix:** the guard label is now truncated with
  an ellipsis to fit the box width, and the tab width is derived from the same
  padding constant (`TAB_PAD`) used for the text offset.
- ✅ **Self-message label clipped at the canvas edge** (HIGH). `layout.ts`
  reserved only `SELF_LOOP_WIDTH` (40px) for canvas width while `render.ts` drew
  the label to the right of the loop with no width accounting — a long label on a
  first-column participant was mostly invisible. **Fix:** the canvas width now
  accounts for each self-message's label (`SELF_LOOP_WIDTH + 8 + label.length * CHAR_WIDTH`).
- ✅ **Actor column width fixed at 48px** (MEDIUM). `estimateActorWidth()`
  ignored the name, so a long actor name (e.g. "Administrator") overflowed the
  stick figure and, in the last column, would clip at the canvas edge. **Fix:**
  the actor column width is now `max(ACTOR_WIDTH, name.length * CHAR_WIDTH + 16)`.

### Fixed during code review (nits)

- ✅ **Actor name crossed by its own lifeline.** The actor's name is drawn below
  the figure, but the lifeline started at the figure's bottom and ran through the
  name. **Fix:** `ACTOR_NAME_SPACE` (18px) is reserved below an actor's figure
  before its lifeline starts.
- ✅ **Validation gap: a fragment could cover a message outside its span.** A
  message whose `from`/`to` was not in the fragment's `participants` passed
  validation and rendered an arrow leaving the (narrow) box. **Fix:** validation
  now requires every covered message's endpoints to be within the fragment's
  `participants` span (new rule + test + doc).
- ✅ **O(n²) `indexOf` in the double-coverage check** and an inconsistent tab
  padding model — both cleaned up.

### Fixed after triage

- ✅ **Message labels cross intermediate lifelines** (LOW). A label is centered
  between a message's two endpoints, so a long label on a message that skips over
  other participants was drawn on top of their dashed lifelines. *Trigger:*
  `many-participants.yaml` (a 51-char label spanning 3 lifelines). **Fix:** every
  message label (self and between lifelines) is now drawn on a canvas-colored
  rect sized from the same 7px/char model, so the lines no longer pierce the
  text. A `paint-order: stroke` halo was not used because `@resvg/resvg-js`
  (PNG export) does not support it; the rect works in SVG, PNG and PDF.
- ✅ **Activation bars assume LIFO nesting** (LOW). An activation bar extended to
  the *first* later reply, so a non-LIFO spec (a reply crossing an earlier
  still-open call) made two bars on the same lifeline partially overlap, and the
  inner bar's fill covered the outer bar's border. *Trigger:*
  `self-and-activation.yaml`. **Fix:** a reply now closes the *most recent*
  still-open call from the same pair (LIFO stack), and bars on the same lifeline
  that overlap vertically are drawn side by side (offset by one bar width per
  overlap level). The renderer prints a warning naming the participant and the
  messages involved.

### Verified OK (non-findings)

- **XML escaping** (`special-chars.yaml`): `&`, `<`, `>`, `"`, `'` all correctly
  entity-encoded; `café`, `日本語`, and `«»` pass through intact; the parser
  confirms well-formedness.
- **Long participant names/stereotypes** (`long-names.yaml`): box width and text
  use the same 7px/char model, so no overflow.
- **Dense reply chains** (`dense-reply-chain.yaml`): activation extents match the
  reply rows exactly; the 32px row spacing keeps adjacent labels clear.

---

## 5. Follow-ups

- All findings are fixed. The two post-triage fixes are recorded in `IDEAS.md`
  ("UML sequence: known gaps") and described in
  `architecture-diagrams/reference/uml-sequence-spec.md` → "Label backgrounds and
  activation bars".
- The stress specs are kept in `examples/uml/stress/` as a regression corpus:
  re-render them after any layout/render change to the sequence engine.
