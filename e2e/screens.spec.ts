import { expect, ROUTES, test } from "./fixtures";

const SIZES = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

for (const route of ROUTES) {
  for (const size of SIZES) {
    for (const scheme of ["light", "dark"] as const) {
      const name = `${route === "/" ? "home" : route.replaceAll("/", "")}-${size.width}-${scheme}.png`;
      test(`looks as approved ${name}`, async ({ page }) => {
        await page.addInitScript((theme) => localStorage.setItem("theme", theme), scheme);
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(route, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(name, { fullPage: true, maxDiffPixelRatio: 0.01, animations: "disabled" });
      });
    }
  }
}
