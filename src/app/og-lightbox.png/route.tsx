import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DATA } from "@/data/resume";

export const dynamic = "force-static";

const face = (weight: 400 | 700) => ({
  name: "Geist",
  weight,
  style: "normal" as const,
  data: readFileSync(join(process.cwd(), `node_modules/@fontsource/geist-sans/files/geist-sans-latin-${weight}-normal.woff`)),
});

// Same look as the site hero (SPEC "Look"): near-white page, cyan wash from the top, centered type.
export function GET() {
  const role = DATA.description.slice(0, DATA.description.indexOf(". "));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 1200,
        height: 630,
        background: "radial-gradient(ellipse 70% 80% at 50% 0%, #bdeefb 0%, #fbfcfd 70%)",
        color: "#121417",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", fontSize: 26, color: "#0b7a99", border: "1px solid #dfe3e6", borderRadius: 999, padding: "8px 22px", background: "#ffffff" }}>
        {role}
      </div>
      <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -3, marginTop: 28 }}>{DATA.name}</div>
      <div style={{ fontSize: 30, color: "#5d646b", marginTop: 16 }}>{DATA.url.replace("https://", "")}</div>
    </div>,
    { width: 1200, height: 630, fonts: [face(400), face(700)] },
  );
}
