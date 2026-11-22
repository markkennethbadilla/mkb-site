import { buildGuidePrompt } from "../src/lib/site-sections.ts";
import { FACTS_BRIEF } from "../src/lib/public-facts.ts";

// The shipping prompt, imported not copied, so the eval cannot drift from production.
export default ({ vars }) => [
  { role: "system", content: buildGuidePrompt(FACTS_BRIEF) },
  { role: "user", content: vars.question },
];
