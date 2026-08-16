import PDFDocument from "pdfkit";
import { renderPng } from "./png.js";

function parseSvgDimensions(svg: string): { width: number; height: number } {
  const width = svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1];
  const height = svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1];
  if (!width || !height) throw new Error("não foi possível determinar width/height do SVG");
  return { width: Number(width), height: Number(height) };
}

/**
 * Gera um PDF de uma única página do tamanho exato do diagrama (1 unidade
 * SVG = 1 ponto PDF), com a arte embutida como PNG de alta resolução (via
 * `scale`) para ficar nítida na impressão sem depender de conversão
 * SVG→PDF vetorial — o SVG usa filter/clip-path/nested-svg que engines
 * simples de SVG-to-PDF costumam renderizar errado.
 */
export function svgToPdf(svg: string, scale = 2): Promise<Buffer> {
  const { width, height } = parseSvgDimensions(svg);
  const { buffer } = renderPng(svg, scale);

  const doc = new PDFDocument({ size: [width, height], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.image(buffer, 0, 0, { width, height });
  doc.end();

  return done;
}
