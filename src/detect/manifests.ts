import { readFileSync, globSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/** the app's own manifest (package.json) */
export interface PackageJsonInfo {
  /** the package name (used as the app node's label) */
  name: string;
  /** runtime dependency names (devDependencies are intentionally excluded) */
  dependencies: string[];
  /** the relative path of the manifest, for evidence/source strings */
  file: string;
}

/** a single docker-compose service */
export interface ComposeService {
  name: string;
  image?: string;
  /** names of services this one depends on (from `depends_on`) */
  dependsOn: string[];
}

/** a docker-compose project */
export interface ComposeInfo {
  /** the compose project name (used as the boundary group's label) */
  name: string;
  services: ComposeService[];
  /** the relative path of the manifest, for evidence/source strings */
  file: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** read and parse package.json from `rootPath`; returns undefined if absent/unreadable */
export function readPackageJson(rootPath: string): PackageJsonInfo | undefined {
  const file = "package.json";
  let raw: string;
  try {
    raw = readFileSync(join(rootPath, file), "utf-8");
  } catch {
    return undefined;
  }

  let pkg: unknown;
  try {
    pkg = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(pkg)) return undefined;

  const deps = isRecord(pkg.dependencies) ? Object.keys(pkg.dependencies) : [];
  const name = typeof pkg.name === "string" && pkg.name.length > 0 ? pkg.name : "application";
  return { name, dependencies: deps, file };
}

/** a monorepo workspace (a package with its own package.json) */
export interface WorkspaceInfo {
  name: string;
  dependencies: string[];
  /** the relative path of the workspace's package.json, for evidence/source strings */
  file: string;
}

/**
 * Read the `workspaces` field of the root package.json and resolve each
 * workspace's package.json. Returns an empty list if there are no workspaces.
 */
export function readWorkspaces(rootPath: string): WorkspaceInfo[] {
  let raw: string;
  try {
    raw = readFileSync(join(rootPath, "package.json"), "utf-8");
  } catch {
    return [];
  }

  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isRecord(doc)) return [];

  const workspaces = doc.workspaces;
  let patterns: string[] = [];
  if (Array.isArray(workspaces)) {
    patterns = workspaces.filter((p): p is string => typeof p === "string");
  } else if (isRecord(workspaces) && Array.isArray(workspaces.packages)) {
    patterns = workspaces.packages.filter((p): p is string => typeof p === "string");
  }
  if (patterns.length === 0) return [];

  const result: WorkspaceInfo[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    let matches: string[] = [];
    try {
      matches = globSync(pattern, { cwd: rootPath });
    } catch {
      continue;
    }
    for (const match of matches) {
      const file = `${match}/package.json`;
      if (seen.has(file)) continue;
      let pkgRaw: string;
      try {
        pkgRaw = readFileSync(join(rootPath, file), "utf-8");
      } catch {
        continue;
      }
      let pkg: unknown;
      try {
        pkg = JSON.parse(pkgRaw);
      } catch {
        continue;
      }
      if (!isRecord(pkg)) continue;
      seen.add(file);
      const deps = isRecord(pkg.dependencies) ? Object.keys(pkg.dependencies) : [];
      const name = typeof pkg.name === "string" && pkg.name.length > 0 ? pkg.name : match;
      result.push({ name, dependencies: deps, file });
    }
  }
  return result;
}

/** normalize a `depends_on` value (array of strings, or array of { service, condition }) to service names */
function normalizeDependsOn(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.length > 0) {
      names.push(entry);
    } else if (isRecord(entry) && typeof entry.service === "string" && entry.service.length > 0) {
      names.push(entry.service);
    }
  }
  return names;
}

const COMPOSE_FILENAMES = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"];

/** read and parse a docker-compose file from `rootPath`; returns undefined if absent/unreadable */
export function readDockerCompose(rootPath: string): ComposeInfo | undefined {
  for (const file of COMPOSE_FILENAMES) {
    let raw: string;
    try {
      raw = readFileSync(join(rootPath, file), "utf-8");
    } catch {
      continue;
    }

    let doc: unknown;
    try {
      doc = parse(raw);
    } catch {
      continue;
    }
    if (!isRecord(doc)) continue;

    const servicesRaw = isRecord(doc.services) ? doc.services : undefined;
    if (!servicesRaw) continue;

    const services: ComposeService[] = [];
    for (const [name, svc] of Object.entries(servicesRaw)) {
      if (!isRecord(svc)) continue;
      services.push({
        name,
        image: typeof svc.image === "string" ? svc.image : undefined,
        dependsOn: normalizeDependsOn(svc.depends_on),
      });
    }

    const projectName = typeof doc.name === "string" && doc.name.length > 0 ? doc.name : "compose";
    return { name: projectName, services, file };
  }
  return undefined;
}

/** a single parsed k8s manifest (only the fields the detector needs) */
export interface K8sManifest {
  kind: string;
  name: string;
  namespace?: string;
  /** Deployment: `spec.selector.matchLabels` */
  matchLabels?: Record<string, string>;
  /** Service: `spec.selector` */
  selector?: Record<string, string>;
  /** Ingress: `spec.rules[].host` */
  hosts?: string[];
  /** Ingress: `spec.rules[].http.paths[].backend` (service name, if present) */
  backends?: string[];
  /** Deployment: the container image (first container, if present) */
  image?: string;
  /** the relative path of the manifest, for evidence/source strings */
  file: string;
}

/** a set of k8s manifests found under `rootPath` */
export interface K8sInfo {
  manifests: K8sManifest[];
}

/** the k8s kinds the detector understands */
const K8S_KINDS = new Set(["Deployment", "Service", "Ingress", "Namespace", "StatefulSet"]);

function isK8sKind(value: unknown): value is string {
  return typeof value === "string" && K8S_KINDS.has(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asLabels(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** parse one k8s manifest document into the fields the detector needs */
function parseK8sManifest(doc: unknown, file: string): K8sManifest | undefined {
  if (!isRecord(doc)) return undefined;
  if (!isK8sKind(doc.kind)) return undefined;

  const metadata = isRecord(doc.metadata) ? doc.metadata : undefined;
  const name = asString(metadata?.name) ?? "unknown";
  const namespace = asString(metadata?.namespace);
  const spec = isRecord(doc.spec) ? doc.spec : undefined;

  const manifest: K8sManifest = { kind: doc.kind, name, namespace, file };
  const specRecord = spec;

  if (doc.kind === "Deployment" || doc.kind === "StatefulSet") {
    const selector = specRecord && isRecord(specRecord.selector) ? specRecord.selector : undefined;
    const matchLabels = selector && isRecord(selector.matchLabels) ? selector.matchLabels : undefined;
    manifest.matchLabels = asLabels(matchLabels);

    const template = specRecord && isRecord(specRecord.template) ? specRecord.template : undefined;
    const podSpec = template && isRecord(template.spec) ? template.spec : undefined;
    const containers = podSpec && Array.isArray(podSpec.containers) ? podSpec.containers : [];
    for (const c of containers) {
      if (isRecord(c) && asString(c.image)) {
        manifest.image = asString(c.image);
        break;
      }
    }
  } else if (doc.kind === "Service") {
    const selector = specRecord && isRecord(specRecord.selector) ? specRecord.selector : undefined;
    manifest.selector = asLabels(selector);
  } else if (doc.kind === "Ingress") {
    const rules = specRecord && Array.isArray(specRecord.rules) ? specRecord.rules : [];
    const hosts: string[] = [];
    const backends: string[] = [];
    for (const rule of rules) {
      if (!isRecord(rule)) continue;
      const host = asString(rule.host);
      if (host) hosts.push(host);
      const http = isRecord(rule.http) ? rule.http : undefined;
      const paths = http && Array.isArray(http.paths) ? http.paths : [];
      for (const p of paths) {
        if (!isRecord(p)) continue;
        const backend = isRecord(p.backend) ? p.backend : undefined;
        const service = backend && isRecord(backend.service) ? backend.service : undefined;
        const svc = service ? asString(service.name) : undefined;
        if (svc) backends.push(svc);
      }
    }
    if (hosts.length > 0) manifest.hosts = hosts;
    if (backends.length > 0) manifest.backends = backends;
  }

  return manifest;
}

/**
 * Read k8s manifests from `rootPath`. Looks for `*.yml`/`*.yaml` files under the
 * conventional k8s directories (`k8s/`, `kubernetes/`, `deploy/`, `charts/`), or
 * anywhere a file declares a recognized k8s `kind`. Returns an empty list when
 * nothing is found.
 */
export function readK8sManifests(rootPath: string): K8sInfo {
  let files: string[] = [];
  try {
    files = globSync("**/*.{yml,yaml}", { cwd: rootPath });
  } catch {
    return { manifests: [] };
  }

  const manifests: K8sManifest[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    let raw: string;
    try {
      raw = readFileSync(join(rootPath, file), "utf-8");
    } catch {
      continue;
    }

    let doc: unknown;
    try {
      doc = parse(raw);
    } catch {
      continue;
    }

    const parsed = parseK8sManifest(doc, file);
    if (!parsed) continue; // not a recognized k8s manifest (e.g. a compose file)

    const key = `${parsed.kind}/${parsed.namespace ?? "default"}/${parsed.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    manifests.push(parsed);
  }

  return { manifests };
}

/** a Dockerfile's extracted facts */
export interface DockerfileInfo {
  /** the `FROM` base image (first one, if present) */
  from?: string;
  /** the `EXPOSE`d ports (informational only) */
  ports: string[];
  /** the relative path of the Dockerfile, for evidence/source strings */
  file: string;
}

const DOCKERFILE_NAMES = ["Dockerfile", "dockerfile", ".docker/Dockerfile"];

/** read and parse a Dockerfile from `rootPath`; returns undefined if absent/unreadable */
export function readDockerfile(rootPath: string): DockerfileInfo | undefined {
  for (const file of DOCKERFILE_NAMES) {
    let raw: string;
    try {
      raw = readFileSync(join(rootPath, file), "utf-8");
    } catch {
      continue;
    }

    const froms: string[] = [];
    const ports: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z]+)\s+(.*)$/);
      if (!m) continue;
      const instruction = m[1].toUpperCase();
      const value = m[2].trim();
      if (instruction === "FROM") {
        // ignore `FROM scratch` / `FROM <stage>` build-stage references
        if (value === "scratch") continue;
        froms.push(value);
      } else if (instruction === "EXPOSE") {
        ports.push(...value.split(/\s+/).filter(Boolean));
      }
    }

    if (froms.length === 0 && ports.length === 0) continue;
    return { from: froms[0], ports, file };
  }
  return undefined;
}

/** a detected CI/CD system, from the presence of its config file */
export interface CIInfo {
  /** the canonical CI technology name (e.g. "github-actions", "jenkins", "gitlab-ci") */
  tech: string;
  /** the relative path of the config file, for evidence/source strings */
  file: string;
}

/**
 * Detect a CI/CD system from the presence of its config file. Checks, in order:
 * `.github/workflows/*.yml`, `Jenkinsfile`, `.gitlab-ci.yml`. Returns undefined
 * when none are present.
 */
export function readCI(rootPath: string): CIInfo | undefined {
  // GitHub Actions: any workflow file under .github/workflows/
  let workflows: string[] = [];
  try {
    workflows = globSync(".github/workflows/*.{yml,yaml}", { cwd: rootPath });
  } catch {
    workflows = [];
  }
  if (workflows.length > 0) {
    return { tech: "github-actions", file: workflows[0] };
  }

  // Jenkins
  try {
    readFileSync(join(rootPath, "Jenkinsfile"), "utf-8");
    return { tech: "jenkins", file: "Jenkinsfile" };
  } catch {
    // fall through
  }

  // GitLab CI
  try {
    readFileSync(join(rootPath, ".gitlab-ci.yml"), "utf-8");
    return { tech: "gitlab-ci", file: ".gitlab-ci.yml" };
  } catch {
    // fall through
  }

  return undefined;
}
