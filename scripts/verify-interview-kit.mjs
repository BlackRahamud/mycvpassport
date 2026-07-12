/* Interview kit verification harness (schedule → stage coupling, flight
   board, live companion, scorecard → stage coupling, no show path, prep
   kit persistence, imported-candidate interview visibility). Serves the
   PRODUCTION build with a stubbed backend (same pattern as
   verify-jobs-landing.mjs), then:

   - flight board on /employer/jobs: populated rows (Kit ready / Kit not
     made yet / Done, rated), Start opens the companion, empty state is
     an invitation with the real To interview count
   - companion at /employer/interview/:id: header, CV peek expand with
     the SAME stored score, question cards with Mark asked + notes that
     PATCH the interviews row, pinned N of M + Finish and rate
   - scorecard: Yes → interview completed + application PATCHed to
     interviewed (no second step); Strong yes → Offer prompt → offered
   - no show: sheet → Pass preselects Did not join → rejected PATCH;
     sheet → Reschedule prefills the shipped schedule form, past time
     blocks, dual timezone reads in words, confirm PATCHes interviews
     AND moves the application to ready ("To interview")
   - prep kit in the pipeline detail: kit loaded from the interview row,
     Add your own question persists, credit note wording, and the
     IMPORTED candidate (candidate_id null) shows an Interviews timeline
   - dash scan on every new surface + overflow audit at 360/393/430/1280

   Usage: node scripts/verify-interview-kit.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/interview-kit";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const APP_ID = "44444444-4444-4444-8444-444444444444";
const IV1_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const IV2_ID = "aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa";
const IV3_ID = "aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa";

const todayAt = (h, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const JOB = {
  id: JOB_ID,
  title: "IT Support Analyst L2",
  status: "active",
  posted_at: "2026-06-20T08:00:00Z",
  created_at: "2026-06-20T08:00:00Z",
  location: "Dubai, UAE",
  market: "gulf",
  job_type: "full_time",
  salary_min: 4000,
  salary_max: 6000,
  currency: "AED",
  hr_id: HR_ID,
  company: "Meridian Logistics",
  department: "IT",
  skills: ["Desktop support", "Active Directory", "Office 365"],
  requirements: [],
  description: "First line support for around 200 users across stores and the head office.",
  screening_questions: [],
};

/* IMPORTED candidate: candidate_id is NULL on purpose — the interview
   timeline must still show interviews (query by application_id). */
const APP = {
  id: APP_ID,
  job_id: JOB_ID,
  candidate_id: null,
  candidate_name: "Rohan Mehta",
  candidate_email: "rohan@example.com",
  candidate_phone: "+919812345678",
  cv_snapshot: {
    personal: { location: "Pune, India", notice_period: "1 month" },
    skills: ["Desktop support", "Active Directory", "Office 365", "Freshdesk"],
    experience: [
      { title: "IT Support Engineer", company: "Corridor Retail", start_date: "2023", end_date: "now", summary: "First line for around 200 store and office users." },
      { title: "Desktop Support", company: "Service Desk Co", start_date: "2020", end_date: "2023", summary: "Enterprise service desk, night shifts covered." },
    ],
  },
  cv_file_path: null,
  ats_score: 80,
  match_keywords: [],
  missing_keywords: [],
  ai_verdict: { score: 80, two_second_why: ["AD and O365 hands on, notice is the only open question.", "Skills fit the role.", "Gap: notice period timing"] },
  score_source: "sonnet_verdict",
  source: "import",
  status: "shortlisted",
  recruiter_notes: null,
  applied_at: "2026-07-01T08:00:00Z",
  viewed_at: null,
  updated_at: "2026-07-10T08:00:00Z",
  is_visible_to_hr: true,
};

const KIT = {
  questions: [
    { id: "q1", category: "technical", question: "A user says Outlook stopped syncing this morning. Walk me through what you would check first.", listen_for: "concrete steps in order, account settings before reinstall, asks what changed", source: "ai" },
    { id: "q2", category: "yours", question: "Our support window runs to 11 PM. Have you worked evening shifts before?", listen_for: "", source: "yours" },
  ],
  asked: {},
  notes: {},
  generated_at: "2026-07-13T06:00:00Z",
};

const IV1 = {
  id: IV1_ID, application_id: APP_ID, job_id: JOB_ID, hr_id: HR_ID, candidate_id: null,
  scheduled_at: todayAt(14, 0), duration_min: 30, meeting_link: "https://meet.google.com/kdp-wrvq-abc",
  note: null, status: "scheduled", kit: KIT, rating: null, rating_note: null,
  candidate_tz: "Asia/Kolkata", ics_sequence: 0,
  applications: { candidate_name: "Rohan Mehta" }, jobs: { title: "IT Support Analyst L2" },
};
const IV2 = {
  id: IV2_ID, application_id: APP_ID, job_id: JOB_ID, hr_id: HR_ID, candidate_id: null,
  scheduled_at: todayAt(15, 0), duration_min: 45, meeting_link: null,
  note: null, status: "scheduled", kit: null, rating: null, rating_note: null,
  candidate_tz: "Asia/Kolkata", ics_sequence: 0,
  applications: { candidate_name: "Faisal Khan" }, jobs: { title: "IT Support Analyst L2" },
};
const IV3 = {
  id: IV3_ID, application_id: APP_ID, job_id: JOB_ID, hr_id: HR_ID, candidate_id: null,
  scheduled_at: todayAt(11, 0), duration_min: 30, meeting_link: null,
  note: null, status: "completed", kit: null, rating: "yes", rating_note: "Solid on tickets.",
  candidate_tz: "Asia/Dubai", ics_sequence: 0,
  applications: { candidate_name: "Ayesha Noor" }, jobs: { title: "Cashier" },
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
  access_token: "stub-access-token",
  refresh_token: "stub-refresh-token",
  token_type: "bearer",
  expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Meridian HR" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

function pgrest(url, accept, mode) {
  const path = url.pathname;
  const search = url.search || "";
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("interview_question_sets")) rows = [];
  else if (t("interviews")) {
    if (search.includes(`id=eq.${IV1_ID}`)) rows = [IV1];
    else if (search.includes(`id=eq.${IV2_ID}`)) rows = [IV2];
    else if (search.includes(`id=eq.${IV3_ID}`)) rows = [IV3];
    else if (search.includes("application_id=eq.")) rows = [IV1];
    else rows = mode.emptyInterviews ? [] : [IV3, IV1, IV2];
  } else if (t("applications")) {
    rows = search.includes(`id=eq.${APP_ID}`) ? [APP] : [APP];
  } else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context, mode, captured) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/")) {
      // Same-origin serverless calls: capture (email sends) and stub.
      captured.push({ method: req.method(), path: url.pathname, search: url.search, body: req.postData() || "" });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.port === "4184") return route.continue();
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
          // Count probes (the flight board's "N waiting at To interview").
          // content-range must be CORS-exposed or supabase-js reads null.
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "content-range": "*/2", "access-control-expose-headers": "content-range" },
            body: "",
          });
        }
        if (method === "PATCH" || method === "POST" || url.pathname.includes("/rpc/")) {
          captured.push({ method, path: url.pathname, search: url.search, body: req.postData() || "" });
          const wantsObject = /vnd\.pgrst\.object/.test(req.headers().accept || "");
          if (url.pathname.includes("/rest/v1/interviews") && method === "POST") {
            return route.fulfill({ status: 201, contentType: "application/json", body: wantsObject ? JSON.stringify({ id: IV1_ID }) : JSON.stringify([{ id: IV1_ID }]) });
          }
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        // applications GETs carry a count header so the flight board's
        // "N waiting at To interview" probe works however supabase-js
        // asks for it (HEAD or GET + Prefer: count=exact).
        const extra = url.pathname.includes("/rest/v1/applications")
          ? { "content-range": "0-1/2", "access-control-expose-headers": "content-range" }
          : {};
        return route.fulfill({ status: 200, contentType: "application/json", headers: extra, body: pgrest(url, req.headers().accept, mode) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) {
      captured.push({ method: req.method(), path: url.pathname, search: url.search, body: req.postData() || "" });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
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

async function newPage({ width, mode = {} }) {
  const captured = [];
  const context = await browser.newContext({ viewport: { width, height: 852 } });
  await stubRoutes(context, mode, captured);
  await context.addInitScript(([key, session, hrId]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
    // Pipeline in list view so the stage tabs are deterministic.
    localStorage.setItem(`cvp_pipeline_view_${hrId}`, "list");
  }, [`sb-${REF}-auth-token`, SESSION, HR_ID]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page, captured };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const WIDTHS = [360, 393, 430, 1280];
const capturedHas = (captured, { method, path, bodyRe }) =>
  captured.some((c) => c.method === method && c.path.includes(path) && (!bodyRe || bodyRe.test(c.body)));

/* ── 1) Flight board, populated ───────────────────────────────── */
for (const width of WIDTHS) {
  const { context, page } = await newPage({ width });
  await page.goto("http://localhost:4184/employer/jobs", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  check(await page.locator(".itb-card").isVisible(), `flight ${width}px: board renders`);
  check(await page.locator(".itb-head__title", { hasText: "Interviews today" }).isVisible(), `flight ${width}px: title`);
  check(await page.getByText("Kit ready").filter({ visible: true }).count() > 0, `flight ${width}px: Kit ready status`);
  check(await page.getByText("Kit not made yet").filter({ visible: true }).count() > 0, `flight ${width}px: Kit not made yet status`);
  check(await page.getByText("Done, rated Yes").filter({ visible: true }).count() > 0, `flight ${width}px: finished row rated`);
  check(await page.locator(".itb-start").count() === 2, `flight ${width}px: two Start buttons`);
  check(await page.locator(".itb-notes").count() === 1, `flight ${width}px: finished row flips to Notes`);
  await dashScan(page, ".itb-head", `flight ${width}px header`);
  await auditOverflow(page, `flight ${width}px`);
  await shot(page, `flight-${width}`);
  if (width === 393) {
    await page.locator(".itb-start").first().click();
    await page.waitForTimeout(900);
    check(page.url().includes(`/employer/interview/${IV1_ID}`), `flight ${width}px: Start opens the companion (${page.url()})`);
    check(await page.locator(".ic-head__name", { hasText: "Rohan Mehta" }).isVisible(), `flight ${width}px: companion loads from Start, one click`);
  }
  await context.close();
}

/* ── 2) Flight board, empty as an invitation ──────────────────── */
for (const width of [393, 1280]) {
  const { context, page } = await newPage({ width, mode: { emptyInterviews: true } });
  await page.goto("http://localhost:4184/employer/jobs", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  check(await page.locator(".itb-empty__title", { hasText: "No interviews today" }).isVisible(), `empty ${width}px: invitation title`);
  const sub = await page.locator(".itb-empty__sub").textContent().catch(() => null);
  check(/You have 2 people waiting at To interview/.test(sub || ""), `empty ${width}px: real waiting count ("${(sub || "").slice(0, 60)}")`);
  await dashScan(page, ".itb-empty", `empty ${width}px card`);
  await shot(page, `flight-empty-${width}`);
  await page.locator(".itb-empty__cta").click();
  await page.waitForTimeout(600);
  check(page.url().includes("/employer/candidates"), `empty ${width}px: CTA goes to the people waiting (${page.url()})`);
  await context.close();
}

/* ── 3) Companion, Layout B ───────────────────────────────────── */
for (const width of WIDTHS) {
  const { context, page, captured } = await newPage({ width });
  await page.goto(`http://localhost:4184/employer/interview/${IV1_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  check(await page.locator(".ic-head__name", { hasText: "Rohan Mehta" }).isVisible(), `companion ${width}px: header name`);
  const headSub = await page.locator(".ic-head__sub").textContent().catch(() => null);
  check(/IT Support Analyst L2/.test(headSub || "") && /30 min/.test(headSub || ""), `companion ${width}px: job, time, duration in header`);
  check(await page.locator(".ic-noshow-btn", { hasText: "Candidate did not join" }).isVisible(), `companion ${width}px: no show button one tap away`);
  const peek = await page.locator(".ic-peek__line").textContent().catch(() => null);
  check(/CV at a glance/.test(peek || "") && /Pune/.test(peek || ""), `companion ${width}px: CV peek line ("${(peek || "").slice(0, 60)}")`);
  check(await page.locator(".ic-q").count() === 2, `companion ${width}px: both questions render`);
  check(await page.locator(".ic-chip--yours", { hasText: "Your question" }).isVisible(), `companion ${width}px: her question keeps the purple chip`);
  check(await page.locator(".ic-q__listen").first().isVisible(), `companion ${width}px: listen for note on the AI question`);
  check(await page.getByText("0 of 2 asked").isVisible(), `companion ${width}px: pinned progress`);
  check(await page.locator(".ic-pin__finish", { hasText: "Finish and rate" }).isVisible(), `companion ${width}px: Finish and rate pinned`);
  await dashScan(page, ".ic-score", `companion ${width}px scorecard copy`);
  await auditOverflow(page, `companion ${width}px`);
  await shot(page, `companion-${width}`);

  if (width === 393) {
    // CV peek expands in place with the SAME stored score (never rerolled).
    await page.locator(".ic-peek__bar").click();
    await page.waitForTimeout(400);
    check(await page.locator(".ic-cv__score", { hasText: "80/100" }).isVisible(), `companion ${width}px: expanded peek shows the stored 80/100 badge`);
    await shot(page, `companion-peek-${width}`);
    await page.locator(".ic-peek__bar").click();
    await page.waitForTimeout(300);

    // Mark asked persists to the interview row and advances the count.
    await page.locator(".ic-asked").first().click();
    await page.waitForTimeout(400);
    check(await page.getByText("1 of 2 asked").isVisible(), `companion ${width}px: asked count advances`);
    check(await page.locator(".ic-asked--on", { hasText: "Asked" }).first().isVisible(), `companion ${width}px: asked card flips`);
    check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"asked"\s*:\s*\{\s*"q1"\s*:\s*true/ }), `companion ${width}px: mark asked PATCHes the interview row`);

    // A quick note persists too (debounced).
    await page.locator(".ic-q__note").first().fill("Knew the buyout rules cold.");
    await page.waitForTimeout(1100);
    check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /Knew the buyout rules cold/ }), `companion ${width}px: per question note PATCHes the interview row`);
  }
  await context.close();
}

/* ── 4) Scorecard → stage coupling (Yes stays, no second step) ── */
{
  const { context, page, captured } = await newPage({ width: 1280 });
  await page.goto(`http://localhost:4184/employer/interview/${IV1_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.locator(".ic-pin__finish").click();
  await page.waitForTimeout(400);
  await page.locator(".ic-rate").nth(1).click(); // Yes
  await page.locator(".ic-score__note").fill("Solid on tickets and AD. Notice period is the only worry.");
  await page.locator(".ic-score__save").click();
  await page.waitForTimeout(900);
  check(await page.locator(".ic-done__title", { hasText: "stays at Interviewed" }).isVisible(), "scorecard Yes: toast sized card, released back to her day");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"rating"\s*:\s*"yes"/ }), "scorecard Yes: rating + note saved on the interview");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"status"\s*:\s*"completed"/ }), "scorecard Yes: interview flips to completed");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/applications", bodyRe: /"status"\s*:\s*"interviewed"/ }), "scorecard Yes: application moved to Interviewed WITHOUT a second step");
  await dashScan(page, ".ic-done", "scorecard Yes done card");
  await shot(page, "scorecard-yes-done-1280");
  await context.close();
}

/* ── 5) Strong yes → Offer prompt → offered ───────────────────── */
{
  const { context, page, captured } = await newPage({ width: 1280 });
  await page.goto(`http://localhost:4184/employer/interview/${IV1_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.locator(".ic-rate").nth(0).click(); // Strong yes
  await page.locator(".ic-score__save").click();
  await page.waitForTimeout(900);
  check(await page.locator(".ic-offer__title", { hasText: "Move Rohan to Offer?" }).isVisible(), "strong yes: Offer prompt appears (rating already saved)");
  await shot(page, "offer-prompt-1280");
  await page.locator(".ic-offer__go").click();
  await page.waitForTimeout(700);
  check(await page.locator(".ic-done__title", { hasText: "Moved to Offer" }).isVisible(), "strong yes: done card confirms the move");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/applications", bodyRe: /"status"\s*:\s*"offered"/ }), "strong yes: application PATCHed to offered in one tap");
  await context.close();
}

/* ── 6) No show: sheet, pass with Did not join, reschedule ────── */
{
  const { context, page, captured } = await newPage({ width: 393 });
  await page.goto(`http://localhost:4184/employer/interview/${IV1_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.locator(".ic-noshow-btn").click();
  await page.waitForTimeout(400);
  check(await page.locator(".ic-sheet__title", { hasText: "Rohan did not join" }).isVisible(), "no show 393px: sheet opens from the header");
  check(await page.getByText("Nothing you did wrong").isVisible(), "no show 393px: normalising copy");
  await dashScan(page, ".ic-sheet", "no show 393px sheet");
  await shot(page, "noshow-sheet-393");
  await page.locator(".ic-sheet__back").click();
  await page.waitForTimeout(300);
  check(await page.locator(".ic-sheet").count() === 0, "no show 393px: Go back returns to waiting");

  // Pass path: Did not join preselected in the shipped reject modal.
  await page.locator(".ic-noshow-btn").click();
  await page.waitForTimeout(400);
  await page.locator(".ic-sheet__opt", { hasText: "Pass on this candidate" }).click();
  await page.waitForTimeout(400);
  check(await page.locator(".rjm-modal").isVisible(), "no show 393px: the SHIPPED reject modal opens");
  check(await page.locator(".rjm-reason--active", { hasText: "Did not join" }).isVisible(), "no show 393px: Did not join preselected");
  await shot(page, "noshow-reject-393");
  await page.locator(".rjm-btn--danger").click();
  await page.waitForTimeout(800);
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/applications", bodyRe: /"reject_reason"\s*:\s*"did_not_join"/ }), "no show 393px: pass writes did_not_join");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"status"\s*:\s*"no_show"/ }), "no show 393px: interview recorded as no show");
  check(await page.locator(".ic-done__title", { hasText: "Passed on" }).isVisible(), "no show 393px: done card");
  await context.close();
}

/* ── 7) No show → Reschedule: prefilled form, past guard, dual tz,
        schedule → To interview coupling ────────────────────────── */
{
  const { context, page, captured } = await newPage({ width: 1280 });
  await page.goto(`http://localhost:4184/employer/interview/${IV1_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.locator(".ic-noshow-btn").click();
  await page.waitForTimeout(400);
  await page.locator(".ic-sheet__opt--primary", { hasText: "Reschedule" }).click();
  await page.waitForTimeout(500);
  check(await page.locator(".jpp-modal__title", { hasText: "Reschedule with Rohan" }).isVisible(), "reschedule: shipped schedule form, prefilled title");
  const linkVal = await page.locator("#si-link").inputValue().catch(() => "");
  check(linkVal.includes("meet.google.com"), "reschedule: meeting link kept from the first invite");

  // Past guard: yesterday blocks with the exact sentence, confirm disabled.
  const y = new Date(Date.now() - 24 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  await page.locator("#si-date").fill(`${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`);
  await page.locator("#si-time").fill("10:00");
  await page.waitForTimeout(300);
  check(await page.getByText("That time has already passed, pick a time after now.").first().isVisible(), "reschedule: past time blocked with the honest sentence");
  check(await page.getByRole("button", { name: "Reschedule and notify" }).isDisabled(), "reschedule: confirm disabled while in the past");

  // Tomorrow: the dual timezone readout appears, in words.
  const t = new Date(Date.now() + 24 * 3600 * 1000);
  await page.locator("#si-date").fill(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`);
  await page.locator("#si-time").fill("15:00");
  await page.waitForTimeout(400);
  const tzLine = await page.locator(".si-tz__line").textContent().catch(() => null);
  check(/\d{1,2}:\d{2}\s?(AM|PM)/.test(tzLine || "") && !/[+-]\d{1,2}:?\d{0,2}\b/.test(tzLine || ""), `reschedule: dual readout in words, never an offset ("${tzLine}")`);
  check(/India/.test(tzLine || ""), `reschedule: candidate side reads India (kept timezone)`);

  // The Change link opens the short corridor list.
  await page.locator(".si-tz__change").click();
  await page.waitForTimeout(300);
  check(await page.locator(".si-tz__zone").count() === 7, "reschedule: Change shows the seven corridor zones");
  await page.locator(".si-tz__zone", { hasText: "Qatar" }).click();
  await page.waitForTimeout(300);
  const tzLine2 = await page.locator(".si-tz__line").textContent().catch(() => null);
  check(/Qatar/.test(tzLine2 || ""), `reschedule: override applies ("${tzLine2}")`);
  await shot(page, "reschedule-form-1280");

  await page.getByRole("button", { name: "Reschedule and notify" }).click();
  await page.waitForTimeout(900);
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"scheduled_at"/ }), "reschedule: interview row updated");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"ics_sequence"\s*:\s*1/ }), "reschedule: ics sequence bumped so the calendar entry updates in place");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/applications", bodyRe: /"status"\s*:\s*"ready"/ }), "reschedule: candidate moved to To interview WITHOUT a second step");
  check(capturedHas(captured, { method: "POST", path: "/api/notify-candidate", bodyRe: /"type"\s*:\s*"interview_reschedule"/ }), "reschedule: reschedule email fired with the stable interview id");
  check(await page.locator(".si-success__title", { hasText: "Interview rescheduled" }).isVisible(), "reschedule: confirmation");
  check(await page.locator(".si-stagepill", { hasText: "To interview" }).isVisible(), "reschedule: stage pill reads the move that already happened");
  const wa = await page.locator(".si-success__actions a.jpp-action--message").getAttribute("href").catch(() => null);
  check(Boolean(wa && wa.includes("wa.me") && /Qatar|India/.test(decodeURIComponent(wa))), "reschedule: WhatsApp action prefilled with the timezones");
  await shot(page, "reschedule-confirmed-1280");
  await context.close();
}

/* ── 8) Prep kit in the pipeline detail + imported candidate fix ─ */
{
  const { context, page, captured } = await newPage({ width: 1280 });
  await page.goto(`http://localhost:4184/employer/jobs/${JOB_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.getByRole("tab", { name: /Shortlist/ }).click();
  await page.waitForTimeout(500);
  await page.locator(".jpp-card").first().click();
  await page.waitForTimeout(900);

  // THE imported-candidate fix: candidate_id is null on this application,
  // yet the Interviews timeline renders (query by application_id).
  check(await page.locator(".jpp-section__title", { hasText: "Interviews" }).isVisible(), "pipeline: IMPORTED candidate (null candidate_id) shows the interview timeline");

  check(await page.locator(".ik-card").isVisible(), "pipeline: prep kit card renders");
  check(await page.locator(".ik-item").count() === 2, "pipeline: kit loaded from the interview row, no AI call");
  check(await page.locator(".ik-chip--yours", { hasText: "Your question" }).isVisible(), "pipeline: her question keeps the purple chip");
  check(await page.locator(".ik-add", { hasText: "Add your own question" }).isVisible(), "pipeline: add your own question inline");
  const foot = await page.locator(".ik-foot__note").textContent().catch(() => null);
  check(foot === "Regenerate writes a fresh set and uses 1 credit", `pipeline: credit note beside the set ("${foot}")`);
  check(await page.locator(".ik-foot__save", { hasText: "Save these as my set for" }).isVisible(), "pipeline: save as my set for the role");
  await dashScan(page, ".ik-foot", "pipeline kit footer");

  // Add her own question: lands in the list and persists to the row.
  await page.locator(".ik-add").click();
  await page.locator(".ik-addform .ik-edit").fill("Can you join a Saturday shift rotation?");
  await page.getByRole("button", { name: "Add question" }).click();
  await page.waitForTimeout(600);
  check(await page.locator(".ik-item").count() === 3, "pipeline: her new question joins the list");
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /Saturday shift rotation/ }), "pipeline: her question persisted to the interview row");
  await shot(page, "prepkit-1280");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
