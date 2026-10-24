import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

/**
 * Site chrome: a sticky header in normal flow (nothing floats over content on a
 * phone) and ONE container width for every section. The canvas FlickeringGrid
 * that used to sit behind the top 100px was dropped in the 2026-10-24 overhaul:
 * it ran a requestAnimationFrame loop on the main thread for a texture most
 * visitors never registered, and the homepage's mobile speed was below its floor.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="relative mx-auto w-full max-w-5xl px-6 pt-10 pb-20 sm:pt-16">{children}</div>
      <Footer />
    </>
  );
}
