import type { DiagramSpec, DiagramNode, DiagramGroup, DiagramEdge } from "../spec/schema.js";
import type { IconCategory } from "../icons/catalog.js";
import type { NodeShape } from "./types.js";
import type { ComposeInfo, K8sInfo, K8sManifest, DockerfileInfo, CIInfo } from "./manifests.js";
import { resolveComposeService, resolveTech, resolveDockerfileRuntime, TECH_MAPPING, fallbackIcon, fallbackShape } from "./mapping.js";

/** an application/service node (the app itself, or a monorepo workspace) */
export interface AppNode {
  name: string;
  iconKey: string;
  category: IconCategory;
  shape: NodeShape;
  /** canonical technologies this app talks to (from its detected drivers) */
  driverTechs: ReadonlySet<string>;
}

/** structured input to the spec builder */
export interface BuildInput {
  apps: AppNode[];
  compose?: ComposeInfo;
  k8s?: K8sInfo;
  dockerfile?: DockerfileInfo;
  ci?: CIInfo;
}

/** reduce a name to a valid node id (letters, numbers, '-' or '_') */
function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Build a valid architecture spec from the detected apps + compose services.
 * Emits high-confidence edges only: compose `depends_on`, and app -> data-store
 * when a driver for that store was detected on that app and a matching node exists.
 *
 * Deduplication: when the same service name appears in multiple sources
 * (workspace + compose + k8s), it is merged into a single node. The richest
 * source wins for the icon (k8s Deployment > compose > workspace).
 */
export function buildSpec(input: BuildInput): DiagramSpec {
  const nodes: DiagramNode[] = [];
  const groups: DiagramGroup[] = [];
  const edges: DiagramEdge[] = [];

  const composeServices = input.compose?.services ?? [];
  const used = new Set<string>();

  /** claim a unique id, suffixing with _2, _3, ... on collision */
  function claimId(base: string): string {
    let id = base || "node";
    if (used.has(id)) {
      let n = 2;
      while (used.has(`${id}_${n}`)) n++;
      id = `${id}_${n}`;
    }
    used.add(id);
    return id;
  }

  // 0. Deduplication: a logical service may appear in multiple sources (a
  //    monorepo workspace, a compose service, and/or a k8s Deployment). We emit
  //    exactly one node per service name. Ownership prefers the richest source
  //    present (k8s Deployment > compose > workspace) so the icon reflects the
  //    most specific evidence; the `detected` array (in index.ts) still lists
  //    every source for traceability.
  const workspaceNames = new Set(input.apps.map((a) => a.name.toLowerCase()));
  const composeNames = new Set(composeServices.map((s) => s.name.toLowerCase()));
  const k8sNames = new Set(
    (input.k8s?.manifests ?? [])
      .filter((m) => m.kind === "Deployment" || m.kind === "StatefulSet")
      .map((m) => m.name.toLowerCase()),
  );

  const inWorkspace = (name: string): boolean => workspaceNames.has(name.toLowerCase());
  const inCompose = (name: string): boolean => composeNames.has(name.toLowerCase());
  const inK8s = (name: string): boolean => k8sNames.has(name.toLowerCase());

  // 1. App/service nodes (the app itself, or one per monorepo workspace). When
  //    the same name is also a compose service or k8s Deployment, the richest
  //    source provides the icon (k8s image > compose image > workspace framework).
  const isSingleApp = input.apps.length === 1;
  const appIds: string[] = [];
  const appIcons: string[] = [];
  for (const [i, app] of input.apps.entries()) {
    let iconKey = app.iconKey;
    let category = app.category;
    let shape = app.shape;
    const k8sM = (input.k8s?.manifests ?? []).find(
      (m) => (m.kind === "Deployment" || m.kind === "StatefulSet") && m.name.toLowerCase() === app.name.toLowerCase(),
    );
    if (k8sM) {
      const rt = k8sM.image ? resolveDockerfileRuntime(k8sM.image) : undefined;
      if (rt) { iconKey = rt.mapping.iconKey; category = rt.mapping.category; shape = rt.mapping.shape; }
    } else if (inCompose(app.name)) {
      const svc = composeServices.find((s) => s.name.toLowerCase() === app.name.toLowerCase())!;
      const r = resolveComposeService(svc.image);
      if (r.tech) { iconKey = r.iconKey; category = r.category; shape = r.shape; }
    }
    const id = claimId(isSingleApp ? "app" : sanitizeId(app.name) || `app_${i + 1}`);
    appIds.push(id);
    appIcons.push(iconKey);
    nodes.push({ id, label: app.name, icon: iconKey, category, shape });
  }

  // 2. Compose boundary group (one per compose project)
  let composeGroupId: string | undefined;
  if (composeServices.length > 0 && input.compose) {
    composeGroupId = claimId("compose");
    groups.push({ id: composeGroupId, label: input.compose.name, style: "boundary" });
  }

  // 3. One node per compose service. A service whose name is also a workspace
  //    app or a k8s Deployment is represented by that richer node instead, so we
  //    only record its id here (for edges) and skip creating a duplicate node.
  const nameToId = new Map<string, string>();
  for (const svc of composeServices) {
    const wsId = appIds.find((_, i) => input.apps[i].name.toLowerCase() === svc.name.toLowerCase());
    if (wsId) {
      nameToId.set(svc.name, wsId); // represented by a workspace node
      continue;
    }
    if (inK8s(svc.name)) {
      const m = (input.k8s?.manifests ?? []).find(
        (mm) => (mm.kind === "Deployment" || mm.kind === "StatefulSet") && mm.name.toLowerCase() === svc.name.toLowerCase(),
      )!;
      nameToId.set(svc.name, sanitizeId(m.name) || "k8s"); // represented by a k8s node (same deterministic id)
      continue;
    }
    const id = claimId(sanitizeId(svc.name) || "service");
    nameToId.set(svc.name, id);
    const resolved = resolveComposeService(svc.image);
    nodes.push({
      id,
      label: svc.name,
      icon: resolved.iconKey,
      category: resolved.category,
      shape: resolved.shape,
      group: composeGroupId,
    });
  }

  // 4. Edges: compose depends_on (only where both endpoints exist as nodes)
  for (const svc of composeServices) {
    const fromId = nameToId.get(svc.name);
    if (!fromId) continue;
    for (const dep of svc.dependsOn) {
      const toId = nameToId.get(dep);
      if (!toId) continue;
      edges.push({ from: fromId, to: toId, style: "solid", direction: "forward" });
    }
  }

  // 5. Edges: app -> data store (a driver was detected on that app AND a matching node exists)
  for (const [i, app] of input.apps.entries()) {
    for (const svc of composeServices) {
      const resolved = resolveComposeService(svc.image);
      if (resolved.tech && app.driverTechs.has(resolved.tech)) {
        edges.push({ from: appIds[i], to: nameToId.get(svc.name)!, style: "solid", direction: "forward" });
      }
    }
  }

  // 6. Kubernetes: one node per Deployment/StatefulSet + Ingress, a group per Namespace,
  //    and Ingress -> Service -> Deployment edges (matched by selector labels).
  if (input.k8s && input.k8s.manifests.length > 0) {
    const manifests = input.k8s.manifests;

    // namespace groups (a group per Namespace, or per distinct namespace)
    const namespaces = new Map<string, string>(); // namespace -> group id
    const nsNames = new Set<string>();
    for (const m of manifests) {
      if (m.kind === "Namespace") nsNames.add(m.name);
      if (m.namespace) nsNames.add(m.namespace);
    }
    for (const ns of [...nsNames].sort()) {
      const id = claimId(sanitizeId(ns) || "namespace");
      namespaces.set(ns, id);
      groups.push({ id, label: ns, style: "boundary" });
    }

    const nodeFor = (m: K8sManifest): { id: string; label: string; icon: string; category: IconCategory; shape: NodeShape; group?: string } => {
      let icon: string;
      let category: IconCategory;
      let shape: NodeShape;
      if (m.kind === "Ingress") {
        icon = "generic:api";
        category = "network";
        shape = "card";
      } else if (m.kind === "Service") {
        icon = "generic:api";
        category = "network";
        shape = "card";
      } else {
        // Deployment / StatefulSet: icon by container image if recognizable, else generic
        const runtime = m.image ? resolveDockerfileRuntime(m.image) : undefined;
        if (runtime) {
          icon = runtime.mapping.iconKey;
          category = runtime.mapping.category;
          shape = runtime.mapping.shape;
        } else {
          icon = "generic:service";
          category = "compute";
          shape = "card";
        }
      }
      const id = claimId(sanitizeId(m.name) || "k8s");
      const group = m.namespace ? namespaces.get(m.namespace) : undefined;
      return { id, label: m.name, icon, category, shape, group };
    };

    const byName = new Map<string, K8sManifest>();
    for (const m of manifests) byName.set(m.name, m);

    // nodes for Deployments/StatefulSets, Services, and Ingresses
    // (skip Deployment/StatefulSet names that already have a workspace node)
    const nodeEntries: { manifest: K8sManifest; entry: ReturnType<typeof nodeFor> }[] = [];
    for (const m of manifests) {
      if (m.kind === "Deployment" || m.kind === "StatefulSet") {
        if (inWorkspace(m.name)) continue; // already represented by a workspace node
        nodeEntries.push({ manifest: m, entry: nodeFor(m) });
      } else if (m.kind === "Ingress" || m.kind === "Service") {
        nodeEntries.push({ manifest: m, entry: nodeFor(m) });
      }
    }
    for (const { entry } of nodeEntries) {
      nodes.push({
        id: entry.id,
        label: entry.label,
        icon: entry.icon,
        category: entry.category,
        shape: entry.shape,
        ...(entry.group ? { group: entry.group } : {}),
      });
    }

    // edges: Ingress -> Service -> Deployment (matched by selector labels)
    const idOf = (name: string): string | undefined =>
      nodeEntries.find((e) => e.manifest.name === name)?.entry.id;
    const labelsMatch = (a?: Record<string, string>, b?: Record<string, string>): boolean => {
      if (!a || !b) return false;
      const keys = Object.keys(a);
      if (keys.length === 0) return false;
      return keys.every((k) => a[k] === b[k]);
    };

    for (const ing of manifests) {
      if (ing.kind !== "Ingress") continue;
      const ingressId = idOf(ing.name);
      if (!ingressId) continue;
      for (const backend of ing.backends ?? []) {
        const svc = byName.get(backend);
        if (!svc || svc.kind !== "Service") continue;
        const svcId = idOf(backend);
        if (!svcId) continue;
        edges.push({ from: ingressId, to: svcId, style: "solid", direction: "forward" });
        // Service -> Deployment: the deployment whose selector matches the service's selector
        for (const dep of manifests) {
          if (dep.kind !== "Deployment" && dep.kind !== "StatefulSet") continue;
          if (labelsMatch(svc.selector, dep.matchLabels)) {
            const depId = idOf(dep.name);
            if (depId) edges.push({ from: svcId, to: depId, style: "solid", direction: "forward" });
          }
        }
      }
    }
  }

  // 7. Dockerfile: a recognizable `FROM` runtime becomes a node (the app's runtime).
  //    Suppressed if the app node already carries the same runtime icon (redundant).
  if (input.dockerfile) {
    const runtime = resolveDockerfileRuntime(input.dockerfile.from);
    if (runtime) {
      const appAlreadyHasRuntime = appIcons.some((ic) => ic === runtime.mapping.iconKey);
      if (!appAlreadyHasRuntime) {
        const id = claimId("runtime");
        nodes.push({
          id,
          label: runtime.tech,
          icon: runtime.mapping.iconKey,
          category: runtime.mapping.category,
          shape: runtime.mapping.shape,
        });
      }
    }
  }

  // 8. CI/CD: a presence-based node for the detected CI system.
  if (input.ci) {
    const mapping = TECH_MAPPING[input.ci.tech];
    if (mapping) {
      const id = claimId("ci");
      nodes.push({
        id,
        label: input.ci.tech,
        icon: mapping.iconKey,
        category: mapping.category,
        shape: mapping.shape,
      });
    }
  }

  // 9. The schema requires at least one node; keep the empty case valid.
  if (nodes.length === 0) {
    nodes.push({ id: "app", label: "Application", icon: "generic:service", category: "generic", shape: "card" });
  }

  return {
    type: "architecture",
    version: "1",
    title: "Detected architecture",
    theme: "clean-light",
    direction: "auto",
    nodes,
    groups,
    edges,
  };
}
