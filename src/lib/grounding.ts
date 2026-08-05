/**
 * The check that makes "be factual" a control instead of a request.
 *
 * A prompt asking a model not to invent things is a request it can decline
 * silently, and on the first version of this guide every free model did exactly
 * that: told nothing about Mark, they produced a university he never attended and
 * an employer he never worked for, fluently and with no sign anything was wrong.
 *
 * So the model's answer is checked before a visitor ever sees it. The rule is
 * narrow on purpose: an answer may use ordinary English freely, but every PROPER
 * NOUN, YEAR and FIGURE it contains has to be licensed by src/lib/public-facts.ts.
 * Those are the tokens a fabrication actually rides on - "Vercel", "Diliman",
 * "2019" - and they are cheap to check exactly. Adjectives cannot invent an
 * employer.
 *
 * This deliberately errs toward refusing: a rejected answer falls back to the
 * written section line, which is always true. A false positive costs some warmth
 * in one reply; a false negative publishes a lie about Mark on his own portfolio.
 */

// No imports on purpose. The licensed terms are passed IN rather than reached
// for, which keeps this module a leaf: the Worker, the browser and the build gate
// can all load it, and the gate can exercise it against any corpus it likes.
// (Node's ESM loader also refuses extensionless relative imports, so a leaf is the
// only shape scripts/check-guide.mjs can import directly.)

export type GroundingVerdict =
  | { grounded: true }
  | { grounded: false; unlicensed: string[] };

/**
 * Words that look like proper nouns but are just sentence-initial, or are common
 * enough that licensing them individually would be noise. Kept small and explicit
 * - every addition widens what a model is allowed to assert.
 */
const IGNORED = new Set([
  // Sentence starters and pronouns
  "he", "his", "him", "the", "this", "that", "these", "those", "it", "its",
  "you", "your", "i", "a", "an", "and", "or", "but", "so", "if", "when", "where",
  "what", "who", "how", "why", "here", "there", "right", "both", "every", "all",
  // Common sentence-initial verbs and connectives
  "is", "was", "has", "had", "does", "did", "can", "will", "would", "should",
  "yes", "no", "ask", "look", "see", "scroll", "open", "click", "read", "find",
  "before", "after", "since", "from", "to", "at", "in", "on", "for", "with",
  "about", "as", "by", "of", "up", "down", "out", "over", "under", "then",
  // Things that name the page itself, not a claim about Mark
  "section", "page", "card", "site", "below", "above", "left", "right",
]);

/** Tokens that carry a checkable claim: capitalised words, years, and figures. */
function claimTokens(text: string): string[] {
  const tokens: string[] = [];

  // Capitalised words, including dotted ones like Next.js and Node.js.
  for (const m of text.matchAll(/\b([A-Z][A-Za-z]*(?:\.[A-Za-z]+)*)\b/g)) {
    tokens.push(m[1]);
  }
  // Any number of two or more digits: years, counts, percentages.
  for (const m of text.matchAll(/\b(\d{2,})\b/g)) {
    tokens.push(m[1]);
  }
  // All-caps acronyms of two or more letters are caught by the first pattern,
  // but hyphenated ones are not.
  for (const m of text.matchAll(/\b([A-Z]{2,}(?:-[A-Z0-9]+)+)\b/g)) {
    tokens.push(m[1]);
  }

  return tokens;
}

export function checkGrounding(answer: string, licensed: Set<string>): GroundingVerdict {
  const unlicensed = [...new Set(claimTokens(answer))].filter((token) => {
    const lower = token.toLowerCase();
    if (IGNORED.has(lower)) return false;
    if (licensed.has(lower)) return false;
    // "Next.js" licenses "Next"; a bare surname licenses nothing extra.
    if ([...licensed].some((t) => t.startsWith(lower + ".") || lower.startsWith(t + "."))) {
      return false;
    }
    return true;
  });

  return unlicensed.length ? { grounded: false, unlicensed } : { grounded: true };
}

/**
 * Answers the grounding check must reject, and ones it must accept. Exported so
 * scripts/check-guide.mjs runs them on every build - a guard nobody exercises is
 * indistinguishable from a comment.
 */
export const GROUNDING_CASES: { answer: string; grounded: boolean; why: string }[] = [
  {
    answer: "He studied Computer Science at the University of the Philippines Diliman from 2015 to 2019.",
    grounded: false,
    why: "The exact fabrication a free model produced when it had no facts to work from.",
  },
  {
    answer: "He is currently a Staff Engineer at Vercel, where he works on the AI SDK.",
    grounded: false,
    why: "Invented employer and title.",
  },
  {
    answer: "He has been an AI Engineer at WeAssist since March 2026.",
    grounded: true,
    why: "Every proper noun and the year are licensed by the current-role fact.",
  },
  {
    answer: "He studied BS Information Technology at Cebu Institute of Technology, and graduated Magna Cum Laude.",
    grounded: true,
    why: "Licensed by the education fact.",
  },
  {
    answer: "He works in TypeScript, Python and PostgreSQL, and runs everything on Docker.",
    grounded: true,
    why: "Licensed by the stack fact.",
  },
  {
    answer: "Here is where he studied - the school, the degree and the years are all on the card.",
    grounded: true,
    why: "Points at the page and asserts nothing checkable.",
  },
  {
    answer: "He led a team of 12 engineers at Google for 6 years.",
    grounded: false,
    why: "Invented employer, headcount and tenure.",
  },
];
