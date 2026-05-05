import { chromium } from "@playwright/test";

const URL = process.env.URL || "http://localhost:3000/hr/post";
const OUT = process.env.OUT || "scripts/.screenshots/hr-post-screen-1.png";
const STEP = Number(process.env.STEP || "1"); // 1, 2, ...

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });

// Drive forward to the requested step.
for (let s = 1; s < STEP; s++) {
  if (s === 1) await page.fill("#pj-job-title", "Senior Software Engineer");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(450);
}

// Allow stagger animations to finish
await page.waitForTimeout(1300);
await page.screenshot({ path: OUT, fullPage: false });
console.log("Saved:", OUT, "step:", STEP);
await browser.close();
