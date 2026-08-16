import PDFDocument from "pdfkit";
import { renderPng } from "./png.js";

function parseSvgDimensions(svg: string): { width: number; height: number } {
  const width = svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1];
  const height = svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1];
  if (!width || !height) throw new Error("could not determine the SVG's width/height");
  return { width: Number(width), height: Number(height) };
}

/**
 * Generates a single-page PDF at the diagram's exact size (1 SVG unit = 1
 * PDF point), with the artwork embedded as a high-resolution PNG (via
 * `scale`) so it stays crisp when printed, without depending on vector
 * SVG->PDF conversion -- our SVG uses filter/clip-path/nested-svg that
 * simple SVG-to-PDF engines tend to render incorrectly.
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
