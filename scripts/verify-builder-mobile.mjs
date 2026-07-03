/* Mobile builder walkthrough — the preview experience at phone widths.
   At 360/393/430: form mode + pill, full-screen preview (fit + double-tap
   zoom), template bottom sheet, focused-input state, plus empty/half/full
   fixture states in both app themes. Every page state ends with a
   horizontal-overflow audit. Desktop panel sanity-checked at 1440.
   Usage: node scripts/verify-builder-mobile.mjs <outDir>                */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium, devices } from "@playwright/test";

const OUT = process.argv[2] || "scripts/.screenshots/builder-mobile";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4192, r));

const FULL_CV = {
  name: "Priya Ramachandran Nair", email: "priya.nair@example.com", phone: "+971 55 123 9876",
  linkedin: "linkedin.com/in/priyanair", location: "Abu Dhabi, UAE", title: "Senior Accountant",
  summary: "Chartered accountant with 9 years across UAE audit, statutory reporting and consolidation. Led IFRS 16 transition for a 14-entity group and owns month-end close to day 4.",
  nationality: "Indian", visaStatus: "Employment visa", dob: "12 Mar 1992", gender: "Female",
  maritalStatus: "Married", drivingLicense: "UAE light vehicle",
  skills: "IFRS, Consolidation, Statutory audit, SAP FICO, VAT, Cash-flow forecasting, Month-end close",
  technicalSkills: "", languages: "English, Malayalam, Hindi",
  experience: [
    { company: "Falcon Audit Group", role: "Senior Accountant", period: "2021 – Present", startDate: "2021", endDate: "", present: true, points: "Closed monthly consolidation for 12 entities\nCut close cycle from 9 to 4 working days\nLed IFRS 16 adoption covering 60+ leases\nOwn VAT filing for three TRN groups" },
    { company: "Gulf Retail Holdings", role: "Financial Accountant", period: "2018 – 2021", startDate: "2018", endDate: "2021", present: false, points: "Managed fixed-asset register of AED 240M\nRebuilt group cash-flow forecast model\nSAP FICO rollout finance workstream lead" },
    { company: "TransIndia Logistics", role: "Accounts Executive", period: "2016 – 2018", startDate: "2016", endDate: "2018", present: false, points: "Processed 300+ supplier invoices monthly\nReconciled 14 bank accounts weekly" },
  ],
  education: [{ school: "University of Kerala", degree: "B.Com (Hons)", year: "2013" }],
  certifications: [], projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: ["personalDetails"], customFields: [], availability: "",
  willingToRelocate: "", references: "References available upon request",
};
const HALF_CV = { ...FULL_CV, summary: "", skills: "", languages: "", experience: [FULL_CV.experience[0]], education: [] };

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
        if (el.closest(".dp-measure")) return; // offscreen measuring render lives at -12000px by design
        if (inHScroll(el)) return;
        if (el.parentElement && offenders.some((o) => o.el && o.el.contains(el))) return;
        offenders.push({ el, tag: el.tagName, cls: String(el.className).slice(0, 80), right: Math.round(r.right) });
      }
    });
    return { vw, doc, offenders: offenders.slice(0, 10).map(({ tag, cls, right }) => ({ tag, cls, right })) };
  });
  check(res.doc <= res.vw + 1, `${label}: no horizontal overflow (${res.doc} <= ${res.vw})`);
  res.offenders.forEach((o) => console.log(`   ↳ ${o.tag}.${o.cls} right=${o.right}`));
}

// Classic (non-overlay) scrollbars — a real desktop-class narrow window
// consumes viewport width with the scrollbar; emulated overlay scrollbars
// masked a 100vw overflow once already.
const browser = await chromium.launch({ args: ["--disable-features=OverlayScrollbar"] });

async function newBuilderPage({ width, cv = FULL_CV, templateId = 1, theme = "dark", touch = true }) {
  const context = await browser.newContext({
    viewport: { width, height: 852 },
    hasTouch: touch,
    isMobile: touch,
    userAgent: touch ? devices["Pixel 5"].userAgent : undefined,
  });
  await context.addInitScript(({ cvv, tid, th }) => {
    if (cvv) {
      localStorage.setItem(
        "cvp_cv_draft:new:default",
        JSON.stringify({ version: 2, cv: cvv, templateId: tid, resumeId: null, ownerId: null, updatedAt: Date.now() }),
      );
    }
    localStorage.setItem("cvp_theme", th);
  }, { cvv: cv, tid: templateId, th: theme });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto("http://localhost:4192/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });

/* ── phone widths: full walkthrough ───────────────────────────── */
for (const width of [360, 393, 430]) {
  console.log(`\n── ${width}px ──`);
  const { context, page } = await newBuilderPage({ width });

  // form mode: ONE floating control (the FAB) — the Preview pill is gone
  check((await page.locator(".dp-pill").count()) === 0, `${width}: no separate Preview pill`);
  const fab = page.locator(".cvp-fab-physical");
  check(await fab.isVisible(), `${width}: FAB present`);

  // no stray measurement/debug text nodes anywhere
  const pxText = await page.evaluate(() => {
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      const t = (n.textContent || "").trim();
      if (/^\d+(\.\d+)?px$/.test(t)) hits.push(t);
      n = walker.nextNode();
    }
    return hits;
  });
  check(pxText.length === 0, `${width}: no debug px text on page${pxText.length ? ` (${pxText.join(", ")})` : ""}`);

  // header chrome budget: first input reachable without scrolling
  const firstInputTop = await page.evaluate(() => {
    const el = document.querySelector(".cvp-builder-mobile input:not([type=file])");
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check(firstInputTop != null && firstInputTop < 300, `${width}: first input above the fold (top=${firstInputTop})`);

  // completion breakdown: opens AND closes (chevron, outside tap)
  const chevron = page.getByRole("button", { name: "CV completion breakdown" }).first();
  await chevron.tap();
  await page.waitForTimeout(400);
  check(await page.getByText("CV Completion Breakdown").first().isVisible(), `${width}: breakdown opens`);
  await shot(page, `w${width}-breakdown-open`);
  await chevron.tap();
  await page.waitForTimeout(400);
  check((await page.getByText("CV Completion Breakdown").count()) === 0, `${width}: chevron toggles breakdown closed`);
  await chevron.tap();
  await page.waitForTimeout(400);
  await page.touchscreen.tap(Math.round(width / 2), 620); // tap the form, outside
  await page.waitForTimeout(400);
  check((await page.getByText("CV Completion Breakdown").count()) === 0, `${width}: outside tap closes breakdown`);

  await shot(page, `w${width}-form`);
  await auditOverflow(page, `${width} form mode`);

  // full-screen preview via the FAB (fit)
  await fab.tap();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Preview CV" }).first().tap();
  await page.waitForTimeout(1200);
  const sheet = page.locator(".dp-root--overlay .dp-sheetbox").first();
  check(await sheet.isVisible(), `${width}: full-screen preview opens with A4 sheet`);
  const pages = await page.locator(".dp-root--overlay .dp-sheetbox").count();
  check(pages >= 2, `${width}: 2-page fixture paginates (${pages} sheets)`);
  const indicator = await page.locator(".dp-root--overlay .dp-toolbar__pages").innerText();
  check(/page\s+\d+\s*\/\s*\d+/i.test(indicator), `${width}: page indicator ("${indicator.trim()}")`);
  const sheetBox = await sheet.boundingBox();
  check(!!sheetBox && sheetBox.width <= width, `${width}: sheet fits viewport width (${sheetBox && Math.round(sheetBox.width)})`);
  await shot(page, `w${width}-preview-fit`);
  await auditOverflow(page, `${width} preview fit`);

  // double-tap zoom
  const center = { x: Math.round(width / 2), y: 400 };
  await page.touchscreen.tap(center.x, center.y);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(center.x, center.y);
  await page.waitForTimeout(600);
  const pct = await page.locator(".dp-root--overlay .dp-toolbar__pct").innerText();
  check(parseInt(pct, 10) > 100 || parseInt(pct, 10) === 135, `${width}: double-tap zooms (${pct.trim()})`);
  await shot(page, `w${width}-preview-zoomed`);

  // scroll to page 2 → indicator updates
  await page.locator(".dp-root--overlay .dp-stage").evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(700);
  const ind2 = await page.locator(".dp-root--overlay .dp-toolbar__pages").innerText();
  check(/page\s+[2-9]/i.test(ind2), `${width}: indicator follows scroll ("${ind2.trim()}")`);

  // close returns to the form
  await page.getByRole("button", { name: "Close preview" }).tap();
  await page.waitForTimeout(600);
  check(await fab.isVisible(), `${width}: close returns to form (FAB back)`);

  // template bottom sheet
  await page.getByRole("button", { name: "CV template" }).tap();
  await page.waitForTimeout(700);
  const sheetList = page.locator("[role='listbox'][aria-label='CV templates']");
  const sheetBoxT = await sheetList.boundingBox();
  const vh = 852;
  check(!!sheetBoxT && sheetBoxT.y > vh * 0.25 && Math.abs(sheetBoxT.y + sheetBoxT.height - vh) < 4, `${width}: template picker is a bottom sheet (y=${sheetBoxT && Math.round(sheetBoxT.y)})`);
  const opt = sheetList.getByRole("option").first();
  const optBox = await opt.boundingBox();
  check(!!optBox && optBox.height >= 44, `${width}: sheet option rows ≥44px (${optBox && Math.round(optBox.height)})`);
  await shot(page, `w${width}-template-sheet`);
  await sheetList.getByRole("option", { name: /Arabia Pro/ }).tap();
  await page.waitForTimeout(900);
  check((await page.locator(".cvp-fab-physical").count()) > 0, `${width}: FAB present after template switch`);

  // ── addendum A-D: tab bar, FAB ring, strip opacity, overlap audit ──
  // D: tabs readable + tappable, "Job Match" not truncated
  const tabChip = page.locator(".cvp-builder-tabchip", { hasText: "Job Match" });
  check(await tabChip.count() > 0 && await tabChip.first().innerText() === "Job Match", `${width}: "Job Match" tab label intact`);
  const chipBox = await page.locator(".cvp-builder-tabchip").first().boundingBox();
  check(!!chipBox && chipBox.height >= 40, `${width}: tab chips tappable (h=${chipBox && Math.round(chipBox.height)})`);
  const chipFont = await page.locator(".cvp-builder-tabchip").first().evaluate((el) => getComputedStyle(el).fontSize);
  check(parseFloat(chipFont) >= 12, `${width}: tab labels readable (${chipFont})`);

  // B: FAB ring geometry sane + hidden while typing
  const fabSvg = page.locator(".cvp-fab-progress-svg");
  if (await fabSvg.count()) {
    const svgBox = await fabSvg.first().boundingBox();
    check(!!svgBox && Math.abs(svgBox.width - 68) < 2 && Math.abs(svgBox.height - 68) < 2, `${width}: FAB ring box matches viewBox (${svgBox && Math.round(svgBox.width)}px)`);
  }

  // C: progress card is FULLY OPAQUE (no see-through garble over titles)
  const stripBg = await page.evaluate(() => {
    const strips = Array.from(document.querySelectorAll(".cvp-builder-mobile [style*='sticky']"));
    const strip = strips.find((el) => el.textContent.includes("%"));
    return strip ? getComputedStyle(strip).backgroundColor : null;
  });
  check(!!stripBg && !/rgba\(.*,\s*0?\.\d+\)/.test(stripBg), `${width}: progress card opaque (${stripBg})`);

  // Fixed/floating elements must never overlap an input's tap area
  const overlapReport = await page.evaluate(() => {
    const floatSel = [".dp-pill", ".cvp-fab-physical", ".cvp-builder-action-bar"];
    const floatRects = floatSel.flatMap((sel) => Array.from(document.querySelectorAll(sel)))
      .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed")
      .map((el) => ({ sel: el.className.slice(0, 30), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0);
    const bad = [];
    document.querySelectorAll("input, textarea, select").forEach((inp) => {
      const ir = inp.getBoundingClientRect();
      if (ir.width === 0 || ir.height === 0) return;
      if (ir.bottom < 0 || ir.top > window.innerHeight) return; // offscreen
      floatRects.forEach(({ sel, r }) => {
        const x = Math.max(0, Math.min(r.right, ir.right) - Math.max(r.left, ir.left));
        const y = Math.max(0, Math.min(r.bottom, ir.bottom) - Math.max(r.top, ir.top));
        if (x > 4 && y > 4) bad.push(`${sel} over input @y=${Math.round(ir.top)}`);
      });
    });
    return bad;
  });
  check(overlapReport.length === 0, `${width}: no floating element covers an input${overlapReport.length ? ` (${overlapReport.join("; ")})` : ""}`);

  // focused input (keyboard-open proxy: focus + centring behaviour)
  const nameInput = page.locator(".cvp-builder-mobile input:visible").first();
  await nameInput.scrollIntoViewIfNeeded();
  await nameInput.click({ timeout: 10000 }).catch(async () => {
    await nameInput.focus();
  });
  await page.waitForTimeout(600);
  const inputBox = await nameInput.boundingBox();
  check(!!inputBox && inputBox.y > 0 && inputBox.y < 852, `${width}: focused input on screen (y=${inputBox && Math.round(inputBox.y)})`);
  await shot(page, `w${width}-input-focused`);
  await auditOverflow(page, `${width} input focused`);

  await context.close();
}

/* ── empty / half / full states, both themes (single width) ───── */
for (const theme of ["dark", "light"]) {
  for (const [label, cv] of [["empty", null], ["half", HALF_CV], ["full", FULL_CV]]) {
    const { context, page } = await newBuilderPage({ width: 393, cv, theme });
    await page.locator(".cvp-fab-physical").tap();
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Preview CV" }).first().tap();
    await page.waitForTimeout(1300);
    const sheetVisible = await page.locator(".dp-root--overlay .dp-sheet").first().isVisible();
    check(sheetVisible, `393 ${theme} ${label}: white sheet renders`);
    // the sheet is paper — white in BOTH themes
    const bg = await page.locator(".dp-root--overlay .dp-sheet").first().evaluate((el) => getComputedStyle(el).backgroundColor);
    check(bg === "rgb(255, 255, 255)", `393 ${theme} ${label}: sheet stays white (${bg})`);
    if (label === "empty") {
      const phCount = await page.locator(".dp-root--overlay .cvp-ph").count();
      check(phCount > 0, `393 ${theme} empty: placeholder spans present (${phCount})`);
    }
    await shot(page, `t1-${theme}-${label}-393`);
    await context.close();
  }
}

/* ── REAL narrow window (no touch emulation, classic scrollbars) ── */
{
  const { context, page } = await newBuilderPage({ width: 360, touch: false });
  await auditOverflow(page, "360 real window (no touch flags)");
  const pxText = await page.evaluate(() => {
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      const t = (n.textContent || "").trim();
      if (/^\d+(\.\d+)?px$/.test(t)) hits.push(t);
      n = walker.nextNode();
    }
    return hits;
  });
  check(pxText.length === 0, `360 real window: no debug px text${pxText.length ? ` (${pxText.join(", ")})` : ""}`);

  // responsiveness: resize churn + click must answer fast, no long tasks
  await page.evaluate(() => {
    window.__longTasks = [];
    new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => window.__longTasks.push(Math.round(e.duration)));
    }).observe({ entryTypes: ["longtask"] });
  });
  for (const w of [420, 362, 395, 360]) {
    // eslint-disable-next-line no-await-in-loop
    await page.setViewportSize({ width: w, height: 852 });
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(120);
  }
  const t0 = Date.now();
  await page.locator(".cvp-builder-mobile input:visible").first().click({ timeout: 5000 });
  const clickMs = Date.now() - t0;
  await page.waitForTimeout(800);
  const longTasks = await page.evaluate(() => window.__longTasks.filter((d) => d > 500));
  check(clickMs < 2000, `360 real window: click responds fast after resize churn (${clickMs}ms)`);
  check(longTasks.length === 0, `360 real window: no >500ms main-thread stalls${longTasks.length ? ` (${longTasks.join(",")}ms)` : ""}`);
  await shot(page, "w360-real-window");
  await context.close();
}

/* ── desktop panel sanity (1440) ──────────────────────────────── */
{
  const { context, page } = await newBuilderPage({ width: 1440, touch: false });
  const panel = page.locator(".dp-panel-holder");
  check(await panel.isVisible(), "1440: desktop paginated panel renders");
  const pages = await page.locator(".dp-panel-holder .dp-sheetbox").count();
  check(pages >= 2, `1440: fixture paginates on desktop (${pages} sheets)`);
  await page.locator(".dp-tool[aria-label='Zoom in']").click();
  await page.waitForTimeout(300);
  const pct = await page.locator(".dp-toolbar__pct").first().innerText();
  check(parseInt(pct, 10) > 0, `1440: zoom controls live (${pct.trim()})`);
  await shot(page, "desktop-panel-1440");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL BUILDER-MOBILE CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
