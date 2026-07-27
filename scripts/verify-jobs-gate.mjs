/* Jobs-board gate verification.

   Proves, on the production build with a stubbed backend:
     1. EVERY Browse Jobs entry point opens the Boarding Soon popup instead
        of navigating: desktop nav item, desktop "Browse all jobs" see-all,
        mobile drawer item, mobile see-all, dashboard tile, landing footer.
     2. The nav subtitle no longer promises live openings.
     3. Every CTA inside the popup works: market radios, prefill chip,
        Save my seat (writes a REAL row with source browse_jobs_popup),
        Back to my CV, and all three dismiss paths (x / backdrop / Esc).
     4. The opted-in state appears ONLY after the row lands; a failed write
        shows an honest error and no seat.
     5. /jobs/:id (the HR apply link) is NOT gated.
     6. browse_jobs_popup_viewed fires on open.

   Usage: node scripts/verify-jobs-gate.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/jobs-gate";
const PORT = 4191;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* A check that cannot run yet. Counts as NEITHER a pass nor a failure —
   it prints loudly and is re-listed in the summary so it stays an obvious
   reminder rather than quietly disappearing into a green run. */
const skipped = [];
const skip = (label) => {
  console.log(`⊘ SKIP: ${label}`);
  skipped.push(label);
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.startsWith("/api/") || p.startsWith("/_vercel")) {
    res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); return;
  }
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
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

const USER_ID = "22222222-2222-4222-8222-222222222222";
const EMAIL = "candidate@example.com";
const SESSION = {
  access_token: "stub", refresh_token: "stub", token_type: "bearer",
  expires_in: 2592000, expires_at: Math.floor(Date.now() / 1000) + 2592000,
  user: {
    id: USER_ID, aud: "authenticated", role: "authenticated", email: EMAIL,
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Obaid Khan" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

const browser = await chromium.launch();
let waitlistWrites = [];
let waitlistShouldFail = false;
const events = [];

async function newPage({ width = 1440, height = 950, signedIn = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.port === String(PORT)) return route.continue();
    if (SUPA && req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/token") || url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.pathname.includes("/user") ? SESSION.user : SESSION) });
      }
      if (url.pathname.includes("/rest/v1/job_board_waitlist")) {
        if (waitlistShouldFail) {
          return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "server exploded", code: "XX000" }) });
        }
        try { waitlistWrites.push(JSON.parse(req.postData() || "{}")); } catch { waitlistWrites.push(null); }
        return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      }
      if (url.pathname.includes("/rest/v1/candidate_events")) {
        try {
          const b = JSON.parse(req.postData() || "{}");
          (Array.isArray(b) ? b : [b]).forEach((e) => events.push(e));
        } catch { /* ignore */ }
        return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      }
      if (url.pathname.includes("/rest/v1/")) {
        const wantsObject = /vnd\.pgrst\.object/.test(req.headers().accept || "");
        let rows = [];
        if (url.pathname.includes("profiles")) rows = [{ id: USER_ID, user_type: "candidate", is_pro: false, full_name: "Obaid Khan", plan: "free" }];
        if (req.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
  await context.addInitScript(([key, session, signed]) => {
    localStorage.setItem("cvp_theme", "light");
    // Keep the launch modal out of the way of the nav clicks.
    localStorage.setItem("cvpassport_launch_modal_seen", "1");
    if (signed) localStorage.setItem(key, JSON.stringify(session));
  }, [`sb-${REF}-auth-token`, SESSION, signedIn]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const popup = (page) => page.locator(".bsm-root");
const EXPLORE_PANEL = "#cvp-desktop-nav-panel-explore";

/* The desktop nav opens its panel on mouseenter of the group and the
   trigger CLICK toggles it closed again — so hover, never click, to open. */
async function openExplore(page) {
  await page.locator(".cvp-desktop-nav-trigger", { hasText: "Explore" }).first().hover();
  await page.waitForSelector(`${EXPLORE_PANEL}`, { timeout: 5000 });
  await page.waitForTimeout(250);
}

/* ── 1) desktop nav item + see-all ───────────────────────────────── */
{
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // The desktop panel opens on HOVER (mouseenter on the group); a click on
  // the trigger toggles it shut again. Hover, then act inside the panel.
  await openExplore(page);
  const panel = page.locator(EXPLORE_PANEL);
  check(await panel.isVisible(), "nav: Explore panel opens on hover");
  const panelText = await panel.innerText();
  check(/India & Gulf · soon/.test(panelText), `nav: Browse Jobs subtitle reads 'India & Gulf · soon' (${JSON.stringify(panelText.slice(0, 160))})`);
  check(!/Live Gulf openings/.test(panelText), "nav: 'Live Gulf openings' is gone");
  check(/NEW/.test(panelText), "nav: NEW badge kept");

  await panel.locator(".cvp-desktop-nav-item", { hasText: "Browse Jobs" }).first().click();
  await page.waitForSelector(".bsm-root", { timeout: 5000 });
  check(true, "entry point: desktop nav item opens the popup");
  check(new URL(page.url()).pathname === "/", `entry point: desktop nav item did NOT navigate (${new URL(page.url()).pathname})`);
  await page.screenshot({ path: join(OUT, "popup-desktop.png") });

  // Esc closes.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check((await popup(page).count()) === 0, "dismiss: Esc closes the popup");

  // See-all "Browse all jobs".
  await openExplore(page);
  await page.locator(`${EXPLORE_PANEL} .cvp-desktop-nav-seeall`).first().click();
  await page.waitForSelector(".bsm-root", { timeout: 5000 });
  check(true, "entry point: desktop 'Browse all jobs' see-all opens the popup");
  check(new URL(page.url()).pathname === "/", "entry point: see-all did NOT navigate");

  // Backdrop closes.
  await page.locator(".bsm-scrim").click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(400);
  check((await popup(page).count()) === 0, "dismiss: backdrop closes the popup");
  await context.close();
}

/* ── 2) mobile drawer ────────────────────────────────────────────── */
{
  const { context, page } = await newPage({ width: 393, height: 852 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i]').first().click();
  await page.waitForTimeout(700);
  // Mobile is a tap-to-expand accordion inside the drawer — no hover.
  const drawer = page.locator('aside, [role="dialog"]').first();
  await drawer.locator("button", { hasText: "Explore" }).first().click();
  await page.waitForTimeout(500);
  await drawer.locator("button, a", { hasText: "Browse Jobs" }).first().click();
  await page.waitForSelector(".bsm-root", { timeout: 5000 });
  check(true, "entry point: mobile drawer item opens the popup");
  check(new URL(page.url()).pathname === "/", "entry point: mobile item did NOT navigate");
  // The gate must survive the drawer closing underneath it.
  await page.waitForTimeout(700);
  check(await popup(page).isVisible(), "mobile: popup survives the drawer unmount");
  const card = await page.locator(".bsm-card").boundingBox();
  check(card && card.width <= 393 - 24, `mobile: popup fits 393px (${card ? Math.round(card.width) : "?"}px)`);
  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  check(docW <= 394, `mobile: no horizontal overflow (${docW})`);
  await page.screenshot({ path: join(OUT, "popup-mobile.png") });

  // x closes.
  await page.locator(".bsm-x").click();
  await page.waitForTimeout(400);
  check((await popup(page).count()) === 0, "dismiss: x closes the popup");
  await context.close();
}

/* ── 3) landing footer link ──────────────────────────────────────── */
{
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const footerBtn = page.locator(".lp-site-footer-link", { hasText: "Browse Jobs" }).first();
  await footerBtn.scrollIntoViewIfNeeded();
  await footerBtn.click();
  await page.waitForSelector(".bsm-root", { timeout: 5000 });
  check(true, "entry point: landing footer link opens the popup");
  check(new URL(page.url()).pathname === "/", "entry point: footer link did NOT navigate");
  await context.close();
}

/* ── 4) dashboard tile — QUARANTINED + repo-wide sweep ────────────
   The tile check used to readFileSync("./src/Dashboard.jsx") and assert
   the Browse Jobs tile routed through the gate. That file was dead code —
   nothing imported it — so the check was passing against a dashboard no
   user could reach. Dashboard v2 (src/pages/DashboardPage.jsx, dashv2-*)
   has no Browse Jobs tile at all: no tile, no browseJobs, no /jobs link,
   because the board is still "coming soon".

   There is therefore nothing live to gate, so the assertion is skipped
   rather than quietly deleted or faked green. Re-arm it against
   DashboardPage.jsx when the tile returns.

   The repo-wide sweep below is unaffected and still runs: no entry point
   anywhere may navigate straight to the board. */
{
  skip('dashboard Browse Jobs tile gate — no tile in v2 (jobs coming soon); re-arm against DashboardPage.jsx when the tile returns');

  // Sweep every source file: the only allowed direct nav to the board is
  // JobPage's "back to the board" from a job detail page.
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!/\.(jsx?|tsx?)$/.test(name)) continue;
      const src = readFileSync(full, "utf8");
      src.split(/\r?\n/).forEach((line, i) => {
        if (/navigate\(["'`]\/jobs["'`]\)|to=["']\/jobs["']/.test(line)) {
          if (full.replace(/\\/g, "/").endsWith("src/pages/JobPage.jsx")) return; // back-link from a job detail
          offenders.push(`${full}:${i + 1}`);
        }
      });
    }
  };
  walk("./src");
  check(offenders.length === 0, `no entry point navigates straight to the board${offenders.length ? ` (${offenders.join(", ")})` : ""}`);
}

/* ── 5) every CTA inside the popup + the real write ──────────────── */
{
  const { context, page } = await newPage({ signedIn: true });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await openExplore(page);
  await page.locator(`${EXPLORE_PANEL} .cvp-desktop-nav-item`, { hasText: "Browse Jobs" }).first().click();
  await page.waitForSelector(".bsm-root", { timeout: 5000 });

  const body = await page.locator(".bsm-card").innerText();
  check(/BOARDING SOON/i.test(body), "popup: Boarding soon eyebrow");
  check(/GATE 01/.test(body), "popup: gate code");
  check(/The CVPassport Job Board/.test(body), "popup: title");
  check(/We’re building it now|We're building it now/.test(body), "popup: body copy");
  check(/Locked until launch/i.test(body), "popup: locked-until-launch label");
  check(/Sample · preview/i.test(body), "popup: sample preview tag");
  check(/One email when the board opens/i.test(body), "popup: privacy line");

  // Market radios all switch.
  for (const m of ["India", "Gulf", "Both"]) {
    await page.locator(".bsm-market", { hasText: m }).click();
    await page.waitForTimeout(150);
    const on = await page.locator(`.bsm-market[aria-checked='true']`).innerText();
    check(new RegExp(m).test(on), `popup CTA: market "${m}" selects (now "${on.trim()}")`);
  }

  // Signed in → email is prefilled from the account.
  const emailVal = await page.locator("#bsm-email").inputValue();
  check(emailVal === EMAIL, `popup: signed-in email prefilled (${emailVal})`);

  // Invalid email is refused, and nothing is written.
  const before = waitlistWrites.length;
  await page.locator("#bsm-email").fill("not-an-email");
  await page.locator(".bsm-cta").click();
  await page.waitForTimeout(500);
  check(await page.locator(".bsm-error").isVisible(), "popup: invalid email shows an error");
  check(waitlistWrites.length === before, "popup: invalid email writes nothing");
  check((await page.locator(".bsm-saved").count()) === 0, "popup: invalid email shows no seat");

  // A failing write must NOT show the seat.
  waitlistShouldFail = true;
  await page.locator("#bsm-email").fill(EMAIL);
  await page.locator(".bsm-market", { hasText: "India" }).click();
  await page.locator(".bsm-cta").click();
  await page.waitForTimeout(900);
  check((await page.locator(".bsm-saved").count()) === 0, "popup: failed write shows NO opted-in state");
  const errText = await page.locator(".bsm-error").innerText();
  check(/did not save/i.test(errText), `popup: failed write shows an honest error ("${errText}")`);

  // Now let it succeed.
  waitlistShouldFail = false;
  waitlistWrites = [];
  await page.locator(".bsm-market", { hasText: "Gulf" }).click();
  await page.locator(".bsm-cta").click();
  await page.waitForSelector(".bsm-saved", { timeout: 6000 });
  check(waitlistWrites.length === 1, `popup: exactly one row written (${waitlistWrites.length})`);
  const row = Array.isArray(waitlistWrites[0]) ? waitlistWrites[0][0] : waitlistWrites[0];
  check(row && row.email === EMAIL, `popup: row email (${row && row.email})`);
  check(row && row.target_market === "gulf", `popup: row market (${row && row.target_market})`);
  check(row && row.source === "browse_jobs_popup", `popup: row source (${row && row.source})`);
  check(row && row.user_id === USER_ID, "popup: row carries the signed-in user id");
  const savedText = await page.locator(".bsm-saved").innerText();
  check(/You’re on the list|You're on the list/.test(savedText), "popup: opted-in state after the write");
  check(/Gulf roles · candidate@example\.com/.test(savedText), `popup: saved meta line ("${savedText.replace(/\n/g, " ")}")`);
  await page.screenshot({ path: join(OUT, "popup-saved.png") });

  // Back to my CV closes.
  await page.locator(".bsm-back").click();
  await page.waitForTimeout(400);
  check((await popup(page).count()) === 0, "popup CTA: 'Back to my CV' closes");

  const viewed = events.filter((e) => e && e.event_type === "browse_jobs_popup_viewed");
  check(viewed.length > 0, `analytics: browse_jobs_popup_viewed fired (${viewed.length})`);
  const joined = events.filter((e) => e && e.event_type === "waitlist_joined");
  const joinedMeta = joined.length ? (joined[joined.length - 1].metadata || {}) : {};
  check(joined.length > 0 && joinedMeta.source === "browse_jobs_popup" && joinedMeta.market === "gulf",
    `analytics: waitlist_joined {market, source} (${JSON.stringify(joinedMeta)})`);
  await context.close();
}

/* ── 6) signed-out prefill chip is absent, manual email works ────── */
{
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await openExplore(page);
  await page.locator(`${EXPLORE_PANEL} .cvp-desktop-nav-item`, { hasText: "Browse Jobs" }).first().click();
  await page.waitForSelector(".bsm-root", { timeout: 5000 });
  check((await page.locator("#bsm-email").inputValue()) === "", "signed out: email starts empty");
  check((await page.locator(".bsm-prefill").count()) === 0, "signed out: no account prefill chip");
  waitlistWrites = [];
  await page.locator("#bsm-email").fill("visitor@example.com");
  await page.locator(".bsm-market", { hasText: "Both" }).click();
  await page.locator(".bsm-cta").click();
  await page.waitForSelector(".bsm-saved", { timeout: 6000 });
  const row = Array.isArray(waitlistWrites[0]) ? waitlistWrites[0][0] : waitlistWrites[0];
  check(row && row.email === "visitor@example.com" && row.target_market === "both" && row.user_id === null,
    `signed out: row written without a user id (${JSON.stringify(row)})`);
  await context.close();
}

/* ── 7) the HR apply link is NOT gated ───────────────────────────── */
{
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/jobs/33333333-3333-4333-8333-333333333333`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  check((await popup(page).count()) === 0, "job detail: /jobs/:id is NOT gated (HR apply links keep working)");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
if (skipped.length) {
  console.log(`${skipped.length} CHECK(S) SKIPPED — not covered, re-arm when possible:`);
  skipped.forEach((s) => console.log(`  ⊘ ${s}`));
}
process.exit(failures === 0 ? 0 : 1);
