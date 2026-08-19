# C4 diagram spec guide

A third diagram family on top of the same renderer. Select it with `type: c4`
(the architecture and UML class specs keep working unchanged -- `type` is optional
and defaults to `architecture`). This guide covers only the C4 format; the shared
fields (`version`, `title`, `theme`, `direction`) and the export flags (`--png`,
`--pdf`, `--scale`) behave exactly as in `spec-guide.md`.

> **Status: draft.** The C4 engine is not implemented yet. This spec is the target
> format for it, written to fit the v0.5 multi-engine foundation (a thin
> `DiagramEngine` of validate → layout → render that reuses the shared ELK layout,
> theme, SVG utils, and PNG/PDF export).

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
elements: [ ... ]           # required, at least 1
relationships: [ ... ]      # optional
```

Unlike the architecture spec there is no separate `groups`/`nodes`/`edges` split --
C4 has one `elements` list (each element typed) and one `relationships` list.
Nesting (a container inside a system) is expressed with `group` on the element,
the same idea as the architecture spec's `group`.

## `level`

The C4 zoom level. It is a hint to the renderer and a validation aid -- it tells the
renderer which element types are expected and how to lay them out:

| level | shows | typical element types |
|---|---|---|
| `context` (default) | the system, its users, and the external systems it talks to | `person`, `system`, `external-system` |
| `container` | one system and the containers (apps, databases, ...) inside it | `system`, `container`, `external-system` |
| `component` | one container and the components inside it | `container`, `component` |

`level` does not forbid other element types -- it only guides layout and the legend.
You can mix types freely; the renderer draws each element by its own `type`.

## `elements`

Each element is a box (or a person figure) in the diagram.

```yaml
elements:
  - id: alice                 # required, unique (letters/numbers/-/_)
    name: Alice               # required, the displayed name
    type: person              # required: person | system | external-system | container | component
    description: A shop customer   # optional, rendered as smaller text under the name
    technology: Web browser        # optional, rendered in parentheses after the description
    group: shop               # optional, id of a parent element -- visually nests this element inside it
```

`type` and how it is drawn:

| type | drawn as | use for |
|---|---|---|
| `person` | a person figure (no box) | a user/actor of the system |
| `system` | a solid rounded box | the software system being described |
| `external-system` | a dashed rounded box | a system outside the one being described |
| `container` | a solid rounded box (container palette) | an application, database, website, queue, ... inside a system |
| `component` | a solid rounded box (component palette) | a component inside a container |

Notes:
- `description` and `technology` are plain strings. `technology` is rendered in
  parentheses (C4 convention) after the description, e.g. `description: Stores orders`
  + `technology: PostgreSQL` → "Stores orders (PostgreSQL)".
- `group` nests an element inside another (e.g. a `container` inside a `system`, a
  `component` inside a `container`). The parent must be an element that can contain
  others (`system` or `container`).
- A `person` element has no box, so `group` does not apply to it.

## `relationships`

Directed connections between two elements.

```yaml
relationships:
  - from: alice              # required, id of an existing element
    to: shop                 # required, id of an existing element
    description: places an order   # optional, rendered as the edge label
    technology: HTTPS          # optional, rendered in parentheses after the description
```

Notes:
- `from` → `to` is the reading direction (the arrow points at `to`).
- `description` is the edge label; `technology` is appended in parentheses (C4
  convention), e.g. "places an order (HTTPS)".
- **One relationship per pair of elements.** If two elements talk in both
  directions, use a single relationship with a combined description rather than two
  overlapping edges (same rule as the architecture spec).

## Layout tips

- **Leave `direction` at `auto`** in most cases. C4 diagrams usually read left→right
  (person on the left, system in the middle, external systems on the right), so the
  renderer will prefer `right` for `context`/`container` levels.
- **Set `level`** to match what you are drawing -- it tunes the layout and legend.
- Keep `description`s short; long edge labels collide. Move detail into the
  element's `description` instead.
- Nest containers inside their system with `group` so the boundary is drawn.

## Common errors and how the renderer reacts

- **Duplicate element ids, a relationship pointing to a non-existent element, or a
  `group` referencing a non-existent element**: validation fails (exit code 1) and
  prints the specific errors with the exact field path (e.g.
  `[relationships.1.to] references element "db2", which does not exist`).
- **A `person` element with a `group`**: validation fails (people are not nested).
- **`type` with an unknown value**: validation fails listing the allowed types.

## Full example

To be added once the C4 engine is implemented -- a System Context diagram of an
online shop: a `person` (customer), the `system` (Shop), and two
`external-system`s (Payment Provider, Email Provider), with the relationships
between them.
