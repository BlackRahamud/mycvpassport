/* Investor-video capture harness.
   Serves the PRODUCTION build, injects a fake recruiter session, and stubs
   every Supabase/AI endpoint so the real bundle renders the full recruiter
   journey with fixture data: post a job → candidates arrive → screen →
   shortlist → schedule interview. Screenshots each beat at 2x and records
   webm clips of the motion moments (wizard typing, publish, schedule).

   All people/companies are fictional. No production data is touched.

   Usage: node scripts/capture-investor-video.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, copyFileSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "video-assets/captures";
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "clips"), { recursive: true });

/* ── fixture data (all fictional) ─────────────────────────────── */
const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const COMPANY = "Horizon Facilities Group";

const JOB = {
  id: JOB_ID,
  title: "Operations Manager",
  status: "active",
  kind: "active",
  posted_at: "2026-07-07T09:00:00Z",
  created_at: "2026-07-07T09:00:00Z",
  location: "Dubai, UAE",
  market: "gulf",
  position: "onsite",
  job_type: "full-time",
  salary_min: 14000,
  salary_max: 18000,
  currency: "AED",
  salary_unit: "per month",
  hr_id: HR_ID,
  company: COMPANY,
  department: "Operations",
  skills: ["Logistics", "Fleet management", "SAP", "Team leadership"],
  tools: ["SAP MM", "Excel"],
  requirements: ["5+ years GCC operations", "SAP MM", "Fleet ops"],
  description:
    "Own daily operations across our Jebel Ali hub. Lead a 14-person team, run fleet and vendor performance, and report weekly to the regional director.",
  screening_questions: [],
  source: "hr_portal",
};

const JOB2 = {
  ...JOB,
  id: "33333333-3333-4333-8333-333333333334",
  title: "Guest Services Team Lead",
  posted_at: "2026-06-24T09:00:00Z",
  created_at: "2026-06-24T09:00:00Z",
  salary_min: 9000,
  salary_max: 12000,
  skills: ["Front office", "OPERA", "Guest relations"],
  description: "Lead the front-office guest services team at our flagship property.",
};

const mkApp = (n, id, name, email, phone, score, status, appliedH, cv) => ({
  id: `44444444-4444-4444-8444-44444444444${n}`,
  hr_id: HR_ID,
  job_id: id,
  candidate_id: `22222222-2222-4222-8222-22222222222${n}`,
  candidate_name: name,
  candidate_email: email,
  candidate_phone: phone,
  cv_snapshot: cv,
  cv_file_path: `22222222-2222-4222-8222-22222222222${n}/${JOB_ID}-1719900000000.pdf`,
  ats_score: score,
  match_keywords: ["logistics", "SAP", "fleet management", "team leadership"].slice(0, 2 + (n % 3)),
  missing_keywords: n < 3 ? [] : ["dangerous goods cert"],
  score_source: "stopgap_keyword",
  source: "applied",
  status,
  recruiter_notes: [],
  applied_at: new Date(Date.parse("2026-07-07T12:00:00Z") - appliedH * 3600e3).toISOString(),
  viewed_at: null,
  updated_at: new Date(Date.parse("2026-07-07T12:00:00Z") - appliedH * 3600e3).toISOString(),
  is_visible_to_hr: true,
  visa_status: n % 2 ? "Visit visa" : "Employment visa",
});

const CV_RAHUL = {
  personal: { location: "Dubai, UAE", headline: "Senior Operations Lead" },
  skills: ["Logistics", "SAP MM", "Fleet management", "Vendor negotiation", "Route planning"],
  experience: [
    { title: "Operations Lead", company: "Gulf Freight LLC", start_date: "2021", end_date: "Present" },
    { title: "Ops Coordinator", company: "TransIndia Cargo", start_date: "2017", end_date: "2021" },
  ],
  education: [{ degree: "BBA", institution: "University of Mumbai", end_date: "2016" }],
  notice_period: "30 days",
};
const cvVariant = (headline, co1, co2) => ({
  ...CV_RAHUL,
  personal: { location: "Dubai, UAE", headline },
  experience: [
    { title: headline, company: co1, start_date: "2020", end_date: "Present" },
    { title: "Coordinator", company: co2, start_date: "2016", end_date: "2020" },
  ],
});

const APPS = [
  mkApp(1, JOB_ID, "Rahul Menon", "rahul.menon@example.com", "+971500000001", 91, "new", 3, CV_RAHUL),
  mkApp(2, JOB_ID, "Ayesha Khan", "ayesha.khan@example.com", "+971500000002", 86, "new", 5, cvVariant("Operations Supervisor", "Falcon Logistics DMCC", "Chennai Freight Co")),
  mkApp(3, JOB_ID, "Imran Shaikh", "imran.shaikh@example.com", "+971500000003", 79, "submitted", 9, cvVariant("Warehouse Ops Lead", "Desert Line Cargo", "Mumbai Port Services")),
  mkApp(4, JOB_ID, "Priya Nair", "priya.nair@example.com", "+971500000004", 72, "submitted", 14, cvVariant("Fleet Coordinator", "Oasis Transport LLC", "Kochi Marine Lines")),
  mkApp(5, JOB_ID, "Joseph Mathew", "joseph.mathew@example.com", "+971500000005", 64, "new", 22, cvVariant("Logistics Executive", "Palm Distribution", "Kerala Cargo Movers")),
  mkApp(6, JOB_ID, "Sana Qureshi", "sana.qureshi@example.com", "+971500000006", 57, "submitted", 27, cvVariant("Supply Chain Analyst", "Ibis Trading FZE", "Lahore Freight Hub")),
  // second job — a lived-in pipeline for the jobs list counts
  mkApp(7, JOB2.id, "Daniel Fernandes", "daniel.f@example.com", "+971500000007", 83, "interviewed", 120, cvVariant("Front Office Lead", "Coral Bay Hotels", "Goa Grand Resort")),
  mkApp(8, JOB2.id, "Meera Pillai", "meera.p@example.com", "+971500000008", 76, "shortlisted", 96, cvVariant("Guest Relations Exec", "Marina Pearl Hotel", "Trivandrum Regency")),
  mkApp(9, JOB2.id, "Omar Siddiqui", "omar.s@example.com", "+971500000009", 68, "hired", 200, cvVariant("Duty Manager", "Palm Vista Suites", "Karachi Continental")),
];

const VERDICT = {
  verdict: "STRONG FIT",
  score: 88,
  two_second_why: [
    "5+ yrs GCC logistics with SAP MM — direct match for the Jebel Ali hub role.",
    "Already in Dubai — can interview this week, 30-day notice period.",
    "Led a team of 14 through an SAP rollout; matches the leadership ask.",
  ],
  whatsapp_cta_template:
    "Hi Rahul, your operations profile stands out for our Operations Manager role — are you open to a quick call this week?",
};

const SUGGESTED_SKILLS = {
  skills: ["Logistics", "Fleet management", "SAP MM", "Team leadership", "Vendor management", "Route planning", "Budgeting", "HSE compliance"],
};

/* ── generated 2-page CV pdf (fictional) ──────────────────────── */
async function makeCvPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.09, 0.1);
  const grey = rgb(0.45, 0.45, 0.5);
  const page1 = doc.addPage([595, 842]);
  page1.drawText("Rahul Menon", { x: 56, y: 770, size: 26, font: bold, color: ink });
  page1.drawText("Senior Operations Lead — Dubai, UAE", { x: 56, y: 744, size: 12, font, color: grey });
  page1.drawLine({ start: { x: 56, y: 728 }, end: { x: 539, y: 728 }, thickness: 1, color: rgb(0.88, 0.88, 0.9) });
  let y = 700;
  const section = (t) => { page1.drawText(t, { x: 56, y, size: 12, font: bold, color: ink }); y -= 20; };
  const line = (t) => { page1.drawText(t, { x: 56, y, size: 10.5, font, color: ink }); y -= 16; };
  section("EXPERIENCE");
  line("Operations Lead — Gulf Freight LLC, Dubai (2021 - Present)");
  line("- Ran 40-vehicle fleet across Jebel Ali & DIP; cut idle hours 22%.");
  line("- Led SAP MM rollout for warehouse ops; trained a team of 14.");
  y -= 8;
  line("Ops Coordinator — TransIndia Cargo, Mumbai (2017 - 2021)");
  line("- Managed customs documentation for 300+ monthly shipments.");
  y -= 12;
  section("SKILLS");
  line("Logistics - SAP MM - Fleet management - Vendor negotiation - Route planning");
  y -= 12;
  section("EDUCATION");
  line("BBA — University of Mumbai (2016)");
  const page2 = doc.addPage([595, 842]);
  page2.drawText("Certifications & References", { x: 56, y: 770, size: 16, font: bold, color: ink });
  page2.drawText("RTA light vehicle licence - Six Sigma yellow belt", { x: 56, y: 740, size: 10.5, font, color: ink });
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
await new Promise((r) => server.listen(4180, r));

/* ── stateful mini-PostgREST ──────────────────────────────────── */
const store = {
  profiles: [{ id: HR_ID, user_type: "recruiter", company_name: COMPANY, work_email: "talent@horizonfg.example", plan: "active_hunter", full_name: "Horizon Talent Team", is_pro: true, features: {}, pro_access_expires_at: "2027-07-07T00:00:00Z", download_credits: 99 }],
  hr_profiles: [{ user_id: HR_ID, company_name: COMPANY, work_email: "talent@horizonfg.example", company_id: "55555555-5555-4555-8555-555555555555" }],
  jobs: [JOB, JOB2],
  applications: APPS.map((a) => ({ ...a })),
  candidate_events: [],
  interviews: [],
  share_feedback: [],
  candidate_shares: [],
  outreach_log: [],
  downloads: [],
};

function tableFromPath(path) {
  const m = path.match(/\/rest\/v1\/([a-z_]+)/);
  return m ? m[1] : null;
}

/* Apply PostgREST-style eq./in./is. filters + order + limit. */
function applyFilters(rows, url) {
  let out = rows;
  for (const [key, raw] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;
    const val = String(raw);
    if (val.startsWith("eq.")) {
      const v = val.slice(3);
      out = out.filter((r) => String(r[key]) === v);
    } else if (val.startsWith("in.(")) {
      const list = val.slice(4, -1).split(",").map((s) => s.replace(/^"|"$/g, ""));
      out = out.filter((r) => list.includes(String(r[key])));
    } else if (val.startsWith("is.")) {
      const v = val.slice(3);
      out = out.filter((r) => (v === "null" ? r[key] == null : String(r[key]) === v));
    } else if (val.startsWith("neq.")) {
      const v = val.slice(4);
      out = out.filter((r) => String(r[key]) !== v);
    }
  }
  const order = url.searchParams.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    out = [...out].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return dir === "desc" ? -cmp : cmp;
    });
  }
  const limit = Number(url.searchParams.get("limit"));
  if (limit) out = out.slice(0, limit);
  return out;
}

const PG_DEBUG = !!process.env.PG_DEBUG;
function pgrestHandle(route, req, url) {
  const table = tableFromPath(url.pathname);
  const accept = req.headers()["accept"] || "";
  const prefer = req.headers()["prefer"] || "";
  if (PG_DEBUG) console.log("[pgrest]", req.method(), table, url.search.slice(0, 120), "| accept:", accept.slice(0, 60));
  const wantsObject = /vnd\.pgrst\.object/.test(accept);
  const rows = store[table] || [];
  const method = req.method();

  if (method === "HEAD" || (method === "GET" && /count=exact/.test(prefer))) {
    const matched = applyFilters(rows, url);
    return route.fulfill({
      status: 200,
      headers: { "content-range": `0-${Math.max(matched.length - 1, 0)}/${matched.length}`, "content-type": "application/json" },
      body: method === "HEAD" ? "" : JSON.stringify(matched),
    });
  }

  if (method === "POST") {
    let body = {};
    try { body = JSON.parse(req.postData() || "{}"); } catch { body = {}; }
    const items = Array.isArray(body) ? body : [body];
    const conflictKey = url.searchParams.get("on_conflict");
    const created = items.map((item) => {
      let row;
      if (table === "jobs") {
        // The wizard's insert RETURNS the seeded job so the pipeline
        // scene continues the same story (id is stable for deep links).
        row = { ...JOB, ...item, id: JOB_ID, status: "active", kind: "active", posted_at: "2026-07-07T09:00:00Z", created_at: "2026-07-07T09:00:00Z" };
        store.jobs = [row, ...store.jobs.filter((j) => j.id !== JOB_ID)];
      } else if (conflictKey && (store[table] || []).some((r) => r[conflictKey] != null && String(r[conflictKey]) === String(item[conflictKey]))) {
        // Upsert MERGE — never a duplicate row (a dup breaks maybeSingle).
        store[table] = store[table].map((r) =>
          String(r[conflictKey]) === String(item[conflictKey]) ? { ...r, ...item } : r
        );
        row = store[table].find((r) => String(r[conflictKey]) === String(item[conflictKey]));
      } else {
        row = { id: `99999999-9999-4999-8999-${String((store[table] || []).length + 1).padStart(12, "0")}`, created_at: new Date("2026-07-07T12:00:00Z").toISOString(), ...item };
        store[table] = [...(store[table] || []), row];
      }
      return row;
    });
    const payload = wantsObject || items.length === 1 ? created[0] : created;
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(payload) });
  }

  if (method === "PATCH") {
    let body = {};
    try { body = JSON.parse(req.postData() || "{}"); } catch { body = {}; }
    const matched = applyFilters(rows, url);
    const ids = new Set(matched.map((r) => r.id));
    store[table] = rows.map((r) => (ids.has(r.id) ? { ...r, ...body } : r));
    const updated = store[table].filter((r) => ids.has(r.id));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (updated[0] ?? null) : updated) });
  }

  if (method === "DELETE") {
    const matched = applyFilters(rows, url);
    const ids = new Set(matched.map((r) => r.id));
    store[table] = rows.filter((r) => !ids.has(r.id));
    return route.fulfill({ status: 204, contentType: "application/json", body: "" });
  }

  const matched = applyFilters(rows, url);
  const body = wantsObject ? (matched[0] ?? null) : matched;
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

/* ── session + routing stubs ──────────────────────────────────── */
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
    email: "talent@horizonfg.example",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Horizon Talent Team", company_name: COMPANY, user_type: "recruiter" },
    created_at: "2026-05-01T00:00:00Z",
  },
};

async function stubRoutes(context, pdfBytes) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();

    if (url.port === "4180") {
      if (url.pathname.startsWith("/api/ai")) {
        const action = url.searchParams.get("action");
        if (action === "suggest_skills") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SUGGESTED_SKILLS) });
        if (action === "candidate_verdict") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VERDICT) });
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      }
      if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return route.continue();
    }

    if (/posthog|clarity|google|gstatic|doubleclick|vercel|razorpay/.test(url.hostname)) return route.abort();

    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) return pgrestHandle(route, req, url);
      if (url.pathname.includes("/storage/v1/object/sign/")) {
        const rel = url.pathname.replace("/storage/v1", "") + "?token=stub";
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: rel }) });
      }
      if (url.pathname.includes("/storage/v1/object/")) return route.fulfill({ status: 200, contentType: "application/pdf", body: pdfBytes });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }

    return route.abort();
  });
}

/* Fake cursor overlay so recordings show the click path. */
const CURSOR_SCRIPT = `
  (() => {
    if (window.__cvpCursor) return;
    window.__cvpCursor = true;
    const el = document.createElement("div");
    el.id = "cvp-demo-cursor";
    el.style.cssText = "position:fixed;z-index:2147483647;width:18px;height:18px;border-radius:50%;background:rgba(17,17,17,0.92);border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.35);pointer-events:none;transform:translate(-50%,-50%);left:-40px;top:-40px;transition:left 60ms linear, top 60ms linear;";
    const add = () => document.body && document.body.appendChild(el);
    if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
    window.addEventListener("mousemove", (e) => { el.style.left = e.clientX + "px"; el.style.top = e.clientY + "px"; }, true);
    window.addEventListener("mousedown", () => {
      el.style.width = "26px"; el.style.height = "26px"; el.style.background = "rgba(217,119,6,0.9)";
      setTimeout(() => { el.style.width = "18px"; el.style.height = "18px"; el.style.background = "rgba(17,17,17,0.92)"; }, 220);
    }, true);
  })();
`;

/* ── run ──────────────────────────────────────────────────────── */
const pdfBytes = await makeCvPdf();
const browser = await chromium.launch();
const VP = { width: 1600, height: 900 };

async function newContext({ authed = true, video = false, cursor = false } = {}) {
  const context = await browser.newContext({
    viewport: VP,
    deviceScaleFactor: video ? 1 : 2,
    reducedMotion: "no-preference",
    ...(video ? { recordVideo: { dir: join(OUT, "clips"), size: VP } } : {}),
  });
  await stubRoutes(context, pdfBytes);
  if (authed) {
    await context.addInitScript(([key, session]) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem("cvp_theme", "light");
    }, [`sb-${REF}-auth-token`, SESSION]);
  } else {
    await context.addInitScript(() => localStorage.setItem("cvp_theme", "light"));
  }
  if (cursor) await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const go = (page, path) => page.goto(`http://localhost:4180${path}`, { waitUntil: "networkidle" });
const SCENES = (process.env.SCENES || "public,wizard,portal").split(",");
const wireLogs = (page) => {
  page.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text().slice(0, 200)); });
};

/* Move mouse in small steps so the fake cursor glides on video. */
async function glideClick(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const box = await locator.boundingBox();
  if (!box) throw new Error("glideClick: element not visible");
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x - 120, y - 60, { steps: 12 });
  await page.mouse.move(x, y, { steps: 14 });
  await page.waitForTimeout(180);
  await page.mouse.click(x, y);
}

console.log("scene 1-2: public pages…");
if (SCENES.includes("public")) {
  const { context, page } = await newContext({ authed: false });
  await go(page, "/employer");
  await page.waitForTimeout(3200); // reveal animations settle
  await shot(page, "01-landing-hero");
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(1400);
  await shot(page, "01b-landing-steps");
  await go(page, "/employer/login");
  await page.waitForTimeout(2000);
  await shot(page, "02-login");
  await context.close();
}

console.log("scene 3-8: post-a-job wizard (recorded)…");
let wizardVideoPath = null;
if (SCENES.includes("wizard")) {
  const { context, page } = await newContext({ video: true, cursor: true });
  wireLogs(page);
  await go(page, "/employer/post");
  await page.waitForTimeout(2200);
  console.log("wizard page url:", page.url());
  await shot(page, "debug-wizard-entry");

  // Step 1 — Start
  await glideClick(page, page.locator("#pj-job-title"));
  await page.keyboard.type("Operations Manager", { delay: 34 });
  await glideClick(page, page.locator("#pj-location"));
  await page.keyboard.type("Dubai, UAE", { delay: 34 });
  await page.waitForTimeout(500);
  await shot(page, "03-wizard-start");
  await glideClick(page, page.getByRole("button", { name: "Continue" }));
  await page.waitForTimeout(900);

  // Step 2 — Skills & salary. The labeled "Minimum/Maximum salary" are the
  // range sliders; the typed values live in the .pj-num number steppers.
  const numInputs = page.locator(".pj-num input");
  await numInputs.first().waitFor({ timeout: 10000 });
  if (await numInputs.count() >= 2) {
    await glideClick(page, numInputs.nth(0));
    await page.keyboard.press("Control+a");
    await page.keyboard.type("14000", { delay: 30 });
    await glideClick(page, numInputs.nth(1));
    await page.keyboard.press("Control+a");
    await page.keyboard.type("18000", { delay: 30 });
    await page.keyboard.press("Tab");
  }
  const eduInput = page.locator("#pj-edu");
  if (await eduInput.count()) { await glideClick(page, eduInput); await page.keyboard.type("Bachelor's degree", { delay: 26 }); }
  await page.waitForTimeout(900); // suggested chips settle
  for (const skill of ["Logistics", "Fleet management", "SAP MM", "Team leadership"]) {
    const chip = page.getByRole("group", { name: "Relevant skills" }).getByText(skill, { exact: true }).first();
    if (await chip.count()) await glideClick(page, chip);
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(400);
  await shot(page, "04-wizard-skills-salary");
  await glideClick(page, page.getByRole("button", { name: "Continue" }));
  await page.waitForTimeout(900);

  // Step 3 — Qualifications (defaults are sensible; keep momentum)
  await page.waitForTimeout(600);
  await shot(page, "05-wizard-qualifications");
  await glideClick(page, page.getByRole("button", { name: "Continue" }));
  await page.waitForTimeout(900);

  // Step 4 — Job description (typed live for the recording)
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.waitFor({ timeout: 10000 });
  await glideClick(page, editor);
  await page.keyboard.type(
    "Own daily operations across our Jebel Ali hub. Lead a 14-person team, run fleet and vendor performance, and report weekly to the regional director. You bring 5+ years of GCC operations experience and hands-on SAP MM.",
    { delay: 9 }
  );
  await page.waitForTimeout(500);
  await shot(page, "06-wizard-jd");
  await glideClick(page, page.getByRole("button", { name: "Continue" }));
  await page.waitForTimeout(900);

  // Step 5 — Hire (consents → publish). Click the labels — the inputs are
  // visually replaced by styled spans. Verify each actually checked.
  const consentLabels = page.locator("label.pj-consent");
  const n = await consentLabels.count();
  for (let i = 0; i < n; i++) {
    const input = consentLabels.nth(i).locator('input[type="checkbox"]');
    await glideClick(page, consentLabels.nth(i));
    await page.waitForTimeout(300);
    if (!(await input.isChecked())) await input.check({ force: true });
  }
  await page.waitForTimeout(400);
  await shot(page, "07-wizard-hire");
  await glideClick(page, page.getByRole("button", { name: "Hire Now" }));
  await page.getByText("successfully posted", { exact: false }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(2200); // success screen animation settles
  await shot(page, "08-job-live-success");
  await page.waitForTimeout(1200);

  const vid = page.video();
  await context.close();
  if (vid) {
    const p = await vid.path();
    wizardVideoPath = join(OUT, "clips", "wizard.webm");
    copyFileSync(p, wizardVideoPath);
  }
}

console.log("scene 9-16: pipeline → schedule interview (recorded)…");
let portalVideoPath = null;
if (SCENES.includes("portal")) {
  const { context, page } = await newContext({ video: true, cursor: true });
  wireLogs(page);

  await go(page, "/employer/jobs");
  await page.waitForTimeout(2400);
  await shot(page, "09-jobs-list");

  // Into the Operations Manager pipeline (deep link — same as clicking
  // its "View applicants"; row-scoped clicking proved flaky in the stub).
  await go(page, `/employer/jobs/${JOB_ID}`);
  await page.waitForTimeout(2800);
  await shot(page, "10-pipeline-board");

  // Open Rahul's card → kanban drawer with score ring + verdict
  const rahulCard = page.locator(".jpp-kb-card", { hasText: "Rahul Menon" }).first();
  await rahulCard.waitFor({ timeout: 10000 });
  await glideClick(page, rahulCard);
  await page.waitForTimeout(1800);
  await shot(page, "11-candidate-detail");

  // CV viewer — the money screen
  const viewCv = page.getByText("View CV", { exact: false }).first();
  if (await viewCv.count()) {
    await glideClick(page, viewCv);
    try {
      await page.locator(".cvv-page canvas").first().waitFor({ timeout: 20000 });
      await page.waitForTimeout(1800);
      await shot(page, "12-cv-viewer");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    } catch { console.log("cv viewer canvas never settled — skipping shot 12"); }
  }
  // Move Rahul to Ready via the drawer's stage menu — the shortlisting
  // decision, on camera (deterministic; kanban drag is animation-flaky).
  const stageMenuBtn = page.getByRole("button", { name: "Move to a specific stage" }).first();
  await stageMenuBtn.waitFor({ timeout: 10000 });
  await glideClick(page, stageMenuBtn);
  await page.waitForTimeout(700);
  await glideClick(page, page.locator("[class*=stage-menu] button", { hasText: "Ready to interview" }).first());
  await page.waitForTimeout(1800);
  await shot(page, "13-moved-to-ready");

  // The drawer auto-selects the next Shortlist candidate after the move —
  // close it and reopen RAHUL's card from the Ready column so the
  // interview is scheduled with the candidate the story follows.
  const closeDrawer = page.getByRole("button", { name: "Close details" }).first();
  if (await closeDrawer.count()) await glideClick(page, closeDrawer);
  else await page.keyboard.press("Escape");
  await page.waitForTimeout(1200);
  const rahulReady = page.locator(".jpp-kb-card", { hasText: "Rahul Menon" }).first();
  await rahulReady.waitFor({ timeout: 10000 });
  await glideClick(page, rahulReady);
  await page.waitForTimeout(1800);
  await shot(page, "debug-rahul-ready-drawer");

  // Schedule interview — the climax
  const schedBtn = page.getByRole("button", { name: /schedule interview/i }).first();
  await schedBtn.waitFor({ timeout: 10000 });
  await schedBtn.scrollIntoViewIfNeeded();
  await glideClick(page, schedBtn);
  await page.waitForTimeout(1100);

  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.waitFor({ timeout: 10000 });
  await dateInput.fill("2026-07-09");
  const timeInput = page.locator('input[type="time"]').first();
  await timeInput.fill("10:30");
  const linkInput = page.locator('input[placeholder*="meet" i], input[placeholder*="link" i], input[placeholder*="zoom" i]').first();
  if (await linkInput.count()) { await glideClick(page, linkInput); await page.keyboard.type("https://meet.example.com/horizon-ops", { delay: 14 }); }
  await page.waitForTimeout(500);
  await shot(page, "14-schedule-modal");

  const confirmBtn = page.locator(".jpp-modal, [role=dialog]").getByRole("button", { name: /schedule|send|confirm/i }).last();
  await glideClick(page, confirmBtn);
  await page.waitForTimeout(2400); // success check animates
  await shot(page, "15-schedule-confirmed");
  await page.waitForTimeout(900);

  // Close via Done, payoff: detail timeline shows the booked interview
  const doneBtn = page.getByRole("button", { name: "Done" }).first();
  if (await doneBtn.count()) await glideClick(page, doneBtn);
  else await page.keyboard.press("Escape");
  await page.waitForTimeout(1600);
  await shot(page, "16-payoff-detail");

  const vid = page.video();
  await context.close();
  if (vid) {
    const p = await vid.path();
    portalVideoPath = join(OUT, "clips", "portal.webm");
    copyFileSync(p, portalVideoPath);
  }
}

await browser.close();
server.close();
console.log("done →", OUT, { wizardVideoPath, portalVideoPath });
