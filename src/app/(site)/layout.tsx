import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import GridBackdrop from "@/components/grid-backdrop";

/**
 * Site chrome: a sticky header in normal flow (nothing floats over content on a
 * phone) and ONE container width for every section. The canvas FlickeringGrid
 * behind the top of the page was dropped in the 2026-10-24 overhaul for speed and
 * brought back the same day at Mark's request through GridBackdrop, which imports
 * it only once the browser is idle and never for reduced motion.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <GridBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-10 pb-20 sm:pt-16">{children}</div>
      <Footer />
    </>
  );
}
