import { getCatalogEntry, type IconCategory } from "../icons/catalog.js";
import type { NodeShape } from "./types.js";

/** the curated mapping of a canonical technology to an icon + node category/shape */
export interface TechMapping {
  iconKey: string;
  category: IconCategory;
  shape: NodeShape;
}

/**
 * Canonical technology name -> icon mapping. This is the core data asset of the
 * detect feature: every key below was verified present in the icon catalog
 * (see `npm run validate:icons` and the mapping-table unit tests).
 *
 * The table is intentionally broader than what v0.9.1 detects (it also covers
 * docker / kubernetes / CI) so later increments (v0.9.2) can build on it.
 */
export const TECH_MAPPING: Record<string, TechMapping> = {
  // ---- Node.js frameworks / runtimes (from package.json) ----
  express: { iconKey: "brand:nodejs", category: "compute", shape: "card" },
  nextjs: { iconKey: "brand:nextjs", category: "compute", shape: "card" },
  react: { iconKey: "brand:react", category: "compute", shape: "card" },
  nodejs: { iconKey: "brand:nodejs", category: "compute", shape: "card" },
  // ---- Other runtimes (from Dockerfile `FROM`) ----
  python: { iconKey: "brand:python", category: "compute", shape: "card" },
  golang: { iconKey: "brand:go", category: "compute", shape: "card" },
  ruby: { iconKey: "brand:ruby", category: "compute", shape: "card" },
  php: { iconKey: "brand:php", category: "compute", shape: "card" },
  java: { iconKey: "brand:java", category: "compute", shape: "card" },
  dotnet: { iconKey: "brand:dotnet", category: "compute", shape: "card" },
  rust: { iconKey: "brand:rust", category: "compute", shape: "card" },
  // ---- Databases (npm drivers or compose images) ----
  postgres: { iconKey: "brand:postgresql", category: "database", shape: "database" },
  mysql: { iconKey: "brand:mysql", category: "database", shape: "database" },
  redis: { iconKey: "brand:redis", category: "database", shape: "card" },
  mongodb: { iconKey: "brand:mongodb", category: "database", shape: "database" },
  // ---- Messaging (npm drivers or compose images) ----
  kafka: { iconKey: "brand:kafka", category: "messaging", shape: "card" },
  rabbitmq: { iconKey: "brand:rabbitmq", category: "messaging", shape: "card" },
  // ---- Network (compose images) ----
  nginx: { iconKey: "brand:nginx", category: "network", shape: "card" },
  // ---- Container / orchestration (presence-based) ----
  docker: { iconKey: "brand:docker", category: "compute", shape: "card" },
  kubernetes: { iconKey: "brand:kubernetes", category: "compute", shape: "card" },
  // ---- CI/CD (presence-based) ----
  "github-actions": { iconKey: "brand:github-actions", category: "generic", shape: "card" },
  jenkins: { iconKey: "brand:jenkins", category: "generic", shape: "card" },
  "gitlab-ci": { iconKey: "brand:gitlab", category: "generic", shape: "card" },
  // ---- Security (npm packages) ----
  auth0: { iconKey: "brand:auth0", category: "security", shape: "card" },
  okta: { iconKey: "brand:okta", category: "security", shape: "card" },
  // ---- External services (npm packages) ----
  stripe: { iconKey: "brand:stripe", category: "external", shape: "card" },
  // ---- Observability (compose images) ----
  prometheus: { iconKey: "brand:prometheus", category: "generic", shape: "card" },
  grafana: { iconKey: "brand:grafana", category: "generic", shape: "card" },
};

/**
 * Evidence name (an npm package name or a compose image name) -> canonical
 * technology name. Several pieces of evidence can point at the same technology
 * (e.g. the `pg` driver and a `postgres` compose image both mean "postgres").
 */
export const EVIDENCE_TO_TECH: Record<string, string> = {
  // npm frameworks
  express: "express",
  next: "nextjs",
  react: "react",
  // compose runtimes
  node: "nodejs",
  // npm database drivers
  pg: "postgres",
  mysql2: "mysql",
  mysql: "mysql",
  ioredis: "redis",
  redis: "redis",
  mongoose: "mongodb",
  // npm messaging drivers
  kafkajs: "kafka",
  amqplib: "rabbitmq",
  // compose images
  postgres: "postgres",
  postgresql: "postgres",
  kafka: "kafka",
  rabbitmq: "rabbitmq",
  nginx: "nginx",
  prometheus: "prometheus",
  grafana: "grafana",
  // npm security / external
  auth0: "auth0",
  okta: "okta",
  stripe: "stripe",
};

/**
 * npm packages that indicate the app *talks to* a data store (a driver), as
 * opposed to a framework. These are the ones that can produce an app -> store
 * edge when a matching node exists.
 */
export const DRIVER_EVIDENCE: ReadonlySet<string> = new Set([
  "pg",
  "mysql2",
  "mysql",
  "ioredis",
  "redis",
  "mongoose",
  "kafkajs",
  "amqplib",
]);

/** the canonical technologies that a driver can point at */
export const DRIVER_TECHS: ReadonlySet<string> = new Set([
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "kafka",
  "rabbitmq",
]);

/** resolve an evidence name (npm package / compose image / runtime) to a technology + mapping */
export function resolveTech(evidence: string): { tech: string; mapping: TechMapping } | undefined {
  const tech = EVIDENCE_TO_TECH[evidence] ?? (TECH_MAPPING[evidence] ? evidence : undefined);
  if (!tech) return undefined;
  const mapping = TECH_MAPPING[tech];
  if (!mapping) return undefined;
  return { tech, mapping };
}

/** a compose service resolved to a technology + icon (or a generic fallback) */
export interface ResolvedService {
  /** the canonical technology name, if the image is recognized */
  tech: string | undefined;
  iconKey: string;
  category: IconCategory;
  shape: NodeShape;
}

/**
 * Reduce a compose image reference to a bare technology name: strips the tag
 * (`postgres:15` -> `postgres`) and any registry/path prefix
 * (`docker.io/library/redis:7` -> `redis`, `localhost:5000/myapp` -> `myapp`).
 */
export function normalizeImageName(image: string): string {
  let name = image;
  const lastColon = name.lastIndexOf(":");
  const lastSlash = name.lastIndexOf("/");
  if (lastColon > lastSlash) name = name.slice(0, lastColon);
  const parts = name.split("/");
  return parts[parts.length - 1];
}

/**
 * Resolve a Dockerfile `FROM` base image to a runtime technology, if it is a
 * recognizable runtime (node, python, golang, ...). Returns undefined for
 * application images or unrecognizable bases (e.g. `scratch`, a custom image).
 */
export function resolveDockerfileRuntime(image: string | undefined): { tech: string; mapping: TechMapping } | undefined {
  if (!image) return undefined;
  const name = normalizeImageName(image);
  const resolved = resolveTech(name);
  if (!resolved) return undefined;
  // only treat it as a runtime if it is a compute technology (not a DB/queue/etc.)
  if (resolved.mapping.category !== "compute") return undefined;
  return resolved;
}

/** resolve a compose service image to a technology + icon, falling back to a generic shape */
export function resolveComposeService(image: string | undefined): ResolvedService {
  if (image) {
    const resolved = resolveTech(normalizeImageName(image));
    if (resolved) {
      return { tech: resolved.tech, iconKey: resolved.mapping.iconKey, category: resolved.mapping.category, shape: resolved.mapping.shape };
    }
  }
  const category = inferCategory(image);
  return { tech: undefined, iconKey: fallbackIcon(category), category, shape: fallbackShape(category) };
}

/**
 * Infer a node category from an unrecognized compose image name, so an unmapped
 * service still gets a sensible icon (the graceful-fallback path).
 */
export function inferCategory(name: string | undefined): IconCategory {
  const n = (name ?? "").toLowerCase();
  if (/(db|database|sql|postgres|mysql|mongo|redis|cache|couchdb|elasticsearch|clickhouse|maria)/.test(n)) {
    return "database";
  }
  if (/(queue|kafka|rabbit|nats|sqs|pulsar|activemq|broker)/.test(n)) {
    return "messaging";
  }
  return "generic";
}

/** the generic fallback icon for an inferred category */
export function fallbackIcon(category: IconCategory): string {
  if (category === "database") return "generic:database";
  if (category === "messaging") return "generic:queue";
  return "generic:service";
}

/** the node shape to use for an inferred category */
export function fallbackShape(category: IconCategory): NodeShape {
  return category === "database" ? "database" : "card";
}

/**
 * Returns the list of icon keys in the mapping table that do NOT resolve in the
 * icon catalog. Used by the mapping-table unit tests to guarantee the curated
 * table never points at a missing icon (a missing key would be a warning +
 * fallback at render time, but the table itself should always be valid).
 */
export function unmappedIconKeys(): string[] {
  return Object.values(TECH_MAPPING)
    .map((m) => m.iconKey)
    .filter((key) => !getCatalogEntry(key));
}
