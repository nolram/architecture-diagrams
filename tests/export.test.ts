import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadSpecFromText } from "../src/spec/index.js";
import { layoutSpec } from "../src/layout/index.js";
import { composeDiagram } from "../src/render/index.js";
import { renderPng, svgToPdf } from "../src/export/index.js";

async function renderTestSvg(): Promise<string> {
  const parsed = loadSpecFromText(`
version: '1'
title: Export Test
nodes:
  - id: a
    label: A
    icon: aws:lambda
  - id: b
    label: B
    icon: brand:postgresql
edges:
  - from: a
    to: b
`);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error("unreachable");
  const layout = await layoutSpec(parsed.spec);
  const { svg } = await composeDiagram(parsed.spec, layout);
  return svg;
}

describe("export", () => {
  test("renderPng produz um PNG válido com dimensões escaladas", async () => {
    const svg = await renderTestSvg();
    const svgWidth = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1]);
    const svgHeight = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1]);

    const png = renderPng(svg, 2);
    assert.equal(png.buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "assinatura PNG");
    assert.equal(png.width, Math.round(svgWidth * 2));
    assert.equal(png.height, Math.round(svgHeight * 2));
  });

  test("svgToPdf produz um PDF com página do tamanho exato do SVG e imagem em alta resolução", async () => {
    const svg = await renderTestSvg();
    const svgWidth = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1]);
    const svgHeight = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1]);

    const pdf = await svgToPdf(svg, 2);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");

    const text = pdf.toString("latin1");
    const mediaBox = text.match(/\/MediaBox\s*\[([^\]]+)\]/)?.[1].trim().split(/\s+/).map(Number);
    assert.ok(mediaBox, "PDF deveria ter um /MediaBox");
    assert.equal(mediaBox![2], svgWidth, "largura da página deveria bater com o SVG");
    assert.equal(mediaBox![3], svgHeight, "altura da página deveria bater com o SVG");

    const imgWidth = Number(text.match(/\/Width (\d+)/)?.[1]);
    const imgHeight = Number(text.match(/\/Height (\d+)/)?.[1]);
    assert.equal(imgWidth, Math.round(svgWidth * 2));
    assert.equal(imgHeight, Math.round(svgHeight * 2));
  });
});
