---
name: architecture-diagrams
description: Generates rich, visually professional software/infrastructure architecture diagrams (real AWS/Azure/GCP/Kubernetes/brand icons, cards with shadows, boundaries like VPC/subnet, automatic layout) and UML class diagrams (classes with attributes/methods, all six relationship kinds) -- far more elaborate than a standard Mermaid diagram. Use whenever the user asks for an architecture diagram, system diagram, infrastructure/cloud diagram, a UML class diagram / domain model, or explicitly asks for something "prettier"/"more professional" than Mermaid to represent software components and how they connect.
---

# Architecture Diagrams

A custom renderer (ELK.js for layout + real icons via `thesvg`/Iconify + hand-drawn SVG with shadow/gradient/rounded corners) that turns a structured YAML spec into a presentation-ready architecture diagram. You (the AI) write the spec; the renderer handles 100% of the design.

## Diagram families

Two families share the same renderer, selected by the spec's `type` field:

- **Architecture** (default -- omit `type` or set `type: architecture`): components, boundaries, connections. Rules in `reference/spec-guide.md`.
- **UML class** (`type: uml-class`): classes with attributes/methods plus the six UML relationship kinds (association, aggregation, composition, inheritance, dependency, realization). Rules in `reference/uml-class-spec.md`, runnable example in `reference/uml-class.example.yaml`. The workflow below is the same for both families.

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
