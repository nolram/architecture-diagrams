# YAML spec guide

The spec describes the diagram in structured text; the renderer handles layout, icons, and styling. Format: YAML (or equivalent JSON).

## General structure

```yaml
version: '1'                 # required, always the string '1'
title: Diagram title         # optional
theme: clean-light           # optional: clean-light (default) | midnight-dark
direction: auto               # optional: auto (default) | right (left→right) | down (top→bottom)
nodes: [ ... ]                # required, at least 1
groups: [ ... ]                # optional
edges: [ ... ]                # optional
```

A legend explaining `category` colors and group `style` colors appears automatically below the diagram when there's enough variety to be worth it (2+ distinct group styles or 3+ distinct categories). No need to configure anything -- and don't draw your own legend manually as a node, the renderer already handles it.

## `nodes`

Each node is a box/card in the diagram.

```yaml
nodes:
  - id: web                  # required, unique (letters/numbers/-/_), shares a namespace with groups
    label: Web Server        # required, the card's main text
    sublabel: Node.js         # optional, smaller secondary text below the label
    icon: aws:lambda          # optional, catalog key (see icon-catalog.md). Omit = card with no icon.
    category: compute         # optional, defaults to "generic". See values below -- sets the icon/badge color when there's no brand icon.
    shape: card                # optional, defaults to "card". See values below.
    group: vpc                  # optional, id of a group defined in `groups` -- visually nests the node inside it
```

`category` (affects the color of generic icon badges and of the fallback when the icon isn't found):
`compute` `storage` `database` `network` `security` `messaging` `external` `generic`

`shape`:
- `card` (default) -- rounded rectangle with the icon on the left, label/sublabel on the right. Works for almost any service/component.
- `database` -- cylinder (elliptical caps top and bottom). Use for databases, data warehouses, anything that's semantically "a database".
- `actor` -- no card/rectangle: just the icon in a circular badge with the label centered underneath. Use for people, users, or external systems that only appear as an entry/exit point of the diagram (not as a "boxed" service).
- `cloud` -- cloud silhouette. Use to represent "the internet"/public network, or a third-party external service outside your control.

### Custom icon (`file:`)

If the service isn't in the catalog (check with `arch-diagram icons <term>` before giving up), the spec can point to a local `.svg` file instead of a catalog key:

```yaml
icon: file:./assets/logo.svg   # relative to the spec file's directory, not the cwd
```

Rules:
- Only `.svg`, resolved relative to the directory where the `.yaml` spec is saved (not the directory the command is run from).
- The file is validated before being embedded: it must be under 200KB, contain a valid `<svg>...</svg>` tag, and **must not** contain `<script>`, event handlers (`on*=`), `javascript:`, `<foreignObject>`, or `<iframe>`/`<embed>`/`<object>`. If any of these appear, the entire file is rejected (no partial sanitization attempted) and the node falls back to the fallback badge -- same as a catalog key that isn't found, with the specific reason in the warning.
- The original `viewBox` is preserved; the color is not altered (unlike `generic:*` icons, which inherit the category's color).

## `groups`

Boundary boxes that visually group nodes -- VPCs, subnets, availability zones, logical layers, etc. Can be nested via `parent`.

```yaml
groups:
  - id: vpc
    label: VPC
    style: vpc          # vpc | subnet | az | boundary | generic (default) -- each has its own palette
  - id: private
    label: Private Subnet
    style: subnet
    parent: vpc          # nests "private" inside "vpc"
```

A node joins a group by referencing `group: <id>` on the node (not the other way around -- groups don't list their nodes).

## `edges`

Connections between nodes.

```yaml
edges:
  - from: web            # required, id of an existing node
    to: db                # required, id of an existing node
    label: SQL              # optional
    style: solid            # optional: solid (default) | dashed
    direction: forward       # optional: forward (default, arrow at "to") | bidirectional | none
```

## Layout tips (avoids having to render several times)

- **Leave `direction` at `auto` (default) in most cases.** The renderer picks `right` or `down` on its own by looking at the graph's largest fan-out/fan-in (e.g. a node connecting to 3+ other nodes) -- exactly the kind of decision that used to require trial and error. Only set `direction` explicitly if you want to force a specific orientation for a visual preference; in that case the explicit value always wins over the heuristic.
- **Never model two separate edges for the same pair of nodes** (e.g. one for "publish" and another for "consume" between the same service and the same queue). This produces two nearly-overlapping lines with colliding labels. Use a single edge with `direction: bidirectional` and a combined label (e.g. `label: publish / consume`).
- After rendering, always look at the PNG before delivering -- if an edge label gets cut off or ends up too close to a card, it's usually a sign of excess redundant edges crossing the same group; simplify the spec instead of trying to fix it manually in the SVG.

## Common errors and how the renderer reacts

- **Duplicate ids, an edge pointing to a non-existent node, a group with a non-existent parent, or a parent cycle**: validation fails (exit code 1) and prints a list of specific errors with the exact problematic field path (e.g. `[edges.2.to] edge references node "db2", which does not exist`). Fix the spec and run it again.
- **`icon` with a key that doesn't exist in the catalog, or `file:...` pointing to a missing/unsafe/invalid SVG**: does NOT fail. The renderer generates a generic badge with the `label`'s initial and prints a warning on stderr with the specific reason. Always check the warning -- if one shows up, fix the key/path on the next generation.

## Full example

See `reference/patterns.md` for ready-made examples (the 4 node shapes together, 3-tier web, microservices with a queue, multi-AZ VPC, data pipeline, fan-out backend) that also work as a starting point.
