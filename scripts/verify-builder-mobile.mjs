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

const browser = await chromium.launch();

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

  // form mode + pill
  const pill = page.locator(".dp-pill");
  check(await pill.isVisible(), `${width}: preview pill visible in form mode`);
  const pillBox = await pill.boundingBox();
  check(!!pillBox && pillBox.height >= 44, `${width}: pill tap target ≥44px (${pillBox && Math.round(pillBox.height)})`);
  await shot(page, `w${width}-form`);
  await auditOverflow(page, `${width} form mode`);

  // full-screen preview (fit)
  await pill.tap();
  await page.waitForTimeout(900);
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
  check(await pill.isVisible(), `${width}: close returns to form (pill back)`);

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
  check((await page.locator(".dp-pill--nudge, .dp-pill").count()) > 0, `${width}: pill present after template switch`);

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
    await page.locator(".dp-pill").tap();
    await page.waitForTimeout(900);
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
