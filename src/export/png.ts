import { Resvg } from "@resvg/resvg-js";

export interface RenderedPng {
  buffer: Buffer;
  width: number;
  height: number;
}

export function renderPng(svg: string, scale = 2): RenderedPng {
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
      sansSerifFamily: "Noto Sans",
      defaultFontFamily: "Noto Sans",
    },
    fitTo: { mode: "zoom", value: scale },
  });
  const image = resvg.render();
  return { buffer: image.asPng(), width: image.width, height: image.height };
}

export function svgToPng(svg: string, scale = 2): Buffer {
  return renderPng(svg, scale).buffer;
}
