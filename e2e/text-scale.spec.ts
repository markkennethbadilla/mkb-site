import { expect, ROUTES, test } from "./fixtures";

const WIDTHS = [390, 1280];

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    test(`text at 200% fits at ${width} px ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route, { waitUntil: "load" });
      await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      await page.evaluate(() => document.fonts.ready);

      const problems = await page.evaluate(() => {
        const out: string[] = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > doc.clientWidth + 1) {
          out.push(`page overflows sideways: ${doc.scrollWidth} > ${doc.clientWidth}`);
        }
        const leaves = [...document.querySelectorAll<HTMLElement>("body *")].filter((el) => {
          if (el.children.length || !(el.textContent ?? "").trim()) return false;
          if (["SCRIPT", "STYLE", "TEMPLATE"].includes(el.tagName)) return false;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") return false;
          if (el.closest(".sr-only, [aria-hidden='true']")) return false;
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        });
        for (const el of leaves) {
          const text = (el.textContent ?? "").trim().slice(0, 60);
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") {
            out.push(`clips inside itself (${el.scrollWidth} > ${el.clientWidth}): "${text}"`);
          }
        }
        return out;
      });
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
}
