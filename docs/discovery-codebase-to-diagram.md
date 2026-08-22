# Discovery: Codebase → diagram

**Status:** Implemented (v0.9.1 + v0.9.2) — see `ROADMAP.md` v0.9 and `architecture-diagrams/reference/detect-spec.md`.
**Date:** 2026-08-20
**Version:** v0.9
**Source idea:** `IDEAS.md` → "AI-native features" → *Codebase → diagram*

---

## 1. Summary

Point the tool at a repository; it detects the stack (from `package.json`,
`docker-compose`, `Dockerfile`, k8s manifests, CI configs), maps each detected
technology to a curated icon, and emits a **draft architecture spec** (nodes,
groups, edges) that the existing pipeline renders. The LLM stays in the loop to
prune false positives and add semantic edges before rendering.

This is the project's stated differentiator — *"the AI differentiator that
justifies the project"* (`IDEAS.md`) — and the last open item in the project's own
"Suggested next 3" (C4 shipped in v0.6, MCP server in v0.8).

---

## 2. Why this candidate

- **It is the north star.** `README.md`: *"built to be used by an AI … not
  hand-drawn."* `IDEAS.md`: *"AI-native features (the real differentiator)."*
- **It is the project's own plan.** The "Suggested next 3" in `IDEAS.md` is
  C4 → MCP server → Codebase → diagram. The first two are done (v0.6, v0.8); this
  is the remaining one.
- **The infrastructure was deliberately built for it.** The v0.8 (MCP) notes in
  `ROADMAP.md` state the server *"Sets up the AI-native features (codebase →
  diagram, natural language → diagram) to later be exposed as additional MCP
  tools on the same server."*
- **It is more feasible than "high effort" implies**, because the hard parts
  already exist (see §5). What is genuinely new is a single **detect → map →
  build-spec** layer.

---

## 3. Alternatives considered (and why not now)

| Candidate | Why not now |
|---|---|
| **Import Mermaid (flowchart)** | Strong, bounded, serves the "better than Mermaid" motivation (people *upgrade* existing diagrams). But it is a *catch-up* (convert existing diagrams), not the differentiator. Good follow-on. |
| **ER diagram** | Cheap sibling of the class diagram on the multi-engine foundation (boxes + attributes + relationships). Low effort, but incremental — not the north star. |
| **UML sequence / state / activity** | Need their own layout (lifelines + time axis). Moderate effort, incremental family. |
| **Consistency / validation** | *"Check the diagram against the real code."* Shares the code-analysis layer this feature builds; better as a **follow-on** once detection exists. |
| **draw.io / Excalidraw export** | Entirely new output format; explicitly "larger scope" in the `ROADMAP.md` backlog. |
| **SVG a11y / themes / interactive HTML / visual diff** | Polish items; lower strategic value. |

---

## 4. Core insight

This is a **spec generator that feeds the existing pipeline** — not a new engine.

```text
repo path
  → detect   (read manifests: package.json, docker-compose, Dockerfile, k8s, CI)
  → map      (detected tech → icon key, over the existing 195-entry catalog)
  → build    (nodes + groups + high-confidence edges → a valid architecture spec)
  → [LLM]    (optional: prune false positives, add semantic edges, relabel)
  → renderSpec()   (src/core/render.ts:69 — validate → layout → render → export)
```

`renderSpec()` already does validate → layout → render → export. The only new
code is everything *before* it. That is why the feature is bounded despite the
"high effort" label in `IDEAS.md`.

---

## 5. What already exists (assets we reuse)

| Asset | Location | Role in this feature |
|---|---|---|
| Render pipeline | `src/core/render.ts` — `renderSpec()` (:69), `validateSpecText()` (:30) | The target: we produce a spec, it renders. |
| Icon catalog | `src/icons/catalog.ts` — `ICON_CATALOG` (195 entries) | The mapping target for "the right icons." |
| Icon helpers | `src/icons/catalog.ts` — `getCatalogEntry`, `findSimilarKeys`, `searchCatalog` | Validate/lookup mapping keys; power `search_icons`. |
| Icon resolver | `src/icons/resolve.ts` — `resolveIcon` | Already resolves any catalog key to SVG. |
| Spec schema | `src/spec/schema.ts` — `DiagramSpecSchema`, `NodeSchema`, `GroupSchema`, `EdgeSchema` | The shape of the draft spec we generate. |
| MCP server | `src/mcp.ts` — `createServer`, `TOOLS`, tool handlers | Distribution layer; we add one tool. |
| CLI | `src/cli.ts` (commander: `render`/`icons`/`mcp`) | We add one subcommand. |
| Test culture | `tests/` (node:test via tsx), byte-identical render gates | The model for fixture-repo tests. |

---

## 6. Detection surface (concrete)

| Source file | Extract | Maps to |
|---|---|---|
| `package.json` | `dependencies` (not `devDependencies`) | app runtime + frameworks + DB/queue drivers |
| `docker-compose.yml` / `.yaml` | `services[].image`, `depends_on`, `ports`, `volumes` | infra nodes (DB/cache/queue) + edges + boundary group |
| `Dockerfile` | `FROM`, `EXPOSE` | runtime + exposed ports |
| k8s manifests | `Deployment`, `Service`, `Ingress`, `Namespace`, `StatefulSet` | service nodes + edges + boundary group |
| `.github/workflows/*.yml`, `Jenkinsfile`, `.gitlab-ci.yml` | presence | CI/CD node |
| `pyproject.toml` / `requirements.txt` / `go.mod` *(later)* | deps / modules | Python / Go runtime |

Detection is **presence + manifest-driven**, not source-code analysis. We read
declarative files (fast, stable, offline) and infer the architecture from them.
Reading application source to infer call-graph edges is explicitly out of MVP
scope (that is the LLM's job, §11).

---

## 7. Tech → icon mapping (the core data asset)

The catalog already contains the target keys — this is a **curation** task over an
existing asset, not new icon work. Sketch of the mapping table (all keys verified
present in `src/icons/catalog.ts`):

| Detected (evidence) | → catalog key | category / shape |
|---|---|---|
| `express` / `next` / `react` (package.json) | `brand:nodejs` / `brand:nextjs` / `brand:react` | compute / card |
| `pg` (driver) or compose image `postgres` | `brand:postgresql` | database / **database** |
| `mysql2` / `mysql` | `brand:mysql` | database / database |
| `ioredis` / `redis` (driver or compose) | `brand:redis` | database / card |
| `mongoose` | `brand:mongodb` | database / database |
| `kafkajs` or compose `kafka` | `brand:kafka` | messaging / card |
| `amqplib` or compose `rabbitmq` | `brand:rabbitmq` | messaging / card |
| compose `nginx` | `brand:nginx` | network / card |
| compose / `Dockerfile` present | `brand:docker` | compute / card |
| k8s manifests present | `brand:kubernetes` | compute / card |
| `.github/workflows` present | `brand:github-actions` | generic / card |
| `auth0` / `okta` | `brand:auth0` / `brand:okta` | security / card |
| `stripe` | `brand:stripe` | external / card |
| `prometheus` / `grafana` | `brand:prometheus` / `brand:grafana` | generic / card |
| unknown / unmapped | `generic:service` / `generic:database` / `generic:queue` | per inferred category |

Notes:
- A **driver** (`pg`, `ioredis`, `mongoose`) implies a *dependency* on that
  technology, not necessarily a node we own — see confidence levels (§11).
- The mapping table is a new curated file (e.g. `src/detect/mapping.ts`), keyed by
  normalized tech name → `{ iconKey, category, shape }`.

---

## 8. Spec generation rules

- **Nodes** — one per detected service: the app itself, each compose service, each
  k8s `Deployment`. DB/cache/queue get `shape: database` (or `category: messaging`
  for queues).
- **Groups** — a compose project → a `boundary` group; a k8s `Namespace` → a group.
  Nested where the source implies nesting (e.g. services inside a namespace).
- **Edges (high-confidence only)** —
  - compose `depends_on` → edge;
  - k8s `Ingress → Service → Deployment` (selector match) → edges;
  - app → DB when a DB driver is detected **and** a DB node exists.
  - *Semantic* edges (e.g. "service A calls service B over REST") are **not**
    inferred deterministically — left to the LLM (§11).

The generated object must satisfy `DiagramSpecSchema` (`src/spec/schema.ts`) so it
passes `validateSpecText()` unchanged.

---

## 9. Output contract

```ts
interface DetectedTech {
  tech: string;        // "postgres", "redis", "express"
  iconKey: string;     // "brand:postgresql"
  category: IconCategory;
  shape: "card" | "database" | "actor" | "cloud";
  confidence: "high" | "medium" | "low";
  source: string;      // "package.json:dependencies.pg" | "docker-compose.yml:services.db.image"
}

interface DetectionResult {
  detected: DetectedTech[];   // the detected stack, with evidence
  draftSpec: DiagramSpec;     // a valid architecture spec, ready to render
  warnings: string[];         // ambiguous / low-confidence items, for the LLM/user
}
```

Returning `detected` + `draftSpec` (not just an SVG) is deliberate: it keeps the
mechanical part inspectable and testable, and hands the LLM a structured surface to
refine.

---

## 10. Surface

- **CLI** — `arch-diagram detect <path>` → prints the detected stack + the draft
  spec (YAML) to stdout. Offline, testable, no LLM required. A `--render` flag can
  additionally run it through `renderSpec()` for a quick visual.
- **MCP** — a new `analyze_codebase` tool (`path` → `detected` + `draftSpec`), so
  the LLM reviews/prunes and then calls the existing `render_diagram`. This is
  exactly the "additional MCP tools" the v0.8 notes anticipated.

---

## 11. Key design decisions

1. **Deterministic detection + LLM-in-the-loop.** The tool does the *mechanical*
   part (read manifests, detect tech, map icons, build a draft spec) — fully
   testable and offline. The LLM does the *semantic* part (prune false positives,
   add inferred edges, relabel) before rendering. Matches the project's
   "AI-in-the-loop" philosophy and its node:test + byte-identical-gate culture.
2. **Edge inference depth.** Deterministic, high-confidence edges only (compose
   `depends_on`, k8s service refs, driver→DB). Semantic edges are the LLM's job.
3. **MVP ecosystem scope.** Node.js + Docker + k8s. Covers the most common stacks
   and the catalog's strongest coverage. Python/Go are a later increment.
4. **Confidence levels.** Every detection carries `confidence` + `source` so the
   LLM (or user) can prune. A `pg` driver is *medium* (may be a managed/external
   DB); a compose `postgres` service is *high* (we own it).
5. **No source-code analysis in MVP.** We read declarative manifests, not
   application source. Call-graph inference is out of scope (LLM territory).

---

## 12. Testing strategy

Fixture repos under `tests/fixtures/detect/`, asserting the detected stack **and**
the draft spec (byte-stable, mirroring the existing render gates):

| Fixture | Setup | Expected |
|---|---|---|
| `node-express-pg-redis/` | package.json (`express`, `pg`, `ioredis`) + compose (`postgres`, `redis`) | app (nodejs) + postgres (database) + redis nodes; app→db, app→cache edges |
| `k8s-web/` | `Deployment` + `Service` + `Ingress` | service node + ingress→service→deployment edges + namespace group |
| `monorepo/` | two workspace `package.json` | two service nodes |
| `empty/` / `unknown/` | no recognizable manifests | graceful: warning, no crash, minimal/empty spec |

Plus unit tests for the mapping table (each known tech → expected icon key) and for
spec-shape validity (output always passes `validateSpecText()`).

---

## 13. Risks & open questions

- **False positives** — filter to `dependencies` only + a blocklist of
  non-infrastructure packages (`jest`, `eslint`, `typescript`, …).
- **Driver ≠ service** — `pg` means "talks to Postgres," which may be managed or
  external. Confidence levels + LLM pruning handle this.
- **Monorepos** — detect workspaces (`workspaces` field / multiple `package.json`)
  and emit one node per service.
- **Edge depth** — confirm the deterministic-vs-LLM boundary (recommend:
  high-confidence only).
- **Mapping curation** — finalize which npm packages map to which icon
  (`prisma` → which DB? `mongoose` → mongodb, `pg` → postgresql, `mysql2` → mysql).
- **Icon gaps** — a detected tech with no catalog key falls back to a `generic:*`
  shape (the existing graceful-fallback path), and is surfaced as a warning.

---

## 14. Non-goals (MVP)

- Source-code / call-graph analysis (LLM territory).
- Python / Go / Ruby / .NET detection (later increment).
- Terraform / cloud-provider resource detection (later increment).
- Auto-editing or round-tripping the spec back into the repo.
- Any new rendering capability — we reuse `renderSpec()` as-is.

---

## 15. Phasing (proposed v0.9)

- **v0.9.1 — Detection core + CLI**
  - `src/detect/` module: manifest readers (`package.json`, `docker-compose`),
    mapping table (`mapping.ts`), spec builder.
  - `analyzeCodebase(path): DetectionResult`.
  - CLI `arch-diagram detect <path>` (+ optional `--render`).
  - Fixture-repo tests + mapping-table unit tests.
- **v0.9.2 — k8s + Dockerfile + MCP**
  - k8s manifest detection, `Dockerfile` detection.
  - MCP `analyze_codebase` tool.
  - Docs: `SKILL.md`, `README.md`, `reference/detect-spec.md`.

Each phase keeps the existing suite green and the examples byte-identical (the
standard regression gate).

---

## 16. Success criteria

- `arch-diagram detect <path>` on a representative Node.js + Docker repo emits a
  valid draft spec with the correct icons and high-confidence edges, and renders
  cleanly through the existing pipeline.
- The detected stack is structured (`detected[]` with `iconKey`, `confidence`,
  `source`) so an LLM can refine it before rendering.
- Fixture-repo tests pass and the existing test suite + example renders stay green.
- The MCP `analyze_codebase` tool returns the same `detected` + `draftSpec` shape.
