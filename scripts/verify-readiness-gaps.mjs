/* Deployment readiness gaps verification harness. Serves the PRODUCTION
   build with a stubbed backend (same pattern as verify-review-mode.mjs)
   and drives the real ReadinessCard in ReviewMode across the four states:

   - nothing missing: facts only, no gap line, no button, no empty success
   - one field missing: singular one line and one button
   - all fields missing: one line listing all, one button, zero warning rows
   - already asked: the line goes quiet and reports she asked, and when

   It verifies by SCREENSHOT (read the image) plus copy assertions:
   rows scale with what we KNOW (known fields still render as rows), the
   gap line is a statement about the CV not an instruction to her, the
   micro copy predicts the outcome, there are no warning dots on absence,
   and no dash characters anywhere. Light and dark, 1280 / 360 / 393 / 430.

   Usage: node scripts/verify-readiness-gaps.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/readiness-gaps";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const CID = "ca222222-2222-4222-8222-222222222222";

const JOB = {
  id: JOB_ID, hr_id: HR_ID, title: "IT Support Analyst L2", status: "active",
  location: "Dubai", market: "gulf", salary_min: 4000, salary_max: 7000, currency: "AED",
  company: "Meridian Logistics", skills: ["Office 365", "Active Directory"], requirements: [],
  description: "Provide L2 desktop and network support across Dubai.",
  screening_questions: [], posted_at: "2026-07-01T08:00:00Z", created_at: "2026-07-01T08:00:00Z",
};

const AI_VERDICT = {
  score: 80, verdict: "solid",
  two_second_why: ["Match: five years of desktop and network support.", "Corridor: already in the UAE.", "Gap: driving license not stated."],
  strengths: ["Hands on desktop, printer and LAN support"], gaps: ["No UAE driving license"],
  whatsapp_cta_template: "Hi Faisal, keen to learn more about your support experience.",
};

// Build a candidate whose CV states exactly the listed fields.
function mkApp(states) {
  const cv = {
    name: "Faisal Khan", desired_job: "IT Support Engineer",
    summary: "IT support engineer with five years across Sharjah trading and logistics SMEs.",
    skills: ["Desktop support", "Office 365", "LAN"],
    experience: [{ title: "IT Support Engineer", company: "Al Noor Trading", location: "Sharjah", start_date: "2022", end_date: "present" }],
  };
  if (states.location) cv.location = "Sharjah, UAE";
  if (states.nationality) { cv.nationality = "Indian"; cv.summary += " Holds an ECNR passport."; }
  if (states.visa) cv.visa_status = "Visit visa, 30 days remaining";
  if (states.notice) cv.notice_period = "1 month";
  if (states.salary) cv.salary_expectation = "AED 5,500";
  return {
    job_id: JOB_ID, hr_id: HR_ID, status: "new", is_visible_to_hr: true, source: "organic",
    recruiter_notes: [], reject_reason: null,
    id: "aaaaaaa2-2222-4222-8222-222222222222", candidate_id: CID,
    candidate_name: "Faisal Khan", candidate_email: "faisal@example.com", candidate_phone: "+971509876543",
    applied_at: "2026-07-12T02:00:00Z", ats_score: 80, score_source: "sonnet_verdict", cv_file_path: null,
    match_keywords: ["Desktop support", "LAN"], missing_keywords: ["Cisco VLANs"],
    ai_verdict: AI_VERDICT, cv_snapshot: cv,
  };
}

const SCEN = {
  none: { states: { location: 1, nationality: 1, visa: 1, notice: 1, salary: 1 }, asked: false },
  one: { states: { location: 1, nationality: 1, visa: 1, notice: 1, salary: 0 }, asked: false },
  five: { states: {}, asked: false },
  asked: { states: {}, asked: true },
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4189, r));

const SESSION = {
  access_token: "a", refresh_token: "r", token_type: "bearer", expires_in: 9e5,
  expires_at: Math.floor(Date.now() / 1000) + 9e5,
  user: { id: HR_ID, aud: "authenticated", role: "authenticated", email: "recruiter@meridian.example", app_metadata: {}, user_metadata: { full_name: "Meridian HR" }, created_at: "2026-06-01T00:00:00Z" },
};

function pgrest(url, scenario) {
  const t = (n) => url.pathname.includes(`/rest/v1/${n}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridian.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridian.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("applications")) rows = [mkApp(SCEN[scenario].states)];
  else if (t("candidate_events")) {
    const ev = url.searchParams.get("event_type") || "";
    if (ev.includes("readiness_asked") && SCEN[scenario].asked) rows = [{ created_at: "2026-07-13T09:00:00Z" }];
    else rows = [];
  }
  return JSON.stringify(rows);
}

async function stub(context, scenario) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ verdict: AI_VERDICT }) });
    if (url.port === "4189") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        const m = req.method();
        if (m === "HEAD") return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "*/0", "access-control-expose-headers": "content-range" }, body: "" });
        if (m === "POST" || m === "PATCH" || url.pathname.includes("/rpc/")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, scenario) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function open(browser, { scenario, width = 1280, theme = "light" }) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: "Asia/Dubai" });
  await stub(context, scenario);
  await context.addInitScript(([key, session, th]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
    sessionStorage.setItem("hr_welcome_ring_shown", "1");
  }, [`sb-${REF}-auth-token`, SESSION, theme]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); });
  await page.goto(`http://localhost:4189/employer/jobs/${JOB_ID}/review`, { waitUntil: "networkidle" });
  await page.waitForSelector(".rvm-readiness", { timeout: 8000 });
  await page.waitForTimeout(500);
  return { context, page };
}

const DASH = /[‐-―−-]/;
async function readinessText(page) {
  return page.locator(".rvm-readiness").innerText();
}
const shot = (page, name) => page.locator(".rvm-readiness").screenshot({ path: join(OUT, `${name}.png`) });

const browser = await chromium.launch();

/* ── nothing missing: facts only ───────────────────────────────── */
{
  const { context, page } = await open(browser, { scenario: "none" });
  check((await page.locator(".rvm-readiness__row").count()) === 5, "none: five known rows render (facts)");
  check((await page.locator(".rvm-readiness__gapline").count()) === 0, "none: no gap line");
  check((await page.locator(".rvm-gapbtn").count()) === 0, "none: no ask button");
  check((await page.locator(".rvm-readiness__asked").count()) === 0, "none: no empty success state, no congratulation");
  check(!DASH.test(await readinessText(page)), "none: no dash characters");
  await shot(page, "1-none-light");
  await context.close();
}

/* ── one field missing: singular line + one button ─────────────── */
{
  const { context, page } = await open(browser, { scenario: "one" });
  check((await page.locator(".rvm-readiness__row").count()) === 4, "one: four known rows (salary absent)");
  const line = await page.locator(".rvm-readiness__gapline").innerText();
  check(/salary expectation\.?$/.test(line.trim()), `one: singular line names just the missing field (${line})`);
  check(!/,| and /.test(line), "one: singular, no list punctuation (not 'one things')");
  check(/does not mention/.test(line), "one: a statement about the CV, not an instruction to her");
  check(!/confirm|please/i.test(line), "one: no homework verb (confirm/please) in the line");
  check(await page.locator(".rvm-gapbtn", { hasText: "Ask on WhatsApp" }).isVisible(), "one: one Ask on WhatsApp button");
  check(await page.locator(".rvm-readiness__gaphint").isVisible(), "one: micro copy predicts the outcome");
  check((await page.locator(".rvm-readiness__gaps .rvm-dot").count()) === 0, "one: no warning dot on absence");
  check(!DASH.test(await readinessText(page)), "one: no dash characters");
  await shot(page, "2-one-light");
  await context.close();
}

/* ── all fields missing: one line, one button, zero warning rows ─ */
{
  const { context, page } = await open(browser, { scenario: "five" });
  check((await page.locator(".rvm-readiness__row").count()) === 0, "five: zero rows, absence is not a chore per field");
  const line = await page.locator(".rvm-readiness__gapline").innerText();
  check(/current location.*nationality.*visa status.*notice period.*and salary expectation/.test(line), `five: one line lists all five (${line})`);
  check(/'s CV does not mention/.test(line), "five: statement about the CV, personalised by name");
  check(await page.locator(".rvm-gapbtn").isVisible(), "five: exactly one action");
  check((await page.locator(".rvm-gapbtn").count()) === 1, "five: not one button per field");
  check(!DASH.test(await readinessText(page)), "five: no dash characters");
  await shot(page, "3-five-light");
  const gapColor = await page.locator(".rvm-readiness__gapline").evaluate((el) => getComputedStyle(el).color);
  check(gapColor !== "rgb(217, 119, 6)" && gapColor !== "rgb(220, 38, 38)", `five: the line is secondary text, not amber or danger (${gapColor})`);
  await context.close();
}

/* ── already asked: the line goes quiet ────────────────────────── */
{
  const { context, page } = await open(browser, { scenario: "asked" });
  check((await page.locator(".rvm-readiness__gapline").count()) === 0, "asked: the gap line is gone");
  check((await page.locator(".rvm-gapbtn").count()) === 0, "asked: the primary ask button is gone");
  const asked = await page.locator(".rvm-readiness__asked").innerText();
  check(/You asked Faisal on 13 Jul/.test(asked), `asked: reports that she asked, and when (${asked})`);
  check(await page.locator(".rvm-readiness__asked .rvm-linkbtn", { hasText: "Ask again" }).isVisible(), "asked: a quiet Ask again remains");
  check(!DASH.test(await readinessText(page)), "asked: no dash characters");
  await shot(page, "4-asked-light");
  await context.close();
}

/* ── dark + mobile widths (five missing) ───────────────────────── */
{
  const { context, page } = await open(browser, { scenario: "five", theme: "dark" });
  check(await page.locator(".rvm-gapbtn").isVisible(), "dark: the ask button renders");
  await shot(page, "5-five-dark");
  await context.close();
}
for (const width of [360, 393, 430]) {
  const { context, page } = await open(browser, { scenario: "one", width });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `mobile ${width}: no horizontal overflow (${overflow}px)`);
  check(await page.locator(".rvm-gapbtn").isVisible(), `mobile ${width}: ask button reachable`);
  await page.locator(".rvm-readiness").screenshot({ path: join(OUT, `6-mobile-${width}.png`) });
  await context.close();
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "✓ all readiness-gaps checks passed" : `✗ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
