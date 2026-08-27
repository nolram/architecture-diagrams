#!/usr/bin/env node
import { readFileSync, writeFileSync, watch, existsSync, statSync } from "node:fs";
import { extname, basename, dirname, join } from "node:path";
import { Command } from "commander";
import { stringify } from "yaml";
import { renderSpec, SpecError, validateSpecText, formatErrors } from "./core/render.js";
import { searchCatalog } from "./icons/index.js";
import { startMcpServer } from "./mcp.js";
import { analyzeCodebase } from "./detect/index.js";
import { checkConsistency } from "./detect/check.js";
import { importMermaid, MermaidError } from "./mermaid/index.js";
import type { DiagramSpec } from "./spec/schema.js";

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
  .command("detect")
  .description("detects the tech stack of a codebase and emits a draft architecture spec (YAML)")
  .argument("<path>", "path to the codebase (directory)")
  .option("--render", "also render the draft spec to SVG")
  .option("-o, --out <path>", "output path for the rendered SVG (with --render)")
  .action(async (path: string, opts: { render?: boolean; out?: string }) => {
    if (!existsSync(path) || !statSync(path).isDirectory()) {
      console.error(`Path "${path}" is not a directory.`);
      process.exitCode = 1;
      return;
    }

    const result = analyzeCodebase(path);
    const specYaml = stringify(result.draftSpec);

    const count = result.detected.length;
    console.log(`Detected ${count} technolog${count === 1 ? "y" : "ies"} in ${path}:\n`);
    if (count > 0) {
      const techWidth = Math.max(...result.detected.map((d) => d.tech.length));
      const iconWidth = Math.max(...result.detected.map((d) => d.iconKey.length));
      const catWidth = Math.max(...result.detected.map((d) => d.category.length));
      const confWidth = Math.max(...result.detected.map((d) => d.confidence.length));
      for (const d of result.detected) {
        console.log(`  ${d.tech.padEnd(techWidth)}  ${d.iconKey.padEnd(iconWidth)}  [${d.category.padEnd(catWidth)}]  ${d.confidence.padEnd(confWidth)}  ${d.source}`);
      }
    } else {
      console.log("  (none)");
    }

    if (result.warnings.length > 0) {
      console.log(`\nWarnings:`);
      for (const w of result.warnings) console.log(`  - ${w}`);
    }

    console.log(`\nDraft spec:\n`);
    console.log(specYaml);

    if (opts.render) {
      try {
        const rendered = await renderSpec(specYaml);
        const outPath = opts.out ?? join(process.cwd(), "detected.svg");
        writeFileSync(outPath, rendered.svg, "utf-8");
        console.error(`SVG written to ${outPath}`);
        if (rendered.warnings.length > 0) {
          console.error("Render warnings:");
          for (const w of rendered.warnings) console.error(`  - ${w}`);
        }
      } catch (err) {
        if (err instanceof SpecError) console.error(`Invalid draft spec:\n${err.message}`);
        else console.error(`Render failed: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    }
  });

program
  .command("check")
  .description("checks a diagram spec against a codebase (missing evidence + undrawn technologies)")
  .argument("<spec>", "path to the spec file (YAML or JSON)")
  .requiredOption("--repo <path>", "path to the codebase (directory) to check the diagram against")
  .option("--strict", "also fail (exit 1) on low-severity findings")
  .action((specPath: string, opts: { repo: string; strict?: boolean }) => {
    let text: string;
    try {
      text = readFileSync(specPath, "utf-8");
    } catch (err) {
      console.error(`Could not read file "${specPath}": ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    }

    const validation = validateSpecText(text);
    if (!validation.ok) {
      console.error(`Invalid spec in "${specPath}":\n${formatErrors(validation.errors)}`);
      process.exitCode = 1;
      return;
    }

    const type = (validation.spec as { type?: string }).type;
    if (type !== "architecture") {
      console.error(`check currently supports architecture specs only (got "${type}").`);
      process.exitCode = 1;
      return;
    }

    const repoPath = opts.repo;
    if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
      console.error(`Path "${repoPath}" is not a directory.`);
      process.exitCode = 1;
      return;
    }

    const result = checkConsistency(validation.spec as DiagramSpec, analyzeCodebase(repoPath));

    console.log(`Checked "${specPath}" against ${repoPath}:\n`);

    console.log("Matches:");
    if (result.matches.length === 0) {
      console.log("  (none)");
    } else {
      for (const m of result.matches) {
        const icon = m.node.icon ? ` (${m.node.icon})` : "";
        console.log(`  ${m.node.id} "${m.node.label}"${icon} -> ${m.tech} [via ${m.via}] ${m.source}`);
      }
    }

    console.log("\nFindings:");
    if (result.findings.length === 0) {
      console.log("  No findings.");
    } else {
      for (const severity of ["high", "medium", "low"] as const) {
        const group = result.findings.filter((f) => f.severity === severity);
        if (group.length === 0) continue;
        console.log(`  ${severity.charAt(0).toUpperCase() + severity.slice(1)}:`);
        for (const f of group) console.log(`    - [${f.kind}] ${f.message}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const w of result.warnings) console.log(`  - ${w}`);
    }

    const s = result.summary;
    console.log(`\nSummary: ${s.matched} matched, ${s.missingEvidence} missing evidence, ${s.undrawn} undrawn.`);

    const failing =
      result.findings.some((f) => f.severity === "high" || f.severity === "medium") ||
      (Boolean(opts.strict) && result.findings.length > 0);
    if (failing) process.exitCode = 1;
  });

program
  .command("import")
  .description("imports a Mermaid flowchart/graph file and converts it to an architecture spec (YAML)")
  .argument("<file>", "path to the Mermaid file (.mmd or .txt)")
  .option("--render", "also render the converted spec to SVG")
  .option("-o, --out <path>", "output path for the rendered SVG (with --render)")
  .action(async (filePath: string, opts: { render?: boolean; out?: string }) => {
    let text: string;
    try {
      text = readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error(`Could not read file "${filePath}": ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    }

    let result;
    try {
      result = importMermaid(text);
    } catch (err) {
      if (err instanceof MermaidError) console.error(`Could not import Mermaid diagram: ${err.message}`);
      else console.error(`Import failed: ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    }

    const specYaml = stringify(result.spec);

    if (result.warnings.length > 0) {
      console.error("Warnings:");
      for (const w of result.warnings) console.error(`  - ${w}`);
    }

    console.log(specYaml);

    if (opts.render) {
      try {
        const rendered = await renderSpec(specYaml);
        const outPath = opts.out ?? join(process.cwd(), "imported.svg");
        writeFileSync(outPath, rendered.svg, "utf-8");
        console.error(`SVG written to ${outPath}`);
        if (rendered.warnings.length > 0) {
          console.error("Render warnings:");
          for (const w of rendered.warnings) console.error(`  - ${w}`);
        }
      } catch (err) {
        if (err instanceof SpecError) console.error(`Invalid converted spec:\n${err.message}`);
        else console.error(`Render failed: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    }
  });

program
  .command("mcp")
  .description("starts the Model Context Protocol server on stdio (for MCP clients like Claude Desktop / Cursor)")
  .action(async () => {
    await startMcpServer();
  });

program.parseAsync();
