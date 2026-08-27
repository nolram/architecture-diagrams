import type { UmlSequenceSpec } from "./schema.js";
import {
  ACTOR_HEIGHT,
  ACTOR_NAME_SPACE,
  ACTOR_WIDTH,
  ACTIVATION_WIDTH,
  CHAR_WIDTH,
  COLUMN_GAP,
  FIRST_MESSAGE_GAP,
  FRAGMENT_HEADER_GAP,
  FRAGMENT_PAD_X,
  LIFELINE_TAIL,
  PARTICIPANT_BOX_HEIGHT,
  ROW_HEIGHT,
  SELF_LOOP_DROP,
  SELF_LOOP_WIDTH,
  STEREOTYPE_SPACE,
  estimateActorWidth,
  estimateParticipantWidth,
} from "./geometry.js";
import type { AbsoluteBox, EdgeRoute, LayoutResult } from "../../layout/run-layout.js";

export interface SequenceLifeline {
  x: number;
  top: number;
  bottom: number;
}

export interface SequenceActivation {
  participantId: string;
  top: number;
  bottom: number;
  xOffset: number;
}

export interface SequenceLayout extends LayoutResult {
  lifelines: Map<string, SequenceLifeline>;
  activations: SequenceActivation[];
  messageYs: Map<string, number>;
  activationWarnings: string[];
}

export function buildSequenceLayout(spec: UmlSequenceSpec): SequenceLayout {
  const boxTop = spec.participants.some((p) => p.stereotype) ? STEREOTYPE_SPACE : 0;

  // X axis: participant columns in spec order
  const widths = spec.participants.map((p) =>
    p.type === "actor" ? estimateActorWidth(p.name) : estimateParticipantWidth(p.name, p.stereotype),
  );
  const centers: number[] = [];
  widths.forEach((w, i) => {
    if (i === 0) {
      centers.push(w / 2);
    } else {
      centers.push(centers[i - 1] + widths[i - 1] / 2 + COLUMN_GAP + w / 2);
    }
  });

  const lifelines = new Map<string, SequenceLifeline>();
  const nodes = new Map<string, AbsoluteBox>();
  let maxLifelineTop = 0;
  spec.participants.forEach((p, i) => {
    const w = widths[i];
    const isActor = p.type === "actor";
    const boxHeight = isActor ? ACTOR_HEIGHT : PARTICIPANT_BOX_HEIGHT;
    // an actor's name sits below the figure, so its lifeline starts after the name space
    const top = boxTop + boxHeight + (isActor ? ACTOR_NAME_SPACE : 0);
    maxLifelineTop = Math.max(maxLifelineTop, top);
    lifelines.set(p.id, { x: centers[i], top, bottom: 0 });
    nodes.set(p.id, { id: p.id, x: centers[i] - w / 2, y: boxTop, width: w, height: boxHeight });
  });

  // Y axis: message rows in spec order; a fragment's first covered message gets
  // the extra header space reserved above it (for the fragment tab)
  const firstMessageOfFragment = new Set<string>();
  for (const f of spec.fragments) firstMessageOfFragment.add(f.messages[0]);

  const messageYs = new Map<string, number>();
  let y = maxLifelineTop + FIRST_MESSAGE_GAP;
  for (const m of spec.messages) {
    if (firstMessageOfFragment.has(m.id)) y += FRAGMENT_HEADER_GAP;
    messageYs.set(m.id, y);
    y += ROW_HEIGHT;
  }

  const lastMessageY = spec.messages.length > 0 ? messageYs.get(spec.messages[spec.messages.length - 1].id)! : null;
  for (const p of spec.participants) {
    const ll = lifelines.get(p.id)!;
    ll.bottom = lastMessageY === null ? ll.top + LIFELINE_TAIL : lastMessageY + LIFELINE_TAIL;
  }

  // Fragments: box spanning the covered lifelines and message rows
  const groups = new Map<string, AbsoluteBox>();
  for (const f of spec.fragments) {
    const ys = f.messages.map((mid) => messageYs.get(mid)!);
    const xs = f.participants.map((pid) => lifelines.get(pid)!.x);
    groups.set(f.id, {
      id: f.id,
      x: Math.min(...xs) - FRAGMENT_PAD_X,
      y: Math.min(...ys) - FRAGMENT_HEADER_GAP,
      width: Math.max(...xs) - Math.min(...xs) + FRAGMENT_PAD_X * 2,
      height: Math.max(...ys) - Math.min(...ys) + FRAGMENT_HEADER_GAP + 16,
    });
  }

  // Activations: bar on the sender's lifeline. A reply closes the most recent
  // open call from the same pair (LIFO); an unmatched call falls back to ROW_HEIGHT
  const activationWarnings: string[] = [];
  const bottoms = new Map<string, number>();
  const openCalls = new Map<string, { messageId: string; to: string; top: number }[]>();
  for (const m of spec.messages) {
    const ym = messageYs.get(m.id)!;
    if (m.kind === "reply") {
      const stack = openCalls.get(m.to);
      if (stack) {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].to === m.from) {
            bottoms.set(stack[i].messageId, ym);
            stack.splice(i, 1);
            break;
          }
        }
      }
    } else if (m.activation === true && m.kind !== "self") {
      const stack = openCalls.get(m.from) ?? [];
      stack.push({ messageId: m.id, to: m.to, top: ym });
      openCalls.set(m.from, stack);
    }
  }
  for (const stack of openCalls.values()) {
    for (const call of stack) bottoms.set(call.messageId, call.top + ROW_HEIGHT);
  }

  const activations: SequenceActivation[] = [];
  const activationMessageIds: string[] = [];
  for (const m of spec.messages) {
    if (m.activation !== true) continue;
    const top = messageYs.get(m.id)!;
    const bottom = m.kind === "self" ? top + ROW_HEIGHT : bottoms.get(m.id) ?? top + ROW_HEIGHT;
    activations.push({ participantId: m.from, top, bottom, xOffset: 0 });
    activationMessageIds.push(m.id);
  }

  // bars on the same lifeline whose y intervals overlap are drawn side by side,
  // one (ACTIVATION_WIDTH + 4) per overlap level
  const byParticipant = new Map<string, number[]>();
  activations.forEach((a, i) => {
    const idxs = byParticipant.get(a.participantId) ?? [];
    idxs.push(i);
    byParticipant.set(a.participantId, idxs);
  });
  for (const idxs of byParticipant.values()) {
    const ordered = [...idxs].sort((x, y) => activations[x].top - activations[y].top || x - y);
    const processed: { top: number; bottom: number; level: number }[] = [];
    for (const i of ordered) {
      const bar = activations[i];
      let level = 0;
      for (const prev of processed) {
        if (bar.top < prev.bottom && prev.top < bar.bottom) level = Math.max(level, prev.level + 1);
      }
      bar.xOffset = level * (ACTIVATION_WIDTH + 4);
      processed.push({ top: bar.top, bottom: bar.bottom, level });
    }
    const involved = new Set<number>();
    for (let i = 0; i < ordered.length; i++) {
      for (let j = 0; j < ordered.length; j++) {
        if (i === j) continue;
        const a = activations[ordered[i]];
        const b = activations[ordered[j]];
        if (a.top < b.bottom && b.top < a.bottom) {
          involved.add(ordered[i]);
          involved.add(ordered[j]);
        }
      }
    }
    if (involved.size >= 2) {
      const ids = [...involved].sort((x, y) => x - y).map((i) => activationMessageIds[i]);
      activationWarnings.push(
        `activation bars on "${activations[ordered[0]].participantId}" overlap because of nested or non-LIFO call/reply order (messages: ${ids.join(", ")}); they are drawn side by side.`,
      );
    }
  }

  // Edges: straight lines between lifelines, loopback for self messages
  const edges = new Map<string, EdgeRoute>();
  for (const m of spec.messages) {
    const ym = messageYs.get(m.id)!;
    if (m.kind === "self") {
      const x = lifelines.get(m.from)!.x;
      edges.set(m.id, {
        id: m.id,
        points: [
          { x, y: ym },
          { x: x + SELF_LOOP_WIDTH, y: ym },
          { x: x + SELF_LOOP_WIDTH, y: ym + SELF_LOOP_DROP },
          { x, y: ym + SELF_LOOP_DROP },
        ],
      });
    } else {
      edges.set(m.id, {
        id: m.id,
        points: [
          { x: lifelines.get(m.from)!.x, y: ym },
          { x: lifelines.get(m.to)!.x, y: ym },
        ],
      });
    }
  }

  let width = Math.max(...spec.participants.map((p, i) => centers[i] + widths[i] / 2));
  for (const g of groups.values()) width = Math.max(width, g.x + g.width);
  for (const m of spec.messages) {
    if (m.kind !== "self") continue;
    const x = lifelines.get(m.from)!.x;
    // the self label is drawn to the right of the loopback; reserve room for it
    const labelExtent = m.label ? SELF_LOOP_WIDTH + 8 + m.label.length * CHAR_WIDTH : SELF_LOOP_WIDTH;
    width = Math.max(width, x + labelExtent);
  }
  const height = Math.max(...spec.participants.map((p) => lifelines.get(p.id)!.bottom));

  return {
    width,
    height,
    direction: "down",
    nodes,
    groups,
    edges,
    lifelines,
    activations,
    messageYs,
    activationWarnings,
  };
}

export async function layoutUmlSequence(spec: UmlSequenceSpec): Promise<SequenceLayout> {
  return buildSequenceLayout(spec);
}
