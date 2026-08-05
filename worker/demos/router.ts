/**
 * The one way into a demo room's endpoints, and the reason there is only one.
 *
 * Every room fans out: a click becomes a dozen or more concurrent requests. Three
 * rooms doing that, each accounting for itself, is three chances to forget - and
 * the failure is silent, because a room that forgets to charge the budget works
 * perfectly right up until the day the site's whole free-tier allowance is gone and
 * the site guide stops answering. That is the wrong thing to sacrifice.
 *
 * So no handler is reachable except through here, and the accounting lives here
 * rather than in any of them:
 *
 *   - Creating a run reserves the room's ENTIRE declared cost, once, IP-keyed. The
 *     number comes from the registry (`requestsPerRun`), so the manifest a visitor
 *     reads on the page is literally the number the budget charges.
 *   - Every other action is a shard of a run already paid for. It reserves nothing
 *     and is bounded by limitRun(), keyed on the run id.
 *
 * scripts/check-demos.mjs asserts both halves by reading this file: that reserve()
 * appears here and nowhere in worker/demos/*, and that the cost passed is the
 * registry field rather than a literal. A rule with a gate is a rule; without one
 * it is a comment that the next room will not read.
 *
 * A thrown error becomes a 500 carrying the real message. A demo that fails with
 * "something went wrong" teaches a visitor nothing, and this site's entire argument
 * is that the failure should name itself.
 */

import { ROOMS } from "../../src/lib/demos/registry";
import { reserve, limitRun, type BudgetEnv } from "../budget";
import { handle as handleLedger, START_ACTIONS as LEDGER_STARTS } from "./ledger-under-fire";
import { handle as handleScoreAudit, START_ACTIONS as SCORE_STARTS } from "./score-audit";
import { handle as handleSplitBrain, START_ACTIONS as SPLIT_STARTS } from "./split-brain";

export interface DemoEnv extends BudgetEnv {
  DEMO_DB?: D1Database;
  DEEPSEEK_API_KEY?: string;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

type RoomHandler = {
  starts: readonly string[];
  handle: (action: string, req: Request, env: DemoEnv) => Promise<Response>;
};

const HANDLERS: Record<string, RoomHandler> = {
  "ledger-under-fire": { starts: LEDGER_STARTS, handle: handleLedger },
  "score-audit": { starts: SCORE_STARTS, handle: handleScoreAudit },
  "split-brain": { starts: SPLIT_STARTS, handle: handleSplitBrain },
};

/**
 * A shard has to name the run it belongs to before it can be bounded by it. Read
 * from the query string on a GET and the body on a POST, and the body is consumed
 * here - so the request is re-created with a fresh body for the handler rather than
 * left half-read.
 */
async function runIdAndRequest(req: Request, url: URL): Promise<{ runId: string | null; req: Request }> {
  const fromQuery = url.searchParams.get("runId");
  if (req.method !== "POST") return { runId: fromQuery, req };

  const text = await req.text();
  let runId = fromQuery;
  try {
    const parsed = JSON.parse(text) as { runId?: unknown };
    if (typeof parsed?.runId === "string") runId = parsed.runId;
  } catch {
    // A body that is not JSON is the handler's problem to report, not the
    // router's to guess at. It still gets the body verbatim.
  }
  return {
    runId,
    req: new Request(req.url, { method: req.method, headers: req.headers, body: text }),
  };
}

export async function handleDemos(req: Request, env: DemoEnv): Promise<Response> {
  const url = new URL(req.url);
  // /api/demos/<slug>/<action>
  const [, , , slug, action] = url.pathname.split("/");

  const room = ROOMS.find((r) => r.slug === slug);
  const handler = slug ? HANDLERS[slug] : undefined;
  if (!room || !handler) return json({ error: `No demo room called "${slug ?? ""}".` }, 404);
  if (room.status !== "open") {
    return json({ error: `The ${room.name} exhibit is not open. Its source is still linked.` }, 410);
  }
  if (!action) return json({ error: `No action given for ${room.slug}.` }, 404);

  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";

  // One try/catch for all three rooms. A handler that throws produces a 500
  // carrying the real message rather than the platform's blank one - a visitor
  // reading "D1_ERROR: no such table: split_brain_leases" can tell someone useful;
  // a visitor reading "something went wrong" cannot.
  const run = async (): Promise<Response> => {
    if (handler.starts.includes(action)) {
      // The whole run, charged once, before a single row is written.
      const refusal = await reserve(env, "demo", ip, room.requestsPerRun);
      if (refusal) return json({ error: refusal.detail, reason: refusal.reason }, 429);
      return handler.handle(action, req, env);
    }

    const { runId, req: forwarded } = await runIdAndRequest(req, url);
    if (!runId) {
      return json({ error: "This action needs a runId, and none was given. Start a run first." }, 400);
    }
    const refusal = await limitRun(env, runId);
    if (refusal) return json({ error: refusal.detail, reason: refusal.reason }, 429);

    return handler.handle(action, forwarded, env);
  };

  try {
    return await run();
  } catch (e) {
    return json({ error: `${room.name} failed: ${String(e).slice(0, 200)}` }, 500);
  }
}
