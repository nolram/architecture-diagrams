#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { extname, basename, dirname, join } from "node:path";
import { Command } from "commander";
import { loadSpecFromText } from "./spec/index.js";
import { layoutSpec } from "./layout/index.js";
import { composeDiagram } from "./render/index.js";
import { svgToPng } from "./export/index.js";

const program = new Command();

program
  .name("arch-diagram")
  .description("Gera diagramas de arquitetura de software ricos e profissionais a partir de uma spec YAML/JSON")
  .argument("<spec>", "caminho para o arquivo de spec (YAML ou JSON)")
  .option("-o, --out <path>", "caminho de saída (.svg ou .png). Padrão: mesmo nome do spec, com extensão .svg")
  .option("--png", "gera também um .png além do .svg")
  .option("--scale <factor>", "fator de escala do PNG (padrão 2x)", "2")
  .action(async (specPath: string, opts: { out?: string; png?: boolean; scale: string }) => {
    let text: string;
    try {
      text = readFileSync(specPath, "utf-8");
    } catch (err) {
      console.error(`Não foi possível ler o arquivo "${specPath}": ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    }

    const result = loadSpecFromText(text);
    if (!result.ok) {
      console.error(`Spec inválida em "${specPath}":\n`);
      for (const error of result.errors) {
        console.error(`  - ${error.path ? `[${error.path}] ` : ""}${error.message}`);
      }
      process.exitCode = 1;
      return;
    }

    const layout = await layoutSpec(result.spec);
    if (result.spec.direction === "auto") {
      console.error(`Direção do layout escolhida automaticamente: ${layout.direction}`);
    }
    const { svg, warnings } = await composeDiagram(result.spec, layout);

    if (warnings.length > 0) {
      console.error("Avisos:");
      for (const w of warnings) console.error(`  - ${w}`);
    }

    const outPath = opts.out ?? join(dirname(specPath), `${basename(specPath, extname(specPath))}.svg`);
    const wantsPng = opts.png || extname(outPath).toLowerCase() === ".png";
    const svgPath = extname(outPath).toLowerCase() === ".png" ? outPath.replace(/\.png$/i, ".svg") : outPath;

    writeFileSync(svgPath, svg, "utf-8");
    console.error(`SVG escrito em ${svgPath}`);

    if (wantsPng) {
      const pngPath = svgPath.replace(/\.svg$/i, ".png");
      const png = svgToPng(svg, Number(opts.scale));
      writeFileSync(pngPath, png);
      console.error(`PNG escrito em ${pngPath}`);
    }
  });

program.parseAsync();
