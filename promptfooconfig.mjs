import { readFileSync } from "node:fs";

const ai = JSON.parse(readFileSync(new URL("./ai.config.json", import.meta.url), "utf8"));

// The guide's two tools, same names and shapes as worker/guide-tools.ts.
export const tools = [
  {
    type: "function",
    function: {
      name: "respond",
      description: "Answer the visitor. Give `text` always. Give `section` as well when a section of the page shows the answer, and omit it when none does.",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["hero", "about", "work", "education", "skills", "projects", "contact"] },
          text: { type: "string" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "decline",
      description: "Use this when the question is not about Mark, his work, or this page. Do not guess and do not answer from general knowledge.",
      parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
    },
  },
];

const config = {
  description: "Site guide: answer quality, cost and speed",
  prompts: ["file://evals/guide-prompt.mjs"],
  providers: [
    {
      id: `${ai.provider}:${ai.model}`,
      config: { max_tokens: ai.maxOutputTokens, temperature: 0.3, tools, tool_choice: "required" },
    },
  ],
  defaultTest: {
    assert: [
      { type: "cost", threshold: ai.maxCostUsdPerCall },
      { type: "latency", threshold: ai.maxLatencyMsPerCall },
    ],
  },
  evaluateOptions: { repeat: 3, maxConcurrency: 3 },
  tests: ["file://evals/golden/*.yaml"],
};

export default config;
