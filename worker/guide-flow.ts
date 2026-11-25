import { setup } from "xstate";

// The guide request as the server sees it (worker/index.ts botRefusal, worker/guide.ts handleGuide); change it with them (coverage B18).
export const guideFlow = setup({
  types: { events: {} as { type: "NO_TOKEN" | "BAD_BODY" | "VALID_UNCACHED" | "VALID_CACHED" } },
}).createMachine({
  id: "guide",
  initial: "idle",
  states: {
    idle: { on: { NO_TOKEN: "refused", BAD_BODY: "invalid", VALID_UNCACHED: "degraded", VALID_CACHED: "cached" } },
    refused: { on: { VALID_UNCACHED: "degraded", VALID_CACHED: "cached" } },
    invalid: { type: "final" },
    degraded: { type: "final" },
    cached: { type: "final" },
  },
});
