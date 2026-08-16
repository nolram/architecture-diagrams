import type { DiagramSpec } from "../spec/schema.js";

/**
 * Decide `right` vs `down` quando a spec pede `direction: auto` (padrão).
 *
 * Heurística: olha o maior grau (fan-out ou fan-in) de qualquer node no
 * grafo. Com `elk.direction: RIGHT`, nodes que compartilham a mesma "camada"
 * ficam empilhados verticalmente dentro dela — um node com muitas edges
 * paralelas (ex: um API Gateway se conectando a 3+ serviços) força uma
 * camada estreita e alta, cramped. Com `DOWN` essas edges paralelas viram
 * uma linha horizontal, que acomoda fan-out/fan-in bem melhor.
 *
 * Motivado por um caso real: um gateway com out-degree 3 (orders/payments/
 * redis) produzia cards sobrepostos com `right` e ficou limpo com `down`.
 */
export function resolveDirection(spec: DiagramSpec): "right" | "down" {
  if (spec.direction !== "auto") return spec.direction;

  // out-degree e in-degree são contados separadamente (não somados): um node
  // com 2 saídas e 1 entrada não é o mesmo tipo de gargalo que um node com 3
  // saídas — é o maior fan-out OU fan-in isolado que estica uma camada do ELK.
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const edge of spec.edges) {
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const maxDegree = Math.max(0, ...outDegree.values(), ...inDegree.values());
  return maxDegree >= 3 ? "down" : "right";
}
