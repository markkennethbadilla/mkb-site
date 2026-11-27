import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { create } from "fontkit";
import { ok } from "./log.mjs";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "src/app/icon.svg");
// Same hue as --tint-hue in src/app/globals.css.
const HUE = 150;
const LIGHT_BG = `oklch(0.98 0.004 ${HUE})`;
const LIGHT = `oklch(0.17 0.006 ${HUE})`;
const DARK_BG = `oklch(0.17 0.006 ${HUE})`;
const DARK = `oklch(0.8 0.11 ${HUE})`;

console.log("START gen-favicon");
try {
  const font = create(readFileSync(join(ROOT, "node_modules/@fontsource/geist-sans/files/geist-sans-latin-700-normal.woff")));
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
  // Full-bleed square, mark inside the centre 80 percent (deploy gate icon-full-bleed).
  const side = Math.max(maxX - minX, maxY - minY) * 1.25;
  const view = [(minX + maxX - side) / 2, (minY + maxY - side) / 2, side, side].map((n) => Math.round(n)).join(" ");
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + view + '">',
    "<style>rect{fill:" + LIGHT_BG + "}path{fill:" + LIGHT + "}@media (prefers-color-scheme:dark){rect{fill:" + DARK_BG + "}path{fill:" + DARK + "}}</style>",
    '<rect x="' + view.split(" ")[0] + '" y="' + view.split(" ")[1] + '" width="' + view.split(" ")[2] + '" height="' + view.split(" ")[3] + '"/>',
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
ok();
