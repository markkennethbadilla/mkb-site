/**
 * A small, real gate engine.
 *
 * These are the actual checks that run in the browser demo - not a scripted
 * animation. Every rule below is a pure function over the submitted text, so a
 * visitor can paste anything they like and watch the result change. That is the
 * whole point: a guardrail you cannot test is indistinguishable from a promise.
 *
 * Each gate reports WHY it blocked and WHAT to do instead. A bare denial teaches
 * nothing and gets bypassed; a denial that prints the fix gets obeyed.
 */

export type GateVerdict = {
  id: string;
  title: string;
  /** The failure this gate exists to prevent. */
  why: string;
  blocked: boolean;
  /** 1-indexed line the gate anchors to, when it blocked. */
  line?: number;
  /** The exact text that triggered the block. */
  evidence?: string;
  /** What to do instead. */
  fix?: string;
};

export type Gate = {
  id: string;
  title: string;
  why: string;
  fix: string;
  /** Returns the offending line index (0-based) and text, or null to pass. */
  probe: (lines: string[]) => { index: number; text: string } | null;
};

/** Strip line comments so a gate does not fire on prose describing the problem. */
function isComment(line: string): boolean {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("#") || t.startsWith("*");
}

function findLine(
  lines: string[],
  test: (line: string) => boolean,
  { skipComments = true } = {}
): { index: number; text: string } | null {
  for (let i = 0; i < lines.length; i++) {
    if (skipComments && isComment(lines[i])) continue;
    if (test(lines[i])) return { index: i, text: lines[i].trim() };
  }
  return null;
}

export const GATES: Gate[] = [
  {
    id: "no-hardcoded-secret",
    title: "No hardcoded credentials",
    why: "A key in source is a key in git history, in every fork, and in every CI log. Rotation becomes the only remedy and nobody notices until it is abused.",
    fix: "Read it from the environment at point of use: process.env.API_KEY, validated at startup.",
    probe: (lines) =>
      findLine(lines, (l) =>
        // A literal that looks like a real secret, assigned to a secret-ish name.
        /(?:api[_-]?key|secret|token|password|passwd|bearer)\s*[:=]\s*["'`][^"'`\s]{12,}["'`]/i.test(l) ||
        /["'`](?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})["'`]/.test(l)
      ),
  },
  {
    id: "no-auth-bypass",
    title: "No disabled authorization",
    why: "An auth check commented out 'just for testing' is the single most common way a private route becomes world-readable. It is invisible in review because the code looks shorter, not wrong.",
    fix: "Keep the check and give yourself a seeded test account instead. If a route is genuinely public, say so explicitly with a public() marker so the intent is reviewable.",
    probe: (lines) =>
      findLine(
        lines,
        (l) =>
          /^\s*(?:\/\/|#)\s*(?:await\s+)?(?:require|check|assert|verify|ensure)[A-Za-z]*(?:Auth|Permission|Role|Access|Session)/i.test(l) ||
          /(?:skipAuth|disableAuth|noAuth|bypassAuth|auth\s*[:=]\s*false|requireAuth\s*[:=]\s*false)/i.test(l),
        { skipComments: false }
      ),
  },
  {
    id: "no-env-dump",
    title: "No environment exposed over HTTP",
    why: "A debug route that returns process.env hands an attacker every credential the service holds in one request. These are added for ten minutes and live for years.",
    fix: "Log what you need server-side with a correlation id. Never serialize the environment into a response body.",
    probe: (lines) =>
      findLine(lines, (l) =>
        /(?:res\.(?:json|send)|return)\s*\(?\s*(?:\{[^}]*)?process\.env(?!\.[A-Z_]+\s*[=)])/.test(l) ||
        /JSON\.stringify\s*\(\s*process\.env/.test(l)
      ),
  },
  {
    id: "additive-migrations-only",
    title: "Migrations are additive",
    why: "A DROP in a migration is irreversible the moment it runs against production, and it runs before anyone reads the diff. Rollback cannot bring the column back.",
    fix: "Two-phase it: stop writing the column, ship, confirm nothing reads it, then drop in a later migration. Mark dead schema deprecated in the meantime.",
    probe: (lines) =>
      findLine(lines, (l) =>
        /\b(?:DROP\s+(?:TABLE|COLUMN|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b/i.test(l)
      ),
  },
  {
    id: "no-vague-error",
    title: "Every failure names its cause",
    why: "'Something went wrong' is unactionable for the user and undebuggable for you. The real error was available at the moment it was discarded.",
    fix: "Carry the underlying message, or a correlation id whose cause is logged. Never swallow the original error.",
    probe: (lines) =>
      findLine(lines, (l) =>
        /(?:throw\s+new\s+Error|res\.(?:status\([0-9]+\)\.)?(?:send|json)|return)\s*\(?\s*["'`][^"'`]*(?:something went wrong|unknown error|an error occurred|oops|failed)[^"'`]*["'`]/i.test(l) ||
        /catch\s*\([^)]*\)\s*\{\s*\}/.test(l)
      ),
  },
  {
    id: "no-silenced-test",
    title: "No silenced tests",
    why: "A skipped test is a check that reports green while covering nothing. The suite keeps passing and the regression it was written for ships.",
    fix: "Fix it or delete it. A test worth keeping is worth running; a test not worth running is noise that hides the real signal.",
    probe: (lines) =>
      findLine(lines, (l) =>
        /\b(?:describe|it|test)\.(?:skip|only)\s*\(/.test(l) || /\b(?:xit|xdescribe)\s*\(/.test(l)
      ),
  },
];

export function runGates(source: string): GateVerdict[] {
  const lines = source.split(/\r?\n/);
  return GATES.map((g) => {
    const hit = g.probe(lines);
    return hit
      ? {
          id: g.id,
          title: g.title,
          why: g.why,
          blocked: true,
          line: hit.index + 1,
          evidence: hit.text.length > 120 ? hit.text.slice(0, 117) + "..." : hit.text,
          fix: g.fix,
        }
      : { id: g.id, title: g.title, why: g.why, blocked: false };
  });
}

/** Preset hostile changes. Each one is a real thing people actually ship. */
export const ATTACKS: { label: string; blurb: string; code: string }[] = [
  {
    label: "Hardcode the API key",
    blurb: "The classic. It works, it ships, it is in git forever.",
    // The literal below is a deliberate low-entropy PLACEHOLDER, not a redacted
    // real key. An authentic-looking one trips this repo's own secret scanner on
    // every commit - which is correct behaviour, and exactly the point being made.
    // It still matches the gate's "credential-shaped assignment" rule.
    code: `// quick fix so staging works over the weekend
const client = new OpenAI({ apiKey: "sk-REPLACE-WITH-REAL-KEY" });

export async function summarize(text: string) {
  return client.responses.create({ model: "gpt-4o-mini", input: text });
}`,
  },
  {
    label: "Disable the auth check",
    blurb: "Commented out to unblock a demo. Never uncommented.",
    code: `export async function GET(req: Request) {
  // await requirePermission(req, "billing.read");
  const invoices = await db.invoice.findMany();
  return Response.json(invoices);
}`,
  },
  {
    label: "Add a debug route",
    blurb: "Ten minutes of convenience, years of exposure.",
    code: `// temporary - remove before merging
app.get("/__debug/config", (req, res) => {
  res.json(process.env);
});`,
  },
  {
    label: "Drop a column",
    blurb: "Irreversible the instant it touches production.",
    code: `-- migration 0042: tidy up the users table
ALTER TABLE users DROP COLUMN legacy_billing_ref;
DROP TABLE audit_log_2024;`,
  },
  {
    label: "Swallow the error",
    blurb: "The cause was right there, and it was thrown away.",
    code: `try {
  await chargeCustomer(order);
} catch (e) {}

if (!order.paid) {
  throw new Error("Something went wrong");
}`,
  },
  {
    label: "Skip the failing test",
    blurb: "The suite goes green. The bug ships.",
    code: `describe.skip("inventory reservation", () => {
  it("never lets stock go negative", async () => {
    await reserve(item, 5);
    expect(item.stock).toBeGreaterThanOrEqual(0);
  });
});`,
  },
  {
    label: "Something that passes",
    blurb: "Proof the gates are not just always red.",
    code: `import { z } from "zod";

const Body = z.object({ email: z.string().email(), amount: z.number().positive() });

export async function POST(req: Request) {
  await requirePermission(req, "billing.write");
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const key = process.env.PAYMENTS_KEY;
  if (!key) throw new Error("PAYMENTS_KEY is not configured");
  return Response.json(await charge(parsed.data, key));
}`,
  },
];
