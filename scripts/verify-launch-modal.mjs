/* Launch-offer modal verification harness.

   Serves the PRODUCTION build with a stubbed backend (same pattern as
   verify-jobs-landing.mjs) and proves, on a real render:
     1. prerender guard   — no modal markup baked into the static snapshots
     2. timing            — nothing at 3s; modal after the 5s dwell
     3. scroll trigger    — 30% scroll opens it well before the 5s timer
     4. dismiss paths     — x / Maybe later / backdrop / Esc all close, and
                            the modal stays closed after a reload
     5. CTA routing       — signed-out → /register (+ cvp_return_path),
                            signed-in  → /builder?new=1
     6. offer off         — past OFFER_END_ISO the whole launch UI vanishes
     7. screenshots       — light + dark, desktop + mobile

   The build MUST be produced with REACT_APP_LAUNCH_OFFER_ENABLED=true
   (the switch is inlined at build time by CRA).

   Usage: node scripts/verify-launch-modal.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/launch-modal";
const PORT = 4187;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* ── static server over ./build ─────────────────────────────────── */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    // Only ROUTES get the SPA fallback. A missing asset (e.g. the Vercel
    // analytics script, absent from a local build) must 404 — serving it
    // HTML makes the browser parse markup as JS ("Unexpected token '<'").
    if (extname(p)) { res.writeHead(404); res.end(); return; }
    const spa = join("./build", "spa.html");
    file = existsSync(spa) ? spa : join("./build", "index.html");
  }
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, r));

/* ── 1) prerender guard: the snapshots must not contain the modal ── */
const MODAL_MARKERS = ["lom-root", "Start my 14 free days", "14 days,"];
for (const rel of ["index.html", "pricing/index.html", "blog/index.html"]) {
  const f = join("./build", rel);
  if (!existsSync(f)) continue;
  const html = readFileSync(f, "utf8");
  const hit = MODAL_MARKERS.find((m) => html.includes(m));
  check(!hit, `prerender guard: /${rel} has no baked modal markup${hit ? ` (found "${hit}")` : ""}`);
}

/* ── browser + backend stub ─────────────────────────────────────── */
const USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION = {
  access_token: "stub-access-token",
  refresh_token: "stub-refresh-token",
  token_type: "bearer",
  expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "candidate@example.com",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Test Candidate" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

const browser = await chromium.launch();

async function newPage({ width = 1280, height = 900, signedIn = false, theme = "light", fixedTime = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.port === String(PORT)) return route.continue();
    if (SUPA && req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/token") || url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.pathname.includes("/user") ? SESSION.user : SESSION) });
      }
      if (url.pathname.includes("/rest/v1/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort(); // posthog / clarity / fonts / everything external
  });
  await context.addInitScript(([key, session, th, signed]) => {
    localStorage.setItem("cvp_theme", th);
    if (signed) localStorage.setItem(key, JSON.stringify(session));
  }, [`sb-${REF}-auth-token`, SESSION, theme, signedIn]);
  const page = await context.newPage();
  if (fixedTime) await page.clock.setFixedTime(new Date(fixedTime));
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const modal = (page) => page.locator(".lom-root");
const visible = async (page) => (await modal(page).count()) > 0 && (await modal(page).evaluate((el) => el.getAttribute("data-shown") === "true").catch(() => false));

async function scrollTo(page, ratio) {
  await page.evaluate((r) => {
    const doc = document.documentElement;
    window.scrollTo(0, (doc.scrollHeight - window.innerHeight) * r);
  }, ratio);
}

/* ── 2) timing: nothing early, modal after the dwell ─────────────── */
{
  const { context, page } = await newPage({});
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  check(!(await visible(page)), `timing: modal NOT shown at ${Date.now() - t0}ms with no scroll`);
  check((await modal(page).count()) === 0, "timing: modal not even mounted before the trigger");
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 8000 }).catch(() => {});
  const shownAt = Date.now() - t0;
  check(await visible(page), `timing: modal shown after the dwell (${shownAt}ms)`);
  check(shownAt >= 4500, `timing: waited the full ~5s warm-up (${shownAt}ms >= 4500ms)`);
  await page.waitForTimeout(900); // let the entrance settle before capturing
  await page.screenshot({ path: join(OUT, "desktop-light.png") });
  await context.close();
}

/* ── 3) scroll trigger beats the timer ──────────────────────────── */
{
  const { context, page } = await newPage({});
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  check(!(await visible(page)), "scroll trigger: still hidden at 1.2s");
  await scrollTo(page, 0.15);
  await page.waitForTimeout(400);
  check(!(await visible(page)), "scroll trigger: 15% scroll does NOT open it");
  await scrollTo(page, 0.35);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 3000 }).catch(() => {});
  const shownAt = Date.now() - t0;
  check(await visible(page), `scroll trigger: 30%+ scroll opens the modal (${shownAt}ms)`);
  check(shownAt < 4500, `scroll trigger: fired BEFORE the 5s timer (${shownAt}ms < 4500ms)`);
  await context.close();
}

/* ── 4) every dismiss closes, and stays closed on reload ─────────── */
const DISMISSALS = [
  ["x", async (page) => page.locator(".lom-close").click()],
  ["maybe_later", async (page) => page.locator(".lom-maybe").click()],
  ["backdrop", async (page) => page.locator(".lom-scrim").click({ position: { x: 8, y: 8 } })],
  ["esc", async (page) => page.keyboard.press("Escape")],
];
for (const [name, act] of DISMISSALS) {
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await scrollTo(page, 0.4);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 4000 }).catch(() => {});
  check(await visible(page), `dismiss/${name}: modal open before dismissing`);
  await act(page);
  await page.waitForTimeout(600);
  check((await modal(page).count()) === 0, `dismiss/${name}: modal fully unmounted after dismiss`);
  const seen = await page.evaluate(() => localStorage.getItem("cvpassport_launch_modal_seen"));
  check(seen === "1", `dismiss/${name}: show-once flag written`);
  // Reload and wait past BOTH triggers — it must never come back.
  await page.reload({ waitUntil: "domcontentloaded" });
  await scrollTo(page, 0.6);
  await page.waitForTimeout(6500);
  check((await modal(page).count()) === 0, `dismiss/${name}: still closed after reload (timer + scroll)`);
  await context.close();
}

/* ── 5) CTA routing ─────────────────────────────────────────────── */
{
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await scrollTo(page, 0.4);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 4000 }).catch(() => {});
  await page.locator(".lom-cta").click();
  await page.waitForTimeout(900);
  check(new URL(page.url()).pathname === "/register", `CTA signed-out: routes to /register (${new URL(page.url()).pathname})`);
  const ret = await page.evaluate(() => sessionStorage.getItem("cvp_return_path"));
  check(ret === "/builder?new=1", `CTA signed-out: return path stored (${ret})`);
  check((await modal(page).count()) === 0, "CTA signed-out: modal closed on click");
  await context.close();
}
{
  const { context, page } = await newPage({ signedIn: true });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await scrollTo(page, 0.4);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 4000 }).catch(() => {});
  check(await visible(page), "CTA signed-in: modal open");
  await page.locator(".lom-cta").click();
  await page.waitForTimeout(1200);
  const u = new URL(page.url());
  check(u.pathname === "/builder" && u.search === "?new=1", `CTA signed-in: routes to /builder?new=1 (${u.pathname}${u.search})`);
  await context.close();
}

/* ── 6) offer off (past the end date) → nothing renders ─────────── */
{
  const { context, page } = await newPage({ fixedTime: "2026-09-01T10:00:00" });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await scrollTo(page, 0.5);
  await page.waitForTimeout(6500);
  check((await modal(page).count()) === 0, "offer off (past end date): no modal at all");
  const strip = await page.locator('[aria-label="Launch offer"]').count();
  check(strip === 0, "offer off (past end date): no launch strip either");
  await context.close();
}

/* ── 7) looks: dark theme + mobile ──────────────────────────────── */
for (const [label, opts] of [
  ["desktop-dark", { theme: "dark" }],
  ["mobile-light", { width: 393, height: 852 }],
  ["mobile-dark", { width: 393, height: 852, theme: "dark" }],
]) {
  const { context, page } = await newPage(opts);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await scrollTo(page, 0.4);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 4000 }).catch(() => {});
  check(await visible(page), `${label}: modal renders`);
  const box = await modal(page).locator(".lom-card").boundingBox();
  const vw = page.viewportSize().width;
  check(box && box.width <= vw - 24, `${label}: card fits the viewport (${box ? Math.round(box.width) : "?"}px in ${vw}px)`);
  await page.waitForTimeout(900); // let the entrance settle before capturing
  await page.screenshot({ path: join(OUT, `${label}.png`) });
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
