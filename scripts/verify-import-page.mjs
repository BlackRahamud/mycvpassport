/* Verification harness for /employer/import — the drop-first bulk CV
   import (Import CVs Canvas 1a–1f). Serves the PRODUCTION build with a
   stubbed backend and checks, across 360 / 393 / 430 / 1280, light + dark:

   - the 5-tab bottom bar / rail carries the Import entry (no overflow)
   - Beat 1: the drop zone is the hero (glass sticky header + drop card)
   - the full flow with a real (tiny) PDF + stubbed AI:
       drop → reading (real extract/upload/structure) → a candidate card
       → pick a job → scoring on add → finish confirmation → Open the
       pipeline navigates into that job
   - dark theme renders the drop zone on dark tokens
   - the Candidates page "Add candidate" modal (unchanged shared picker)

   Usage: node scripts/verify-import-page.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/import-page";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const JOBS = [
  {
    id: JOB_ID,
    title: "IT support L1 Engineer (Dubai onsite)",
    status: "active", market: "gulf", kind: "standard", hr_id: HR_ID,
    source: "hr_portal", company: "Meridian Logistics", location: "Dubai",
    skills: ["Windows"], requirements: ["2+ years"], description: "First-line support.",
    created_at: "2026-06-20T08:00:00Z", posted_at: "2026-06-20T08:00:00Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333334",
    title: "Ready to deploy", status: "active", market: "india", kind: "pool",
    hr_id: HR_ID, source: "hr_portal", company: "", location: "",
    skills: [], requirements: [], description: "",
    created_at: "2026-06-22T08:00:00Z", posted_at: "2026-06-22T08:00:00Z",
  },
];

let jobsMode = "some"; // "some" | "none"

/* A valid single-page PDF pdf.js (unpdf) can extract text from, carrying
   > 200 chars so native extraction clears MIN_TEXT_LENGTH and the reading
   beat runs the REAL extract path in-browser (no OCR fallback). The text
   content itself is irrelevant — import_structure is stubbed — it only
   needs to be extractable. */
function makePdf(lines) {
  const parts = ["BT /F1 12 Tf 24 200 Td"];
  lines.forEach((ln, i) => {
    parts.push(`(${ln.replace(/[()\\]/g, " ")}) Tj`);
    if (i < lines.length - 1) parts.push("0 -14 Td");
  });
  parts.push("ET");
  const stream = parts.join("\n");
  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 320]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    `<</Length ${Buffer.byteLength(stream, "latin1")}>>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(body.length); body += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xrefStart = body.length;
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { xref += `${String(off).padStart(10, "0")} 00000 n \n`; });
  const trailer = `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(body + xref + trailer, "latin1");
}
const CV_PDF = makePdf([
  "Rohan Mehta - Software Engineer",
  "Dubai, United Arab Emirates - rohan@example.com",
  "Summary: IT support engineer with six years of experience",
  "across service desk, networking and Windows administration.",
  "Experience: L2 Service Desk Analyst, Meridian Logistics.",
  "Handled incident tickets, Active Directory and endpoint fixes.",
  "Skills: Windows, Networking, Active Directory, ITIL, Office 365.",
  "Education: Bachelor of Technology in Computer Science.",
  "Certifications: CompTIA A+, Microsoft Certified Fundamentals.",
  "Languages: English, Hindi. Available to join immediately.",
]);

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2", ".wasm": "application/wasm" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4183, r));

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
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("jobs")) rows = jobsMode === "some" ? JOBS : [];
  else if (t("applications")) rows = [];
  else rows = [];
  return JSON.stringify(wantsObject ? (rows[0] ?? null) : rows);
}

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    // AI edge endpoint — intercept BEFORE the static passthrough so the real
    // browser pipeline (extract → upload → structure → score) completes.
    // In production these are Vercel functions; the local static server has
    // no /api, so it would otherwise fall back to spa.html.
    if (url.pathname.startsWith("/api/ai")) {
      const action = url.searchParams.get("action");
      if (action === "import_structure") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ snapshot: { name: "Rohan Mehta", email: "rohan@example.com", phone: "+971500000000", skills: ["Windows", "Networking"], summary: "IT support engineer." } }) });
      }
      if (action === "candidate_verdict") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ score: 82, verdict: { label: "Strong Match" }, reasons: ["Windows", "Networking"] }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (url.port === "4183") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      // Bulk import commit RPC — echo back the count we were handed.
      if (url.pathname.includes("/rest/v1/rpc/import_candidates_batch")) {
        let n = 0;
        try { n = (JSON.parse(req.postData() || "{}").p_records || []).length; } catch { /* noop */ }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ inserted: n, skipped: 0, skipped_indices: [] }) });
      }
      if (url.pathname.includes("/rest/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      // storage upload + anything else on Supabase → benign 200
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function auditOverflow(page, label) {
  const res = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth }));
  check(res.doc <= res.vw + 1, `${label}: no horizontal overflow (scrollWidth ${res.doc} <= viewport ${res.vw})`);
}

const browser = await chromium.launch();

async function newPage(width, height = 852, theme = "light") {
  const context = await browser.newContext({ viewport: { width, height } });
  await stubRoutes(context);
  await context.addInitScript(([key, session, th]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
    sessionStorage.setItem("hr_welcome_ring_shown", "1");
  }, [`sb-${REF}-auth-token`, SESSION, theme]);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

/* ── 1) Drop-zone hero + full flow at 393 (light) ── */
{
  const { context, page } = await newPage(393);
  await page.goto("http://localhost:4183/employer/import", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  check(await page.locator(".imp-head__title").innerText() === "Import CVs", "393px: page renders");
  check(await page.locator(".imp-head").count() === 1, "393px: glass sticky header present");
  check(await page.locator(".imp-drop").count() === 1, "393px: drop zone is the hero (beat 1)");
  check((await page.locator(".imp-drop__title").innerText()).toLowerCase().includes("drop your cvs"), "393px: drop zone headline");
  await auditOverflow(page, "393px drop zone");
  await shot(page, "393-drop");

  // Drive the real reading pipeline with a tiny PDF.
  await page.setInputFiles(".imp-file", { name: "rohan-mehta-cv.pdf", mimeType: "application/pdf", buffer: CV_PDF });
  await page.waitForSelector(".imp-cand", { timeout: 15000 });
  // wait for the card to reach the ready state (spinner → check)
  await page.waitForFunction(() => {
    const sub = document.querySelector(".imp-cand__sub");
    return sub && /profile ready/i.test(sub.textContent || "");
  }, { timeout: 15000 });
  check((await page.locator(".imp-cand__name").first().innerText()).includes("Rohan Mehta"), "393px: reading produced a real candidate card");
  await auditOverflow(page, "393px reading");
  await shot(page, "393-reading");

  const choose = page.locator(".imp-panel__foot .imp-btn", { hasText: "Choose where they go" });
  check(await choose.isEnabled(), "393px: Choose where they go enabled once a candidate is ready");
  await choose.click();
  await page.waitForSelector(".imp-job", { timeout: 5000 });
  check(await page.locator(".imp-pick__title").count() === 1, "393px: beat 3 pick renders");
  check(await page.locator(".imp-job").count() === 2, "393px: both jobs listed as cards");
  check(await page.locator(".imp-pool").count() === 1, "393px: talent-pool secondary path present");
  await auditOverflow(page, "393px pick");
  await shot(page, "393-pick");

  await page.locator(".imp-job").first().click();
  // scoring on add → commit → finish
  await page.waitForSelector(".imp-confirm", { timeout: 15000 });
  const title = await page.locator(".imp-confirm__title").innerText();
  check(/1 candidate added to/i.test(title) && /IT support L1/i.test(title), "393px: finish confirms N added to the job");
  await shot(page, "393-finish");

  await page.locator(".imp-confirm .imp-btn", { hasText: "Open the pipeline" }).click();
  await page.waitForURL(`**/employer/jobs/${JOB_ID}`, { timeout: 5000 });
  check(page.url().includes(`/employer/jobs/${JOB_ID}`), "393px: Open the pipeline navigates into that job");
  await context.close();
}

/* ── 2) Drop zone across widths + dark theme, no overflow ── */
for (const w of [360, 430, 1280]) {
  const { context, page } = await newPage(w, 900);
  await page.goto("http://localhost:4183/employer/import", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check(await page.locator(".imp-drop").count() === 1, `${w}px: drop zone renders`);
  await auditOverflow(page, `${w}px drop zone`);
  await shot(page, `${w}-drop`);
  await context.close();
}
{
  // dark tokens applied to the page root
  const { context, page } = await newPage(393, 852, "dark");
  await page.goto("http://localhost:4183/employer/import", { waitUntil: "networkidle" });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.waitForTimeout(300);
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector(".imp-root")).backgroundColor);
  // dark page bg is #141320 → rgb(20, 19, 32); assert it is dark, not white
  const dark = /rgb\(\s*(\d+)/.exec(bg);
  check(!!dark && Number(dark[1]) < 60, `393px dark: page root uses dark tokens (${bg})`);
  await auditOverflow(page, "393px dark drop zone");
  await shot(page, "393-drop-dark");
  await context.close();
}

/* ── 3) bottom-bar Import tab (360) + rail active state (1280) ── */
{
  const { context, page } = await newPage(360);
  await page.goto("http://localhost:4183/employer/jobs", { waitUntil: "networkidle" });
  const importTab = page.locator(".hrs-navitem", { hasText: "Import" });
  check(await importTab.count() === 1, "360px: bottom bar has an Import tab");
  await auditOverflow(page, "360px jobs list (5-tab bar)");
  await context.close();
}
{
  const { context, page } = await newPage(1280, 800);
  await page.goto("http://localhost:4183/employer/import", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const active = page.locator(".hrs-navitem--active");
  check((await active.innerText()).includes("Import"), "1280px: rail highlights Import as active");
  await context.close();
}

/* ── 4) Candidates page "Add candidate" — unchanged shared picker ── */
{
  const { context, page } = await newPage(393);
  await page.goto("http://localhost:4183/employer/candidates", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.locator(".cand-add").click();
  await page.waitForTimeout(400);
  check(await page.locator(".itp-modal").count() === 1, "candidates 393px: Add candidate opens the shared picker modal");
  check(await page.locator(".itp-job").count() === 2, "candidates 393px: modal lists both jobs");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
