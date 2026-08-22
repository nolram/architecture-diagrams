# MCP server

A stdio [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes the same render engine the CLI uses, as a set of tools any MCP client can call. It is the programmatic counterpart of the render script in `scripts/render.sh` -- instead of running a shell command, an AI (or any MCP client) calls a tool over JSON-RPC 2.0 (newline-delimited, over stdio).

Start it with:

```bash
arch-diagram mcp
# or, without a global install:
node dist/cli.js mcp
```

## Setup

```bash
npm install && npm run build
node dist/cli.js mcp
```

The server runs in the foreground and reads JSON-RPC messages from stdin until it is closed -- this is exactly the stdio transport MCP clients expect, so the client spawns it as a child process.

## Client config

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "architecture-diagrams": {
      "command": "node",
      "args": ["/absolute/path/to/architecture-diagrams/dist/cli.js", "mcp"]
    }
  }
}
```

Cursor (`.cursor/mcp.json`) uses the same shape:

```json
{
  "mcpServers": {
    "architecture-diagrams": {
      "command": "node",
      "args": ["/absolute/path/to/architecture-diagrams/dist/cli.js", "mcp"]
    }
  }
}
```

Both spawn `node /absolute/path/to/architecture-diagrams/dist/cli.js mcp` -- replace the path with wherever this project is checked out.

## Tools

Six tools are exposed.

### `render_diagram`

Renders a spec to SVG (and optionally PNG/PDF), reusing the exact same engine as the CLI.

Arguments:
- `spec` (string) -- the YAML spec, inline. Provide this **or** `path` (if both are given, `path` wins).
- `path` (string) -- path to a spec file on disk. Provide this **or** `spec`.
- `png` (boolean, optional) -- also produce a PNG.
- `pdf` (boolean, optional) -- also produce a PDF.
- `scale` (number, optional, default `2`) -- raster scale for the PNG and PDF.
- `out` (string, optional) -- if given, the SVG/PNG/PDF are also written to disk. Treated as a base path: a recognized `.svg`/`.png`/`.pdf` extension is normalized, otherwise `.svg`/`.png`/`.pdf` are appended (e.g. `out: "diagram"` writes `diagram.svg` + `diagram.png`).

Returns: the SVG text, a base64 PNG (as an MCP `image` content) when `png` is set, a base64 PDF (as an MCP `resource` content) when `pdf` is set, plus any warnings (e.g. an icon key that fell back to a generic badge).

### `search_icons`

Searches the icon catalog -- the same one behind `arch-diagram icons <term>`.

Arguments:
- `query` (string) -- free text, matched against the key, label, and category.

Returns: the matching icons, each with its `key`, `label`, and `category`.

### `validate_spec`

Validates a spec without rendering it.

Arguments:
- `spec` (string) -- the YAML spec, inline. Provide this **or** `path`.
- `path` (string) -- path to a spec file on disk. Provide this **or** `spec`.

Returns: actionable, field-pathed validation errors (e.g. `[nodes.1.icon] ...`) -- the same errors the CLI prints -- or a success indication when the spec is valid.

### `list_diagram_types`

Lists the registered diagram engines.

Arguments: none.

Returns: the engine types (`architecture`, `uml-class`, `c4`) with a one-line description each.

### `analyze_codebase`

The MCP form of the CLI `detect` command: detect a codebase's stack and return a draft architecture spec to refine and pass to `render_diagram`.

Arguments:
- `path` (string) -- path to the repository to analyze.

Returns: `{ detected, draftSpec, warnings }` -- the detected stack (each entry with `tech`, `iconKey`, `confidence`, `source`), a valid architecture spec ready to render, and any low-confidence/ambiguous warnings. See `reference/detect-spec.md`.

### `check_consistency`

The MCP form of the CLI `check` command: check an existing architecture spec against a codebase in both directions (missing-evidence + undrawn) and return a severity-ranked report.

Arguments:
- `spec` (string) -- the YAML spec, inline. Provide this **or** `path` (if both are given, `path` wins).
- `path` (string) -- path to a spec file on disk. Provide this **or** `spec`.
- `repo` (string) -- path to the repository to check against.

Returns: a `CheckResult` -- `findings` (each with `kind`, `severity`, `message`, and the involved node/tech/evidence), `matches` (spec nodes confirmed by code evidence), `warnings`, and a `summary` count. Architecture specs only; a non-architecture spec is an error. See `reference/check-spec.md`.

## Notes

- **Inline specs are primary.** An AI typically already has the YAML as a string, so `spec` is the main input; `path` is a convenience for pointing at a file on disk.
- **`icon: file:` resolution.** For an inline spec there is no spec file directory, so `icon: file:./logo.svg` resolves relative to the server's cwd (the `baseDir` for file icons defaults to the cwd). Use `path` instead if you want the `file:` icon resolved relative to the spec file.
- **PNG vs PDF content types.** The PNG is returned as an MCP `image` content and the PDF as an MCP `resource` content; both are base64-encoded.
