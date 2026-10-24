import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The MKB monogram (Mark 2026-10-24), rendered at build by next/og ImageResponse
 * from Geist Black (the site's own family, from the pinned `geist` package) on the
 * redesign's green. Used by src/app/icon.tsx and src/app/apple-icon.tsx; the header
 * logo in navbar.tsx is the same mark in HTML. Letters fill the square with tight
 * tracking so it still reads at 16px.
 */
export const MONO_GREEN = "#0b7a4b"; // oklch(0.5 0.15 160), the hero ink

export function monogram(size: number, radius: number) {
  const font = readFileSync(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: MONO_GREEN,
          borderRadius: radius,
          color: "white",
          fontFamily: "Geist",
          fontSize: size * 0.4,
          letterSpacing: -size * 0.018,
          lineHeight: 1,
          paddingBottom: size * 0.02,
        }}
      >
        MKB
      </div>
    ),
    { width: size, height: size, fonts: [{ name: "Geist", data: font, weight: 900, style: "normal" }] },
  );
}
