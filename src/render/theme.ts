import type { IconCategory } from "../icons/catalog.js";
import type { DiagramGroup } from "../spec/schema.js";

export type ThemeName = "clean-light" | "midnight-dark";
export type GroupStyleVariant = DiagramGroup["style"];

export interface GroupStyleTokens {
  fill: string;
  stroke: string;
  labelColor: string;
  labelBg: string;
  dash?: string;
}

export interface C4ElementTokens {
  fill: string;
  stroke: string;
  labelColor: string;
}

export interface C4ExternalSystemTokens extends C4ElementTokens {
  dash: string;
}

export interface C4Tokens {
  person: C4ElementTokens;
  system: C4ElementTokens;
  "external-system": C4ExternalSystemTokens;
  container: C4ElementTokens;
  component: C4ElementTokens;
}

export interface Theme {
  name: ThemeName;
  canvasBg: string;
  cardBg: string;
  cardBorder: string;
  cardShadowColor: string;
  titleColor: string;
  labelColor: string;
  sublabelColor: string;
  edgeColor: string;
  edgeLabelBg: string;
  edgeLabelColor: string;
  fontFamily: string;
  groupStyles: Record<GroupStyleVariant, GroupStyleTokens>;
  c4: C4Tokens;
  categoryColors: Record<IconCategory, string>;
}

const categoryColorsLight: Record<IconCategory, string> = {
  compute: "#ea580c",
  storage: "#0284c7",
  database: "#4f46e5",
  network: "#059669",
  security: "#dc2626",
  messaging: "#9333ea",
  external: "#475569",
  generic: "#475569",
};

const categoryColorsDark: Record<IconCategory, string> = {
  compute: "#fb923c",
  storage: "#38bdf8",
  database: "#818cf8",
  network: "#34d399",
  security: "#f87171",
  messaging: "#c084fc",
  external: "#94a3b8",
  generic: "#94a3b8",
};

const FONT_FAMILY = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

export const THEMES: Record<ThemeName, Theme> = {
  "clean-light": {
    name: "clean-light",
    canvasBg: "#f8fafc",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    cardShadowColor: "rgba(15, 23, 42, 0.18)",
    titleColor: "#0f172a",
    labelColor: "#0f172a",
    sublabelColor: "#64748b",
    edgeColor: "#94a3b8",
    edgeLabelBg: "rgba(248, 250, 252, 0.85)",
    edgeLabelColor: "#475569",
    fontFamily: FONT_FAMILY,
    groupStyles: {
      vpc: { fill: "#faf5ff", stroke: "#a855f7", labelColor: "#7e22ce", labelBg: "none" },
      subnet: { fill: "#eff6ff", stroke: "#3b82f6", labelColor: "#1d4ed8", labelBg: "none" },
      az: { fill: "#ecfdf5", stroke: "#10b981", labelColor: "#047857", labelBg: "#ecfdf5", dash: "6 5" },
      boundary: { fill: "#f8fafc", stroke: "#94a3b8", labelColor: "#334155", labelBg: "#f8fafc", dash: "4 4" },
      generic: { fill: "#f8fafc", stroke: "#cbd5e1", labelColor: "#334155", labelBg: "none" },
    },
    c4: {
      person: { fill: "#e0f2fe", stroke: "#0284c7", labelColor: "#0c4a6e" },
      system: { fill: "#dbeafe", stroke: "#2563eb", labelColor: "#1e40af" },
      "external-system": { fill: "#f1f5f9", stroke: "#64748b", labelColor: "#334155", dash: "6 5" },
      container: { fill: "#d1fae5", stroke: "#059669", labelColor: "#065f46" },
      component: { fill: "#ede9fe", stroke: "#7c3aed", labelColor: "#5b21b6" },
    },
    categoryColors: categoryColorsLight,
  },
  "midnight-dark": {
    name: "midnight-dark",
    canvasBg: "#0b1220",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    cardShadowColor: "rgba(0, 0, 0, 0.45)",
    titleColor: "#f1f5f9",
    labelColor: "#f1f5f9",
    sublabelColor: "#94a3b8",
    edgeColor: "#64748b",
    edgeLabelBg: "rgba(11, 18, 32, 0.85)",
    edgeLabelColor: "#cbd5e1",
    fontFamily: FONT_FAMILY,
    groupStyles: {
      vpc: { fill: "#2e1065", stroke: "#a855f7", labelColor: "#e9d5ff", labelBg: "none" },
      subnet: { fill: "#0c2a4d", stroke: "#3b82f6", labelColor: "#bfdbfe", labelBg: "none" },
      az: { fill: "#052e28", stroke: "#10b981", labelColor: "#a7f3d0", labelBg: "#052e28", dash: "6 5" },
      boundary: { fill: "#1e293b", stroke: "#64748b", labelColor: "#e2e8f0", labelBg: "#1e293b", dash: "4 4" },
      generic: { fill: "#1e293b", stroke: "#475569", labelColor: "#e2e8f0", labelBg: "none" },
    },
    c4: {
      person: { fill: "#0c4a6e", stroke: "#38bdf8", labelColor: "#bae6fd" },
      system: { fill: "#1e3a8a", stroke: "#60a5fa", labelColor: "#bfdbfe" },
      "external-system": { fill: "#1e293b", stroke: "#64748b", labelColor: "#cbd5e1", dash: "6 5" },
      container: { fill: "#064e3b", stroke: "#34d399", labelColor: "#a7f3d0" },
      component: { fill: "#4c1d95", stroke: "#a78bfa", labelColor: "#ddd6fe" },
    },
    categoryColors: categoryColorsDark,
  },
};

export function getTheme(name: ThemeName): Theme {
  return THEMES[name];
}
