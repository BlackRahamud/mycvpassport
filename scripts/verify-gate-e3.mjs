/* Gate E3 — full candidate evaluation locked on free.
   Renders the REAL candidate detail on /employer/jobs/:id?app=... with a
   FREE entitlement and asserts the designed lock, then repeats with a
   Foundation entitlement to prove the gate opens.

   The load bearing assertion is the AI CALL COUNT. A free employer must
   reach ZERO candidate_verdict calls: /api/ai runs Sonnet there with no
   credit deduct and no rate limit, so an ungated free tier is a margin
   hole as much as a missing paywall.

   Screenshots are READ by eye.
   Usage: node scripts/verify-gate-e3.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/gate-e3";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (detail) console.log(`      ${detail}`);
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
  cv_snapshot: { skills: ["Windows Server"], personal: { location: "Dubai" } }, cv_file_path: null,
  ats_score: 72,
  match_keywords: ["windows server", "active directory"], missing_keywords: ["azure", "intune"],
  score_source: "stopgap_keyword", source: "applied", status: "new", recruiter_notes: [],
  applied_at: "2026-06-28T10:30:00Z", viewed_at: null, updated_at: "2026-06-28T10:30:00Z", is_visible_to_hr: true,
  ai_verdict: null,
};
const VERDICT = {
  verdict: "STRONG FIT", score: 84,
  two_second_why: ["Match: enterprise Windows support maps onto the JD.", "Corridor: already in Dubai on own visa.", "Gap: no Azure exposure."],
  strengths: ["Windows Server and AD since 2019."], gaps: ["No Azure exposure."],
  whatsapp_cta_template: "Hi Mohammed, are you open to a quick call?",
};

const SESSION = {
  access_token: "stub", refresh_token: "stub", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: HR_ID, aud: "authenticated", role: "authenticated",
          email: "recruiter@meridianlogistics.example",
          app_metadata: { provider: "email" }, user_metadata: { full_name: "Meridian HR" },
          created_at: "2026-06-01T00:00:00Z" },
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4204, r));

const browser = await chromium.launch();

async function open({ plan, aiEvaluation }) {
  const stats = { ai: 0 };
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();

    if (url.pathname.startsWith("/api/ai") && url.searchParams.get("action") === "candidate_verdict") {
      stats.ai += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VERDICT) });
    }
    if (url.port === "4204") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();

    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/rpc/hr_my_entitlement")) {
        return route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify([{
            plan, status: "active", period_end: null,
            limits: { active_jobs: plan === "foundation" ? 3 : 1, ai_evaluation: aiEvaluation, analytics: aiEvaluation },
            baseline: 0, active_jobs: 1,
          }]),
        });
      }
      if (url.pathname.includes("/rest/v1/rpc/")) return route.fulfill({ status: 200, contentType: "application/json", body: "null" });
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        const accept = req.headers().accept || "";
        const wantsObject = /vnd\.pgrst\.object/.test(accept);
        const t = (n) => url.pathname.includes(`/rest/v1/${n}`);
        let rows = [];
        if (t("profiles") && !t("hr_profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "r@m.example" }];
        else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "r@m.example", company_id: "55555555-5555-4555-8555-555555555555" }];
        else if (t("jobs")) rows = [JOB];
        else if (t("applications")) rows = [APP1];
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });

  await context.addInitScript(([k, s, viewKey]) => {
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem("cvp_theme", "light");
    localStorage.setItem(viewKey, "list");
  }, [`sb-${REF}-auth-token`, SESSION, `cvp_pipeline_view_${HR_ID}`]);

  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  await page.goto(`http://localhost:4204/employer/jobs/${JOB.id}?app=${APP1.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  return { context, page, stats };
}

console.log("=".repeat(70));
console.log("GATE E3 — full evaluation locked on free");
console.log("=".repeat(70));

/* 1. Free: locked, and crucially no model call. */
{
  const { context, page, stats } = await open({ plan: "free", aiEvaluation: false });
  const locked = page.locator(".vc-card--locked");
  const has = (await locked.count()) > 0;
  check(has, "free: the locked evaluation card renders");

  if (has) {
    await locked.screenshot({ path: join(OUT, "1-free-locked.png") });
    const t = await locked.innerText();
    check(/Basic score/.test(t), "free: the basic score stays visible", t.split("\n").slice(0, 3).join(" / "));
    check(/72/.test(t), "free: the basic score is the real keyword score, 72");
    check(/Full candidate evaluation is a Foundation feature/.test(t), "free: names what is withheld");
    check(/Unlock full evaluation/.test(t), "free: offers the unlock");
    check(!/STRONG FIT|Corridor:/.test(t), "free: the withheld verdict text is NOT in the DOM");
  }
  check(stats.ai === 0, "free: ZERO candidate_verdict calls, no Sonnet spend", `ai calls = ${stats.ai}`);

  // The unlock opens the shared sheet.
  if (has) {
    await page.locator(".vc-lock__cta").click();
    await page.waitForTimeout(700);
    const sheet = page.locator(".fus-sheet");
    const sheetUp = (await sheet.count()) > 0;
    check(sheetUp, "free: unlock opens the upgrade sheet");
    if (sheetUp) await sheet.screenshot({ path: join(OUT, "2-free-unlock-sheet.png") });
  }
  await context.close();
}

/* 2. Foundation: the gate opens and the evaluation runs as before. */
{
  const { context, page, stats } = await open({ plan: "foundation", aiEvaluation: true });
  const locked = (await page.locator(".vc-card--locked").count()) > 0;
  check(!locked, "foundation: no lock");
  const body = await page.locator("body").innerText();
  check(/STRONG FIT|84/.test(body), "foundation: the full verdict renders");
  check(stats.ai === 1, "foundation: exactly one candidate_verdict call", `ai calls = ${stats.ai}`);
  await page.screenshot({ path: join(OUT, "3-foundation-unlocked.png") });
  await context.close();
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "Gate E3 renders correctly and costs nothing on free." : `${failures} check(s) failed.`}`);
console.log(`Screenshots: ${OUT}`);
process.exitCode = failures === 0 ? 0 : 1;
