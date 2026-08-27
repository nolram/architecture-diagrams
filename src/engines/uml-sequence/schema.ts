import { z } from "zod";
import type { SpecValidationResult, SpecValidationError } from "../../spec/schema.js";

const idPattern = /^[a-zA-Z0-9_-]+$/;

export const UmlSequenceParticipantSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  name: z.string().min(1),
  stereotype: z.string().optional(),
  type: z.enum(["object", "actor"]).default("object"),
});
export type UmlSequenceParticipant = z.infer<typeof UmlSequenceParticipantSchema>;

export const UmlSequenceMessageSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  kind: z.enum(["sync", "async", "reply", "self"]).default("sync"),
  activation: z.boolean().optional(),
});
export type UmlSequenceMessage = z.infer<typeof UmlSequenceMessageSchema>;

export const UmlSequenceFragmentSchema = z.object({
  id: z.string().regex(idPattern, "id must only contain letters, numbers, '-' or '_'"),
  kind: z.enum(["alt", "loop", "opt", "par"]),
  label: z.string().optional(),
  participants: z.array(z.string()).min(1),
  messages: z.array(z.string()).min(1),
});
export type UmlSequenceFragment = z.infer<typeof UmlSequenceFragmentSchema>;

export const UmlSequenceSpecSchema = z
  .object({
    type: z.literal("uml-sequence"),
    version: z.literal("1"),
    title: z.string().optional(),
    theme: z.enum(["clean-light", "midnight-dark"]).default("clean-light"),
    direction: z.enum(["auto", "right", "down"]).default("auto"),
    participants: z.array(UmlSequenceParticipantSchema).min(1, "the diagram needs at least one participant"),
    messages: z.array(UmlSequenceMessageSchema).default([]),
    fragments: z.array(UmlSequenceFragmentSchema).default([]),
  })
  .superRefine((spec, ctx) => {
    const participantIds = new Set<string>();
    for (const [i, p] of spec.participants.entries()) {
      if (participantIds.has(p.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["participants", i, "id"],
          message: `duplicate participant id: "${p.id}". Every participant needs a unique id.`,
        });
      }
      participantIds.add(p.id);
    }

    const messageIds = new Set<string>();
    for (const [i, m] of spec.messages.entries()) {
      if (messageIds.has(m.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["messages", i, "id"],
          message: `duplicate message id: "${m.id}". Every message needs a unique id.`,
        });
      }
      messageIds.add(m.id);
    }

    const fragmentIds = new Set<string>();
    for (const [i, f] of spec.fragments.entries()) {
      if (fragmentIds.has(f.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["fragments", i, "id"],
          message: `duplicate fragment id: "${f.id}". Every fragment needs a unique id.`,
        });
      }
      fragmentIds.add(f.id);
    }

    for (const [i, m] of spec.messages.entries()) {
      if (!participantIds.has(m.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["messages", i, "from"],
          message: `references participant "${m.from}", which does not exist. Defined participants: ${[...participantIds].join(", ") || "(none)"}.`,
        });
      }
      if (!participantIds.has(m.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["messages", i, "to"],
          message: `references participant "${m.to}", which does not exist. Defined participants: ${[...participantIds].join(", ") || "(none)"}.`,
        });
      }
      if (m.kind === "self" && m.from !== m.to) {
        ctx.addIssue({
          code: "custom",
          path: ["messages", i, "kind"],
          message: `a self message must have the same "from" and "to" participant (got "${m.from}" -> "${m.to}").`,
        });
      }
    }

    const specMessageIndex = new Map(spec.messages.map((m, i) => [m.id, i]));
    for (const [i, f] of spec.fragments.entries()) {
      for (const pid of f.participants) {
        if (!participantIds.has(pid)) {
          ctx.addIssue({
            code: "custom",
            path: ["fragments", i, "participants"],
            message: `references participant "${pid}", which does not exist. Defined participants: ${[...participantIds].join(", ") || "(none)"}.`,
          });
        }
      }
      for (const mid of f.messages) {
        if (!messageIds.has(mid)) {
          ctx.addIssue({
            code: "custom",
            path: ["fragments", i, "messages"],
            message: `references message "${mid}", which does not exist. Defined messages: ${[...messageIds].join(", ") || "(none)"}.`,
          });
        }
      }
      const span = new Set(f.participants);
      for (const mid of f.messages) {
        const msg = spec.messages.find((m) => m.id === mid);
        if (msg && (!span.has(msg.from) || !span.has(msg.to))) {
          ctx.addIssue({
            code: "custom",
            path: ["fragments", i, "participants"],
            message: `fragment "${f.id}" covers message "${mid}" (${msg.from} -> ${msg.to}), but its participants span is [${f.participants.join(", ")}]. Add the message's endpoints to the span so the arrow stays inside the fragment.`,
          });
        }
      }
      const indices = f.messages.map((mid) => specMessageIndex.get(mid));
      if (indices.every((n) => n !== undefined)) {
        for (let a = 1; a < indices.length; a++) {
          if (indices[a]! < indices[a - 1]!) {
            ctx.addIssue({
              code: "custom",
              path: ["fragments", i, "messages"],
              message: `fragment "${f.id}" lists messages ${f.messages.join(", ")}, which are out of order relative to the spec's message order (${spec.messages.map((m) => m.id).join(", ")}).`,
            });
            break;
          }
        }
      }
    }

    const coveredBy = new Map<string, string>();
    for (const [i, f] of spec.fragments.entries()) {
      for (const mid of f.messages) {
        const owner = coveredBy.get(mid);
        if (owner !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["fragments", i, "messages"],
            message: `message "${mid}" is already covered by fragment "${owner}". A message may belong to at most one fragment.`,
          });
        } else {
          coveredBy.set(mid, f.id);
        }
      }
    }
  });

export type UmlSequenceSpec = z.infer<typeof UmlSequenceSpecSchema>;

export function validateUmlSequenceSpec(raw: unknown): SpecValidationResult<UmlSequenceSpec> {
  const result = UmlSequenceSpecSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, spec: result.data };
  }
  const errors: SpecValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { ok: false, errors };
}
