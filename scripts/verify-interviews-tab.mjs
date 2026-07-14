/* Interviews tab verification harness. Serves the PRODUCTION build with
   the same stubbed backend pattern as verify-float-companion.mjs, then:

   - nav: Interviews sits immediately after Candidates with the calendar
     icon, the active state, and the today count badge; the account
     block (UserMenu) stays pinned; the six tab bottom bar fits 360px
   - agenda: sticky glass header (surface-glass), live now banner, Today
     rows with one purple Start, Upcoming grouped by day with Prep and
     Reschedule, Past grouped by job with verdict pills and one quiet
     Compare per multi interview job
   - actions: Start runs the open from origin veil then lands on
     /employer/interview/:id; Prep opens the shipped InterviewKitCard in
     a sheet (Escape closes); Reschedule opens the shipped schedule
     modal prefilled; Compare opens the shipped CompareCandidates fed by
     the persisted ai_verdict
   - reduced motion: Start navigates with no veil, rows enter instantly
   - empty states: quiet mode shows the three dashed one liners with the
     real To interview count; zero mode shows the 1f invitation
   - dark: cvp_theme=dark flips the page tokens and the glass surfaces
   - no dash characters anywhere in page copy; no horizontal overflow at
     360 / 393 / 430 / 1280

   Usage: node scripts/verify-interviews-tab.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/interviews-tab";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_A = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "IT Support Analyst L2", status: "active", hr_id: HR_ID,
  location: "Dubai, UAE", market: "gulf",
  skills: ["Desktop support", "Active Directory"], requirements: [],
  description: "First line support for around 200 users.",
};
const JOB_B = {
  id: "33333333-3333-4333-8333-444444444444",
  title: "Cashier", status: "active", hr_id: HR_ID,
  location: "Dubai, UAE", market: "gulf",
  skills: ["POS"], requirements: [], description: "Front desk and POS.",
};

let appSeq = 0;
function mkApp(name, jobId, score) {
  appSeq += 1;
  return {
    id: `44444444-4444-4444-8444-${String(appSeq).padStart(12, "0")}`,
    job_id: jobId, candidate_id: null,
    candidate_name: name,
    candidate_email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    candidate_phone: "+919812345678",
    cv_snapshot: {
      personal: { location: "Pune, India" },
      skills: ["Desktop support", "Active Directory"],
      experience: [{ title: "Support Engineer", company: "Corridor Retail", start_date: "2022", end_date: "now" }],
    },
    cv_file_path: null, ats_score: score,
    match_keywords: ["Desktop support"], missing_keywords: [],
    ai_verdict: { score, verdict: "solid", two_second_why: ["Match: hands on support.", "Skills fit.", "Gap: notice period."] },
    score_source: "sonnet_verdict", source: "import", status: "interviewed",
    applied_at: "2026-07-01T08:00:00Z",
  };
}

const APP_FAISAL = mkApp("Faisal Khan", JOB_A.id, 78);
const APP_DIVYA = mkApp("Divya Nair", JOB_B.id, 70);
const APP_ROHAN = mkApp("Rohan Mehta", JOB_A.id, 80);
const APP_HAMMAD = mkApp("Hammad Hassan", JOB_A.id, 66);
const APP_PRIYA = mkApp("Priya Sharma", JOB_B.id, 62);
const APP_AYESHA = mkApp("Ayesha Noor", JOB_A.id, 86);
const APP_VIKRAM = mkApp("Vikram Patel", JOB_A.id, 61);
const APP_MARIAM = mkApp("Mariam Ali", JOB_B.id, 45);

const KIT = {
  questions: [
    { id: "q1", category: "technical", question: "Walk me through how you would handle a user who cannot connect to the office VPN.", listen_for: "a calm sequence, checks the basics first", source: "ai" },
    { id: "q2", category: "corridor", question: "This role is in Dubai and your notice period is 2 months. Walk me through your timeline.", listen_for: "a concrete date, visa clarity", source: "ai" },
  ],
  asked: {}, notes: {}, generated_at: "2026-07-13T06:00:00Z",
};

const at = (base, h, m = 0) => {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};
const NOW = new Date();
const daysFrom = (n) => new Date(NOW.getTime() + n * 24 * 3600 * 1000);
// Live ten minutes ago; the second today slot clamps before midnight so
// a late evening harness run keeps both rows inside Today.
const LIVE_AT = new Date(NOW.getTime() - 10 * 60000);
const laterCandidate = new Date(NOW.getTime() + 2 * 3600 * 1000);
const LATER_AT = laterCandidate.getDate() === NOW.getDate() ? laterCandidate : at(NOW, 23, 45);

let ivSeq = 0;
function mkIv(app, job, when, patch = {}) {
  ivSeq += 1;
  return {
    id: `aaaaaaaa-1111-4111-8111-${String(ivSeq).padStart(12, "0")}`,
    application_id: app.id, job_id: job.id, hr_id: HR_ID, candidate_id: null,
    scheduled_at: when.toISOString(), duration_min: 60,
    meeting_link: "https://meet.google.com/kdp-wrvq-abc", note: null,
    status: "scheduled", kit: KIT, rating: null, rating_note: null,
    candidate_tz: "Asia/Kolkata", ics_sequence: 0,
    applications: app,
    jobs: { id: job.id, title: job.title, location: job.location, market: job.market },
    ...patch,
  };
}

const IV_LIVE = mkIv(APP_FAISAL, JOB_A, LIVE_AT);
const IV_LATER = mkIv(APP_DIVYA, JOB_B, LATER_AT);
const IV_UP1 = mkIv(APP_ROHAN, JOB_A, at(daysFrom(1), 11, 0));
const IV_UP2 = mkIv(APP_HAMMAD, JOB_A, at(daysFrom(1), 15, 0));
const IV_UP3 = mkIv(APP_PRIYA, JOB_B, at(daysFrom(2), 10, 0));
const IV_PAST1 = mkIv(APP_AYESHA, JOB_A, at(daysFrom(-2), 11, 0), { status: "completed", rating: "strong_yes", rating_note: "Calm under pressure" });
const IV_PAST2 = mkIv(APP_VIKRAM, JOB_A, at(daysFrom(-3), 14, 0), { status: "completed", rating: "mixed", rating_note: "Weak on AD basics" });
const IV_PAST3 = mkIv(APP_MARIAM, JOB_B, at(daysFrom(-2), 12, 0), { status: "no_show" });

const FULL_IVS = [IV_LIVE, IV_LATER, IV_UP1, IV_UP2, IV_UP3, IV_PAST1, IV_PAST2, IV_PAST3];
const QUIET_IVS = [IV_PAST1, IV_PAST2, IV_PAST3];
const ALL_APPS = [APP_FAISAL, APP_DIVYA, APP_ROHAN, APP_HAMMAD, APP_PRIYA, APP_AYESHA, APP_VIKRAM, APP_MARIAM];

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
await new Promise((r) => server.listen(4187, r));

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

function ivRowsFor(mode) {
  if (mode === "zero") return [];
  if (mode === "quiet") return QUIET_IVS;
  return FULL_IVS;
}

function pgrest(url, accept, mode) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB_A, JOB_B];
  else if (t("interview_question_sets")) rows = [];
  else if (t("interviews")) {
    rows = ivRowsFor(mode);
    const idEq = url.searchParams.get("id");
    if (idEq && idEq.startsWith("eq.")) rows = rows.filter((r) => r.id === idEq.slice(3));
    const appEq = url.searchParams.get("application_id");
    if (appEq && appEq.startsWith("eq.")) rows = rows.filter((r) => r.application_id === appEq.slice(3));
    if ((url.searchParams.get("order") || "").includes("scheduled_at.desc")) {
      rows = [...rows].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    }
    const limit = Number(url.searchParams.get("limit"));
    if (limit) rows = rows.slice(0, limit);
  } else if (t("applications")) {
    rows = ALL_APPS;
    const idEq = url.searchParams.get("id");
    if (idEq && idEq.startsWith("eq.")) rows = rows.filter((r) => r.id === idEq.slice(3));
  }
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

function headCountFor(url, mode) {
  const p = url.pathname;
  const s = url.search || "";
  if (p.includes("/rest/v1/interviews")) {
    if (s.includes("status=eq.scheduled")) return mode === "full" ? 2 : 0; // nav badge query
    return ivRowsFor(mode).length; // everCount probe
  }
  if (p.includes("/rest/v1/applications")) return 3; // To interview count
  return 1;
}

async function stubRoutes(context, captured, mode) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/")) {
      captured.push({ method: req.method(), path: url.pathname, search: url.search, body: req.postData() || "" });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.port === "4187") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      }
      if (url.pathname.includes("/auth/v1/token")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      }
      if (url.pathname.includes("/rest/v1/")) {
        const method = req.method();
        if (method === "HEAD") {
          return route.fulfill({
            status: 200, contentType: "application/json",
            headers: { "content-range": `*/${headCountFor(url, mode)}`, "access-control-expose-headers": "content-range" },
            body: "",
          });
        }
        if (method === "PATCH" || method === "POST" || url.pathname.includes("/rpc/")) {
          captured.push({ method, path: url.pathname, search: url.search, body: req.postData() || "" });
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept, mode) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function newPage(browser, { width = 1280, mode = "full", theme = "light", reducedMotion = null } = {}) {
  const captured = [];
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    timezoneId: "Asia/Dubai",
    ...(reducedMotion ? { reducedMotion } : {}),
  });
  await stubRoutes(context, captured, mode);
  await context.addInitScript(([key, session, th]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
    // The one-shot welcome ring overlay would wash every screenshot.
    sessionStorage.setItem("hr_welcome_ring_shown", "1");
  }, [`sb-${REF}-auth-token`, SESSION, theme]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page, captured };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const PAGE_URL = "http://localhost:4187/employer/interviews";

async function openAgenda(page) {
  await page.goto(PAGE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
}

const browser = await chromium.launch();

/* ── 1) Nav: placement, badge, active state, account block ───────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openAgenda(page);

  const labels = await page.locator(".hrs-navitem__label").allTextContents();
  check(JSON.stringify(labels) === JSON.stringify(["Jobs", "Candidates", "Interviews", "Import", "Post a Job", "Plans"]),
    `nav: Interviews sits immediately after Candidates (${labels.join(" / ")})`);
  const ivItem = page.locator(".hrs-navitem", { hasText: "Interviews" });
  check((await ivItem.getAttribute("class") || "").includes("hrs-navitem--active"), "nav: Interviews carries the active state on its route");
  check(await ivItem.locator("svg rect").count() > 0, "nav: calendar icon present");
  check(await ivItem.locator(".hrs-navitem__badge", { hasText: "2" }).isVisible(), "nav: today count badge shows 2");
  check(await page.locator(".hrs-rail__foot .um-trigger").isVisible(), "nav: account block stays pinned at the rail foot");
  await shot(page, "nav-desktop");
  await context.close();
}

/* ── 2) The agenda, full fixture, light ──────────────────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openAgenda(page);

  check(await page.locator(".ivx-head__title", { hasText: "Interviews" }).isVisible(), "agenda: sticky header title");
  check(/today|coming up/.test(await page.locator(".ivx-head__count").textContent() || ""), "agenda: header count line derives from the same data");
  const headFx = await page.evaluate(() => getComputedStyle(document.querySelector(".ivx-head")).backdropFilter);
  check((headFx || "").includes("blur"), `agenda: header wears surface-glass (${headFx})`);

  check(await page.locator(".ivx-live").isVisible(), "agenda: live now banner present while an interview is live");
  check(/Live now|Starting soon/.test(await page.locator(".ivx-live__who").textContent() || ""), "agenda: banner names the live candidate");
  const liveFx = await page.evaluate(() => getComputedStyle(document.querySelector(".ivx-live")).backdropFilter);
  check((liveFx || "").includes("blur"), "agenda: banner wears surface-glass");
  const cardFx = await page.evaluate(() => getComputedStyle(document.querySelector(".ivx-card")).backdropFilter);
  check(!(cardFx || "").includes("blur"), "agenda: ordinary cards stay solid, no glass");

  check(await page.locator(".ivx-row--today").count() === 2, "today: both rows render");
  check(/Live now|Starting soon/.test(await page.locator(".ivx-row--today").first().locator(".ivx-cell--status").textContent() || ""), "today: live status on the first row");
  const startBtn = page.locator(".ivx-row--today .ivx-btn--start").first();
  const startBg = await startBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
  check(startBg === "rgb(124, 58, 237)", `today: Start is the one purple button (${startBg})`);
  check(/Dubai/.test(await page.locator(".ivx-row--today .ivx-cell--time").first().textContent() || ""), "today: time reads in words, HR side");
  check(/India/.test(await page.locator(".ivx-row--today .ivx-cell--time").first().textContent() || ""), "today: candidate timezone line present");

  check(/Tomorrow, /.test(await page.locator("section[aria-label='Upcoming'] .ivx-grouphead").first().textContent() || ""), "upcoming: first group reads Tomorrow with the date");
  check(await page.locator("section[aria-label='Upcoming'] .ivx-grouphead").count() === 2, "upcoming: grouped by day");
  check(await page.locator(".ivx-row--up").count() === 3, "upcoming: three scheduled rows");
  check(await page.locator(".ivx-row--up .ivx-btn--quiet", { hasText: "Prep" }).count() === 3, "upcoming: Prep on every row");
  check(await page.locator(".ivx-row--up .ivx-btn--quiet", { hasText: "Reschedule" }).count() === 3, "upcoming: Reschedule on every row");

  const pastHeads = await page.locator("section[aria-label='Past'] .ivx-grouphead").allTextContents();
  check(pastHeads.some((h) => /IT Support Analyst L2, 2 this week/.test(h)), `past: grouped by job with the week count (${pastHeads.map((h) => h.trim()).join(" | ")})`);
  check(await page.locator("section[aria-label='Past'] .ivx-btn--quiet", { hasText: "Compare these 2" }).isVisible(), "past: one quiet Compare on the multi interview job");
  check(await page.locator(".ivx-pill", { hasText: "Strong yes" }).isVisible(), "past: strong yes verdict pill");
  check(await page.locator(".ivx-pill", { hasText: "Mixed" }).isVisible(), "past: mixed verdict pill");
  check(await page.locator(".ivx-pill", { hasText: "Did not join" }).isVisible(), "past: no show reads Did not join");
  const cashierHead = await page.locator("section[aria-label='Past'] .ivx-grouphead", { hasText: "Cashier" }).textContent();
  check(!/Compare/.test(cashierHead || ""), "past: single interview job carries no Compare");

  const copy = await page.locator(".ivx-body").textContent();
  check(!/[–—-]/.test(copy || ""), "copy: no dash characters anywhere on the agenda");

  await shot(page, "agenda-1280-light");
  await context.close();
}

/* ── 3) Breakpoints: 360 / 393 / 430 + the six tab bottom bar ────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await newPage(browser, { width });
  await openAgenda(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `mobile ${width}px: no horizontal overflow (${overflow}px)`);
  const railOver = await page.evaluate(() => {
    const rail = document.querySelector(".hrs-rail");
    return rail ? rail.scrollWidth - rail.clientWidth : 0;
  });
  check(railOver <= 1, `mobile ${width}px: six tab bottom bar fits (${railOver}px over)`);
  check(await page.locator(".hrs-navitem__label", { hasText: "Interviews" }).isVisible(), `mobile ${width}px: Interviews tab visible in the bar`);
  const startH = await page.locator(".ivx-row--today .ivx-btn").first().evaluate((el) => el.getBoundingClientRect().height);
  check(startH >= 44, `mobile ${width}px: Start keeps a 44px target (${startH}px)`);
  if (width === 393) await shot(page, "agenda-393-light");
  await context.close();
}

/* ── 4) Actions: Prep, Reschedule, Compare, Start ────────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openAgenda(page);

  // Prep → the shipped InterviewKitCard in a sheet, Escape closes
  await page.locator(".ivx-row--up .ivx-btn--quiet", { hasText: "Prep" }).first().click();
  await page.waitForTimeout(600);
  check(await page.locator(".ivx-sheet").isVisible(), "prep: sheet opens from the row");
  check(/Prep kit, Rohan Mehta/.test(await page.locator(".ivx-sheet__title").textContent() || ""), "prep: sheet names the candidate");
  check(await page.locator(".ivx-sheet .ik-card").count() === 1, "prep: the shipped InterviewKitCard renders inside");
  check((await page.locator(".ivx-sheet").textContent() || "").includes("office VPN"), "prep: stored kit questions load from the interview row");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  check(await page.locator(".ivx-sheet").count() === 0, "prep: Escape collapses the sheet");

  // Reschedule → the shipped schedule modal, prefilled
  await page.locator(".ivx-row--up .ivx-btn--quiet", { hasText: "Reschedule" }).first().click();
  await page.waitForTimeout(600);
  check(await page.locator(".jpp-modal").isVisible(), "reschedule: the shipped schedule modal opens");
  const dateVal = await page.locator(".jpp-modal input[type='date']").inputValue().catch(() => "");
  check(Boolean(dateVal), `reschedule: form arrives prefilled (${dateVal})`);
  await shot(page, "reschedule-prefilled");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check(await page.locator(".jpp-modal").count() === 0, "reschedule: Escape closes the modal");

  // Compare → the shipped CompareCandidates, scores from ai_verdict
  await page.locator(".ivx-btn--quiet", { hasText: "Compare these 2" }).click();
  await page.waitForTimeout(1000);
  check(await page.locator(".cc-panel").isVisible(), "compare: the shipped CompareCandidates opens");
  const names = await page.locator(".cc-who__name").allTextContents();
  check(names.includes("Ayesha Noor") && names.includes("Vikram Patel"), `compare: this week's interviewees fill the columns (${names.join(", ")})`);
  await page.waitForTimeout(800);
  const rings = await page.locator(".cc-ring__num").allTextContents();
  check(rings.includes("86") && rings.includes("61"), `compare: scores come from the persisted ai_verdict (${rings.join(", ")})`);
  await shot(page, "compare-open");
  await page.locator(".cc-x").click();
  await page.waitForTimeout(400);

  // Start → open from origin veil → the live companion route
  await page.locator(".ivx-row--today .ivx-btn--start").first().click();
  await page.waitForTimeout(120);
  check(await page.locator(".ivx-veil").count() === 1, "start: the glass veil expands out of the row");
  await page.waitForURL(`**/employer/interview/${IV_LIVE.id}`, { timeout: 4000 }).catch(() => {});
  check(page.url().includes(`/employer/interview/${IV_LIVE.id}`), `start: lands on the live companion (${page.url()})`);
  await context.close();
}

/* ── 5) Reduced motion: no veil, instant navigation ──────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280, reducedMotion: "reduce" });
  await openAgenda(page);
  await page.locator(".ivx-row--today .ivx-btn--start").first().click();
  await page.waitForTimeout(150);
  check(await page.locator(".ivx-veil").count() === 0, "reduced motion: no veil, no movement");
  check(page.url().includes("/employer/interview/"), "reduced motion: Start still lands on the companion instantly");
  await context.close();
}

/* ── 6) Quiet mode: section empty states with real counts ────────── */
{
  const { context, page } = await newPage(browser, { width: 1280, mode: "quiet" });
  await openAgenda(page);
  check((await page.locator("section[aria-label='Today'] .ivx-empty__line").textContent() || "").includes("Nothing today"), "quiet: Today shows the one line dashed card");
  const upEmpty = await page.locator("section[aria-label='Upcoming'] .ivx-empty__line").textContent();
  check(/3 people are waiting at To interview/.test(upEmpty || ""), `quiet: Upcoming names the real To interview count ("${(upEmpty || "").trim()}")`);
  check(await page.locator(".ivx-empty .ivx-btn--ink", { hasText: "See who is ready to interview" }).isVisible(), "quiet: ready button present");
  check(await page.locator(".ivx-row--past").count() === 3, "quiet: past rows still render");
  check(await page.locator(".hrs-navitem__badge").count() === 0, "quiet: badge hidden at zero remaining");
  await shot(page, "quiet-empties");
  await context.close();
}

/* ── 7) Zero interviews: the whole page as an invitation ─────────── */
{
  const { context, page } = await newPage(browser, { width: 1280, mode: "zero" });
  await openAgenda(page);
  check(await page.locator(".ivx-zero__title", { hasText: "Your interviews will live here" }).isVisible(), "zero: invitation title");
  check(await page.locator(".ivx-zero .ivx-btn--ink", { hasText: "Go to candidates" }).isVisible(), "zero: one action, Go to candidates");
  await page.locator(".ivx-zero .ivx-btn--ink").click();
  await page.waitForTimeout(400);
  check(page.url().includes("/employer/candidates"), "zero: the action lands on Candidates");
  await shot(page, "zero-invitation");
  await context.close();
}

/* ── 8) Dark theme: page tokens and glass flip together ──────────── */
{
  const { context, page } = await newPage(browser, { width: 1280, theme: "dark" });
  await openAgenda(page);
  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  check(theme === "dark", `dark: html carries data-theme=dark (${theme})`);
  const cardBg = await page.evaluate(() => getComputedStyle(document.querySelector(".ivx-card")).backgroundColor);
  check(cardBg === "rgb(32, 31, 43)", `dark: cards flip to the dark surface (${cardBg})`);
  const headBg = await page.evaluate(() => getComputedStyle(document.querySelector(".ivx-head")).backgroundColor);
  check(headBg.includes("32, 31, 43"), `dark: glass header flips with the token (${headBg})`);
  const ink = await page.evaluate(() => getComputedStyle(document.querySelector(".ivx-head__title")).color);
  check(ink === "rgb(242, 242, 247)", `dark: ink flips (${ink})`);
  await shot(page, "agenda-1280-dark");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
