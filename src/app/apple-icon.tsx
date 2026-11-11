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
        background: "#def3e6",
        color: "#034026",
        fontFamily: "Bricolage Grotesque",
        fontWeight: 800,
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
          name: "Bricolage Grotesque",
          weight: 800,
          style: "normal",
          data: readFileSync(join(process.cwd(), "node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff")),
        },
      ],
    },
  );
}
