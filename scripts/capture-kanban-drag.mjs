/* Kanban drag capture — before/after evidence for the premium-drag pass.
   Serves the PRODUCTION build with the same stubbed backend approach as
   capture-investor-video.mjs (fixture data only, nothing real touched),
   drags a card Shortlist → Ready with the mouse, and captures:
     1-board-idle.png    board at rest
     2-mid-drag.png      card in flight over the Ready column
     3-just-dropped.png  ~250ms after drop (settle flash window)
     4-settled.png       board after the move
   Plus a webm of the whole drag (fake cursor dot shows the path) and a
   cursor-report.json with the computed body cursor + col highlight state
   mid-drag — the part a screenshot can't show.

   Usage: node scripts/capture-kanban-drag.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "video-assets/kanban-drag";
mkdirSync(OUT, { recursive: true });

/* ── fixtures (fictional, mirrors the investor harness) ────────── */
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
const mkApp = (n, name, score, status, appliedH) => ({
  id: `44444444-4444-4444-8444-44444444444${n}`,
  hr_id: HR_ID, job_id: JOB_ID,
  candidate_id: `22222222-2222-4222-8222-22222222222${n}`,
  candidate_name: name,
  candidate_email: `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
  candidate_phone: `+97150000000${n}`,
  cv_snapshot: { personal: { location: "Dubai, UAE" }, skills: ["Logistics"] },
  cv_file_path: null,
  ats_score: score, match_keywords: ["logistics", "SAP"], missing_keywords: [],
  score_source: "stopgap_keyword", source: "applied", status,
  recruiter_notes: [],
  applied_at: new Date(Date.parse("2026-07-07T12:00:00Z") - appliedH * 3600e3).toISOString(),
  viewed_at: null,
  updated_at: new Date(Date.parse("2026-07-07T12:00:00Z") - appliedH * 3600e3).toISOString(),
  is_visible_to_hr: true, visa_status: "Employment visa",
});
const store = {
  profiles: [{ id: HR_ID, user_type: "recruiter", company_name: JOB.company, work_email: "talent@horizonfg.example", plan: "active_hunter", full_name: "Horizon Talent Team", is_pro: true, features: {}, pro_access_expires_at: "2027-07-07T00:00:00Z", download_credits: 99 }],
  hr_profiles: [{ user_id: HR_ID, company_name: JOB.company, work_email: "talent@horizonfg.example", company_id: "55555555-5555-4555-8555-555555555555" }],
  jobs: [JOB],
  applications: [
    mkApp(1, "Rahul Menon", 91, "new", 3),
    mkApp(2, "Ayesha Khan", 86, "new", 5),
    mkApp(3, "Imran Shaikh", 79, "submitted", 9),
    mkApp(4, "Priya Nair", 72, "submitted", 14),
    mkApp(5, "Joseph Mathew", 64, "new", 22),
  ],
  candidate_events: [], interviews: [], candidate_shares: [], outreach_log: [],
};

/* ── static server + mini-PostgREST (subset of the investor harness) ── */
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
await new Promise((r) => server.listen(4181, r));

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
        // Upsert MERGE — never a duplicate row (a dup breaks maybeSingle).
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

const CURSOR_SCRIPT = `
  (() => {
    if (window.__cvpCursor) return;
    window.__cvpCursor = true;
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;z-index:2147483647;width:18px;height:18px;border-radius:50%;background:rgba(17,17,17,0.92);border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.35);pointer-events:none;transform:translate(-50%,-50%);left:-40px;top:-40px;transition:left 60ms linear, top 60ms linear;";
    const add = () => document.body && document.body.appendChild(el);
    if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
    window.addEventListener("mousemove", (e) => { el.style.left = e.clientX + "px"; el.style.top = e.clientY + "px"; }, true);
  })();
`;

/* ── run ──────────────────────────────────────────────────────── */
const browser = await chromium.launch();
const VP = { width: 1600, height: 900 };
const context = await browser.newContext({
  viewport: VP, deviceScaleFactor: 1, reducedMotion: "no-preference",
  recordVideo: { dir: OUT, size: VP },
});
await context.route("**/*", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  if (url.port === "4181") {
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.continue();
  }
  if (/posthog|clarity|google|gstatic|doubleclick|vercel|razorpay/.test(url.hostname)) return route.abort();
  if (req.url().startsWith(SUPA)) {
    if (process.env.PG_DEBUG) console.log("[supa]", req.method(), url.pathname, url.search.slice(0, 140));
    if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
    if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
    if (url.pathname.includes("/rest/v1/")) return pgrestHandle(route, req, url);
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  }
  return route.abort();
});
await context.addInitScript(([key, session]) => {
  localStorage.setItem(key, JSON.stringify(session));
  localStorage.setItem("cvp_theme", "light");
}, [`sb-${REF}-auth-token`, SESSION]);
await context.addInitScript(CURSOR_SCRIPT);

const page = await context.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 300)); });

await page.goto(`http://localhost:4181/employer/jobs/${JOB_ID}`, { waitUntil: "domcontentloaded" });
const card = page.locator(".jpp-kb-card", { hasText: "Rahul Menon" }).first();
try {
  await card.waitFor({ timeout: 20000 });
} catch (e) {
  console.log("card never appeared — url:", page.url());
  await page.screenshot({ path: join(OUT, "debug-fail.png") });
  console.log("body text head:", (await page.evaluate(() => document.body.innerText.slice(0, 500))));
  throw e;
}
await page.waitForTimeout(2000);
await page.screenshot({ path: join(OUT, "1-board-idle.png") });

/* Drag Rahul: Shortlist → Ready (column index 1), with a real mouse. */
const cardBox = await card.boundingBox();
const readyCol = page.locator(".jpp-kb-col").nth(1);
const readyBox = await readyCol.boundingBox();
const from = { x: cardBox.x + cardBox.width / 2, y: cardBox.y + cardBox.height / 2 };
const to = { x: readyBox.x + readyBox.width / 2, y: readyBox.y + 160 };

await page.mouse.move(from.x, from.y, { steps: 12 });
await page.waitForTimeout(300);
await page.mouse.down();
await page.mouse.move(from.x + 10, from.y + 4, { steps: 4 }); // pass the 6px activation gate
for (let i = 1; i <= 24; i++) {
  await page.mouse.move(from.x + ((to.x - from.x) * i) / 24, from.y + ((to.y - from.y) * i) / 24);
  await page.waitForTimeout(28);
}
await page.waitForTimeout(350);

/* Mid-drag evidence: computed body cursor + column highlight state. */
const midDrag = await page.evaluate(() => ({
  bodyClass: document.body.className,
  bodyCursor: getComputedStyle(document.body).cursor,
  overColumns: document.querySelectorAll(".jpp-kb-col--over").length,
  overlayCard: !!document.querySelector(".jpp-kb-card--lifted"),
  overlayCursor: document.querySelector(".jpp-kb-card--lifted")
    ? getComputedStyle(document.querySelector(".jpp-kb-card--lifted")).cursor
    : null,
}));
await page.screenshot({ path: join(OUT, "2-mid-drag.png") });

await page.mouse.up();
await page.waitForTimeout(250);
await page.screenshot({ path: join(OUT, "3-just-dropped.png") });
const landed = await page.evaluate(() => ({
  landedCards: document.querySelectorAll(".jpp-kb-card--landed").length,
  bodyClassAfterDrop: document.body.className,
}));
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, "4-settled.png") });

writeFileSync(join(OUT, "cursor-report.json"), JSON.stringify({ midDrag, landed }, null, 2));
console.log("mid-drag:", JSON.stringify(midDrag));
console.log("landed:", JSON.stringify(landed));

await context.close(); // flushes the webm
await browser.close();
server.close();
console.log(`done → ${OUT}`);
