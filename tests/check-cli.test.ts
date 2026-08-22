import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const FIXTURES = "tests/fixtures/check";
const REPOS = "tests/fixtures/detect";

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

test("check: clean spec vs matching repo -> exit 0 with matches + summary", async () => {
  const { code, stdout } = await runCli(["check", `${FIXTURES}/web-3tier.yaml`, "--repo", `${REPOS}/node-express-pg-redis`]);
  assert.equal(code, 0, `expected exit 0, got ${code}\nstdout:\n${stdout}\nstderr:\n`);
  assert.ok(stdout.includes("Summary:"), "should print a summary line");
  assert.ok(stdout.includes("3 matched"), `summary should count 3 matches: ${stdout}`);
  assert.ok(stdout.toLowerCase().includes("redis"), "should report the redis match");
});

test("check: s3 node without evidence -> exit 1 with the missing-evidence finding", async () => {
  const { code, stdout } = await runCli(["check", `${FIXTURES}/with-dynamodb.yaml`, "--repo", `${REPOS}/node-express-pg-redis`]);
  assert.equal(code, 1, `expected exit 1, got ${code}\nstdout:\n${stdout}`);
  assert.ok(stdout.includes("s3"), "should name the s3 node");
  assert.ok(stdout.includes("aws:s3"), "should name the s3 icon");
});

test("check: repo with kafka but no kafka node -> exit 1 with undrawn kafka", async () => {
  const { code, stdout } = await runCli(["check", `${FIXTURES}/no-kafka.yaml`, "--repo", `${REPOS}/microservices-gateway`]);
  assert.equal(code, 1, `expected exit 1, got ${code}\nstdout:\n${stdout}`);
  assert.ok(stdout.toLowerCase().includes("kafka"), "should name kafka");
  assert.ok(stdout.includes("no node in the diagram matches"), "should be an undrawn finding");
});

test("check: empty repo caps severities at low -> exit 0, but exit 1 with --strict", async () => {
  const plain = await runCli(["check", `${FIXTURES}/web-3tier.yaml`, "--repo", `${REPOS}/empty`]);
  assert.equal(plain.code, 0, `expected exit 0 without --strict, got ${plain.code}\nstdout:\n${plain.stdout}`);
  assert.ok(plain.stdout.includes("No recognizable manifests"), "should print the no-manifests warning");

  const strict = await runCli(["check", `${FIXTURES}/web-3tier.yaml`, "--repo", `${REPOS}/empty`, "--strict"]);
  assert.equal(strict.code, 1, `expected exit 1 with --strict, got ${strict.code}\nstdout:\n${strict.stdout}`);
});

test("check: non-architecture spec -> exit 1 with a clear error", async () => {
  const { code, stderr } = await runCli(["check", "examples/c4/context.yaml", "--repo", `${REPOS}/empty`]);
  assert.equal(code, 1, `expected exit 1, got ${code}`);
  assert.ok(stderr.includes("architecture specs only"), `should say only architecture specs are supported: ${stderr}`);
});

test("check: non-existent spec -> exit 1 with a read error", async () => {
  const { code, stderr } = await runCli(["check", `${FIXTURES}/does-not-exist.yaml`, "--repo", `${REPOS}/empty`]);
  assert.equal(code, 1, `expected exit 1, got ${code}`);
  assert.ok(stderr.includes("Could not read file"), `should report the read failure: ${stderr}`);
});
