/* Account Sheet verification — the three surfaces from the approved
   Claude Design file "Account Sheet.dc.html".
     1a  mobile account bottom sheet
     1c  mobile "Account & plan" sub-screen
     1b  desktop sidebar popover
   Drives the production build with a stubbed backend and a stubbed
   Supabase session, then asserts every row, every route and every state.

   Usage: node scripts/verify-account-sheet.mjs [outDir] [--paid]
*/
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "acct-out";
mkdirSync(OUT, { recursive: true });

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
await new Promise((r) => server.listen(4207, r));
const BASE = "http://localhost:4207";

const results = [];
const log = (n, ok, d = "") => { results.push({ n, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  | " + d : ""}`); };

const browser = await chromium.launch();

/* A signed-in session, faked at the network layer: the dashboard reads the
   user from supabase auth + the profiles row. */
async function newPage({ width, height, plan = "Free" }) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 });
  const page = await ctx.newPage();
  await page.route(/posthog|sentry|clarity/i, (r) => r.fulfill({ status: 204, body: "" }));
  await page.route(/supabase\.co\/(auth|rest)\/v1\/.*/i, async (route) => {
    const req = route.request();
    const url = req.url();
    const accept = req.headers().accept || "";
    /* PostgREST returns a bare object (not an array) when the client asks
       for one via .single()/.maybeSingle(). Emulating that matters: an
       array back to .single() parse-errors, which silently nulls the
       profile and would make every user look Free. */
    const wantsObject = accept.includes("vnd.pgrst.object");
    const rows = (arr, extraHeaders = {}) => route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": `0-${Math.max(0, arr.length - 1)}/${arr.length}`, ...extraHeaders },
      body: JSON.stringify(wantsObject ? (arr[0] ?? null) : arr),
    });
    if (/\/auth\/v1\/user/.test(url)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ id: "u1", email: "rahamud@gmail.com", user_metadata: { name: "Rahamud K" }, app_metadata: {}, aud: "authenticated" }) });
    }
    if (/\/rest\/v1\/profiles/.test(url)) {
      return rows([{
        id: "u1", email: "rahamud@gmail.com", full_name: "Rahamud K", plan,
        is_pro: plan !== "Free", account_status: "active", suspended_message: null,
        user_type: null, features: {},
        pro_access_expires_at: plan === "Free" ? null : "2099-01-01T00:00:00Z",
        download_credits: 0, cover_letter_credits: 0,
      }]);
    }
    if (/\/rest\/v1\/invoices/.test(url)) return rows([]);
    return rows([]);
  });
  await page.addInitScript(({ p }) => {
    localStorage.setItem("cvp_theme", "light");
    localStorage.setItem("cvp_cookie_consent", "accepted");
    // A session token shaped enough for the client to consider us signed in.
    localStorage.setItem("sb-evihcqpvoorsdmzjnvjz-auth-token", JSON.stringify({
      access_token: "stub", token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "stub",
      user: { id: "u1", email: "rahamud@gmail.com", user_metadata: { name: "Rahamud K" }, app_metadata: {}, aud: "authenticated" },
    }));
    window.__CVP_TEST_PLAN = p;
  }, { p: plan });
  return { ctx, page };
}

/* A hard load of /dashboard bounces to / until the session resolves — the
   route guard renders <Navigate> while `user` is still null. That is
   pre-existing app behaviour, untouched by this work. Real users arrive by
   in-app navigation, so the harness does the same: land on /, let auth
   settle, then use the header avatar menu. */
async function openDashboard(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const width = page.viewportSize()?.width ?? 1440;
  if (width < 768) {
    // phone: hamburger → drawer footer "Go to Dashboard"
    await page.locator('button[aria-label="Open menu"]').first().click();
    await page.waitForTimeout(700);
    await page.locator(".cvp-nav-cta-primary", { hasText: /Go to Dashboard/i }).first().click();
  } else {
    await page.locator('button[aria-label="User menu"]').first().click();
    await page.waitForTimeout(400);
    await page.locator(".lp-avatar-dropdown-item", { hasText: /Go to Dashboard/i }).first().click();
  }
  await page.waitForTimeout(2600);
}

/* ══════════════ 1a + 1c — MOBILE ══════════════ */
{
  const { ctx, page } = await newPage({ width: 393, height: 852 });
  await openDashboard(page);

  const reachedDashboard = await page.locator(".dashv2-bottomnav").count();
  log("mobile: dashboard renders with the bottom tab bar", reachedDashboard === 1, `tabbars=${reachedDashboard}`);

  // The name in the mobile header is a trigger too (design: name tap).
  await page.locator('.dashv2-mv-inner button[aria-label="Account and plan"]').nth(1).click();
  await page.waitForTimeout(600);
  log("1a: tapping the NAME opens the sheet", (await page.locator(".cvp-acct-sheet").count()) === 1);
  await page.locator(".cvp-acct-scrim").click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(500);

  // Account tab opens the SHEET, not the old plan modal.
  await page.locator(".dashv2-bottomnav button", { hasText: "Account" }).first().click();
  await page.waitForTimeout(700);

  const sheet = await page.evaluate(() => {
    const s = document.querySelector(".cvp-acct-sheet");
    if (!s) return null;
    const b = s.getBoundingClientRect();
    const rows = [...s.querySelectorAll(".cvp-acct-row")].map((r) => ({
      title: r.querySelector(".cvp-acct-rowtitle")?.textContent.trim(),
      sub: r.querySelector(".cvp-acct-rowsub")?.textContent.trim(),
      h: Math.round(r.getBoundingClientRect().height),
      tag: r.tagName,
      href: r.getAttribute("href"),
    }));
    const tabs = document.querySelector(".dashv2-bottomnav");
    return {
      rows,
      name: s.querySelector(".cvp-acct-name")?.textContent.trim(),
      badge: s.querySelector(".cvp-acct-badge")?.textContent.trim(),
      email: s.querySelector(".cvp-acct-email")?.textContent.trim(),
      hasClose: !!s.querySelector('button[aria-label="Close"]'),
      signOut: s.querySelector(".cvp-acct-signout")?.textContent.trim(),
      deleteAccount: /delete my account/i.test(s.innerText),
      bottom: Math.round(b.bottom),
      vh: window.innerHeight,
      maxH: Math.round(b.height) <= window.innerHeight - 44 + 1,
      scrim: !!document.querySelector('.cvp-acct-scrim[data-open="true"]'),
      tabsHidden: tabs ? getComputedStyle(tabs).opacity === "0" : null,
      oldModal: /Your Plan/i.test(document.body.innerText),
      bodyLocked: document.body.style.overflow === "hidden",
    };
  });
  await page.screenshot({ path: join(OUT, "m-1a-sheet.png") });

  log("1a: sheet opens from the Account tab (old plan modal gone)",
    !!sheet && sheet.rows.length === 4 && !sheet.oldModal, sheet ? `rows=${sheet.rows.length} oldModal=${sheet.oldModal}` : "no sheet");
  log("1a: rows are Home / My CVs / Account & plan / Help & contact, in order",
    JSON.stringify(sheet.rows.map((r) => r.title)) === JSON.stringify(["Home", "My CVs", "Account & plan", "Help & contact"]),
    JSON.stringify(sheet.rows.map((r) => r.title)));
  log("1a: subtitles match the design copy",
    sheet.rows[0].sub === "mycvpassport.com" && sheet.rows[1].sub === "Your dashboard" &&
    sheet.rows[2].sub === "Free plan · see options" && sheet.rows[3].sub === "support@mycvpassport.com",
    JSON.stringify(sheet.rows.map((r) => r.sub)));
  log("1a: header binds the REAL user, not the design's sample data",
    sheet.name === "Rahamud K" && sheet.email === "rahamud@gmail.com" && sheet.badge === "Free",
    `${sheet.name} / ${sheet.email} / ${sheet.badge}`);
  log("1a: Help row is a real mailto", sheet.rows[3].tag === "A" && sheet.rows[3].href === "mailto:support@mycvpassport.com", sheet.rows[3].href);
  log("1a: every row >= 52px tall", sheet.rows.every((r) => r.h >= 52), JSON.stringify(sheet.rows.map((r) => r.h)));
  log("1a: sheet sits on the bottom edge and caps at 100dvh-44", sheet.bottom === sheet.vh && sheet.maxH, `bottom=${sheet.bottom} vh=${sheet.vh}`);
  log("1a: scrim up, bottom tabs faded out, body scroll locked",
    sheet.scrim && sheet.tabsHidden === true && sheet.bodyLocked, `scrim=${sheet.scrim} tabsHidden=${sheet.tabsHidden} lock=${sheet.bodyLocked}`);
  log("1a: 'Delete my account' is NOT rendered", sheet.deleteAccount === false);
  log("1a: Sign out row present", /sign out/i.test(sheet.signOut || ""), sheet.signOut);

  // ── 1c sub-screen
  await page.locator(".cvp-acct-row", { hasText: "Account & plan" }).first().click();
  await page.waitForTimeout(500);
  const sub = await page.evaluate(() => {
    const s = document.querySelector(".cvp-acct-sheet");
    const txt = s.innerText;
    return {
      title: s.querySelector(".cvp-acct-subtitle")?.textContent.trim(),
      eyebrow: s.querySelector(".cvp-acct-eyebrow")?.textContent.trim(),
      planName: s.querySelector(".cvp-acct-planname")?.textContent.trim(),
      meta: s.querySelector(".cvp-acct-planmeta")?.textContent.trim(),
      checks: [...s.querySelectorAll(".cvp-acct-check")].map((c) => c.textContent.trim()),
      cta: s.querySelector(".cvp-acct-cta")?.textContent.trim(),
      ctaNote: s.querySelector(".cvp-acct-ctanote")?.textContent.trim(),
      links: [...s.querySelectorAll(".cvp-acct-link")].map((l) => l.textContent.trim()),
      paymentsMeta: s.querySelector(".cvp-acct-linkmeta")?.textContent.trim(),
      hasBack: !!s.querySelector('button[aria-label="Back"]'),
      cancelRendered: /cancel subscription/i.test(txt),
      deleteAccount: /delete my account/i.test(txt),
    };
  });
  await page.screenshot({ path: join(OUT, "m-1c-account.png") });

  log("1c: sub-screen header + back arrow", sub.title === "Account & plan" && sub.hasBack, `${sub.title} back=${sub.hasBack}`);
  log("1c: free plan card copy matches the design verbatim",
    sub.eyebrow === "Current plan" && sub.planName === "You’re on the Free plan" &&
    sub.meta === "No card on file. Nothing to cancel — build and download for free, forever.",
    `${sub.planName} | ${sub.meta}`);
  log("1c: the three checklist lines match",
    JSON.stringify(sub.checks) === JSON.stringify(["Every template, build for free", "1 free PDF download", "Basic ATS score, 3 AI rewrites a month"]),
    JSON.stringify(sub.checks));
  log("1c: CTA + caption match", sub.cta === "See plans and passes" && sub.ctaNote === "From AED 19 one time. No subscription, cancel nothing.", `${sub.cta} / ${sub.ctaNote}`);
  log("1c: Payment history + Email support rows, empty state shown",
    sub.links.length === 2 && /Payment history/.test(sub.links[0]) && sub.links[1] === "Email support" && sub.paymentsMeta === "No payments yet",
    `${JSON.stringify(sub.links)} meta=${sub.paymentsMeta}`);
  log("1c FREE: no 'Cancel subscription' rendered at all", sub.cancelRendered === false);
  log("1c: 'Delete my account' is NOT rendered", sub.deleteAccount === false);

  // back arrow returns to 1a
  await page.locator('.cvp-acct-sheet button[aria-label="Back"]').click();
  await page.waitForTimeout(400);
  const backOk = await page.locator(".cvp-acct-row").count();
  log("1c: back arrow returns to the root sheet", backOk === 4, `rows=${backOk}`);

  // scrim closes
  await page.locator(".cvp-acct-scrim").click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(500);
  const closed = await page.evaluate(() => ({
    gone: !document.querySelector(".cvp-acct-sheet"),
    tabs: getComputedStyle(document.querySelector(".dashv2-bottomnav")).opacity,
    lock: document.body.style.overflow,
  }));
  log("1a: scrim tap closes, tabs return, scroll unlocked",
    closed.gone && closed.tabs === "1" && closed.lock !== "hidden", JSON.stringify(closed));

  // routes
  for (const [rowText, expect] of [["Home", "/"], ["My CVs", "/dashboard"]]) {
    await page.locator(".dashv2-bottomnav button", { hasText: "Account" }).first().click();
    await page.waitForTimeout(500);
    await page.locator(".cvp-acct-row", { hasText: rowText }).first().click();
    await page.waitForTimeout(900);
    const path = new URL(page.url()).pathname;
    log(`1a: "${rowText}" navigates to ${expect}`, path === expect, `at ${path}`);
    if (path !== "/dashboard") { await openDashboard(page); }
  }

  // See plans and passes → /pricing
  await page.locator(".dashv2-bottomnav button", { hasText: "Account" }).first().click();
  await page.waitForTimeout(500);
  await page.locator(".cvp-acct-row", { hasText: "Account & plan" }).first().click();
  await page.waitForTimeout(400);
  await page.locator(".cvp-acct-cta").click();
  await page.waitForTimeout(900);
  log("1c: 'See plans and passes' navigates to /pricing", new URL(page.url()).pathname === "/pricing", page.url());

  await ctx.close();
}

/* ══════════════ 1c — PAID USER ══════════════ */
{
  const { ctx, page } = await newPage({ width: 393, height: 852, plan: "Active Hunter" });
  await openDashboard(page);
  await page.locator(".dashv2-bottomnav button", { hasText: "Account" }).first().click();
  await page.waitForTimeout(600);
  const badge = await page.locator(".cvp-acct-badge").textContent().catch(() => "");
  await page.locator(".cvp-acct-row", { hasText: "Account & plan" }).first().click();
  await page.waitForTimeout(500);
  const paid = await page.evaluate(() => {
    const s = document.querySelector(".cvp-acct-sheet");
    return {
      planName: s.querySelector(".cvp-acct-planname")?.textContent.trim(),
      hasCancel: !!s.querySelector(".cvp-acct-cancel"),
      hasFreeCta: !!s.querySelector(".cvp-acct-cta"),
      checks: s.querySelectorAll(".cvp-acct-check").length,
    };
  });
  await page.screenshot({ path: join(OUT, "m-1c-paid.png") });
  log("1c PAID: plan card swaps to the plan name, free checklist + upgrade CTA gone",
    paid.planName === "Pro" && paid.checks === 0 && paid.hasFreeCta === false,
    JSON.stringify(paid));
  log("1c PAID: the EXISTING cancel flow renders here", paid.hasCancel === true);
  log("1a PAID: badge reflects the paid plan (app source: isPro ? Pro : Free)", (badge || "").trim() === "Pro", badge);

  // cancel step 2 keeps the original copy
  await page.locator(".cvp-acct-cancel").click();
  await page.waitForTimeout(400);
  const step2 = await page.evaluate(() => {
    const s = document.querySelector(".cvp-acct-sheet");
    return {
      copy: s.querySelector(".cvp-acct-cancelcopy")?.textContent.trim(),
      keep: s.querySelector(".cvp-acct-keep")?.textContent.trim(),
      yes: s.querySelector(".cvp-acct-yescancel")?.getAttribute("href"),
      note: s.querySelector(".cvp-acct-cancelnote")?.textContent.trim(),
    };
  });
  await page.screenshot({ path: join(OUT, "m-1c-cancel.png") });
  log("1c PAID: cancel step 2 reuses the original copy + mailto unchanged",
    /Are you sure\?/.test(step2.copy) && step2.keep === "Keep my plan" &&
    step2.yes === "mailto:support@mycvpassport.com?subject=Cancel Subscription" &&
    /Cancellation takes effect at end of billing period/.test(step2.note),
    JSON.stringify(step2));
  await ctx.close();
}

/* ══════════════ 1b — DESKTOP POPOVER ══════════════ */
{
  const { ctx, page } = await newPage({ width: 1440, height: 900 });
  await openDashboard(page);

  const before = await page.evaluate(() => {
    const p = document.querySelector(".cvp-acct-pop");
    return { exists: !!p, open: p?.getAttribute("data-open"), pe: p ? getComputedStyle(p).pointerEvents : null };
  });
  log("1b: popover is mounted but closed at rest", before.exists && !before.open && before.pe === "none", JSON.stringify(before));

  await page.locator('.dashv2-sidebar button[aria-haspopup="menu"]').click();
  await page.waitForTimeout(600);
  const pop = await page.evaluate(() => {
    const p = document.querySelector(".cvp-acct-pop");
    const b = p.getBoundingClientRect();
    const aside = document.querySelector(".dashv2-sidebar").getBoundingClientRect();
    return {
      open: p.getAttribute("data-open") === "true",
      rows: [...p.querySelectorAll(".cvp-acct-poprow")].map((r) => r.textContent.trim()),
      name: p.querySelector(".cvp-acct-popname")?.textContent.trim(),
      email: p.querySelector(".cvp-acct-popemail")?.textContent.trim(),
      badge: p.querySelector(".cvp-acct-popbadge")?.textContent.trim(),
      planMeta: p.querySelector(".cvp-acct-popmeta")?.textContent.trim(),
      signOut: !!p.querySelector(".cvp-acct-popsignout"),
      opensUpward: b.bottom < aside.bottom,
      origin: getComputedStyle(p).transformOrigin, h: Math.round(b.height),
      width: Math.round(b.width),
    };
  });
  await page.screenshot({ path: join(OUT, "d-1b-popover.png") });

  /* transform-origin is reported in px: bottom-left == x 0, y == height. */
  const [ox, oy] = String(pop.origin).split(/\s+/).map(parseFloat);
  log("1b: opens upward from the sidebar user row, 296px, bottom-left origin",
    pop.open && pop.opensUpward && pop.width === 296 && ox === 0 && Math.abs(oy - pop.h) < 2,
    `w=${pop.width} h=${pop.h} upward=${pop.opensUpward} origin=${pop.origin}`);
  log("1b: rows are Back to homepage / My CVs / Account & plan / Help & contact",
    JSON.stringify(pop.rows.map((r) => r.replace(/\s*Free$/, "").trim())) ===
      JSON.stringify(["Back to homepage", "My CVs", "Account & plan", "Help & contact"]),
    JSON.stringify(pop.rows));
  log("1b: header + Account&plan label bind the real user and plan",
    pop.name === "Rahamud K" && pop.email === "rahamud@gmail.com" && pop.badge === "Free" && pop.planMeta === "Free",
    `${pop.name}/${pop.email}/${pop.badge}/${pop.planMeta}`);
  log("1b: Sign out present", pop.signOut);

  // Esc closes
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const afterEsc = await page.evaluate(() => document.querySelector(".cvp-acct-pop").getAttribute("data-open"));
  log("1b: Esc closes the popover", afterEsc === null, `data-open=${afterEsc}`);

  // outside click closes
  await page.locator('.dashv2-sidebar button[aria-haspopup="menu"]').click();
  await page.waitForTimeout(400);
  await page.mouse.click(900, 400);
  await page.waitForTimeout(400);
  const afterOutside = await page.evaluate(() => document.querySelector(".cvp-acct-pop").getAttribute("data-open"));
  log("1b: outside click closes the popover", afterOutside === null, `data-open=${afterOutside}`);

  // Account & plan → /account
  await page.locator('.dashv2-sidebar button[aria-haspopup="menu"]').click();
  await page.waitForTimeout(400);
  await page.locator(".cvp-acct-poprow", { hasText: "Account & plan" }).click();
  await page.waitForTimeout(900);
  log("1b: 'Account & plan' navigates to /account", new URL(page.url()).pathname === "/account", page.url());

  /* The design's brief mentions a sidebar "Manage →" link and a separate
     plan row. Dashboard v2 has NEITHER — the plan is a badge inside the
     user card, and the card is the popover trigger. Assert that, so a
     future reintroduction of a stray plan-modal entry point is caught. */
  await openDashboard(page);
  const sidebar = await page.evaluate(() => {
    const aside = document.querySelector(".dashv2-sidebar");
    return {
      manageLink: /Manage\s*→/.test(aside.innerText),
      planTrigger: !!aside.querySelector('button[aria-haspopup="menu"]'),
      badgeText: aside.querySelector('button[aria-haspopup="menu"] span span')?.textContent.trim() ?? null,
    };
  });
  log("sidebar: no stray 'Manage →' plan-modal entry point exists in v2",
    sidebar.manageLink === false && sidebar.planTrigger === true, JSON.stringify(sidebar));

  await openDashboard(page);
  const oldModalGone = await page.evaluate(() => /Manage your CVPassport subscription/i.test(document.body.innerText));
  log("the old plan modal is gone from the dashboard entirely", oldModalGone === false);

  await ctx.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed — screenshots in ${OUT}`);
if (failed.length) { failed.forEach((f) => console.log(`  · ${f.n}`)); process.exit(1); }
