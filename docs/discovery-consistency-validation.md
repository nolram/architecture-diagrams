# Discovery: Consistency / validation (spec ↔ code)

**Status:** v0.10.1 implemented (comparator core + CLI + tests) — MCP tool and docs (v0.10.2) remain; see `ROADMAP.md` v0.10
**Date:** 2026-08-22
**Version:** v0.10 (proposed)
**Source idea:** `IDEAS.md` → "AI-native features" → *Consistency / validation*

---

## 1. Summary

Point the tool at a **diagram spec and a repository**; it checks the diagram
against the real code in both directions:

- **missing-evidence** — a node claims a technology the codebase shows no
  evidence for (*"you listed Redis but I don't see `redis` in the
  dependencies"*).
- **undrawn** — the codebase shows evidence for a technology the diagram does
  not draw (*"compose runs Kafka, but no node in the diagram matches it"*).

The result is a structured, severity-ranked report (`findings` + `matches` +
`summary`) with a CI-friendly exit code. It is the **inverse of v0.9's
`detect`**: detection (code → stack) already exists; this feature adds only the
**compare** step (stack ↔ spec).

---

## 2. Why this candidate

- **It is the last open AI-native item.** `IDEAS.md` calls this section "the
  real differentiator." Codebase → diagram shipped in v0.9; natural language →
  diagram is already covered by the skill/MCP (the AI writes the spec); this is
  what remains.
- **It closes the loop.** v0.9's flow is detect → refine → render. This adds
  *verify*: after the LLM refines a diagram, check it against the code before
  it ships. That is exactly the failure mode diagrams are famous for — drifting
  from reality.
- **It is cheap because the hard part exists.** `analyzeCodebase()`
  (`src/detect/index.ts:30`) already returns `detected[]` with `tech`,
  `iconKey`, `confidence`, and `source` evidence, built on the curated
  `TECH_MAPPING` table (`src/detect/mapping.ts:19`). The only new code is a
  comparator plus two thin surfaces (CLI subcommand, MCP tool).
- **It was explicitly planned as the follow-on to detect.** The v0.9 discovery
  doc (`docs/discovery-codebase-to-diagram.md:48`) lists it: *"Shares the
  code-analysis layer this feature builds; better as a follow-on once detection
  exists."* Detection now exists.

---

## 3. Alternatives considered (and why not now)

| Candidate | Why not now |
|---|---|
| **Import Mermaid (flowchart)** | Strong, bounded, serves the "better than Mermaid" motivation. A catch-up/conversion story, not the differentiator. Good follow-on (v0.11 candidate). |
| **UML sequence** | Most-requested UML type, but needs a genuinely new layout (lifelines + time axis) — the biggest engineering lift available. |
| **ER diagram** | Cheap sibling of uml-class, but incremental family work, not the north star. |
| **draw.io / Excalidraw export** | Entirely new output format; explicitly "larger scope" in the `ROADMAP.md` backlog. |
| **SVG a11y / themes / interactive HTML / visual diff** | Polish items; lower strategic value. |
| **Two LOW detect gaps** (CI node context, unknown-image badge) | Small; can ship as a v0.9.x patch independently of this feature. |

---

## 4. Core insight

This is a **comparator over two existing artifacts** — not a new engine, not
new detection, not new rendering.

```text
spec (YAML) + repo path
  → validateSpecText()           (src/core/render.ts:30 — must be a valid architecture spec)
  → analyzeCodebase(repoPath)    (src/detect/index.ts:30 — existing: detected[] with evidence)
  → compare                      (NEW: match spec nodes ↔ detected techs, both directions)
  → CheckResult                  (findings + matches + summary → CLI exit code / MCP tool)
```

`analyzeCodebase()` already does the code-side work (read manifests, detect
tech, map icons, deduplicate). `validateSpecText()` already gives us a typed
spec. The only new code is `compare()` and its two surfaces. That is why the
feature is bounded despite being a "differentiator."

---

## 5. What already exists (assets we reuse)

| Asset | Location | Role in this feature |
|---|---|---|
| Detection core | `src/detect/index.ts` — `analyzeCodebase()` (:30) | The code-side input: `detected[]` with `tech`/`iconKey`/`confidence`/`source`. |
| Tech mapping | `src/detect/mapping.ts` — `TECH_MAPPING` (:19), `EVIDENCE_TO_TECH` (:65) | The join key between spec nodes and detected techs (iconKey → tech, and evidence names for name-matching). |
| Detect types | `src/detect/types.ts` — `DetectedTech`, `Confidence` | Reused in the check result contract. |
| Spec validation | `src/core/render.ts` — `validateSpecText()` (:30), `SpecError` (:16) | Gate: only valid architecture specs are checked. |
| Spec schema | `src/spec/schema.ts` — `DiagramSpec`, `DiagramNode` (node `id`/`label`/`sublabel`/`icon`) | The spec-side input shape. |
| CLI | `src/cli.ts` (commander: `render`/`icons`/`detect`/`mcp`) | We add one subcommand (`check`). |
| MCP server | `src/mcp.ts` — `TOOLS` (:16), handler switch (:223) | We add one tool (`check_consistency`). |
| Fixture repos | `tests/fixtures/detect/` (node+compose, k8s, monorepo, empty, compose-k8s-dup) | Ready-made codebases to check specs against — no new fixtures needed for most cases. |
| Test culture | `tests/` (node:test via tsx), CLI/MCP handler test patterns (`tests/mcp.test.ts`) | The model for comparator + surface tests. |

---

## 6. Matching design (the core of the feature)

A spec node and a detected tech **match** when either signal fires:

1. **Icon match (strong).** Build a reverse map from `TECH_MAPPING`:
   iconKey → set of techs (e.g. `brand:redis` → `{redis}`; `brand:nodejs` →
   `{express, nodejs}` — several techs share one icon). A node matches if any
   tech of its `icon` is in `detected[]`. This is the primary, high-signal
   path and it reuses the curated table as-is.
2. **Name match (weak).** Word-boundary substring match of the tech name *or
   any of its evidence names* (`EVIDENCE_TO_TECH` keys, e.g. `pg`, `ioredis`,
   `next`) against the node's `id` + `label` + `sublabel` (lowercased). Catches
   nodes with generic or no icon (`generic:database`, `file:./logo.svg`).
   Word boundaries prevent false hits (`react` matches "React app", not
   "reaction"). Name match alone never produces a high-severity finding.

**Direction A — missing-evidence (spec → code).** For each spec node:
- icon-matched or name-matched to a detected tech → record a `match`.
- otherwise → a `missing-evidence` finding, severity by how specific the claim
  is:
  - **high** — node icon is a mapped tech icon (a specific claim: `brand:redis`,
    `brand:kafka`);
  - **medium** — node category is `external` or `security` (plausibly managed /
    not in local manifests);
  - **low** — generic/`file:` icon with no name match (weak claim; may be an
    external system the codebase legitimately doesn't reference).

**Direction B — undrawn (code → spec).** For each detected tech not matched by
any node → an `undrawn` finding, severity from the detection's `confidence`
(high→high, medium→medium, low→low), **capped at low** for presence-based techs
(`docker`, `kubernetes`, `github-actions`, `jenkins`, `gitlab-ci`) — a diagram
may legitimately omit the platform/CI layer.

**Global guard.** If `analyzeCodebase()` found no recognizable manifests, emit
a warning and cap *all* missing-evidence severities at low (the codebase is
simply not readable by our detectors — findings are not trustworthy).

---

## 7. Output contract

```ts
interface CheckFinding {
  kind: "missing-evidence" | "undrawn";
  severity: "high" | "medium" | "low";
  message: string;   // human-readable, e.g. 'Node "cache" (brand:redis): no redis evidence found in the codebase.'
  node?: { id: string; label: string; icon?: string };  // missing-evidence
  tech?: string;                                          // the technology involved
  evidence?: string;                                      // undrawn: where the code evidence is
}

interface CheckMatch {
  node: { id: string; label: string; icon?: string };
  tech: string;
  confidence: Confidence;   // from the detection
  source: string;           // evidence, e.g. "docker-compose.yml:services.cache.image"
  via: "icon" | "name";
}

interface CheckResult {
  findings: CheckFinding[];
  matches: CheckMatch[];
  warnings: string[];       // e.g. "no recognizable manifests found in the repo"
  summary: { matched: number; missingEvidence: number; undrawn: number };
}
```

Returning structured findings (not just a text report) is deliberate — the same
reason v0.9 returns `detected[]` + `draftSpec`: the LLM can act on the result
(explain, prune, or fix the spec) instead of parsing prose.

---

## 8. Surface

- **CLI** — `arch-diagram check <spec> --repo <path>`:
  - prints matches, findings (grouped by severity), and warnings;
  - exit code **0** when no high/medium findings; **1** when there are any
    (CI-friendly); `--strict` also fails on low-severity findings;
  - invalid spec or unreadable repo → error message, exit 1 (consistent with
    `render`).
- **MCP** — a new `check_consistency` tool: `{ spec | path, repo }` → the same
  `CheckResult` as text + JSON, so an AI can detect → refine → render →
  *verify* in one flow. Exactly the "additional MCP tools" the v0.8 notes
  anticipated.

---

## 9. Key design decisions

1. **Compare, don't re-detect.** Reuse `analyzeCodebase()` unchanged; the new
   code is a pure function `checkConsistency(spec, detected) → CheckResult`
   (plus the thin CLI/MCP wrappers). Pure function = trivially unit-testable.
2. **Icon-first matching.** The icon is the spec's explicit claim about
   technology; name matching is a fallback for icon-less nodes and never the
   sole basis for a high-severity finding.
3. **Severity over pass/fail.** Three levels + a `--strict` flag, not a binary
   gate: diagrams legitimately include external/managed systems with no local
   evidence, and codebases legitimately contain platform layers a diagram omits.
4. **Architecture specs only (MVP).** `type: architecture` has the node/icon
   model this feature matches on. C4 (optional icons, abstract element types)
   and uml-class (no icons) are non-goals for v0.10 — a later increment can
   extend the comparator per engine.
5. **Node-level only.** Edge-level consistency ("the diagram shows web→api but
   the code suggests otherwise") is semantic — LLM territory, same boundary as
   v0.9's edge inference.
6. **No rendering changes.** This feature never touches layout/render/export;
   the byte-identical example gate stays trivially green.

---

## 10. Testing strategy

Unit tests for the comparator (pure function, no fixtures needed):

| Case | Expected |
|---|---|
| node icon `brand:redis` + detected `redis` | match via icon, no finding |
| node icon `brand:redis`, no redis detected | missing-evidence **high** |
| node icon `aws:s3` (external category), no match | missing-evidence **medium** |
| node icon `generic:database`, label "Redis cache", detected `redis` | match via name (word boundary) |
| label "reaction engine", detected `react` | **no** name match (boundary check) |
| detected `kafka` (high), no node | undrawn **high** |
| detected `kubernetes` (high), no node | undrawn **low** (presence cap) |
| no manifests detected | warning + all missing-evidence capped at low |

Fixture-based integration (reuse `tests/fixtures/detect/` repos with small
hand-written specs):

| Fixture repo | Spec | Expected |
|---|---|---|
| `node-express-pg-redis/` | nodes: app (brand:nodejs), postgres (brand:postgresql), redis (brand:redis) | 3 matches, 0 findings, exit 0 |
| `node-express-pg-redis/` | same but redis node replaced with `aws:dynamodb` | missing-evidence high for the dynamodb node; exit 1 |
| `compose-k8s-dup/` (has kafka) | spec without a kafka node | undrawn high for kafka; exit 1 |
| `empty/` | any spec | warning, findings capped low, exit 0 (no high/medium) |

Plus: CLI test asserting exit codes + output shape; MCP handler test for
`check_consistency` (mirroring `tests/mcp.test.ts` patterns).

---

## 11. Risks & open questions

- **Name-match false positives** — mitigated by word boundaries, icon-first
  ordering, and the rule that name-only matches never yield high severity.
- **Managed/external services** — a node for "AWS S3" or "Stripe" may have no
  local evidence even in a correct diagram. Handled by category-based severity
  (external/security = medium at most) and documented in the reference doc.
- **Undrawn noise** — presence-based techs (docker/k8s/CI) are capped at low so
  a focused diagram doesn't drown in platform findings.
- **Icon-less specs** — a spec with no icons at all produces only name-based /
  low findings; the report says so explicitly (warning) rather than failing.
- **Severity calibration** — keep exactly three levels; resist adding more.
  Revisit after first real-world use.

---

## 12. Non-goals (MVP)

- C4 / uml-class specs (architecture type only).
- Edge-level / semantic consistency (LLM territory, same boundary as v0.9).
- Python / Go / Ruby manifest detection (inherits v0.9's scope).
- Auto-fixing or editing the spec from findings.
- Any layout/render/export changes.

---

## 13. Phasing (proposed v0.10)

- **v0.10.1 — Comparator core + CLI**
  - `src/detect/check.ts`: `CheckResult`/`CheckFinding`/`CheckMatch` types,
    reverse icon map, name matcher, `checkConsistency(spec, detected)`,
    severity rules; exported from `src/detect/index.ts`.
  - CLI `arch-diagram check <spec> --repo <path>` (+ `--strict`), exit codes.
  - Unit tests (comparator table above) + fixture-based integration tests.
- **v0.10.2 — MCP + docs**
  - MCP `check_consistency` tool (`spec | path` + `repo`).
  - Docs: `README.md`, `SKILL.md`, and a `reference/check-spec.md` (or a new
    section in `reference/detect-spec.md`) covering the finding kinds, severity
    rules, and the deterministic-vs-LLM boundary.

Each phase keeps the existing suite green and the examples byte-identical (the
standard regression gate — trivially satisfied since rendering is untouched).

---

## 14. Success criteria

- `arch-diagram check <spec> --repo <path>` on a fixture repo reports correct
  findings in **both** directions with the expected severities, and the exit
  code is CI-friendly (0 clean / 1 findings / `--strict` for lows).
- The result is structured (`findings[]` with `kind`/`severity`/`message`,
  `matches[]` with evidence) so an LLM can act on it before/after rendering.
- The MCP `check_consistency` tool returns the same shape.
- Fixture + unit tests pass; the existing test suite and example renders stay
  green (byte-identical).
