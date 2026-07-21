/* Foundation checkout, end to end.
   Two halves, both against real code:

   A. UI half, in a browser on the production build. A signed-in
      recruiter opens the upgrade sheet on /employer/pricing and commits.
      We assert the sheet shows the visitor's currency and that the click
      calls the right gateway for that currency, capturing the exact
      request the app makes.

   B. Server half, in node. The real create-ziina-payment handler is
      called with the feature the UI sends, and we assert the signed
      reference it mints is the one the webhook can act on. The webhook
      half (reference -> grant_hr_foundation, and no double grant on
      retry) is already proven by verify-hr-entitlements.mjs.

   Together: button -> gateway -> reference -> entitlement.
   Usage: node scripts/verify-foundation-checkout.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = SUPA ? new URL(SUPA).hostname.split(".")[0] : "stub";
const OUT = process.argv[2] || "scripts/.screenshots/foundation";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) failures += 1;
};

const UID = "77777777-7777-4777-8777-777777777777";
const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "recruiter@meridian.example",
          app_metadata: {}, user_metadata: {}, created_at: "2026-06-01T00:00:00Z" },
};

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
await new Promise((r) => server.listen(4202, r));

console.log("=".repeat(70));
console.log("A. UI HALF — sheet opens, commits to the right gateway");
console.log("=".repeat(70));

const browser = await chromium.launch();

async function uiRun(label, { currency, country, wantAmount, wantGateway }) {
  const seen = { ziina: null, rzpOrder: null };
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    // Geo first: /api/* is same origin, so an earlier port check would
    // hand this to the static server and the app would fall back to INR.
    if (url.pathname === "/api/razorpay" && url.searchParams.get("action") === "geo") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ country, currency }) });
    }
    if (url.pathname === "/api/create-ziina-payment") {
      seen.ziina = JSON.parse(req.postData() || "{}");
      // Return no url so the page does not actually navigate away.
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: null }) });
    }
    if (url.pathname === "/api/razorpay" && url.searchParams.get("action") === "order") {
      seen.rzpOrder = JSON.parse(req.postData() || "{}");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ error: "stubbed, no live order" }) });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (url.port === "4202") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts|razorpay/.test(url.hostname)) return route.abort();
    if (SUPA && req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      }
      if (url.pathname.includes("/auth/v1/token")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.abort();
  });
  await context.addInitScript(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [`sb-${REF}-auth-token`, SESSION]);

  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  await page.goto("http://localhost:4202/employer/pricing", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const buy = page.locator(".hpx-fnd__buy");
  await buy.scrollIntoViewIfNeeded();
  check(await buy.count() > 0, `${label}: signed-in recruiter sees the upgrade entry`);
  await buy.click();
  await page.waitForTimeout(700);

  const sheet = page.locator(".fus-sheet");
  const sheetText = await sheet.innerText();
  await sheet.screenshot({ path: join(OUT, `${label}-3-upgrade-sheet.png`) });

  check(sheetText.includes(wantAmount), `${label}: sheet shows ${wantAmount}`, sheetText.split("\n").slice(0, 6).join(" / "));
  check(sheetText.includes(wantGateway), `${label}: names the gateway, ${wantGateway}`);
  check(/No automatic renewal/i.test(sheetText), `${label}: says no automatic renewal`);
  check(!/card number|cvc|expiry/i.test(sheetText), `${label}: collects no card details`);

  await page.locator(".fus-cta").click();
  await page.waitForTimeout(900);

  if (currency === "AED") {
    check(seen.ziina?.feature === "hrFoundation", `${label}: commit called Ziina with feature hrFoundation`, JSON.stringify(seen.ziina));
    check(seen.rzpOrder === null, `${label}: Razorpay was not called`);
  } else {
    check(seen.rzpOrder?.plan === "foundation", `${label}: commit created a Razorpay order for plan foundation`, JSON.stringify(seen.rzpOrder));
    check(seen.rzpOrder?.amount === undefined, `${label}: client never sends an amount, the server prices it`);
    check(seen.ziina === null, `${label}: Ziina was not called`);
  }
  await context.close();
}

await uiRun("gulf", { currency: "AED", country: "AE", wantAmount: "AED 99", wantGateway: "Ziina" });
await uiRun("india", { currency: "INR", country: "IN", wantAmount: "₹999", wantGateway: "Razorpay" });

await browser.close();
server.close();

console.log(`\n${"=".repeat(70)}`);
console.log("B. SERVER HALF — the reference the webhook will act on");
console.log("=".repeat(70));

// Call the REAL create-ziina-payment handler with what the UI just sent.
process.env.ZIINA_API_TOKEN = "test_token";
const origFetch = globalThis.fetch;
let ziinaBody = null;
globalThis.fetch = async (input, init) => {
  const u = typeof input === "string" ? input : input?.url || "";
  if (u.includes("api-v2.ziina.com")) {
    ziinaBody = JSON.parse(init?.body || "{}");
    return new Response(JSON.stringify({ redirect_url: "https://pay.ziina.test/abc" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return origFetch(input, init);
};

const mint = (await import(pathToFileURL(process.cwd() + "/api/create-ziina-payment.js").href)).default;
const out = { code: null, body: null };
await mint(
  { method: "POST", body: { feature: "hrFoundation", userId: UID } },
  { status(c) { out.code = c; return this; }, json(o) { out.body = o; return this; }, end() { return this; } },
);

const { getServerAmount } = await import(pathToFileURL(process.cwd() + "/src/config/tierConfig.js").href);
check(out.code === 200, "mint: create-ziina-payment accepted hrFoundation", `status ${out.code}`);
check(ziinaBody?.external_reference === `tier:foundation:AED:${UID}`,
  "mint: reference is tier:foundation:AED:<uuid>", ziinaBody?.external_reference);
check(ziinaBody?.amount === getServerAmount("foundation", "AED"),
  "mint: amount is the server price, not client supplied", `${ziinaBody?.amount} fils`);
check(ziinaBody?.currency_code === "AED", "mint: currency is AED");

console.log(`\n${"=".repeat(70)}`);
console.log(failures === 0
  ? "Checkout is wired: button -> gateway -> signed reference the webhook grants on."
  : `${failures} check(s) failed.`);
console.log(`Screenshots: ${OUT}`);
process.exitCode = failures === 0 ? 0 : 1;
