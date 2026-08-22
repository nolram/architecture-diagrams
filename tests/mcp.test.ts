import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleRenderDiagram, handleSearchIcons, handleValidateSpec, handleListDiagramTypes, handleAnalyzeCodebase, handleCheckConsistency } from "../src/mcp.js";

const ARCHITECTURE = `
version: '1'
title: Test
nodes:
  - id: a
    label: A
  - id: b
    label: B
edges:
  - from: a
    to: b
`;

const C4 = `
type: c4
version: '1'
level: context
title: Test
elements:
  - id: user
    name: Web User
    type: person
  - id: shop
    name: Online Shop
    type: system
relationships:
  - from: user
    to: shop
`;

const UML = `
type: uml-class
version: '1'
title: Test
classes:
  - id: a
    name: A
    methods:
      - name: foo
        visibility: public
  - id: b
    name: B
relationships:
  - from: a
    to: b
    kind: association
`;

function textContent(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.filter((c) => c.type === "text" && typeof c.text === "string").map((c) => c.text as string).join("\n");
}

test("render_diagram (architecture) returns SVG", async () => {
  const result = await handleRenderDiagram({ spec: ARCHITECTURE });
  assert.notEqual(result.isError, true);
  const text = textContent(result);
  assert.ok(text.includes("<svg"), "should contain an <svg element");
  assert.ok(text.includes("</svg>"), "should contain a closing </svg> tag");
  assert.ok(!text.includes("Warnings:"), "no warnings expected");
});

test("render_diagram (c4) returns SVG", async () => {
  const result = await handleRenderDiagram({ spec: C4 });
  assert.notEqual(result.isError, true);
  const text = textContent(result);
  assert.ok(text.includes("<svg"), "should contain an <svg element");
  assert.ok(text.includes("</svg>"), "should contain a closing </svg> tag");
});

test("render_diagram (uml-class) returns SVG", async () => {
  const result = await handleRenderDiagram({ spec: UML });
  assert.notEqual(result.isError, true);
  const text = textContent(result);
  assert.ok(text.includes("<svg"), "should contain an <svg element");
  assert.ok(text.includes("</svg>"), "should contain a closing </svg> tag");
});

test("render_diagram surfaces missing-icon warnings", async () => {
  const result = await handleRenderDiagram({
    spec: "version: '1'\ntitle: T\nnodes:\n  - id: a\n    label: A\n    icon: does:notexist\n  - id: b\n    label: B\nedges:\n  - from: a\n    to: b\n",
  });
  assert.notEqual(result.isError, true);
  const text = textContent(result);
  assert.ok(text.includes("<svg"), "should contain an <svg element");
  assert.ok(text.includes("Warnings:"), "should surface the warnings block");
  assert.ok(text.includes("does:notexist"), "should name the missing icon");
});

test("render_diagram returns an error for an invalid spec", async () => {
  const result = await handleRenderDiagram({ spec: "version: '1'\nnodes: not-a-list\n" });
  assert.equal(result.isError, true);
  const text = textContent(result);
  assert.ok(text.length > 0, "should explain the problem");
});

test("render_diagram errors when neither spec nor path is given", async () => {
  const result = await handleRenderDiagram({});
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("spec"));
});

test("search_icons finds postgres and aws:lambda", () => {
  const pg = handleSearchIcons({ query: "postgres" });
  assert.notEqual(pg.isError, true);
  assert.ok(textContent(pg).includes("postgres"), "should list a postgres icon key");

  const aws = handleSearchIcons({ query: "aws:lambda" });
  assert.notEqual(aws.isError, true);
  assert.ok(textContent(aws).includes("aws:lambda"), "should list the aws:lambda icon key");
});

test("validate_spec accepts a valid spec", () => {
  const result = handleValidateSpec({ spec: ARCHITECTURE });
  assert.notEqual(result.isError, true);
  assert.ok(textContent(result).includes("valid"));
});

test("validate_spec reports field-pathed errors", () => {
  const result = handleValidateSpec({
    spec: "version: '1'\nnodes:\n  - id: a\n    label: A\n    category: not-a-real-category\n  - id: b\n    label: B\nedges:\n  - from: a\n    to: b\n",
  });
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("category"), "should mention the offending field");
});

test("list_diagram_types lists all engines", () => {
  const result = handleListDiagramTypes();
  assert.notEqual(result.isError, true);
  const text = textContent(result);
  assert.ok(text.includes("architecture"));
  assert.ok(text.includes("uml-class"));
  assert.ok(text.includes("c4"));
});

test("analyze_codebase returns the detected stack + draft spec for a fixture repo", () => {
  const result = handleAnalyzeCodebase({ path: "tests/fixtures/detect/node-express-pg-redis" });
  assert.notEqual(result.isError, true);
  const text = textContent(result);
  const payload = JSON.parse(text) as {
    detected: Array<{ tech: string; iconKey: string; confidence: string; source: string }>;
    draftSpec: { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string }> };
    warnings: string[];
  };

  // the expected shape: detected[], draftSpec{}, warnings[]
  assert.ok(Array.isArray(payload.detected), "detected should be an array");
  assert.ok(payload.draftSpec && Array.isArray(payload.draftSpec.nodes), "draftSpec.nodes should be an array");
  assert.ok(Array.isArray(payload.warnings), "warnings should be an array");

  // the detected stack includes the app framework + the compose services
  const techs = payload.detected.map((d) => d.tech);
  assert.ok(techs.includes("express"), `expected express in ${techs.join(", ")}`);
  assert.ok(techs.includes("postgres"), `expected postgres in ${techs.join(", ")}`);
  assert.ok(techs.includes("redis"), `expected redis in ${techs.join(", ")}`);

  // every detected entry carries the evidence fields
  for (const d of payload.detected) {
    assert.ok(d.iconKey, "each detected entry should have an iconKey");
    assert.ok(d.confidence, "each detected entry should have a confidence");
    assert.ok(d.source, "each detected entry should have a source");
  }

  // the draft spec is a valid architecture spec with nodes
  assert.ok(payload.draftSpec.nodes.length >= 1, "draftSpec should have at least one node");
});

test("analyze_codebase errors when the path is not a directory", () => {
  const result = handleAnalyzeCodebase({ path: "tests/fixtures/detect/empty/README.md" });
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("not a directory"));
});

test("analyze_codebase errors when no path is given", () => {
  const result = handleAnalyzeCodebase({});
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("path"));
});

test("check_consistency returns matches + findings for a clean spec vs matching repo", () => {
  const result = handleCheckConsistency({ path: "tests/fixtures/check/web-3tier.yaml", repo: "tests/fixtures/detect/node-express-pg-redis" });
  assert.notEqual(result.isError, true);
  const payload = JSON.parse(textContent(result)) as {
    findings: Array<{ kind: string; severity: string }>;
    matches: Array<{ tech: string; via: string }>;
    summary: { matched: number; missingEvidence: number; undrawn: number };
  };
  assert.ok(Array.isArray(payload.findings), "findings should be an array");
  assert.ok(Array.isArray(payload.matches), "matches should be an array");
  assert.equal(payload.summary.matched, 3, `expected 3 matches, got ${payload.summary.matched}`);
  assert.equal(payload.summary.missingEvidence, 0);
  assert.equal(payload.summary.undrawn, 0);
});

test("check_consistency reports a missing-evidence finding for an unsupported node", () => {
  const result = handleCheckConsistency({ path: "tests/fixtures/check/with-dynamodb.yaml", repo: "tests/fixtures/detect/node-express-pg-redis" });
  assert.notEqual(result.isError, true);
  const payload = JSON.parse(textContent(result)) as { findings: Array<{ kind: string; severity: string; tech?: string }> };
  const me = payload.findings.find((f) => f.kind === "missing-evidence");
  assert.ok(me, "expected a missing-evidence finding");
  // aws:s3 is not a mapped tech icon and the node is category:external -> medium
  assert.equal(me.severity, "medium");
});

test("check_consistency reports an undrawn finding for a detected tech with no node", () => {
  const result = handleCheckConsistency({ path: "tests/fixtures/check/no-kafka.yaml", repo: "tests/fixtures/detect/microservices-gateway" });
  assert.notEqual(result.isError, true);
  const payload = JSON.parse(textContent(result)) as { findings: Array<{ kind: string; severity: string; tech?: string }> };
  const undrawn = payload.findings.find((f) => f.kind === "undrawn" && f.tech === "kafka");
  assert.ok(undrawn, "expected an undrawn kafka finding");
  assert.equal(undrawn.severity, "high");
});

test("check_consistency accepts an inline spec string", () => {
  const spec = `type: architecture\nversion: '1'\nnodes:\n  - id: app\n    label: App\n    icon: brand:nodejs\n`;
  const result = handleCheckConsistency({ spec, repo: "tests/fixtures/detect/node-express-pg-redis" });
  assert.notEqual(result.isError, true);
  const payload = JSON.parse(textContent(result)) as { summary: { matched: number } };
  assert.equal(payload.summary.matched, 1);
});

test("check_consistency errors when neither spec nor path is given", () => {
  const result = handleCheckConsistency({ repo: "tests/fixtures/detect/node-express-pg-redis" });
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("spec"));
});

test("check_consistency errors when no repo is given", () => {
  const result = handleCheckConsistency({ path: "tests/fixtures/check/web-3tier.yaml" });
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("repo"));
});

test("check_consistency rejects a non-architecture spec", () => {
  const result = handleCheckConsistency({ path: "examples/c4/context.yaml", repo: "tests/fixtures/detect/empty" });
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("architecture specs only"));
});

test("check_consistency errors when the repo is not a directory", () => {
  const result = handleCheckConsistency({ path: "tests/fixtures/check/web-3tier.yaml", repo: "tests/fixtures/detect/empty/README.md" });
  assert.equal(result.isError, true);
  assert.ok(textContent(result).includes("not a directory"));
});

test("render_diagram writes SVG and PNG when out has no extension (regression)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mcp-out-"));
  const out = join(dir, "diagram"); // no extension
  const result = await handleRenderDiagram({ spec: ARCHITECTURE, png: true, out });
  assert.notEqual(result.isError, true);
  assert.ok(existsSync(out + ".svg"), "should write diagram.svg");
  assert.ok(existsSync(out + ".png"), "should write diagram.png");
  assert.ok(readFileSync(out + ".svg", "utf-8").includes("<svg"), "svg file should contain an <svg element");
  assert.equal(readFileSync(out + ".png").readUInt32BE(0), 0x89504e47, "png file should have PNG magic bytes");
});

test("render_diagram renders from a spec file path", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mcp-path-"));
  const specFile = join(dir, "spec.yaml");
  writeFileSync(specFile, ARCHITECTURE, "utf-8");
  const result = await handleRenderDiagram({ path: specFile });
  assert.notEqual(result.isError, true);
  assert.ok(textContent(result).includes("<svg"));
});

test("render_diagram returns a PNG image when png is set", async () => {
  const result = await handleRenderDiagram({ spec: ARCHITECTURE, png: true });
  assert.notEqual(result.isError, true);
  const img = result.content.find((c) => c.type === "image") as { type: "image"; data: string; mimeType: string } | undefined;
  assert.ok(img, "should include an image content item");
  assert.equal(img.mimeType, "image/png");
  assert.ok(img.data.length > 0, "image data should be non-empty base64");
});

test("render_diagram returns a PDF resource when pdf is set", async () => {
  const result = await handleRenderDiagram({ spec: ARCHITECTURE, pdf: true });
  assert.notEqual(result.isError, true);
  const res = result.content.find((c) => c.type === "resource") as { type: "resource"; resource: { mimeType?: string; blob?: string } } | undefined;
  assert.ok(res, "should include a resource content item");
  assert.equal(res.resource.mimeType, "application/pdf");
  assert.ok(res.resource.blob && res.resource.blob.length > 0, "pdf blob should be non-empty base64");
});

test("validate_spec accepts a spec file path", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcp-validate-"));
  const specFile = join(dir, "spec.yaml");
  writeFileSync(specFile, ARCHITECTURE, "utf-8");
  const result = handleValidateSpec({ path: specFile });
  assert.notEqual(result.isError, true);
  assert.ok(textContent(result).includes("valid"));
});

test("stdio integration: initialize, tools/list, tools/call", async () => {
  const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "mcp"], { cwd: process.cwd() });

  const responses = new Map<number, any>();
  let buffer = "";
  let timer: NodeJS.Timeout | undefined;

  const done = new Promise<void>((resolve, reject) => {
    const fail = (err: Error) => {
      if (timer) clearTimeout(timer);
      reject(err);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf-8");
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (typeof msg.id === "number") {
          responses.set(msg.id, msg);
          if (responses.has(1) && responses.has(2) && responses.has(3)) {
            if (timer) clearTimeout(timer);
            resolve();
          }
        }
      }
    });

    child.stderr.on("data", () => {});
    child.on("error", (err) => fail(err));
    child.on("close", (code) => {
      if (!(responses.has(1) && responses.has(2) && responses.has(3))) {
        fail(new Error(`server exited early (code ${code}) before all responses arrived`));
      }
    });

    timer = setTimeout(() => fail(new Error("timed out waiting for MCP responses")), 30000);
  });

  try {
    const send = (obj: unknown) => child.stdin.write(JSON.stringify(obj) + "\n");
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "render_diagram", arguments: { spec: ARCHITECTURE } } });
    await done;

    assert.equal(responses.get(1).result.serverInfo.name, "architecture-diagrams");

    const toolNames = responses.get(2).result.tools.map((t: any) => t.name);
    for (const name of ["render_diagram", "search_icons", "validate_spec", "list_diagram_types", "analyze_codebase", "check_consistency"]) {
      assert.ok(toolNames.includes(name), `tools/list should include ${name}`);
    }

    const content = responses.get(3).result.content;
    const svgItem = content.find((c: any) => c.type === "text" && c.text.includes("<svg"));
    assert.ok(svgItem, "tools/call should return SVG text content");
  } finally {
    child.kill();
  }
});
