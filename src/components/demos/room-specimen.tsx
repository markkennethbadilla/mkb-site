// No "use client": pure SVG, so it costs the homepage no JavaScript. Motion is
// Tailwind's own animate-pulse behind motion-safe, so reduced motion gets a still.
import { cn } from "@/lib/utils";

/**
 * A small drawing of what each room does, so the three read as different
 * machines before a word is read: twelve payments converging on one balance,
 * a stated confidence bar against a checked one per question, three nodes
 * with one lease. Coloured from the room's own hue (--tint-hue on the parent).
 */
const ink = "oklch(0.6 0.14 var(--tint-hue))";
const faint = "oklch(0.6 0.14 var(--tint-hue) / 0.28)";

function Ledger() {
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => {
        const y = 10 + i * 6.6;
        return (
          <g key={i} className="motion-safe:animate-pulse" style={{ animationDelay: `${i * 120}ms` }}>
            <line x1="8" y1={y} x2="104" y2="48" stroke={faint} strokeWidth="1" />
            <circle cx="8" cy={y} r="2.2" fill={ink} />
          </g>
        );
      })}
      <rect x="106" y="30" width="46" height="36" rx="4" fill="none" stroke={ink} strokeWidth="1.5" />
      <line x1="114" y1="42" x2="144" y2="42" stroke={ink} strokeWidth="1.5" />
      <line x1="114" y1="50" x2="136" y2="50" stroke={faint} strokeWidth="1.5" />
      <line x1="114" y1="57" x2="140" y2="57" stroke={faint} strokeWidth="1.5" />
    </svg>
  );
}

function Score() {
  // stated vs checked, per question; the gap is the point
  const rows = [[92, 88], [85, 40], [97, 95], [78, 20], [90, 86], [88, 52]];
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden>
      {rows.map(([stated, checked], i) => {
        const y = 10 + i * 13.5;
        return (
          <g key={i}>
            <rect x="8" y={y} width={stated * 1.44} height="4" rx="2" fill={faint} />
            <rect
              x="8" y={y + 5.5} width={checked * 1.44} height="4" rx="2" fill={ink}
              className="motion-safe:animate-pulse" style={{ animationDelay: `${i * 180}ms` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function Split() {
  const nodes = [[30, 70], [80, 22], [130, 70]];
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden>
      <polygon points="30,70 80,22 130,70" fill="none" stroke={faint} strokeWidth="1" strokeDasharray="3 3" />
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill="none" stroke={ink} strokeWidth="1.5" />
      ))}
      <circle cx="80" cy="22" r="4" fill={ink} />
      <circle cx="80" cy="22" r="15" fill="none" stroke={ink} strokeWidth="1" className="motion-safe:animate-pulse" />
      <text x="80" y="92" textAnchor="middle" fontSize="8" fontFamily="ui-monospace, monospace" fill={ink}>lease #7</text>
    </svg>
  );
}

// The repository: an agent's tool call travels right and a guard (shield) stops it
// before it reaches the repo, the "blocked before it runs" idea.
function Guards() {
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden>
      <rect x="8" y="34" width="34" height="28" rx="5" fill="none" stroke={ink} strokeWidth="1.5" />
      <text x="25" y="52" textAnchor="middle" fontSize="9" fontFamily="ui-monospace, monospace" fill={ink}>agent</text>
      <line x1="44" y1="48" x2="78" y2="48" stroke={ink} strokeWidth="1.5" strokeDasharray="4 3" className="motion-safe:animate-pulse" />
      <path d="M86 30 L100 35 L100 50 C100 59 93 65 86 68 C79 65 72 59 72 50 L72 35 Z" fill={faint} stroke={ink} strokeWidth="1.5" />
      <path d="M80 49 L85 54 L93 44" fill="none" stroke={ink} strokeWidth="1.8" />
      <line x1="104" y1="48" x2="116" y2="48" stroke={faint} strokeWidth="1.5" />
      <rect x="118" y="34" width="34" height="28" rx="5" fill="none" stroke={faint} strokeWidth="1.5" />
      <text x="135" y="52" textAnchor="middle" fontSize="9" fontFamily="ui-monospace, monospace" fill={ink}>repo</text>
      <text x="86" y="84" textAnchor="middle" fontSize="8" fontFamily="ui-monospace, monospace" fill={ink}>hook checks first</text>
    </svg>
  );
}

const BY_SLUG: Record<string, () => React.JSX.Element> = {
  "agent-guards": Guards,
  "ledger-under-fire": Ledger,
  "score-audit": Score,
  "split-brain": Split,
};

export default function RoomSpecimen({ slug, className }: { slug: string; className?: string }) {
  const Drawing = BY_SLUG[slug];
  if (!Drawing) return null;
  return (
    <div
      className={cn("rounded-lg p-3", className)}
      style={{ background: "oklch(0.6 0.14 var(--tint-hue) / 0.07)" }}
    >
      <Drawing />
    </div>
  );
}
