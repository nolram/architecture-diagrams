import { z } from "zod";
import type { SpecValidationResult, SpecValidationError } from "../../spec/schema.js";

const idPattern = /^[a-zA-Z0-9_-]+$/;

export const UML_VISIBILITIES = ["public", "private", "protected", "package"] as const;
export type UmlVisibility = (typeof UML_VISIBILITIES)[number];

export const UML_RELATIONSHIP_KINDS = [
  "association",
  "aggregation",
  "composition",
  "inheritance",
  "dependency",
  "realization",
] as const;
export type UmlRelationshipKind = (typeof UML_RELATIONSHIP_KINDS)[number];

const visibilitySchema = z.enum(UML_VISIBILITIES).default("public");

export const UmlAttributeSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  visibility: visibilitySchema,
  static: z.boolean().optional(),
});
export type UmlAttribute = z.infer<typeof UmlAttributeSchema>;

export const UmlMethodSchema = z.object({
  name: z.string().min(1),
  params: z.string().optional(),
  return: z.string().optional(),
  visibility: visibilitySchema,
  static: z.boolean().optional(),
});
export type UmlMethod = z.infer<typeof UmlMethodSchema>;

export const UmlClassSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  name: z.string().min(1),
  stereotype: z.string().optional(),
  abstract: z.boolean().optional(),
  attributes: z.array(UmlAttributeSchema).optional(),
  methods: z.array(UmlMethodSchema).optional(),
});
export type UmlClass = z.infer<typeof UmlClassSchema>;

export const UmlRelationshipSchema = z.object({
  from: z.string(),
  to: z.string(),
  kind: z.enum(UML_RELATIONSHIP_KINDS, {
    message: `kind must be one of: ${UML_RELATIONSHIP_KINDS.join(", ")}`,
  }),
  fromMultiplicity: z.string().optional(),
  toMultiplicity: z.string().optional(),
  fromRole: z.string().optional(),
  toRole: z.string().optional(),
});
export type UmlRelationship = z.infer<typeof UmlRelationshipSchema>;

export const UmlClassSpecSchema = z
  .object({
    type: z.literal("uml-class"),
    version: z.literal("1"),
    title: z.string().optional(),
    theme: z.enum(["clean-light", "midnight-dark"]).default("clean-light"),
    direction: z.enum(["auto", "right", "down"]).default("auto"),
    classes: z.array(UmlClassSchema).min(1, "the diagram needs at least one class"),
    relationships: z.array(UmlRelationshipSchema).default([]),
  })
  .superRefine((spec, ctx) => {
    const classIds = new Set<string>();
    for (const [i, cls] of spec.classes.entries()) {
      if (classIds.has(cls.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["classes", i, "id"],
          message: `duplicate class id: "${cls.id}". Every class needs a unique id.`,
        });
      }
      classIds.add(cls.id);
    }

    for (const [i, rel] of spec.relationships.entries()) {
      if (rel.from === rel.to) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `relationship "${rel.from}" -> "${rel.to}" is a self-relationship (a class cannot relate to itself).`,
        });
        continue;
      }
      if (!classIds.has(rel.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "from"],
          message: `references class "${rel.from}", which does not exist. Defined classes: ${[...classIds].join(", ") || "(none)"}.`,
        });
      }
      if (!classIds.has(rel.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `references class "${rel.to}", which does not exist. Defined classes: ${[...classIds].join(", ") || "(none)"}.`,
        });
      }
    }
  });

export type UmlClassSpec = z.infer<typeof UmlClassSpecSchema>;

export function validateUmlClassSpec(raw: unknown): SpecValidationResult<UmlClassSpec> {
  const result = UmlClassSpecSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, spec: result.data };
  }
  const errors: SpecValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { ok: false, errors };
}
