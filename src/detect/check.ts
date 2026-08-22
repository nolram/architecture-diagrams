import { TECH_MAPPING, EVIDENCE_TO_TECH } from "./mapping.js";
import type { Confidence, DetectedTech, DetectionResult } from "./types.js";
import type { DiagramNode, DiagramSpec } from "../spec/schema.js";

/** the severity of a consistency finding (high = most actionable) */
export type CheckSeverity = "high" | "medium" | "low";

/** a single consistency finding: a diagram claim without code evidence, or code evidence without a node */
export interface CheckFinding {
  kind: "missing-evidence" | "undrawn";
  severity: CheckSeverity;
  /** human-readable explanation, e.g. 'Node "cache" (icon brand:redis): no redis evidence found in the codebase.' */
  message: string;
  /** the spec node involved (set for missing-evidence findings) */
  node?: { id: string; label: string; icon?: string };
  /** the technology involved, when unambiguous */
  tech?: string;
  /** where the code evidence is (set for undrawn findings) */
  evidence?: string;
}

/** a spec node that matched a detected technology */
export interface CheckMatch {
  node: { id: string; label: string; icon?: string };
  tech: string;
  confidence: Confidence;
  source: string;
  via: "icon" | "name";
}

/** the result of comparing a spec against a detection result */
export interface CheckResult {
  findings: CheckFinding[];
  matches: CheckMatch[];
  warnings: string[];
  summary: { matched: number; missingEvidence: number; undrawn: number };
}

/** presence-based technologies a diagram may legitimately omit (platform/CI layer) */
const PRESENCE_TECHS = new Set(["docker", "kubernetes", "github-actions", "jenkins", "gitlab-ci"]);

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
const SEVERITY_RANK: Record<CheckSeverity, number> = { high: 3, medium: 2, low: 1 };

/** invert TECH_MAPPING: iconKey -> the techs that use that icon (several techs can share one icon) */
function buildIconToTechs(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [tech, mapping] of Object.entries(TECH_MAPPING)) {
    const list = map.get(mapping.iconKey);
    if (list) list.push(tech);
    else map.set(mapping.iconKey, [tech]);
  }
  return map;
}

/** for each tech: the tech name plus every evidence name that maps to it (all lowercase) */
function buildTechTerms(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const tech of Object.keys(TECH_MAPPING)) {
    const terms = [tech.toLowerCase()];
    for (const [evidence, target] of Object.entries(EVIDENCE_TO_TECH)) {
      if (target === tech) terms.push(evidence.toLowerCase());
    }
    map.set(tech, terms);
  }
  return map;
}

/** escape regex special characters in a term */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** word-boundary match: "react" matches "react app" but not "reaction" (text must already be lowercased) */
function hasWord(text: string, term: string): boolean {
  const escaped = escapeRegex(term.toLowerCase());
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(text);
}

/** a human-readable message for a missing-evidence finding (node id, label, icon and tech when known) */
function missingEvidenceMessage(node: DiagramNode, iconTechs: string[]): string {
  const iconPart = node.icon ? `, icon ${node.icon}` : "";
  const techPart =
    iconTechs.length === 1
      ? `no ${iconTechs[0]} evidence found in the codebase.`
      : "no matching technology evidence found in the codebase.";
  return `Node "${node.id}" (${node.label}${iconPart}): ${techPart}`;
}

/**
 * Compare a validated architecture spec against a detection result, in both
 * directions:
 * - missing-evidence: a node claims a technology the codebase shows no evidence for
 * - undrawn: the codebase shows evidence for a technology the diagram does not draw
 *
 * Pure and deterministic -- no file access. Matching is icon-first (the spec's
 * explicit claim about technology), with a word-boundary name match as fallback
 * for generic or icon-less nodes. If no manifests were found at all, all
 * missing-evidence severities are capped at low and a warning is emitted.
 */
export function checkConsistency(spec: DiagramSpec, detection: DetectionResult): CheckResult {
  const noEvidence = detection.detected.length === 0;
  const iconToTechs = buildIconToTechs();
  const techTerms = buildTechTerms();

  const findings: CheckFinding[] = [];
  const matches: CheckMatch[] = [];
  const matchedTechs = new Set<string>();

  // --- Direction A: spec -> code (missing-evidence) ---
  for (const node of spec.nodes) {
    const nodeRef: CheckMatch["node"] = { id: node.id, label: node.label };
    if (node.icon) nodeRef.icon = node.icon;
    const iconTechs =
      node.icon && !node.icon.startsWith("file:") ? iconToTechs.get(node.icon) ?? [] : [];

    // a) icon match (strong): the node's icon is a mapped tech icon and one of those techs was detected
    let match: CheckMatch | undefined;
    let coveredTechs: string[] = [];
    if (iconTechs.length > 0) {
      let best: DetectedTech | undefined;
      for (const d of detection.detected) {
        if (!iconTechs.includes(d.tech)) continue;
        if (!best || CONFIDENCE_RANK[d.confidence] > CONFIDENCE_RANK[best.confidence]) best = d;
      }
      if (best) {
        match = { node: nodeRef, tech: best.tech, confidence: best.confidence, source: best.source, via: "icon" };
        // the icon covers every tech that shares it (e.g. brand:nodejs covers both express and nodejs)
        coveredTechs = detection.detected.filter((d) => iconTechs.includes(d.tech)).map((d) => d.tech);
      }
    }

    // b) name match (weak): a detected tech's name or evidence name appears as a word in the node text
    if (!match) {
      const text = [node.id, node.label, node.sublabel].filter(Boolean).join(" ").toLowerCase();
      const named = detection.detected.filter((d) => {
        const terms = techTerms.get(d.tech);
        return terms ? terms.some((t) => hasWord(text, t)) : false;
      });
      if (named.length > 0) {
        match = { node: nodeRef, tech: named[0].tech, confidence: named[0].confidence, source: named[0].source, via: "name" };
        // a node can name several techs ("Redis and Kafka broker") -- cover them all
        coveredTechs = named.map((d) => d.tech);
      }
    }

    if (match) {
      matches.push(match);
      for (const t of coveredTechs) matchedTechs.add(t);
      continue;
    }

    // c) missing-evidence finding: severity by how specific the claim is
    let severity: CheckSeverity;
    if (iconTechs.length > 0) severity = "high";
    else if (node.category === "external" || node.category === "security") severity = "medium";
    else severity = "low";
    if (noEvidence) severity = "low";

    const finding: CheckFinding = {
      kind: "missing-evidence",
      severity,
      node: nodeRef,
      message: missingEvidenceMessage(node, iconTechs),
    };
    if (iconTechs.length === 1) finding.tech = iconTechs[0];
    findings.push(finding);
  }

  // --- Direction B: code -> spec (undrawn) ---
  for (const d of detection.detected) {
    if (matchedTechs.has(d.tech)) continue;
    // Placeholder/unknown techs (k8s "service"/"ingress", unmapped compose service
    // names) are not keys in TECH_MAPPING, so no node can ever cover them -- cap at
    // low so a correct diagram is not failed by an unsatisfiable finding.
    const severity: CheckSeverity =
      PRESENCE_TECHS.has(d.tech) || !TECH_MAPPING[d.tech] ? "low" : d.confidence;
    const techName = d.tech.charAt(0).toUpperCase() + d.tech.slice(1);
    findings.push({
      kind: "undrawn",
      severity,
      tech: d.tech,
      evidence: d.source,
      message: `${techName} was detected (${d.source}) but no node in the diagram matches it.`,
    });
  }

  // --- Warnings ---
  const warnings: string[] = [...detection.warnings];
  if (noEvidence) {
    warnings.push("No recognizable manifests found in the repo; all findings are low-confidence.");
  }

  // --- Sort findings: high -> medium -> low (stable within a severity) ---
  findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  return {
    findings,
    matches,
    warnings,
    summary: {
      matched: matches.length,
      missingEvidence: findings.filter((f) => f.kind === "missing-evidence").length,
      undrawn: findings.filter((f) => f.kind === "undrawn").length,
    },
  };
}
