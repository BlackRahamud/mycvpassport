/* Notifications bell redesign harness (iOS UX). Serves the PRODUCTION
   build with a stubbed backend (verify-mobile-polish pattern):
   - red badge with unread count, gone after Mark all read
   - panel opens; rows render label + Title Cased name, NO dash chars
   - desktop (hover+fine pointer): "…" opens the row MENU, no swipe
     tiles rendered; Delete issues a real DELETE and the row leaves;
     Mute hides the type and the footer offers Unmute
   - touch (coarse pointer): swipe tiles render, NO "…" button; a drag
     reveals compact tiles inset from the panel edge
   Usage: node scripts/verify-notifications-bell.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/notifications-bell";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const NOTIFS = [
  { id: "aaaa1111-0000-4000-8000-000000000001", hr_id: HR_ID, job_id: JOB_ID, candidate_id: null, application_id: null, title: "New applicant — junaid khan", body: "Applied for IT support L1 Engineer — Dubai onsite", type: "new_application", read: false, created_at: "2026-07-10T08:00:00Z" },
  { id: "aaaa1111-0000-4000-8000-000000000002", hr_id: HR_ID, job_id: JOB_ID, candidate_id: null, application_id: null, title: "New applicant — FATIMA AL-BALUSHI", body: null, type: "new_application", read: false, created_at: "2026-07-10T07:00:00Z" },
  { id: "aaaa1111-0000-4000-8000-000000000003", hr_id: HR_ID, job_id: JOB_ID, candidate_id: null, application_id: null, title: "Job closed", body: "IT support L1 Engineer is no longer accepting applications.", type: "job_closed", read: true, created_at: "2026-07-09T10:00:00Z" },
];

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
await new Promise((r) => server.listen(4185, r));

const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh-token", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID, aud: "authenticated", role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Meridian HR" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

let deleteCalled = false;

function pgrest(url, accept) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "r@m.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "r@m.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("hr_notifications")) rows = NOTIFS;
  else if (t("jobs")) rows = [];
  else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.port === "4185") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() === "DELETE" && url.pathname.includes("hr_notifications")) {
          deleteCalled = true;
          return route.fulfill({ status: 204, contentType: "application/json", body: "" });
        }
        if (req.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
}

const browser = await chromium.launch();

/* ═══ Desktop: hover + fine pointer → "…" menu, NO swipe tiles ═══ */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 852 } });
  await stubRoutes(context);
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });

  await page.goto("http://localhost:4185/employer/jobs", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  /* 1. Badge */
  check(await page.locator(".nb-badge").textContent().then((t) => t === "2"), "badge shows unread count 2 (muted-aware)");

  /* 2. Open panel */
  await page.locator("button[aria-label='Notifications (2 unread)']").click();
  await page.waitForTimeout(500);
  check(await page.locator(".nb-pop").isVisible(), "panel opens");
  check(await page.locator(".nb-head__mark", { hasText: "Mark all read" }).isVisible(), "Mark all read stays at top");

  /* 3. Row format: label + Title Cased name, no dashes anywhere */
  const row1 = page.locator(".nb-row").first();
  check(await row1.locator(".nb-item__label").textContent().then((t) => t === "New applicant"), "row label is New applicant");
  check(await row1.locator(".nb-item__title").textContent().then((t) => t === "Junaid Khan"), "name Title Cased: Junaid Khan");
  const row2 = page.locator(".nb-row").nth(1);
  check(await row2.locator(".nb-item__title").textContent().then((t) => t === "Fatima Al-Balushi"), "ALL CAPS + hyphen name normalized: Fatima Al-Balushi");
  const popText = await page.locator(".nb-pop").textContent();
  check(!/[–—]|\s-\s|--/.test(popText), "no dash characters rendered in the panel");
  check(await page.locator(".nb-row__actions").count() === 0, "desktop: NO swipe tiles rendered (menu model only)");
  await page.screenshot({ path: join(OUT, "panel-open.png") });

  /* 4. Hover "…" opens the menu; Delete removes the row via a real DELETE */
  await row1.hover();
  await page.waitForTimeout(200);
  check(await row1.locator(".nb-item__more").isVisible(), "hover reveals the … button");
  await row1.locator(".nb-item__more").click();
  await page.waitForTimeout(300);
  check(await page.locator(".nb-menu").isVisible(), "… opens the row menu");
  check(await page.locator(".nb-menu__item", { hasText: "Mark as read" }).isVisible(), "menu: Mark as read on unread row");
  check(await page.locator(".nb-menu__item", { hasText: "Mute new applicant" }).isVisible(), "menu: Mute names the type");
  await page.screenshot({ path: join(OUT, "row-menu.png") });
  await page.locator(".nb-menu__item--danger", { hasText: "Delete" }).click();
  await page.waitForTimeout(600);
  check(deleteCalled, "Delete issued a real DELETE to hr_notifications");
  check(await page.locator(".nb-menu").count() === 0, "menu closes after an action");
  check(await page.locator(".nb-pop").isVisible(), "panel STAYS open after a menu action");
  check(await page.locator(".nb-row").count() === 2, "deleted row left the list");

  /* 5. Mute hides the type + footer offers Unmute */
  const rowA = page.locator(".nb-row").first();
  await rowA.hover();
  await rowA.locator(".nb-item__more").click();
  await page.waitForTimeout(300);
  await page.locator(".nb-menu__item", { hasText: "Mute" }).click();
  await page.waitForTimeout(500);
  check(await page.locator(".nb-row").count() === 1, "muted type hidden from the list");
  check(await page.locator(".nb-muted").textContent().then((t) => t.includes("New applicant")), "muted footer names the muted type");
  check(await page.locator(".nb-badge").count() === 0, "badge respects mute (0 visible unread)");
  await page.screenshot({ path: join(OUT, "muted.png") });
  await page.locator(".nb-muted button", { hasText: "Unmute" }).click();
  await page.waitForTimeout(400);
  check(await page.locator(".nb-row").count() === 2, "Unmute restores the hidden rows");

  /* 6. Mark all read clears the badge */
  await page.locator(".nb-head__mark").click();
  await page.waitForTimeout(400);
  check(await page.locator(".nb-badge").count() === 0, "badge gone after Mark all read");
  await context.close();
}

/* ═══ Touch: coarse pointer → swipe tiles, NO "…" button ═══ */
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    hasTouch: true,
    isMobile: true,
  });
  await stubRoutes(context);
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });

  await page.goto("http://localhost:4185/employer/jobs", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.locator("button[aria-label='Notifications (2 unread)']").tap();
  await page.waitForTimeout(500);
  check(await page.locator(".nb-pop").isVisible(), "touch: panel opens");
  check(await page.locator(".nb-item__more").count() === 0, "touch: NO … button (swipe model only)");
  check(await page.locator(".nb-row__actions").count() > 0, "touch: swipe tile layer present");

  /* Swipe the first row left with a pointer drag (framer drag responds). */
  const row = page.locator(".nb-row").first();
  const box = await row.boundingBox();
  const cy = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 30, cy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width - 30 - i * 25, cy);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const tiles = row.locator(".nb-tile");
  check(await tiles.count() === 3, "touch: swipe reveals 3 compact tiles on unread row");
  check(await tiles.nth(2).textContent().then((t) => t.includes("Delete")), "touch: Delete tile present");
  const tileBox = await tiles.first().boundingBox();
  check(tileBox && tileBox.height <= box.height - 12, "touch: tiles are row-height, inset from edges");
  await page.screenshot({ path: join(OUT, "touch-swiped.png") });
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
