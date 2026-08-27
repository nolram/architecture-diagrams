# ER diagram spec guide

A fifth diagram family on top of the same renderer. Select it with `type: er`
(the architecture spec keeps working unchanged -- `type` is optional and defaults to
`architecture`). This guide covers only the ER format; the shared fields
(`version`, `title`, `theme`, `direction`) and the export flags (`--png`, `--pdf`,
`--scale`) behave exactly as in `spec-guide.md`.

## General structure

```yaml
type: er                     # required for this family (selects the ER engine)
version: '1'                 # required, always the string '1'
title: Diagram title         # optional
theme: clean-light           # optional: clean-light (default) | midnight-dark
direction: auto              # optional: auto (default, resolves to down) | right | down
entities: [ ... ]            # required, at least 1
relationships: [ ... ]       # optional
```

Like the UML class spec there are no `groups`, `edges`, `icon`, or `category`
fields -- an ER diagram is entities plus the relationships between them.

## `entities`

Each entity is a box with a name and an optional list of attributes.

```yaml
entities:
  - id: order               # required, unique (letters/numbers/-/_)
    name: Order             # required, the displayed entity name
    weak: false             # optional; a weak entity renders a double border and
                            # REQUIRES at least one identifying relationship touching it
    attributes:             # optional list
      - name: id
        type: UUID          # optional, rendered as "id: UUID"
        key: primary        # optional: primary | foreign -> PK/FK badge + underlined attribute name
```

Notes:
- `key: primary` renders a **PK** badge next to the attribute and underlines its name; `key: foreign` renders an **FK** badge the same way. An entity with no attributes renders as a single-line box -- fine for a minimal model.
- A `weak: true` entity renders with a double border (the ER convention for entities that only exist through another entity, e.g. an order line without its own id). Validation enforces that at least one relationship with `identifying: true` touches it -- see [Common errors](#common-errors-and-how-the-renderer-reacts).
- `type` is a plain string; quote it when it contains a colon.

## `relationships`

Connections between two entities, drawn as crow's-foot notation. `from` → `to` is
the reading direction; each end gets a cardinality marker (see the table below).

```yaml
relationships:
  - from: order             # required, id of an existing entity
    to: line-item           # required, id of an existing entity
    label: has              # optional, rendered as a pill at the edge midpoint
    fromCardinality: one    # optional, default "one": one | zero-or-one | many | zero-or-many
    toCardinality: many     # optional, default "many"
    identifying: true       # optional; solid line. Absent/false -> dashed line.
```

Cardinalities and their crow's-foot markers:

| cardinality | marker | meaning |
|---|---|---|
| `one` | single tick | exactly one |
| `zero-or-one` | tick + circle | zero or one |
| `many` | crow's foot (three-pronged fork) | many |
| `zero-or-many` | circle + crow's foot | zero or many |

`identifying: true` renders a **solid** line -- the relationship that "owns" a weak
entity (the one that gives it identity). The default (absent or `false`) renders a
**dashed** line. Every weak entity needs at least one identifying relationship
touching it; non-weak entities can have either.

## Layout tips

- **Leave `direction` at `auto`** in most cases -- for ER diagrams it resolves to
  `down`, so the "owns" direction (customer → order → line item) reads top-down.
  Force `right` only if you want a left→right flow.
- **One relationship per pair of entities.** If two entities are linked twice
  (e.g. a customer both places and pays for orders), that is two distinct edges and
  is fine; but don't model the same semantic link twice.
- Keep attribute lists short. An entity with 15 attributes makes a very tall box and
  pushes the layout apart -- split into two entities if the model allows it.
- Put `identifying: true` on the relationship from the strong entity to the weak one
  (e.g. `order → order-line`), not the other way around.

## Common errors and how the renderer reacts

- **Duplicate entity ids, a relationship pointing to a non-existent entity, or a
  self-relationship**: validation fails (exit code 1) and prints the specific errors
  with the exact field path (e.g. `[relationships.2.to] references entity "db2", which
  does not exist. Defined entities: customer, order, product.`). Fix the spec and run it again.
- **`fromCardinality`/`toCardinality` with an unknown value**: validation fails
  listing the four allowed values (`one`, `zero-or-one`, `many`, `zero-or-many`).
- **A weak entity with no identifying relationship**: validation fails (exit code 1)
  pointing at the `weak` flag, e.g.
  `[entities.0.weak] weak entity "OrderLine" needs at least one identifying relationship (a relationship with identifying: true touching this entity).`
  Add an `identifying: true` relationship touching the entity (or drop `weak: true`).

## Full example

See `./er.example.yaml` -- an e-commerce data model that exercises every feature:
PK/FK badges, a weak entity (OrderLine) with its identifying relationship, all four
crow's-foot cardinalities, solid vs dashed lines, and edge labels.
