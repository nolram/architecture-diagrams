import { z } from "zod";
import type { SpecValidationResult, SpecValidationError } from "../../spec/schema.js";

const idPattern = /^[a-zA-Z0-9_-]+$/;
// same key grammar as the architecture family (src/spec/schema.ts) so a single
// icon catalog serves both: "vendor:name" or "file:path/to/icon.svg".
const iconPattern = /^([a-z0-9_-]+:[a-z0-9_-]+|file:.+\.svg)$/i;

export const C4_ELEMENT_TYPES = ["person", "system", "external-system", "container", "component"] as const;

export const C4_STATUSES = ["active", "deprecated", "suspended", "planned"] as const;

/** `status` is optional and absent means "active" */
export function isActive(status?: string): boolean {
  return status === undefined || status === "active";
}

export const C4ElementSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  name: z.string().min(1),
  type: z.enum(C4_ELEMENT_TYPES, {
    message: `type must be one of: ${C4_ELEMENT_TYPES.join(", ")}`,
  }),
  description: z.string().optional(),
  technology: z.string().optional(),
  group: z.string().optional(),
  icon: z
    .string()
    .regex(iconPattern, "icon must be a catalog key like 'vendor:name' or a 'file:path/to/icon.svg' reference")
    .optional(),
  // optional; absent means "active". Kept optional (not defaulted) so the
  // inferred type stays constructible without it (e.g. in tests and partial
  // element literals).
  status: z.enum(C4_STATUSES, {
    message: `status must be one of: ${C4_STATUSES.join(", ")}`,
  }).optional(),
});
export type C4Element = z.infer<typeof C4ElementSchema>;

export const C4RelationshipSchema = z.object({
  from: z.string(),
  to: z.string(),
  description: z.string().optional(),
  technology: z.string().optional(),
  status: z.enum(C4_STATUSES, {
    message: `status must be one of: ${C4_STATUSES.join(", ")}`,
  }).optional(),
});
export type C4Relationship = z.infer<typeof C4RelationshipSchema>;

export const C4WrapSchema = z
  .object({
    // maximum number of wrapped lines for element descriptions and
    // relationship labels before the overflow is folded into an ellipsis.
    // C4 diagrams carry real descriptions, so the default is generous and the
    // ceiling high -- boxes grow to fit the text rather than truncating it.
    maxLines: z.number().int().min(1).max(16).default(6),
  })
  .default({ maxLines: 6 });
export type C4Wrap = z.infer<typeof C4WrapSchema>;

export const C4SpecSchema = z
  .object({
    type: z.literal("c4"),
    version: z.literal("1"),
    level: z.enum(["context", "container", "component"]).default("context"),
    title: z.string().optional(),
    theme: z.enum(["clean-light", "midnight-dark"]).default("clean-light"),
    direction: z.enum(["auto", "right", "down"]).default("auto"),
    wrap: C4WrapSchema,
    elements: z.array(C4ElementSchema).min(1, "the diagram needs at least one element"),
    relationships: z.array(C4RelationshipSchema).default([]),
  })
  .superRefine((spec, ctx) => {
    const elementIds = new Set<string>();
    for (const [i, el] of spec.elements.entries()) {
      if (elementIds.has(el.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["elements", i, "id"],
          message: `duplicate element id: "${el.id}". Every element needs a unique id.`,
        });
      }
      elementIds.add(el.id);
    }

    const elementsById = new Map(spec.elements.map((el) => [el.id, el]));

    for (const [i, el] of spec.elements.entries()) {
      if (el.type === "person" && el.group) {
        ctx.addIssue({
          code: "custom",
          path: ["elements", i, "group"],
          message: `person "${el.id}" cannot have a group -- people are never nested inside other elements.`,
        });
        continue;
      }
      if (el.group) {
        const parent = elementsById.get(el.group);
        if (!parent) {
          ctx.addIssue({
            code: "custom",
            path: ["elements", i, "group"],
            message: `element "${el.id}" references group "${el.group}", which does not exist. Defined elements: ${[...elementIds].join(", ") || "(none)"}.`,
          });
        } else if (parent.type !== "system" && parent.type !== "container") {
          ctx.addIssue({
            code: "custom",
            path: ["elements", i, "group"],
            message: `element "${el.id}" cannot be nested inside "${el.group}" (${parent.type}) -- only system and container elements can contain other elements.`,
          });
        }
      }
    }

    // detect parent cycles (A groups into B, B groups into A, ...)
    const parentOf = new Map(spec.elements.map((el) => [el.id, el.group]));
    for (const el of spec.elements) {
      const seen = new Set<string>([el.id]);
      let cursor = el.group;
      while (cursor) {
        if (seen.has(cursor)) {
          ctx.addIssue({
            code: "custom",
            path: ["elements"],
            message: `parent cycle detected involving element "${el.id}".`,
          });
          break;
        }
        seen.add(cursor);
        cursor = parentOf.get(cursor);
      }
    }

    for (const [i, rel] of spec.relationships.entries()) {
      if (rel.from === rel.to) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `relationship "${rel.from}" -> "${rel.to}" is a self-relationship (an element cannot relate to itself).`,
        });
        continue;
      }
      if (!elementIds.has(rel.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "from"],
          message: `references element "${rel.from}", which does not exist. Defined elements: ${[...elementIds].join(", ") || "(none)"}.`,
        });
      }
      if (!elementIds.has(rel.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `references element "${rel.to}", which does not exist. Defined elements: ${[...elementIds].join(", ") || "(none)"}.`,
        });
      }
    }
  });

export type C4Spec = z.infer<typeof C4SpecSchema>;

export function validateC4Spec(raw: unknown): SpecValidationResult<C4Spec> {
  const result = C4SpecSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, spec: result.data };
  }
  const errors: SpecValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { ok: false, errors };
}
