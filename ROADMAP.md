# Roadmap

Priorities defined to take the project beyond the current v0.1.0. The order follows technical dependency (tests before touching layout/render, since without them every visual tweak turns into manual re-validation) and visible impact, not just "what's easiest."

No fixed dates -- each phase becomes a tag (`v0.2.0`, `v0.3.0`, ...) once its items are ready, published automatically by the [release pipeline](.github/workflows/release.yml).

## v0.2 -- Robustness

Foundation for touching everything else safely.

- [x] **Icon catalog integrity test** -- `npm run validate:icons` (`scripts/validate-icon-catalog.mts`), running in CI and in the release pipeline. Verifies that every slug in `src/icons/catalog.ts` still resolves for real against `thesvg`/`@iconify-json/mdi`. Also fixed a real bug discovered in the process: `resolveIcon` let the `import()` of thesvg throw an unhandled exception when a slug didn't exist, crashing the entire render instead of falling back gracefully -- now it's under `try/catch` like the other missing-icon cases.
- [x] **Automated test suite** -- `npm test` (`node:test` via `tsx`, no new dependency). 23 tests covering `src/spec` (validation and error messages), `src/layout` (geometric containment of nested groups, orientation by `direction`), `src/icons` (thesvg/mdi/fallback resolution), and `src/render/compose` (final SVG, text escaping, degradation with a missing icon). `npm run typecheck` now also checks `tests/` via `tsconfig.tests.json`.
- [x] **Reduce edge label collisions in dense graphs** -- root cause: ELK never received the label's width/height, so it never reserved space for it during routing (which is why the pills we draw afterward, sized separately, collided). Now `build-graph.ts` reports the real size of each label to ELK (`estimateEdgeLabelSize`, shared with the renderer) and `elk.spacing.edgeLabel` gives extra breathing room; `render/edges.ts` draws the pill exactly in the box ELK reserved (top-left corner + size), instead of recomputing and centering it independently. Geometric regression test in `tests/layout.test.ts` (verified failing without the fix before committing).
- [x] **Auto-detect `direction`** -- `direction` now accepts `auto` (new default) in addition to `right`/`down`. Heuristic in `src/layout/direction.ts`: looks at the graph's largest isolated fan-out/fan-in (out-degree and in-degree counted separately, not summed) -- if any node has 3+ outgoing or incoming connections, it picks `down`; otherwise `right`. An explicit `direction` in the spec always wins. Validated against the 4 pre-existing examples (all stay `right`, no regression) and against the real e-commerce fan-out case (now `examples/ecommerce-backend.yaml`), which now picks `down` on its own without the AI needing to know the heuristic.

## v0.3 -- Visual quality

- [x] **More node shapes** -- the schema already reserved `shape: "database" | "actor"` since v0.1, but the renderer never implemented the visual differentiation (every node became the same card). Now `render/node-card.ts` dispatches by actual shape: `database` (cylinder, with elliptical caps), `actor` (no card -- circular icon + label underneath, for people/external systems), and `cloud` (cloud silhouette reusing the mdi "cloud" path, new in the schema). `layout/geometry.ts` has its own per-shape sizing. Dedicated example in `examples/node-shapes.yaml`.
- [x] **Automatic legend** -- `render/legend.ts`. Only appears when there's enough color variety to be worth explaining (2+ distinct group styles, or 3+ distinct node categories -- below that it would only add noise). One entry per group style and per category, in spec-first-appearance order, no duplicates; automatic line wrapping if it doesn't fit the canvas width. Positioned below the diagram, canvas grows to fit. Validated against the 6 existing examples -- all of them started showing a legend (evidence that most real diagrams have enough variety to benefit from it).
- [x] **Expand the icon catalog** -- from 94 to 195 entries (every slug verified against the installed `thesvg` package before being added, via `npm run validate:icons`). Covers real gaps in AWS (CI/CD, Redshift/Athena/Glue, ECR, WAF/Shield...), Azure (DevOps, Event Hubs, Synapse, Front Door...), GCP (Spanner, Firestore, Cloud Build...), and ~50 brands/languages/observability tools that showed up often in real diagrams (Django/Flask/Spring, Datadog/Sentry/PagerDuty, Auth0/Okta, etc). No existing example changed output (byte-identical rendering) -- the expansion is strictly additive.
- [x] **Icon search CLI command** -- `arch-diagram icons <term>` (matches against key/label/category). The CLI became multi-command via commander (`render` as default via `isDefault: true`, so `arch-diagram diagram.yaml` keeps working without changing any existing script/doc -- explicitly tested). Search logic in `searchCatalog()` (`src/icons/catalog.ts`), testable and reusable outside the CLI.

## v0.4 -- Integration

- [x] **PDF export** -- `--pdf` on the CLI (`src/export/pdf.ts`, via `pdfkit`). Design decision: instead of converting the SVG to PDF as vector art (risky -- our SVG uses `feDropShadow`, nested `<svg>` with viewBox and `clip-path`, which simple SVG→PDF converters tend to render incorrectly), the PDF page comes out sized exactly to the diagram (1 SVG unit = 1 PDF point) with the artwork embedded as a high-resolution PNG (`--scale`, reuses the same rasterization pipeline). Verified byte by byte: `/MediaBox` matches the SVG's width/height, embedded image matches the expected resolution at 2x.
- [x] **CLI `--watch`** -- watches the spec file's directory (not the file directly -- more robust against editors that save via atomic rename/truncate) and re-renders with debounce on every change. Verified manually end to end (editing the spec with watch running and confirming the output SVG reflects the change).
- [x] **Custom icon** -- `icon: file:./logo.svg`, resolved relative to the spec's directory. Sanitization is all-or-nothing (not partial): any `<script>`, `on*=` handler, `javascript:`, `<foreignObject>`, or `<iframe>/<embed>/<object>` rejects the whole file, falling back to the same graceful fallback badge used for a missing catalog key -- simpler to guarantee correct than trying to clean and reuse part of a potentially hostile SVG. 200KB limit. `baseDir` (the spec's directory) is now threaded through `resolveIcon`/`composeDiagram`/CLI. Verified manually with a valid SVG, a malicious one (`<script>`+`onload=`), and a non-existent path -- all three degrade correctly without an exception.

## v0.5 -- UML (multi-engine foundation + class diagrams)

First step toward supporting diagram families beyond architecture. The spec gains a
`type` field (optional, defaults to `architecture` -- fully backward-compatible) and
a thin `DiagramEngine` interface (validate → layout → render), so each diagram family
is an isolated engine that reuses the shared export (PNG/PDF), theme, SVG utils, and
icon infra. The UML class format is already specified in
`architecture-diagrams/reference/uml-class-spec.md` and
`architecture-diagrams/reference/uml-class.example.yaml`.

- [x] **Multi-engine foundation** -- `type` field in the spec + `DiagramEngine`
  interface + registry + CLI dispatch. The existing architecture pipeline is wrapped
  (not rewritten) as the `architecture` engine; all 6 examples must render
  byte-identical (regression gate) and the existing test suite stays green. Done:
  `src/engines/` (types/architecture/registry), `type` added to the schema (optional,
  default `architecture`), CLI dispatches on `type` before validation, and
  `SpecValidationResult` generalized to `SpecValidationResult<T>` so each engine
  carries its own spec shape. All 6 examples verified byte-identical; suite green.
- [x] **UML class diagram** -- `type: uml-class`. Classes with up to 3
  compartments (name / attributes / methods), stereotypes («entity», «interface»...),
  abstract classes (italic name), member visibility (+ - # ~), and the 6 UML
  relationships: association, aggregation (hollow diamond), composition (filled
  diamond), inheritance (hollow triangle), dependency (dashed + open arrow),
  realization (dashed + hollow triangle) -- with multiplicity and role labels at each
  end. ELK layered layout (inheritance flows top-down). Example in
  `architecture-diagrams/reference/uml-class.example.yaml`, tests, README + skill docs.
  Done: `src/engines/uml-class/` (schema/layout/geometry/render) reusing the shared
  ELK runner (`runElkLayout`), theme, and SVG utils; `auto` resolves to `down`;
  27 new tests (spec/layout/render); example renders all six markers, italic abstract
  name, stereotypes, and visibility symbols.

## Backlog (larger scope -- re-evaluate after the phases above)

- [ ] **MCP server** -- a thin layer on top of the same rendering engine, to work in AI clients besides Claude Code. Considered since the project's original plan; deferred because it's, in practice, a new distribution product, not a tweak to what already exists.
- [ ] **Export to draw.io/Excalidraw** -- manually editable output (the approach used by competing tools like diagrams.so). Entirely new output format, larger scope than the items above.
- [ ] **SVG accessibility** -- `<title>`/`<desc>` for screen readers on each node/edge, and color-contrast checking across themes.
- [ ] **More UML diagram types** -- sequence (lifelines + time axis, needs its own layout), use case, activity, state machine, component/deployment/package. Each is a new engine on the v0.5 multi-engine foundation.
