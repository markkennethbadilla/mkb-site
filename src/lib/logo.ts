import { getSvgPath } from "figma-squircle";

/**
 * The MKB mark (Mark 2026-10-25: "more simple but creatively done"). One idea:
 * a ligature where the letters share stems. The M's last stroke is the K's stem
 * and the K's arms meet the B's stem, so three letters become one glyph. White on
 * the site green, on a squircle from the pinned figma-squircle.
 *
 * The favicon and apple-icon (next/og ImageResponse in src/app/icon.tsx and
 * apple-icon.tsx) and the header logo (navbar.tsx) all render this one SVG.
 */
const GREEN = "#0b7a4b";
const LETTERS =
  "M14 72 V28 L31 54 L48 28 V72 M48 50 L66 28 M48 50 L66 72 V28 H76 Q86 28 86 39 Q86 50 76 50 H66 M66 50 H78 Q88 50 88 61 Q88 72 78 72 H66";

export function logoSvg(opts: { small?: boolean; size?: number; fullBleed?: boolean } = {}) {
  const w = opts.small ? 10 : 7.5; // thicker strokes so it still reads at 16px
  const sz = opts.size ?? 100;
  const squircle = getSvgPath({ width: 100, height: 100, cornerRadius: 27, cornerSmoothing: 0.8 });
  // fullBleed: a solid square behind the squircle for the apple-icon (iOS masks it).
  // nosemgrep: html-in-template-string
  const ground = opts.fullBleed ? `<rect width="100" height="100" fill="${GREEN}"/>` : "";
  // nosemgrep: html-in-template-string
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${sz}" height="${sz}">${ground}<path d="${squircle}" fill="${GREEN}"/><path d="${LETTERS}" fill="none" stroke="#ffffff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** The mark as a data URI, for next/og. */
export function logoDataUri(opts: Parameters<typeof logoSvg>[0]) {
  return `data:image/svg+xml;base64,${Buffer.from(logoSvg(opts)).toString("base64")}`;
}
