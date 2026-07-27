/* UI fix pack verification — Claude Design "CVPassport, Select + Mobile
   Menu redesign" (Jul 2026).

   Serves the production build with a stubbed backend and drives the two
   fixes on real renders, desktop + mobile, light + dark:

     FIX 1  .cvp-select — popover on desktop (opens, keyboards, flips up
            near the viewport bottom), bottom sheet on mobile. Nothing is
            ever cut off: the panel and the pinned "Not listed? Type your
            own" footer must sit inside the viewport at EVERY list length,
            and the last option must be reachable by scrolling the list.
     FIX 2  the mobile drawer shows exactly ONE CVPassport header — the
            page header is hidden and the drawer is full-bleed.

   Usage: node scripts/verify-ui-fix-pack.mjs [outDir]
   Screenshots land in outDir (default verify-ui-fix-pack-out). */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "verify-ui-fix-pack-out";
mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/_vercel")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
    return;
  }
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(4197, r));
const BASE = "http://localhost:4197";

/* Owner-stamped draft (ownerId null = the signed-out local draft the
   builder picks up without ?new=1). */
const FULL_CV = {
  name: "Priya Ramachandran Nair", email: "priya.nair@example.com", phone: "+971 55 123 9876",
  linkedin: "linkedin.com/in/priyanair", location: "Abu Dhabi, UAE", title: "Senior Accountant",
  summary: "Chartered accountant with 7 years across UAE audit and reporting.",
  nationality: "Indian", visaStatus: "Resident visa", dob: "12 Mar 1994",
  gender: "Female", maritalStatus: "Married", drivingLicense: "",
  skills: "IFRS, Audit, SAP FICO", languages: "English, Malayalam, Hindi",
  experience: [{ company: "Falcon Audit Group", role: "Senior Accountant", period: "2021 - Present", points: "Closed monthly consolidation for 12 entities", startDate: "01/2021", endDate: "", present: true }],
  education: [{ school: "University of Kerala", degree: "B.Com", year: "2016", fieldOfStudy: "Commerce", startDate: "", endDate: "", location: "" }],
  certifications: [], technicalSkills: [], projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: [], customFields: [], availability: "",
  references: "References available upon request", willingToRelocate: "",
};

const results = [];
function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`);
}

const browser = await chromium.launch();

async function newPage({ width, height, theme, seedDraft = true }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 768, isMobile: width < 768 });
  const page = await ctx.newPage();
  await page.route(/supabase|posthog|sentry/i, (route) => route.fulfill({ status: 204, body: "" }));
  await page.addInitScript(
    ({ cv, seed, th }) => {
      localStorage.setItem("cvp_theme", th);
      if (seed) {
        localStorage.setItem(
          "cvp_cv_draft:new:default",
          JSON.stringify({ version: 2, cv, templateId: 1, resumeId: null, ownerId: null, updatedAt: Date.now() }),
        );
      }
    },
    { cv: FULL_CV, seed: seedDraft, th: theme },
  );
  return { ctx, page };
}

/* Every geometry assertion in one place: the panel, its pinned footer and
   the last row of the list must all be inside the viewport. */
async function panelGeometry(page) {
  return page.evaluate(() => {
    const panel = document.querySelector(".cvp-select__panel");
    if (!panel) return null;
    const list = panel.querySelector(".cvp-select__list");
    const custom = panel.querySelector(".cvp-select__custom");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height, width: b.width };
    };
    return {
      variant: panel.getAttribute("data-variant"),
      placement: panel.getAttribute("data-placement"),
      panel: r(panel),
      custom: r(custom),
      listScrollable: list ? list.scrollHeight > list.clientHeight + 1 : false,
      vw: window.innerWidth,
      vh: window.innerHeight,
      hasSearch: !!panel.querySelector(".cvp-select__search"),
      optionCount: panel.querySelectorAll(".cvp-select__option").length,
      customText: custom ? custom.innerText.replace(/\s+/g, " ").trim() : "",
    };
  });
}

/* Scroll the list to its end, then report where the last row landed. */
async function lastRowAfterScrollToEnd(page) {
  return page.evaluate(() => {
    const panel = document.querySelector(".cvp-select__panel");
    const list = panel && panel.querySelector(".cvp-select__list");
    if (!list) return null;
    list.scrollTop = list.scrollHeight;
    const rows = panel.querySelectorAll(".cvp-select__option");
    const last = rows[rows.length - 1];
    if (!last) return null;
    const lb = last.getBoundingClientRect();
    const pb = panel.getBoundingClientRect();
    const cb = panel.querySelector(".cvp-select__custom").getBoundingClientRect();
    return {
      lastLabel: last.innerText.trim(),
      lastTop: lb.top, lastBottom: lb.bottom,
      panelBottom: pb.bottom,
      customTop: cb.top, customBottom: cb.bottom,
      vh: window.innerHeight,
      atEnd: panel.querySelector(".cvp-select__scroll").getAttribute("data-at-end"),
    };
  });
}

const within = (g, tol = 1) => g && g.panel.bottom <= g.vh + tol && g.panel.top >= -tol && g.custom && g.custom.bottom <= g.vh + tol && g.custom.top >= -tol;

async function openBuilderPersonalDetails(page, mobile) {
  await page.goto(`${BASE}/builder`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2400);
  const scope = mobile ? ".cvp-builder-mobile-form" : ".cvp-builder-left";
  // The section renders its body in the DOM even when collapsed, so drive
  // the explicit "Expand section" control rather than the first button.
  await page.evaluate((sc) => {
    const row = document.querySelector(`${sc} [data-cvp-accordion="personalDetails"]`);
    const btn = row && [...row.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Expand section");
    if (btn) btn.click();
  }, scope);
  await page.waitForTimeout(1000);
  return scope;
}

const selectByLabel = (page, scope, label) =>
  page.locator(`${scope} .cvp-select`).filter({ has: page.locator(`.cvp-select__label:text-is("${label}")`) }).first();

/* ══════════════ FIX 1 · DESKTOP POPOVER ══════════════ */
for (const theme of ["light", "dark"]) {
  const { ctx, page } = await newPage({ width: 1440, height: 900, theme });
  const scope = await openBuilderPersonalDetails(page, false);

  // a) Visa status — searchable, popover variant, nothing clipped.
  const visa = selectByLabel(page, scope, "Visa status");
  await visa.locator(".cvp-select__trigger").scrollIntoViewIfNeeded();
  await visa.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(350);
  let g = await panelGeometry(page);
  log(`desktop/${theme}: visa opens as a popover with search, inside the viewport`,
    !!g && g.variant === "popover" && g.hasSearch && within(g) && g.customText.includes("Not listed"),
    g ? `variant=${g.variant} search=${g.hasSearch} panel=${Math.round(g.panel.top)}..${Math.round(g.panel.bottom)} vh=${g.vh}` : "no panel");
  await page.screenshot({ path: join(OUT, `d-${theme}-01-visa-popover.png`) });

  // b) keyboard: ArrowDown ×2 then Enter commits the highlighted row.
  const before = await page.evaluate(() => document.querySelectorAll('.cvp-select__option[data-active="true"]')[0]?.innerText.trim());
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const activeLabel = await page.evaluate(() => document.querySelector('.cvp-select__option[data-active="true"]')?.innerText.trim());
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const committed = await visa.locator(".cvp-select__value").innerText();
  const focusBack = await page.evaluate(() => document.activeElement?.className || "");
  log(`desktop/${theme}: ↑↓ moves and Enter commits, focus returns to the trigger`,
    committed.trim() === activeLabel && activeLabel !== before && focusBack.includes("cvp-select__trigger"),
    `active=${activeLabel} committed=${committed.trim()} focus=${focusBack}`);

  // c) Esc closes and refocuses; outside-click closes.
  await visa.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(250);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const closedByEsc = (await page.locator(".cvp-select__panel").count()) === 0;
  const escFocus = await page.evaluate(() => document.activeElement?.className || "");
  await visa.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(250);
  await page.locator(".cvp-select__scrim").click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(250);
  const closedByOutside = (await page.locator(".cvp-select__panel").count()) === 0;
  log(`desktop/${theme}: Esc closes + refocuses trigger, outside-click closes`,
    closedByEsc && closedByOutside && escFocus.includes("cvp-select__trigger"),
    `esc=${closedByEsc} outside=${closedByOutside} focus=${escFocus}`);

  // d) Nationality — the long list. Search present, last row reachable,
  //    pinned footer still on screen after scrolling to the end.
  const nat = selectByLabel(page, scope, "Nationality");
  await nat.locator(".cvp-select__trigger").scrollIntoViewIfNeeded();
  await nat.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(350);
  g = await panelGeometry(page);
  const tail = await lastRowAfterScrollToEnd(page);
  await page.waitForTimeout(150);
  log(`desktop/${theme}: 190-row nationality list scrolls internally, last row + footer both reachable`,
    !!g && g.hasSearch && g.listScrollable && within(g) && !!tail && tail.lastBottom <= tail.customTop + 1 && tail.customBottom <= tail.vh + 1,
    tail ? `last="${tail.lastLabel}" lastBottom=${Math.round(tail.lastBottom)} customTop=${Math.round(tail.customTop)} customBottom=${Math.round(tail.customBottom)} vh=${tail.vh}` : "no rows");
  await page.screenshot({ path: join(OUT, `d-${theme}-02-nationality-long-list.png`) });

  // e) search filters, and the tick marks the selected row.
  await page.locator(".cvp-select__search-box input").fill("fil");
  await page.waitForTimeout(250);
  const filtered = await page.evaluate(() => [...document.querySelectorAll(".cvp-select__option-label")].map((n) => n.innerText.trim()));
  await page.locator(".cvp-select__option", { hasText: "Filipino" }).first().click();
  await page.waitForTimeout(300);
  await nat.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(300);
  const tickOnSelected = await page.evaluate(() => {
    const sel = document.querySelector('.cvp-select__option[aria-selected="true"]');
    return sel ? { label: sel.innerText.trim(), tick: !!sel.querySelector(".cvp-select__tick") } : null;
  });
  log(`desktop/${theme}: search filters and the selected option carries the amber tick`,
    filtered.length > 0 && filtered.every((f) => f.toLowerCase().includes("fil")) && tickOnSelected?.tick && tickOnSelected.label === "Filipino",
    `filtered=${filtered.join("|")} selected=${JSON.stringify(tickOnSelected)}`);
  await page.keyboard.press("Escape");

  // f) flip-up: put a trigger low in the viewport and confirm placement=top
  //    and that the panel still sits fully on screen.
  const relocate = selectByLabel(page, scope, "Willing to relocate");
  await page.evaluate(() => {
    const col = document.querySelector(".cvp-builder-left");
    const labels = [...document.querySelectorAll(".cvp-select__label")];
    const t = labels.find((l) => l.textContent.trim() === "Willing to relocate");
    const trg = t.parentElement.querySelector(".cvp-select__trigger");
    const want = window.innerHeight - 90; // trigger bottom ~90px off the fold
    col.scrollTop += trg.getBoundingClientRect().bottom - want;
  });
  await page.waitForTimeout(400);
  await relocate.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(350);
  g = await panelGeometry(page);
  log(`desktop/${theme}: a select near the viewport bottom flips UP and stays on screen`,
    !!g && g.placement === "top" && within(g, 2),
    g ? `placement=${g.placement} panel=${Math.round(g.panel.top)}..${Math.round(g.panel.bottom)} vh=${g.vh}` : "no panel");
  await page.screenshot({ path: join(OUT, `d-${theme}-03-flip-up.png`) });
  await ctx.close();
}

/* ══════════════ FIX 1 · MOBILE BOTTOM SHEET ══════════════ */
for (const theme of ["light", "dark"]) {
  const { ctx, page } = await newPage({ width: 393, height: 852, theme });
  const scope = await openBuilderPersonalDetails(page, true);

  // a) short list (Gender, 3 options) — sheet sits on the bottom edge,
  //    the footer is fully visible.
  const gender = selectByLabel(page, scope, "Gender");
  await gender.locator(".cvp-select__trigger").scrollIntoViewIfNeeded();
  await gender.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(500);
  let g = await panelGeometry(page);
  log(`mobile/${theme}: short list opens as a bottom sheet, footer fully visible`,
    !!g && g.variant === "sheet" && within(g) && Math.abs(g.panel.bottom - g.vh) < 2 && g.customText.includes("Not listed"),
    g ? `variant=${g.variant} panelBottom=${Math.round(g.panel.bottom)} customBottom=${Math.round(g.custom.bottom)} vh=${g.vh}` : "no panel");
  await page.screenshot({ path: join(OUT, `m-${theme}-01-gender-sheet.png`) });
  await page.locator(".cvp-select__option", { hasText: "Prefer not to say" }).first().click();
  await page.waitForTimeout(300);
  const genderValue = await gender.locator(".cvp-select__value").innerText();
  log(`mobile/${theme}: tapping an option commits it and closes the sheet`,
    genderValue.trim() === "Prefer not to say" && (await page.locator(".cvp-select__panel").count()) === 0,
    `value=${genderValue.trim()}`);

  // b) long list (Nationality, 190) — search present, 80dvh cap honoured,
  //    footer pinned outside the scroll and never cut off.
  const nat = selectByLabel(page, scope, "Nationality");
  await nat.locator(".cvp-select__trigger").scrollIntoViewIfNeeded();
  await nat.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(500);
  g = await panelGeometry(page);
  const tail = await lastRowAfterScrollToEnd(page);
  await page.waitForTimeout(150);
  log(`mobile/${theme}: 190-row sheet caps at 80dvh, list is the only scroller, footer pinned + on screen`,
    !!g && g.hasSearch && g.listScrollable && within(g) && g.panel.height <= g.vh * 0.81 && !!tail && tail.lastBottom <= tail.customTop + 1 && tail.customBottom <= tail.vh + 1,
    tail ? `panelH=${Math.round(g.panel.height)} (cap ${Math.round(g.vh * 0.8)}) last="${tail.lastLabel}" lastBottom=${Math.round(tail.lastBottom)} customTop=${Math.round(tail.customTop)} customBottom=${Math.round(tail.customBottom)} vh=${tail.vh}` : "no rows");
  await page.screenshot({ path: join(OUT, `m-${theme}-02-nationality-sheet.png`) });

  // c) the pinned "type your own" row still commits from the sheet.
  await page.locator(".cvp-select__custom-field input").fill("Indian (OCI)");
  await page.locator(".cvp-select__custom-btn").click();
  await page.waitForTimeout(2500); // let the draft autosave debounce flush
  const custom = await nat.locator(".cvp-select__value").innerText();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("cvp_cv_draft:new:default") || "null"));
  log(`mobile/${theme}: "Not listed? Type your own" writes the free-text value through`,
    custom.trim() === "Indian (OCI)" && draft?.cv?.nationality === "Indian (OCI)",
    `value=${custom.trim()} draft=${draft?.cv?.nationality}`);
  await page.screenshot({ path: join(OUT, `m-${theme}-03-custom-committed.png`) });

  // d) safe-area: the footer carries the inset pad so the home indicator
  //    can never cover the last actionable row.
  await nat.locator(".cvp-select__trigger").click();
  await page.waitForTimeout(400);
  const pad = await page.evaluate(() => getComputedStyle(document.querySelector(".cvp-select__custom")).paddingBottom);
  log(`mobile/${theme}: sheet footer carries env(safe-area-inset-bottom) padding`,
    parseFloat(pad) >= 12, `padding-bottom=${pad}`);
  await page.keyboard.press("Escape");
  await ctx.close();
}

/* ══════════════ FIX 2 · SINGLE-HEADER MOBILE MENU ══════════════ */
for (const theme of ["light", "dark"]) {
  const { ctx, page } = await newPage({ width: 393, height: 852, theme, seedDraft: false });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.locator('button[aria-label="Open menu"]').first().click();
  await page.waitForTimeout(700);

  const state = await page.evaluate(() => {
    const visible = (el) => {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return false;
      let n = el;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return false;
        n = n.parentElement;
      }
      return true;
    };
    const logos = [...document.querySelectorAll("svg text")].filter((t) => t.textContent.trim() === "CVPassport");
    const drawer = document.querySelector(".cvp-nav-drawer");
    const header = document.querySelector(".cvp-nav-drawer-header");
    const pageNav = document.querySelector(".lp-nav");
    return {
      navOpenAttr: document.body.dataset.navOpen || "(unset)",
      pageNavVisibility: pageNav ? getComputedStyle(pageNav).visibility : "(none)",
      visibleLogos: logos.filter(visible).length,
      totalLogos: logos.length,
      drawerWidth: drawer ? Math.round(drawer.getBoundingClientRect().width) : 0,
      drawerLeft: drawer ? Math.round(drawer.getBoundingClientRect().left) : -1,
      vw: window.innerWidth,
      headerCount: document.querySelectorAll(".cvp-nav-drawer-header").length,
      headerHasTheme: !!header?.querySelector('button[aria-label*="theme"]'),
      headerHasClose: !!header?.querySelector('button[aria-label="Close menu"]'),
      headerSticky: header ? getComputedStyle(header).position : "(none)",
      freeToolRows: document.querySelectorAll('.cvp-nav-acc-inner .cvp-nav-item').length,
      freePills: [...document.querySelectorAll(".cvp-nav-item-title span")].filter((s) => s.textContent.trim() === "FREE TOOL").length,
      banner: document.querySelector(".cvp-nav-banner")?.textContent.trim() || "",
      highlighted: document.querySelectorAll('.cvp-nav-item[data-active="true"]').length,
      ctas: [...document.querySelectorAll(".cvp-nav-footer button")].map((b) => b.textContent.trim()),
      employerCard: !!document.querySelector(".cvp-nav-employer"),
      navChips: document.querySelectorAll(".cvp-nav-acc-inner .cvp-nav-item svg").length,
    };
  });
  await page.screenshot({ path: join(OUT, `menu-${theme}-01-open.png`) });

  log(`menu/${theme}: exactly ONE CVPassport header — page header hidden, drawer full-bleed`,
    state.visibleLogos === 1 && state.navOpenAttr === "true" && state.pageNavVisibility === "hidden" && state.drawerWidth === state.vw && state.drawerLeft === 0 && state.headerCount === 1,
    `visibleLogos=${state.visibleLogos}/${state.totalLogos} navOpen=${state.navOpenAttr} lpNav=${state.pageNavVisibility} drawer=${state.drawerWidth}/${state.vw}@${state.drawerLeft} headers=${state.headerCount}`);

  log(`menu/${theme}: the one header row is logo · theme · ✕ and stays put on scroll`,
    state.headerHasTheme && state.headerHasClose && state.headerSticky === "sticky",
    `theme=${state.headerHasTheme} close=${state.headerHasClose} position=${state.headerSticky}`);

  log(`menu/${theme}: all five Free Tools rows, amber FREE TOOL pills, 36px chips, no highlighted row`,
    state.freeToolRows === 5 && state.freePills === 5 && state.navChips >= 5 && state.highlighted === 0,
    `rows=${state.freeToolRows} pills=${state.freePills} chips=${state.navChips} highlighted=${state.highlighted}`);

  log(`menu/${theme}: banner + Create account / Sign in CTAs + employer card intact`,
    state.banner === "All free tools work without signup." && state.ctas.length === 2 && /Create account/.test(state.ctas[0]) && state.ctas[1] === "Sign in" && state.employerCard,
    `banner="${state.banner}" ctas=${JSON.stringify(state.ctas)} employer=${state.employerCard}`);

  // scrolled state — the sticky header must not let rows show through it
  await page.locator(".cvp-nav-drawer-scroll").evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `menu-${theme}-02-scrolled.png`) });
  const stillOne = await page.evaluate(() => {
    const visible = (el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(el.closest("nav, aside") || el).visibility !== "hidden";
    };
    return [...document.querySelectorAll("svg text")].filter((t) => t.textContent.trim() === "CVPassport").filter(visible).length;
  });
  log(`menu/${theme}: still one header after scrolling the drawer to the end`, stillOne === 1, `visibleLogos=${stillOne}`);

  // close restores the page header
  await page.locator('.cvp-nav-drawer-header button[aria-label="Close menu"]').click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({
    navOpenAttr: document.body.dataset.navOpen || "(unset)",
    pageNavVisibility: getComputedStyle(document.querySelector(".lp-nav")).visibility,
    overflow: document.body.style.overflow || "(unset)",
  }));
  log(`menu/${theme}: closing restores the page header and unlocks scroll`,
    after.navOpenAttr === "(unset)" && after.pageNavVisibility === "visible" && after.overflow !== "hidden",
    JSON.stringify(after));
  await page.screenshot({ path: join(OUT, `menu-${theme}-03-closed.png`) });
  await ctx.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed — screenshots in ${OUT}`);
if (failed.length) {
  console.log("FAILED:");
  failed.forEach((f) => console.log(`  · ${f.name} | ${f.detail}`));
  process.exit(1);
}
