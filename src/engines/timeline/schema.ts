import { z } from "zod";
import type { SpecValidationResult, SpecValidationError } from "../../spec/schema.js";

const idPattern = /^[a-zA-Z0-9_-]+$/;

export const PhaseSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  label: z.string().min(1),
  kind: z.enum(["gate", "phase"]).default("phase"),
  items: z.array(z.string().min(1)).default([]),
});
export type TimelinePhase = z.infer<typeof PhaseSchema>;

export const RelationshipSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});
export type TimelineRelationship = z.infer<typeof RelationshipSchema>;

export const TimelineSpecSchema = z
  .object({
    type: z.literal("timeline"),
    version: z.literal("1"),
    title: z.string().optional(),
    theme: z.enum(["clean-light", "midnight-dark"]).default("clean-light"),
    direction: z.enum(["auto", "right", "down"]).default("auto"),
    phases: z.array(PhaseSchema).min(1, "the diagram needs at least one phase"),
    relationships: z.array(RelationshipSchema).default([]),
  })
  .superRefine((spec, ctx) => {
    const phaseIds = new Set<string>();
    for (const [i, phase] of spec.phases.entries()) {
      if (phaseIds.has(phase.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["phases", i, "id"],
          message: `duplicate phase id: "${phase.id}". Every phase needs a unique id.`,
        });
      }
      phaseIds.add(phase.id);
    }

    for (const [i, rel] of spec.relationships.entries()) {
      if (rel.from === rel.to) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `relationship "${rel.from}" -> "${rel.to}" is a self-relationship (a phase cannot relate to itself).`,
        });
        continue;
      }
      if (!phaseIds.has(rel.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "from"],
          message: `references phase "${rel.from}", which does not exist. Defined phases: ${[...phaseIds].join(", ") || "(none)"}.`,
        });
      }
      if (!phaseIds.has(rel.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["relationships", i, "to"],
          message: `references phase "${rel.to}", which does not exist. Defined phases: ${[...phaseIds].join(", ") || "(none)"}.`,
        });
      }
    }
  });

export type TimelineSpec = z.infer<typeof TimelineSpecSchema>;

export function validateTimelineSpec(raw: unknown): SpecValidationResult<TimelineSpec> {
  const result = TimelineSpecSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, spec: result.data };
  }
  const errors: SpecValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { ok: false, errors };
}
