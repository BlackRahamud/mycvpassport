/* Foundation close on /employer/pricing, both markets.
   Serves the PRODUCTION build with a stubbed backend and captures the
   hero price affordance and the closing Foundation card for an AED
   visitor and an INR visitor. Geo is stubbed at the real endpoint the
   app calls, /api/razorpay?action=geo, so the currency is decided the
   same way it will be in production.

   Screenshots are READ by eye.
   Usage: node scripts/verify-foundation-pricing.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const OUT = process.argv[2] || "scripts/.screenshots/foundation";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failures += 1; };

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  const ext = extname(p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (ext) { res.writeHead(404); return res.end(); }
    file = join("./build", "spa.html");
  }
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4199, r));

async function newPage(browser, { currency, country }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    // The geo endpoint MUST be matched before the static-server passthrough
    // below. /api/* is same-origin here, so an earlier port check would
    // hand it to the static server, which serves the SPA shell as HTML,
    // r.json() throws, and usePaymentGeo silently falls back to INR. That
    // made the India run pass for the wrong reason.
    if (url.pathname === "/api/razorpay" && url.searchParams.get("action") === "geo") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ country, currency }) });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (url.port === "4199") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (SUPA && req.url().startsWith(SUPA)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

async function revealAll(page) {
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight - 120);
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

const browser = await chromium.launch();

async function run(label, { currency, country, wantAmount, wantAnchor, wantRegion, notAmount }) {
  const { context, page } = await newPage(browser, { currency, country });
  await page.goto("http://localhost:4199/employer/pricing", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await revealAll(page);

  // Hero affordance
  const line = page.locator(".hpx-priceline");
  await line.scrollIntoViewIfNeeded().catch(() => {});
  const lineText = (await line.innerText().catch(() => "")) || "";
  await line.screenshot({ path: join(OUT, `${label}-1-affordance.png`) }).catch(() => {});

  // The close
  const card = page.locator("#foundation");
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await card.screenshot({ path: join(OUT, `${label}-2-close.png`) });

  const body = await page.locator("#foundation").innerText();

  check(lineText.includes(wantAmount), `${label}: hero affordance shows ${wantAmount}`);
  check(body.includes(wantAmount), `${label}: card price is ${wantAmount}`);
  check(body.includes(wantAnchor), `${label}: struck anchor is ${wantAnchor}`);
  check(body.includes(wantRegion), `${label}: region line says ${wantRegion}`);
  check(!body.includes(notAmount) && !lineText.includes(notAmount), `${label}: the other currency (${notAmount}) appears nowhere`);
  check(body.includes("Start 30 day free trial"), `${label}: trial is the primary CTA`);
  check(!/Pricing is tailored to your team/.test(body), `${label}: the old talk to us close is gone`);

  // The showcase must still be intact above the close.
  const page_text = await page.locator(".hpx-main").innerText();
  check(/Screen and rank/i.test(page_text), `${label}: showcase 02 screen and rank section retained`);
  check(/interview/i.test(page_text), `${label}: showcase 03 interview section retained`);
  check(/pipeline/i.test(page_text), `${label}: showcase 04 pipeline section retained`);

  await context.close();
}

await run("india", { currency: "INR", country: "IN", wantAmount: "₹999", wantAnchor: "₹1,499", wantRegion: "India", notAmount: "AED" });
await run("gulf",  { currency: "AED", country: "AE", wantAmount: "AED 99", wantAnchor: "AED 149", wantRegion: "the Gulf", notAmount: "₹" });

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
console.log(`Screenshots: ${OUT}`);
process.exitCode = failures === 0 ? 0 : 1;
