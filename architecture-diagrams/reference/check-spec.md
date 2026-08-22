# Consistency check (spec ↔ code)

The inverse of `detect`: instead of code → draft spec, point the tool at an **existing architecture spec and a repository** and it checks the diagram against the real code in both directions:

- **missing-evidence** — a node claims a technology the codebase shows no evidence for (*"you listed Redis but I don't see `redis` in the dependencies"*).
- **undrawn** — the codebase shows evidence for a technology the diagram does not draw (*"compose runs Kafka, but no node in the diagram matches it"*).

The result is a structured, severity-ranked report (`findings` + `matches` + `summary`) with a CI-friendly exit code. It reuses the v0.9 detection core (`analyzeCodebase()` + `TECH_MAPPING`) unchanged; the only new code is a pure comparator (`checkConsistency(spec, detected) → CheckResult`) plus two thin surfaces (CLI subcommand, MCP tool).

## Commands

```bash
# CLI
arch-diagram check diagram.yaml --repo /path/to/repo          # matches + findings + warnings; CI exit code
arch-diagram check diagram.yaml --repo /path/to/repo --strict # also fail (exit 1) on low-severity findings

# MCP (the same capability as a tool)
check_consistency({ spec: "<yaml>" | path: "diagram.yaml", repo: "/path/to/repo" })   # -> CheckResult (JSON)
```

The MCP flow is: `analyze_codebase` → refine the spec → `render_diagram` → `check_consistency` to **verify** the diagram against the code before it ships.

## What it checks

Two directions over the same two artifacts (a validated architecture spec + a detection result):

| Direction | Question | Finding kind |
|---|---|---|
| spec → code | Does every node's technology claim have evidence in the code? | `missing-evidence` |
| code → spec | Is every detected technology drawn somewhere? | `undrawn` |

Matching is **icon-first** (the spec's explicit claim about technology), with a word-boundary **name match** as a fallback for generic or icon-less nodes. A node covers *every* tech its icon/name refers to — e.g. a `brand:nodejs` node covers both `express` and `nodejs` — so shared-icon siblings are never reported undrawn.

## Output contract

`checkConsistency(spec, detected)` (and the `check_consistency` MCP tool) returns:

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
  confidence: "high" | "medium" | "low";   // from the detection
  source: string;                          // evidence, e.g. "docker-compose.yml:services.cache.image"
  via: "icon" | "name";
}

interface CheckResult {
  findings: CheckFinding[];   // sorted high -> medium -> low
  matches: CheckMatch[];
  warnings: string[];         // e.g. "no recognizable manifests found in the repo"
  summary: { matched: number; missingEvidence: number; undrawn: number };
}
```

Returning structured findings (not just a text report) is deliberate — the same reason `detect` returns `detected[]` + `draftSpec`: the LLM can act on the result (explain, prune, or fix the spec) instead of parsing prose.

## Severity rules

Severity is **how specific the claim is** (missing-evidence) or **how confident the detection is** (undrawn), not a binary gate:

**missing-evidence** (spec → code):

- **high** — the node's icon is a mapped tech icon (a specific claim: `brand:redis`, `brand:kafka`) with no matching evidence.
- **medium** — the node's category is `external` or `security` (plausibly managed / not in local manifests), e.g. an `aws:s3` or `stripe` node.
- **low** — a generic/`file:` icon with no name match (a weak claim; may be an external system the codebase legitimately doesn't reference).

**undrawn** (code → spec):

- severity = the detection's `confidence` (high→high, medium→medium, low→low);
- **capped at low** for presence-based techs (`docker`, `kubernetes`, `github-actions`, `jenkins`, `gitlab-ci`) — a diagram may legitimately omit the platform/CI layer;
- **capped at low** for placeholder/unknown techs (k8s `service`/`ingress`, an unmapped compose service name) — these are not in the tech mapping, so no node can ever "cover" them and they must not fail a correct diagram.

**Global guard.** If `analyzeCodebase()` found no recognizable manifests, a warning is emitted and *all* missing-evidence severities are capped at low (the codebase is simply not readable by our detectors — findings are not trustworthy).

## Exit code (CLI)

- **0** — no high/medium findings (a clean or low-only report).
- **1** — one or more high/medium findings.
- `--strict` — also fails (exit 1) when there are *any* findings, including lows.
- Invalid spec, unreadable repo, or a non-architecture spec → error message, exit 1 (consistent with `render`).

## Deterministic vs. LLM boundary

The check is **deterministic and node-level only**: it matches spec nodes against detected technologies by icon and name. It does **not** infer semantic relationships — edge-level consistency ("the diagram shows web→api but the code suggests otherwise") is LLM territory, the same boundary as v0.9's edge inference. The LLM reads the structured `CheckResult`, explains or prunes findings, fixes the spec, and re-checks.

## Managed / external caveat

A node for a managed or external service (AWS S3, Stripe, Auth0, ...) may have **no local evidence even in a correct diagram** — the code talks to it over the network, so nothing in `package.json`/compose/k8s names it. This is handled by category-based severity (external/security = medium at most) and by the fact that such findings never block a non-`--strict` check. If a managed service is intentional, either accept the medium finding or add a node label/icon that matches a detected tech.

## Non-goals (MVP)

- C4 / uml-class specs (architecture type only — those engines have different node/icon models).
- Edge-level / semantic consistency (LLM territory, same boundary as v0.9).
- Auto-fixing or editing the spec from findings.
- Any layout/render/export changes — the check never touches rendering.
