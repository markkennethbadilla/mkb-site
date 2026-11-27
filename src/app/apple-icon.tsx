import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: 180,
        height: 180,
        alignItems: "center",
        justifyContent: "center",
        background: "#121417",
        color: "#bdeefb",
        fontFamily: "Geist",
        fontWeight: 700,
        fontSize: 78,
        letterSpacing: -2.3,
      }}
    >
      MKB
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          weight: 700,
          style: "normal",
          data: readFileSync(join(process.cwd(), "node_modules/@fontsource/geist-sans/files/geist-sans-latin-700-normal.woff")),
        },
      ],
    },
  );
}
