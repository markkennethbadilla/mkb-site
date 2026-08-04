import Navbar from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DATA } from "@/data/resume";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(DATA.url),
  title: {
    default: DATA.name,
    template: `%s | ${DATA.name}`,
  },
  description: DATA.description,
  openGraph: {
    title: `${DATA.name}`,
    description: DATA.description,
    url: DATA.url,
    siteName: `${DATA.name}`,
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    title: `${DATA.name}`,
    card: "summary_large_image",
  },
  verification: {
    google: "",
    yandex: "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Dark Reader's official opt-out. This site already implements a dark
            theme, so letting an extension re-tint it on top produces muddy
            colours and destroys the deliberate green cast. The lock is honoured
            by Dark Reader specifically; color-scheme states the same intent in
            the standard way, for the browser and any other extension. */}
        <meta name="darkreader-lock" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased relative",
          geist.variable,
          geistMono.variable
        )}
      >
        {/* Follow the visitor's OS setting rather than forcing light. The site
            ships a real dark theme, so defaulting to light meant a dark-mode
            user got flashbanged and then reached for an extension - which is
            exactly the thing the darkreader-lock below opts out of. */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={0}>
            <div className="absolute inset-0 top-0 left-0 right-0 h-[100px] overflow-hidden z-0">
              <FlickeringGrid
                className="h-full w-full"
                squareSize={2}
                gridGap={2}
                style={{
                  maskImage: "linear-gradient(to bottom, black, transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
                }}
              />
            </div>
            {/* ONE container width for the whole page. Previously this was
                max-w-2xl and the demo broke out of it, so a single section
                randomly spanned the viewport while everything else sat in a
                thin ribbon - which read as a bug, not a layout. Everything now
                shares this edge; prose constrains its own line length inside. */}
            <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-12 pb-24 sm:py-24">
              {children}
            </div>
            <Navbar />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
