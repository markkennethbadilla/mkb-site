import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { DATA } from "@/data/resume";
import { Fly } from "./fly";

const GAP = 50;

const cut = (d: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z ${d}'/%3E%3C/svg%3E")`;

const LAYERS = [
  { art: "url(/art/gate-1.webp)", size: "100% 100%" },
  { art: "url(/art/gate-4.webp)", size: "115% 115%" },
  { art: cut("M22.5 82.5V45A27.5 27.5 0 0 1 77.5 45V82.5Z"), size: "100% 100%" },
  { art: cut("M23 82.5V48Q23 26 50 17.5Q77 26 77 48V82.5Z"), size: "100% 100%" },
  { art: cut("M24 82.5V40H31V30H38V22H62V30H69V40H76V82.5Z"), size: "100% 100%" },
];

const ORDER = [4, 3, 2, 1, 0];
const TILT = [-7, 5, -4, 6, -6, 4, -5];

export function LightBox({ role, tagline }: { role: string; tagline: string }) {
  let n = 0;
  return (
    <div className="lb">
      <div className="lb-stage">
        {ORDER.map((i) => (
          <div key={i} className="lb-layer" data-i={i} style={{ "--i": i } as React.CSSProperties} aria-hidden>
            <i
              style={
                {
                  "--paper": `var(--paper-${i + 1})`,
                  "--art": LAYERS[i].art,
                  WebkitMaskSize: LAYERS[i].size,
                  maskSize: LAYERS[i].size,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
        <div className="lb-copy">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">{role}</p>
          <h1 className="lb-name" aria-label={DATA.name}>
            {DATA.name.split(" ").flatMap((word) => [
              " ",
              <span key={word} className="lb-word" aria-hidden>
                {Array.from(word).map((ch) => {
                  n += 1;
                  return (
                    <span key={n} style={{ "--n": n, "--r": `${TILT[n % TILT.length]}deg` } as React.CSSProperties}>
                      {ch}
                    </span>
                  );
                })}
              </span>,
            ])}
          </h1>
          <p className="max-w-md text-base font-medium leading-snug sm:text-lg">{tagline}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href={`mailto:${DATA.contact.email}`} className="btn-cut">
              Email me <ArrowRight className="size-4" aria-hidden />
            </a>
            <Link href="/resume" className="btn-cut btn-paper">
              One-page resume
            </Link>
          </div>
          <p className="flex items-center gap-1 text-sm font-medium">
            <MapPin className="size-3.5" aria-hidden /> {DATA.location}, remote
          </p>
        </div>
      </div>
      <Fly gap={GAP} />
    </div>
  );
}
