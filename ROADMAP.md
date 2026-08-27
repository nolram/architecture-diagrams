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

## v0.6 -- C4 diagrams

Third diagram family on the v0.5 multi-engine foundation: `type: c4` selects the
C4 engine, which reuses the shared ELK layout, theme, SVG utils, and PNG/PDF
export. The format is specified in `architecture-diagrams/reference/c4-spec.md`
with a reference example in `architecture-diagrams/reference/c4.example.yaml`.

- [x] **C4 engine (context / container / component)** -- `type: c4` + `level`
  (`context` default, `container`, `component`); typed `elements`
  (`person`, `system`, `external-system`, `container`, `component`) with `group`
  nesting (only `system`/`container` can be parents; a `person` is never nested),
  and `relationships` with optional `description`/`technology` rendered combined
  as `"description (technology)"`. Validation: unique ids, no self-relationships,
  `group` must point at an existing `system`/`container`, relationship endpoints
  must exist. Reuses the shared ELK runner, theme, and SVG utils; `auto` resolves
  to `right`.
- [x] **Person silhouette** -- `person` elements render as a hand-drawn silhouette
  (no box), the C4 convention for users/actors.
- [x] **External-system dashed boxes** -- `external-system` renders with a dashed
  border; a `system`/`container` that has children renders as a boundary box
  around them (with its `description (technology)` under the title).
- [x] **Legend** -- a color key for the element types present, headed by the
  `level` title ("System Context" / "Container" / "Component"); this is what makes
  `level` visible in the output.
- [x] **5 examples** -- runnable examples in `examples/c4/` (context, container,
  component, a dark-theme variant, and a full 5-type / 3-level diagram) plus the
  reference example `architecture-diagrams/reference/c4.example.yaml`.
- [x] **Tests** -- spec validation, layout, and render tests for the C4 engine
  (including boundary description, legend, and `level` heading).
- [x] **Docs** -- `architecture-diagrams/reference/c4-spec.md` finalized (draft
  status removed), SKILL.md and README updated with the C4 family.

## v0.7 -- C4 expressiveness

Four additive, fully backward-compatible features for the C4 family (all optional;
a spec that omits them renders exactly as before). The format is documented in
`architecture-diagrams/reference/c4-spec.md` and exercised by the runnable example
`examples/c4/batch-payments.yaml`.

- [x] **Element `icon`** -- an optional `icon` on any C4 element, reusing the same
  catalog as the architecture family (`brand:nodejs`, `aws:rds`, `generic:database`,
  ... or `file:./logo.svg`). Rendered as a small badge in the top-left of the card,
  tinted with the element's accent color. A `person` keeps its silhouette and ignores
  `icon`, and a boundary (a `system`/`container` with children) ignores `icon` too
  (a warning is emitted, since boundaries render a title, not a badge); a key that
  does not resolve falls back to a generic badge and a warning (the render still
  succeeds). Sizing reserves room for the badge so text never overlaps it.
- [x] **Sub-boundaries (2nd-level nesting)** -- a `system` or `container` can itself
  be grouped inside another, drawing a boundary within a boundary to any depth
  (e.g. a `Settlement` system nested inside a `Payment Core` system). Verified with a
  3-boundary probe and a layout containment test.
- [x] **Element & relationship `status`** -- an optional `status`
  (`active` default | `deprecated` | `suspended` | `planned`) on both elements and
  relationships. Non-active items render dashed, dimmed (opacity 0.62), and tagged
  with a small uppercase pill; any non-active status present also adds a dashed entry
  to the legend. `external-system` keeps its own (longer) dash.
- [x] **`wrap.maxLines`** -- a top-level `wrap` block (default `maxLines: 4`, range
  1..12) that wraps long element `description`s and relationship labels onto multiple
  lines (word-boundary wrap, overflow folded into an ellipsis) instead of truncating
  them to one line. The layout reserves the space for the wrapped lines so nothing
  overlaps. `maxLines: 1` reproduces the old single-line behavior.
- [x] **Tests** -- 15 new tests: schema validation for `icon`/`status`/`wrap`
  (valid + invalid, with field paths and allowed-value lists), and render assertions
  (icon badge, person ignores icon, non-active dashed/dimmed/tagged, active untagged,
  non-active relationship dashed, multi-line wrap, `maxLines: 1` ellipsis, and the
  missing-icon fallback + warning).
- [x] **Docs** -- `architecture-diagrams/reference/c4-spec.md` documents the new
  fields (structure, elements, relationships, a dedicated `wrap` section, common
  errors, layout tips); `c4.example.yaml` and `examples/c4/batch-payments.yaml`
  demonstrate them.

## v0.8 -- MCP server

A Model Context Protocol server that exposes the same rendering engine to any MCP
client (Claude Desktop, Cursor, Windsurf, ...), complementing the existing Claude
Skill (which targets Claude Code). It is a thin **distribution** layer over the
pipeline that already exists -- no new rendering capability -- and reuses the exact
same validate → layout → render → export code path as the CLI. Transport is **stdio**
(the standard for local MCP servers: no network, no auth, spawned as a child process).

Design decisions:
- **Reuse, don't fork.** The core of `renderOnce` (read/parse/validate/layout/render/export)
  moves into a shared module that both the CLI `render` command and the MCP server call, so
  there is one code path to keep correct.
- **Inline specs are primary.** The AI passes the spec as a YAML string (it already has it in
  context); a file `path` is a convenience. Because an inline spec has no directory, `baseDir`
  (used by `icon: file:./logo.svg`) defaults to the server's cwd and is documented.
- **One bin, one subcommand.** `arch-diagram mcp` starts the server (consistent with the
  existing `render`/`icons` subcommands), so MCP clients spawn `arch-diagram mcp`.

- [x] **Shared render pipeline** -- extract the core of `renderOnce` from `src/cli.ts` into
  `src/core/render.ts`: `renderSpec(specText, { out?, png?, pdf?, scale?, baseDir? })` returning
  `{ svg, png?, pdf?, warnings, direction }`. The CLI `render` command becomes a thin wrapper
  over it. Regression gate: all examples still render byte-identical and the existing test
  suite stays green.
- [x] **MCP server (stdio)** -- `src/mcp.ts` + an `arch-diagram mcp` subcommand, built on
  `@modelcontextprotocol/sdk`. Exposes four tools:
  - `render_diagram` -- `spec` (YAML string) or `path`; options `png`/`pdf`/`scale`/`out`.
    Returns the SVG text, base64 PNG/PDF when requested, and any warnings.
  - `search_icons` -- `query`; returns matching icon `key`/`label`/`category` (wraps
    `searchCatalog`) so the AI can pick a valid icon key.
  - `validate_spec` -- `spec`; returns the actionable, field-pathed validation errors (wraps
    `engine.validate`) without rendering, for fast iteration.
  - `list_diagram_types` -- the registered engine types with a one-line description each.
- [x] **Inline-spec `baseDir` handling** -- define and document `baseDir` for inline specs
  (default: server cwd); ensure `icon: file:` resolves against it and that a missing/undefined
  `baseDir` degrades gracefully (fallback badge + warning) instead of crashing.
- [x] **Tests** -- node:test, fully offline: unit tests for each tool handler (render a sample
  `architecture`, `c4`, and `uml-class` spec and assert the SVG is present and warnings are
  surfaced; `search_icons` returns the expected keys; `validate_spec` returns field-pathed
  errors for a bad spec). One integration test that spawns `arch-diagram mcp`, speaks MCP over
  stdio (`initialize` → `tools/list` → `tools/call render_diagram`), and asserts a valid SVG
  comes back.
- [x] **Build + CI** -- add `@modelcontextprotocol/sdk` to dependencies; ensure `tsc` emits
  `dist/mcp.js`; add the MCP integration test to `npm test`; add a CI smoke step that starts
  the server and lists its tools.
- [x] **Docs** -- README "Using it as an MCP server" section (Claude Desktop / Cursor config
  snippets); a `reference/mcp.md` with setup + a tool reference; a SKILL.md note that an MCP
  server is available as an alternative to the render script.

Sets up the AI-native features (codebase → diagram, natural language → diagram) to later be
exposed as additional MCP tools on the same server.

## v0.9 -- Codebase → diagram

The project's stated differentiator (`IDEAS.md`: "the AI differentiator that justifies the
project") and the last open item in its own "Suggested next 3" (C4 in v0.6, MCP in v0.8). Point
the tool at a repository; it detects the stack (from `package.json`, `docker-compose`, k8s
manifests, `Dockerfile`, CI configs), maps each technology to a curated icon, and emits a
**draft architecture spec** that the existing pipeline renders. The LLM stays in the loop to
prune false positives and add semantic edges before rendering. Design notes in
`docs/discovery-codebase-to-diagram.md`.

- [x] **v0.9.1 -- Detection core + CLI** -- `src/detect/` module: manifest readers
  (`package.json`, `docker-compose`, monorepo workspaces), the curated tech→icon mapping table
  (`mapping.ts`), and a spec builder (`build.ts`) that emits high-confidence edges only (compose
  `depends_on`, app→data-store when a driver + a matching node exist). `analyzeCodebase(path)`
  returns `{ detected, draftSpec, warnings }` -- the detected stack (each with `iconKey`,
  `confidence`, `source`) plus a valid, renderable draft spec. CLI `arch-diagram detect <path>`
  (+ `--render`). Fixture-repo tests (`tests/fixtures/detect/`) + mapping-table unit tests.
- [x] **v0.9.2 -- k8s + Dockerfile + CI + MCP** -- k8s manifest detection
  (`readK8sManifests`: `Deployment`/`Service`/`Ingress`/`Namespace`/`StatefulSet` → one node per
  Deployment (icon by container image), one node per Ingress (network), a `boundary` group per
  Namespace, and `Ingress → Service → Deployment` edges matched by selector labels); `Dockerfile`
  detection (`readDockerfile`: `FROM` base image → runtime tech, `EXPOSE` ports informational);
  CI detection (`readCI`: `.github/workflows`, `Jenkinsfile`, `.gitlab-ci.yml` → a CI node).
  MCP `analyze_codebase` tool (`path` → `{ detected, draftSpec, warnings }`), so an AI can
  detect → refine → `render_diagram` in one flow. Docs: `README.md`, `SKILL.md`, and
  `reference/detect-spec.md` (DetectionResult shape, mapping table, confidence levels, and the
  deterministic-vs-LLM edge boundary).

## v0.10 -- Consistency / validation (spec ↔ code)

The inverse of v0.9: instead of code → draft spec, check an existing
**architecture spec against a real codebase** in both directions —
*missing-evidence* (a node claims a technology the code shows no evidence for)
and *undrawn* (the code shows evidence for a technology the diagram omits). It
reuses `analyzeCodebase()` and `TECH_MAPPING` unchanged; the only new code is a
pure comparator (`checkConsistency(spec, detected) → CheckResult`) plus two thin
surfaces. Design notes in `docs/discovery-consistency-validation.md`.

- [x] **Comparator core** -- `src/detect/check.ts`: finding/match types, reverse
  iconKey→tech map over `TECH_MAPPING`, word-boundary name matcher (tech names +
  `EVIDENCE_TO_TECH` evidence names), severity rules (icon-claim = high,
  external/security = medium, generic/name-only = low; presence-based techs
  docker/k8s/CI capped at low; no-manifests guard caps everything at low). A node
  covers *every* tech its icon/name refers to (e.g. a `brand:nodejs` node covers
  both `express` and `nodejs`), so shared-icon siblings are never reported undrawn.
- [x] **CLI** -- `arch-diagram check <spec> --repo <path>` (+ `--strict`):
  prints matches, findings grouped by severity, warnings; exit 0 when no
  high/medium findings, 1 otherwise (`--strict` also fails on lows). Architecture
  specs only (c4/uml-class rejected with a clear error).
- [x] **Tests** -- unit tests for the comparator (`tests/check.test.ts`: icon
  match, name match + word boundaries, severity rules, no-manifests guard,
  icon-sharing coverage) and fixture-based integration tests
  (`tests/check-cli.test.ts`) reusing `tests/fixtures/detect/` repos with
  hand-written specs (`tests/fixtures/check/`): both finding directions, exit
  codes, `--strict`, non-architecture rejection.
- [x] **MCP** -- `check_consistency` tool (`spec | path` + `repo`) returning the
  same structured `CheckResult`, so an AI can detect → refine → render → verify
  in one flow. Tests in `tests/mcp.test.ts` (clean spec, missing-evidence,
  undrawn, inline spec, error cases, non-architecture rejection, non-directory repo).
- [x] **Docs** -- README (Usage + a "Consistency check" section + MCP tool list),
  SKILL.md (a "Consistency check" section + MCP note), `reference/mcp.md`
  (`check_consistency` tool), and `reference/check-spec.md` (finding kinds,
  severity rules, deterministic-vs-LLM boundary, managed/external caveat).

## v0.11 -- UML sequence diagrams

Fourth diagram family on the v0.5 multi-engine foundation: `type: uml-sequence`
selects the sequence engine, which reuses the shared theme, SVG utils, and PNG/PDF
export. Unlike uml-class/c4 it does not use ELK -- a sequence diagram is a fixed
grid (participants × time), so it gets its own small layout. The format is
specified in `architecture-diagrams/reference/uml-sequence-spec.md` with a
reference example in `architecture-diagrams/reference/uml-sequence.example.yaml`.

- [x] **Sequence engine** -- `type: uml-sequence`; participants (object/actor +
  stereotype), 4 message kinds (sync = solid + filled arrow, async = solid + open
  arrow, reply = dashed + open arrow, self = loopback), activation bars, and flat
  alt/loop/opt/par fragments (label = guard, participants = span, messages = covered
  ids in time order; one message per fragment). Custom grid layout (participants ×
  time, no ELK) returning the shared LayoutResult so PNG/PDF export works unchanged;
  registered in the engine registry (CLI/MCP dispatch + `list_diagram_types` pick it
  up automatically).
- [x] **Tests** -- spec validation, layout (grid positions, fragment bounds,
  activation extents), render (arrow kinds, actor figure, fragment tab/separator,
  themes).
- [x] **Docs** -- `architecture-diagrams/reference/uml-sequence-spec.md` + example,
  `examples/uml/sequence-*.yaml`, README + SKILL.md updated.
- [x] **Stress pass** -- 8 adversarial specs in `examples/uml/stress/` (many
  participants, deep fragments, self/activation chains, special chars, degenerate
  sizes) exposed three layout bugs, all fixed in v0.11 (fragment tab clamped to its
  box, self-message label width reserved in the canvas, actor column width
   proportional to the name). The two remaining gaps were fixed afterwards (canvas-colored
   label backgrounds; LIFO activation matching with side-by-side bars + warning).
   Write-up: `docs/stress-uml-sequence.md`; tracked in `IDEAS.md` ("UML sequence: known gaps").

## v0.12 -- Mermaid import (flowchart)

Importing existing Mermaid `flowchart`/`graph` diagrams into our architecture spec
serves the "better than Mermaid" adoption story: people with existing Mermaid
diagrams can "upgrade" them instead of redrawing. It is an **input format, not a
new engine** -- the converter emits a valid architecture spec that flows through
the existing validate → layout → render pipeline unchanged. The mapping is
specified in `architecture-diagrams/reference/mermaid-import-spec.md`.

- [x] **Mermaid parser + converter** -- `src/mermaid/` (parser.ts + convert.ts):
  a dependency-free parser for flowchart/graph (all node shape notations, all
  arrow types, `|label|` and dash-embedded labels, chained edges, nested
  subgraphs, `direction`) and a converter to a valid architecture spec. Mapping:
  cylinder → `database`, other shapes → `card` (with a warning);
  `-->`/`-.->`/`<-->`/`---` → solid/dashed/bidirectional/undirected; subgraph →
  `boundary` group (nested via `parent`); `TD/BT`→down, `LR/RL`→right. Styling
  (`classDef`, `style`, `linkStyle`, `click`) is dropped with a warning, never a
  failure.
- [x] **CLI** -- `arch-diagram import <file.mmd>` prints the converted spec YAML
  (+ warnings); `--render` / `-o` render it to SVG.
- [x] **MCP** -- `import_mermaid` tool (`mermaid` string or `path`) returning
  `{ spec, warnings }`, so an AI can import → refine → `render_diagram`.
- [x] **Tests** -- parser/convert unit tests, CLI integration tests, MCP handler
  tests; fixtures in `tests/fixtures/mermaid/`.
- [x] **Docs** -- `architecture-diagrams/reference/mermaid-import-spec.md`
  (mapping table, supported/dropped, workflow); README + SKILL.md +
  `reference/mcp.md` updated.

## v0.13 -- ER diagrams

Fifth diagram family on the v0.5 multi-engine foundation: `type: er` selects the
ER engine, which reuses the shared ELK runner, theme, SVG utils, and PNG/PDF
export (`auto` resolves to `down`). Entities carry attributes with PK/FK badges
and underlined key attributes; weak entities render a double border and must have
at least one identifying relationship (enforced in validation). Relationships use
crow's-foot cardinalities (one / zero-or-one / many / zero-or-many) with
identifying (solid) vs non-identifying (dashed) lines and optional edge labels.
The format is specified in `architecture-diagrams/reference/er-spec.md` with a
reference example in `architecture-diagrams/reference/er.example.yaml`.

- [x] **ER engine** -- `type: er`; entities with attributes (`key: primary` /
  `key: foreign` → PK/FK badge + underlined name), `weak: true` (double border,
  requires ≥1 identifying relationship -- a validation error otherwise), and
  relationships with `fromCardinality`/`toCardinality` (one / zero-or-one / many /
  zero-or-many), `identifying: true` (solid line) vs default (dashed), and an
  optional `label` pill at the edge midpoint. Validation: unique entity ids, no
  self-relationships, endpoints must exist, cardinality values checked. Reuses the
  shared ELK runner, theme, and SVG utils; `auto` resolves to `down`. Done:
  `src/engines/er/` (schema/geometry/layout/render), registered in the engine
  registry so CLI/MCP dispatch + `list_diagram_types` pick it up automatically.
- [x] **Tests** -- 31 new tests: spec validation (incl. the weak-entity rule,
  field paths and allowed-value lists), layout geometry (monotonicity + direction),
  and render (crow's-foot markers, PK/FK badges, solid/dashed lines, text
  escaping, both themes).
- [x] **Examples** -- runnable examples in `examples/er/` (e-commerce, banking
  dark theme, explicit `direction: right`) plus the reference example
  `architecture-diagrams/reference/er.example.yaml`.
- [x] **Docs** -- `architecture-diagrams/reference/er-spec.md` +
  `er.example.yaml`; README, SKILL.md, and `reference/mcp.md` updated with the ER
  family.
- [x] **Stress pass** -- 11 adversarial specs in `examples/er/stress/` (many
  entities, long names, all 16 cardinalities, weak-entity chains, parallel edges,
  special chars, dense star, directed cycle, degenerate sizes, bent routes) found
  one real defect, fixed in v0.13: parallel-edge label pills overlapped because
  the layout gave ELK no label size (now passed through, and pills are drawn at
  ELK's reserved box -- mirroring the architecture engine). The other suspected
  issues (text overflow, marker overshoot on bent routes, edge-through-box, XML
  escaping) were verified non-findings. Write-up: `docs/stress-er.md`; tracked in
  `IDEAS.md` ("ER: known gaps").

## Backlog (larger scope -- re-evaluate after the phases above)
- [ ] **Export to draw.io/Excalidraw** -- manually editable output (the approach used by competing tools like diagrams.so). Entirely new output format, larger scope than the items above.
- [ ] **SVG accessibility** -- `<title>`/`<desc>` for screen readers on each node/edge, and color-contrast checking across themes.
- [ ] **More UML diagram types** -- use case, activity, state machine, component/deployment/package. Each is a new engine on the v0.5 multi-engine foundation (sequence shipped in v0.11).
