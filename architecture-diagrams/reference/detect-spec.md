# Codebase → diagram (detect)

Point the tool at a repository and it detects the stack, maps each technology to a curated icon, and emits a **draft architecture spec** that the existing pipeline renders. This is the "AI differentiator": the mechanical part (read manifests, detect tech, map icons, build a draft spec) is done deterministically and offline, and the LLM does the semantic part (prune false positives, add inferred edges, relabel) before rendering.

## Commands

```bash
# CLI
arch-diagram detect /path/to/repo                 # detected stack + draft spec (YAML) to stdout
arch-diagram detect /path/to/repo --render        # also render the draft spec to SVG
arch-diagram detect /path/to/repo --render -o out.svg

# MCP (the same capability as a tool)
analyze_codebase({ path: "/path/to/repo" })       # -> { detected, draftSpec, warnings }
```

The MCP flow is: `analyze_codebase` → review/prune the `detected` list and `draftSpec` → `render_diagram` with the refined spec.

## What it reads

Detection is **presence + manifest-driven**, not source-code analysis. It reads declarative files (fast, stable, offline) and infers the architecture from them:

| Source file | Extract | Maps to |
|---|---|---|
| `package.json` | `dependencies` (not `devDependencies`) | app runtime + frameworks + DB/queue drivers |
| `docker-compose.yml` / `.yaml` | `services[].image`, `depends_on` | infra nodes (DB/cache/queue) + edges + boundary group |
| k8s manifests (`*.yml`/`*.yaml`) | `Deployment`, `Service`, `Ingress`, `Namespace`, `StatefulSet` | service nodes + edges + a group per namespace |
| `Dockerfile` / `dockerfile` / `.docker/Dockerfile` | `FROM` (base image), `EXPOSE` (ports) | runtime tech (if the base is recognizable) |
| `.github/workflows/*.yml`, `Jenkinsfile`, `.gitlab-ci.yml` | presence | CI/CD node |

## Output contract

`analyzeCodebase(path)` (and the `analyze_codebase` MCP tool) returns:

```ts
interface DetectedTech {
  tech: string;        // "postgres", "redis", "express", "python", "github-actions", ...
  iconKey: string;     // "brand:postgresql"
  category: IconCategory;
  shape: "card" | "database" | "actor" | "cloud";
  confidence: "high" | "medium" | "low";
  source: string;      // "package.json:dependencies.pg" | "k8s/deployment.yaml:kind=Deployment,name=web-app"
}

interface DetectionResult {
  detected: DetectedTech[];   // the detected stack, with evidence
  draftSpec: DiagramSpec;     // a valid architecture spec, ready to render
  warnings: string[];         // ambiguous / low-confidence items, for the LLM/user
}
```

Returning `detected` + `draftSpec` (not just an SVG) is deliberate: it keeps the mechanical part inspectable and testable, and hands the LLM a structured surface to refine.

## Tech → icon mapping

The mapping table (`src/detect/mapping.ts`) is the core data asset. Every key is verified present in the icon catalog (`npm run validate:icons`). A sketch:

| Detected (evidence) | → catalog key | category / shape |
|---|---|---|
| `express` / `next` / `react` (package.json) | `brand:nodejs` / `brand:nextjs` / `brand:react` | compute / card |
| `pg` (driver) or compose image `postgres` | `brand:postgresql` | database / **database** |
| `mysql2` / `mysql` | `brand:mysql` | database / database |
| `ioredis` / `redis` | `brand:redis` | database / card |
| `mongoose` | `brand:mongodb` | database / database |
| `kafkajs` or compose `kafka` | `brand:kafka` | messaging / card |
| `amqplib` or compose `rabbitmq` | `brand:rabbitmq` | messaging / card |
| compose `nginx` | `brand:nginx` | network / card |
| `Dockerfile` `FROM node/python/golang/...` | `brand:nodejs` / `brand:python` / `brand:go` / ... | compute / card |
| k8s manifests present | `brand:kubernetes` | compute / card |
| k8s `Ingress` | `generic:api` | network / card |
| `.github/workflows` present | `brand:github-actions` | generic / card |
| `Jenkinsfile` present | `brand:jenkins` | generic / card |
| `.gitlab-ci.yml` present | `brand:gitlab` | generic / card |
| `auth0` / `okta` | `brand:auth0` / `brand:okta` | security / card |
| `stripe` | `brand:stripe` | external / card |
| unknown / unmapped | `generic:service` / `generic:database` / `generic:queue` | per inferred category |

A detected tech with no catalog key falls back to a `generic:*` shape (the existing graceful-fallback path) and is surfaced as a warning.

## Confidence levels

Every detection carries `confidence` + `source` so the LLM (or user) can prune:

- **high** -- we own the evidence. A compose `postgres` service, a k8s `Deployment`, a `Dockerfile` `FROM python`, a present CI config.
- **medium** -- a *driver* (`pg`, `ioredis`, `mongoose`) implies a dependency on that technology, not necessarily a node we own (it may be managed/external).
- **low** -- an unrecognized compose image that fell back to a generic icon.

## Deterministic vs. LLM edge boundary

The tool emits **high-confidence, deterministic edges only**:

- compose `depends_on` → edge;
- k8s `Ingress → Service → Deployment` (matched by selector labels) → edges;
- app → data store when a DB driver is detected **and** a matching node exists.

**Semantic** edges (e.g. "service A calls service B over REST") are **not** inferred deterministically -- that is the LLM's job. The LLM reads `detected` + `draftSpec`, prunes false positives, adds the semantic edges it can infer from context, relabels nodes, and then renders.

## Spec generation rules

- **Nodes** -- one per detected service: the app itself, each compose service, each k8s `Deployment`/`StatefulSet` (icon by container image if recognizable, else generic), each k8s `Ingress` (network), a runtime node from a recognizable `Dockerfile` `FROM`, and a CI node. DB/cache/queue get `shape: database` (or `category: messaging` for queues).
- **Groups** -- a compose project → a `boundary` group; a k8s `Namespace` → a `boundary` group (nodes placed inside it).
- **Edges** -- the deterministic set above.

The generated object always satisfies `DiagramSpecSchema` (`src/spec/schema.ts`), so it passes `validateSpecText()` unchanged and renders through the existing pipeline.

## Non-goals (MVP)

- Source-code / call-graph analysis (LLM territory).
- Python/Go/Ruby/.NET *package* detection (the `Dockerfile` `FROM` runtime is detected; `pyproject.toml`/`go.mod` are a later increment).
- Terraform / cloud-provider resource detection (later increment).
- Auto-editing or round-tripping the spec back into the repo.
- Any new rendering capability -- it reuses `renderSpec()` as-is.
