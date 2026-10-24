import { monogram } from "@/lib/monogram";

// Favicon: the MKB monogram, generated once at build into the static export.
export const dynamic = "force-static";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return monogram(64, 12);
}
