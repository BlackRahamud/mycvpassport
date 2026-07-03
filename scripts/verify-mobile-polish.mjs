/* Mobile polish verification harness (hamburger employer card + employer
   portal mobile bugs). Serves the PRODUCTION build with a stubbed backend
   (same pattern as verify-cv-viewer.mjs), then at 360/393/430:
   - public hamburger open, light + dark (For Employers card)
   - pipeline candidate detail header with long chips + low score context
   - recruiter note + external review containing URLs (link chips)
   - pipeline list card with the longest NEXT guidance line
   - Reject → confirm step
   - Candidates CRM mobile detail overlay
   Each page run ends with a horizontal-overflow audit:
   document.scrollWidth <= viewport, plus a per-element offender list.
   Usage: node scripts/verify-mobile-polish.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/mobile-polish";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* ── fixture data — deliberately long chip content ────────────── */
const HR_ID = "11111111-1111-4111-8111-111111111111";
const CAND_ID = "22222222-2222-4222-8222-222222222222";
const CAND2_ID = "22222222-2222-4222-8222-222222222223";
const JOB = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "IT support L1 Engineer (Dubai onsite)",
  status: "active",
  posted_at: "2026-06-20T08:00:00Z",
  created_at: "2026-06-20T08:00:00Z",
  location: "Dubai, UAE",
  market: "gulf",
  job_type: "full_time",
  salary_min: 4000,
  salary_max: 6000,
  currency: "AED",
  hr_id: HR_ID,
  company: "Meridian Logistics",
  department: "IT",
  skills: ["Windows", "Active Directory", "Networking"],
  requirements: ["2+ years helpdesk"],
  description: "First-line support for our Dubai office.",
  screening_questions: [],
  kind: "standard",
  source: "hr_portal",
};
const APPLICATION = {
  id: "44444444-4444-4444-8444-444444444444",
  job_id: JOB.id,
  candidate_id: CAND_ID,
  candidate_name: "Mohammed Abdulrahman Al-Balushi",
  candidate_email: "mohammed.abdulrahman@example.com",
  candidate_phone: "+971585508782",
  cv_snapshot: {
    personal: { location: "Bur Dubai, Dubai, United Arab Emirates", headline: "Senior Field Service Engineer" },
    skills: ["Windows Server", "Networking", "Hardware", "Customer support"],
    experience: [{ title: "Field Engineer", company: "TechServe LLC", start_date: "2019", end_date: "Present" }],
    education: [{ degree: "BSc", institution: "University of Mumbai", end_date: "2016" }],
    notice_period: "Immediately Available - can join within the week",
  },
  cv_file_path: null,
  ats_score: 8,
  match_keywords: ["customer support"],
  missing_keywords: ["active directory", "helpdesk"],
  score_source: "stopgap_keyword",
  source: "imported",
  status: "new",
  recruiter_notes: [
    { text: "Shared with the hiring manager for a second look: https://mycvpassport.com/shared/candidate/abc123token please review before Thursday.", at: "2026-07-01T09:00:00Z" },
    { text: "Portfolio here https://www.behance.net/mohammed-abdulrahman/projects/archive?sort=recent — strong hardware background.", at: "2026-07-01T10:00:00Z" },
  ],
  applied_at: "2026-06-28T10:30:00Z",
  viewed_at: null,
  updated_at: "2026-06-28T10:30:00Z",
  is_visible_to_hr: true,
  visa_status: "Own visa (transferable)",
};
const APPLICATION2 = {
  ...APPLICATION,
  id: "44444444-4444-4444-8444-444444444445",
  candidate_id: CAND2_ID,
  candidate_name: "Priya Venkatasubramanian",
  candidate_email: "priya.venkat@example.com",
  candidate_phone: "+919876543210",
  ats_score: 62,
  status: "interviewed",
  source: "applied",
  recruiter_notes: [],
};
const SHARE_FEEDBACK = [{
  id: "66666666-6666-4666-8666-666666666666",
  vote: "approve",
  feedback_text: "Looks solid for L1. Full write-up: https://mycvpassport.com/shared/candidate/abc123token and my scoring sheet https://docs.example.com/sheet/xyz",
  created_at: "2026-07-01T12:00:00Z",
  candidate_shares: { application_id: APPLICATION.id },
}];
const VERDICT = {
  verdict: "PASS",
  score: 8,
  two_second_why: [
    "No helpdesk or Active Directory exposure on the CV.",
    "Already in Dubai on own visa — zero relocation friction if screened in.",
    "Field-service hardware background is adjacent, not first-line support.",
  ],
  whatsapp_cta_template: "Hi Mohammed, quick question about your application…",
};

/* ── static file server for build/ ────────────────────────────── */
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
await new Promise((r) => server.listen(4181, r));

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
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("applications")) rows = [APPLICATION, APPLICATION2];
  else if (t("share_feedback")) rows = SHARE_FEEDBACK;
  else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/ai")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VERDICT) });
    }
    if (url.port === "4181") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      }
      if (url.pathname.includes("/auth/v1/token")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      }
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() === "PATCH" || url.pathname.includes("/rpc/")) {
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

/* ── overflow audit ───────────────────────────────────────────── */
async function auditOverflow(page, label) {
  const res = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const doc = document.documentElement.scrollWidth;
    const offenders = [];
    const inHScroll = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if ((s.overflowX === "auto" || s.overflowX === "scroll") && p.scrollWidth > p.clientWidth + 1) return true;
      }
      return false;
    };
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== "fixed") {
        if (inHScroll(el)) return; // deliberate horizontal scroll strips (stage tabs)
        // skip children of already-reported offenders to keep the list short
        if (el.parentElement && offenders.some((o) => o.el && o.el.contains(el))) return;
        offenders.push({ el, tag: el.tagName, cls: String(el.className).slice(0, 90), right: Math.round(r.right) });
      }
    });
    return { vw, doc, offenders: offenders.slice(0, 12).map(({ tag, cls, right }) => ({ tag, cls, right })) };
  });
  check(res.doc <= res.vw + 1, `${label}: no horizontal overflow (scrollWidth ${res.doc} <= viewport ${res.vw})`);
  if (res.offenders.length) res.offenders.forEach((o) => console.log(`   ↳ ${o.tag}.${o.cls} right=${o.right}`));
  return res;
}

const browser = await chromium.launch();

async function newPage({ width, theme = "light", authed = true }) {
  const context = await browser.newContext({ viewport: { width, height: 852 } });
  await stubRoutes(context);
  await context.addInitScript(([key, session, th, doAuth]) => {
    if (doAuth) localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
  }, [`sb-${REF}-auth-token`, SESSION, theme, authed]);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

const WIDTHS = [360, 393, 430];

/* ── 1) public hamburger — For Employers card, light + dark ───── */
for (const width of WIDTHS) {
  for (const theme of width === 393 ? ["light", "dark"] : ["light"]) {
    const { context, page } = await newPage({ width, theme, authed: false });
    await page.goto("http://localhost:4181/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(500);
    const card = page.locator(".cvp-nav-employer");
    await card.scrollIntoViewIfNeeded();
    check(await card.isVisible(), `hamburger ${width}px ${theme}: For Employers card visible`);
    await shot(page, `nav-${width}-${theme}`);
    await card.click();
    await page.waitForTimeout(700);
    check(page.url().includes("/employer"), `hamburger ${width}px ${theme}: card navigates to /employer (${page.url()})`);
    await context.close();
  }
}

/* ── 2) pipeline detail header chips + notes + NEXT + reject ──── */
for (const width of WIDTHS) {
  const { context, page } = await newPage({ width });
  await page.goto(`http://localhost:4181/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  // list view is the mobile default; shortlist tab holds the imported low-score candidate
  await page.getByText("Mohammed Abdulrahman Al-Balushi").first().click();
  await page.waitForTimeout(700);
  const head = page.locator(".jpp-detail__head");
  await head.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, `pipeline-header-${width}`);
  await auditOverflow(page, `pipeline detail ${width}px`);

  // score pill keeps score+verdict visible
  const pill = page.locator(".jpp-deal__badge--match");
  check((await pill.locator(".jpp-deal__badge-txt--keep").textContent())?.includes("8%"), `pipeline ${width}px: score+verdict segment intact`);

  // notes with URL chips
  const note = page.locator(".jpp-note__list");
  await note.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const chips = page.locator(".jpp-notelink");
  const chipCount = await chips.count();
  check(chipCount >= 3, `pipeline ${width}px: URL chips rendered in notes + review (${chipCount})`);
  check((await chips.first().getAttribute("target")) === "_blank", `pipeline ${width}px: chip opens new tab`);
  const labels = await chips.allTextContents();
  check(labels.some((l) => l.includes("Shared candidate")), `pipeline ${width}px: own /shared/ link labelled "Shared candidate" (${labels.join(" | ")})`);
  await shot(page, `pipeline-notes-${width}`);

  // NEXT line stays inside the card
  const box = await page.locator(".jpp-card").first().boundingBox();
  const next = await page.locator(".jpp-card__line-value--soft").first().boundingBox();
  if (box && next) {
    check(next.x + next.width <= box.x + box.width - 8, `pipeline ${width}px: NEXT text inside card padding (text right ${Math.round(next.x + next.width)}, card right ${Math.round(box.x + box.width)})`);
  }
  await page.locator(".jpp-cards").scrollIntoViewIfNeeded();
  await shot(page, `pipeline-card-${width}`);

  // Interviewed tab → longest NEXT line + Reject affordance
  await page.getByRole("tab", { name: /Interviewed/ }).click();
  await page.waitForTimeout(600);
  await shot(page, `pipeline-interviewed-${width}`);
  const rejectBtn = page.locator(".jpp-action--pass");
  await rejectBtn.scrollIntoViewIfNeeded();
  check(await rejectBtn.isVisible(), `pipeline ${width}px: Reject renders as outline button`);
  await rejectBtn.click();
  await page.waitForTimeout(400);
  check(await page.locator(".jpp-reject-confirm").isVisible(), `pipeline ${width}px: confirm step appears`);
  await shot(page, `pipeline-reject-confirm-${width}`);
  await page.locator(".jpp-reject-confirm__no").click();
  await page.waitForTimeout(300);
  check(await page.locator(".jpp-action--pass").isVisible(), `pipeline ${width}px: cancel restores Reject button`);
  await auditOverflow(page, `pipeline interviewed ${width}px`);
  await context.close();
}

/* ── 3) kanban drawer — sticky close header ───────────────────── */
{
  const { context, page } = await newPage({ width: 393 });
  await page.goto(`http://localhost:4181/employer/jobs/${JOB.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.getByRole("tab", { name: "Board" }).click();
  await page.waitForTimeout(700);
  await page.locator(".jpp-kb-card").first().click();
  await page.waitForTimeout(800);
  const drawer = page.locator(".jpp-kb-drawer");
  check(await drawer.isVisible(), "kanban 393px: drawer opens");
  await drawer.evaluate((el) => { el.scrollTop = 400; });
  await page.waitForTimeout(300);
  const headBox = await page.locator(".jpp-kb-drawer__head").boundingBox();
  check(!!headBox && headBox.y <= 1, `kanban 393px: close header sticks at drawer top while scrolled (y=${headBox && Math.round(headBox.y)})`);
  // The header strip must be opaque above the scrolled content: hit-testing
  // its centre has to land on the strip (or a descendant), never on a
  // content line (the old float+sticky button let contact text ride up).
  const headerCovers = await page.evaluate(() => {
    const head = document.querySelector(".jpp-kb-drawer__head");
    if (!head) return false;
    const r = head.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return head === hit || head.contains(hit);
  });
  check(headerCovers, "kanban 393px: sticky header is opaque over scrolled content");
  await shot(page, "kanban-drawer-scrolled-393");
  await context.close();
}

/* ── 4) Candidates CRM mobile overlay ─────────────────────────── */
for (const width of [360, 393]) {
  const { context, page } = await newPage({ width });
  await page.goto("http://localhost:4181/employer/candidates", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await auditOverflow(page, `candidates list ${width}px`);
  await page.getByText("Mohammed Abdulrahman Al-Balushi").first().click();
  await page.waitForTimeout(800);
  await shot(page, `candidates-detail-${width}`);
  await auditOverflow(page, `candidates detail ${width}px`);
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
