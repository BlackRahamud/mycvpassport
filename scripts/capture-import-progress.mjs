/* Bulk-import progress capture — before/after evidence for the
   stage-segmented progress bars. Same stub-backend approach as
   capture-kanban-drag.mjs (fixture data only): serves the production
   build, opens the pipeline's Import CVs modal, feeds it generated
   fixture PDFs, runs the import against delayed AI stubs (delay lives
   in THIS harness so mid-states are visible — the product has no fake
   timers), and screenshots the row states along the way.

   Usage: node scripts/capture-import-progress.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "video-assets/import-progress";
mkdirSync(OUT, { recursive: true });

/* ── fixtures (fictional) ─────────────────────────────────────── */
const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const JOB = {
  id: JOB_ID, title: "Operations Manager", status: "active", kind: "active",
  posted_at: "2026-07-07T09:00:00Z", created_at: "2026-07-07T09:00:00Z",
  location: "Dubai, UAE", market: "gulf", position: "onsite", job_type: "full-time",
  salary_min: 14000, salary_max: 18000, currency: "AED", salary_unit: "per month",
  hr_id: HR_ID, company: "Horizon Facilities Group", department: "Operations",
  skills: ["Logistics", "Fleet management", "SAP", "Team leadership"],
  tools: ["SAP MM"], requirements: ["5+ years GCC operations"],
  description: "Own daily operations across our Jebel Ali hub.",
  screening_questions: [], source: "hr_portal",
};
const store = {
  profiles: [{ id: HR_ID, user_type: "recruiter", company_name: JOB.company, work_email: "talent@horizonfg.example", plan: "active_hunter", full_name: "Horizon Talent Team", is_pro: true, features: {}, pro_access_expires_at: "2027-07-07T00:00:00Z", download_credits: 99 }],
  hr_profiles: [{ user_id: HR_ID, company_name: JOB.company, work_email: "talent@horizonfg.example", company_id: "55555555-5555-4555-8555-555555555555" }],
  jobs: [JOB],
  applications: [], candidate_events: [], interviews: [],
};

/* Fixture candidate CVs — one small text PDF each (all fictional). */
const CANDIDATES = [
  { file: "rahul_menon_cv.pdf", name: "Rahul Menon", headline: "Senior Operations Lead", score: 91 },
  { file: "ayesha_khan_cv.pdf", name: "Ayesha Khan", headline: "Operations Supervisor", score: 84 },
  { file: "imran_shaikh_cv.pdf", name: "Imran Shaikh", headline: "Warehouse Ops Lead", score: 77 },
  { file: "priya_nair_cv.pdf", name: "Priya Nair", headline: "Fleet Coordinator", score: 58 },
];
async function makeCvPdf(c) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  page.drawText(c.name, { x: 56, y: 770, size: 24, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`${c.headline} — Dubai, UAE`, { x: 56, y: 744, size: 12, font, color: rgb(0.4, 0.4, 0.45) });
  const ink = rgb(0.1, 0.1, 0.1);
  let y = 700;
  const line = (t, b = false) => { page.drawText(t, { x: 56, y, size: b ? 12 : 10.5, font: b ? bold : font, color: ink }); y -= b ? 22 : 16; };
  line("EXPERIENCE", true);
  line("Gulf Freight LLC, Dubai (2021 - Present) — logistics, SAP MM, fleet operations.");
  line("- Ran a 40-vehicle fleet across Jebel Ali and DIP; cut idle hours by 22 percent.");
  line("- Led the SAP MM rollout for warehouse operations and trained a team of 14.");
  line("- Managed vendor negotiations and route planning for 300+ monthly shipments.");
  y -= 8;
  line("TransIndia Cargo, Mumbai (2017 - 2021) — operations coordination.");
  line("- Handled customs documentation and freight scheduling for GCC-bound cargo.");
  y -= 8;
  line("SKILLS", true);
  line("Logistics - SAP MM - Fleet management - Team leadership - Vendor negotiation");
  y -= 8;
  line("EDUCATION", true);
  line("BBA, University of Mumbai (2016). Languages: English, Hindi, basic Arabic.");
  return Buffer.from(await doc.save());
}

/* ── static server + mini-PostgREST ───────────────────────────── */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4182, r));

function applyFilters(rows, url) {
  let out = rows;
  for (const [key, raw] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;
    const val = String(raw);
    if (val.startsWith("eq.")) out = out.filter((r) => String(r[key]) === val.slice(3));
    else if (val.startsWith("in.(")) {
      const list = val.slice(4, -1).split(",").map((s) => s.replace(/^"|"$/g, ""));
      out = out.filter((r) => list.includes(String(r[key])));
    } else if (val.startsWith("is.")) {
      const v = val.slice(3);
      out = out.filter((r) => (v === "null" ? r[key] == null : String(r[key]) === v));
    } else if (val.startsWith("neq.")) out = out.filter((r) => String(r[key]) !== val.slice(4));
  }
  const order = url.searchParams.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    out = [...out].sort((a, b) => (a[col] === b[col] ? 0 : (a[col] > b[col] ? 1 : -1) * (dir === "desc" ? -1 : 1)));
  }
  const limit = Number(url.searchParams.get("limit"));
  if (limit) out = out.slice(0, limit);
  return out;
}

function pgrestHandle(route, req, url) {
  const table = (url.pathname.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
  const accept = req.headers()["accept"] || "";
  const prefer = req.headers()["prefer"] || "";
  const wantsObject = /vnd\.pgrst\.object/.test(accept);
  const rows = store[table] || [];
  const method = req.method();
  if (method === "HEAD" || (method === "GET" && /count=exact/.test(prefer))) {
    const matched = applyFilters(rows, url);
    return route.fulfill({ status: 200, headers: { "content-range": `0-${Math.max(matched.length - 1, 0)}/${matched.length}`, "content-type": "application/json" }, body: method === "HEAD" ? "" : JSON.stringify(matched) });
  }
  if (method === "POST") {
    let body = {};
    try { body = JSON.parse(req.postData() || "{}"); } catch { body = {}; }
    const items = Array.isArray(body) ? body : [body];
    const conflictKey = url.searchParams.get("on_conflict");
    const created = items.map((item) => {
      let row;
      if (conflictKey && (store[table] || []).some((r) => r[conflictKey] != null && String(r[conflictKey]) === String(item[conflictKey]))) {
        store[table] = store[table].map((r) =>
          String(r[conflictKey]) === String(item[conflictKey]) ? { ...r, ...item } : r
        );
        row = store[table].find((r) => String(r[conflictKey]) === String(item[conflictKey]));
      } else {
        row = { id: `99999999-9999-4999-8999-${String((store[table] || []).length + 1).padStart(12, "0")}`, created_at: "2026-07-07T12:00:00Z", ...item };
        store[table] = [...(store[table] || []), row];
      }
      return row;
    });
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(wantsObject || items.length === 1 ? created[0] : created) });
  }
  if (method === "PATCH") {
    let body = {};
    try { body = JSON.parse(req.postData() || "{}"); } catch { body = {}; }
    const ids = new Set(applyFilters(rows, url).map((r) => r.id));
    store[table] = rows.map((r) => (ids.has(r.id) ? { ...r, ...body } : r));
    const updated = store[table].filter((r) => ids.has(r.id));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (updated[0] ?? null) : updated) });
  }
  const matched = applyFilters(rows, url);
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (matched[0] ?? null) : matched) });
}

const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh-token",
  token_type: "bearer", expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: HR_ID, aud: "authenticated", role: "authenticated", email: "talent@horizonfg.example", app_metadata: { provider: "email" }, user_metadata: { full_name: "Horizon Talent Team", company_name: JOB.company, user_type: "recruiter" }, created_at: "2026-05-01T00:00:00Z" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── run ──────────────────────────────────────────────────────── */
const pdfs = [];
for (const c of CANDIDATES) pdfs.push({ ...c, bytes: await makeCvPdf(c) });

const browser = await chromium.launch();
const VP = { width: 1600, height: 900 };
const context = await browser.newContext({
  viewport: VP, deviceScaleFactor: 1, reducedMotion: "no-preference",
  recordVideo: { dir: OUT, size: VP },
});

let verdictCall = 0;
await context.route("**/*", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  if (url.port === "4182") {
    if (url.pathname.startsWith("/api/ai")) {
      const action = url.searchParams.get("action");
      if (action === "import_structure") {
        // Harness-side delay so the "Structuring…" segment is visible.
        await sleep(1100);
        let name = null;
        try { name = (JSON.parse(req.postData() || "{}").text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/m) || [])[1] || null; } catch { name = null; }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ snapshot: { name, email: null, phone: null, skills: ["Logistics", "SAP MM"], experience: [] } }) });
      }
      if (action === "candidate_verdict") {
        await sleep(1100);
        const c = pdfs[Math.min(verdictCall, pdfs.length - 1)];
        verdictCall += 1;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ score: c.score, verdict: c.score >= 80 ? "STRONG FIT" : c.score >= 50 ? "MAYBE" : "WEAK FIT", two_second_why: [], whatsapp_cta_template: "" }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.continue();
  }
  if (/posthog|clarity|google|gstatic|doubleclick|vercel|razorpay/.test(url.hostname)) return route.abort();
  if (req.url().startsWith(SUPA)) {
    if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
    if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
    if (url.pathname.includes("/rest/v1/rpc/import_candidates_batch")) {
      let n = 0;
      try { n = (JSON.parse(req.postData() || "{}").p_records || []).length; } catch { n = 0; }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ inserted: n, skipped: 0, skipped_indices: [] }) });
    }
    if (url.pathname.includes("/rest/v1/")) return pgrestHandle(route, req, url);
    if (url.pathname.includes("/storage/v1/object/")) {
      await sleep(500); // visible "Uploading…" segment
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "applicant-cvs/stub" }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  }
  return route.abort();
});
await context.addInitScript(([key, session]) => {
  localStorage.setItem(key, JSON.stringify(session));
  localStorage.setItem("cvp_theme", "light");
}, [`sb-${REF}-auth-token`, SESSION]);

const page = await context.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 200)); });

await page.goto(`http://localhost:4182/employer/jobs/${JOB_ID}`, { waitUntil: "domcontentloaded" });
const importBtn = page.locator("button", { hasText: "Import" }).first();
await importBtn.waitFor({ timeout: 20000 });
await page.waitForTimeout(1500);
await importBtn.click();

const panel = page.locator(".bci-panel");
await panel.waitFor({ timeout: 10000 });
await page.setInputFiles(".bci-input", pdfs.map((c) => ({ name: c.file, mimeType: "application/pdf", buffer: c.bytes })));
await page.waitForTimeout(700);
await panel.screenshot({ path: join(OUT, "1-files-queued.png") });

await page.locator(".bci-btn--solid", { hasText: "Import" }).click();
/* The batch runs sequentially (~3s per file with harness delays) — shoot
   the row states on a cadence to catch the stage mix. */
for (let i = 1; i <= 5; i++) {
  await page.waitForTimeout(2100);
  await panel.screenshot({ path: join(OUT, `2-processing-${i}.png`) });
}
/* The pre-fix build never reaches Done (last-file batch race) — capture
   whatever end state the run settles into either way. */
try {
  await page.locator(".bci-btn--solid", { hasText: "Done" }).waitFor({ timeout: 20000 });
} catch {
  console.log("Done button never appeared — capturing the stalled end state");
}
await page.waitForTimeout(500);
await panel.screenshot({ path: join(OUT, "3-committed.png") });

const rowStates = await page.evaluate(() => ({
  pills: Array.from(document.querySelectorAll(".bci-pill")).map((p) => p.textContent.trim()),
  meta: Array.from(document.querySelectorAll(".bci-row__meta")).map((m) => m.textContent.trim()),
  progressBars: document.querySelectorAll(".bci-prog").length,
  segments: Array.from(document.querySelectorAll(".bci-prog")).map((p) =>
    Array.from(p.children).map((s) => s.className.replace(/bci-prog__seg\s*/g, "").replace(/bci-prog__seg--/g, ""))
  ),
}));
writeFileSync(join(OUT, "row-report.json"), JSON.stringify(rowStates, null, 2));
console.log("rows:", JSON.stringify(rowStates));

await context.close();
await browser.close();
server.close();
console.log(`done → ${OUT}`);
