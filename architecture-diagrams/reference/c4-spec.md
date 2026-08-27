# C4 diagram spec guide

A fourth diagram family on top of the same renderer. Select it with `type: c4`
(the architecture and UML class specs keep working unchanged -- `type` is optional
and defaults to `architecture`). This guide covers only the C4 format; the shared
fields (`version`, `title`, `theme`, `direction`) and the export flags (`--png`,
`--pdf`, `--scale`) behave exactly as in `spec-guide.md`.

> **Status: implemented** (v0.6). The C4 engine ships on the v0.5 multi-engine
> foundation (a thin `DiagramEngine` of validate → layout → render that reuses the
> shared ELK layout, theme, SVG utils, and PNG/PDF export); the format below is the
> supported one.

C4 is a software-architecture visualisation method with three "zoom" levels:
**System Context**, **Container**, and **Component**. A C4 diagram is a set of
*elements* (people, systems, containers, components) plus the directed
*relationships* between them.

## General structure

```yaml
type: c4                    # required for this family (selects the C4 engine)
version: '1'                # required, always the string '1'
title: Diagram title        # optional
theme: clean-light          # optional: clean-light (default) | midnight-dark
direction: auto             # optional: auto (default) | right (left→right) | down (top→bottom)
level: container            # optional: context (default) | container | component
wrap:                       # optional, see "wrap" below
  maxLines: 6               #   optional: 1..16 (default 6) -- max wrapped lines before folding
elements: [ ... ]           # required, at least 1
relationships: [ ... ]      # optional
```

Unlike the architecture spec there is no separate `groups`/`nodes`/`edges` split --
C4 has one `elements` list (each element typed) and one `relationships` list.
Nesting (a container inside a system) is expressed with `group` on the element,
the same idea as the architecture spec's `group`.

## `level`

The C4 zoom level. It is a semantic hint about what you are drawing, and it heads the
legend (the color key) with the matching title:

| level | shows | typical element types | legend heading |
|---|---|---|---|
| `context` (default) | the system, its users, and the external systems it talks to | `person`, `system`, `external-system` | "System Context" |
| `container` | one system and the containers (apps, databases, ...) inside it | `system`, `container`, `external-system` | "Container" |
| `component` | one container and the components inside it | `container`, `component` | "Component" |

`level` does not forbid other element types -- you can mix types freely; the renderer
draws each element by its own `type`. It does not change the layout algorithm; its
visible effect is the legend heading.

## Legend

When a diagram mixes two or more element types, a color-key legend is drawn below the
diagram. It lists each element type present (`person`, `system`, `external-system`,
`container`, `component`) with its color, and is headed by the `level` title above. A
single-type diagram omits the legend to avoid noise.

## `elements`

Each element is a box (or a hand-drawn silhouette, for `person`) in the diagram.

```yaml
elements:
  - id: alice                 # required, unique (letters/numbers/-/_)
    name: Alice               # required, the displayed name
    type: person              # required: person | system | external-system | container | component
    description: A shop customer   # optional, rendered as smaller text under the name (wraps, see "wrap")
    technology: Web browser        # optional, rendered in parentheses after the description
    group: shop               # optional, id of a parent element -- visually nests this element inside it
    icon: generic:user        # optional, a catalog key ("vendor:name") or "file:path/to/icon.svg"
    status: active            # optional: active (default) | deprecated | suspended | planned
```

`type` and how it is drawn:

| type | drawn as | use for |
|---|---|---|
| `person` | a hand-drawn silhouette (no box) | a user/actor of the system |
| `system` | a solid rounded box; a boundary box when it has children | the software system being described |
| `external-system` | a dashed rounded box | a system outside the one being described |
| `container` | a solid rounded box (container palette); a boundary box when it has children | an application, database, website, queue, ... inside a system |
| `component` | a solid rounded box (component palette) | a component inside a container |

Notes:
- `description` and `technology` are plain strings. `technology` is rendered in
  parentheses (C4 convention) after the description, e.g. `description: Stores orders`
  + `technology: PostgreSQL` → "Stores orders (PostgreSQL)".
- `group` nests an element inside another (e.g. a `container` inside a `system`, a
  `component` inside a `container`). The parent must be an element that can contain
  others (`system` or `container`). Nesting is recursive -- a `system` or `container`
  can itself be grouped inside another, giving sub-boundaries (a boundary within a
  boundary) to any depth.
- A `person` element has no box, so `group` does not apply to it.
- `icon` (optional) draws a small badge with the icon in the top-left of the element's
  card, using the same catalog as the architecture family (`brand:nodejs`,
  `aws:rds`, `generic:database`, ... or `file:./logo.svg`). It is honored on
  `system`/`external-system`/`container`/`component`; a `person` keeps its silhouette
  and ignores `icon`, and a `system`/`container` with children (a boundary) ignores
  `icon` too -- boundaries render a title, not a badge, so a warning is printed (the
  render still succeeds). A key that does not resolve falls back to a generic badge
  and a warning is printed (the render still succeeds).
- `status` (optional, default `active`) marks the lifecycle of an element. `active`
  is drawn normally; `deprecated`, `suspended`, and `planned` are drawn with a dashed
  border, reduced opacity, and a small uppercase tag in the top-right corner. Any
  non-active status present in the diagram also adds a dashed entry to the legend.

## `relationships`

Directed connections between two elements.

```yaml
relationships:
  - from: alice              # required, id of an existing element
    to: shop                 # required, id of an existing element
    description: places an order   # optional, rendered as the edge label (wraps, see "wrap")
    technology: HTTPS          # optional, rendered in parentheses after the description
    status: active             # optional: active (default) | deprecated | suspended | planned
```

Notes:
- `from` → `to` is the reading direction (the arrow points at `to`).
- `description` is the edge label; `technology` is appended in parentheses (C4
  convention), e.g. "places an order (HTTPS)".
- `status` (optional, default `active`) marks the lifecycle of the connection.
  `active` is drawn as a solid line; `deprecated`, `suspended`, and `planned` are
  drawn dashed with reduced opacity (the same visual language as element status).
- **Prefer one relationship per pair of elements.** If two elements talk in both
  directions, a single relationship with a combined description is usually clearer.
  Parallel edges (two relationships with the same `from`/`to`) are supported and
  their labels are spaced so they don't collide, but they can clutter a diagram.

## `wrap`

C4 diagrams carry real descriptions, so boxes **grow to fit their text** rather than
truncating it: a card widens (up to a generous cap) and wraps its description onto as
many lines as needed, and a `person` widens to fit both its name and its description.
The `wrap` block only caps how many lines that wrapping may use:

```yaml
wrap:
  maxLines: 6     # optional: 1..16 (default 6)
```

- Text is wrapped on word boundaries to the element/label width. `maxLines` is the
  maximum number of lines; any overflow beyond it is folded into a trailing ellipsis
  (so a single absurdly long string can never blow up the layout). With the default
  of 6 and the wider boxes, typical C4 descriptions fit whole with no ellipsis.
- It applies to element `description`s (cards and `person`) and to relationship
  labels. Boundary descriptions stay single-line (truncated) by design -- they are a
  group label and must never collide with the children below. `maxLines: 1`
  reproduces the old single-line, truncated behavior.
- The layout reserves the space for the wrapped lines, so boxes grow taller and labels
  get a taller pill -- nothing overlaps.

## Layout tips

- **Leave `direction` at `auto`** in most cases. C4 diagrams usually read left→right
  (person on the left, system in the middle, external systems on the right), and
  `auto` resolves to `right`.
- **Set `level`** to match what you are drawing -- it heads the legend
  ("System Context" / "Container" / "Component").
- Long `description`s and edge labels wrap and the boxes grow to fit them (see
  `wrap`); if a label still looks crowded, shorten it or raise `wrap.maxLines`.
- Nest containers inside their system with `group` so the boundary is drawn; nest a
  `system`/`container` inside another for sub-boundaries.
- Use `status` to flag `deprecated`/`suspended`/`planned` elements and connections --
  they render dashed and dimmed so the eye skips them.

## Common errors and how the renderer reacts

- **Duplicate element ids, a relationship pointing to a non-existent element, or a
  `group` referencing a non-existent element**: validation fails (exit code 1) and
  prints the specific errors with the exact field path (e.g.
  `[relationships.1.to] references element "db2", which does not exist`).
- **A `person` element with a `group`**: validation fails (people are not nested).
- **A self-relationship** (`from` and `to` the same element): validation fails.
- **`type` with an unknown value**: validation fails listing the allowed types.
- **`status` with an unknown value**: validation fails listing the allowed statuses
  (`active`, `deprecated`, `suspended`, `planned`).
- **`icon` with a malformed key**: validation fails (it must be `vendor:name` or
  `file:path/to/icon.svg`). A *well-formed* key that simply does not exist in the
  catalog is not a validation error -- it falls back to a generic badge with a warning.
- **`wrap.maxLines` out of range**: validation fails (it must be an integer 1..16).

## Full example

See `./c4.example.yaml` -- a System Context diagram of an online shop: a `person`
(customer), the `system` (Online Shop), and two `external-system`s (Stripe,
SendGrid), with the relationships between them. A runnable copy lives in
`examples/c4/context.yaml`; render it with the usual workflow
(`bash scripts/render.sh examples/c4/context.yaml --png`).

A richer Container diagram that exercises the v0.7 features -- `icon` on every leaf
element (boundaries have no icon), a sub-boundary (`Settlement` nested inside
`Payment Core`), `status` on elements and relationships (`deprecated`/`suspended`/
`planned`), and `wrap.maxLines` on long descriptions/labels -- lives in
`examples/c4/batch-payments.yaml`.
