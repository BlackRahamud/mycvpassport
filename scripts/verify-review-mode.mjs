/* Review mode verification harness (candidate evaluation redesign).
   Serves the PRODUCTION build with a stubbed backend (same pattern as
   verify-jobs-landing.mjs / verify-cv-viewer.mjs), then drives:
   - desktop 1280: queue counter, Option A layout, JD always open,
     readiness rows, stored verdict, tabs (Original CV renders the real
     generated PDF through pdf.js), keyboard shortlist (ArrowRight),
     banner + toast + undo, knockout candidate (pill override, synthesis,
     screening knockout card, 5 flags), reject modal with required reason,
     all caught up card
   - not stated candidate: dashed Not stated fields + Request details
   - mobile 360/393/430: stacked layout, JD one tap away, full-width
     decision bar, no keyboard hints, horizontal-overflow audit
   - empty queue: Nothing to review + working Import CVs / View pipeline
   - pipeline page: header Review CTA, JD row, kanban New column lead CTA,
     list-view bulk bar with reason modal
   - dash scan on every new surface (no hyphen, en dash or em dash)
   Usage: node scripts/verify-review-mode.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/review-mode";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* ── fixtures ─────────────────────────────────────────────────── */
const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";

const JOB = {
  id: JOB_ID,
  hr_id: HR_ID,
  title: "IT Support Analyst L2",
  status: "active",
  posted_at: "2026-07-01T08:00:00Z",
  created_at: "2026-07-01T08:00:00Z",
  location: "Dubai",
  position: "onsite",
  market: "gulf",
  job_type: "full_time",
  salary_min: 4000,
  salary_max: 7000,
  currency: "AED",
  company: "Meridian Logistics",
  department: "IT",
  skills: ["Office 365", "Active Directory", "Cisco VLANs"],
  requirements: [
    "3 plus years in L2 IT support",
    "Hands on Office 365 administration",
    "Cisco switch and VLAN configuration",
    "Onsite in Dubai with weekend rotations",
    "UAE driving license preferred",
  ],
  description: "Provide L2 desktop, network and application support for a 400 seat facilities management group across Dubai. Onsite role with weekend rotations one week in four.",
  screening_questions: [
    {
      categoryKey: "background-check",
      questions: [
        { text: "Are you willing to work onsite in Dubai on a schedule that includes weekend rotations?", responseType: "yes-no", idealAnswer: "yes", mustHave: true },
        { text: "Do you hold a valid UAE driving license?", responseType: "yes-no", idealAnswer: "yes", mustHave: false },
      ],
    },
  ],
  kind: "active",
  source: "hr_portal",
};

const verdict = (score, v, why, strengths, gaps) => ({
  verdict: v, score, two_second_why: why, strengths, gaps,
  whatsapp_cta_template: "Hi, your profile stands out for our IT Support Analyst role. Are you open to a quick call?",
});

const APP_BASE = {
  job_id: JOB_ID,
  hr_id: HR_ID,
  status: "new",
  is_visible_to_hr: true,
  source: "organic",
  recruiter_notes: [],
  reject_reason: null,
};

const HAMMAD = {
  ...APP_BASE,
  id: "aaaaaaa1-1111-4111-8111-111111111111",
  candidate_id: "ca111111-1111-4111-8111-111111111111",
  candidate_name: "Hammad Hassan",
  candidate_email: "hammad@example.com",
  candidate_phone: "+971501234567",
  applied_at: "2026-07-10T08:00:00Z",
  ats_score: 88,
  score_source: "sonnet_verdict",
  cv_file_path: "ca111111/job-cv.pdf",
  match_keywords: ["Office 365", "Active Directory", "Cisco VLANs"],
  missing_keywords: ["ITIL"],
  ai_verdict: verdict(88, "STRONG FIT", [
    "Match: four years of L2 support with O365 admin and Cisco switch configuration, right on the role's core stack",
    "Corridor: already in Dubai on a visit visa with an ECNR passport, can convert in country",
    "Gap: no ITIL certification, though ticketing discipline shows clearly in the CV",
  ], ["O365 admin across 300 plus seats", "Cisco Catalyst VLAN configuration", "Immediate start, already in Dubai"],
  ["No ITIL Foundation certification", "Azure AD experience is light"]),
  screening_answers: [
    { answer: "Yes, comfortable with onsite work and weekend rotations.", status: "pass" },
    { answer: "Yes, valid UAE light vehicle license.", status: "pass" },
  ],
  cv_snapshot: {
    name: "Hammad Hassan",
    desired_job: "System Administrator L2",
    location: "Deira, Dubai",
    nationality: "Indian",
    summary: "System administrator with four years across Dubai and Pune. Runs O365 tenants, Active Directory and Cisco networks for a 300 seat facilities group. Holds an ECNR passport.",
    visa_status: "Visit visa, 30 days remaining",
    notice_period: "Immediate",
    salary_expectation: "AED 5,500",
    skills: ["Office 365", "Active Directory", "Cisco", "VLANs", "Windows Server 2019", "ServiceNow"],
    experience: [
      { title: "System Administrator L2", company: "Emirates Facilities Group", location: "Dubai", start_date: "2023", end_date: "present" },
      { title: "IT Support Engineer", company: "Wipro", location: "Pune", start_date: "2020", end_date: "2023" },
    ],
  },
};

const FAISAL = {
  ...APP_BASE,
  id: "aaaaaaa2-2222-4222-8222-222222222222",
  candidate_id: "ca222222-2222-4222-8222-222222222222",
  candidate_name: "Faisal Khan",
  candidate_email: "faisal@example.com",
  candidate_phone: "+971509876543",
  applied_at: "2026-07-12T02:00:00Z",
  ats_score: 80,
  score_source: "sonnet_verdict",
  cv_file_path: null,
  match_keywords: ["Desktop support", "LAN", "Office 365"],
  missing_keywords: ["Cisco VLANs", "UAE driving license"],
  ai_verdict: verdict(80, "MAYBE", [
    "Match: five years of desktop and network support across Sharjah SMEs, solid L2 fundamentals",
    "Corridor: already in the UAE with a 1 month notice, but visa status is not stated on the CV",
    "Gap: no UAE driving license, which the role prefers for field visits",
  ], ["Hands on desktop, printer and LAN support", "In the UAE with a 1 month notice"],
  ["Visa status and salary expectation not stated", "No UAE driving license"]),
  screening_answers: [
    { answer: "Yes, onsite is fine for me.", status: "pass" },
    { answer: "No, currently using public transport.", status: "neutral" },
  ],
  cv_snapshot: {
    name: "Faisal Khan",
    desired_job: "IT Support Engineer",
    location: "Sharjah, UAE",
    summary: "IT support engineer with five years across Sharjah trading and logistics SMEs. Broad desktop, printer and LAN coverage with basic O365 user administration.",
    notice_period: "1 month",
    skills: ["Desktop support", "Office 365", "LAN", "Printers", "Windows 11"],
    experience: [
      { title: "IT Support Engineer", company: "Al Noor Trading", location: "Sharjah", start_date: "2022", end_date: "present" },
    ],
  },
};

const ROHAN = {
  ...APP_BASE,
  id: "aaaaaaa3-3333-4333-8333-333333333333",
  candidate_id: "ca333333-3333-4333-8333-333333333333",
  candidate_name: "Rohan Mehta",
  candidate_email: "rohan@example.com",
  candidate_phone: "+919812345678",
  applied_at: "2026-07-11T08:00:00Z",
  ats_score: 78,
  score_source: "sonnet_verdict",
  cv_file_path: null,
  visa_status: "Needs sponsorship",
  match_keywords: ["Windows Server", "Networking", "VMware"],
  missing_keywords: ["Office 365 admin", "Onsite availability"],
  ai_verdict: verdict(78, "MAYBE", [
    "Match: strong systems engineering depth, six years across Windows and network infrastructure",
    "Corridor: based in Bengaluru, needs employment visa sponsorship with an ECR passport, expect six to eight weeks before start",
    "Gap: salary ask of AED 9,500 sits well above the AED 4,000 to 7,000 budget",
  ], ["Six years on Windows Server and VMware estates", "Enterprise network troubleshooting at scale"],
  ["Salary expectation AED 9,500 against a 7,000 ceiling", "Declined onsite weekend rotations in screening"]),
  screening_answers: [
    { answer: "I am looking for remote or hybrid options initially, but can relocate if the package matches my expectation of 9.5k AED.", status: "fail" },
    { answer: "No.", status: "neutral" },
  ],
  cv_snapshot: {
    name: "Rohan Mehta",
    desired_job: "Systems Engineer",
    location: "Bengaluru, India",
    nationality: "Indian",
    summary: "Systems engineer with six years in Bengaluru enterprise environments. Deep on Windows Server, VMware and datacenter networking. Holds an ECR passport.",
    notice_period: "60 days",
    salary_expectation: "AED 9,500 plus family medical and annual ticket",
    skills: ["Windows Server", "VMware", "Networking", "Linux", "PowerShell"],
    experience: [
      { title: "Systems Engineer", company: "Infosys", location: "Bengaluru", start_date: "2022", end_date: "present" },
    ],
  },
};

const APPS = [HAMMAD, FAISAL, ROHAN];
const REVIEWED_APPS = [
  { ...HAMMAD, id: "bbbbbbb1-1111-4111-8111-111111111111", status: "shortlisted" },
  { ...ROHAN, id: "bbbbbbb2-2222-4222-8222-222222222222", status: "rejected" },
];

/* ── generated one-page CV pdf for the Original CV tab ─────────── */
async function makeCvPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.09, 0.1);
  const page = doc.addPage([595, 842]);
  page.drawText("Hammad Hassan", { x: 56, y: 770, size: 26, font: bold, color: ink });
  page.drawText("System Administrator L2, Dubai", { x: 56, y: 744, size: 12, font, color: rgb(0.45, 0.45, 0.5) });
  page.drawText("EXPERIENCE", { x: 56, y: 700, size: 12, font: bold, color: ink });
  page.drawText("System Administrator L2, Emirates Facilities Group (2023 to present)", { x: 56, y: 680, size: 10.5, font, color: ink });
  page.drawText("IT Support Engineer, Wipro, Pune (2020 to 2023)", { x: 56, y: 662, size: 10.5, font, color: ink });
  return Buffer.from(await doc.save());
}

/* ── static server for build/ ─────────────────────────────────── */
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

function pgrest(url, accept, apps) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("applications")) rows = apps;
  else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context, { apps = APPS } = {}) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.port === "4187") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      }
      if (url.pathname.includes("/auth/v1/token")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      }
      if (url.pathname.includes("/storage/v1/object/sign/")) {
        const rel = url.pathname.replace("/storage/v1", "") + "?token=stub";
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: rel }) });
      }
      if (url.pathname.includes("/storage/v1/object/")) {
        return route.fulfill({ status: 200, contentType: "application/pdf", body: pdfBytes });
      }
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() !== "GET" || url.pathname.includes("/rpc/")) {
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept, apps) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) {
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
  check(!/[-–—]/.test(txt), `${label}: no dash characters`);
}

const pdfBytes = await makeCvPdf();
const browser = await chromium.launch();

async function newPage({ width, apps = APPS }) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce", // deterministic flows; motion paths are gated in-code
  });
  await stubRoutes(context, { apps });
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const REVIEW_URL = `http://localhost:4187/employer/jobs/${JOB_ID}/review`;

/* ── 1) desktop flow ──────────────────────────────────────────── */
{
  const { context, page } = await newPage({ width: 1280 });
  await page.goto(REVIEW_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  check(await page.locator(".rvm-topbar__job").textContent() === "IT Support Analyst L2", "desktop: job title in top bar");
  check((await page.locator(".rvm-topbar__counter").textContent()) === "Candidate 1 of 3", "desktop: N of M counter");
  check((await page.locator(".rvm-id__name").textContent()) === "Hammad Hassan", "desktop: best match first (Hammad, 88)");

  /* JD always open on desktop, no collapse affordance */
  check(await page.locator(".jdp__desc").first().isVisible(), "desktop: JD panel open");
  check((await page.locator(".rvm-right .jdp__chev").count()) === 0, "desktop: JD has no collapse chevron");
  check(await page.getByText("weekend rotations one week in four").isVisible(), "desktop: JD text renders");

  /* readiness */
  check((await page.locator(".rvm-readiness__row").count()) === 5, "desktop: five readiness rows");
  check(await page.getByText("Within budget").isVisible(), "desktop: salary within budget note");
  check((await page.locator(".rvm-readiness__value--flag").count()) === 0, "desktop: clean candidate has no flags");

  /* stored verdict renders instantly */
  check((await page.locator(".vc-badge").textContent()) === "Strong Match", "desktop: verdict badge Strong Match");
  check((await page.locator(".vc-ring__num").textContent()) === "88", "desktop: score ring shows 88");
  check((await page.locator(".vc-ko").count()) === 0, "desktop: no knockout synthesis on clean candidate");

  /* tabs: default Parsed CV; Original CV renders the PDF via pdf.js */
  check((await page.locator(".rvm-tab").count()) === 4, "desktop: four tabs");
  check((await page.locator(".rvm-tab--active").textContent())?.includes("Parsed CV"), "desktop: Parsed CV default tab");
  check(await page.getByText("System administrator with four years").isVisible(), "desktop: parsed summary renders");
  await page.getByRole("tab", { name: "Original CV" }).click();
  await page.waitForSelector(".rvm-sheet canvas", { timeout: 20000 });
  check((await page.locator(".rvm-sheet canvas").count()) >= 1, "desktop: Original CV renders pdf.js canvas");
  /* sheets flow with the page — no inner scrollbox slicing the CV */
  const stageScroll = await page.evaluate(() => {
    const el = document.querySelector(".rvm-original__stage");
    if (!el) return null;
    const s = getComputedStyle(el);
    return { overflowY: s.overflowY, clipped: el.scrollHeight > el.clientHeight + 4 };
  });
  check(stageScroll && stageScroll.overflowY === "visible" && !stageScroll.clipped, "desktop: CV sheets flow with the page, no inner scrollbox");
  await shot(page, "desktop-original-cv");
  /* the full money screen is one click away */
  await page.getByRole("button", { name: "Open CV viewer" }).click();
  await page.waitForSelector(".cvv-shell", { timeout: 20000 });
  check((await page.locator(".cvv-shell").count()) === 1, "desktop: Open CV viewer launches the full overlay");
  await page.waitForSelector(".cvv-page canvas", { timeout: 20000 });
  check((await page.locator(".cvv-page canvas").count()) >= 1, "desktop: overlay renders the same pdf");
  await shot(page, "desktop-cv-overlay");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  check((await page.locator(".cvv-shell").count()) === 0, "desktop: Escape closes the overlay");
  check((await page.locator(".rvm-topbar__counter").textContent()) === "Candidate 1 of 3", "desktop: Escape did not decide or advance");
  await page.getByRole("tab", { name: "Screening" }).click();
  check((await page.locator(".rvm-screen__chip--pass").count()) === 2, "desktop: screening passes render");

  /* decision bar with keyboard hints */
  check(await page.locator(".rvm-decide--shortlist").isVisible(), "desktop: Shortlist button");
  check((await page.locator(".rvm-key").count()) === 2, "desktop: keyboard hints visible");
  await dashScan(page, ".rvm-left", "desktop candidate column");
  await dashScan(page, ".rvm-right", "desktop JD column");
  await dashScan(page, ".rvm-bar", "desktop decision bar");
  await shot(page, "desktop-candidate-1");

  /* keyboard shortlist (v1.5) → banner + toast + auto advance */
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  check(await page.locator(".rvm-banner--shortlist").isVisible(), "desktop: shortlist banner appears");
  check(await page.locator(".rvm-toast").isVisible(), "desktop: toast with Undo appears");
  await page.waitForTimeout(1400);
  check((await page.locator(".rvm-topbar__counter").textContent()) === "Candidate 2 of 3", "desktop: auto advanced to candidate 2");
  check((await page.locator(".rvm-id__name").textContent()) === "Faisal Khan", "desktop: next best match (Faisal, 80)");

  /* undo from the toast returns to the decided candidate */
  await page.locator(".rvm-toast button").click();
  await page.waitForTimeout(700);
  check((await page.locator(".rvm-id__name").textContent()) === "Hammad Hassan", "desktop: undo returns to Hammad");
  check((await page.locator(".rvm-banner").count()) === 0, "desktop: banner cleared after undo");

  /* decide again and land on Faisal: Not stated treatment */
  await page.locator(".rvm-decide--shortlist").click();
  await page.waitForTimeout(1500);
  check((await page.locator(".rvm-id__name").textContent()) === "Faisal Khan", "desktop: back on Faisal");
  check((await page.locator(".rvm-readiness__value--missing").count()) === 3, "desktop: three Not stated fields");
  check(await page.getByRole("button", { name: "Request details" }).isVisible(), "desktop: Request details action");
  await page.getByRole("tab", { name: "Original CV" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("No uploaded CV file").isVisible(), "desktop: missing file state is honest");
  await shot(page, "desktop-not-stated");

  /* decide Faisal too; the queue auto loads the knockout candidate */
  await page.locator(".rvm-decide--shortlist").click();
  await page.waitForTimeout(1500);
  check((await page.locator(".rvm-id__name").textContent()) === "Rohan Mehta", "desktop: candidate 3 is Rohan");
  check((await page.locator(".vc-badge").textContent()) === "Skills fit, not deployable", "desktop: knockout pill overrides headline");
  check(await page.locator(".vc-ko").isVisible(), "desktop: knockout synthesis line renders");
  check((await page.locator(".vc-ring__num").textContent()) === "78", "desktop: skill score stays visible on knockout");
  check(await page.locator(".rvm-kocard").isVisible(), "desktop: screening knockout card next to verdict");
  const flagHead = await page.locator(".rvm-card__eyebrow--danger").textContent();
  check(/5 flags/.test(flagHead || ""), `desktop: readiness header counts flags ("${flagHead}")`);
  check((await page.locator(".rvm-tab__flag").count()) === 1, "desktop: Screening tab carries the knockout dot");
  await dashScan(page, ".rvm-left", "desktop knockout column");
  await shot(page, "desktop-knockout");

  /* reject flow: reason required, honest note, banner, advance to done */
  await page.keyboard.press("ArrowLeft"); // v1.5: left opens reject
  await page.waitForTimeout(250);
  check(await page.locator(".rvm-modal").isVisible(), "desktop: reject modal opens (ArrowLeft)");
  check(await page.getByRole("button", { name: "Reject candidate" }).isDisabled(), "desktop: confirm disabled without a reason");
  check((await page.locator(".rvm-reason").count()) === 7, "desktop: seven reason codes");
  await dashScan(page, ".rvm-modal", "desktop reject modal");
  await shot(page, "desktop-reject-modal");
  await page.getByRole("radio", { name: "Salary mismatch" }).click();
  await page.getByRole("button", { name: "Reject candidate" }).click();
  await page.waitForTimeout(250);
  check(await page.getByText("Rejected: Salary mismatch.", { exact: false }).isVisible(), "desktop: reject banner with reason");
  await page.waitForTimeout(1500);

  /* all three decided → all caught up */
  check(await page.getByText("All caught up").isVisible(), "desktop: all caught up card");
  check(await page.getByText("2 shortlisted, 1 rejected", { exact: false }).isVisible(), "desktop: session summary");
  check(await page.getByRole("button", { name: "Undo last decision" }).isVisible(), "desktop: undo still available when done");
  await dashScan(page, ".rvm-done", "desktop done card");
  await shot(page, "desktop-done");
  await page.getByRole("button", { name: "View pipeline" }).click();
  await page.waitForTimeout(600);
  check(page.url().includes(`/employer/jobs/${JOB_ID}`), `desktop: View pipeline navigates (${page.url()})`);
  await auditOverflow(page, "desktop 1280");
  await context.close();
}

/* ── 2) mobile widths: stacked, JD one tap away ───────────────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await newPage({ width });
  await page.goto(REVIEW_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  check((await page.locator(".rvm-topbar__counter").textContent()) === "Candidate 1 of 3", `mobile ${width}: counter`);
  check((await page.locator(".rvm-key").count()) === 0, `mobile ${width}: no keyboard hints`);
  check(await page.locator(".rvm-decide--shortlist").isVisible(), `mobile ${width}: decision bar present`);

  /* JD collapsed by default, one tap opens it */
  check((await page.locator(".rvm-right .jdp__chev").count()) === 1, `mobile ${width}: JD collapse chevron`);
  check((await page.locator(".jdp__desc").count()) === 0, `mobile ${width}: JD starts collapsed`);
  await page.locator(".jdp__head").click();
  await page.waitForTimeout(350);
  check(await page.locator(".jdp__desc").first().isVisible(), `mobile ${width}: JD opens on tap`);
  await page.locator(".jdp__head").click();
  await page.waitForTimeout(350);

  await auditOverflow(page, `mobile ${width}`);
  await dashScan(page, ".rvm-left", `mobile ${width} candidate column`);
  await shot(page, `mobile-${width}`);

  /* reject modal becomes a bottom sheet */
  if (width === 393) {
    await page.locator(".rvm-decide--reject").click();
    await page.waitForTimeout(300);
    check(await page.locator(".rvm-modal--sheet").isVisible(), "mobile 393: reject modal is a bottom sheet");
    await auditOverflow(page, "mobile 393 with sheet");
    await shot(page, "mobile-393-reject-sheet");
  }
  await context.close();
}

/* ── 3) empty queue: nothing to review ────────────────────────── */
{
  const { context, page } = await newPage({ width: 1280, apps: REVIEWED_APPS });
  await page.goto(REVIEW_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  check(await page.getByText("Nothing to review").isVisible(), "empty: Nothing to review card");
  check(await page.getByText("1 active, 1 rejected", { exact: false }).isVisible(), "empty: honest reviewed summary");
  await dashScan(page, ".rvm-done", "empty state card");
  await shot(page, "empty-queue");
  await page.getByRole("button", { name: "Import CVs" }).click();
  await page.waitForTimeout(600);
  check(page.url().includes("/employer/import"), `empty: Import CVs navigates (${page.url()})`);
  await context.close();
}

/* ── 4) pipeline page: header CTA, JD row, New column, bulk bar ── */
{
  const { context, page } = await newPage({ width: 1280 });
  await page.goto(`http://localhost:4187/employer/jobs/${JOB_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  check(await page.locator(".jpp-review-cta").isVisible(), "pipeline: header Review CTA");
  check((await page.locator(".jpp-review-cta").textContent())?.includes("Review 3 new"), "pipeline: CTA counts new applicants");
  check(await page.locator(".jpp-jdrow .jdp").isVisible(), "pipeline: collapsible JD row under header");
  check((await page.locator(".jpp-jdrow .jdp__desc").count()) === 0, "pipeline: header JD collapsed by default");

  /* kanban: New column with lead CTA, To interview rename */
  check(await page.getByLabel("New, 3 candidates").isVisible(), "pipeline: New column holds all three");
  check(await page.getByLabel("To interview, 0 candidates").isVisible(), "pipeline: Ready renamed To interview");
  check(await page.locator(".jpp-kb-col__review").isVisible(), "pipeline: New column Review CTA");
  await shot(page, "pipeline-kanban-new");
  await page.locator(".jpp-kb-col__review").click();
  await page.waitForTimeout(600);
  check(page.url().includes("/review"), `pipeline: kanban CTA opens review mode (${page.url()})`);
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  /* list view: bulk select + bulk bar + reason modal */
  await page.getByRole("tab", { name: "List" }).click();
  await page.waitForTimeout(500);
  check(await page.getByText("New applicants · 3").isVisible(), "pipeline list: New tab header with count");
  check(await page.getByText("Sorted best match first").isVisible(), "pipeline list: sort caption");
  const checks = page.locator(".jpp-card__check");
  await checks.nth(0).click();
  await checks.nth(1).click();
  await page.waitForTimeout(300);
  check(await page.locator(".jpp-bulkbar").isVisible(), "pipeline list: bulk bar appears");
  check((await page.locator(".jpp-bulkbar__count").textContent()) === "2 selected", "pipeline list: selection count");
  check(await page.getByRole("button", { name: "Shortlist 2" }).isVisible(), "pipeline list: bulk shortlist button");
  await shot(page, "pipeline-list-bulk");
  await page.locator(".jpp-bulkbar__btn--ghost").click();
  await page.waitForTimeout(300);
  check((await page.locator(".jpp-reason").count()) === 7, "pipeline list: bulk reject reasons");
  check(await page.getByRole("button", { name: "Reject 2" }).isDisabled(), "pipeline list: bulk reject needs a reason");
  await page.getByRole("radio", { name: "Visa not viable" }).click();
  await page.getByRole("button", { name: "Reject 2" }).click();
  await page.waitForTimeout(500);
  check((await page.locator(".jpp-bulkbar").count()) === 0, "pipeline list: bulk bar clears after action");
  check(await page.getByText("New applicants · 1").isVisible(), "pipeline list: rejected cards leave the New bucket");
  await shot(page, "pipeline-list-after-bulk");
  await auditOverflow(page, "pipeline 1280");
  await context.close();
}

/* ── 5) pipeline board on a phone: one stage at a time ────────── */
{
  const { context, page } = await newPage({ width: 393 });
  await page.goto(`http://localhost:4187/employer/jobs/${JOB_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  /* phones default to list view; switch to Board to check the pager */
  await page.getByRole("tab", { name: "Board" }).click();
  await page.waitForTimeout(500);
  check(await page.locator(".jpp-kbm-chips").isVisible(), "phone board: stage chip pager");
  const newChip = page.locator(".jpp-kbm-chip--new");
  check(await newChip.isVisible(), "phone board: New chip first");
  check((await page.locator(".jpp-kbm-chip--active").textContent())?.includes("New"), "phone board: New active by default");
  check(await page.locator(".jpp-kb-col__review").isVisible(), "phone board: Review CTA above the New cards");
  await auditOverflow(page, "phone board 393");
  await shot(page, "pipeline-phone-board");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
