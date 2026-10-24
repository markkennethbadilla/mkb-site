import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

// Favicon: the MKB circuit mark (src/lib/logo.ts), rendered once at build.
// The small variant drops the grid and nodes and thickens the strokes for tabs.
export const dynamic = "force-static";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoDataUri({ small: true, size: 64 })} width={64} height={64} alt="" />,
    size,
  );
}
