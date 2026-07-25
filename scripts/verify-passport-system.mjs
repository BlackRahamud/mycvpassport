/* Passport system verification — all four screens on a real render.

   Serves the PRODUCTION build (built with REACT_APP_LAUNCH_OFFER_ENABLED=true)
   with a stubbed backend, then walks the whole journey:

     A) landing  → strip is one line on mobile; modal appears only after the
                   5s dwell or a 30% scroll; every dismiss closes and stays
                   closed on reload; CTA routes signed-out → /register.
     B) builder  → Export runs the clearance scan: the ATS gauge COUNTS UP to
                   the real score, entries clear one by one, and an EMPTY
                   field shows amber "Add" — never a green Cleared.
     C) success  → boarding pass: personalised headline, boarding-pass row,
                   Boost primary is in-tool, no third-party job link, share
                   opens 3 channels, downloads counter is real, and
                   Save-my-seat WRITES a waitlist row before showing the
                   opted-in state.
     D) offer off→ past OFFER_END_ISO the strip and modal vanish entirely.

   Also asserts the prerender guard: no screen is baked into the snapshots.

   Usage: node scripts/verify-passport-system.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/passport-system";
const PORT = 4189;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* ── server: build + stubbed pdf api ─────────────────────────────── */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const TINY_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
);
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/generate-pdf")) {
    res.writeHead(200, { "content-type": "application/pdf" });
    res.end(TINY_PDF);
    return;
  }
  if (req.url.startsWith("/api/") || req.url.startsWith("/_vercel")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
    return;
  }
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (extname(p)) { res.writeHead(404); res.end(); return; }
    const spa = join("./build", "spa.html");
    file = existsSync(spa) ? spa : join("./build", "index.html");
  }
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, r));

/* ── prerender guard (static) ─────────────────────────────────────── */
const MARKERS = ["lom-root", "csc-root", "bpx-root", "lst-root", "Start my 14 free days"];
for (const rel of ["index.html", "pricing/index.html", "templates/index.html"]) {
  const f = join("./build", rel);
  if (!existsSync(f)) continue;
  const html = readFileSync(f, "utf8");
  const hit = MARKERS.find((m) => html.includes(m));
  check(!hit, `prerender guard: /${rel} has no baked passport-system markup${hit ? ` (found "${hit}")` : ""}`);
}

/* ── browser + backend stub ───────────────────────────────────────── */
const USER_ID = "22222222-2222-4222-8222-222222222222";
const EMAIL = "candidate@example.com";
const SESSION = {
  access_token: "stub", refresh_token: "stub", token_type: "bearer",
  expires_in: 2592000, expires_at: Math.floor(Date.now() / 1000) + 2592000,
  user: {
    id: USER_ID, aud: "authenticated", role: "authenticated", email: EMAIL,
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Obaid Mujtaba Khan" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

const FULL_CV = {
  name: "Obaid Mujtaba Khan", email: EMAIL, phone: "+971 55 123 9876",
  linkedin: "linkedin.com/in/obaidkhan", location: "Dubai, UAE", title: "IT Support Analyst",
  summary: "Support engineer with 6 years across UAE service desks and infrastructure.",
  nationality: "Indian", visaStatus: "Employment visa",
  skills: "Active Directory, ITIL, Office 365, Networking, Windows Server",
  languages: "English, Hindi, Urdu",
  experience: [{ company: "Falcon IT Services", role: "IT Support Analyst", period: "2021 - Present", points: "Resolved 1,200 tickets a year at first contact", startDate: "01/2021", endDate: "", present: true }],
  education: [{ school: "Institute of Business Management", degree: "BSc", year: "2017", fieldOfStudy: "Computer Science", startDate: "", endDate: "", location: "" }],
  certifications: [], technicalSkills: "", projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: [], customFields: [], availability: "", references: "", willingToRelocate: "",
};
// The empty-state document: a name and one role, nothing else.
const SPARSE_CV = {
  ...FULL_CV, skills: "", languages: "", education: [],
};

const browser = await chromium.launch();
const waitlistWrites = [];

async function newPage({ width = 1440, height = 950, signedIn = false, theme = "light", draft = null, fixedTime = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.port === String(PORT)) return route.continue();
    if (SUPA && req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/token") || url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.pathname.includes("/user") ? SESSION.user : SESSION) });
      }
      if (url.pathname.includes("/rest/v1/job_board_waitlist")) {
        // Capture the real insert payload — this is the seat being saved.
        try { waitlistWrites.push(JSON.parse(req.postData() || "{}")); } catch { waitlistWrites.push(null); }
        return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      }
      if (url.pathname.includes("/rest/v1/")) {
        const wantsObject = /vnd\.pgrst\.object/.test(req.headers().accept || "");
        let rows = [];
        if (url.pathname.includes("profiles")) rows = [{ id: USER_ID, user_type: "candidate", is_pro: false, full_name: "Obaid Mujtaba Khan", plan: "free" }];
        if (req.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
  await context.addInitScript(([key, session, th, signed, cv, ownerId]) => {
    localStorage.setItem("cvp_theme", th);
    if (signed) localStorage.setItem(key, JSON.stringify(session));
    if (cv) localStorage.setItem("cvp_cv_draft:new:default", JSON.stringify({ version: 2, cv, templateId: 1, resumeId: null, ownerId, updatedAt: Date.now() }));
  }, [`sb-${REF}-auth-token`, SESSION, theme, signedIn, draft, USER_ID]);
  const page = await context.newPage();
  if (fixedTime) await page.clock.setFixedTime(new Date(fixedTime));
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const shot = (page, n) => page.screenshot({ path: join(OUT, `${n}.png`) });
const scrollTo = (page, r) => page.evaluate((x) => {
  const d = document.documentElement;
  window.scrollTo(0, (d.scrollHeight - window.innerHeight) * x);
}, r);

/* ═══ D) HEADER STRIP ═════════════════════════════════════════════ */
for (const [label, width] of [["mobile", 393], ["desktop", 1440]]) {
  const { context, page } = await newPage({ width, height: width === 393 ? 852 : 950 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const strip = page.locator(".lst-root");
  check(await strip.isVisible(), `strip ${label}: renders`);
  const copy = page.locator(".lst-copy");
  const box = await copy.boundingBox();
  const lines = await copy.evaluate((el) => {
    const cs = getComputedStyle(el);
    return Math.round(el.getBoundingClientRect().height / (parseFloat(cs.lineHeight) || 18));
  });
  check(lines <= 1, `strip ${label}: copy is exactly one line (${lines})`);
  const text = (await copy.innerText()).trim();
  check(
    width === 393 ? /free for 2 weeks/i.test(text) && text.length < 40 : /3 CV imports/i.test(text),
    `strip ${label}: right copy ("${text}")`,
  );
  // Nothing overlaps: the CTA starts after the copy ends.
  const cta = await page.locator(".lst-cta").boundingBox();
  check(box && cta && cta.x >= box.x + box.width - 1, `strip ${label}: CTA does not overlap the copy`);
  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  check(docW <= width + 1, `strip ${label}: no horizontal overflow (${docW} <= ${width})`);
  // The strip must follow the PAGE theme. It renders inside App's legacy
  // dark island, so a regression here paints a black bar over a light page.
  const paint = await strip.evaluate((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const [r, g, b] = bg.match(/\d+/g).map(Number);
    return { bg, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
  });
  check(paint.lum > 0.6, `strip ${label}: light-theme strip is light, not a dark bar (${paint.bg})`);
  await shot(page, `strip-${label}`);
  await context.close();
}

/* ═══ A) MODAL ════════════════════════════════════════════════════ */
{
  const { context, page } = await newPage({});
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  check((await page.locator(".lom-root").count()) === 0, `modal: not shown at ${Date.now() - t0}ms with no scroll`);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 8000 }).catch(() => {});
  const shownAt = Date.now() - t0;
  check(shownAt >= 4500, `modal: waited the full ~5s dwell (${shownAt}ms)`);
  check(await page.locator(".lom-band img").isVisible(), "modal: mascot band restored");
  const mascot = await page.locator(".lom-band img").evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }));
  check(mascot.w > 0, `modal: mascot asset actually loads (${mascot.w}x${mascot.h})`);
  const body = await page.locator(".lom-card").innerText();
  check(/14 days,\s*free/i.test(body), "modal: '14 days, free' headline");
  check(/3\s*Imports/i.test(body) && /3\s*Downloads/i.test(body) && /All\s*Templates/i.test(body), "modal: 3 imports / 3 downloads / all templates");
  const countText = (await page.locator(".lom-count").innerText()).replace(/\s+/g, "");
  check(/\d+d\d+h\d+m/.test(countText), `modal: live countdown renders ("${countText}")`);
  check(/Ends\d\d[A-Za-z]{3}/i.test(countText), `modal: end-date label ("${countText}")`);
  check(/Trusted across India & the Gulf/i.test(body), "modal: trust line");
  check(/Free for 14 days, then the standard plan/i.test(body), "modal: reassurance line");
  check(/Start my 14 free days/i.test(body) && /Maybe later/i.test(body), "modal: CTA + Maybe later");
  await page.waitForTimeout(900);
  await shot(page, "modal-desktop");
  await context.close();
}
{
  const { context, page } = await newPage({});
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await scrollTo(page, 0.35);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 3000 }).catch(() => {});
  const at = Date.now() - t0;
  check(at < 4500, `modal: 30% scroll opens it before the timer (${at}ms)`);
  await context.close();
}
for (const [name, act] of [
  ["x", (p) => p.locator(".lom-close").click()],
  ["maybe_later", (p) => p.locator(".lom-maybe").click()],
  ["backdrop", (p) => p.locator(".lom-scrim").click({ position: { x: 8, y: 8 } })],
  ["esc", (p) => p.keyboard.press("Escape")],
]) {
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await scrollTo(page, 0.4);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 4000 }).catch(() => {});
  await act(page);
  await page.waitForTimeout(600);
  check((await page.locator(".lom-root").count()) === 0, `modal dismiss/${name}: closes`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await scrollTo(page, 0.6);
  await page.waitForTimeout(6500);
  check((await page.locator(".lom-root").count()) === 0, `modal dismiss/${name}: stays closed on reload`);
  await context.close();
}
{
  const { context, page } = await newPage({});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await scrollTo(page, 0.4);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 4000 }).catch(() => {});
  await page.locator(".lom-cta").click();
  await page.waitForTimeout(900);
  check(new URL(page.url()).pathname === "/register", `modal CTA signed-out → /register (${new URL(page.url()).pathname})`);
  const ret = await page.evaluate(() => sessionStorage.getItem("cvp_return_path"));
  check(ret === "/builder?new=1", `modal CTA signed-out: return path (${ret})`);
  await context.close();
}
{
  const { context, page } = await newPage({ signedIn: true });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await scrollTo(page, 0.4);
  await page.waitForSelector(".lom-root[data-shown='true']", { timeout: 4000 }).catch(() => {});
  await page.locator(".lom-cta").click();
  await page.waitForTimeout(1200);
  const u = new URL(page.url());
  check(u.pathname === "/builder" && u.search === "?new=1", `modal CTA signed-in → /builder?new=1 (${u.pathname}${u.search})`);
  await context.close();
}

/* ═══ B + C) CLEARANCE SCAN → BOARDING PASS ═══════════════════════ */
async function runDownload(draft, label) {
  const { context, page } = await newPage({ signedIn: true, draft });
  await page.evaluate(() => {}).catch(() => {});
  await page.goto(`${BASE}/builder`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // The modal never fires inside the builder — assert that while we are here.
  check((await page.locator(".lom-root").count()) === 0, `${label}: launch modal never opens inside /builder`);

  const dl = page.waitForEvent("download", { timeout: 45000 }).catch(() => null);
  await page.locator('button[aria-label="Export resume as PDF"]').first().click();

  await page.waitForSelector(".csc-root", { timeout: 8000 });
  check(true, `${label}: clearance scan opens`);

  // Gauge counts UP, and the ledger is read WHILE the scan is on screen —
  // the handoff to the download is deliberately fast (~2s), so anything
  // read after it has already been replaced by the boarding pass.
  const samples = [];
  let ledger = "";
  let finalScore = 0;
  let shotTaken = false;
  for (let i = 0; i < 20; i += 1) {
    const s = await page.locator(".csc-score").innerText().catch(() => null);
    if (s == null) break; // scan handed off
    samples.push(s);
    const n = Number(String(s).trim());
    if (Number.isFinite(n) && n > 0) finalScore = n;
    const led = await page.locator(".csc-ledger").innerText().catch(() => "");
    if (led && led.length >= ledger.length) ledger = led;
    if (!shotTaken && /Cleared|Add/.test(led)) { await shot(page, `clearance-${label}`); shotTaken = true; }
    await page.waitForTimeout(110);
  }
  const nums = samples.map((s) => Number(String(s).trim())).filter((n) => Number.isFinite(n));
  const rose = nums.length > 1 && nums[nums.length - 1] > nums[0];
  check(samples[0].includes("—") || rose, `${label}: gauge starts blank then counts up (${samples[0]} → ${samples[samples.length - 1]})`);
  check(nums.length > 0 && new Set(nums).size > 1, `${label}: score animates through intermediate values (${new Set(nums).size} distinct)`);
  check(ledger.length > 0, `${label}: ledger captured while the scan was on screen`);
  const dlEvent = await dl;
  return { context, page, ledger, finalScore, downloaded: !!dlEvent };
}

{
  const r = await runDownload(FULL_CV, "full");
  check(/Cleared/i.test(r.ledger), "clearance full: entries read Cleared");
  check(!/\bAdd\b/.test(r.ledger), "clearance full: no empty-state rows on a complete CV");
  check(r.downloaded, "clearance full: hands off to the real download");

  /* ── C) boarding pass ── */
  await r.page.waitForSelector(".bpx-root", { timeout: 20000 });
  const pass = await r.page.locator(".bpx-pass").innerText();
  check(/Obaid, you’re cleared\./.test(pass) || /Obaid, you're cleared\./.test(pass), "boarding pass: personalised headline");
  check(/Go get the job\./.test(pass), "boarding pass: 'Go get the job.'");
  check(new RegExp(`ATS ${r.finalScore}`).test(pass), `boarding pass: subline carries the real score (ATS ${r.finalScore})`);
  check(/HOLDER[\s\S]*Obaid Mujtaba Khan/i.test(pass), "boarding pass: HOLDER field");
  check(/DOCUMENT[\s\S]*PDF/i.test(pass), "boarding pass: DOCUMENT field");
  check(/India & the Gulf/.test(pass), "boarding pass: ROUTE field");
  check(/This version/.test(pass), "boarding pass: VALID field");
  check(/Boost my ATS score/.test(pass), "boarding pass: Boost is the primary action");
  check(!/Browse Gulf jobs/i.test(pass) && !/bayt/i.test(pass), "boarding pass: no Browse Gulf jobs / no Bayt");
  check(!/make it count/i.test(pass), "boarding pass: 'make it count' is gone");
  check(/downloads? left this month|Unlimited/.test(pass), "boarding pass: real downloads counter");
  check(/BOARDING SOON/i.test(pass), "job board card: Boarding soon eyebrow");
  check(/The CVPassport Job Board/.test(pass), "job board card: title");
  check(/We’re building it now|We're building it now/.test(pass), "job board card: body copy");
  check(/GATE \d\d/.test(pass), "job board card: gate code");
  check(/Sample roles · preview/i.test(pass), "job board card: sample-roles preview tag");
  check(/Nexa Systems/.test(pass) && !/Gmail/.test(pass), "job board card: Nexa Systems replaces Gmail");
  check(!/Verified employers/i.test(pass), "job board card: 'Verified employers, real salaries' removed");
  check(!/Reviewing applicants/i.test(pass), "job board card: 'Reviewing applicants' removed");
  const applyClickable = await r.page.locator(".bpx-preview button").count();
  check(applyClickable === 0, "job board card: sample listings expose no clickable Apply");

  // Share opens three channels.
  await r.page.getByRole("button", { name: /Share my CV/i }).click();
  await r.page.waitForTimeout(300);
  const shareBtns = await r.page.locator(".bpx-share button").allInnerTexts();
  check(shareBtns.length === 3 && /WhatsApp/.test(shareBtns.join(" ")) && /LinkedIn/.test(shareBtns.join(" ")) && /Copy link/.test(shareBtns.join(" ")),
    `boarding pass: share offers WhatsApp / LinkedIn / Copy link (${shareBtns.join(", ")})`);
  await r.page.locator(".bpx-share button", { hasText: "Copy link" }).click();
  await r.page.waitForTimeout(400);
  // Headless Chromium denies clipboard writes; the button must report that
  // honestly (never a false "copied") and must not throw an unhandled
  // rejection — a pageerror here fails the run on its own.
  const shareState = await r.page.locator(".bpx-pass").innerText();
  check(/Link copied|Copy mycvpassport\.com|Copy blocked/i.test(shareState), "boarding pass: copy link reports its real outcome");

  // Save my seat — must WRITE before it says you're on the list.
  const before = waitlistWrites.length;
  await r.page.locator(".bpx-seat-cta").click();
  await r.page.waitForTimeout(300);
  check(await r.page.locator(".bpx-seat-form").isVisible(), "save my seat: opens the market picker");
  check(/candidate@example\.com/.test(await r.page.locator(".bpx-seat-form").innerText()), "save my seat: signed-in account email is used");
  await r.page.locator(".bpx-market", { hasText: "Gulf" }).click();
  await r.page.locator(".bpx-seat-form .bpx-seat-cta").click();
  await r.page.waitForSelector(".bpx-seated", { timeout: 8000 });
  check(waitlistWrites.length === before + 1, `save my seat: one waitlist row written (${waitlistWrites.length - before})`);
  const row = waitlistWrites[waitlistWrites.length - 1];
  const payload = Array.isArray(row) ? row[0] : row;
  check(payload && payload.email === EMAIL, `save my seat: row carries the email (${payload && payload.email})`);
  check(payload && payload.target_market === "gulf", `save my seat: row carries the market (${payload && payload.target_market})`);
  check(payload && payload.source === "boarding_pass", `save my seat: row carries the source (${payload && payload.source})`);
  check(/You’re on the list|You're on the list/.test(await r.page.locator(".bpx-seated").innerText()), "save my seat: opted-in state shows AFTER the write");
  check(/We’ll email you the moment it opens|We'll email you the moment it opens/.test(await r.page.locator(".bpx-seated").innerText()), "save my seat: opted-in copy");
  await shot(r.page, "boarding-pass");

  // Boost is in-tool: it closes the pass and lands on ATS Check.
  await r.page.locator(".bpx-cta").click();
  await r.page.waitForTimeout(900);
  check((await r.page.locator(".bpx-root").count()) === 0, "boost: closes the boarding pass");
  const onAts = await r.page.locator(".cvp-builder-tabchip[aria-selected='true'], .cvp-builder-tabchip").allInnerTexts().catch(() => []);
  check(new URL(r.page.url()).pathname === "/builder", `boost: stays in-tool (${new URL(r.page.url()).pathname})`);
  check(/ATS/i.test((await r.page.locator("body").innerText()).slice(0, 4000)) && onAts.length > 0, "boost: builder still mounted on the ATS surface");
  await r.context.close();
}

{
  const r = await runDownload(SPARSE_CV, "sparse");
  check(/\bAdd\b/i.test(r.ledger), "clearance empty-state: absent fields show Add");
  check(/Add skills to boost/i.test(r.ledger), "clearance empty-state: 'Add skills to boost'");
  check(/Add to boost/i.test(r.ledger), "clearance empty-state: education 'Add to boost'");
  const skillsRow = await r.page.locator(".csc-row", { hasText: "Skills" }).first().innerText();
  check(!/Cleared/i.test(skillsRow), `clearance empty-state: empty skills row is never Cleared ("${skillsRow.replace(/\n/g, " ")}")`);
  await r.context.close();
}

/* ═══ OFFER OFF ═══════════════════════════════════════════════════ */
{
  const { context, page } = await newPage({ fixedTime: "2026-09-01T10:00:00" });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await scrollTo(page, 0.5);
  await page.waitForTimeout(6500);
  check((await page.locator(".lom-root").count()) === 0, "offer off: no modal");
  check((await page.locator(".lst-root").count()) === 0, "offer off: no strip");
  check(!/Launch offer/i.test(await page.locator("body").innerText()), "offer off: no launch-offer copy anywhere on the landing page");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
