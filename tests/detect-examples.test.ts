import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { stringify } from "yaml";
import { analyzeCodebase } from "../src/detect/index.js";
import { validateSpecText } from "../src/core/render.js";

const FIXTURES = "tests/fixtures/detect";

function fixture(name: string): string {
  return join(FIXTURES, name);
}

function nodeIds(spec: { nodes: { id: string }[] }): string[] {
  return spec.nodes.map((n) => n.id);
}

function nodeIcons(spec: { nodes: { icon?: string }[] }): string[] {
  return spec.nodes.map((n) => n.icon ?? "");
}

function nodeCategories(spec: { nodes: { category: string }[] }): string[] {
  return [...new Set(spec.nodes.map((n) => n.category))];
}

function edgePairs(spec: { edges: { from: string; to: string }[] }): string[] {
  return spec.edges.map((e) => `${e.from}->${e.to}`);
}

function detectedIconKeys(result: { detected: { iconKey: string }[] }): string[] {
  return result.detected.map((d) => d.iconKey);
}

function assertValidSpec(spec: unknown): void {
  const v = validateSpecText(stringify(spec));
  assert.equal(v.ok, true, `expected a valid spec, got: ${v.ok ? "" : JSON.stringify(v.errors)}`);
}

describe("detect examples: microservices-gateway", () => {
  test("emits app + gateway/api/db/cache/queue nodes and a valid spec", () => {
    const result = analyzeCodebase(fixture("microservices-gateway"));
    const ids = nodeIds(result.draftSpec);
    for (const id of ["app", "gateway", "api", "db", "cache", "queue"]) {
      assert.ok(ids.includes(id), `expected node "${id}" in ${ids.join(", ")}`);
    }
    assertValidSpec(result.draftSpec);
  });

  test("node icons cover nginx/postgres/redis/kafka and the nodejs app + api service", () => {
    const result = analyzeCodebase(fixture("microservices-gateway"));
    const icons = nodeIcons(result.draftSpec);
    for (const icon of ["brand:nginx", "brand:postgresql", "brand:redis", "brand:kafka", "brand:nodejs"]) {
      assert.ok(icons.includes(icon), `expected icon "${icon}" in ${icons.join(", ")}`);
    }
    // the `api` service uses image `node:18`, which maps to the nodejs runtime (brand:nodejs)
    const apiNode = result.draftSpec.nodes.find((n) => n.id === "api");
    assert.equal(apiNode?.icon, "brand:nodejs");
  });

  test("emits depends_on edges (api->db/cache/queue) and app->store edges (app->db/cache/queue)", () => {
    const result = analyzeCodebase(fixture("microservices-gateway"));
    const edges = edgePairs(result.draftSpec);
    for (const edge of ["api->db", "api->cache", "api->queue", "app->db", "app->cache", "app->queue"]) {
      assert.ok(edges.includes(edge), `expected edge "${edge}" in ${edges.join(", ")}`);
    }
  });

  test("exercises compute, network, database and messaging categories", () => {
    const result = analyzeCodebase(fixture("microservices-gateway"));
    const cats = nodeCategories(result.draftSpec);
    for (const c of ["compute", "network", "database", "messaging"]) {
      assert.ok(cats.includes(c), `expected category "${c}" in ${cats.join(", ")}`);
    }
  });
});

describe("detect examples: fullstack-observability", () => {
  test("emits app + db/metrics/dashboards nodes and a valid spec", () => {
    const result = analyzeCodebase(fixture("fullstack-observability"));
    const ids = nodeIds(result.draftSpec);
    for (const id of ["app", "db", "metrics", "dashboards"]) {
      assert.ok(ids.includes(id), `expected node "${id}" in ${ids.join(", ")}`);
    }
    assertValidSpec(result.draftSpec);
  });

  test("node icons cover nextjs/postgres/prometheus/grafana", () => {
    const result = analyzeCodebase(fixture("fullstack-observability"));
    const icons = nodeIcons(result.draftSpec);
    for (const icon of ["brand:nextjs", "brand:postgresql", "brand:prometheus", "brand:grafana"]) {
      assert.ok(icons.includes(icon), `expected icon "${icon}" in ${icons.join(", ")}`);
    }
  });

  test("emits the app->db edge (pg driver + postgres node)", () => {
    const result = analyzeCodebase(fixture("fullstack-observability"));
    const edges = edgePairs(result.draftSpec);
    assert.ok(edges.includes("app->db"), `expected edge "app->db" in ${edges.join(", ")}`);
  });

  test("stripe and auth0 are detected (external/security) even though they are not nodes", () => {
    const result = analyzeCodebase(fixture("fullstack-observability"));
    const detected = detectedIconKeys(result);
    assert.ok(detected.includes("brand:stripe"), `expected brand:stripe in detected ${detected.join(", ")}`);
    assert.ok(detected.includes("brand:auth0"), `expected brand:auth0 in detected ${detected.join(", ")}`);
    // ...but only apps + compose services become nodes, so they are absent from the node set
    const icons = nodeIcons(result.draftSpec);
    assert.ok(!icons.includes("brand:stripe"), "stripe should not be a node");
    assert.ok(!icons.includes("brand:auth0"), "auth0 should not be a node");
  });

  test("exercises compute, database and generic categories", () => {
    const result = analyzeCodebase(fixture("fullstack-observability"));
    const cats = nodeCategories(result.draftSpec);
    for (const c of ["compute", "database", "generic"]) {
      assert.ok(cats.includes(c), `expected category "${c}" in ${cats.join(", ")}`);
    }
  });
});

describe("detect examples: monorepo-infra", () => {
  test("emits one node per workspace (api, web) plus db/broker and a valid spec", () => {
    const result = analyzeCodebase(fixture("monorepo-infra"));
    const ids = nodeIds(result.draftSpec);
    for (const id of ["api", "web", "db", "broker"]) {
      assert.ok(ids.includes(id), `expected node "${id}" in ${ids.join(", ")}`);
    }
    assertValidSpec(result.draftSpec);
  });

  test("node icons cover nodejs (api), react (web), mysql and rabbitmq", () => {
    const result = analyzeCodebase(fixture("monorepo-infra"));
    const icons = nodeIcons(result.draftSpec);
    for (const icon of ["brand:nodejs", "brand:react", "brand:mysql", "brand:rabbitmq"]) {
      assert.ok(icons.includes(icon), `expected icon "${icon}" in ${icons.join(", ")}`);
    }
  });

  test("emits api->db (mysql2 driver + mysql node) and api->broker (amqplib driver + rabbitmq node)", () => {
    const result = analyzeCodebase(fixture("monorepo-infra"));
    const edges = edgePairs(result.draftSpec);
    assert.ok(edges.includes("api->db"), `expected edge "api->db" in ${edges.join(", ")}`);
    assert.ok(edges.includes("api->broker"), `expected edge "api->broker" in ${edges.join(", ")}`);
  });

  test("exercises compute, database and messaging categories", () => {
    const result = analyzeCodebase(fixture("monorepo-infra"));
    const cats = nodeCategories(result.draftSpec);
    for (const c of ["compute", "database", "messaging"]) {
      assert.ok(cats.includes(c), `expected category "${c}" in ${cats.join(", ")}`);
    }
  });
});
