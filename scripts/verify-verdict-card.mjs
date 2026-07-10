/* VerdictCard upgrade harness (skill chips un-hidden + strengths/gaps
   checklist). Serves the PRODUCTION build with a stubbed backend:
   - NEW-shape verdict: checklist renders (two columns desktop, one at
     360), keyword chips visible WITHOUT any click, Show all toggle,
     old "View full fit analysis" button gone, dash scan
   - LEGACY-shape verdict (no arrays): no checklist, Gap line intact,
     no crash — old cached verdicts keep working
   Usage: node scripts/verify-verdict-card.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/verdict-card";
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
  cv_snapshot: { skills: ["Windows Server"], personal: { location: "Dubai" } }, cv_file_path: null,
  ats_score: 82,
  match_keywords: ["windows server", "active directory", "networking", "hardware", "customer support", "itil", "office 365", "vpn"],
  missing_keywords: ["azure", "intune", "powershell", "sccm", "linux", "jira", "sql"],
  score_source: "ai", source: "applied", status: "new", recruiter_notes: [],
  applied_at: "2026-06-28T10:30:00Z", viewed_at: null, updated_at: "2026-06-28T10:30:00Z", is_visible_to_hr: true,
};

const NEW_VERDICT = {
  verdict: "STRONG FIT", score: 84,
  two_second_why: [
    "Match: five years of enterprise Windows support maps directly onto the JD.",
    "Corridor: already in Dubai on own visa, zero relocation friction.",
    "Gap: no Azure or Intune exposure anywhere on the CV.",
  ],
  strengths: [
    "Enterprise Windows Server and AD administration since 2019.",
    "Hands on hardware and field support background.",
    "Already based in Dubai with a transferable visa.",
  ],
  gaps: [
    "No Azure or Intune exposure on the CV.",
    "No scripting or automation evidence, PowerShell absent.",
  ],
  whatsapp_cta_template: "Hi Mohammed, your Windows Server background looks like a great fit for our IT support role. Are you open to a quick call?",
};
const LEGACY_VERDICT = {
  verdict: "STRONG FIT", score: 84,
  two_second_why: NEW_VERDICT.two_second_why,
  whatsapp_cta_template: NEW_VERDICT.whatsapp_cta_template,
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
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "r@m.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "r@m.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("applications")) rows = [APP1];
  else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context, verdictPayload) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/ai") && url.searchParams.get("action") === "candidate_verdict") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(verdictPayload) });
    }
    if (url.port === "4186") return route.continue();
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

const browser = await chromium.launch();

async function openDetail({ width, verdictPayload }) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await stubRoutes(context, verdictPayload);
  await context.addInitScript(([key, session, viewKey]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
    // Detail panel lives in the list view; kanban shows it in a drawer.
    localStorage.setItem(viewKey, "list");
  }, [`sb-${REF}-auth-token`, SESSION, `cvp_pipeline_view_${HR_ID}`]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  await page.goto(`http://localhost:4186/employer/jobs/${JOB.id}?app=${APP1.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // verdict fetch + entrance
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

/* ── 1) New-shape verdict, desktop ────────────────────────────── */
{
  const { context, page } = await openDetail({ width: 1280, verdictPayload: NEW_VERDICT });
  const card = page.locator(".vc-card").first();
  check(await card.locator(".vc-kw__chip--hit").count() === 6, "desktop: matched chips visible with NO click (capped 6)");
  check(await card.locator(".vc-kw__chip--miss").count() === 6, "desktop: missing chips visible with NO click (capped 6)");
  check(await card.locator(".vc-kw__toggle").textContent().then((t) => t === "Show all 15"), "desktop: quiet Show all toggle with total");
  await card.locator(".vc-kw__toggle").click();
  await page.waitForTimeout(300);
  check(await card.locator(".vc-kw__chip").count() === 15, "desktop: Show all expands to every chip");
  check(await card.locator(".vc-kw__toggle").textContent().then((t) => t === "Show fewer"), "desktop: toggle flips to Show fewer");
  check(await card.locator(".vc-sg__col--strengths .vc-sg__item").count() === 3, "desktop: 3 strengths render");
  check(await card.locator(".vc-sg__col--gaps .vc-sg__item").count() === 2, "desktop: 2 gaps render");
  const cols = await card.locator(".vc-sg").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  check(cols === 2, `desktop: checklist is two columns (${cols})`);
  check(await card.locator(".vc-btn--ghost").count() === 0, "desktop: View full fit analysis button is gone");
  check(await page.locator(".jpp-section__title", { hasText: "Keyword details" }).count() === 0, "desktop: old bottom Keyword details section removed");
  const cardText = await card.textContent();
  check(!/[–—]|\s-\s|--/.test(cardText), "desktop: no dash characters in the card");
  await shot(page, "desktop-new-shape");
  await context.close();
}

/* ── 2) New-shape verdict, phones ─────────────────────────────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await openDetail({ width, verdictPayload: NEW_VERDICT });
  const card = page.locator(".vc-card").first();
  check(await card.locator(".vc-kw__chip--hit").count() > 0, `phone ${width}px: chips visible without click`);
  const cols = await card.locator(".vc-sg").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  check(cols === 1, `phone ${width}px: checklist stacks to one column (${cols})`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  check(overflow, `phone ${width}px: no horizontal overflow`);
  if (width === 393) await shot(page, "phone-393-new-shape");
  await context.close();
}

/* ── 3) Legacy-shape verdict (no arrays) — graceful fallback ──── */
{
  const { context, page } = await openDetail({ width: 1280, verdictPayload: LEGACY_VERDICT });
  const card = page.locator(".vc-card").first();
  check(await card.locator(".vc-badge").isVisible(), "legacy: verdict badge renders");
  check(await card.locator(".vc-sg").count() === 0, "legacy: NO checklist rendered (arrays absent)");
  check(await card.locator(".vc-why__item").nth(2).textContent().then((t) => t.startsWith("Gap:")), "legacy: Gap line intact in the reasons list");
  check(await card.locator(".vc-kw__chip--hit").count() > 0, "legacy: chips still visible (UI-side data)");
  await shot(page, "desktop-legacy-shape");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
