import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { getCatalogEntry, findSimilarKeys } from "./catalog.js";

export interface ResolvedIcon {
  /** inner SVG (without the outer <svg> tag), ready to embed inside a standard viewBox */
  body: string;
  viewBox: string;
  /** brand color, if the icon already comes colored (thesvg) */
  brandHex?: string;
}

export interface IconResolveOk {
  ok: true;
  icon: ResolvedIcon;
}
export interface IconResolveMissing {
  ok: false;
  key: string;
  suggestions: string[];
  /** specific reason (e.g. invalid/unsafe custom file) -- when present, overrides the generic "not found in catalog" message */
  reason?: string;
}
export type IconResolveResult = IconResolveOk | IconResolveMissing;

interface MdiIconSet {
  width: number;
  height: number;
  icons: Record<string, { body: string; width?: number; height?: number }>;
}

let mdiSetPromise: Promise<MdiIconSet> | null = null;
async function loadMdiSet(): Promise<MdiIconSet> {
  if (!mdiSetPromise) {
    mdiSetPromise = import("@iconify-json/mdi/icons.json", { with: { type: "json" } }).then(
      (mod) => mod.default as MdiIconSet,
    );
  }
  return mdiSetPromise;
}

const FILE_ICON_PREFIX = "file:";
const MAX_CUSTOM_ICON_BYTES = 200_000;
// Reject the whole file (instead of trying to clean it up and use the rest)
// if anything potentially dangerous shows up -- simpler to guarantee correct
// than partial sanitization.
const UNSAFE_SVG_PATTERN = /<script[\s>/]|on[a-z]+\s*=|javascript:|<foreignobject[\s>]|<iframe[\s>]|<embed[\s>]|<object[\s>]/i;

function resolveCustomFileIcon(key: string, baseDir: string): IconResolveResult {
  const relativePath = key.slice(FILE_ICON_PREFIX.length);
  const fullPath = resolvePath(baseDir, relativePath);

  let raw: string;
  try {
    raw = readFileSync(fullPath, "utf-8");
  } catch {
    return { ok: false, key, suggestions: [], reason: `file not found: ${fullPath}` };
  }

  if (Buffer.byteLength(raw, "utf-8") > MAX_CUSTOM_ICON_BYTES) {
    return { ok: false, key, suggestions: [], reason: `file larger than ${MAX_CUSTOM_ICON_BYTES / 1000}KB, rejected for safety` };
  }
  if (UNSAFE_SVG_PATTERN.test(raw)) {
    return {
      ok: false,
      key,
      suggestions: [],
      reason: "SVG rejected: contains <script>, an event handler (on*=), javascript:, <foreignObject>, <iframe/embed/object>, or other potentially unsafe content",
    };
  }

  const svgMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!svgMatch) {
    return { ok: false, key, suggestions: [], reason: "file does not look like a valid SVG (no <svg>...</svg> tag found)" };
  }

  return { ok: true, icon: { body: svgMatch[1], viewBox: extractViewBox(raw) } };
}

/**
 * Resolves a spec icon key (e.g. "aws:lambda", "generic:database",
 * "file:./assets/logo.svg") into SVG ready for composition. `accentColor` is
 * only used for generic mdi icons, which inherit the category's color from
 * the theme; brand icons (thesvg) keep their official color and ignore
 * accentColor. `baseDir` is required only for "file:..." keys -- it resolves
 * the path relative to the spec file's directory.
 */
export async function resolveIcon(key: string, accentColor?: string, baseDir?: string): Promise<IconResolveResult> {
  if (key.startsWith(FILE_ICON_PREFIX)) {
    if (!baseDir) {
      return { ok: false, key, suggestions: [], reason: "custom icon (file:...) requires a base directory, which was not provided" };
    }
    return resolveCustomFileIcon(key, baseDir);
  }

  const entry = getCatalogEntry(key);
  if (!entry) {
    return { ok: false, key, suggestions: findSimilarKeys(key) };
  }

  if (entry.source === "thesvg") {
    try {
      const mod = (await import(`thesvg/${entry.ref}`)) as { svg: string; hex?: string; variants?: Record<string, string> };
      let svgSource = mod.svg;
      if (entry.variant) {
        const variantSvg = mod.variants?.[entry.variant];
        if (!variantSvg) {
          return { ok: false, key, suggestions: [], reason: `variant "${entry.variant}" does not exist for icon "${entry.ref}" in the installed thesvg package` };
        }
        svgSource = variantSvg;
      }
      const body = extractSvgInner(svgSource);
      return {
        ok: true,
        icon: { body, viewBox: extractViewBox(svgSource), brandHex: mod.hex ? `#${mod.hex}` : undefined },
      };
    } catch {
      // Slug no longer exists in the installed thesvg package (e.g. renamed
      // in an update) -- degrade to the same graceful fallback path as other
      // missing-key cases, instead of letting the import() exception bubble
      // up and crash the whole render.
      return { ok: false, key, suggestions: findSimilarKeys(key) };
    }
  }

  const set = await loadMdiSet();
  const raw = set.icons[entry.ref];
  if (!raw) {
    return { ok: false, key, suggestions: findSimilarKeys(key) };
  }
  const w = raw.width ?? set.width;
  const h = raw.height ?? set.height;
  const color = accentColor ?? "#334155";
  const body = raw.body.replace(/currentColor/g, color);
  return { ok: true, icon: { body, viewBox: `0 0 ${w} ${h}` } };
}

function extractSvgInner(svg: string): string {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return match ? match[1] : svg;
}

/**
 * Extracts the real viewBox declared in the source SVG. thesvg covers brands
 * from very different origins (AWS/Azure/GCP icons use a 64x64 canvas by
 * convention, but generic brand logos like PostgreSQL/Redis/MongoDB use
 * whatever native viewBox the original logo had -- 432x445, 256x220, etc).
 * Assuming "0 0 64 64" for everyone cropped most brand logos into an
 * unrecognizable fragment of the top-left corner.
 */
function extractViewBox(svg: string): string {
  const viewBox = svg.match(/<svg[^>]*\sviewBox="([^"]+)"/i)?.[1];
  if (viewBox) return viewBox;
  const width = svg.match(/<svg[^>]*\swidth="([\d.]+)"/i)?.[1];
  const height = svg.match(/<svg[^>]*\sheight="([\d.]+)"/i)?.[1];
  if (width && height) return `0 0 ${width} ${height}`;
  return "0 0 64 64";
}

export function fallbackBadge(label: string, accentColor: string): ResolvedIcon {
  const initial = (label.trim()[0] ?? "?").toUpperCase();
  return {
    viewBox: "0 0 64 64",
    body: `<circle cx="32" cy="32" r="30" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="2"/>
<text x="32" y="40" font-size="26" font-family="sans-serif" font-weight="600" text-anchor="middle" fill="${accentColor}">${initial}</text>`,
  };
}
