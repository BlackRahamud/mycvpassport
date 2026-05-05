import { chromium } from "@playwright/test";

const URL = process.env.URL || "http://localhost:3000/hr/post";
const OUT = process.env.OUT || "scripts/.screenshots/hr-post-screen-1.png";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
// Allow stagger animations to settle
await page.waitForTimeout(1200);
await page.screenshot({ path: OUT, fullPage: false });
console.log("Saved:", OUT);
await browser.close();
