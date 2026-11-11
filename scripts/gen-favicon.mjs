import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { create } from "fontkit";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "src/app/icon.svg");
const LIGHT = "oklch(0.33 0.075 158)";
const DARK = "oklch(0.88 0.075 158)";

console.log("START gen-favicon");
try {
  const font = create(readFileSync(join(ROOT, "node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff")));
  const run = font.layout("MKB");
  const track = -0.03 * font.unitsPerEm;
  let pen = 0;
  const glyphs = run.glyphs.map((glyph, i) => {
    const path = glyph.path.translate(pen, 0).scale(1, -1);
    pen += run.positions[i].xAdvance + track;
    return path;
  });
  const minX = Math.min(...glyphs.map((p) => p.bbox.minX));
  const maxX = Math.max(...glyphs.map((p) => p.bbox.maxX));
  const minY = Math.min(...glyphs.map((p) => p.bbox.minY));
  const maxY = Math.max(...glyphs.map((p) => p.bbox.maxY));
  const side = Math.max(maxX - minX, maxY - minY);
  const view = [(minX + maxX - side) / 2, (minY + maxY - side) / 2, side, side].map((n) => Math.round(n)).join(" ");
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + view + '">',
    "<style>path{fill:" + LIGHT + "}@media (prefers-color-scheme:dark){path{fill:" + DARK + "}}</style>",
    '<path d="' + glyphs.map((p) => p.toSVG()).join("") + '"/>',
    "</svg>",
    "",
  ].join("\n");
  writeFileSync(OUT, svg);
  console.log(`OK gen-favicon ${OUT} ${svg.length} bytes`);
} catch (err) {
  console.error(`FAIL gen-favicon ${err.stack}`);
  process.exit(1);
}
