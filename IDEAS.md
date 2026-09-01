# Feature ideas & improvement proposals

A running pool of features and improvements considered for `architecture-diagrams`,
grouped by theme. This is **not** the ROADMAP (which tracks committed, sequenced
work) -- it is the broader idea pool we draw from when choosing the next step.

Status: 💡 idea · 🟢 proposed (agreed worth doing) · 🔵 in progress · ✅ done

## Diagram families (the multi-engine foundation makes these cheap)

The v0.5 multi-engine foundation (a thin `DiagramEngine` interface + registry + CLI
dispatch, reusing the shared ELK layout / theme / SVG / export infra) turns "add a
diagram family" from a big project into a bounded task: schema + layout + render.
That is the main reason the items below are now realistic.

- ✅ **C4 diagrams** (System Context / Container / Component) -- the de-facto
  standard for software architecture; fits the core use case and reuses a lot of
  what we already have. Implemented in v0.6. Spec: `architecture-diagrams/reference/c4-spec.md`.
- ✅ **UML sequence** -- the most-requested UML diagram after class; complements the
  class engine. Implemented in v0.11. Spec: `architecture-diagrams/reference/uml-sequence-spec.md`.
- ✅ **ER (entity-relationship)** -- sibling of the class diagram; reuses boxes with
  attributes + relationships. Implemented in v0.13. Spec: `architecture-diagrams/reference/er-spec.md`.
- ✅ **Timeline / roadmap** -- phased execution plans with gates and phases;
  reuses the multi-engine foundation. Implemented in v0.14. Spec:
  `architecture-diagrams/reference/timeline-spec.md`.
- 💡 **UML state / activity / use case** -- already in the ROADMAP backlog.

### ER: known gaps (from stress-test `examples/er/stress/`)

Identified 2026-08-27 by rendering 11 adversarial specs against the v0.13 ER
engine. One real defect was found and fixed (parallel-edge label pills
overlapping); the rest were verified non-findings or accepted as-is. Full
write-up: `docs/stress-er.md`.

- ✅ **Parallel-edge label pills overlapped** (MEDIUM) -- FIXED: `buildErElkGraph`
  gave ELK no label size, so edges between the same pair of entities were stacked
  24px apart while the pills (60-100px wide) collided. The layout now passes the
  label size to ELK (which spaces the edges apart and reserves a box per label)
  and the renderer draws each pill at ELK's reserved box -- mirroring the
  architecture engine. Regression tests in `tests/er-layout.test.ts` and
  `tests/er-render.test.ts`.
- 💡 **Weak-entity divider pokes past the inner border** (LOW) -- accepted: the
  name/attribute divider line spans the full box width, so it crosses the 4px
  inset double border. Same color as the border, visually negligible; not worth a
  special-case clip.

### UML sequence: known gaps (from stress-test `examples/uml/stress/`)

Identified 2026-08-27 by rendering 8 adversarial specs against the v0.11 sequence
engine. Three were fixed in v0.11 (fragment tab clamped to its box, self-message
label width reserved in the canvas, actor column width proportional to the name);
the two remaining gaps were fixed afterwards (label backgrounds, LIFO activation
matching + side-by-side bars). Full write-up: `docs/stress-uml-sequence.md`.

- ✅ **Message labels cross intermediate lifelines** (LOW) -- FIXED: every message
  label is drawn on a canvas-colored rect, so dashed lifelines no longer pierce
  the text (works in SVG, PNG and PDF; `paint-order` was not an option because
  resvg does not support it).
- ✅ **Activation bars assume LIFO nesting** (LOW) -- FIXED: a reply now closes the
  *most recent* still-open call from the same pair (LIFO stack), and bars on the
  same lifeline that overlap vertically are drawn side by side (offset per overlap
  level) with a render warning naming the participant and messages involved.

## Interoperability

- ✅ **Import Mermaid** -- parse Mermaid → our spec → render. Directly serves the
  "better than Mermaid" motivation: people with existing Mermaid diagrams can
  "upgrade" them. Implemented in v0.12 (flowchart/graph only). Spec:
  `architecture-diagrams/reference/mermaid-import-spec.md`.
- 💡 **Export to draw.io / Excalidraw** -- manually editable output (ROADMAP backlog).
- ✅ **MCP server** -- a thin layer over the same engine, to work in AI clients
  besides Claude Code (shipped as ROADMAP **v0.8**; low effort, high reach).

## AI-native features (the real differentiator)

- ✅ **Codebase → diagram** -- analyze a repo, detect the stack (`package.json`,
  `docker-compose`, k8s, ...), and auto-generate the diagram with the right icons.
  Implemented in v0.9. Spec: `architecture-diagrams/reference/detect-spec.md`.
- 💡 **Natural language → diagram** -- describe the system in prose, get a spec.
  (Largely covered already: the skill + MCP server let the AI write the spec
  directly from prose.)
- 🟢 **Consistency / validation** -- check the diagram against the real code
  ("you listed Redis but I don't see `redis` in the dependencies"). Chosen as
  the next feature (v0.10): it is the inverse of v0.9's detect and reuses
  `analyzeCodebase()` + `TECH_MAPPING`. Plan:
  `docs/discovery-consistency-validation.md`.

### Codebase → diagram: known gaps (from stress-test `examples/detect-stress/`)

Identified 2026-08-21 by running the detector against a repo that exercises every
source at once (monorepo + compose + k8s + Dockerfile + CI). Ordered by severity.

- ✅ **Node deduplication** (HIGH) -- when the same service name appears in a
  monorepo workspace, a compose service, *and* a k8s Deployment, the draft spec
  emitted three separate nodes (`api`, `api_2`, `api_3`). Now `buildSpec` merges
  them into a single node: ownership prefers the richest source present (k8s
  Deployment > compose > workspace) so the icon reflects the most specific evidence,
  and the compose/k8s variants no longer emit duplicate `api_2`/`api_3` nodes even
  when there is *no* workspace (the case that was still broken). The `detected`
  array still lists all sources for traceability. Implemented 2026-08-22; tests in
  `tests/detect.test.ts` + fixture `tests/fixtures/detect/compose-k8s-dup/`.
- ✅ **Runtime node context** (MEDIUM) -- the Dockerfile `FROM` no longer produces a
  standalone `runtime` node when the app node already carries the same runtime icon
  (option (b): suppressed as redundant). Implemented in v0.9 (`buildSpec` step 7).
- ✅ **Semantic edge inference** (MEDIUM) -- the detector only emits
  high-confidence edges (compose `depends_on`, k8s Ingress→Service→Deployment,
  app→datastore). It does not infer *semantic* edges like `web → api` (HTTP call)
  or `api → broker` (producer). This is by design (LLM territory), but the
  `detected` array now carries a `suggestsEdge` hint (e.g. `nextjs` → `api`) to
  help the LLM. Implemented 2026-08-21.
- ✅ **Runtime redundancy** (MEDIUM) -- when the same runtime is detected via
  Dockerfile, k8s container image, *and* compose image, the `detected` array
  lists it three times (e.g. `nodejs` ×3). The `detected` array now deduplicates
  by `tech` and merges the `source` strings, keeping the highest confidence.
  Implemented 2026-08-21.
- 💡 **CI node context** (LOW) -- the CI node is standalone. It could be grouped
  with the app or annotated with the CI system's role (build/deploy).
- 💡 **Unknown image warning visibility** (LOW) -- an unrecognized compose image
  (e.g. `mycompany/proprietary-service`) falls back to a generic icon with a
  warning in the `detected` array, but the rendered diagram gives no visual cue
  that this node is "unrecognized". A dashed border or a "?" badge would help.

## Quality / polish

- 💡 **SVG accessibility** -- `<title>`/`<desc>` + color-contrast checking
  (ROADMAP backlog).
- 💡 **Custom / brand themes** -- company colors, logo, more themes.
- 💡 **Interactive HTML export** -- hover/click to highlight connections.
- 💡 **Visual diagram diff** -- compare two specs (great for PRs; we already have the
  byte-identical gate pattern to build on).

## Suggested next (updated 2026-08-27)

The original "next 3" are all shipped (C4 in v0.6, MCP in v0.8, codebase →
diagram in v0.9). Current shortlist, in rough order of strategic value:

1. **Consistency / validation** -- shipped in v0.10 (see
   `docs/discovery-consistency-validation.md`).
2. **Import Mermaid (flowchart)** -- ✅ shipped in v0.12 (the "better than
   Mermaid" adoption story; flowchart/graph only).
3. **UML sequence** -- ✅ done in v0.11 (was the biggest engineering lift:
   new lifeline/time-axis layout).
4. **ER diagram** -- ✅ shipped in v0.13 (cheapest new engine, sibling of uml-class).
