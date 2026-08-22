/**
 * The one fetch wrapper the three rooms share, and the reason there is only one.
 *
 * There used to be three, and they had already drifted. Split-brain's treated a 200
 * carrying an `error` key as a failure, the ledger's did not, and score-audit's
 * inline copy did neither and set component state instead of throwing. A Worker
 * change that started answering 200 with `{ error }` would have fixed one room and
 * silently broken two. This is the strictest of the three, so the rooms can only
 * ever agree.
 *
 * The timeout is the other half. None of the three had one, so a Worker that hung
 * left the run button disabled reading "Firing..." for as long as the tab stayed
 * open, with nothing on screen saying why.
 */

/** Carries the server's own error string, verbatim - never rewritten into
 *  something generic on the way up to the component. */
export class ApiError extends Error {}

/** A room's whole run is seconds of work, so this is a hang, not slowness. */
const TIMEOUT_MS = 15_000;

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // The raw abort reads "signal timed out", which tells a visitor nothing.
    throw new ApiError(
      e instanceof DOMException && e.name === "TimeoutError"
        ? `${path} did not answer within ${TIMEOUT_MS / 1000} seconds.`
        : `${path} could not be reached: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const body: unknown = await res.json().catch(() => null);
  const asRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!res.ok || !asRecord || typeof asRecord.error === "string") {
    throw new ApiError(
      asRecord && typeof asRecord.error === "string"
        ? asRecord.error
        : `Request to ${path} failed with status ${res.status}.`
    );
  }
  return body as T;
}
