import { chromium } from "@playwright/test";

const URL = process.env.URL || "http://localhost:3000/hr/post";
const OUT = process.env.OUT || "scripts/.screenshots/hr-post.png";
// SCREEN supports: "1", "2", "3", "4", "5", "6"
const SCREEN = String(process.env.SCREEN || "1");

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });

async function continueOnce({ typeJobTitle = false } = {}) {
  if (typeJobTitle) await page.fill("#pj-job-title", "Senior Software Engineer");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(450);
}

const stepBySCREEN = { "1": 1, "2": 2, "3": 3, "4": 3, "5": 3, "6": 3, "7": 4, "8": 5 };
const targetStep = stepBySCREEN[SCREEN] || 1;
for (let s = 1; s < targetStep; s++) {
  await continueOnce({ typeJobTitle: s === 1 });
}

if (SCREEN === "4" || SCREEN === "5") {
  await page.getByRole("button", { name: "Add screening question" }).first().click();
  await page.waitForTimeout(400);
}

if (SCREEN === "5") {
  await page.getByRole("button", { name: /^Background Check/ }).click();
  await page.waitForTimeout(450);
}

if (SCREEN === "8") {
  const boxes = await page.$$(".pj-consent .pj-checkbox__box");
  for (const b of boxes) await b.click();
  await page.waitForTimeout(250);
}

if (SCREEN === "6") {
  await page.getByRole("button", { name: "Add screening question" }).first().click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: /^Background Check/ }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Add screening question" }).first().click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: /^Certifications/ }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(450);
}

await page.waitForTimeout(1100);
await page.screenshot({ path: OUT, fullPage: false });
console.log("Saved:", OUT, "screen:", SCREEN);
await browser.close();
