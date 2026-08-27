import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURES = "tests/fixtures/mermaid";

function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", ...args], { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

test("import basic.mmd -> exit 0 with a valid architecture spec", async () => {
  const { code, stdout } = await runCli(["import", `${FIXTURES}/basic.mmd`]);
  assert.equal(code, 0, `expected exit 0, got ${code}\nstdout:\n${stdout}\nstderr:\n`);
  assert.ok(stdout.includes("type: architecture"), "spec should be an architecture spec");
  assert.ok(stdout.includes("Web Client"), "should contain the client node label");
  assert.ok(stdout.includes("API Gateway"), "should contain the gateway node label");
  assert.ok(stdout.includes("Postgres"), "should contain the database node label");
  assert.ok(stdout.includes("HTTPS"), "should keep the edge label");
  assert.ok(stdout.includes("groups:"), "subgraph should become a groups section");
  assert.ok(stdout.includes("Backend"), "group label should be the subgraph title");
});

test("import shapes.mmd -> exit 0, cylinder becomes database, others become cards", async () => {
  const { code, stdout } = await runCli(["import", `${FIXTURES}/shapes.mmd`]);
  assert.equal(code, 0, `expected exit 0, got ${code}\nstdout:\n${stdout}\nstderr:\n`);
  assert.ok(stdout.includes("shape: database"), "cylinder node should map to shape: database");
  assert.ok(stdout.includes("shape: card"), "other shapes should map to shape: card");
});

test("import unsupported.mmd -> exit 0, styling dropped with warnings", async () => {
  const { code, stdout, stderr } = await runCli(["import", `${FIXTURES}/unsupported.mmd`]);
  assert.equal(code, 0, `expected exit 0 (styling is dropped, not fatal), got ${code}\nstderr:\n${stderr}`);
  assert.ok(stdout.includes("Alpha"), "nodes should still be imported");
  assert.ok(stderr.includes("Warnings"), "should print a warnings block");
  assert.ok(stderr.includes("classDef"), "should mention the dropped classDef statement");
  assert.ok(stderr.includes("style"), "should mention the dropped style statement");
  assert.ok(stderr.includes("linkStyle"), "should mention the dropped linkStyle statement");
});

test("import nonexistent file -> exit 1 with a read error", async () => {
  const { code, stderr } = await runCli(["import", `${FIXTURES}/does-not-exist.mmd`]);
  assert.equal(code, 1, `expected exit 1, got ${code}`);
  assert.ok(stderr.includes("Could not read file"), `should report the read failure: ${stderr}`);
});

test("import basic.mmd --render -o <tmp>/out.svg -> exit 0 and writes an SVG", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mermaid-import-"));
  const out = join(dir, "out.svg");
  const { code, stderr } = await runCli(["import", `${FIXTURES}/basic.mmd`, "--render", "-o", out]);
  assert.equal(code, 0, `expected exit 0, got ${code}\nstderr:\n${stderr}`);
  assert.ok(existsSync(out), "should write the SVG file");
  assert.ok(readFileSync(out, "utf-8").includes("<svg"), "SVG file should contain an <svg element");
});

test("import rejects a non-flowchart diagram type", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mermaid-import-"));
  const file = join(dir, "sequence.mmd");
  writeFileSync(file, "sequenceDiagram\nA->>B: hi\n", "utf-8");
  const { code, stderr } = await runCli(["import", file]);
  assert.equal(code, 1, `expected exit 1, got ${code}\nstderr:\n${stderr}`);
  assert.ok(/flowchart/i.test(stderr), `should mention flowchart: ${stderr}`);
  assert.ok(/Only/i.test(stderr), `should say only flowchart is supported: ${stderr}`);
});
