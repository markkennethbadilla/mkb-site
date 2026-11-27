import { describe, expect, it } from "vitest";
import { judge, type Answers } from "./decide";

const a = (fact: string, fp: number, section: string, sp: number, about: number): Answers => ({
  fact: { choice: fact, probabilities: { [fact]: fp } },
  section: { choice: section, probabilities: { [section]: sp } },
  about: { noul: about },
});

describe("decision step", () => {
  it("answers from the page with the fact text and its section", () => {
    const d = judge(a("education", 0.67, "education", 0.8, 0.9));
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") expect([d.factId, d.section]).toEqual(["education", "education"]);
  });
  it("falls back to the fact's home section when the model names none", () => {
    const d = judge(a("current-role", 0.27, "none", 0.9, 0.92));
    expect(d.kind === "answer" && d.section).toBe("work");
  });
  it("answers in place for a fact no section shows", () => {
    const d = judge(a("pets", 0.42, "none", 0.9, 0.88));
    expect(d.kind === "answer" && d.section).toBe(null);
  });
  it("declines a question that is not about Mark", () => {
    expect(judge(a("none", 0.42, "none", 0.9, 0.05)).kind).toBe("decline");
  });
  it("hands an about-Mark question with no matching fact to the LLM", () => {
    expect(judge(a("none", 1, "none", 1, 0.83)).kind).toBe("llm");
    expect(judge(a("pets", 0.1, "none", 1, 0.83)).kind).toBe("llm");
  });
});
