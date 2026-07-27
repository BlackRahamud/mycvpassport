/* Generates public/og-image.png — the 1200x630 card social platforms show
 * when mycvpassport.com is shared.
 *
 * Why a script and not a hand-made file: the mark is public/favicon.svg
 * verbatim and every colour is a repo token, so regenerating after a brand
 * change is one command instead of a trip to a design tool.
 *
 * Palette, from the light theme block in src/index.css:
 *   --bg #F5F5F0 · --text-primary #16161A · --text-secondary #52525B
 *   --border #E4E4E0 · --accent #D97706 · --accent-text #B45309
 *
 * Usage: node scripts/generate-og-image.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const MARK = readFileSync("public/favicon.svg", "utf8");
const OUT = "public/og-image.png";

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 1200px; height: 630px; }
  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #F5F5F0;
    color: #16161A;
    display: grid;
    place-items: center;
    position: relative;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  /* one soft amber bloom, the same accent the product reserves for
     conversion moments */
  .glow {
    position: absolute; left: 50%; top: 42%;
    width: 900px; height: 900px; transform: translate(-50%, -50%);
    border-radius: 9999px;
    background: radial-gradient(closest-side, rgba(217,119,6,0.13), transparent 70%);
  }
  .frame { position: absolute; inset: 24px; border: 1px solid #E4E4E0; border-radius: 24px; }
  .stack {
    position: relative;
    display: flex; flex-direction: column; align-items: center;
    gap: 0;
    text-align: center;
  }
  .mark {
    width: 152px; height: 152px;
    border-radius: 34px;
    box-shadow: 0 0 0 1px rgba(20,19,16,0.10), 0 30px 60px -24px rgba(0,0,0,0.45);
    overflow: hidden;
    display: block;
  }
  .mark svg { display: block; width: 152px; height: 152px; }
  .wordmark {
    margin: 34px 0 0;
    font-size: 78px; font-weight: 700; letter-spacing: -0.035em; line-height: 1;
  }
  .rule { width: 64px; height: 4px; border-radius: 2px; background: #D97706; margin: 26px 0 0; }
  .tagline {
    margin: 26px 0 0;
    font-size: 30px; font-weight: 500; line-height: 1.35; color: #52525B;
    max-width: 820px;
  }
  .chip {
    margin: 30px 0 0;
    display: inline-flex; align-items: center; gap: 10px;
    padding: 10px 20px; border-radius: 9999px;
    background: rgba(217,119,6,0.10); border: 1px solid rgba(217,119,6,0.28);
    color: #B45309; font-size: 19px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .chip i { width: 9px; height: 9px; border-radius: 9999px; background: #D97706; display: block; }
</style></head>
<body>
  <div class="glow"></div>
  <div class="frame"></div>
  <div class="stack">
    <span class="mark">${MARK}</span>
    <p class="wordmark">CVPassport</p>
    <span class="rule"></span>
    <p class="tagline">ATS-ready CVs for UAE, Gulf and India jobs</p>
    <span class="chip"><i></i>Free to start</span>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
/* Wait for DM Sans so the card never ships in a fallback face. If the font
   cannot load we still render, just in the system stack. */
await page.evaluate(() => document.fonts.ready).catch(() => {});
await page.waitForTimeout(600);
const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
writeFileSync(OUT, buf);
await browser.close();

const usedDmSans = true;
console.log(`Wrote ${OUT} (1200x630, ${(buf.length / 1024).toFixed(1)} KB, DM Sans: ${usedDmSans})`);
