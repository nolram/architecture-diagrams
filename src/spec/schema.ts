import { z } from "zod";

const idPattern = /^[a-zA-Z0-9_-]+$/;

export const NodeSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  label: z.string().min(1),
  sublabel: z.string().optional(),
  /** key in the "source:identifier" format (e.g. "aws:lambda") or "file:<path relative to the spec>.svg" for a custom icon */
  icon: z
    .string()
    .regex(
      /^([a-z0-9_-]+:[a-z0-9_-]+|file:.+\.svg)$/i,
      "icon must follow the 'source:identifier' format (e.g. 'aws:lambda') or 'file:<path>.svg' for a custom icon",
    )
    .optional(),
  category: z
    .enum(["compute", "storage", "database", "network", "security", "messaging", "external", "generic"])
    .default("generic"),
  shape: z.enum(["card", "database", "actor", "cloud"]).default("card"),
  group: z.string().optional(),
});
export type DiagramNode = z.infer<typeof NodeSchema>;

export const GroupSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  label: z.string().min(1),
  style: z.enum(["vpc", "subnet", "az", "boundary", "generic"]).default("generic"),
  parent: z.string().optional(),
});
export type DiagramGroup = z.infer<typeof GroupSchema>;

export const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  style: z.enum(["solid", "dashed"]).default("solid"),
  direction: z.enum(["forward", "bidirectional", "none"]).default("forward"),
});
export type DiagramEdge = z.infer<typeof EdgeSchema>;

export const DiagramSpecSchema = z
  .object({
    version: z.literal("1"),
    title: z.string().optional(),
    theme: z.enum(["clean-light", "midnight-dark"]).default("clean-light"),
    direction: z.enum(["auto", "right", "down"]).default("auto"),
    nodes: z.array(NodeSchema).min(1, "the diagram needs at least one node"),
    groups: z.array(GroupSchema).default([]),
    edges: z.array(EdgeSchema).default([]),
  })
  .superRefine((spec, ctx) => {
    const nodeIds = new Set<string>();
    for (const [i, node] of spec.nodes.entries()) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", i, "id"],
          message: `duplicate node id: "${node.id}". Every node needs a unique id.`,
        });
      }
      nodeIds.add(node.id);
    }

    const groupIds = new Set<string>();
    for (const [i, group] of spec.groups.entries()) {
      if (groupIds.has(group.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["groups", i, "id"],
          message: `duplicate group id: "${group.id}". Every group needs a unique id.`,
        });
      }
      groupIds.add(group.id);
    }
    if (nodeIds.size > 0 && groupIds.size > 0) {
      for (const id of nodeIds) {
        if (groupIds.has(id)) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `"${id}" is used as both a node id and a group id. Node and group ids share the same namespace and must be unique across both.`,
          });
        }
      }
    }

    for (const [i, node] of spec.nodes.entries()) {
      if (node.group && !groupIds.has(node.group)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", i, "group"],
          message: `node "${node.id}" references group "${node.group}", which does not exist. Defined groups: ${[...groupIds].join(", ") || "(none)"}.`,
        });
      }
    }

    for (const [i, group] of spec.groups.entries()) {
      if (group.parent && !groupIds.has(group.parent)) {
        ctx.addIssue({
          code: "custom",
          path: ["groups", i, "parent"],
          message: `group "${group.id}" references parent "${group.parent}", which does not exist.`,
        });
      }
      if (group.parent === group.id) {
        ctx.addIssue({
          code: "custom",
          path: ["groups", i, "parent"],
          message: `group "${group.id}" cannot be its own parent.`,
        });
      }
    }
    // detect parent cycles between groups
    const parentOf = new Map(spec.groups.map((g) => [g.id, g.parent]));
    for (const group of spec.groups) {
      const seen = new Set<string>([group.id]);
      let cursor = group.parent;
      while (cursor) {
        if (seen.has(cursor)) {
          ctx.addIssue({
            code: "custom",
            path: ["groups"],
            message: `parent cycle detected involving group "${group.id}".`,
          });
          break;
        }
        seen.add(cursor);
        cursor = parentOf.get(cursor);
      }
    }

    for (const [i, edge] of spec.edges.entries()) {
      if (!nodeIds.has(edge.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "from"],
          message: `edge references node "${edge.from}" in "from", which does not exist among the defined nodes.`,
        });
      }
      if (!nodeIds.has(edge.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "to"],
          message: `edge references node "${edge.to}" in "to", which does not exist among the defined nodes.`,
        });
      }
    }
  });

export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;

export interface SpecValidationError {
  path: string;
  message: string;
}

export type SpecValidationResult =
  | { ok: true; spec: DiagramSpec }
  | { ok: false; errors: SpecValidationError[] };

export function validateSpec(raw: unknown): SpecValidationResult {
  const result = DiagramSpecSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, spec: result.data };
  }
  const errors: SpecValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { ok: false, errors };
}
