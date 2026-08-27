import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname } from "node:path";
import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { renderSpec, validateSpecText, SpecError, formatErrors } from "./core/render.js";
import type { RenderSpecResult } from "./core/render.js";
import { searchCatalog } from "./icons/index.js";
import { engineTypes, engineDescriptions } from "./engines/index.js";
import { analyzeCodebase, checkConsistency } from "./detect/index.js";
import { importMermaid, MermaidError } from "./mermaid/index.js";
import type { DiagramSpec } from "./spec/schema.js";

const pkg = createRequire(import.meta.url)("../package.json") as { version: string };

const TOOLS = [
  {
    name: "render_diagram",
    description: "Renders a diagram spec (YAML) to SVG, with optional PNG/PDF export. Pass the spec as a YAML string (`spec`) or a path to a spec file (`path`).",
    inputSchema: {
      type: "object",
      properties: {
        spec: { type: "string", description: "The diagram spec as a YAML string." },
        path: { type: "string", description: "Path to a spec file (YAML/JSON). Alternative to `spec`." },
        png: { type: "boolean", description: "Also generate a PNG (returned as base64 image content)." },
        pdf: { type: "boolean", description: "Also generate a PDF (returned as base64 resource content)." },
        scale: { type: "number", description: "PNG/PDF scale factor (default 2)." },
        out: { type: "string", description: "Optional output path; if given, the SVG (and PNG/PDF) are also written to disk." },
      },
    },
  },
  {
    name: "search_icons",
    description: "Searches the icon catalog by term (matches against key, label, and category) so you can pick a valid icon key.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term, e.g. 'postgres', 'aws:s', 'database'." },
      },
      required: ["query"],
    },
  },
  {
    name: "validate_spec",
    description: "Validates a diagram spec (YAML) and returns actionable, field-pathed errors without rendering. Fast iteration helper.",
    inputSchema: {
      type: "object",
      properties: {
        spec: { type: "string", description: "The diagram spec as a YAML string." },
        path: { type: "string", description: "Path to a spec file (YAML/JSON). Alternative to `spec`." },
      },
    },
  },
  {
    name: "list_diagram_types",
    description: "Lists the registered diagram engine types with a one-line description each.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "analyze_codebase",
    description: "Detects the tech stack of a codebase (package.json, docker-compose, k8s manifests, Dockerfile, CI) and returns the detected stack plus a draft architecture spec. Review/prune the result, then render it with render_diagram.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the codebase (a directory)." },
      },
      required: ["path"],
    },
  },
  {
    name: "check_consistency",
    description: "Checks an architecture spec against a real codebase in both directions: missing-evidence (a node claims a technology the code shows no evidence for) and undrawn (the code shows evidence for a technology the diagram omits). Returns a severity-ranked report (findings + matches + summary). The inverse of analyze_codebase.",
    inputSchema: {
      type: "object",
      properties: {
        spec: { type: "string", description: "The architecture spec as a YAML string." },
        path: { type: "string", description: "Path to a spec file (YAML/JSON). Alternative to `spec`." },
        repo: { type: "string", description: "Path to the codebase (a directory) to check the diagram against." },
      },
      required: ["repo"],
    },
  },
  {
    name: "import_mermaid",
    description: "Imports a Mermaid flowchart/graph diagram and converts it to an architecture spec (YAML). Pass the Mermaid source as a string (`mermaid`) or a path to a .mmd file (`path`). Returns the converted spec plus warnings for dropped styling. Review/refine the result, then render it with render_diagram.",
    inputSchema: {
      type: "object",
      properties: {
        mermaid: { type: "string", description: "The Mermaid flowchart/graph source as a string." },
        path: { type: "string", description: "Path to a Mermaid file (.mmd). Alternative to `mermaid`." },
      },
    },
  },
];

export async function handleRenderDiagram(args: Record<string, unknown>): Promise<CallToolResult> {
  const spec = typeof args.spec === "string" ? args.spec : undefined;
  const path = typeof args.path === "string" ? args.path : undefined;

  if (!spec && !path) {
    return { content: [{ type: "text", text: "Provide either a 'spec' (YAML string) or a 'path' (spec file)." }], isError: true };
  }

  let specText: string;
  let baseDir: string;
  if (path) {
    try {
      specText = readFileSync(path, "utf-8");
    } catch (err) {
      return { content: [{ type: "text", text: `Could not read file "${path}": ${(err as Error).message}` }], isError: true };
    }
    baseDir = dirname(path);
  } else {
    specText = spec!;
    baseDir = process.cwd();
  }

  const png = args.png === true;
  const pdf = args.pdf === true;
  const scale = typeof args.scale === "number" ? args.scale : undefined;
  const out = typeof args.out === "string" ? args.out : undefined;

  let result: RenderSpecResult;
  try {
    result = await renderSpec(specText, { png, pdf, scale, baseDir });
  } catch (err) {
    if (err instanceof SpecError) {
      return { content: [{ type: "text", text: err.message }], isError: true };
    }
    return { content: [{ type: "text", text: `Render failed: ${(err as Error).message}` }], isError: true };
  }

  const content: CallToolResult["content"] = [];
  content.push({ type: "text", text: result.svg });
  if (result.png) content.push({ type: "image", data: result.png.toString("base64"), mimeType: "image/png" });
  if (result.pdf) content.push({ type: "resource", resource: { uri: "diagram.pdf", mimeType: "application/pdf", blob: result.pdf.toString("base64") } });
  if (result.warnings.length > 0) {
    content.push({ type: "text", text: "Warnings:\n" + result.warnings.map((w) => `  - ${w}`).join("\n") });
  }

  if (out) {
    const ext = extname(out).toLowerCase();
    const base = ext === ".svg" || ext === ".png" || ext === ".pdf" ? out.slice(0, -ext.length) : out;
    const svgPath = base + ".svg";
    try {
      writeFileSync(svgPath, result.svg, "utf-8");
      if (result.png) writeFileSync(base + ".png", result.png, "utf-8");
      if (result.pdf) writeFileSync(base + ".pdf", result.pdf, "utf-8");
      content.push({ type: "text", text: `Written to ${svgPath}` });
    } catch (err) {
      content.push({ type: "text", text: `Failed to write output to "${out}": ${(err as Error).message}` });
      return { content, isError: true };
    }
  }

  return { content };
}

export function handleSearchIcons(args: Record<string, unknown>): CallToolResult {
  const query = typeof args.query === "string" ? args.query : "";
  if (!query) {
    return { content: [{ type: "text", text: "Provide a 'query' to search for." }], isError: true };
  }

  const matches = searchCatalog(query);
  if (matches.length === 0) {
    return { content: [{ type: "text", text: `No icons found for "${query}".` }] };
  }

  const text = `${matches.length} icon(s) found:\n` + matches.map((e) => `  ${e.key}  ${e.label}  [${e.category}]`).join("\n");
  return { content: [{ type: "text", text }] };
}

export function handleValidateSpec(args: Record<string, unknown>): CallToolResult {
  const spec = typeof args.spec === "string" ? args.spec : "";
  const path = typeof args.path === "string" ? args.path : "";
  if (!spec && !path) {
    return { content: [{ type: "text", text: "Provide a 'spec' (YAML string) or 'path' (spec file) to validate." }], isError: true };
  }

  let specText = spec;
  if (path) {
    try {
      specText = readFileSync(path, "utf-8");
    } catch (err) {
      return { content: [{ type: "text", text: `Could not read file "${path}": ${(err as Error).message}` }], isError: true };
    }
  }

  const result = validateSpecText(specText);
  if (result.ok) {
    return { content: [{ type: "text", text: "Spec is valid." }] };
  }

  const text = "Invalid spec:\n" + result.errors.map((e) => `  - ${e.path ? `[${e.path}] ` : ""}${e.message}`).join("\n");
  return { content: [{ type: "text", text }], isError: true };
}

export function handleListDiagramTypes(): CallToolResult {
  const descriptions = engineDescriptions();
  const text = `Diagram types:\n` + engineTypes().map((t) => `  - ${t}: ${descriptions[t] ?? ""}`).join("\n");
  return { content: [{ type: "text", text }] };
}

export function handleAnalyzeCodebase(args: Record<string, unknown>): CallToolResult {
  const path = typeof args.path === "string" ? args.path : undefined;
  if (!path) {
    return { content: [{ type: "text", text: "Provide a 'path' to the codebase (a directory)." }], isError: true };
  }

  if (!existsSync(path) || !statSync(path).isDirectory()) {
    return { content: [{ type: "text", text: `Path "${path}" is not a directory.` }], isError: true };
  }

  let result;
  try {
    result = analyzeCodebase(path);
  } catch (err) {
    return { content: [{ type: "text", text: `Analysis failed: ${(err as Error).message}` }], isError: true };
  }

  const payload = {
    detected: result.detected,
    draftSpec: result.draftSpec,
    warnings: result.warnings,
  };
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

export function handleCheckConsistency(args: Record<string, unknown>): CallToolResult {
  const spec = typeof args.spec === "string" ? args.spec : undefined;
  const path = typeof args.path === "string" ? args.path : undefined;
  const repo = typeof args.repo === "string" ? args.repo : undefined;

  if (!spec && !path) {
    return { content: [{ type: "text", text: "Provide either a 'spec' (YAML string) or a 'path' (spec file)." }], isError: true };
  }
  if (!repo) {
    return { content: [{ type: "text", text: "Provide a 'repo' path to the codebase (a directory)." }], isError: true };
  }

  let specText: string;
  if (path) {
    try {
      specText = readFileSync(path, "utf-8");
    } catch (err) {
      return { content: [{ type: "text", text: `Could not read file "${path}": ${(err as Error).message}` }], isError: true };
    }
  } else {
    specText = spec!;
  }

  const validation = validateSpecText(specText);
  if (!validation.ok) {
    return { content: [{ type: "text", text: `Invalid spec:\n${formatErrors(validation.errors)}` }], isError: true };
  }

  const type = (validation.spec as { type?: string }).type;
  if (type !== "architecture") {
    return { content: [{ type: "text", text: `check_consistency supports architecture specs only (got "${type}").` }], isError: true };
  }

  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    return { content: [{ type: "text", text: `Path "${repo}" is not a directory.` }], isError: true };
  }

  let result;
  try {
    result = checkConsistency(validation.spec as DiagramSpec, analyzeCodebase(repo));
  } catch (err) {
    return { content: [{ type: "text", text: `Check failed: ${(err as Error).message}` }], isError: true };
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

export function handleImportMermaid(args: Record<string, unknown>): CallToolResult {
  const mermaid = typeof args.mermaid === "string" ? args.mermaid : undefined;
  const path = typeof args.path === "string" ? args.path : undefined;

  if (!mermaid && !path) {
    return { content: [{ type: "text", text: "Provide either a 'mermaid' (source string) or a 'path' (.mmd file)." }], isError: true };
  }

  let source: string;
  if (path) {
    try {
      source = readFileSync(path, "utf-8");
    } catch (err) {
      return { content: [{ type: "text", text: `Could not read file "${path}": ${(err as Error).message}` }], isError: true };
    }
  } else {
    source = mermaid!;
  }

  let result;
  try {
    result = importMermaid(source);
  } catch (err) {
    if (err instanceof MermaidError) {
      return { content: [{ type: "text", text: `Could not import Mermaid diagram: ${err.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: `Import failed: ${(err as Error).message}` }], isError: true };
  }

  const payload = {
    spec: result.spec,
    warnings: result.warnings,
  };
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

export function createServer(): Server {
  const server = new Server({ name: "architecture-diagrams", version: pkg.version }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    switch (name) {
      case "render_diagram":
        return handleRenderDiagram(args);
      case "search_icons":
        return handleSearchIcons(args);
      case "validate_spec":
        return handleValidateSpec(args);
      case "list_diagram_types":
        return handleListDiagramTypes();
      case "analyze_codebase":
        return handleAnalyzeCodebase(args);
      case "check_consistency":
        return handleCheckConsistency(args);
      case "import_mermaid":
        return handleImportMermaid(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("architecture-diagrams MCP server running on stdio");
}
