# UML sequence diagram spec guide

A fourth diagram family on top of the same renderer. Select it with `type: uml-sequence`
(the architecture spec keeps working unchanged -- `type` is optional and defaults to
`architecture`). This guide covers only the UML sequence format; the shared fields
(`version`, `title`, `theme`) and the export flags (`--png`, `--pdf`, `--scale`)
behave exactly as in `spec-guide.md`.

## General structure

```yaml
type: uml-sequence           # required for this family (selects the UML sequence engine)
version: '1'                 # required, always the string '1'
title: Diagram title         # optional
theme: clean-light           # optional: clean-light (default) | midnight-dark
direction: auto              # accepted but ignored -- sequence diagrams always flow top→bottom
participants: [ ... ]        # required, at least 1
messages: [ ... ]            # optional; listed in time order (top→bottom)
fragments: [ ... ]           # optional; alt/loop/opt/par boxes over message ranges
```

Unlike the architecture spec there are no `groups`, `edges`, `icon`, or `category`
fields -- a sequence diagram is participants, the messages between them in time
order, and optional fragment boxes.

## `participants`

Each participant is a lifeline: a box (object) or stick figure (actor) at the top,
with a dashed vertical line running down the diagram.

```yaml
participants:
  - id: user                  # required, unique (letters/numbers/-/_)
    name: User                # required, the displayed name
    stereotype: actor         # optional, rendered as «actor» above the figure/box
    type: actor               # optional: object (default) | actor
```

Notes:
- `type: object` (the default) renders a rounded box with the name; `type: actor`
  renders a UML stick figure with the name below it. Use `actor` for people and
  external roles.
- `stereotype` is free text, wrapped in guillemets automatically (`«control»`,
  `«boundary»`, `«entity»`, ...). If *any* participant has a stereotype, all boxes
  reserve space above for it.
- Participants are placed left→right in spec order -- put the most important
  participant first (leftmost).

## `messages`

Arrows between lifelines, drawn top→bottom in the order they appear in the spec
(the list order *is* the time order).

```yaml
messages:
  - id: place                 # required, unique (letters/numbers/-/_)
    from: user                # required, id of an existing participant
    to: controller            # required, id of an existing participant
    label: placeOrder()       # optional, drawn above the arrow (right of the loop for self messages)
    kind: sync                # optional: sync (default) | async | reply | self
    activation: true          # optional; draw an activation bar on the sender's lifeline
```

`kind` and how it is drawn:

| kind | line | arrow | meaning |
|---|---|---|---|
| `sync` | solid | filled (closed) arrow at `to` | synchronous call -- the sender waits for the result |
| `async` | solid | open (hollow) arrow at `to` | asynchronous signal -- the sender does not wait |
| `reply` | dashed | open (hollow) arrow at `to` | return message (usually back to the caller) |
| `self` | solid loopback on one lifeline | filled arrow | a method calling itself / internal processing; `from` and `to` must be the same participant |

Notes:
- For `reply`, write `from` = the callee, `to` = the caller (the arrow points back).
- `activation: true` draws a thin bar on the **sender's** lifeline starting at this
  message; it extends down to the first later reply from `to` back to `from` (if
  one exists), otherwise one row. Use it on the caller side of a sync call to show
  the object is active while waiting.
- A `self` message draws a loopback to the right of the lifeline; its label is
  placed to the right of the loop.

## `fragments`

Boxes (dashed border) that group a run of messages -- the UML combined fragments.

```yaml
fragments:
  - id: payment-outcome       # required, unique (letters/numbers/-/_)
    kind: alt                 # required: alt | loop | opt | par
    label: payment approved   # optional, shown in the tab after the kind (e.g. "alt [payment approved]")
    participants: [controller, gateway]   # required, >= 1; the lifelines the box spans
    messages: [charge, charge-ok]         # required, >= 1; message ids covered by the box
```

Notes:
- `kind` is rendered in bold in the tab at the top-left of the box; `label` (the
  condition / note) follows it in brackets.
- `participants` determines the horizontal span of the box (it extends a fixed
  padding beyond the outermost covered lifeline); `messages` determines its
  vertical extent.
- List `messages` in the same order as the spec's `messages` list (time order) --
  out-of-order lists are a validation error.
- A message may belong to **at most one** fragment. Fragments are flat: there is
  no nesting in v1, and a fragment cannot cover another fragment's messages.
- Every covered message must stay **inside the span**: both its `from` and `to`
  participants must be listed in the fragment's `participants`. A message that
  leaves the span (e.g. `gateway -> database` covered by a fragment spanning only
  `[controller, gateway]`) is a validation error -- add the missing endpoint to the
  span so the arrow stays inside the box.
- When a fragment has a `label` and covers at least two messages, a horizontal
  separator line is drawn across the box at the second message's row (the classic
  alt/par guard separator).

## Layout notes

- Participants run left→right in spec order; time flows top→bottom. `direction`
  is accepted for spec compatibility but always resolves to `down`.
- Each message occupies one fixed-height row; a fragment's first covered message
  gets extra space above it for the fragment tab.
- Lifelines extend a short tail below the last message.

## Common errors and how the renderer reacts

- **Duplicate participant / message / fragment ids, a message or fragment
  referencing a non-existent participant or message, or a `self` message with
  different `from`/`to`**: validation fails (exit code 1) and prints the specific
  errors with the exact field path (e.g. `[messages.2.to] references participant
  "db2", which does not exist`). Fix the spec and run it again.
- **A message listed in two fragments**: validation fails -- a message may belong
  to at most one fragment.
- **Fragment `messages` out of time order**: validation fails, showing the
  fragment's list and the spec's message order.
- **A covered message leaves the fragment's span** (its `from`/`to` is not in the
  fragment's `participants`): validation fails, naming the message and the span --
  add the missing endpoint to `participants`.

## Full example

See `./uml-sequence.example.yaml` -- an order-placement flow with an actor and two
objects, all four message kinds, an activation bar, and an `alt` fragment.
