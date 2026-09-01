# Timeline diagram spec guide

A sixth diagram family on top of the same renderer. Select it with `type: timeline`
(the architecture spec keeps working unchanged -- `type` is optional and defaults to
`architecture`). This guide covers only the timeline format; the shared fields
(`version`, `title`, `theme`, `direction`) and the export flags (`--png`, `--pdf`,
`--scale`) behave exactly as in `spec-guide.md`.

## General structure

```yaml
type: timeline               # required for this family (selects the timeline engine)
version: '1'                 # required, always the string '1'
title: Diagram title         # optional
theme: clean-light           # optional: clean-light (default) | midnight-dark
direction: auto              # optional: auto (default, resolves to right) | right | down
phases: [ ... ]              # required, at least 1
relationships: [ ... ]       # optional
```

Like the UML sequence spec there are no `groups`, `edges`, `icon`, or `category`
fields -- a timeline is phases plus the relationships between them.

## `phases`

Each phase is a box in the line with a label and an optional list of bullet items.
The `kind` field picks the shape: a **gate** renders as a diamond (a checkpoint /
decision point), a **phase** renders as a rounded card (a regular work stage).

```yaml
phases:
  - id: gate0               # required, unique (letters/numbers/-/_)
    label: Gate 0 -- Security   # required, the displayed phase name
    kind: gate            # optional, default "phase": gate (diamond) | phase (rounded card)
    items:                # optional list of short bullet lines
      - Remove hardcoded secrets
      - Migrate to vault + rotation
```

Notes:
- `kind: gate` renders a **diamond** head (the label) with the `items` in a rounded
  panel beneath it -- the timeline convention for a checkpoint or approval gate.
  `kind: phase` (the default) renders a single **rounded card** with the label on
  top and the `items` as bullet lines below a divider.
- A phase with no `items` renders as a single-line box (just the label) -- fine for
  a minimal roadmap.
- `items` are plain strings, rendered one per line with a bullet dot; keep them short.

## `relationships`

Connections between two phases, drawn as arrows. `from` → `to` is the reading
direction. Whether an arrow is **solid** or **dashed** depends on the two phases'
positions in the `phases` list, not on a field:

- A relationship whose endpoints are **consecutive** in `phases` (neighbours in the
  line) renders as a **solid flow arrow** -- the natural step from one stage to the
  next.
- A relationship whose endpoints are **non-consecutive** (it skips over at least one
  phase) renders as a **dashed arrow** routed above/beside the line -- a dependency
  or "unlocks" link that jumps across the timeline.

```yaml
relationships:
  - from: gate0             # required, id of an existing phase
    to: wave1               # required, id of an existing phase
    label: unlocks          # optional, rendered as a pill at the edge midpoint
```

There is no `identifying` / cardinality field -- the solid-vs-dashed distinction is
derived from the phases' order. Every consecutive pair in `phases` gets a solid flow
arrow automatically (even without an explicit relationship); a relationship only adds
a `label` to that arrow, or draws a dashed arrow for a non-consecutive pair.

## Layout tips

- **Leave `direction` at `auto`** in most cases -- for timeline diagrams it resolves
  to `right`, so the plan reads left→right (gate → wave 1 → wave 2 → ...). Force
  `down` only if you want a top→bottom flow.
- **Keep `items` short.** A phase with long or many items makes a very wide/tall box
  and pushes the line apart -- split into two phases if the plan allows it.
- **Use gates for checkpoints.** A `kind: gate` (diamond) marks a decision or
  approval point (e.g. "Gate 0 -- Security"); regular work stages stay `kind: phase`.
- **Model the natural order in `phases`.** Consecutive phases get solid flow arrows
  for free; reserve `relationships` for labels and for non-consecutive (dashed) links
  like a gate that "unlocks" a later wave.

## Common errors and how the renderer reacts

- **Duplicate phase ids, a relationship pointing to a non-existent phase, or a
  self-relationship**: validation fails (exit code 1) and prints the specific errors
  with the exact field path (e.g. `[relationships.2.to] references phase "db2", which
  does not exist. Defined phases: gate0, wave1, wave2.`). Fix the spec and run it again.
- **`kind` with an unknown value**: validation fails listing the two allowed values
  (`gate`, `phase`).
- **An `id` with characters other than letters, numbers, `-`, or `_`**: validation
  fails pointing at the offending `phases[i].id`.

## Full example

See `./timeline.example.yaml` -- a phased execution plan that exercises every feature:
a gate (diamond) followed by three phases (rounded cards), each with bullet items,
solid flow arrows between consecutive phases, and a labelled relationship.
