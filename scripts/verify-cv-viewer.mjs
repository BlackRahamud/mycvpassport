/* CV viewer verification harness.
   Serves the PRODUCTION build, injects a fake recruiter session, and stubs
   every Supabase/AI endpoint so the real bundle renders the pipeline page
   with fixture data and a real generated PDF. Screenshots each state.
   Usage: node verify-cv-viewer.tmp.mjs <outDir> [--browser=firefox] [--fail-storage] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium, firefox } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2];
const USE_FIREFOX = process.argv.includes("--browser=firefox");
const FAIL_STORAGE = process.argv.includes("--fail-storage");

/* ── fixture data ─────────────────────────────────────────────── */
const HR_ID = "11111111-1111-4111-8111-111111111111";
const CAND_ID = "22222222-2222-4222-8222-222222222222";
const JOB = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "Operations Manager",
  status: "active",
  posted_at: "2026-06-20T08:00:00Z",
  created_at: "2026-06-20T08:00:00Z",
  location: "Dubai, UAE",
  market: "gulf",
  job_type: "Full-time",
  salary_min: 14000,
  salary_max: 18000,
  currency: "AED",
  hr_id: HR_ID,
  company: "Meridian Logistics",
  department: "Operations",
  skills: ["Logistics", "Fleet management", "SAP", "Team leadership"],
  requirements: ["5+ years GCC logistics", "SAP MM", "Fleet ops"],
  description: "Own daily operations across our Jebel Ali hub.",
  screening_questions: [],
  kind: "standard",
};
const APPLICATION = {
  id: "44444444-4444-4444-8444-444444444444",
  job_id: JOB.id,
  candidate_id: CAND_ID,
  candidate_name: "Ayesha Rahman",
  candidate_email: "ayesha.rahman@example.com",
  candidate_phone: "+971501234567",
  cv_snapshot: {
    personal: { location: "Dubai, UAE", headline: "Senior Operations Lead" },
    skills: ["Logistics", "SAP", "Fleet management", "Vendor negotiation", "Route planning"],
    experience: [
      { title: "Operations Lead", company: "Gulf Freight LLC", start_date: "2021", end_date: "Present" },
      { title: "Ops Coordinator", company: "TransIndia Cargo", start_date: "2017", end_date: "2021" },
    ],
    education: [{ degree: "BBA", institution: "University of Mumbai", end_date: "2016" }],
    notice_period: "30 days",
  },
  cv_file_path: `${CAND_ID}/${JOB.id}-1719900000000.pdf`,
  ats_score: 82,
  match_keywords: ["logistics", "SAP", "fleet management", "team leadership"],
  missing_keywords: ["arabic", "dangerous goods cert"],
  score_source: "stopgap_keyword",
  source: "applied",
  status: "new",
  recruiter_notes: [],
  applied_at: "2026-06-28T10:30:00Z",
  viewed_at: null,
  updated_at: "2026-06-28T10:30:00Z",
  is_visible_to_hr: true,
  visa_status: "Visit visa",
};
const VERDICT = {
  verdict: "STRONG FIT",
  score: 86,
  two_second_why: [
    "5+ yrs GCC logistics with SAP MM — direct match for the Jebel Ali hub role.",
    "Already in Dubai on a visit visa — can interview this week, 30-day notice.",
    "No Arabic and no DG certification — plan around documentation-heavy lanes.",
  ],
  whatsapp_cta_template: "Hi Ayesha, your operations profile stands out for our Operations Manager role…",
};

/* ── generated 2-page CV pdf ──────────────────────────────────── */
async function makeCvPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.09, 0.1);
  const grey = rgb(0.45, 0.45, 0.5);
  const page1 = doc.addPage([595, 842]);
  page1.drawText("Ayesha Rahman", { x: 56, y: 770, size: 26, font: bold, color: ink });
  page1.drawText("Senior Operations Lead — Dubai, UAE", { x: 56, y: 744, size: 12, font, color: grey });
  page1.drawLine({ start: { x: 56, y: 728 }, end: { x: 539, y: 728 }, thickness: 1, color: rgb(0.88, 0.88, 0.9) });
  let y = 700;
  const section = (t) => { page1.drawText(t, { x: 56, y, size: 12, font: bold, color: ink }); y -= 20; };
  const line = (t) => { page1.drawText(t, { x: 56, y, size: 10.5, font, color: ink }); y -= 16; };
  section("EXPERIENCE");
  line("Operations Lead — Gulf Freight LLC, Dubai (2021 – Present)");
  line("• Ran 40-vehicle fleet across Jebel Ali & DIP; cut idle hours 22%.");
  line("• Led SAP MM rollout for warehouse ops; trained a team of 14.");
  y -= 8;
  line("Ops Coordinator — TransIndia Cargo, Mumbai (2017 – 2021)");
  line("• Managed customs documentation for 300+ monthly shipments.");
  y -= 12;
  section("SKILLS");
  line("Logistics · SAP MM · Fleet management · Vendor negotiation · Route planning");
  y -= 12;
  section("EDUCATION");
  line("BBA — University of Mumbai (2016)");
  const page2 = doc.addPage([595, 842]);
  page2.drawText("Certifications & References", { x: 56, y: 770, size: 16, font: bold, color: ink });
  page2.drawText("RTA light vehicle licence · Six Sigma yellow belt", { x: 56, y: 740, size: 10.5, font, color: ink });
  page2.drawText("References available on request.", { x: 56, y: 720, size: 10.5, font, color: grey });
  return Buffer.from(await doc.save());
}

/* ── static file server for build/ (spa.html fallback) ────────── */
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
await new Promise((r) => server.listen(4179, r));

/* ── stubbed backend ──────────────────────────────────────────── */
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

function pgrest(url, accept) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("applications")) rows = [APPLICATION];
  else rows = []; // interviews, candidate_events, shares, outreach…
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context, pdfBytes) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();

    if (url.pathname.startsWith("/api/ai")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VERDICT) });
    }
    if (url.port === "4179") return route.continue();

    // analytics + third parties: silence
    if (/posthog|clarity|google|gstatic|doubleclick|vercel/.test(url.hostname)) return route.abort();

    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      }
      if (url.pathname.includes("/auth/v1/token")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      }
      if (url.pathname.includes("/rest/v1/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      }
      if (url.pathname.includes("/storage/v1/object/sign/")) {
        if (FAIL_STORAGE) return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "stub", message: "Object not found" }) });
        const rel = url.pathname.replace("/storage/v1", "") + "?token=stub";
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: rel }) });
      }
      if (url.pathname.includes("/storage/v1/object/")) {
        if (FAIL_STORAGE) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "stub", message: "Object not found" }) });
        return route.fulfill({ status: 200, contentType: "application/pdf", body: pdfBytes });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }

    if (url.pathname.startsWith("/api/ai")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VERDICT) });
    }
    if (url.pathname.startsWith("/api/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

/* ── run ──────────────────────────────────────────────────────── */
const pdfBytes = await makeCvPdf();
const engine = USE_FIREFOX ? firefox : chromium;
const tag = USE_FIREFOX ? "ff" : "cr";
const browser = await engine.launch();

async function newPage({ width = 1440, height = 900, theme = "light", reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await stubRoutes(context, pdfBytes);
  await context.addInitScript(([key, session, th]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
  }, [`sb-${REF}-auth-token`, SESSION, theme]);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${tag} pageerror]`, e.message));
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${tag}-${name}.png`) });

if (FAIL_STORAGE) {
  const { context, page } = await newPage();
  await page.goto(`http://localhost:4179/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await page.getByText("Ayesha Rahman").first().click(); // open the candidate detail
  await page.getByText("View CV", { exact: false }).first().click();
  await page.getByText(/couldn.t load this cv/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await shot(page, "error-retry");
  console.log("error state: honest error + retry rendered ✓");
  await context.close();
} else {
  // 1) desktop light — entrance mid-state + settled
  const { context, page } = await newPage();
  await page.goto(`http://localhost:4179/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shot(page, "pipeline-before");
  await page.getByText("Ayesha Rahman").first().click(); // open the candidate detail
  await page.getByText("View CV", { exact: false }).first().click();
  await page.waitForTimeout(140); // mid-entrance
  await shot(page, "open-mid");
  await page.locator(".cvv-page canvas").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1400); // stagger + ring + verdict settle
  await shot(page, "open-settled");

  // zoom in twice → zoom render state
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(700);
  await shot(page, "zoomed");

  // Esc closes
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const gone = await page.locator(".cvv-shell").count();
  console.log(`esc closes overlay: ${gone === 0 ? "✓" : "✗ STILL OPEN"}`);
  await shot(page, "closed");
  await context.close();

  // 2) global dark theme — overlay must stay the portal's light surface
  const d = await newPage({ theme: "dark" });
  await d.page.goto(`http://localhost:4179/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await d.page.getByText("Ayesha Rahman").first().click();
  await d.page.getByText("View CV", { exact: false }).first().click();
  await d.page.locator(".cvv-page canvas").first().waitFor({ timeout: 20000 });
  await d.page.waitForTimeout(1200);
  await shot(d.page, "global-dark");
  await d.context.close();

  // 3) narrow — stacked, intel collapsed then expanded
  const m = await newPage({ width: 393, height: 852 });
  await m.page.goto(`http://localhost:4179/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await m.page.getByText("Ayesha Rahman").first().click();
  await m.page.getByText("View CV", { exact: false }).first().click();
  await m.page.locator(".cvv-page canvas").first().waitFor({ timeout: 20000 });
  await m.page.waitForTimeout(900);
  await shot(m.page, "narrow-collapsed");
  await m.page.getByRole("button", { name: /candidate intelligence/i }).click();
  await m.page.waitForTimeout(700);
  await shot(m.page, "narrow-expanded");
  await m.context.close();

  // 4) reduced motion sanity
  const r = await newPage({ reducedMotion: "reduce" });
  await r.page.goto(`http://localhost:4179/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await r.page.getByText("Ayesha Rahman").first().click();
  await r.page.getByText("View CV", { exact: false }).first().click();
  await r.page.locator(".cvv-page canvas").first().waitFor({ timeout: 20000 });
  await r.page.waitForTimeout(600);
  await shot(r.page, "reduced-motion");
  await r.context.close();
}

await browser.close();
server.close();
console.log("done");
