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
 * FIGURES ARE CHECKED DIFFERENTLY FROM NAMES, AND THAT DIFFERENCE IS THE POINT.
 *
 * The first version tested every token against one flat union of every fact's
 * terms. That is sound while the corpus holds almost no numbers, and it was: the
 * only figures in it were three years and a certification level. It stops being
 * sound the moment the corpus describes work, because work is measured. Licensing
 * 66, 55, 300 and 18 into a single pool licenses them everywhere, and all of these
 * then pass:
 *
 *   "He rebuilt access control from 941 permissions down to a six-area grid."
 *   "He ran 66 live failover drills."
 *   "He has 15 years of experience."
 *
 * Each number is real; each is attached to the wrong noun. A name cannot go wrong
 * this way - "Vercel" is either in the corpus or it is not - but a figure carries
 * no clue about what it counts, so the licence has to remember. Every figure is
 * therefore bound to the words that must sit beside it, and a figure that turns up
 * anywhere else is unlicensed even though the digits are real.
 *
 * That matters more than the usual guard, because the run line under every answer
 * tells the visitor it was checked against the fact list. A check that passes a
 * fabrication does not merely fail to help - it publishes an assurance.
 *
 * This deliberately errs toward refusing: a rejected answer falls back to the
 * written section line, which is always true. A false positive costs some warmth
 * in one reply; a false negative publishes a lie about Mark on his own portfolio.
 */

// No imports on purpose. The licence is passed IN rather than reached for, which
// keeps this module a leaf: the Worker, the browser and the build gate can all
// load it, and the gate can exercise it against any corpus it likes.
// (Node's ESM loader also refuses extensionless relative imports, so a leaf is the
// only shape scripts/check-guide.mjs can import directly.)

export type GroundingVerdict =
  | { grounded: true }
  | { grounded: false; unlicensed: string[] };

/**
 * What an answer is allowed to say.
 *
 * `terms` - proper nouns, checked as a set, because a name is self-describing.
 * `figures` - each figure mapped to its bindings. One binding is a list of
 *   companion words, ANY of which is enough. A figure with several bindings is one
 *   several facts legitimately license in different contexts: 2025 is both the year
 *   a role started and the year he graduated.
 */
export type Licence = {
  terms: Set<string>;
  figures: Map<string, string[][]>;
};

/**
 * How far from a figure a companion word may sit, in words, either side.
 *
 * Ten is a clause. Wider, and "He has 15 years of experience, and ships a fleet
 * update that lands within fifteen minutes" would license the 15 from the wrong
 * half of the sentence. Narrower, and an ordinary rephrasing gets refused - which
 * is safe, but a guide that keeps falling back to the written line is a guide
 * nobody asks a second question.
 */
const COMPANION_WINDOW = 10;

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

/** Capitalised words and acronyms - the tokens a name-shaped claim rides on. */
function nameTokens(text: string): string[] {
  const tokens: string[] = [];
  // Capitalised words, including dotted ones like Next.js and Node.js.
  for (const m of text.matchAll(/\b([A-Z][A-Za-z]*(?:\.[A-Za-z]+)*)\b/g)) {
    tokens.push(m[1]);
  }
  // All-caps acronyms of two or more letters are caught above; hyphenated ones
  // are not.
  for (const m of text.matchAll(/\b([A-Z]{2,}(?:-[A-Z0-9]+)+)\b/g)) {
    tokens.push(m[1]);
  }
  return tokens;
}

/**
 * The answer as a flat lowercase word list, so a figure's neighbours can be read
 * off by index. Thousands separators are dropped so "5,000" matches the way a fact
 * writes it.
 */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .split(/[^a-z0-9.]+/)
    .filter(Boolean);
}

/** Every position at which a multi-digit figure appears. */
function figureOccurrences(tokens: string[]): { value: string; at: number }[] {
  const found: { value: string; at: number }[] = [];
  tokens.forEach((token, at) => {
    const m = /^(\d{2,})/.exec(token);
    if (m) found.push({ value: m[1], at });
  });
  return found;
}

export function checkGrounding(answer: string, licence: Licence): GroundingVerdict {
  const unlicensed = new Set<string>();

  // Names: the flat-set check, which is correct for self-describing tokens.
  for (const token of new Set(nameTokens(answer))) {
    const lower = token.toLowerCase();
    if (IGNORED.has(lower)) continue;
    if (licence.terms.has(lower)) continue;
    // "Next.js" licenses "Next"; a bare surname licenses nothing extra.
    if ([...licence.terms].some((t) => t.startsWith(lower + ".") || lower.startsWith(t + "."))) {
      continue;
    }
    unlicensed.add(token);
  }

  // Figures: every occurrence has to stand next to something that explains it.
  const tokens = words(answer);
  for (const { value, at } of figureOccurrences(tokens)) {
    const bindings = licence.figures.get(value);
    if (!bindings) {
      unlicensed.add(value);
      continue;
    }
    const neighbours = new Set(
      tokens.slice(Math.max(0, at - COMPANION_WINDOW), at + COMPANION_WINDOW + 1)
    );
    const bound = bindings.some((companions) => companions.some((c) => neighbours.has(c)));
    // Reported with the reason, because a bare "66" reads as a bug in the guard
    // rather than as a real number attached to the wrong noun.
    if (!bound) unlicensed.add(`${value} (not in a context this figure is licensed for)`);
  }

  return unlicensed.size ? { grounded: false, unlicensed: [...unlicensed] } : { grounded: true };
}

/**
 * Answers the grounding check must reject, and ones it must accept. Exported so
 * scripts/check-guide.mjs runs them on every build - a guard nobody exercises is
 * indistinguishable from a comment.
 *
 * The figure cases are the ones worth reading. Each takes a number the corpus
 * genuinely licenses and attaches it to something it never said, which is the only
 * shape of fabrication that survives having real facts in front of the model.
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
  // Figure binding. Every number below is real and in the corpus; every sentence
  // is false. The flat-pool version of this check passed all four.
  {
    answer: "He has 15 years of experience.",
    grounded: false,
    why: "15 is licensed only as the minutes a fleet update takes to land. Attached to a tenure it is a fabrication.",
  },
  {
    answer: "He rebuilt access control from 941 permissions down to a six-area grid.",
    grounded: false,
    why: "941 is licensed by nothing here, and the permission count is 55.",
  },
  {
    answer: "He ran 66 live failover drills.",
    grounded: false,
    why: "66 is the seconds taken to recover, not a count of drills. The digits are real and the claim is not.",
  },
  {
    answer: "He was in that role for 18 years.",
    grounded: false,
    why: "18 is the number of steps in the deploy pipeline.",
  },
  {
    answer: "After the main server was killed the system was writing again in 66 seconds.",
    grounded: true,
    why: "66 standing beside the words the fact that licenses it uses. This is the sentence the check has to keep letting through.",
  },
  {
    answer: "He has written more than 300 static checks and wired them into the build.",
    grounded: true,
    why: "300 beside 'checks', which is what licenses it.",
  },
];
