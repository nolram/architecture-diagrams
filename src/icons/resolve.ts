import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { getCatalogEntry, findSimilarKeys } from "./catalog.js";

export interface ResolvedIcon {
  /** SVG interno (sem tag <svg> externa) pronto para ser embutido num viewBox padrão */
  body: string;
  viewBox: string;
  /** cor de marca, se o ícone já vier colorido (thesvg) */
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
  /** motivo específico (ex: arquivo custom inválido/inseguro) — quando presente, sobrescreve a mensagem genérica de "não encontrado no catálogo" */
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
// recusa o arquivo inteiro (em vez de tentar limpar e usar o resto) se qualquer coisa
// potencialmente perigosa aparecer — mais simples de garantir correto que sanitização parcial.
const UNSAFE_SVG_PATTERN = /<script[\s>/]|on[a-z]+\s*=|javascript:|<foreignobject[\s>]|<iframe[\s>]|<embed[\s>]|<object[\s>]/i;

function resolveCustomFileIcon(key: string, baseDir: string): IconResolveResult {
  const relativePath = key.slice(FILE_ICON_PREFIX.length);
  const fullPath = resolvePath(baseDir, relativePath);

  let raw: string;
  try {
    raw = readFileSync(fullPath, "utf-8");
  } catch {
    return { ok: false, key, suggestions: [], reason: `arquivo não encontrado: ${fullPath}` };
  }

  if (Buffer.byteLength(raw, "utf-8") > MAX_CUSTOM_ICON_BYTES) {
    return { ok: false, key, suggestions: [], reason: `arquivo maior que ${MAX_CUSTOM_ICON_BYTES / 1000}KB, recusado por segurança` };
  }
  if (UNSAFE_SVG_PATTERN.test(raw)) {
    return {
      ok: false,
      key,
      suggestions: [],
      reason: "SVG recusado: contém <script>, handler de evento (on*=), javascript:, <foreignObject>, <iframe/embed/object> ou outro conteúdo potencialmente inseguro",
    };
  }

  const svgMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!svgMatch) {
    return { ok: false, key, suggestions: [], reason: "arquivo não parece ser um SVG válido (tag <svg>...</svg> não encontrada)" };
  }

  const viewBox = raw.match(/<svg[^>]*\sviewBox="([^"]+)"/i)?.[1] ?? "0 0 64 64";
  return { ok: true, icon: { body: svgMatch[1], viewBox } };
}

/**
 * Resolve uma chave de ícone da spec (ex: "aws:lambda", "generic:database",
 * "file:./assets/logo.svg") para SVG pronto para composição. `accentColor` é
 * usado apenas para ícones genéricos mdi, que herdam a cor da categoria no
 * tema; ícones de marca (thesvg) mantêm sua cor oficial e ignoram accentColor.
 * `baseDir` é obrigatório apenas para chaves "file:..." — resolve o caminho
 * relativo ao diretório do arquivo de spec.
 */
export async function resolveIcon(key: string, accentColor?: string, baseDir?: string): Promise<IconResolveResult> {
  if (key.startsWith(FILE_ICON_PREFIX)) {
    if (!baseDir) {
      return { ok: false, key, suggestions: [], reason: "ícone customizado (file:...) requer um diretório base, que não foi informado" };
    }
    return resolveCustomFileIcon(key, baseDir);
  }

  const entry = getCatalogEntry(key);
  if (!entry) {
    return { ok: false, key, suggestions: findSimilarKeys(key) };
  }

  if (entry.source === "thesvg") {
    try {
      const mod = (await import(`thesvg/${entry.ref}`)) as { svg: string; hex?: string };
      const body = extractSvgInner(mod.svg);
      return {
        ok: true,
        icon: { body, viewBox: "0 0 64 64", brandHex: mod.hex ? `#${mod.hex}` : undefined },
      };
    } catch {
      // slug não existe mais no pacote thesvg instalado (ex: renomeado numa atualização) —
      // degrada para o mesmo caminho de fallback gracioso das outras chaves ausentes,
      // em vez de propagar a exceção do import() e derrubar o render inteiro.
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

export function fallbackBadge(label: string, accentColor: string): ResolvedIcon {
  const initial = (label.trim()[0] ?? "?").toUpperCase();
  return {
    viewBox: "0 0 64 64",
    body: `<circle cx="32" cy="32" r="30" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="2"/>
<text x="32" y="40" font-size="26" font-family="sans-serif" font-weight="600" text-anchor="middle" fill="${accentColor}">${initial}</text>`,
  };
}
