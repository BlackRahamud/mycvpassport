/* Route-guard verification — /dashboard and /account on a COLD load.
 *
 * The bug: `user` is null until the Supabase session resolves, so the
 * guard rendered <Navigate to="/"> and kicked a logged-in user home on a
 * hard refresh. The fix gates on authReady (the flag every other private
 * route already used).
 *
 * Asserts both directions:
 *   signed in  -> hard refresh of /dashboard and /account STAYS put
 *   signed out -> both still redirect to /
 *
 * Usage: node scripts/verify-auth-guard.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/_vercel")) {
    res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); return;
  }
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = join("./build", p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4209, r));
const BASE = "http://localhost:4209";

const results = [];
const log = (n, ok, d = "") => { results.push({ n, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  | " + d : ""}`); };

const browser = await chromium.launch();

async function makePage({ signedIn }) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route(/posthog|sentry|clarity/i, (r) => r.fulfill({ status: 204, body: "" }));
  await page.route(/supabase\.co\/(auth|rest)\/v1\/.*/i, async (route) => {
    const req = route.request();
    const url = req.url();
    const wantsObject = (req.headers().accept || "").includes("vnd.pgrst.object");
    const rows = (arr) => route.fulfill({
      status: 200, contentType: "application/json",
      headers: { "content-range": `0-${Math.max(0, arr.length - 1)}/${arr.length}` },
      body: JSON.stringify(wantsObject ? (arr[0] ?? null) : arr),
    });
    if (/\/auth\/v1\/user/.test(url)) {
      if (!signedIn) return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "invalid claim" }) });
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ id: "u1", email: "rahamud@gmail.com", user_metadata: { name: "Rahamud K" }, app_metadata: {}, aud: "authenticated" }) });
    }
    if (/\/rest\/v1\/profiles/.test(url)) {
      if (!signedIn) return rows([]);
      return rows([{ id: "u1", email: "rahamud@gmail.com", full_name: "Rahamud K", plan: "Free", is_pro: false,
        account_status: "active", suspended_message: null, user_type: null, features: {},
        pro_access_expires_at: null, download_credits: 0, cover_letter_credits: 0 }]);
    }
    return rows([]);
  });
  await page.addInitScript((si) => {
    localStorage.setItem("cvp_theme", "light");
    localStorage.setItem("cvp_cookie_consent", "accepted");
    if (si) {
      localStorage.setItem("sb-evihcqpvoorsdmzjnvjz-auth-token", JSON.stringify({
        access_token: "stub", token_type: "bearer", expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "stub",
        user: { id: "u1", email: "rahamud@gmail.com", user_metadata: { name: "Rahamud K" }, app_metadata: {}, aud: "authenticated" },
      }));
    }
  }, signedIn);
  return { ctx, page };
}

/* ── signed in: a COLD load must stay put ── */
{
  const { ctx, page } = await makePage({ signedIn: true });
  for (const path of ["/dashboard", "/account"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const at = new URL(page.url()).pathname;
    log(`signed in: hard refresh of ${path} stays on ${path}`, at === path, `landed on ${at}`);
  }
  // and the dashboard actually rendered, not just held the URL
  const rendered = await page.evaluate(() => !!document.querySelector(".dashv2-root, .dashv2-bottomnav"));
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const dashRendered = await page.evaluate(() => !!document.querySelector(".dashv2-bottomnav"));
  log("signed in: /dashboard renders the real dashboard after the wait", dashRendered, `accountPageRendered=${rendered}`);
  await ctx.close();
}

/* ── signed out: still redirected home ── */
{
  const { ctx, page } = await makePage({ signedIn: false });
  for (const path of ["/dashboard", "/account", "/account/invoices"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const at = new URL(page.url()).pathname;
    log(`signed out: ${path} still redirects to /`, at === "/", `landed on ${at}`);
  }
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { failed.forEach((f) => console.log(`  · ${f.n}`)); process.exit(1); }
