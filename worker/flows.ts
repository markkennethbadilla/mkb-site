import { setup } from "xstate";

// guide request: worker/index.ts botRefusal and worker/guide.ts handleGuide; change a machine with its handler (coverage B18).
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

// demo room request: worker/demos/router.ts handleDemos; the 410 closed-room branch has no state because every room is open.
export const demoFlow = setup({
  types: { events: {} as { type: "UNKNOWN_ROOM" | "NO_ACTION" | "NO_RUN_ID" | "START_NO_TOKEN" | "START_WITH_TOKEN" } },
}).createMachine({
  id: "demo",
  initial: "idle",
  states: {
    idle: { on: { UNKNOWN_ROOM: "notFound", NO_ACTION: "notFound", NO_RUN_ID: "needsRun", START_NO_TOKEN: "refused", START_WITH_TOKEN: "started" } },
    refused: { on: { START_WITH_TOKEN: "started" } },
    notFound: { type: "final" },
    needsRun: { type: "final" },
    started: { type: "final" },
  },
});

// agent endpoint: worker/index.ts handleAgent; a valid call reaches a paid model, so it has no state here.
export const agentFlow = setup({
  types: { events: {} as { type: "NOT_POST" | "NO_KEY" | "BAD_BODY" } },
}).createMachine({
  id: "agent",
  initial: "idle",
  states: {
    idle: { on: { NOT_POST: "wrongMethod", NO_KEY: "degraded", BAD_BODY: "invalid" } },
    wrongMethod: { on: { BAD_BODY: "invalid" } },
    degraded: { type: "final" },
    invalid: { type: "final" },
  },
});
