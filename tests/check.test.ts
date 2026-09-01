import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkConsistency } from "../src/detect/check.js";
import { TECH_MAPPING } from "../src/detect/mapping.js";
import type { Confidence, DetectedTech, DetectionResult } from "../src/detect/types.js";
import type { DiagramNode, DiagramSpec } from "../src/spec/schema.js";

function makeNode(id: string, label: string, extra: Partial<DiagramNode> = {}): DiagramNode {
  return { id, label, category: "generic", shape: "card", ...extra };
}

function makeSpec(nodes: DiagramNode[]): DiagramSpec {
  return {
    type: "architecture",
    version: "1",
    theme: "clean-light",
    direction: "auto",
    wrap: { maxLines: 6 },
    nodes,
    groups: [],
    edges: [],
  };
}

function makeDetected(tech: string, confidence: Confidence, source: string): DetectedTech {
  const mapping = TECH_MAPPING[tech];
  assert.ok(mapping, `test helper: tech "${tech}" must be in TECH_MAPPING`);
  return { tech, iconKey: mapping.iconKey, category: mapping.category, shape: mapping.shape, confidence, source };
}

function makeDetection(detected: DetectedTech[]): DetectionResult {
  return { detected, draftSpec: makeSpec([makeNode("placeholder", "Placeholder")]), warnings: [] };
}

describe("check: matching", () => {
  test("icon match: node icon brand:redis + detected redis -> match via icon, no findings", () => {
    const spec = makeSpec([makeNode("cache", "Redis cache", { icon: "brand:redis" })]);
    const detection = makeDetection([makeDetected("redis", "high", "docker-compose.yml:services.cache.image")]);

    const result = checkConsistency(spec, detection);
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0].via, "icon");
    assert.equal(result.matches[0].tech, "redis");
    assert.equal(result.matches[0].confidence, "high");
    assert.equal(result.matches[0].source, "docker-compose.yml:services.cache.image");
    assert.equal(result.findings.length, 0);
    assert.equal(result.summary.matched, 1);
  });

  test("name match: generic icon + label 'Redis cache' + detected redis -> match via name", () => {
    const spec = makeSpec([makeNode("cache", "Redis cache", { icon: "generic:database" })]);
    const detection = makeDetection([makeDetected("redis", "high", "package.json:dependencies.ioredis")]);

    const result = checkConsistency(spec, detection);
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0].via, "name");
    assert.equal(result.matches[0].tech, "redis");
    assert.equal(result.findings.filter((f) => f.kind === "missing-evidence").length, 0);
  });

  test("word boundary: label 'reaction engine' does NOT match detected react", () => {
    const spec = makeSpec([makeNode("engine", "reaction engine")]);
    const detection = makeDetection([makeDetected("react", "high", "package.json:dependencies.react")]);

    const result = checkConsistency(spec, detection);
    assert.equal(result.matches.length, 0);
    const finding = result.findings.find((f) => f.kind === "missing-evidence");
    assert.ok(finding, "expected a missing-evidence finding for the node");
    assert.equal(finding?.severity, "low");
  });

  test("multi-tech icon: brand:nodejs with express (medium) + nodejs (high) -> nodejs wins", () => {
    const spec = makeSpec([makeNode("app", "App", { icon: "brand:nodejs" })]);
    const detection = makeDetection([
      makeDetected("express", "medium", "package.json:dependencies.express"),
      makeDetected("nodejs", "high", "Dockerfile:FROM"),
    ]);

    const result = checkConsistency(spec, detection);
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0].tech, "nodejs");
    assert.equal(result.matches[0].via, "icon");
    assert.equal(result.matches[0].confidence, "high");
  });

  test("icon-sharing coverage: brand:nodejs node covers express AND nodejs -> no undrawn findings", () => {
    const spec = makeSpec([makeNode("app", "App", { icon: "brand:nodejs" })]);
    const detection = makeDetection([
      makeDetected("express", "medium", "package.json:dependencies.express"),
      makeDetected("nodejs", "high", "docker-compose.yml:services.api.image"),
    ]);

    const result = checkConsistency(spec, detection);
    assert.equal(result.matches.length, 1);
    assert.equal(result.findings.length, 0, `expected no findings (both techs covered by the icon), got: ${JSON.stringify(result.findings)}`);
  });

  test("name multi-coverage: label naming two techs covers both -> no undrawn findings", () => {
    const spec = makeSpec([makeNode("broker", "Redis and Kafka broker")]);
    const detection = makeDetection([
      makeDetected("redis", "high", "docker-compose.yml:services.cache.image"),
      makeDetected("kafka", "high", "docker-compose.yml:services.queue.image"),
    ]);

    const result = checkConsistency(spec, detection);
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0].via, "name");
    assert.equal(result.findings.length, 0, `expected no findings (both techs named by the node), got: ${JSON.stringify(result.findings)}`);
  });
});

describe("check: missing-evidence", () => {
  test("node icon brand:redis, no redis detected -> missing-evidence high with tech redis", () => {
    const spec = makeSpec([makeNode("cache", "Redis cache", { icon: "brand:redis" })]);
    const detection = makeDetection([makeDetected("postgres", "high", "docker-compose.yml:services.db.image")]);

    const result = checkConsistency(spec, detection);
    const finding = result.findings.find((f) => f.kind === "missing-evidence");
    assert.ok(finding, "expected a missing-evidence finding");
    assert.equal(finding?.severity, "high");
    assert.equal(finding?.tech, "redis");
    assert.equal(finding?.node?.id, "cache");
    assert.equal(finding?.node?.icon, "brand:redis");
    assert.ok(finding?.message.includes("cache"), `message should name the node id: ${finding?.message}`);
    assert.ok(finding?.message.includes("redis"), `message should name the tech: ${finding?.message}`);
  });

  test("node icon aws:s3 (external category), no match -> missing-evidence medium", () => {
    const spec = makeSpec([makeNode("s3", "Object storage", { icon: "aws:s3", category: "external" })]);
    const detection = makeDetection([makeDetected("postgres", "high", "docker-compose.yml:services.db.image")]);

    const result = checkConsistency(spec, detection);
    const finding = result.findings.find((f) => f.kind === "missing-evidence");
    assert.ok(finding, "expected a missing-evidence finding");
    assert.equal(finding?.severity, "medium");
  });

  test("no-evidence guard: empty detection -> warning + severity capped at low", () => {
    const spec = makeSpec([makeNode("cache", "Redis cache", { icon: "brand:redis" })]);
    const detection: DetectionResult = { detected: [], draftSpec: makeSpec([makeNode("placeholder", "Placeholder")]), warnings: [] };

    const result = checkConsistency(spec, detection);
    assert.ok(
      result.warnings.some((w) => w.includes("No recognizable manifests")),
      `expected the no-manifests warning, got: ${result.warnings.join(" | ")}`,
    );
    const finding = result.findings.find((f) => f.kind === "missing-evidence");
    assert.ok(finding, "expected a missing-evidence finding");
    assert.equal(finding?.severity, "low");
  });
});

describe("check: undrawn", () => {
  test("detected kafka (high), no matching node -> undrawn high with evidence", () => {
    const spec = makeSpec([makeNode("app", "App")]);
    const detection = makeDetection([makeDetected("kafka", "high", "docker-compose.yml:services.queue.image")]);

    const result = checkConsistency(spec, detection);
    const finding = result.findings.find((f) => f.kind === "undrawn");
    assert.ok(finding, "expected an undrawn finding");
    assert.equal(finding?.severity, "high");
    assert.equal(finding?.tech, "kafka");
    assert.equal(finding?.evidence, "docker-compose.yml:services.queue.image");
    assert.ok(finding?.message.toLowerCase().includes("kafka"), `message should name the tech: ${finding?.message}`);
    assert.ok(finding?.message.includes("docker-compose.yml"), `message should name the evidence: ${finding?.message}`);
  });

  test("detected kubernetes (high), no matching node -> undrawn capped at low (presence-based)", () => {
    const spec = makeSpec([makeNode("app", "App")]);
    const detection = makeDetection([makeDetected("kubernetes", "high", "k8s.yaml:kind=Deployment,name=app")]);

    const result = checkConsistency(spec, detection);
    const finding = result.findings.find((f) => f.kind === "undrawn");
    assert.ok(finding, "expected an undrawn finding");
    assert.equal(finding?.severity, "low");
    assert.equal(finding?.tech, "kubernetes");
  });

  test("detected k8s 'ingress' (high, not in TECH_MAPPING), no matching node -> undrawn capped at low (unsatisfiable placeholder)", () => {
    const spec = makeSpec([makeNode("app", "App")]);
    const detection: DetectionResult = {
      detected: [
        { tech: "ingress", iconKey: "generic:api", category: "network", shape: "card", confidence: "high", source: "k8s.yaml:kind=Ingress,name=web" },
      ],
      draftSpec: makeSpec([makeNode("placeholder", "Placeholder")]),
      warnings: [],
    };

    const result = checkConsistency(spec, detection);
    const finding = result.findings.find((f) => f.kind === "undrawn");
    assert.ok(finding, "expected an undrawn finding");
    assert.equal(finding?.severity, "low", `placeholder techs must be capped at low, got: ${finding?.severity}`);
    assert.equal(finding?.tech, "ingress");
  });

  test("detected k8s 'service' (high, not in TECH_MAPPING), no matching node -> undrawn capped at low (unsatisfiable placeholder)", () => {
    const spec = makeSpec([makeNode("app", "App")]);
    const detection: DetectionResult = {
      detected: [
        { tech: "service", iconKey: "generic:service", category: "compute", shape: "card", confidence: "high", source: "k8s.yaml:kind=Deployment,name=api" },
      ],
      draftSpec: makeSpec([makeNode("placeholder", "Placeholder")]),
      warnings: [],
    };

    const result = checkConsistency(spec, detection);
    const finding = result.findings.find((f) => f.kind === "undrawn");
    assert.ok(finding, "expected an undrawn finding");
    assert.equal(finding?.severity, "low", `placeholder techs must be capped at low, got: ${finding?.severity}`);
    assert.equal(finding?.tech, "service");
  });
});

describe("check: result shape", () => {
  test("findings are sorted high -> medium -> low", () => {
    const spec = makeSpec([
      makeNode("cache", "Redis cache", { icon: "brand:redis" }), // missing-evidence high
      makeNode("s3", "Object storage", { icon: "aws:s3", category: "external" }), // missing-evidence medium
      makeNode("misc", "Misc"), // missing-evidence low
    ]);
    const detection = makeDetection([makeDetected("kafka", "high", "docker-compose.yml:services.queue.image")]); // undrawn high

    const result = checkConsistency(spec, detection);
    assert.deepEqual(
      result.findings.map((f) => f.severity),
      ["high", "high", "medium", "low"],
    );
  });

  test("summary counts: matched + missingEvidence = node count; undrawn = undrawn findings", () => {
    const spec = makeSpec([
      makeNode("cache", "Redis cache", { icon: "brand:redis" }), // matched
      makeNode("s3", "Object storage", { icon: "aws:s3", category: "external" }), // missing-evidence
    ]);
    const detection = makeDetection([
      makeDetected("redis", "high", "docker-compose.yml:services.cache.image"),
      makeDetected("kafka", "high", "docker-compose.yml:services.queue.image"),
    ]);

    const result = checkConsistency(spec, detection);
    assert.equal(result.summary.matched + result.summary.missingEvidence, spec.nodes.length);
    assert.equal(result.summary.undrawn, result.findings.filter((f) => f.kind === "undrawn").length);
    assert.equal(result.summary.matched, 1);
    assert.equal(result.summary.missingEvidence, 1);
    assert.equal(result.summary.undrawn, 1);
  });

  test("detection warnings are passed through to result.warnings", () => {
    const spec = makeSpec([makeNode("app", "App")]);
    const detection: DetectionResult = {
      detected: [makeDetected("kafka", "high", "docker-compose.yml:services.queue.image")],
      draftSpec: makeSpec([makeNode("placeholder", "Placeholder")]),
      warnings: ['Compose service "worker" (image: myapp) is not in the tech mapping; using a generic icon.'],
    };

    const result = checkConsistency(spec, detection);
    assert.ok(
      result.warnings.some((w) => w.includes('Compose service "worker"')),
      `expected the detection warning to be passed through, got: ${result.warnings.join(" | ")}`,
    );
  });
});
