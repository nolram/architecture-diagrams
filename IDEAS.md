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

- 🟢 **C4 diagrams** (System Context / Container / Component) -- the de-facto
  standard for software architecture; fits the core use case and reuses a lot of
  what we already have. Draft spec: `architecture-diagrams/reference/c4-spec.md`.
- 💡 **UML sequence** -- the most-requested UML diagram after class; complements the
  class engine. Needs its own layout (lifelines + time axis).
- 💡 **ER (entity-relationship)** -- sibling of the class diagram; reuses boxes with
  attributes + relationships.
- 💡 **UML state / activity / use case** -- already in the ROADMAP backlog.

## Interoperability

- 💡 **Import Mermaid** -- parse Mermaid → our spec → render. Directly serves the
  "better than Mermaid" motivation: people with existing Mermaid diagrams can
  "upgrade" them. Start with `flowchart` only.
- 💡 **Export to draw.io / Excalidraw** -- manually editable output (ROADMAP backlog).
- 💡 **MCP server** -- a thin layer over the same engine, to work in AI clients
  besides Claude Code (ROADMAP backlog; low effort, high reach).

## AI-native features (the real differentiator)

- 💡 **Codebase → diagram** -- analyze a repo, detect the stack (`package.json`,
  `docker-compose`, k8s, ...), and auto-generate the diagram with the right icons.
  High effort, very high value.
- 💡 **Natural language → diagram** -- describe the system in prose, get a spec.
- 💡 **Consistency / validation** -- check the diagram against the real code
  ("you listed Redis but I don't see `redis` in the dependencies").

## Quality / polish

- 💡 **SVG accessibility** -- `<title>`/`<desc>` + color-contrast checking
  (ROADMAP backlog).
- 💡 **Custom / brand themes** -- company colors, logo, more themes.
- 💡 **Interactive HTML export** -- hover/click to highlight connections.
- 💡 **Visual diagram diff** -- compare two specs (great for PRs; we already have the
  byte-identical gate pattern to build on).

## Suggested next 3 (if we pick)

1. **C4** -- highest value for the "architecture" use case; the foundation makes it viable.
2. **MCP server** -- extends reach with low effort.
3. **Codebase → diagram** -- the AI differentiator that justifies the project.
