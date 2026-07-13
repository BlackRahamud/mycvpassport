/* Float companion verification harness (Document Picture in Picture +
   popup fallback). Serves the PRODUCTION build with the same stubbed
   backend as verify-interview-kit.mjs, then:

   - docked companion: Float button present, no layout change to the
     docked view (header, questions, pinned bar all still there)
   - Float (Chromium, real Document PiP): 380px window opens, the LIVE
     companion renders inside it (same React subtree), Mark asked and
     the quick note PATCH the interviews row from inside the window,
     glass token + theme attribute land in the PiP document, no
     horizontal overflow at 380
   - in-app placeholder: "Your questions are floating over your call"
     + Bring back; closing the PiP window (pagehide) restores the
     docked companion with asked-state intact
   - only one float at a time: while floated the header shows Dock
   - fallback (documentPictureInPicture deleted): Float opens a sized
     popup at /employer/interview/:id?float=1, popup has no back bar
     and no Float button, Dock closes it, opener reconciles and
     restores the docked view
   - reduced motion: the float entrance animation is disabled
   - dash scan on all new copy + overflow audit at 360/393/430 docked

   PiP requires a headed browser window; the harness launches Chromium
   headed for the PiP sections and headless elsewhere.

   Usage: node scripts/verify-float-companion.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/float-companion";
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

const todayAt = (h, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const JOB = {
  id: JOB_ID, title: "IT Support Analyst L2", status: "active",
  posted_at: "2026-06-20T08:00:00Z", created_at: "2026-06-20T08:00:00Z",
  location: "Dubai, UAE", market: "gulf", job_type: "full_time",
  salary_min: 4000, salary_max: 6000, currency: "AED",
  hr_id: HR_ID, company: "Meridian Logistics", department: "IT",
  skills: ["Desktop support", "Active Directory", "Office 365"],
  requirements: [],
  description: "First line support for around 200 users across stores and the head office.",
  screening_questions: [],
};

const APP = {
  id: APP_ID, job_id: JOB_ID, candidate_id: null,
  candidate_name: "Rohan Mehta", candidate_email: "rohan@example.com",
  candidate_phone: "+919812345678",
  cv_snapshot: {
    personal: { location: "Pune, India", notice_period: "1 month" },
    skills: ["Desktop support", "Active Directory", "Office 365", "Freshdesk"],
    experience: [
      { title: "IT Support Engineer", company: "Corridor Retail", start_date: "2023", end_date: "now", summary: "First line for around 200 store and office users." },
    ],
  },
  cv_file_path: null, ats_score: 80, match_keywords: [], missing_keywords: [],
  ai_verdict: { score: 80, two_second_why: ["AD and O365 hands on.", "Skills fit.", "Gap: notice period timing"] },
  score_source: "sonnet_verdict", source: "import", status: "ready",
  recruiter_notes: null, applied_at: "2026-07-01T08:00:00Z", viewed_at: null,
  updated_at: "2026-07-10T08:00:00Z", is_visible_to_hr: true,
};

const KIT = {
  questions: [
    { id: "q1", category: "technical", question: "A user says Outlook stopped syncing this morning. Walk me through what you would check first.", listen_for: "concrete steps in order, asks what changed", source: "ai" },
    { id: "q2", category: "yours", question: "Our support window runs to 11 PM. Have you worked evening shifts before?", listen_for: "", source: "yours" },
  ],
  asked: {}, notes: {}, generated_at: "2026-07-13T06:00:00Z",
};

const IV1 = {
  id: IV1_ID, application_id: APP_ID, job_id: JOB_ID, hr_id: HR_ID, candidate_id: null,
  scheduled_at: todayAt(14, 0), duration_min: 30, meeting_link: "https://meet.google.com/kdp-wrvq-abc",
  note: null, status: "scheduled", kit: KIT, rating: null, rating_note: null,
  candidate_tz: "Asia/Kolkata", ics_sequence: 0,
  applications: { candidate_name: "Rohan Mehta" }, jobs: { title: "IT Support Analyst L2" },
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
await new Promise((r) => server.listen(4186, r));

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

function pgrest(url, accept) {
  const path = url.pathname;
  const search = url.search || "";
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("interview_question_sets")) rows = [];
  else if (t("interviews")) rows = [IV1];
  else if (t("applications")) rows = [APP];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context, captured) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/")) {
      captured.push({ method: req.method(), path: url.pathname, search: url.search, body: req.postData() || "" });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.port === "4186") return route.continue();
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
          return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "*/1", "access-control-expose-headers": "content-range" }, body: "" });
        }
        if (method === "PATCH" || method === "POST" || url.pathname.includes("/rpc/")) {
          captured.push({ method, path: url.pathname, search: url.search, body: req.postData() || "" });
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function newPage(browser, { width = 1280, killPip = false, reducedMotion = null, noViewport = false } = {}) {
  const captured = [];
  const context = await browser.newContext({
    // Viewport emulation is context-wide and leaks into the PiP window's
    // innerWidth — the PiP sections run unemulated so the real window
    // size is what gets measured.
    viewport: noViewport ? null : { width, height: 852 },
    ...(reducedMotion ? { reducedMotion } : {}),
  });
  await stubRoutes(context, captured);
  await context.addInitScript(([key, session, kill]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
    if (kill) { try { delete window.documentPictureInPicture; } catch { /* not deletable */ } }
  }, [`sb-${REF}-auth-token`, SESSION, killPip]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page, captured };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const capturedHas = (captured, { method, path, bodyRe }) =>
  captured.some((c) => c.method === method && c.path.includes(path) && (!bodyRe || bodyRe.test(c.body)));

const COMPANION_URL = `http://localhost:4186/employer/interview/${IV1_ID}`;

async function openCompanion(page) {
  await page.goto(COMPANION_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
}

/* ── 1) Docked view untouched + Float button, widths ─────────────── */
{
  const headless = await chromium.launch();
  for (const width of [360, 393, 430, 1280]) {
    const { context, page } = await newPage(headless, { width });
    await openCompanion(page);
    check(await page.locator(".ic-head__name", { hasText: "Rohan Mehta" }).isVisible(), `docked ${width}px: companion header`);
    check(await page.locator(".ic-float-btn", { hasText: "Float" }).isVisible(), `docked ${width}px: Float button in the header`);
    check(await page.locator(".ic-noshow-btn").isVisible(), `docked ${width}px: no show button still one tap away`);
    check(await page.locator(".ic-q").count() === 2, `docked ${width}px: questions render`);
    check(await page.locator(".ic-pin__progress", { hasText: "0 of 2 asked" }).isVisible(), `docked ${width}px: pinned progress unchanged`);
    check(await page.locator(".ic-float-meter").count() === 0, `docked ${width}px: float meter absent while docked`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 1, `docked ${width}px: no horizontal overflow (${overflow}px)`);
    const headTxt = await page.locator(".ic-head").textContent();
    check(!/[-–—]/.test(headTxt || ""), `docked ${width}px: no dash characters in header copy`);
    if (width === 1280) await shot(page, "docked-1280");
    await context.close();
  }
  await headless.close();
}

/* ── 2) Real Document PiP (headed Chromium) ──────────────────────── */
{
  const headed = await chromium.launch({ headless: false });
  const { context, page, captured } = await newPage(headed, { noViewport: true });
  await openCompanion(page);

  const supported = await page.evaluate(() => "documentPictureInPicture" in window);
  check(supported, "pip: Document PiP supported in this Chromium");

  await page.locator(".ic-float-btn", { hasText: "Float" }).click();
  await page.waitForTimeout(1200);

  const pip = await page.evaluate(() => {
    const w = window.documentPictureInPicture?.window;
    if (!w) return null;
    const d = w.document;
    const gc = (sel, prop) => {
      const el = d.querySelector(sel);
      return el ? w.getComputedStyle(el)[prop] : null;
    };
    return {
      width: w.innerWidth,
      height: w.innerHeight,
      qCount: d.querySelectorAll(".ic-q").length,
      hasDock: !!Array.from(d.querySelectorAll(".ic-float-btn")).find((b) => b.textContent.includes("Dock")),
      hasClose: !!d.querySelector(".ic-float-x"),
      meterTxt: d.querySelector(".ic-float-meter__txt")?.textContent || "",
      subTxt: d.querySelector(".ic-head__sub")?.textContent || "",
      theme: d.documentElement.getAttribute("data-theme") || "(none)",
      rootBg: gc(".ic-root--float", "backgroundColor"),
      rootBlur: gc(".ic-root--float", "backdropFilter"),
      pinProgress: gc(".ic-pin__progress", "display"),
      overflow: d.documentElement.scrollWidth - d.documentElement.clientWidth,
      finish: !!d.querySelector(".ic-pin__finish"),
      noteField: !!d.querySelector(".ic-q__note"),
    };
  });
  check(!!pip, "pip: float window opened from one tap");
  if (pip) {
    // OS DPI rounding can land the real window a pixel off the request.
    check(Math.abs(pip.width - 380) <= 2, `pip: window width 380 (got ${pip.width})`);
    check(pip.qCount === 2, "pip: live companion questions render inside the window");
    check(pip.hasDock, "pip: header shows Dock while floated");
    check(pip.hasClose, "pip: header close present");
    check(/0 of 2 asked/.test(pip.meterTxt), `pip: N of M asked in the header ("${pip.meterTxt}")`);
    check(/India/.test(pip.subTxt), `pip: dual timezone in words ("${pip.subTxt.slice(0, 60)}")`);
    check(pip.rootBg?.includes("rgba"), `pip: glass background applied (${pip.rootBg})`);
    check((pip.rootBlur || "").includes("blur"), `pip: glass blur applied (${pip.rootBlur})`);
    check(pip.pinProgress === "none", "pip: pinned bar drops the duplicate count, keeps Finish and rate");
    check(pip.finish, "pip: Finish and rate present");
    check(pip.noteField, "pip: quick note field present");
    check(pip.overflow <= 1, `pip: no horizontal overflow at 380 (${pip.overflow}px)`);
    check(!/[-–—]/.test(pip.subTxt + pip.meterTxt), "pip: no dash characters in float copy");
  }

  // In-app placeholder + no second float
  check(await page.locator(".ic-away__line", { hasText: "Your questions are floating over your call" }).isVisible(), "pip: in-app placeholder line");
  check(await page.locator(".ic-away__back", { hasText: "Bring back" }).isVisible(), "pip: Bring back button");
  check(await page.locator(".ic-q").count() === 0, "pip: docked questions replaced by the placeholder");
  await shot(page, "pip-placeholder");

  // Mark asked + note INSIDE the pip window → same handlers, same PATCH
  captured.length = 0;
  await page.evaluate(() => {
    const d = window.documentPictureInPicture.window.document;
    Array.from(d.querySelectorAll(".ic-asked")).find((b) => b.textContent.includes("Mark asked"))?.click();
  });
  await page.waitForTimeout(600);
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"asked"\s*:\s*\{\s*"q1"\s*:\s*true/ }), "pip: Mark asked PATCHes the interview row from the float window");
  const meterAfter = await page.evaluate(() => window.documentPictureInPicture.window.document.querySelector(".ic-float-meter__txt")?.textContent || "");
  check(/1 of 2 asked/.test(meterAfter), `pip: header meter advances ("${meterAfter}")`);

  await page.evaluate(() => {
    const d = window.documentPictureInPicture.window.document;
    const input = d.querySelector(".ic-q__note");
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, "Calm on the phone");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /Calm on the phone/ }), "pip: quick note PATCHes the interview row from the float window");

  // Bring back → pip closes (pagehide) → docked restored with state intact
  await page.locator(".ic-away__back").click();
  await page.waitForTimeout(800);
  const pipGone = await page.evaluate(() => !window.documentPictureInPicture.window);
  check(pipGone, "dock: Bring back closes the float window");
  check(await page.locator(".ic-q").count() === 2, "dock: docked companion restored");
  check(await page.locator(".ic-pin__progress", { hasText: "1 of 2 asked" }).isVisible(), "dock: asked state survived the round trip");
  check(await page.locator(".ic-float-btn", { hasText: "Float" }).isVisible(), "dock: button reads Float again");
  check(await page.locator(".ic-float-meter").count() === 0, "dock: float meter gone when docked");
  await shot(page, "docked-after-float");

  // Float again, close via the window itself (pagehide path)
  await page.locator(".ic-float-btn", { hasText: "Float" }).click();
  await page.waitForTimeout(1000);
  const reopened = await page.evaluate(() => !!window.documentPictureInPicture.window);
  check(reopened, "pip: floats again after docking");
  await page.evaluate(() => window.documentPictureInPicture.window.close());
  await page.waitForTimeout(800);
  check(await page.locator(".ic-q").count() === 2, "pip: closing the window itself restores the docked companion");

  await context.close();

  /* Reduced motion: entrance animation stilled inside the float window */
  const rm = await newPage(headed, { noViewport: true, reducedMotion: "reduce" });
  await openCompanion(rm.page);
  await rm.page.locator(".ic-float-btn", { hasText: "Float" }).click();
  await rm.page.waitForTimeout(1000);
  const anim = await rm.page.evaluate(() => {
    const w = window.documentPictureInPicture?.window;
    if (!w) return null;
    const el = w.document.querySelector(".ic-root--float");
    return el ? w.getComputedStyle(el).animationName : null;
  });
  check(anim === "none", `reduced motion: float entrance animation disabled (${anim})`);
  await rm.context.close();
  await headed.close();
}

/* ── 3) Fallback, no Document PiP → sized popup ──────────────────── */
{
  const headless = await chromium.launch();
  const { context, page, captured } = await newPage(headless, { width: 1280, killPip: true });
  await openCompanion(page);

  const gone = await page.evaluate(() => !("documentPictureInPicture" in window));
  check(gone, "fallback: documentPictureInPicture removed for this run");

  const btn = page.locator(".ic-float-btn", { hasText: "Float" });
  check(await btn.isVisible(), "fallback: Float button still present, no dead button");
  check((await btn.getAttribute("title") || "").includes("not always on top"), "fallback: honest tooltip on unsupported browsers");

  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 5000 }).catch(() => null),
    btn.click(),
  ]);
  check(!!popup, "fallback: Float opens the popup in the same gesture");
  if (popup) {
    await popup.waitForLoadState("networkidle").catch(() => {});
    await popup.waitForTimeout(900);
    check(popup.url().includes(`/employer/interview/${IV1_ID}?float=1`), `fallback: popup carries ?float=1 (${popup.url()})`);
    check(await popup.locator(".icp-top").count() === 0, "fallback: popup drops the back bar");
    check(await popup.locator(".ic-q").count() === 2, "fallback: popup renders the companion");
    check(await popup.locator(".ic-float-btn", { hasText: "Float" }).count() === 0, "fallback: no Float button inside the popup");
    check(await popup.locator(".ic-float-btn", { hasText: "Dock" }).isVisible(), "fallback: Dock present in the popup header");
    check(await popup.locator(".ic-float-meter__txt", { hasText: "0 of 2 asked" }).isVisible(), "fallback: N of M in the popup header");

    // Opener shows the placeholder while the popup is out
    check(await page.locator(".ic-away__line").isVisible(), "fallback: opener shows the floating placeholder");

    // Mark asked in the popup persists through the same PATCH
    captured.length = 0;
    await popup.locator(".ic-asked", { hasText: "Mark asked" }).first().click();
    await popup.waitForTimeout(600);
    check(capturedHas(captured, { method: "PATCH", path: "/rest/v1/interviews", bodyRe: /"asked"\s*:\s*\{\s*"q1"\s*:\s*true/ }), "fallback: Mark asked in the popup PATCHes the interview row");

    // Dock inside the popup closes it; the opener reconciles and restores
    await popup.locator(".ic-float-btn", { hasText: "Dock" }).click();
    await page.waitForTimeout(1600);
    check(await page.locator(".ic-q").count() === 2, "fallback: opener restores the docked companion after the popup closes");
    check(await page.locator(".ic-away__line").count() === 0, "fallback: placeholder cleared");
  }
  await shot(page, "fallback-after-dock");
  await context.close();
  await headless.close();
}

server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
