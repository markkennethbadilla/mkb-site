import { getSvgPath } from "figma-squircle";

/**
 * The MKB mark (Mark 2026-10-24): a maximalist squircle that still reads as his
 * initials, drawn as one SVG string so the favicon, apple-icon (next/og
 * ImageResponse renders it as an image) and the header logo are the same mark.
 *
 * The squircle outline comes from figma-squircle (pinned), never a hand-tuned path.
 * Letter geometry is original logo design on a 100x100 grid.
 *
 * Concepts (the site's story, systems that stay correct under pressure):
 *   circuit  M, K, B as one circuit trace with node dots; the K's arms converge on
 *            one gold node (twelve payments, one ledger); room-colour gradient rim.
 *   ledger   K's arms are a fan of converging payment lines, the B's bowls are two
 *            stacked ledger rows; layered purple to blue ground.
 *   shield   bold letters on green, the B's bowls form a shield, the guard that
 *            checks an agent before it acts.
 */
export type Concept = "circuit" | "ledger" | "shield";

const GOLD = "#e0a526";
const BLUE = "#2b9be0";
const PURPLE = "#a46ee6";
const GREEN = "#2fbf7a";

function squircle(size: number) {
  return getSvgPath({ width: size, height: size, cornerRadius: size * 0.27, cornerSmoothing: 0.8 });
}

function dotGrid(op: number) {
  let s = "";
  for (let y = 8; y < 100; y += 7) for (let x = 8; x < 100; x += 7) s += `<circle cx="${x}" cy="${y}" r="0.8"/>`;
  return `<g fill="#ffffff" opacity="${op}">${s}</g>`;
}

const M = "M12 70 V30 L23 52 L34 30 V70";
const K_STEM = "M42 30 V70";
const B_STEM = "M64 30 V70";

function circuit(small: boolean) {
  const w = small ? 9 : 6;
  const node = (x: number, y: number, c: string, r = small ? 0 : 3.6) =>
    r ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#0d1714" stroke-width="1.6"/>` : "";
  return `
  <defs><linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${GOLD}"/><stop offset="0.35" stop-color="${BLUE}"/>
    <stop offset="0.7" stop-color="${PURPLE}"/><stop offset="1" stop-color="${GREEN}"/></linearGradient></defs>
  <path d="${squircle(100)}" fill="#0d1714"/>
  ${small ? "" : dotGrid(0.13)}
  <path d="${squircle(100 - (small ? 7 : 4))}" transform="translate(${small ? 3.5 : 2} ${small ? 3.5 : 2})" fill="none" stroke="url(#rim)" stroke-width="${small ? 7 : 4}"/>
  <g fill="none" stroke="#f4f7f5" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${M}"/><path d="${K_STEM}"/>
    <path d="M56 30 L44 50 L56 70"/>
    <path d="${B_STEM} M64 30 H74 Q84 30 84 40 Q84 50 74 50 H64 M64 50 H76 Q87 50 87 60 Q87 70 76 70 H64"/>
  </g>
  ${node(12, 70, GREEN)}${node(23, 52, BLUE)}${node(44, 50, GOLD, small ? 0 : 4.6)}${node(64, 50, PURPLE)}`;
}

function ledger(small: boolean) {
  const fan = small
    ? `<path d="M56 30 L44 50 L56 70"/>`
    : [30, 37, 44, 56, 63, 70].map((y) => `<path d="M57 ${y} L44 50" stroke-width="${y === 30 || y === 70 ? 6 : 2.4}"/>`).join("");
  return `
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3b1f7a"/><stop offset="0.55" stop-color="#173f8f"/><stop offset="1" stop-color="#0c5c58"/></linearGradient></defs>
  <path d="${squircle(100)}" fill="url(#bg)"/>
  ${small ? "" : dotGrid(0.1)}
  <g fill="none" stroke="#ffffff" stroke-width="${small ? 9 : 6}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${M}"/><path d="${K_STEM}"/>${fan}<path d="${B_STEM}"/>
  </g>
  <rect x="65" y="30" width="22" height="17" rx="5" fill="${GOLD}"/>
  <rect x="65" y="53" width="24" height="17" rx="5" fill="${GREEN}"/>
  ${small ? "" : `<path d="M69 38.5 H82 M69 61.5 H84" stroke="#0d1714" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`}`;
}

function shield(small: boolean) {
  return `
  <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#14a565"/><stop offset="1" stop-color="#075c3a"/></linearGradient></defs>
  <path d="${squircle(100)}" fill="url(#sg)"/>
  ${small ? "" : dotGrid(0.12)}
  <g fill="none" stroke="#ffffff" stroke-width="${small ? 9 : 6.5}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${M}"/><path d="${K_STEM}"/><path d="M56 30 L44 50 L56 70"/>
  </g>
  <path d="M66 28 L88 34 V52 C88 62 79 69 66 73 Z" fill="#ffffff"/>
  <path d="M66 38 V64" stroke="#075c3a" stroke-width="3" stroke-linecap="round"/>
  ${small ? "" : `<path d="M70 50 L75 55 L83 44" fill="none" stroke="${GOLD}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`}`;
}

export function logoSvg(concept: Concept = "circuit", opts: { small?: boolean; size?: number; fullBleed?: boolean } = {}) {
  const small = Boolean(opts.small);
  const body = concept === "ledger" ? ledger(small) : concept === "shield" ? shield(small) : circuit(small);
  const sz = opts.size ?? 100;
  // fullBleed: a solid square behind the squircle, for the apple-icon (iOS fills
  // transparent corners with black and applies its own mask).
  const ground = opts.fullBleed ? `<rect width="100" height="100" fill="#0d1714"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${sz}" height="${sz}">${ground}${body}</svg>`;
}

export const SHIPPED: Concept = "circuit";

/** The shipped mark as a PNG ImageResponse, for src/app/icon.tsx and apple-icon.tsx. */
export function logoDataUri(opts: Parameters<typeof logoSvg>[1]) {
  return `data:image/svg+xml;base64,${Buffer.from(logoSvg(SHIPPED, opts)).toString("base64")}`;
}
