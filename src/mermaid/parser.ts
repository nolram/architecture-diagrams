/**
 * A small, dependency-free parser for Mermaid `flowchart` / `graph` diagrams.
 *
 * It is intentionally scoped to the subset of flowchart syntax that maps cleanly
 * onto the architecture spec: node declarations (all shape notations), edges
 * (all arrow types + `|label|` and dash-embedded labels + chained edges),
 * subgraphs (incl. nested), and `direction` statements. Styling statements
 * (`classDef`, `style`, `linkStyle`, `click`) are not parsed -- the converter
 * reports them as warnings instead.
 */

export type MermaidShape =
  | "square"
  | "rounded"
  | "circle"
  | "stadium"
  | "asymmetric"
  | "diamond"
  | "hexagon"
  | "subroutine"
  | "parallelogram"
  | "cylinder";

export type MermaidEdgeStyle = "solid" | "dashed";
export type MermaidEdgeDirection = "forward" | "bidirectional" | "none";

export interface MermaidNode {
  id: string;
  label: string;
  shape: MermaidShape;
}

export interface MermaidArrow {
  style: MermaidEdgeStyle;
  direction: MermaidEdgeDirection;
  /** true when the arrowhead points left (e.g. `<--`), i.e. from the second node to the first */
  pointsLeft: boolean;
}

export interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
  style: MermaidEdgeStyle;
  direction: MermaidEdgeDirection;
}

export interface MermaidSubgraph {
  id: string;
  title: string;
  /** id of the enclosing subgraph, when nested */
  parent?: string;
}

export interface MermaidModel {
  nodes: Map<string, MermaidNode>;
  edges: MermaidEdge[];
  subgraphs: Map<string, MermaidSubgraph>;
  /** node id -> innermost enclosing subgraph id */
  nodeSubgraph: Map<string, string>;
  direction?: "TD" | "BT" | "LR" | "RL";
  /** statements that are recognized but not importable (styling, click handlers, ...) */
  unsupported: string[];
}

/** line-level statements that are recognized but not importable */
const UNSUPPORTED_STATEMENTS = [
  /^classDef\b/i,
  /^style\s/i,
  /^linkStyle\b/i,
  /^click\s/i,
  /^class\s+\S+/i, // `class A red` (class application) -- one or more class names
];

export class MermaidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MermaidError";
  }
}

type Token =
  | { kind: "node"; node: MermaidNode }
  | { kind: "arrow"; arrow: MermaidArrow }
  | { kind: "label"; label: string };

/** classify a complete arrow string (a run of `-`, `.`, `<`, `>`) */
function parseArrow(s: string): MermaidArrow {
  const style: MermaidEdgeStyle = s.includes(".") ? "dashed" : "solid";
  const startsLeft = s.startsWith("<");
  const endsRight = s.endsWith(">");
  let direction: MermaidEdgeDirection;
  if (startsLeft && endsRight) direction = "bidirectional";
  else if (startsLeft || endsRight) direction = "forward";
  else direction = "none";
  const pointsLeft = startsLeft && !endsRight;
  return { style, direction, pointsLeft };
}

/**
 * Given the position right after a node id, detect the shape notation and extract
 * the label. Returns the shape, the label text, and the index just past the closing
 * delimiter. If no shape follows the id, returns `square` with an empty label.
 */
function parseShape(line: string, j: number): { shape: MermaidShape; label: string; next: number } {
  const n = line.length;
  if (j >= n) return { shape: "square", label: "", next: j };

  const c = line[j];

  // cylinder: [(text)] -- the only shape that maps to a non-card
  if (c === "[" && line[j + 1] === "(") {
    const close = line.indexOf(")]", j + 2);
    if (close !== -1) return { shape: "cylinder", label: line.slice(j + 2, close), next: close + 2 };
  }

  // asymmetric: >text]
  if (c === ">") {
    const close = line.indexOf("]", j + 1);
    if (close !== -1) return { shape: "asymmetric", label: line.slice(j + 1, close), next: close + 1 };
  }

  // diamond {text} / hexagon {{text}}
  if (c === "{") {
    const hex = line[j + 1] === "{";
    const openLen = hex ? 2 : 1;
    const close = line.indexOf(hex ? "}}" : "}", j + openLen);
    if (close !== -1) {
      return { shape: hex ? "hexagon" : "diamond", label: line.slice(j + openLen, close), next: close + openLen };
    }
  }

  // rounded (text ) / circle ((text)) / stadium (((text)))
  if (c === "(") {
    const openCount = countLeading(line, j, "(");
    let closers = 0;
    let k = j + openCount;
    while (k < n && closers < openCount) {
      if (line[k] === ")") closers++;
      k++;
    }
    if (closers === openCount) {
      const shape: MermaidShape = openCount >= 3 ? "stadium" : openCount === 2 ? "circle" : "rounded";
      return { shape, label: line.slice(j + openCount, k - openCount), next: k };
    }
  }

  // square [text] and the [ ... ] variants (subroutine, parallelogram, ...)
  if (c === "[") {
    const open = line.slice(j, j + 2);
    if (open === "[[") {
      const close = line.indexOf("]]", j + 2);
      if (close !== -1) return { shape: "subroutine", label: line.slice(j + 2, close), next: close + 2 };
    }
    const close = line.indexOf("]", j);
    if (close !== -1) {
      let label = line.slice(j + 1, close);
      label = label.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
      const shape: MermaidShape = open === "[/" || open === "[\\" ? "parallelogram" : "square";
      return { shape, label, next: close + 1 };
    }
  }

  return { shape: "square", label: "", next: j };
}

function countLeading(line: string, from: number, ch: string): number {
  let k = from;
  while (k < line.length && line[k] === ch) k++;
  return k - from;
}

/** split a node/edge statement line into node / arrow / label tokens */
function scanLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = line.length;

  while (i < n) {
    if (/\s/.test(line[i])) {
      i++;
      continue;
    }

    // edge label: |text|
    if (line[i] === "|") {
      const end = line.indexOf("|", i + 1);
      if (end === -1) throw new MermaidError(`unterminated edge label near "${line.slice(i, i + 12)}"`);
      tokens.push({ kind: "label", label: line.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    // arrow: a run of - . < > = (must contain at least one '-' or '='; '=' is a thick arrow)
    if ("-.<>=".includes(line[i])) {
      let j = i;
      while (j < n && "-.<>=".includes(line[j])) j++;
      const arrowStr = line.slice(i, j);
      if (!arrowStr.includes("-") && !arrowStr.includes("=")) {
        i = j; // not an arrow (e.g. a stray '.') -- skip the run
        continue;
      }

      const endsWithHead = arrowStr.endsWith(">") || arrowStr.startsWith("<");
      if (endsWithHead) {
        tokens.push({ kind: "arrow", arrow: parseArrow(arrowStr) });
        i = j;
        continue;
      }

      // no head in this run. A pure line (`---` or `==`) is a complete arrow unless an
      // arrowhead follows later in the line (a labeled link, e.g. `-- text -->` or
      // `== text ==>`). A bare `--` / `-.` is always the start of a labeled link.
      const relHead = line.slice(j).search(/[<>]/);
      if ((arrowStr === "---" || arrowStr === "==") && relHead === -1) {
        tokens.push({ kind: "arrow", arrow: parseArrow(arrowStr) });
        i = j;
        continue;
      }

      // labeled link: find the closing arrowhead and treat the text between as the label.
      if (relHead === -1) {
        tokens.push({ kind: "arrow", arrow: parseArrow(arrowStr) }); // best effort: undirected
        i = j;
        continue;
      }
      const headIdx = j + relHead;
      // walk back over the closing arrow's dashes/dots/equals to isolate the label
      let closeStart = headIdx;
      while (closeStart > j && "-.=".includes(line[closeStart - 1])) closeStart--;
      const label = line.slice(j, closeStart).trim();
      const head = line[headIdx];
      tokens.push({
        kind: "arrow",
        arrow: { style: arrowStr.includes(".") ? "dashed" : "solid", direction: "forward", pointsLeft: head === "<" },
      });
      if (label) tokens.push({ kind: "label", label });
      i = headIdx + 1;
      continue;
    }

    // quoted node id: "my node"
    if (line[i] === '"') {
      const end = line.indexOf('"', i + 1);
      if (end === -1) throw new MermaidError(`unterminated quoted node id near "${line.slice(i, i + 12)}"`);
      const id = line.slice(i + 1, end);
      const shape = parseShape(line, end + 1);
      tokens.push({ kind: "node", node: { id, label: shape.label, shape: shape.shape } });
      i = shape.next;
      continue;
    }

    // node: id ([a-zA-Z0-9_]+) + optional shape notation
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const id = line.slice(i, j);
      const shape = parseShape(line, j);
      tokens.push({ kind: "node", node: { id, label: shape.label, shape: shape.shape } });
      i = shape.next;
      continue;
    }

    // anything else (e.g. a stray character) is skipped
    i++;
  }

  return tokens;
}

function upsertNode(model: MermaidModel, node: MermaidNode): void {
  const existing = model.nodes.get(node.id);
  if (existing) {
    if (!existing.label && node.label) existing.label = node.label;
    if (existing.shape === "square" && node.shape !== "square") existing.shape = node.shape;
  } else {
    model.nodes.set(node.id, { ...node });
  }
}

function processStatement(tokens: Token[], model: MermaidModel, currentSg: string | undefined): void {
  // register every node on the line first (so edges to bare ids are valid)
  for (const t of tokens) {
    if (t.kind === "node") {
      upsertNode(model, t.node);
      if (currentSg) model.nodeSubgraph.set(t.node.id, currentSg);
    }
  }

  // then link node -> arrow -> [label] -> node chains
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].kind !== "node") {
      i++;
      continue;
    }
    const from = (tokens[i] as { node: MermaidNode }).node;
    const j = i + 1;
    if (j < tokens.length && tokens[j].kind === "arrow") {
      const arrow = (tokens[j] as { arrow: MermaidArrow }).arrow;
      let k = j + 1;
      let label: string | undefined;
      if (k < tokens.length && tokens[k].kind === "label") {
        label = (tokens[k] as { label: string }).label;
        k++;
      }
      if (k < tokens.length && tokens[k].kind === "node") {
        const to = (tokens[k] as { node: MermaidNode }).node;
        let fromId = from.id;
        let toId = to.id;
        if (arrow.direction === "forward" && arrow.pointsLeft) {
          // arrow points left: the flow is from the second node to the first
          [fromId, toId] = [toId, fromId];
        }
        model.edges.push({ from: fromId, to: toId, ...(label ? { label } : {}), style: arrow.style, direction: arrow.direction });
        // resume at the "to" node so a chained edge (A --> B --> C) is also captured
        i = k;
        continue;
      }
    }
    i++;
  }
}

function normalizeDirection(d: string): "TD" | "BT" | "LR" | "RL" {
  const u = d.toUpperCase();
  if (u === "TB" || u === "TD") return "TD";
  if (u === "BT") return "BT";
  if (u === "RL") return "RL";
  return "LR";
}

/** parse a Mermaid flowchart/graph source string into a MermaidModel */
export function parseMermaid(text: string): MermaidModel {
  const model: MermaidModel = {
    nodes: new Map(),
    edges: [],
    subgraphs: new Map(),
    nodeSubgraph: new Map(),
    unsupported: [],
  };

  const lines = text.split(/\r?\n/);

  // reject other Mermaid diagram types up front with a clear message
  const first = lines.map((l) => l.trim()).find((l) => l && !l.startsWith("%%"));
  if (first) {
    const typeMatch = first.match(/^([A-Za-z][\w-]*)/);
    if (typeMatch && !/^(flowchart|graph)$/i.test(typeMatch[1])) {
      throw new MermaidError(
        `Unsupported Mermaid diagram type "${typeMatch[1]}". Only "flowchart" / "graph" is supported.`,
      );
    }
  }

  const subgraphStack: string[] = [];
  let sgCounter = 0;

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // strip %% comments
    const commentIdx = line.indexOf("%%");
    if (commentIdx !== -1) line = line.slice(0, commentIdx).trim();
    if (!line) continue;

    // header: flowchart TD / graph LR (codes: TB, TD, BT, LR, RL)
    const header = line.match(/^(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)\s*$/i);
    if (header) {
      model.direction = normalizeDirection(header[1]);
      continue;
    }

    // direction statement (top-level or inside a subgraph)
    const dir = line.match(/^direction\s+(TB|TD|BT|LR|RL)\s*$/i);
    if (dir) {
      model.direction = normalizeDirection(dir[1]);
      continue;
    }

    // subgraph open: `subgraph title` or `subgraph id [title]`
    const sub = line.match(/^subgraph\s+(.+)$/i);
    if (sub) {
      const raw = sub[1].trim();
      let title = raw;
      const idTitle = raw.match(/^(\S+)\s+\[(.+)\]$/);
      if (idTitle) title = idTitle[2];
      title = title.replace(/^["']|["']$/g, "");
      const sgId = `sg${++sgCounter}`;
      const parent = subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined;
      model.subgraphs.set(sgId, { id: sgId, title, ...(parent ? { parent } : {}) });
      subgraphStack.push(sgId);
      continue;
    }

    // subgraph close
    if (/^end$/i.test(line)) {
      if (subgraphStack.length === 0) throw new MermaidError('"end" without a matching "subgraph".');
      subgraphStack.pop();
      continue;
    }

    // recognized-but-unimportable statements (styling, click handlers, ...)
    if (UNSUPPORTED_STATEMENTS.some((re) => re.test(line))) {
      model.unsupported.push(line);
      continue;
    }

    // node / edge statement
    processStatement(scanLine(line), model, subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined);
  }

  if (subgraphStack.length > 0) {
    throw new MermaidError(`Unclosed "subgraph" (${subgraphStack.length} still open).`);
  }

  return model;
}
