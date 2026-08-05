/**
 * A similarity cache in front of the model.
 *
 * Visitors to a portfolio ask the same dozen questions. "where did he study",
 * "what school did he go to", "where'd he graduate from" are one question wearing
 * three coats, and paying six seconds and a model call for each of them is waste
 * in both directions: the visitor waits, and the daily free-tier budget drains on
 * work already done.
 *
 * So a question is normalised, compared against what has already been answered,
 * and a close enough match is served straight from KV.
 *
 * **It is lexical, not embedding-based, and it is named that way on purpose.**
 * Real semantic caching means embedding the question and comparing vectors; that
 * needs an embedding model this account does not have on the free tier. What is
 * here is token-overlap similarity with a light stemmer - which works well because
 * the question space is genuinely narrow (one person, seven sections) - and
 * calling it "semantic" would be exactly the kind of overclaim the rest of this
 * site argues against.
 *
 * Cache correctness note: only GROUNDED, successful runs are stored. Caching a
 * degraded response would pin an outage in place for a day, and caching an
 * ungrounded one would make a single bad answer permanent.
 */

/**
 * How many past questions to score against. Small on purpose: this is a portfolio
 * with a narrow question space, and the whole set is compared in memory.
 */
const INDEX_SIZE = 60;
/** Entries older than this are ignored and swept. */
const CACHE_TTL_DAYS = 7;
/**
 * Jaccard overlap needed to call two questions the same. Tuned on the real pairs
 * below: 0.5 merges "where did he study" with "where did he go to school", and
 * still separates "what does he build" from "what does he use".
 */
const HIT_THRESHOLD = 0.5;

/** Words that carry no meaning in a question about one person. */
const STOP = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does", "did", "has", "have",
  "had", "he", "his", "him", "she", "her", "they", "them", "it", "its", "i", "me",
  "my", "you", "your", "we", "us", "of", "to", "in", "on", "at", "for", "with",
  "from", "by", "as", "and", "or", "but", "so", "if", "that", "this", "these",
  "those", "there", "here", "what", "which", "who", "whom", "whose", "can", "could",
  "would", "should", "will", "shall", "may", "might", "any", "some", "about",
  "tell", "know", "please", "hey", "hi", "mark", "guy", "person", "s", "t",
  "go", "get", "got", "like", "want", "when", "how", "much", "many", "long",
]);

/**
 * Synonym collapsing, and the reason this cache works at all.
 *
 * Pure token overlap scores "where did he study" against "what school did he go
 * to" at zero: no shared word, same question. Embeddings would handle that; with
 * no embedding model on the free tier, a small hand-written map for a domain this
 * narrow does the same job for the questions people actually ask.
 *
 * It is deliberately incomplete. Words that distinguish questions are left alone -
 * "build" and "use" are NOT collapsed, because "what does he build" and "what does
 * he use" are different questions and merging them would serve the wrong answer.
 * Every entry added here is a pair of questions declared identical, so the list
 * grows only with evidence.
 */
const SYNONYMS: Record<string, string> = {
  school: "education", study: "education", studied: "education", studi: "education",
  university: "education", college: "education", degree: "education",
  educated: "education", graduate: "education", graduated: "education", alma: "education",
  job: "work", role: "work", employer: "work", company: "work", career: "work",
  employed: "work", working: "work", work: "work", position: "work",
  contact: "contact", reach: "contact", email: "contact", touch: "contact",
  hire: "contact", hiring: "contact", message: "contact",
  repo: "project", repository: "project", github: "project", source: "project",
  project: "project", shipped: "project", portfolio: "project",
  pet: "pet", cat: "pet", cats: "pet", chicken: "pet", chickens: "pet", animal: "pet",
  anime: "anime", show: "anime", series: "anime", movie: "anime", film: "anime",
  music: "anime", soundtrack: "anime", ost: "anime",
  colour: "colour", color: "colour", favourite: "colour", favorite: "colour",
  live: "location", lives: "location", located: "location", based: "location",
  where: "location", from: "location", timezone: "location", country: "location",
};

/**
 * Crude suffix stripping. A real stemmer is a dependency and a lot of code for a
 * gain this cache does not need - the point is only that "studies", "studied" and
 * "study" collapse to one token.
 */
function stem(word: string): string {
  for (const suffix of ["ing", "ies", "ied", "es", "ed", "s"]) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      return suffix === "ies" || suffix === "ied" ? word.slice(0, -suffix.length) + "y" : word.slice(0, -suffix.length);
    }
  }
  return word;
}

export function tokenise(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w && !STOP.has(w))
        // Synonyms are applied on the raw word AND after stemming, since "studied"
        // stems to "studi" while "school" needs mapping as-is.
        .map((w) => SYNONYMS[w] ?? w)
        .map(stem)
        .map((w) => SYNONYMS[w] ?? w)
        .filter((w) => !STOP.has(w))
    ),
  ].sort();
}

/** Jaccard: shared tokens over total distinct tokens. */
export function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const shared = a.filter((t) => setB.has(t)).length;
  return shared / (a.length + b.length - shared);
}

export type CachedAnswer = {
  section: string | null;
  answer: string;
  declined: boolean;
  grounded: boolean;
};

type CacheRow = { token_key: string; tokens: string; payload: string };

/**
 * Looks for a question close enough to one already answered. Returns the cached
 * answer plus how it was matched, so the response can say so honestly rather than
 * passing it off as a fresh run.
 */
export async function lookup(
  db: D1Database | undefined,
  question: string
): Promise<{ hit: CachedAnswer; matched: string; score: number } | null> {
  const tokens = tokenise(question);
  if (!tokens.length || !db) return null;

  let rows: CacheRow[] = [];
  try {
    const res = await db
      .prepare(
        `SELECT token_key, tokens, payload FROM guide_cache
         WHERE created_at > datetime('now', ?1)
         ORDER BY created_at DESC LIMIT ?2`
      )
      .bind(`-${CACHE_TTL_DAYS} days`, INDEX_SIZE)
      .all<CacheRow>();
    rows = res.results ?? [];
  } catch {
    // A cache that cannot be read is a slow guide, not a broken one.
    return null;
  }

  let best: { row: CacheRow; score: number } | null = null;
  for (const row of rows) {
    const score = similarity(tokens, row.tokens.split(" "));
    if (score >= HIT_THRESHOLD && (!best || score > best.score)) best = { row, score };
  }
  if (!best) return null;

  try {
    return {
      hit: JSON.parse(best.row.payload) as CachedAnswer,
      matched: best.row.token_key,
      score: Number(best.score.toFixed(3)),
    };
  } catch {
    return null;
  }
}

/**
 * Stores a successful run, keyed by the normalised token string so the same
 * question in different words collapses onto one row rather than growing the
 * table forever.
 *
 * One upsert, not the two KV writes this used to cost. KV Free allows 1,000
 * writes a day across the whole namespace, which the budget counters were already
 * consuming; two more per uncached answer put the guide within a few hundred
 * questions of silently losing both its cache and its spend ceiling on the same
 * day.
 */
export async function remember(
  db: D1Database | undefined,
  question: string,
  value: CachedAnswer
): Promise<void> {
  const tokens = tokenise(question);
  if (!tokens.length || !db) return;
  const key = tokens.join("-").slice(0, 200);

  try {
    await db
      .prepare(
        `INSERT INTO guide_cache (token_key, tokens, payload, created_at)
         VALUES (?1, ?2, ?3, datetime('now'))
         ON CONFLICT (token_key) DO UPDATE SET payload = ?3, created_at = datetime('now')`
      )
      .bind(key, tokens.join(" "), JSON.stringify(value))
      .run();
  } catch {
    // Failing to cache is not worth failing the answer the visitor already has.
  }
}

/**
 * Pairs the cache must treat as the same question, and pairs it must keep apart.
 * Run by scripts/check-guide.mjs, because a threshold nobody tests is a number
 * somebody guessed.
 */
export const SIMILARITY_CASES: { a: string; b: string; same: boolean }[] = [
  { a: "where did he go to school", b: "where did he study", same: true },
  { a: "where did he study", b: "what school did he go to", same: true },
  // These two ARE the same question - the first version of this list had it wrong.
  { a: "how do I contact him", b: "how do I get in touch", same: true },
  { a: "what is he working on right now", b: "what is he working on now", same: true },
  { a: "what does he build", b: "what does he use", same: false },
  { a: "where did he go to school", b: "how do I contact him", same: false },
  { a: "does he have pets", b: "does he have any pets", same: true },
  { a: "what anime does he like", b: "what is his favourite colour", same: false },
];
