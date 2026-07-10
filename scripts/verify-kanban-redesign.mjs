/* Pipeline board redesign harness (design 5a). Serves the PRODUCTION
   build with a stubbed backend (same pattern as verify-mobile-polish.mjs):
   - desktop: slim Insights bar (collapsed default, expand persists per
     user), score legend, stage-colored column headers + pills, grips on
     cards, "% match" badges, empty-column drop target
   - phone (viewPref forced to kanban): stage-chip pager, one column at a
     time, Move to button opens the move menu, chip switches stage
   - dash scan on the new surfaces, overflow audit at 360/393/430/1280
   Usage: node scripts/verify-kanban-redesign.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/kanban-redesign";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "IT support L1 Engineer (Dubai onsite)",
  status: "active", posted_at: "2026-06-20T08:00:00Z", created_at: "2026-06-20T08:00:00Z",
  location: "Dubai, UAE", market: "gulf", job_type: "full_time",
  salary_min: 4000, salary_max: 6000, currency: "AED", hr_id: HR_ID,
  company: "Meridian Logistics", department: "IT",
  skills: ["Windows", "Networking"], requirements: ["2+ years helpdesk"],
  description: "First-line support.", screening_questions: [], kind: "active", source: "hr_portal",
};
const APP1 = {
  id: "44444444-4444-4444-8444-444444444444", job_id: JOB.id,
  candidate_id: "22222222-2222-4222-8222-222222222222",
  candidate_name: "Mohammed Al-Balushi", candidate_email: "m@example.com", candidate_phone: "+971585508782",
  cv_snapshot: { skills: ["Windows"] }, cv_file_path: null,
  ats_score: 82, match_keywords: [], missing_keywords: [], score_source: "ai",
  source: "applied", status: "new", recruiter_notes: [],
  applied_at: "2026-06-28T10:30:00Z", viewed_at: null, updated_at: "2026-06-28T10:30:00Z", is_visible_to_hr: true,
};
const APP2 = {
  ...APP1,
  id: "44444444-4444-4444-8444-444444444445",
  candidate_id: "22222222-2222-4222-8222-222222222223",
  candidate_name: "Priya Venkat", ats_score: 62, status: "interviewed", source: "imported",
};
const APP3 = {
  ...APP1,
  id: "44444444-4444-4444-8444-444444444446",
  candidate_id: "22222222-2222-4222-8222-222222222224",
  candidate_name: "Deepak Menon", ats_score: null, score_source: "", status: "shortlisted",
};

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
await new Promise((r) => server.listen(4184, r));

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

function pgrest(url, accept) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("applications")) rows = [APP1, APP2, APP3];
  else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.port === "4184") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
}

async function auditOverflow(page, label) {
  const res = await page.evaluate(() => ({
    vw: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
  }));
  check(res.doc <= res.vw + 1, `${label}: no horizontal overflow (scrollWidth ${res.doc} <= viewport ${res.vw})`);
}

async function dashScan(page, sel, label) {
  const txt = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.textContent : null;
  }, sel);
  if (txt === null) { check(false, `${label}: element ${sel} present for dash scan`); return; }
  check(!/[-–—]/.test(txt), `${label}: no dash characters in "${txt.slice(0, 70)}"`);
}

const browser = await chromium.launch();

async function newPage({ width, forceKanban = false }) {
  const context = await browser.newContext({ viewport: { width, height: 852 }, hasTouch: width < 500 });
  await stubRoutes(context);
  await context.addInitScript(([key, session, viewKey, force]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
    if (force) localStorage.setItem(viewKey, "kanban");
  }, [`sb-${REF}-auth-token`, SESSION, `cvp_pipeline_view_${HR_ID}`, forceKanban]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const URL_ = `http://localhost:4184/employer/jobs/${JOB.id}`;

/* ── 1) Desktop board ─────────────────────────────────────────── */
{
  const { context, page } = await newPage({ width: 1280 });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  check(await page.locator(".jpp-an--slim").count() === 1, "desktop: insights collapsed by default (slim bar)");
  check(await page.locator(".jpp-an__summary").textContent().then((t) => /Applicants\s*3/.test(t || "")), "desktop: slim bar shows Applicants 3");
  check(await page.locator(".jpp-an__toggle-cta", { hasText: "Show details" }).isVisible(), "desktop: Show details cue");
  check(await page.locator(".jpp-an__grid").count() === 0, "desktop: full grid hidden while collapsed");
  await dashScan(page, ".jpp-an__summary", "desktop slim bar");

  check(await page.locator(".jpp-kb-legend").isVisible(), "desktop: score legend visible");
  check((await page.locator(".jpp-kb-legend").textContent()).includes("80 and up, strong"), "desktop: legend uses real 80/50 thresholds");
  await dashScan(page, ".jpp-kb-legend", "desktop legend");

  const topColor = await page.locator(".jpp-kb-col--shortlist").evaluate((el) => getComputedStyle(el).borderTopColor);
  check(topColor === "rgb(59, 130, 246)", `desktop: shortlist column stage-colored top border (${topColor})`);
  check(await page.locator(".jpp-kb-card__grip").count() >= 3, "desktop: grip handle on every card");
  check(await page.locator(".jpp-kb-score", { hasText: "82% match" }).first().isVisible(), "desktop: badge says 82% match");
  check(await page.locator(".jpp-kb-score", { hasText: "No score" }).first().isVisible(), "desktop: unscored badge says No score");
  check(await page.locator(".jpp-kb-empty", { hasText: "No one at Offer yet" }).isVisible(), "desktop: empty column drop target");
  await auditOverflow(page, "desktop board");
  await shot(page, "desktop-board");

  // Expand insights, verify persistence across reload
  await page.locator(".jpp-an__toggle").click();
  await page.waitForTimeout(500);
  check(await page.locator(".jpp-an__grid").isVisible(), "desktop: Show details expands panel in place");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  check(await page.locator(".jpp-an__grid").isVisible(), "desktop: open state persists across reload");
  await page.locator(".jpp-an__toggle").click();
  await page.waitForTimeout(400);
  check(await page.locator(".jpp-an--slim").count() === 1, "desktop: collapses again on Hide details");
  await shot(page, "desktop-insights-open");
  await context.close();
}

/* ── 2) Phone board (view pref forced to kanban) ──────────────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await newPage({ width, forceKanban: true });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  check(await page.locator(".jpp-kbm-chips").isVisible(), `phone ${width}px: stage chip pager renders`);
  check(await page.locator(".jpp-kbm-chip--active", { hasText: "Shortlist" }).isVisible(), `phone ${width}px: Shortlist chip active with count`);
  check(await page.locator(".jpp-kb-card--phone").count() === 2, `phone ${width}px: shortlist cards render (2)`);
  check(await page.locator(".jpp-kb-card__moveto").first().isVisible(), `phone ${width}px: Move to button on cards`);
  await auditOverflow(page, `phone ${width}px board`);

  if (width === 393) {
    await shot(page, `phone-${width}-shortlist`);
    await page.locator(".jpp-kb-card__moveto").first().click();
    await page.waitForTimeout(300);
    check(await page.getByRole("menu", { name: "Move to stage" }).isVisible(), `phone ${width}px: Move to opens the move menu`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.locator(".jpp-kbm-chip", { hasText: "Interviewed" }).click();
    await page.waitForTimeout(400);
    check(await page.locator(".jpp-kb-card--phone", { hasText: "Priya Venkat" }).isVisible(), `phone ${width}px: chip switches to Interviewed column`);
    check(await page.locator(".jpp-kbm-chip--active", { hasText: "Interviewed" }).isVisible(), `phone ${width}px: Interviewed chip goes active`);
    await shot(page, `phone-${width}-interviewed`);
  }
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
