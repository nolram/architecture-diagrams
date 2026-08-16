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
  test("renderPng produces a valid PNG with scaled dimensions", async () => {
    const svg = await renderTestSvg();
    const svgWidth = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1]);
    const svgHeight = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1]);

    const png = renderPng(svg, 2);
    assert.equal(png.buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG signature");
    assert.equal(png.width, Math.round(svgWidth * 2));
    assert.equal(png.height, Math.round(svgHeight * 2));
  });

  test("svgToPdf produces a PDF with a page sized exactly to the SVG and a high-resolution image", async () => {
    const svg = await renderTestSvg();
    const svgWidth = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1]);
    const svgHeight = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1]);

    const pdf = await svgToPdf(svg, 2);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");

    const text = pdf.toString("latin1");
    const mediaBox = text.match(/\/MediaBox\s*\[([^\]]+)\]/)?.[1].trim().split(/\s+/).map(Number);
    assert.ok(mediaBox, "PDF should have a /MediaBox");
    assert.equal(mediaBox![2], svgWidth, "page width should match the SVG");
    assert.equal(mediaBox![3], svgHeight, "page height should match the SVG");

    const imgWidth = Number(text.match(/\/Width (\d+)/)?.[1]);
    const imgHeight = Number(text.match(/\/Height (\d+)/)?.[1]);
    assert.equal(imgWidth, Math.round(svgWidth * 2));
    assert.equal(imgHeight, Math.round(svgHeight * 2));
  });
});
