import { readPackageJson, readDockerCompose, readWorkspaces, readK8sManifests, readDockerfile, readCI } from "./manifests.js";
import { buildSpec, type AppNode } from "./build.js";
import { resolveTech, resolveComposeService, resolveDockerfileRuntime, TECH_MAPPING, DRIVER_EVIDENCE } from "./mapping.js";
import type { DetectedTech, DetectionResult } from "./types.js";

/** the framework that determines an app node's icon, in priority order */
function detectAppFramework(deps: string[]): { tech: string; iconKey: string; evidence: string } {
  if (deps.includes("next")) return { tech: "nextjs", iconKey: "brand:nextjs", evidence: "next" };
  if (deps.includes("express")) return { tech: "express", iconKey: "brand:nodejs", evidence: "express" };
  if (deps.includes("react")) return { tech: "react", iconKey: "brand:react", evidence: "react" };
  return { tech: "nodejs", iconKey: "brand:nodejs", evidence: "" };
}

/** a manifest-backed app (the root package, or a monorepo workspace) */
interface AppManifest {
  name: string;
  dependencies: string[];
  file: string;
}

/**
 * Analyze a codebase: read its manifests (package.json, docker-compose), detect
 * the tech stack, map each technology to a curated icon, and build a draft
 * architecture spec that the existing pipeline can render.
 *
 * Deterministic and offline -- no source-code analysis. The returned `detected`
 * array (with `confidence` + `source`) is the structured surface an LLM/user can
 * refine before rendering.
 */
export function analyzeCodebase(rootPath: string): DetectionResult {
  const warnings: string[] = [];
  const detected: DetectedTech[] = [];

  const pkg = readPackageJson(rootPath);
  const compose = readDockerCompose(rootPath);
  const workspaces = readWorkspaces(rootPath);
  const k8s = readK8sManifests(rootPath);
  const dockerfile = readDockerfile(rootPath);
  const ci = readCI(rootPath);

  if (!pkg && !compose && k8s.manifests.length === 0 && !dockerfile && !ci) {
    warnings.push("No recognizable manifests found (package.json, docker-compose, k8s, Dockerfile, CI). Nothing was detected.");
  }

  // --- Apps: the workspaces if it's a monorepo, otherwise the root package ---
  const appManifests: AppManifest[] = workspaces.length > 0 ? workspaces : pkg ? [pkg] : [];

  const apps: AppNode[] = [];
  const appFrameworks: { name: string; tech: string; isFrontend: boolean }[] = [];
  for (const manifest of appManifests) {
    const framework = detectAppFramework(manifest.dependencies);
    const driverTechs = new Set<string>();
    apps.push({
      name: manifest.name,
      iconKey: framework.iconKey,
      category: "compute",
      shape: "card",
      driverTechs,
    });

    const isFrontend = framework.tech === "nextjs" || framework.tech === "react";
    appFrameworks.push({ name: manifest.name, tech: framework.tech, isFrontend });

    detected.push({
      tech: framework.tech,
      iconKey: framework.iconKey,
      category: "compute",
      shape: "card",
      confidence: "high",
      source: framework.evidence ? `${manifest.file}:dependencies.${framework.evidence}` : manifest.file,
    });

    for (const dep of manifest.dependencies) {
      if (dep === framework.evidence) continue; // already recorded as the app framework
      const resolved = resolveTech(dep);
      if (!resolved) continue; // unmapped package (e.g. jest, lodash) -- not infrastructure
      if (DRIVER_EVIDENCE.has(dep)) driverTechs.add(resolved.tech);
      detected.push({
        tech: resolved.tech,
        iconKey: resolved.mapping.iconKey,
        category: resolved.mapping.category,
        shape: resolved.mapping.shape,
        confidence: "medium",
        source: `${manifest.file}:dependencies.${dep}`,
      });
    }
  }

  // --- Semantic edge hints: frontend → backend (for the LLM to refine) ---
  for (const app of appFrameworks) {
    if (!app.isFrontend) continue;
    const backend = appFrameworks.find((b) => !b.isFrontend && b.name !== app.name);
    if (backend) {
      const entry = detected.find((d) => d.tech === app.tech && d.source.includes(app.name));
      if (entry) entry.suggestsEdge = backend.name;
    }
  }

  // --- Compose services (from docker-compose) ---
  if (compose) {
    for (const svc of compose.services) {
      const resolved = resolveComposeService(svc.image);
      const source = `${compose.file}:services.${svc.name}.image`;
      if (resolved.tech) {
        detected.push({
          tech: resolved.tech,
          iconKey: resolved.iconKey,
          category: resolved.category,
          shape: resolved.shape,
          confidence: "high",
          source,
        });
      } else {
        warnings.push(
          `Compose service "${svc.name}" (image: ${svc.image ?? "unknown"}) is not in the tech mapping; using a generic icon.`,
        );
        detected.push({
          tech: svc.name,
          iconKey: resolved.iconKey,
          category: resolved.category,
          shape: resolved.shape,
          confidence: "low",
          source,
        });
      }
    }
  }

  // --- Kubernetes (we own the manifests -> high confidence) ---
  if (k8s.manifests.length > 0) {
    detected.push({
      tech: "kubernetes",
      iconKey: TECH_MAPPING.kubernetes.iconKey,
      category: TECH_MAPPING.kubernetes.category,
      shape: TECH_MAPPING.kubernetes.shape,
      confidence: "high",
      source: `${k8s.manifests[0].file}:kind=*,name=*`,
    });
    for (const m of k8s.manifests) {
      if (m.kind === "Deployment" || m.kind === "StatefulSet") {
        const runtime = m.image ? resolveDockerfileRuntime(m.image) : undefined;
        detected.push({
          tech: runtime?.tech ?? "service",
          iconKey: runtime?.mapping.iconKey ?? "generic:service",
          category: runtime?.mapping.category ?? "compute",
          shape: runtime?.mapping.shape ?? "card",
          confidence: "high",
          source: `${m.file}:kind=${m.kind},name=${m.name}`,
        });
      } else if (m.kind === "Ingress") {
        detected.push({
          tech: "ingress",
          iconKey: "generic:api",
          category: "network",
          shape: "card",
          confidence: "high",
          source: `${m.file}:kind=${m.kind},name=${m.name}`,
        });
      }
    }
  }

  // --- Dockerfile (a recognizable FROM runtime -> high confidence) ---
  if (dockerfile) {
    const runtime = resolveDockerfileRuntime(dockerfile.from);
    if (runtime) {
      detected.push({
        tech: runtime.tech,
        iconKey: runtime.mapping.iconKey,
        category: runtime.mapping.category,
        shape: runtime.mapping.shape,
        confidence: "high",
        source: `${dockerfile.file}:FROM`,
      });
    }
  }

  // --- CI/CD (presence-based -> high confidence) ---
  if (ci) {
    const mapping = TECH_MAPPING[ci.tech];
    if (mapping) {
      detected.push({
        tech: ci.tech,
        iconKey: mapping.iconKey,
        category: mapping.category,
        shape: mapping.shape,
        confidence: "high",
        source: ci.file,
      });
    }
  }

  // --- Deduplicate `detected` by tech: merge sources, keep highest confidence ---
  const confidenceRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const byTech = new Map<string, DetectedTech>();
  for (const d of detected) {
    const existing = byTech.get(d.tech);
    if (!existing) {
      byTech.set(d.tech, { ...d, source: d.source });
    } else {
      // merge: keep highest confidence, append source
      if (confidenceRank[d.confidence] > confidenceRank[existing.confidence]) {
        existing.confidence = d.confidence;
      }
      if (!existing.source.includes(d.source)) {
        existing.source = `${existing.source}; ${d.source}`;
      }
      // keep suggestsEdge if present
      if (d.suggestsEdge && !existing.suggestsEdge) {
        existing.suggestsEdge = d.suggestsEdge;
      }
    }
  }
  const dedupedDetected = [...byTech.values()];

  const draftSpec = buildSpec({ apps, compose, k8s, dockerfile, ci });
  return { detected: dedupedDetected, draftSpec, warnings };
}

export * from "./types.js";
export * from "./mapping.js";
export * from "./manifests.js";
export * from "./build.js";
export * from "./check.js";
