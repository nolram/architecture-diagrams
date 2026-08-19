# UML class diagram spec guide

A second diagram family on top of the same renderer. Select it with `type: uml-class`
(the architecture spec keeps working unchanged -- `type` is optional and defaults to
`architecture`). This guide covers only the UML class format; the shared fields
(`version`, `title`, `theme`, `direction`) and the export flags (`--png`, `--pdf`,
`--scale`) behave exactly as in `spec-guide.md`.

## General structure

```yaml
type: uml-class              # required for this family (selects the UML class engine)
version: '1'                 # required, always the string '1'
title: Diagram title         # optional
theme: clean-light           # optional: clean-light (default) | midnight-dark
direction: auto              # optional: auto (default) | right (left→right) | down (top→bottom)
classes: [ ... ]             # required, at least 1
relationships: [ ... ]       # optional
```

Unlike the architecture spec there are no `groups`, `edges`, `icon`, or `category`
fields -- a class diagram is classes plus the relationships between them.

## `classes`

Each class is a box with up to three compartments: name, attributes, methods.

```yaml
classes:
  - id: order                 # required, unique (letters/numbers/-/_)
    name: Order               # required, the displayed class name
    stereotype: entity        # optional, rendered as «entity» above the name
    abstract: true            # optional, name rendered in italics (UML abstract class)
    attributes:               # optional list
      - name: id
        type: UUID
        visibility: private   # optional: public (+) | private (-) | protected (#) | package (~)
        static: false         # optional, rendered underlined
    methods:                  # optional list
      - name: place
        params: "items: List<LineItem>"   # optional, rendered as place(items: List<LineItem>)
        return: void          # optional, rendered after the name
        visibility: public
        static: false
```

Notes:
- `stereotype` is free text, wrapped in guillemets automatically (`«interface»`, `«control»`, `«entity»`, ...). Use `interface` for interfaces, `abstract` + `abstract: true` for abstract classes.
- `visibility` defaults to `public` (`+`). The symbol is drawn to the left of each member.
- A class with only a name (no attributes/methods) renders as a single-compartment box -- fine for interfaces or pure markers.
- `params` and `return` are plain strings; quote them when they contain a colon (e.g. `params: "order: Order"`).

## `relationships`

Connections between two classes. `from` → `to` is the reading direction; which end
gets the marker depends on `kind` (see the table below).

```yaml
relationships:
  - from: order               # required, id of an existing class
    to: line-item             # required, id of an existing class
    kind: composition         # required, see values below
    fromMultiplicity: '1'     # optional, e.g. '1', '*', '0..1', '0..*'
    toMultiplicity: '*'       # optional
    fromRole: has             # optional, role name near the "from" end
    toRole: items             # optional, role name near the "to" end
```

`kind` and where the marker is drawn:

| kind | line | marker | `from` is | `to` is |
|---|---|---|---|---|
| `association` | solid | none | one participant | the other |
| `aggregation` | solid | hollow diamond at `from` | the whole (container) | the part |
| `composition` | solid | filled diamond at `from` | the whole (container) | the part |
| `inheritance` | solid | hollow triangle at `to` | the subclass | the superclass |
| `dependency` | dashed | open arrow at `to` | the dependent | the independent |
| `realization` | dashed | hollow triangle at `to` | the implementer | the interface/abstract |

So for `aggregation`/`composition` write `from` = the container; for
`inheritance`/`dependency`/`realization` write `to` = the target (superclass /
independent class / interface). Multiplicity and role labels are drawn near each
end regardless of kind.

## Layout tips

- **Leave `direction` at `auto`** in most cases. For class diagrams the renderer
  prefers `down` so that inheritance/generalization reads top-down (superclass on
  top, subclass below) -- the most common UML convention. Force `right` only if you
  want a left→right flow.
- **One relationship per pair of classes.** If two classes have both an association
  and a dependency, that is two distinct edges and is fine; but don't model the same
  semantic link twice.
- Keep member lists short. A class with 15 attributes makes a very tall box and
  pushes the layout apart -- split into two classes (or an interface) if the model
  allows it.

## Common errors and how the renderer reacts

- **Duplicate class ids, a relationship pointing to a non-existent class, or a
  self-relationship**: validation fails (exit code 1) and prints the specific errors
  with the exact field path (e.g. `[relationships.2.to] references class "db2", which
  does not exist`). Fix the spec and run it again.
- **`kind` with an unknown value**: validation fails listing the allowed kinds.

## Full example

See `./uml-class.example.yaml` -- an Order domain model that exercises all six
relationship kinds (composition, aggregation, two associations, inheritance,
realization, dependency) plus stereotypes, an abstract class, and member visibility.
