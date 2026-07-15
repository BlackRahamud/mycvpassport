/* Feedback affordance verification harness. Serves the PRODUCTION build
   with the same stubbed-backend pattern as verify-interviews-tab.mjs, then
   drives the real PortalFeedback mounted in HrShell over /employer/jobs:

   - resting: one quiet floating affordance, bottom-right, glass shadow,
     no colour fill, label "Feedback"; hidden once the panel opens
   - panel: opens from the affordance, one text field and one send, the
     placeholder invites the complaint; no counter, category, or email
   - send: writes the feedback ROW (POST /rest/v1/feedback) carrying the
     real route, then fires the founder email (/api/notify-candidate,
     type feedback) best-effort; the sent confirmation never promises a
     reply
   - failure: a failed ROW keeps her words on screen, shows the honest
     error, and offers a plain "Try again" (the one unforgivable bug guard)
   - draft: closing the panel keeps the text; reopening restores it with a
     "Draft kept" marker
   - copy: no dash characters anywhere in the feedback UI
   - responsive: affordance clears the mobile bottom bar at 360 / 393 /
     430; no horizontal overflow
   - dark: cvp_theme=dark flips the panel glass to the dark ink

   Usage: node scripts/verify-feedback.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/feedback";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
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

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4188, r));

const JOB = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "IT Support Analyst L2", status: "active", hr_id: HR_ID,
  location: "Dubai, UAE", market: "gulf", company: "Meridian Logistics",
  skills: ["Desktop support", "Active Directory"], requirements: [],
  description: "First line support for around 200 users.",
};
const APP = {
  id: "44444444-4444-4444-8444-000000000001",
  job_id: JOB.id, candidate_id: null,
  candidate_name: "Divya Nair", candidate_email: "divya.nair@example.com", candidate_phone: "+919812345678",
  cv_snapshot: { personal: { location: "Pune, India" }, skills: ["Desktop support", "Active Directory"], experience: [{ title: "Support Engineer", company: "Corridor Retail", start_date: "2022", end_date: "now" }] },
  cv_file_path: null, ats_score: 88, match_keywords: ["Desktop support"], missing_keywords: [],
  ai_verdict: { score: 88, verdict: "solid", two_second_why: ["Match: hands on support.", "Skills fit.", "Gap: notice period."] },
  score_source: "sonnet_verdict", source: "import", status: "ready", recruiter_notes: [],
  applied_at: "2026-07-01T08:00:00Z", viewed_at: null, updated_at: "2026-07-01T08:00:00Z", is_visible_to_hr: true,
};

function pgrest(url, pipeline) {
  const path = url.pathname;
  const t = (name) => path.includes(`/rest/v1/${name}`);
  const wantsObject = false;
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = pipeline ? [JOB] : [];
  else if (t("applications")) rows = pipeline ? [APP] : [];
  else if (t("candidate_events")) rows = [];
  else if (t("interviews")) rows = [];
  return JSON.stringify(wantsObject ? (rows[0] ?? null) : rows);
}

async function stubRoutes(context, captured, opts) {
  const failFeedback = !!opts.failFeedback;
  const pipeline = !!opts.pipeline;
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/")) {
      captured.push({ kind: "api", method: req.method(), path: url.pathname, body: req.postData() || "" });
      // Founder email is best-effort; even a 500 must not affect her UI.
      return route.fulfill({ status: opts.failEmail ? 500 : 200, contentType: "application/json", body: opts.failEmail ? '{"ok":false}' : '{"ok":true}' });
    }
    if (url.port === "4188") return route.continue();
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
          return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "*/0", "access-control-expose-headers": "content-range" }, body: "" });
        }
        if (url.pathname.includes("/rest/v1/feedback") && method === "POST") {
          captured.push({ kind: "feedback", method, path: url.pathname, body: req.postData() || "" });
          if (failFeedback) return route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"boom"}' });
          return route.fulfill({ status: 201, contentType: "application/json", body: "" });
        }
        if (method === "PATCH" || method === "POST" || url.pathname.includes("/rpc/")) {
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, pipeline) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function newPage(browser, { width = 1280, theme = "light", failFeedback = false, failEmail = false, pipeline = false } = {}) {
  const captured = [];
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: "Asia/Dubai" });
  await stubRoutes(context, captured, { failFeedback, failEmail, pipeline });
  await context.addInitScript(([key, session, th, hrId]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
    localStorage.removeItem("cvp_feedback_draft");
    localStorage.setItem(`cvp_pipeline_view_${hrId}`, "kanban"); // force the kanban drawer path
    sessionStorage.setItem("hr_welcome_ring_shown", "1");
  }, [`sb-${REF}-auth-token`, SESSION, theme, HR_ID]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page, captured };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const PAGE_URL = "http://localhost:4188/employer/jobs";

async function openPortal(page) {
  await page.goto(PAGE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".pfb-aff", { timeout: 8000 });
  await page.waitForTimeout(300);
}

// Every string the feedback UI can show — assert no dash characters.
const DASH = /[‐-―−-]/; // hyphen-minus + unicode dashes
async function assertNoDashes(page, label) {
  const txt = await page.evaluate(() => {
    const root = document.querySelector(".pfb-root");
    if (!root) return "";
    const ta = root.querySelector(".pfb-ta");
    return (root.innerText || "") + " " + (ta ? ta.getAttribute("placeholder") || "" : "");
  });
  check(!DASH.test(txt), `${label}: no dash characters in feedback copy`);
}

// Hit-test: is the affordance the topmost element at its own centre? This
// proves it is clickable over a modal, not merely numerically above it.
async function fabOnTop(page) {
  return page.evaluate(() => {
    const aff = document.querySelector(".pfb-aff");
    if (!aff) return false;
    const r = aff.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!(el && el.closest(".pfb-root"));
  });
}

const browser = await chromium.launch();

/* ── 1) Resting affordance: quiet, floating, no colour fill ───────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openPortal(page);
  const aff = page.locator(".pfb-aff");
  check(await aff.isVisible(), "rest: the feedback affordance is present on a shell screen");
  check((await aff.textContent() || "").trim() === "Feedback", "rest: label reads Feedback");
  const bg = await aff.evaluate((el) => getComputedStyle(el).backgroundColor);
  check(bg !== "rgb(124, 58, 237)", `rest: no accent colour fill at rest (${bg})`);
  const shadow = await aff.evaluate((el) => getComputedStyle(el).boxShadow);
  check(shadow && shadow !== "none", "rest: it floats (glass shadow present)");
  const pos = await aff.evaluate((el) => { const r = el.getBoundingClientRect(); return { right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom }; });
  check(pos.right < 40 && pos.bottom < 40, `rest: pinned to the bottom-right corner (${Math.round(pos.right)},${Math.round(pos.bottom)})`);
  await assertNoDashes(page, "rest");
  await shot(page, "1-rest-desktop-light");
  await context.close();
}

/* ── 2) Open → one field and send, affordance hides ──────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openPortal(page);
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-panel", { timeout: 4000 });
  await page.waitForTimeout(450);
  check(await page.locator(".pfb-panel").isVisible(), "open: the panel opens");
  check(await page.locator(".pfb-aff").count() === 0, "open: the resting affordance hides while the panel is open");
  check(await page.locator(".pfb-compose__title", { hasText: "Send feedback" }).isVisible(), "open: header reads Send feedback");
  check(await page.locator(".pfb-ta").count() === 1, "open: exactly one text field");
  const ph = await page.locator(".pfb-ta").getAttribute("placeholder");
  check(/what is not working/.test(ph || ""), `open: placeholder invites the complaint (${ph})`);
  check(await page.locator(".pfb-root select, .pfb-root input[type=email]").count() === 0, "open: no category picker, no email field");
  await page.locator(".pfb-ta").focus();
  const ring = await page.locator(".pfb-ta").evaluate((el) => getComputedStyle(el).borderColor);
  check(ring === "rgb(124, 58, 237)", `open: the focus ring is the portal purple, not the app amber (${ring})`);
  await assertNoDashes(page, "open");
  await shot(page, "2-open-empty-light");
  await context.close();
}

/* ── 3) Send: writes the row with the real route, then the email ──── */
{
  const { context, page, captured } = await newPage(browser, { width: 1280 });
  await openPortal(page);
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-ta");
  const MSG = "The score ring on the pipeline cards does not load on my laptop, it just spins";
  await page.locator(".pfb-ta").fill(MSG);
  await shot(page, "3a-typing-light");
  await page.locator(".pfb-send").click();
  await page.waitForSelector(".pfb-sent", { timeout: 4000 });
  check(await page.locator(".pfb-sent__title", { hasText: "Sent" }).isVisible(), "send: quiet Sent confirmation");
  const sub = await page.locator(".pfb-sent__sub").textContent() || "";
  check(/founder/.test(sub) && !/repl(y|ies)/i.test(sub), `send: says a human reads it, never promises a reply (${sub})`);
  const row = captured.find((c) => c.kind === "feedback");
  check(!!row, "send: the feedback ROW is written (POST /rest/v1/feedback)");
  let parsed = null; try { parsed = JSON.parse(row.body); } catch { /* noop */ }
  check(parsed && parsed.body === MSG, "send: the row carries her exact words");
  check(parsed && parsed.route === "/employer/jobs", `send: the row carries the real route (${parsed && parsed.route})`);
  const email = captured.find((c) => c.kind === "api" && c.path === "/api/notify-candidate");
  check(!!email, "send: the founder email fires after the row");
  let ebody = null; try { ebody = JSON.parse(email.body); } catch { /* noop */ }
  check(ebody && ebody.type === "feedback" && ebody.feedbackBody === MSG, "send: the email carries type feedback and her words");
  // PII guard: the row and email carry only her identity, never candidate data.
  check(!/candidate_name|cv_snapshot|missing_keywords/.test(row.body), "send: no candidate PII in the feedback row");
  await page.waitForSelector(".pfb-panel", { state: "detached", timeout: 4000 }).catch(() => {});
  check(await page.locator(".pfb-panel").count() === 0, "send: the panel auto dismisses back to rest");
  await context.close();
}

/* ── 4) Failure: her words survive, honest error, plain retry ─────── */
{
  const { context, page } = await newPage(browser, { width: 1280, failFeedback: true });
  await openPortal(page);
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-ta");
  const MSG = "Import keeps failing halfway and I lose the batch";
  await page.locator(".pfb-ta").fill(MSG);
  await page.locator(".pfb-send").click();
  await page.waitForSelector(".pfb-err", { timeout: 4000 });
  check(await page.locator(".pfb-err").isVisible(), "fail: an honest error shows, never a false confirmation");
  check(await page.locator(".pfb-ta").inputValue() === MSG, "fail: her words stay on screen, unsent");
  check(await page.locator(".pfb-sent").count() === 0, "fail: no Sent confirmation on failure");
  const label = (await page.locator(".pfb-send").textContent() || "").trim();
  check(/Try again/.test(label), `fail: the send action offers a plain retry (${label})`);
  await assertNoDashes(page, "fail");
  await shot(page, "4-failed-light");
  await context.close();
}

/* ── 5) Draft kept: close with text, reopen, restored ─────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280 });
  await openPortal(page);
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-ta");
  const MSG = "The verdict panel sometimes shows the wrong score";
  await page.locator(".pfb-ta").fill(MSG);
  await page.locator(".pfb-x").click(); // close, keeping the text
  await page.waitForSelector(".pfb-aff", { timeout: 4000 });
  await page.waitForTimeout(200);
  await page.locator(".pfb-aff").click(); // reopen
  await page.waitForSelector(".pfb-ta");
  check(await page.locator(".pfb-ta").inputValue() === MSG, "draft: closing the panel keeps the text, reopening restores it");
  check(await page.locator(".pfb-kept", { hasText: "Draft kept" }).isVisible(), "draft: a quiet Draft kept marker confirms nothing was lost");
  await shot(page, "5-draft-kept-light");
  await context.close();
}

/* ── 6) Dark ──────────────────────────────────────────────────────── */
{
  const { context, page } = await newPage(browser, { width: 1280, theme: "dark" });
  await openPortal(page);
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-panel");
  await page.waitForTimeout(400);
  const ink = await page.locator(".pfb-compose__title").evaluate((el) => getComputedStyle(el).color);
  check(ink === "rgb(242, 242, 247)", `dark: the panel ink flips to the dark token (${ink})`);
  await assertNoDashes(page, "dark");
  await shot(page, "6-open-dark");
  await context.close();
}

/* ── 7) Mobile: clears the bottom bar, no overflow ────────────────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await newPage(browser, { width });
  await openPortal(page);
  const aff = page.locator(".pfb-aff");
  const bottom = await aff.evaluate((el) => window.innerHeight - el.getBoundingClientRect().bottom);
  check(bottom > 60, `mobile ${width}: the affordance clears the 60px bottom tab bar (${Math.round(bottom)}px)`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `mobile ${width}: no horizontal overflow (${overflow}px)`);
  await aff.click();
  await page.waitForSelector(".pfb-panel");
  await page.waitForTimeout(350);
  const pw = await page.locator(".pfb-panel").evaluate((el) => el.getBoundingClientRect().width);
  check(pw <= width - 24, `mobile ${width}: the panel fits the viewport (${Math.round(pw)}px)`);
  await shot(page, `7-mobile-${width}`);
  await context.close();
}

/* ── 8) RENDERED text is visible (the P0): read the computed ink ───── */
for (const theme of ["light", "dark"]) {
  const ink = theme === "dark" ? "rgb(242, 242, 247)" : "rgb(20, 19, 31)";
  const { context, page } = await newPage(browser, { width: 1280, theme });
  await openPortal(page);
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-ta");
  await page.locator(".pfb-ta").fill("Typed text has to be readable");
  await page.waitForTimeout(150);
  const c = await page.locator(".pfb-ta").evaluate((el) => { const s = getComputedStyle(el); return { color: s.color, fill: s.webkitTextFillColor, caret: s.caretColor, bg: s.backgroundColor }; });
  check(c.color === ink, `render ${theme}: typed text is the ink, not white/transparent (${c.color})`);
  check(c.fill === ink, `render ${theme}: -webkit-text-fill-color is the ink (${c.fill})`);
  check(c.caret === ink, `render ${theme}: the caret is visible (${c.caret})`);
  check(c.bg !== "rgba(0, 0, 0, 0)", `render ${theme}: the focused field keeps its fill, not transparent (${c.bg})`);
  await context.close();
}

/* ── 9) Clickable OVER the drawer and the schedule modal (observed) ── */
{
  const { context, page } = await newPage(browser, { width: 1280, pipeline: true });
  await page.goto(`http://localhost:4188/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".pfb-aff", { timeout: 8000 });
  await page.waitForSelector(".jpp-kb-card", { timeout: 8000 });

  // candidate drawer (role="dialog", slides over the board)
  await page.locator(".jpp-kb-card").first().click();
  await page.waitForSelector(".jpp-kb-drawer", { timeout: 4000 });
  await page.waitForTimeout(400);
  check(await page.locator(".pfb-aff").isVisible(), "over-drawer: the affordance is visible above the candidate drawer");
  check(await fabOnTop(page), "over-drawer: it is the topmost element at its point (hit-test, not just numeric z)");
  await shot(page, "8-over-drawer");
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-panel", { timeout: 4000 });
  check(await page.locator(".pfb-panel").isVisible(), "over-drawer: clicking it actually opens the panel");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".pfb-aff", { timeout: 4000 });
  check(await page.locator(".jpp-kb-drawer").isVisible(), "over-drawer: Escape closed the panel only, the drawer stayed open");

  // schedule modal (jpp-modal, z 4000, page level)
  await page.locator(".jpp-action--ghost", { hasText: "Schedule interview" }).first().click();
  await page.waitForSelector('.jpp-modal[aria-label="Schedule interview"]', { timeout: 4000 });
  await page.waitForTimeout(400);
  check(await page.locator(".pfb-aff").isVisible(), "over-schedule: the affordance is visible above the schedule modal");
  check(await fabOnTop(page), "over-schedule: it is the topmost element at its point");
  await shot(page, "9-over-schedule");
  await page.locator(".pfb-aff").click();
  await page.waitForSelector(".pfb-panel", { timeout: 4000 });
  check(await page.locator(".pfb-panel").isVisible(), "over-schedule: clicking it actually opens the panel over the modal");
  await context.close();
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "✓ all feedback checks passed" : `✗ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
