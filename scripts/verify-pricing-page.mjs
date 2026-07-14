/* Pricing page verification harness. Serves the PRODUCTION build with
   the stubbed backend pattern shared by the other verify-*.mjs, then:

   - structure: sticky glass header, hero with the agenda glimpse and
     the glass live chip, journey intro, the four clusters in order
     with their glimpses, the plan anchor at the bottom, the talent
     team as one quiet line (never a tier)
   - glass discipline: header, live chip, and companion window wear
     surface-glass; ordinary glimpse cards stay solid
   - the get started sheet: opens from origin off "Post your first
     job", Escape closes, Post a job now lands on /employer/post,
     Import your CVs lands on /employer/import, Talk to us first is
     the WhatsApp anchor; collapse back on close
   - contacts: every WhatsApp href reads HR_SALES (wa.me/971585508782),
     the email line is the real mailto
   - copy: no dash characters, no "CRM", no exclamation marks, no
     ampersands in cluster labels
   - reduced motion: reveals render instantly, the scrim fade is off
   - light and dark at 360 / 393 / 430 / 1280, no horizontal overflow

   Usage: node scripts/verify-pricing-page.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/pricing-page";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const WA_DIGITS = "971585508782";
const SALES_EMAIL = "partnership@mycvpassport.com";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4188, r));

const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh-token",
  token_type: "bearer", expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID, aud: "authenticated", role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Meridian HR" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.port === "4188") return route.continue();
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      }
      if (url.pathname.includes("/auth/v1/token")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      }
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() === "HEAD") {
          return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "*/0", "access-control-expose-headers": "content-range" }, body: "" });
        }
        const wantsObject = /vnd\.pgrst\.object/.test(req.headers().accept || "");
        let rows = [];
        if (url.pathname.includes("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function newPage(browser, { width = 1280, theme = "light", reducedMotion = null } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    timezoneId: "Asia/Dubai",
    ...(reducedMotion ? { reducedMotion } : {}),
  });
  await stubRoutes(context);
  await context.addInitScript(([key, session, th]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
    sessionStorage.setItem("hr_welcome_ring_shown", "1");
  }, [`sb-${REF}-auth-token`, SESSION, theme]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const PAGE_URL = "http://localhost:4188/employer/pricing";

async function openPricing(page) {
  await page.goto(PAGE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
}

/* Scroll the journey end to end so every whileInView reveal fires
   (a fullPage screenshot alone never enters the viewport), then rest
   at the top with the animations settled. */
async function revealAll(page) {
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight - 120);
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

const browser = await chromium.launch();

/* ── 1) Structure and glass discipline, light 1280 ───────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openPricing(page);
  await revealAll(page);

  check(await page.locator(".hpx-h1", { hasText: "Your whole hiring, in one calm portal." }).isVisible(), "hero: outcome headline");
  check(await page.locator(".hpx-eyebrow", { hasText: "Plans" }).first().isVisible(), "hero: Plans eyebrow");
  check((await page.locator(".hpx-cta-note").textContent() || "").includes("Free to start, no card needed"), "hero: microcopy present");

  const headFx = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-head")).backdropFilter);
  check((headFx || "").includes("blur"), `glass: sticky header (${headFx})`);
  const chipFx = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-live-chip")).backdropFilter);
  check((chipFx || "").includes("blur"), "glass: live now chip on the hero glimpse");
  const compFx = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-companion")).backdropFilter);
  check((compFx || "").includes("blur"), "glass: companion window in the interview glimpse");
  const cardFx = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-card")).backdropFilter);
  check(!(cardFx || "").includes("blur"), "glass: ordinary glimpse cards stay solid");

  const brandHidden = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-head__brand")).display);
  check(brandHidden === "none", "header: wordmark yields to the rail brand on desktop (house rule)");
  const talkHref = await page.locator(".hpx-head__talk").getAttribute("href");
  check((talkHref || "").includes(`wa.me/${WA_DIGITS}`), "header: quiet Talk to us reads HR_SALES");

  // Hero glimpse: the interview agenda recreation
  check((await page.locator(".hpx-glimpse").textContent() || "").includes("Faisal Khan"), "glimpse: agenda names the candidate");
  check((await page.locator(".hpx-glimpse").textContent() || "").includes("3:30 PM India"), "glimpse: dual timezone in words");

  check(await page.locator(".hpx-h2", { hasText: "Everything from a job post to a hire, in one flow." }).isVisible(), "journey: intro line");

  const labels = await page.locator(".hpx-cluster__label").allTextContents();
  check(JSON.stringify(labels) === JSON.stringify(["Post and source", "Screen and rank", "Interview", "Reach out and decide"]),
    `clusters: four, in order, sentence case with and (${labels.join(" | ")})`);
  check(await page.locator(".hpx-cluster__badge", { hasText: "the part no one else has" }).isVisible(), "clusters: interview carries its quiet badge");
  check(labels.every((l) => !l.includes("&")), "clusters: no ampersands in labels");

  check((await page.locator(".hpx-import__meter").textContent() || "") === "28 of 30 read", "glimpse: bulk import meter");
  check((await page.locator(".hpx-ring__num").textContent() || "") === "86", "glimpse: score ring number");
  check(await page.locator(".hpx-verdict-pill", { hasText: "Strong match" }).isVisible(), "glimpse: verdict pill");
  check(await page.locator(".hpx-band", { hasText: "Maybe 9" }).isVisible(), "glimpse: strong, maybe, weak counts");
  check((await page.locator(".hpx-companion").textContent() || "").includes("Mark asked"), "glimpse: companion Mark asked");
  check((await page.locator(".hpx-wa-row").textContent() || "").includes("Prefilled, ready to send to Faisal on WhatsApp."), "glimpse: prefilled WhatsApp row");
  check(await page.locator(".hpx-pipe__col").count() === 3, "glimpse: three pipeline columns");

  // Anchor at the bottom
  check(await page.locator(".hpx-anchor__h2", { hasText: "One plan, your whole pipeline." }).isVisible(), "anchor: plan headline");
  const anchorY = await page.locator(".hpx-anchor").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const heroY = await page.locator(".hpx-hero").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  check(anchorY > heroY + 1000, "anchor: sits at the bottom of the journey, not up top");
  const waBtnHref = await page.locator(".hpx-anchor .hpx-btn-quiet").getAttribute("href");
  check((waBtnHref || "").includes(`wa.me/${WA_DIGITS}`), "anchor: WhatsApp secondary reads HR_SALES");
  const mailLink = await page.locator(".hpx-anchor__mail a").getAttribute("href");
  check((mailLink || "").startsWith(`mailto:${SALES_EMAIL}`), "anchor: email path stays available");
  const talent = await page.locator(".hpx-talent").textContent();
  check(/talent team can source and screen candidates/.test(talent || ""), "talent: one quiet line under the CTA");
  check(await page.locator(".hpx-talent a").getAttribute("href").then((h) => (h || "").includes("wa.me")), "talent: links to the human path");

  // Copy discipline over the whole page
  const copy = await page.locator(".hpx-root").textContent();
  check(!/[–—-]/.test(copy || ""), "copy: no dash characters anywhere");
  check(!/\bCRM\b/i.test(copy || ""), "copy: CRM never appears");
  check(!/!/.test(copy || ""), "copy: no exclamation marks");

  // Desktop hero: two columns side by side
  const twoCol = await page.evaluate(() => {
    const copyEl = document.querySelector(".hpx-hero__copy").getBoundingClientRect();
    const glimpse = document.querySelector(".hpx-glimpse").getBoundingClientRect();
    return glimpse.left > copyEl.right - 10;
  });
  check(twoCol, "hero: two columns on desktop");

  // Every reveal actually landed (opacity 1) after one pass down the page
  const hiddenLeft = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".hpx-cluster__copy, .hpx-anchor, .hpx-journey"))
      .filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length);
  check(hiddenLeft === 0, `reveal: nothing stays hidden after the scroll (${hiddenLeft} still hidden)`);
  const clusterCount = await page.locator(".hpx-cluster").count();
  check(clusterCount === 4, `structure: exactly four clusters render (${clusterCount})`);

  await shot(page, "pricing-1280-light");
  await context.close();
}

/* ── 2) The get started sheet ────────────────────────────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openPricing(page);

  await page.locator(".pj-btn--primary", { hasText: "Post your first job" }).first().click();
  await page.waitForTimeout(120);
  check(await page.locator(".hpx-sheet").isVisible(), "sheet: opens from Post your first job");
  const animating = await page.evaluate(() => {
    const el = document.querySelector(".hpx-sheet");
    return el && el.getAnimations ? el.getAnimations().length > 0 : false;
  });
  check(animating, "sheet: open from origin animation runs");
  await page.waitForTimeout(500);
  check(await page.locator(".hpx-opt__title", { hasText: "Post a job now" }).isVisible(), "sheet: post option");
  check(await page.locator(".hpx-opt__title", { hasText: "Import your CVs" }).isVisible(), "sheet: import option");
  check(await page.locator(".hpx-opt__title", { hasText: "Talk to us first" }).isVisible(), "sheet: human option");
  const talkOpt = await page.locator("a.hpx-opt").getAttribute("href");
  check((talkOpt || "").includes(`wa.me/${WA_DIGITS}`), "sheet: Talk to us first is the WhatsApp anchor");
  await shot(page, "sheet-open");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  check(await page.locator(".hpx-sheet").count() === 0, "sheet: Escape collapses it back");

  // Post a job now → the wizard route
  await page.locator(".pj-btn--primary", { hasText: "Post your first job" }).first().click();
  await page.waitForTimeout(500);
  await page.locator(".hpx-opt", { hasText: "Post a job now" }).click();
  await page.waitForURL("**/employer/post", { timeout: 4000 }).catch(() => {});
  check(page.url().includes("/employer/post"), `sheet: Post a job now lands on the wizard (${page.url()})`);
  await context.close();

  // Import your CVs → the import page (fresh context)
  const second = await newPage(browser, { width: 1280 });
  await openPricing(second.page);
  await second.page.locator(".pj-btn--primary", { hasText: "Post your first job" }).first().click();
  await second.page.waitForTimeout(500);
  await second.page.locator(".hpx-opt", { hasText: "Import your CVs" }).click();
  await second.page.waitForURL("**/employer/import", { timeout: 4000 }).catch(() => {});
  check(second.page.url().includes("/employer/import"), `sheet: Import your CVs lands on import (${second.page.url()})`);
  await second.context.close();
}

/* ── 3) Reduced motion ───────────────────────────────────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280, reducedMotion: "reduce" });
  await openPricing(page);
  const heroOpacity = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-h1")).opacity);
  check(heroOpacity === "1", "reduced motion: content renders instantly, no hidden reveals");
  await page.locator(".pj-btn--primary", { hasText: "Post your first job" }).first().click();
  await page.waitForTimeout(250);
  check(await page.locator(".hpx-sheet").isVisible(), "reduced motion: sheet still opens (plain fade)");
  const scrimAnim = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-scrim")).animationName);
  check(scrimAnim === "none", `reduced motion: scrim fade animation off (${scrimAnim})`);
  await context.close();
}

/* ── 4) Widths, light: stacked hero + no overflow ────────────────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await newPage(browser, { width });
  await openPricing(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `mobile ${width}px: no horizontal overflow (${overflow}px)`);
  const stacked = await page.evaluate(() => {
    const copyEl = document.querySelector(".hpx-hero__copy").getBoundingClientRect();
    const glimpse = document.querySelector(".hpx-glimpse").getBoundingClientRect();
    return glimpse.top >= copyEl.bottom - 10;
  });
  check(stacked, `mobile ${width}px: hero stacks to one column`);
  const ctaH = await page.locator(".pj-btn--primary").first().evaluate((el) => el.getBoundingClientRect().height);
  check(ctaH >= 44, `mobile ${width}px: primary CTA keeps a 44px target (${ctaH}px)`);
  const brandShown = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-head__brand")).display);
  check(brandShown !== "none", `mobile ${width}px: header wordmark visible (bottom bar has no brand)`);
  if (width === 393) { await revealAll(page); await shot(page, "pricing-393-light"); }
  await context.close();
}

/* ── 5) Dark theme ───────────────────────────────────────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280, theme: "dark" });
  await openPricing(page);
  await revealAll(page);
  const rootBg = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-root")).backgroundColor);
  check(rootBg === "rgb(20, 19, 32)", `dark: page flips to the dark surface (${rootBg})`);
  const cardBg = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-card")).backgroundColor);
  check(cardBg === "rgb(27, 26, 38)", `dark: glimpse cards flip (${cardBg})`);
  const headBg = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-head")).backgroundColor);
  check(headBg.includes("32, 31, 43"), `dark: glass header flips with the shared token (${headBg})`);
  const ink = await page.evaluate(() => getComputedStyle(document.querySelector(".hpx-h1")).color);
  check(ink === "rgb(242, 242, 247)", `dark: ink flips (${ink})`);
  await shot(page, "pricing-1280-dark");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
