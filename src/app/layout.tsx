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

// Anchored on day 15 so converting to UTC cannot roll the month backwards.
const isoMonth = (monthAndYear: string) =>
  new Date(`15 ${monthAndYear}`).toISOString().slice(0, 7);

const PERSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${DATA.url}/#person`,
  name: DATA.name,
  url: DATA.url,
  image: `${DATA.url}${DATA.avatarUrl}`,
  email: `mailto:${DATA.contact.email}`,
  jobTitle: "Full Stack AI Engineer",
  description: DATA.description,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cebu City",
    addressCountry: "PH",
  },
  sameAs: [DATA.contact.social.GitHub.url, DATA.contact.social.LinkedIn.url],
  worksFor: {
    "@type": "Organization",
    name: DATA.work[0].company,
    url: DATA.work[0].href,
  },
  hasOccupation: [
    { "@type": "Occupation", name: DATA.work[0].title },
    ...DATA.work.map((job) => ({
      "@type": "Role",
      startDate: isoMonth(job.start),
      ...(job.end === "Present" ? {} : { endDate: isoMonth(job.end) }),
      hasOccupation: { "@type": "Occupation", name: job.title },
    })),
  ],
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: DATA.education[0].school,
    url: DATA.education[0].href,
  },
  award: "Magna Cum Laude",
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      name: "BS Information Technology",
      credentialCategory: "degree",
      educationalLevel: "Bachelor",
      recognizedBy: { "@type": "CollegeOrUniversity", name: DATA.education[0].school },
    },
    ...DATA.certifications.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c,
      credentialCategory: "certificate",
    })),
  ],
  knowsAbout: DATA.resumeSkills.flatMap((g) => g.items.map((i) => i.name)),
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
        {/* One schema.org Person node, and every value in it is read off DATA, so
            the JSON-LD cannot become a fifth surface that drifts from the page, the
            sheet, the metadata and the guide corpus.

            `educationalLevel: "Bachelor"` is here rather than on the page because
            the visible degree string is locked to the About paragraph and reads
            "BS Information Technology" - Workday and Taleo taxonomies key on the
            word Bachelor, and this is the one place it can be stated without
            editing prose that has an off-machine source.

            The bare Occupation entry is the range-clean current title. The Role
            entries carry the dates, and nothing here states a tenure total; a
            reader that wants one computes it from the dates, exactly as it would
            from the resume. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(PERSON_LD).replace(/</g, "\\u003c"),
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
