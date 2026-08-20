#!/usr/bin/env node
import { readFileSync, writeFileSync, watch } from "node:fs";
import { extname, basename, dirname, join } from "node:path";
import { Command } from "commander";
import { renderSpec, SpecError } from "./core/render.js";
import { searchCatalog } from "./icons/index.js";
import { startMcpServer } from "./mcp.js";

const program = new Command();

program.name("arch-diagram").description("Generates rich, professional software architecture diagrams from a YAML/JSON spec");

interface RenderOptions {
  out?: string;
  png?: boolean;
  pdf?: boolean;
  scale: string;
}

/** runs the full pipeline once; returns false if the spec was invalid (so the caller can decide the exit code) */
async function renderOnce(specPath: string, opts: RenderOptions): Promise<boolean> {
  let text: string;
  try {
    text = readFileSync(specPath, "utf-8");
  } catch (err) {
    console.error(`Could not read file "${specPath}": ${(err as Error).message}`);
    return false;
  }

  const outPath = opts.out ?? join(dirname(specPath), `${basename(specPath, extname(specPath))}.svg`);
  const ext = extname(outPath).toLowerCase();
  const svgPath = ext === ".png" || ext === ".pdf" ? outPath.replace(/\.(png|pdf)$/i, ".svg") : outPath;
  const wantsPng = opts.png || ext === ".png";
  const wantsPdf = opts.pdf || ext === ".pdf";

  let result;
  try {
    result = await renderSpec(text, { png: wantsPng, pdf: wantsPdf, scale: Number(opts.scale), baseDir: dirname(specPath) });
  } catch (err) {
    if (err instanceof SpecError) console.error(`Invalid spec in "${specPath}":\n${err.message}`);
    else console.error(`Render failed: ${(err as Error).message}`);
    return false;
  }

  if (result.directionAuto) {
    console.error(`Layout direction auto-selected: ${result.direction}`);
  }

  if (result.warnings.length > 0) {
    console.error("Warnings:");
    for (const w of result.warnings) console.error(`  - ${w}`);
  }

  writeFileSync(svgPath, result.svg, "utf-8");
  console.error(`SVG written to ${svgPath}`);

  if (result.png) {
    const pngPath = svgPath.replace(/\.svg$/i, ".png");
    writeFileSync(pngPath, result.png, "utf-8");
    console.error(`PNG written to ${pngPath}`);
  }

  if (result.pdf) {
    const pdfPath = svgPath.replace(/\.svg$/i, ".pdf");
    writeFileSync(pdfPath, result.pdf, "utf-8");
    console.error(`PDF written to ${pdfPath}`);
  }

  return true;
}

program
  .command("render", { isDefault: true })
  .description("renders a YAML/JSON spec to SVG (and optionally PNG/PDF)")
  .argument("<spec>", "path to the spec file (YAML or JSON)")
  .option("-o, --out <path>", "output path (.svg, .png or .pdf). Defaults to the spec's name with a .svg extension")
  .option("--png", "also generate a .png alongside the .svg")
  .option("--pdf", "also generate a .pdf (page sized exactly to the diagram) alongside the .svg")
  .option("--scale <factor>", "PNG/PDF scale factor (default 2x)", "2")
  .option("--watch", "automatically re-render whenever the spec file is saved")
  .action(async (specPath: string, opts: RenderOptions & { watch?: boolean }) => {
    const ok = await renderOnce(specPath, opts);
    if (!opts.watch) {
      if (!ok) process.exitCode = 1;
      return;
    }

    if (!ok) console.error("(watch mode active -- fix the spec and save again)");
    console.error(`\nWatching ${specPath}... (Ctrl+C to exit)`);

    const dir = dirname(specPath);
    const target = basename(specPath);
    let pending: NodeJS.Timeout | null = null;
    watch(dir, (_event, filename) => {
      if (filename !== target) return;
      if (pending) clearTimeout(pending);
      // debounce: editors often fire several fs events per save (truncate+write, atomic rename, etc.)
      pending = setTimeout(async () => {
        console.error(`\n[${new Date().toLocaleTimeString()}] change detected, re-rendering...`);
        await renderOnce(specPath, opts);
      }, 150);
    });
  });

program
  .command("icons")
  .description("searches the icon catalog by term (matches against key, label and category)")
  .argument("<query>", "search term, e.g. 'postgres', 'aws:s', 'database'")
  .action((query: string) => {
    const matches = searchCatalog(query);

    if (matches.length === 0) {
      console.log(`No icons found for "${query}". See the full catalog at architecture-diagrams/reference/icon-catalog.md.`);
      return;
    }

    const keyWidth = Math.max(...matches.map((e) => e.key.length), 3);
    const labelWidth = Math.max(...matches.map((e) => e.label.length), 5);
    console.log(`${matches.length} icon(s) found:\n`);
    for (const e of matches) {
      console.log(`  ${e.key.padEnd(keyWidth)}  ${e.label.padEnd(labelWidth)}  [${e.category}]`);
    }
  });

program
  .command("mcp")
  .description("starts the Model Context Protocol server on stdio (for MCP clients like Claude Desktop / Cursor)")
  .action(async () => {
    await startMcpServer();
  });

program.parseAsync();
