import { ImageResponse } from "next/og";
import { DATA } from "@/data/resume";

export const dynamic = "force-static";

const SHEETS = [
  { inset: 0, fill: "#04361f" },
  { inset: 44, fill: "#0d5a37" },
  { inset: 88, fill: "#2f8259" },
  { inset: 132, fill: "#7fbf9c" },
  { inset: 176, fill: "#ffd98a" },
];

export function GET() {
  const role = DATA.description.slice(0, DATA.description.indexOf(". "));
  return new ImageResponse(
    <div style={{ display: "flex", width: 1200, height: 630, position: "relative", background: SHEETS[0].fill }}>
      {SHEETS.slice(1).map((s) => (
        <div
          key={s.inset}
          style={{
            position: "absolute",
            left: s.inset * 1.6,
            right: s.inset * 1.6,
            top: s.inset * 0.5,
            bottom: 0,
            background: s.fill,
            borderTopLeftRadius: 600,
            borderTopRightRadius: 600,
            boxShadow: "0 -10px 30px rgba(0, 20, 10, 0.45)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 110,
          color: "#04361f",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase" }}>{role}</div>
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, marginTop: 10 }}>{DATA.name}</div>
        <div style={{ fontSize: 28, marginTop: 14 }}>{DATA.url.replace("https://", "")}</div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
