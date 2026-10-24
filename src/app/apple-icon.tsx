import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

// Apple touch icon: the full MKB circuit mark on a solid square (iOS masks it).
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoDataUri({ size: 180, fullBleed: true })} width={180} height={180} alt="" />,
    size,
  );
}
