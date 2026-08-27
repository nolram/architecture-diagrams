import { z } from "zod";
import type { SpecValidationResult, SpecValidationError } from "../../spec/schema.js";

const idPattern = /^[a-zA-Z0-9_-]+$/;

export const ER_CARDINALITIES = ["one", "zero-or-one", "many", "zero-or-many"] as const;
export type ErCardinality = (typeof ER_CARDINALITIES)[number];

export const ErAttributeSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  key: z.enum(["primary", "foreign"]).optional(),
});
export type ErAttribute = z.infer<typeof ErAttributeSchema>;

export const ErEntitySchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  name: z.string().min(1),
  weak: z.boolean().optional(),
  attributes: z.array(ErAttributeSchema).optional(),
});
export type ErEntity = z.infer<typeof ErEntitySchema>;

export const ErRelationshipSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  fromCardinality: z.enum(ER_CARDINALITIES, {
    message: `fromCardinality must be one of: ${ER_CARDINALITIES.join(", ")}`,
  }).default("one"),
  toCardinality: z.enum(ER_CARDINALITIES, {
    message: `toCardinality must be one of: ${ER_CARDINALITIES.join(", ")}`,
  }).default("many"),
  identifying: z.boolean().optional(),
});
export type ErRelationship = z.infer<typeof ErRelationshipSchema>;

export const ErSpecSchema = z
  .object({
    type: z.literal("er"),
    version: z.literal("1"),
    title: z.string().optional(),
    theme: z.enum(["clean-light", "midnight-dark"]).default("clean-light"),
    direction: z.enum(["auto", "right", "down"]).default("auto"),
    entities: z.array(ErEntitySchema).min(1, "the diagram needs at least one entity"),
    relationships: z.array(ErRelationshipSchema).default([]),
  })
  .superRefine((spec, ctx) => {
    const entityIds = new Set<string>();
    for (const [i, ent] of spec.entities.entries()) {
      if (entityIds.has(ent.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["entities", i, "id"],
          message: `duplicate entity id: "${ent.id}". Every entity needs a unique id.`,
        });
      }
      entityIds.add(ent.id);
    }

    for (const [i, rel] of spec.relationships.entries()) {
      if (rel.from === rel.to) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `relationship "${rel.from}" -> "${rel.to}" is a self-relationship (an entity cannot relate to itself).`,
        });
        continue;
      }
      if (!entityIds.has(rel.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "from"],
          message: `references entity "${rel.from}", which does not exist. Defined entities: ${[...entityIds].join(", ") || "(none)"}.`,
        });
      }
      if (!entityIds.has(rel.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `references entity "${rel.to}", which does not exist. Defined entities: ${[...entityIds].join(", ") || "(none)"}.`,
        });
      }
    }

    for (const [i, ent] of spec.entities.entries()) {
      if (ent.weak !== true) continue;
      const hasIdentifying = spec.relationships.some(
        (rel) => rel.identifying === true && (rel.from === ent.id || rel.to === ent.id),
      );
      if (!hasIdentifying) {
        ctx.addIssue({
          code: "custom",
          path: ["entities", i, "weak"],
          message: `weak entity "${ent.name}" needs at least one identifying relationship (a relationship with identifying: true touching this entity).`,
        });
      }
    }
  });

export type ErSpec = z.infer<typeof ErSpecSchema>;

export function validateErSpec(raw: unknown): SpecValidationResult<ErSpec> {
  const result = ErSpecSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, spec: result.data };
  }
  const errors: SpecValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { ok: false, errors };
}
