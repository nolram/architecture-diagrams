import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { stringify } from "yaml";
import { analyzeCodebase } from "../src/detect/index.js";
import { buildSpec, type AppNode } from "../src/detect/build.js";
import {
  TECH_MAPPING,
  resolveTech,
  resolveComposeService,
  resolveDockerfileRuntime,
  normalizeImageName,
  unmappedIconKeys,
} from "../src/detect/mapping.js";
import { readK8sManifests, readDockerfile, readCI } from "../src/detect/manifests.js";
import { validateSpecText } from "../src/core/render.js";

const FIXTURES = "tests/fixtures/detect";

function fixture(name: string): string {
  return join(FIXTURES, name);
}

function nodeIds(spec: { nodes: { id: string }[] }): string[] {
  return spec.nodes.map((n) => n.id);
}

function edgePairs(spec: { edges: { from: string; to: string }[] }): string[] {
  return spec.edges.map((e) => `${e.from}->${e.to}`);
}

function assertValidSpec(spec: unknown): void {
  const v = validateSpecText(stringify(spec));
  assert.equal(v.ok, true, `expected a valid spec, got: ${v.ok ? "" : JSON.stringify(v.errors)}`);
}

function app(name: string, driverTechs: string[] = []): AppNode {
  return { name, iconKey: "brand:nodejs", category: "compute", shape: "card", driverTechs: new Set(driverTechs) };
}

describe("detect: mapping table", () => {
  test("every mapping icon key resolves in the catalog", () => {
    assert.deepEqual(unmappedIconKeys(), []);
  });

  test("each canonical tech maps to the expected icon key", () => {
    const expected: Record<string, string> = {
      express: "brand:nodejs",
      nextjs: "brand:nextjs",
      react: "brand:react",
      postgres: "brand:postgresql",
      mysql: "brand:mysql",
      redis: "brand:redis",
      mongodb: "brand:mongodb",
      kafka: "brand:kafka",
      rabbitmq: "brand:rabbitmq",
      nginx: "brand:nginx",
      docker: "brand:docker",
      kubernetes: "brand:kubernetes",
      "github-actions": "brand:github-actions",
      auth0: "brand:auth0",
      okta: "brand:okta",
      stripe: "brand:stripe",
      prometheus: "brand:prometheus",
      grafana: "brand:grafana",
    };
    for (const [tech, iconKey] of Object.entries(expected)) {
      assert.equal(TECH_MAPPING[tech]?.iconKey, iconKey, `tech "${tech}" should map to ${iconKey}`);
    }
  });

  test("resolveTech maps evidence to the right tech + mapping", () => {
    assert.equal(resolveTech("pg")?.tech, "postgres");
    assert.equal(resolveTech("pg")?.mapping.iconKey, "brand:postgresql");
    assert.equal(resolveTech("ioredis")?.tech, "redis");
    assert.equal(resolveTech("next")?.tech, "nextjs");
    assert.equal(resolveTech("mongoose")?.tech, "mongodb");
    assert.equal(resolveTech("kafkajs")?.tech, "kafka");
    assert.equal(resolveTech("amqplib")?.tech, "rabbitmq");
    assert.equal(resolveTech("lodash"), undefined);
  });

  test("normalizeImageName strips tags and registry prefixes", () => {
    assert.equal(normalizeImageName("postgres:15"), "postgres");
    assert.equal(normalizeImageName("docker.io/library/redis:7"), "redis");
    assert.equal(normalizeImageName("localhost:5000/myapp"), "myapp");
    assert.equal(normalizeImageName("myapp"), "myapp");
  });

  test("resolveComposeService resolves known images and falls back gracefully", () => {
    assert.equal(resolveComposeService("postgres:15").tech, "postgres");
    assert.equal(resolveComposeService("postgres:15").iconKey, "brand:postgresql");
    assert.equal(resolveComposeService("redis:7").tech, "redis");
    assert.equal(resolveComposeService("my-queue").tech, undefined);
    assert.equal(resolveComposeService("my-queue").iconKey, "generic:queue");
    assert.equal(resolveComposeService("my-db").iconKey, "generic:database");
    assert.equal(resolveComposeService(undefined).iconKey, "generic:service");
  });

  test("resolveDockerfileRuntime recognizes runtimes and ignores non-runtimes", () => {
    assert.equal(resolveDockerfileRuntime("python:3.12-slim")?.tech, "python");
    assert.equal(resolveDockerfileRuntime("python:3.12-slim")?.mapping.iconKey, "brand:python");
    assert.equal(resolveDockerfileRuntime("node:18")?.tech, "nodejs");
    assert.equal(resolveDockerfileRuntime("golang:1.22")?.tech, "golang");
    assert.equal(resolveDockerfileRuntime("golang:1.22")?.mapping.iconKey, "brand:go");
    // a database image is not a runtime
    assert.equal(resolveDockerfileRuntime("postgres:15"), undefined);
    // an unrecognizable base is not a runtime
    assert.equal(resolveDockerfileRuntime("myapp:latest"), undefined);
    assert.equal(resolveDockerfileRuntime(undefined), undefined);
  });
});

describe("detect: buildSpec", () => {
  test("emits a depends_on edge when both endpoints exist", () => {
    const spec = buildSpec({
      apps: [app("app")],
      compose: {
        name: "proj",
        services: [
          { name: "web", image: "nginx", dependsOn: ["db"] },
          { name: "db", image: "postgres:15", dependsOn: [] },
        ],
        file: "docker-compose.yml",
      },
    });
    assert.ok(edgePairs(spec).includes("web->db"));
    assertValidSpec(spec);
  });

  test("emits an app->store edge only when a driver AND a matching node exist", () => {
    const withDriver = buildSpec({
      apps: [app("app", ["postgres"])],
      compose: { name: "proj", services: [{ name: "db", image: "postgres:15", dependsOn: [] }], file: "docker-compose.yml" },
    });
    assert.ok(edgePairs(withDriver).includes("app->db"));

    const noDriver = buildSpec({
      apps: [app("app")],
      compose: { name: "proj", services: [{ name: "db", image: "postgres:15", dependsOn: [] }], file: "docker-compose.yml" },
    });
    assert.ok(!edgePairs(noDriver).includes("app->db"));

    const noNode = buildSpec({ apps: [app("app", ["postgres"])], compose: undefined });
    assert.deepEqual(noNode.edges, []);
  });

  test("keeps the empty case valid with a placeholder node", () => {
    const spec = buildSpec({ apps: [], compose: undefined });
    assert.equal(spec.nodes.length, 1);
    assertValidSpec(spec);
  });

  test("emits one node per monorepo app", () => {
    const spec = buildSpec({ apps: [app("api"), app("web")], compose: undefined });
    assert.deepEqual(nodeIds(spec).sort(), ["api", "web"]);
    assertValidSpec(spec);
  });
});

describe("detect: k8s reader", () => {
  test("parses Deployment/Service/Ingress/Namespace from the k8s-web fixture", () => {
    const info = readK8sManifests(fixture("k8s-web"));
    const kinds = info.manifests.map((m) => m.kind).sort();
    assert.deepEqual(kinds, ["Deployment", "Ingress", "Namespace", "Service"]);

    const dep = info.manifests.find((m) => m.kind === "Deployment")!;
    assert.equal(dep.name, "web-app");
    assert.equal(dep.namespace, "web");
    assert.deepEqual(dep.matchLabels, { app: "web" });
    assert.equal(dep.image, "node:18");

    const svc = info.manifests.find((m) => m.kind === "Service")!;
    assert.equal(svc.name, "web-svc");
    assert.deepEqual(svc.selector, { app: "web" });

    const ing = info.manifests.find((m) => m.kind === "Ingress")!;
    assert.equal(ing.name, "web-ingress");
    assert.deepEqual(ing.hosts, ["web.example.com"]);
    assert.deepEqual(ing.backends, ["web-svc"]);
  });

  test("returns an empty list when there are no k8s manifests", () => {
    assert.deepEqual(readK8sManifests(fixture("empty")).manifests, []);
  });
});

describe("detect: dockerfile reader", () => {
  test("extracts FROM and EXPOSE from the dockerfile-python fixture", () => {
    const info = readDockerfile(fixture("dockerfile-python"));
    assert.ok(info, "should find a Dockerfile");
    assert.equal(info!.from, "python:3.12-slim");
    assert.deepEqual(info!.ports, ["8000"]);
    assert.equal(info!.file, "Dockerfile");
  });

  test("returns undefined when there is no Dockerfile", () => {
    assert.equal(readDockerfile(fixture("empty")), undefined);
  });
});

describe("detect: CI reader", () => {
  test("detects github-actions from .github/workflows", () => {
    const info = readCI(fixture("ci-github"));
    assert.ok(info);
    assert.equal(info!.tech, "github-actions");
    assert.ok(info!.file.startsWith(".github/workflows/"));
  });

  test("detects jenkins from a Jenkinsfile", () => {
    const info = readCI(fixture("ci-jenkins"));
    assert.ok(info);
    assert.equal(info!.tech, "jenkins");
    assert.equal(info!.file, "Jenkinsfile");
  });

  test("detects gitlab-ci from .gitlab-ci.yml", () => {
    const info = readCI(fixture("ci-gitlab"));
    assert.ok(info);
    assert.equal(info!.tech, "gitlab-ci");
    assert.equal(info!.file, ".gitlab-ci.yml");
  });

  test("returns undefined when there is no CI config", () => {
    assert.equal(readCI(fixture("empty")), undefined);
  });
});

describe("detect: fixture repos", () => {
  test("node-express-pg-redis: app + postgres + redis nodes, app->db and app->cache edges", () => {
    const result = analyzeCodebase(fixture("node-express-pg-redis"));

    const techs = result.detected.map((d) => d.tech);
    assert.ok(techs.includes("express"));
    assert.ok(techs.includes("postgres"));
    assert.ok(techs.includes("redis"));

    const ids = nodeIds(result.draftSpec);
    assert.ok(ids.includes("app"));
    assert.ok(ids.includes("db"));
    assert.ok(ids.includes("cache"));

    const edges = edgePairs(result.draftSpec);
    assert.ok(edges.includes("app->db"));
    assert.ok(edges.includes("app->cache"));

    assert.ok(result.draftSpec.groups.some((g) => g.style === "boundary"));
    assertValidSpec(result.draftSpec);
  });

  test("monorepo: one node per workspace", () => {
    const result = analyzeCodebase(fixture("monorepo"));
    const ids = nodeIds(result.draftSpec);
    assert.ok(ids.includes("api"));
    assert.ok(ids.includes("web"));
    assertValidSpec(result.draftSpec);
  });

  test("empty: graceful (warning, no crash, minimal valid spec)", () => {
    const result = analyzeCodebase(fixture("empty"));
    assert.ok(result.warnings.length > 0);
    assert.ok(result.draftSpec.nodes.length >= 1);
    assertValidSpec(result.draftSpec);
  });

  test("unknown: graceful fallback (warnings + generic icons)", () => {
    const result = analyzeCodebase(fixture("unknown"));
    assert.ok(result.warnings.length > 0);
    const icons = result.draftSpec.nodes.map((n) => n.icon);
    assert.ok(icons.includes("generic:service"));
    assert.ok(icons.includes("generic:database"));
    assertValidSpec(result.draftSpec);
  });

  test("k8s-web: deployment + ingress + service nodes, ingress->service->deployment edges, namespace group", () => {
    const result = analyzeCodebase(fixture("k8s-web"));

    const ids = nodeIds(result.draftSpec);
    assert.ok(ids.includes("web-app"), `expected the deployment node in ${ids.join(", ")}`);
    assert.ok(ids.includes("web-ingress"), `expected the ingress node in ${ids.join(", ")}`);
    assert.ok(ids.includes("web-svc"), `expected the service node in ${ids.join(", ")}`);

    // the deployment node is icon'd by its container image (node:18 -> nodejs)
    const dep = result.draftSpec.nodes.find((n) => n.id === "web-app");
    assert.equal(dep?.icon, "brand:nodejs");
    // the ingress node is a network node
    const ing = result.draftSpec.nodes.find((n) => n.id === "web-ingress");
    assert.equal(ing?.category, "network");

    // a boundary group for the namespace
    assert.ok(result.draftSpec.groups.some((g) => g.style === "boundary" && g.label === "web"));
    // the nodes are placed in the namespace group
    assert.equal(dep?.group, "web");
    assert.equal(ing?.group, "web");

    // edges: ingress -> service -> deployment
    const edges = edgePairs(result.draftSpec);
    assert.ok(edges.includes("web-ingress->web-svc"), `expected ingress->service in ${edges.join(", ")}`);
    assert.ok(edges.includes("web-svc->web-app"), `expected service->deployment in ${edges.join(", ")}`);

    // kubernetes is detected (high confidence)
    const k8s = result.detected.find((d) => d.tech === "kubernetes");
    assert.ok(k8s, "expected kubernetes in the detected stack");
    assert.equal(k8s?.confidence, "high");

    assertValidSpec(result.draftSpec);
  });

  test("dockerfile-python: python runtime detected (high confidence) + a runtime node", () => {
    const result = analyzeCodebase(fixture("dockerfile-python"));

    const py = result.detected.find((d) => d.tech === "python");
    assert.ok(py, "expected python in the detected stack");
    assert.equal(py?.confidence, "high");
    assert.equal(py?.iconKey, "brand:python");
    assert.ok(py?.source.includes("Dockerfile"), `expected the source to name the Dockerfile, got ${py?.source}`);

    const runtime = result.draftSpec.nodes.find((n) => n.icon === "brand:python");
    assert.ok(runtime, "expected a python runtime node");
    assertValidSpec(result.draftSpec);
  });

  test("ci-github: github-actions detected (high confidence) + a CI node", () => {
    const result = analyzeCodebase(fixture("ci-github"));

    const ci = result.detected.find((d) => d.tech === "github-actions");
    assert.ok(ci, "expected github-actions in the detected stack");
    assert.equal(ci?.confidence, "high");
    assert.equal(ci?.iconKey, "brand:github-actions");
    assert.ok(ci?.source.startsWith(".github/workflows/"), `expected the source to name the workflow, got ${ci?.source}`);

    const node = result.draftSpec.nodes.find((n) => n.icon === "brand:github-actions");
    assert.ok(node, "expected a CI node");
    assertValidSpec(result.draftSpec);
  });

  test("ci-jenkins: jenkins detected (high confidence)", () => {
    const result = analyzeCodebase(fixture("ci-jenkins"));
    const ci = result.detected.find((d) => d.tech === "jenkins");
    assert.ok(ci, "expected jenkins in the detected stack");
    assert.equal(ci?.confidence, "high");
    assert.equal(ci?.iconKey, "brand:jenkins");
    assertValidSpec(result.draftSpec);
  });

  test("ci-gitlab: gitlab-ci detected (high confidence)", () => {
    const result = analyzeCodebase(fixture("ci-gitlab"));
    const ci = result.detected.find((d) => d.tech === "gitlab-ci");
    assert.ok(ci, "expected gitlab-ci in the detected stack");
    assert.equal(ci?.confidence, "high");
    assert.equal(ci?.iconKey, "brand:gitlab");
    assertValidSpec(result.draftSpec);
  });
});
