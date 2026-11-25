import { expect, it } from "vitest";
import { similarity, tokenise } from "./cache";

// The answered questions the cache holds, and real paraphrases each must retrieve (coverage T23).
const INDEX = [
  "where did he study",
  "what is he working on right now",
  "how do i get in touch with him",
  "what are the demo rooms on this site",
  "which languages and frameworks does he use",
  "does he have any pets",
  "what anime does he like",
  "what is his favourite colour",
  "where does he live",
  "what does he build",
];
const GOLDEN: [string, number][] = [
  ["what school did he go to", 0],
  ["where did he graduate from", 0],
  ["which university did he attend", 0],
  ["what is his current job", 1],
  ["who does he work for now", 1],
  ["how can i contact him", 2],
  ["how do i reach him by email", 2],
  ["can i hire him", 2],
  ["what are the demos on the projects page", 3],
  ["which programming languages does he know", 4],
  ["does he own a cat", 5],
  ["what pets does he have", 5],
  ["which shows does he watch", 6],
  ["what is his favorite color", 7],
  ["which country is he based in", 8],
  ["what has he shipped", 9],
];
const FLOOR = { hit1: 0.9, hit5: 0.9, mrr: 0.9 };

it("retrieval quality: hit@1, hit@5 and MRR hold their floor on the golden set", () => {
  const docs = INDEX.map(tokenise);
  const ranks = GOLDEN.map(([q, want]) => {
    const t = tokenise(q);
    const order = docs.map((d, i) => [i, similarity(t, d)] as const).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return order.findIndex(([i]) => i === want) + 1;
  });
  const hit1 = ranks.filter((r) => r === 1).length / ranks.length;
  const hit5 = ranks.filter((r) => r > 0 && r <= 5).length / ranks.length;
  const mrr = ranks.reduce((s, r) => s + (r ? 1 / r : 0), 0) / ranks.length;
  console.log(`retrieval hit@1=${hit1.toFixed(3)} hit@5=${hit5.toFixed(3)} MRR=${mrr.toFixed(3)} ranks=${ranks.join(",")}`);
  expect(hit1).toBeGreaterThanOrEqual(FLOOR.hit1);
  expect(hit5).toBeGreaterThanOrEqual(FLOOR.hit5);
  expect(mrr).toBeGreaterThanOrEqual(FLOOR.mrr);
});
