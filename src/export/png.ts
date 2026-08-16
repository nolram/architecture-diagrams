import { Resvg } from "@resvg/resvg-js";

export function svgToPng(svg: string, scale = 2): Buffer {
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
      sansSerifFamily: "Noto Sans",
      defaultFontFamily: "Noto Sans",
    },
    fitTo: { mode: "zoom", value: scale },
  });
  return resvg.render().asPng();
}
