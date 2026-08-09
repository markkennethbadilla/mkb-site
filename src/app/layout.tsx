import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DATA } from "@/data/resume";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
        {/* The lock alone stopped being enough around Dark Reader 4.9.86. It
            drops its dynamic theme as asked, but leaves behind the anti-flash
            sheet it injects at document-start, and that sheet alone carries
            `html, body, body :not(iframe) { background:#181a1b !important;
            color:#e8e6e3 !important }` - which flattens every green in the
            palette to the same grey. Sweep it, and keep watching head in case a
            settings change re-injects it. Scoped to the fallback node only, so a
            build that honours the lock properly is left alone. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var sweep=function(){document.querySelectorAll("style.darkreader--fallback").forEach(function(el){el.remove()})};sweep();new MutationObserver(sweep).observe(document.head,{childList:true})})();`,
          }}
        />
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
          {/* Deliberately thin: html, body, providers, and nothing else. The site's
              measure, background grid and dock moved into (site)/layout.tsx so the
              exhibition rooms under /demos can have their own stage without having
              to undo any of it after hydration.

              body is also the element the rooms re-tint - see
              src/components/demos/shell/room-tint.tsx for why it has to be body
              and not a wrapper. */}
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
