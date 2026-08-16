#!/usr/bin/env node
import { readFileSync, writeFileSync, watch } from "node:fs";
import { extname, basename, dirname, join } from "node:path";
import { Command } from "commander";
import { loadSpecFromText } from "./spec/index.js";
import { layoutSpec } from "./layout/index.js";
import { composeDiagram } from "./render/index.js";
import { svgToPng, svgToPdf } from "./export/index.js";
import { searchCatalog } from "./icons/index.js";

const program = new Command();

program.name("arch-diagram").description("Gera diagramas de arquitetura de software ricos e profissionais a partir de uma spec YAML/JSON");

interface RenderOptions {
  out?: string;
  png?: boolean;
  pdf?: boolean;
  scale: string;
}

/** roda o pipeline completo uma vez; retorna false se a spec era inválida (para o caller decidir o exit code) */
async function renderOnce(specPath: string, opts: RenderOptions): Promise<boolean> {
  let text: string;
  try {
    text = readFileSync(specPath, "utf-8");
  } catch (err) {
    console.error(`Não foi possível ler o arquivo "${specPath}": ${(err as Error).message}`);
    return false;
  }

  const result = loadSpecFromText(text);
  if (!result.ok) {
    console.error(`Spec inválida em "${specPath}":\n`);
    for (const error of result.errors) {
      console.error(`  - ${error.path ? `[${error.path}] ` : ""}${error.message}`);
    }
    return false;
  }

  const layout = await layoutSpec(result.spec);
  if (result.spec.direction === "auto") {
    console.error(`Direção do layout escolhida automaticamente: ${layout.direction}`);
  }
  const { svg, warnings } = await composeDiagram(result.spec, layout, dirname(specPath));

  if (warnings.length > 0) {
    console.error("Avisos:");
    for (const w of warnings) console.error(`  - ${w}`);
  }

  const outPath = opts.out ?? join(dirname(specPath), `${basename(specPath, extname(specPath))}.svg`);
  const ext = extname(outPath).toLowerCase();
  const svgPath = ext === ".png" || ext === ".pdf" ? outPath.replace(/\.(png|pdf)$/i, ".svg") : outPath;
  const wantsPng = opts.png || ext === ".png";
  const wantsPdf = opts.pdf || ext === ".pdf";

  writeFileSync(svgPath, svg, "utf-8");
  console.error(`SVG escrito em ${svgPath}`);

  if (wantsPng) {
    const pngPath = svgPath.replace(/\.svg$/i, ".png");
    writeFileSync(pngPath, svgToPng(svg, Number(opts.scale)));
    console.error(`PNG escrito em ${pngPath}`);
  }

  if (wantsPdf) {
    const pdfPath = svgPath.replace(/\.svg$/i, ".pdf");
    writeFileSync(pdfPath, await svgToPdf(svg, Number(opts.scale)));
    console.error(`PDF escrito em ${pdfPath}`);
  }

  return true;
}

program
  .command("render", { isDefault: true })
  .description("renderiza uma spec YAML/JSON em SVG (e opcionalmente PNG/PDF)")
  .argument("<spec>", "caminho para o arquivo de spec (YAML ou JSON)")
  .option("-o, --out <path>", "caminho de saída (.svg, .png ou .pdf). Padrão: mesmo nome do spec, com extensão .svg")
  .option("--png", "gera também um .png além do .svg")
  .option("--pdf", "gera também um .pdf (página do tamanho exato do diagrama) além do .svg")
  .option("--scale <factor>", "fator de escala do PNG/PDF (padrão 2x)", "2")
  .option("--watch", "re-renderiza automaticamente sempre que o arquivo de spec for salvo")
  .action(async (specPath: string, opts: RenderOptions & { watch?: boolean }) => {
    const ok = await renderOnce(specPath, opts);
    if (!opts.watch) {
      if (!ok) process.exitCode = 1;
      return;
    }

    if (!ok) console.error("(watch ativo — corrija a spec e salve de novo)");
    console.error(`\nObservando ${specPath}... (Ctrl+C para sair)`);

    const dir = dirname(specPath);
    const target = basename(specPath);
    let pending: NodeJS.Timeout | null = null;
    watch(dir, (_event, filename) => {
      if (filename !== target) return;
      if (pending) clearTimeout(pending);
      // debounce: editores costumam disparar vários eventos de fs por save (truncate+write, rename atômico etc.)
      pending = setTimeout(async () => {
        console.error(`\n[${new Date().toLocaleTimeString()}] mudança detectada, re-renderizando...`);
        await renderOnce(specPath, opts);
      }, 150);
    });
  });

program
  .command("icons")
  .description("busca ícones no catálogo por termo (bate contra key, label e category)")
  .argument("<query>", "termo de busca, ex: 'postgres', 'aws:s', 'database'")
  .action((query: string) => {
    const matches = searchCatalog(query);

    if (matches.length === 0) {
      console.log(`Nenhum ícone encontrado para "${query}". Veja o catálogo completo em architecture-diagrams/reference/icon-catalog.md.`);
      return;
    }

    const keyWidth = Math.max(...matches.map((e) => e.key.length), 3);
    const labelWidth = Math.max(...matches.map((e) => e.label.length), 5);
    console.log(`${matches.length} ícone(s) encontrado(s):\n`);
    for (const e of matches) {
      console.log(`  ${e.key.padEnd(keyWidth)}  ${e.label.padEnd(labelWidth)}  [${e.category}]`);
    }
  });

program.parseAsync();
