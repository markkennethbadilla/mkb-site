import { monogram } from "@/lib/monogram";

// Apple touch icon: full-bleed square on solid green (iOS applies its own mask).
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return monogram(180, 0);
}
