---
name: architecture-diagrams
description: Generates rich, visually professional software/infrastructure architecture diagrams (real AWS/Azure/GCP/Kubernetes/brand icons, cards with shadows, boundaries like VPC/subnet, automatic layout), UML class diagrams (classes with attributes/methods, all six relationship kinds), UML sequence diagrams (participants, messages, activation bars, fragments), C4 diagrams (System Context / Container / Component -- people, systems, external systems, containers, components), and ER diagrams (entities with PK/FK attributes, weak entities, crow's-foot relationships) -- far more elaborate than a standard Mermaid diagram. Use whenever the user asks for an architecture diagram, system diagram, infrastructure/cloud diagram, a UML class diagram / domain model, a UML sequence diagram, a C4 diagram, an ER diagram / database schema / data model, or explicitly asks for something "prettier"/"more professional" than Mermaid to represent software components and how they connect.
---

# Architecture Diagrams

A custom renderer (ELK.js for layout + real icons via `thesvg`/Iconify + hand-drawn SVG with shadow/gradient/rounded corners) that turns a structured YAML spec into a presentation-ready architecture diagram. You (the AI) write the spec; the renderer handles 100% of the design.

## Diagram families

Five families share the same renderer, selected by the spec's `type` field:

- **Architecture** (default -- omit `type` or set `type: architecture`): components, boundaries, connections. Rules in `reference/spec-guide.md`.
- **UML class** (`type: uml-class`): classes with attributes/methods plus the six UML relationship kinds (association, aggregation, composition, inheritance, dependency, realization). Rules in `reference/uml-class-spec.md`, runnable example in `reference/uml-class.example.yaml`.
- **UML sequence** (`type: uml-sequence`): participants (objects or actors), synchronous/asynchronous/reply/self messages, activation bars, and alt/loop/opt/par fragments over message ranges. Rules in `reference/uml-sequence-spec.md`, runnable example in `reference/uml-sequence.example.yaml`.
- **C4** (`type: c4`): System Context / Container / Component diagrams -- people, systems, external systems, containers, and components with directed relationships. Rules in `reference/c4-spec.md`, runnable example in `reference/c4.example.yaml`.
- **ER** (`type: er`): entities with attributes (PK/FK badges), weak entities (double border), and crow's-foot relationships (one / zero-or-one / many / zero-or-many); `identifying: true` renders a solid line and is required for at least one relationship touching each weak entity. Rules in `reference/er-spec.md`, runnable example in `reference/er.example.yaml`.

The workflow below is the same for all five families.

### C4

Three zoom levels, selected with `level` (default `context`): `context` (the system, its users, and the external systems it talks to), `container` (one system and the containers inside it), and `component` (one container and the components inside it). Element types: `person`, `system`, `external-system`, `container`, `component`; nesting is expressed with `group` (a `container` inside a `system`, a `component` inside a `container` -- only `system`/`container` can be parents, and a `person` is never nested; a `system`/`container` can itself be grouped inside another for sub-boundaries). A `person` renders as a hand-drawn silhouette (no box), an `external-system` as a dashed box, and a `system`/`container` with children as a boundary box. `description` + `technology` render combined as `"description (technology)"`.

Optional extras (all backward-compatible): an element `icon` (same catalog as the architecture family -- a `person` ignores it), a lifecycle `status` on elements and relationships (`active` default | `deprecated` | `suspended` | `planned`, rendered dashed + dimmed + tagged), and a top-level `wrap.maxLines` (default 6, range 1..16) that caps how many lines a description/label wraps onto -- boxes grow to fit the text instead of truncating it, so typical C4 descriptions render whole.

## Workflow

1. **Write the YAML spec** describing nodes (components), groups (boundaries like VPC/subnet/logical layer), and edges (connections). Full rules in `reference/spec-guide.md` -- read it before the first time you use this skill in the conversation.
2. **Pick icons from the catalog** -- don't invent keys. Search quickly in the terminal (more practical than opening the whole `reference/icon-catalog.md`):
   ```bash
   bash <this-skill-path>/scripts/render.sh icons postgres
   ```
   If you can't find a specific brand (the curated catalog has ~195 entries, it's not exhaustive), use a `generic:*` icon (e.g. `generic:database`, `generic:server`, `generic:queue`) instead of guessing a key.
3. If the use case resembles something common (web app, microservices with a queue, multi-AZ VPC, data pipeline), start from a ready-made example in `reference/patterns.md` and adapt it.
4. Save the spec in a `.yaml` file (any working directory for the current task is fine).
5. Render it:
   ```bash
   bash <this-skill-path>/scripts/render.sh diagram.yaml --png -o diagram.svg
   ```
   This generates `diagram.svg` and `diagram.png` side by side. Use `--png` whenever you need to view the result (e.g. with an image-reading tool) -- plain SVG isn't viewable as an image by every tool. Use `--pdf` instead of (or in addition to) `--png` if the user wants a file ready to print/attach (the PDF page comes out sized exactly to the diagram).
6. **Read the command output before considering the task done:**
   - If the spec is invalid, the command fails (exit code 1) and prints the exact errors (field + reason). Fix the spec and run it again -- don't guess what's wrong, the error already tells you.
   - Icon-not-found warnings show up under `Warnings:` on stderr but do **not** fail the command (a generic badge with the name's initial is used instead). If a warning shows up, swap the icon key for a real one from the catalog and run it again before delivering the result.
7. View the generated PNG to check the result before presenting it to the user.

## Available themes

`clean-light` (default, light background) and `midnight-dark` (dark background) -- choose via the `theme` field in the spec, based on context (e.g. a dark-slide presentation, or light documentation).

## Watch mode (human use, not for the AI)

`--watch` re-renders on its own on every save of the spec file -- useful if the user is editing the spec manually alongside you and wants to see the result update live. Using `--watch` doesn't make sense in the AI's normal flow (which generates the spec once and runs a single render).

## First run

If `scripts/render.sh` fails because `dist/cli.js` doesn't exist, it runs `npm install && npm run build` automatically on its own the first time -- this only happens once per project checkout.

## Codebase → diagram (detect)

Instead of writing the spec from scratch, you can point the tool at a repository and it will **detect the stack** (from `package.json`, `docker-compose`, k8s manifests, `Dockerfile`, and CI configs), map each technology to a curated icon, and emit a **draft architecture spec** (nodes, groups, edges). The detection is deterministic and offline -- no source-code analysis -- and every detection carries a `confidence` + `source` so you can prune false positives and add semantic edges before rendering.

```bash
bash <this-skill-path>/scripts/render.sh detect /path/to/repo
# prints the detected stack + a draft spec (YAML) to stdout

bash <this-skill-path>/scripts/render.sh detect /path/to/repo --render -o detected.svg
# also renders the draft spec to SVG
```

Workflow: run `detect`, read the `detected` list (each entry has `tech`, `iconKey`, `confidence`, `source`), prune anything that's a false positive, add the semantic edges the detection can't infer, save the result as a spec, then render it as usual. Full reference: `reference/detect-spec.md`.

## Consistency check (spec ↔ code)

The inverse of `detect`: after you've written (or refined) an architecture spec, check it against a real codebase in both directions — **missing-evidence** (a node claims a technology the code shows no evidence for) and **undrawn** (the code shows evidence for a technology the diagram omits). It is deterministic and offline, reusing the same detection core.

```bash
bash <this-skill-path>/scripts/render.sh check diagram.yaml --repo /path/to/repo
# prints matches, findings grouped by severity, and warnings;
# exit 0 when no high/medium findings, 1 otherwise (--strict also fails on lows)
```

Findings are severity-ranked (`high`/`medium`/`low`), not a binary pass/fail: diagrams legitimately include external/managed systems with no local evidence, and codebases legitimately contain platform layers (docker/k8s/CI) a focused diagram omits. Read the findings, fix or justify the spec, and re-check. Full reference: `reference/check-spec.md`.

## Import Mermaid (flowchart → spec)

If the user already has a Mermaid diagram (or asks for something "prettier than Mermaid" they can hand over), don't redraw it by hand -- **import it**: the tool parses a Mermaid `flowchart`/`graph` and converts it to a valid architecture spec (cylinders → databases, other shapes → cards, subgraphs → boundary groups, arrow styles/directions preserved). The conversion is deterministic; styling (`classDef`/`style`/`linkStyle`/`click`) is dropped with warnings, and imported nodes have **no icons** -- that's your job next.

```bash
bash <this-skill-path>/scripts/render.sh import diagram.mmd
# prints the converted architecture spec (YAML) to stdout; warnings on stderr

bash <this-skill-path>/scripts/render.sh import diagram.mmd --render -o imported.svg
# also renders the converted spec to SVG
```

Workflow: run `import`, read the warnings, refine the spec (add `icon` + `category` per node, fix edges, adjust labels/direction), save it, then render as usual. Full reference: `reference/mermaid-import-spec.md`.

## MCP server (alternative)

An MCP server is also available (`arch-diagram mcp`) as an alternative to the render script, for use in MCP clients (Claude Desktop, Cursor, ...). See `reference/mcp.md` for setup and the tool reference. It exposes the same tools as the CLI, including `analyze_codebase` (the MCP form of `detect`: pass a `path`, get back the detected stack + a draft spec to refine and pass to `render_diagram`), `check_consistency` (the MCP form of `check`: pass a `spec`/`path` + `repo`, get back a severity-ranked report to verify the diagram against the code), and `import_mermaid` (the MCP form of `import`: pass a `mermaid` string or a `.mmd` `path`, get back the converted spec + warnings to refine and pass to `render_diagram`).
