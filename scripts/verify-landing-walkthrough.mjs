/* Landing product-walkthrough verification — the film in section 3 (#live-demo).
   Asserts: poster + play overlay at rest, muted, preload="none" so the 2.7 MB
   file is NOT fetched until the visitor presses play, controls after play, no
   horizontal overflow, dark-pinned card in both themes, and that the old
   LiveAIDemo simulation is gone while the #live-demo anchor still resolves.
   Usage: node scripts/verify-landing-walkthrough.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "wt-out";
mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".mp4": "video/mp4" };
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/_vercel")) { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); return; }
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = join("./build", p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4201, r));

const results = [];
const log = (n, ok, d = "") => { results.push({ n, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  | " + d : ""}`); };
const browser = await chromium.launch();

for (const [w, h, tag] of [[1440, 900, "desktop"], [393, 852, "mobile"]]) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    const page = await ctx.newPage();
    await page.route(/supabase|posthog|sentry/i, (r) => r.fulfill({ status: 204, body: "" }));
    const bytes = { video: 0, poster: 0 };
    page.on("response", (r) => {
      if (r.url().includes("cvpassport-walkthrough.mp4")) bytes.video += 1;
      if (r.url().includes("walkthrough-poster")) bytes.poster += 1;
    });
    await page.addInitScript((t) => { localStorage.setItem("cvp_theme", t); localStorage.setItem("cvp_cookie_consent", "accepted"); }, theme);
    await page.goto("http://localhost:4201/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.locator("#live-demo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);

    const idle = await page.evaluate(() => {
      const v = document.querySelector(".cvp-pw-video");
      const card = document.querySelector(".cvp-pw-card");
      const ov = document.querySelector(".cvp-pw-poster-overlay");
      const b = v.getBoundingClientRect();
      const cb = card.getBoundingClientRect();
      return {
        exists: !!v, overlay: !!ov, controls: v.hasAttribute("controls"), muted: v.muted,
        preload: v.getAttribute("preload"), poster: !!v.getAttribute("poster"),
        cardTheme: card.getAttribute("data-theme"),
        ratio: +(b.width / b.height).toFixed(2),
        overflowsRight: Math.round(cb.right) > window.innerWidth,
        docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        ctaText: document.querySelector(".cvp-pw-cta")?.textContent.trim(),
      };
    });
    await page.locator(".cvp-pw-card").screenshot({ path: join(OUT, `${tag}-${theme}-01-card.png`) });

    log(`${tag}/${theme}: film idle — poster + overlay, muted, preload=none, no controls, 16:9, no h-overflow`,
      idle.exists && idle.overlay && idle.poster && idle.muted && idle.preload === "none" && !idle.controls &&
      Math.abs(idle.ratio - 1.78) < 0.06 && !idle.overflowsRight && !idle.docOverflow && idle.cardTheme === "dark",
      JSON.stringify(idle));
    log(`${tag}/${theme}: the 2.7 MB film is NOT downloaded before play`, bytes.video === 0 && bytes.poster >= 1,
      `videoRequests=${bytes.video} posterRequests=${bytes.poster}`);

    await page.locator(".cvp-pw-play").click();
    await page.waitForTimeout(2500);
    const playing = await page.evaluate(() => {
      const v = document.querySelector(".cvp-pw-video");
      return { paused: v.paused, t: +v.currentTime.toFixed(2), controls: v.hasAttribute("controls"), overlayGone: !document.querySelector(".cvp-pw-poster-overlay"), muted: v.muted };
    });
    await page.screenshot({ path: join(OUT, `${tag}-${theme}-02-playing.png`) });
    log(`${tag}/${theme}: click plays it, muted, controls appear, poster overlay clears`,
      !playing.paused && playing.t > 0.2 && playing.controls && playing.overlayGone && playing.muted, JSON.stringify(playing));
    log(`${tag}/${theme}: film requested only after the click`, bytes.video >= 1, `videoRequests=${bytes.video}`);
    await ctx.close();
  }
}

// the old simulated demo must be gone
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.route(/supabase|posthog|sentry/i, (r) => r.fulfill({ status: 204, body: "" }));
await page.goto("http://localhost:4201/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const gone = await page.evaluate(() => ({
  oldSection: document.querySelectorAll(".cvp-d-section, .cvp-demo-card, .cvp-d-stage").length,
  anchor: !!document.querySelector("#live-demo"),
  newSection: document.querySelectorAll(".cvp-pw-section").length,
}));
log("old LiveAIDemo simulation is gone, #live-demo anchor still resolves", gone.oldSection === 0 && gone.anchor && gone.newSection === 1, JSON.stringify(gone));
await ctx.close();

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed — screenshots in ${OUT}`);
if (failed.length) { failed.forEach((f) => console.log(`  · ${f.n} | ${f.d}`)); process.exit(1); }
