/* Founder callout verification — the approved Claude Design "Founder
   Callout v3" ported into src/components/landing/FoundersNoteSection.jsx.
   Drives the production build and checks all four states plus low-end
   device behaviour.

   Usage: node scripts/verify-founder-callout.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "fc-out";
mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".xml": "text/xml", ".txt": "text/plain" };
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/_vercel")) {
    res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); return;
  }
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = join("./build", p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4211, r));
const BASE = "http://localhost:4211";

const results = [];
const log = (n, ok, d = "") => { results.push({ n, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  | " + d : ""}`); };

const browser = await chromium.launch();

/* The locked copy, exactly as the design renders it. */
const COPY = {
  badge: "Straight from the founder",
  hook: "Your CV isn’t judged by how it looks. It’s judged by what the software can read.",
  body: "Most companies run your CV through an ATS that scans it before any human does, and it reads data, not design. CVPassport is built the other way round. Data first, so your CV gets past the ATS and actually gets seen.",
  caveat: "It can’t promise you the job.",
  payoff: "But it makes sure you get a fair shot at it.",
  sig: "JMK, Founder of CVPassport",
  pill: "Cleared",
  sub: "Data first. Your CV was read the way the software reads it.",
};

async function open({ width, height, theme, reduce = false }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 768, hasTouch: width < 768,
    reducedMotion: reduce ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  await page.route(/supabase|posthog|sentry|clarity/i, (r) => r.fulfill({ status: 204, body: "" }));
  await page.addInitScript((t) => {
    localStorage.setItem("cvp_theme", t);
    localStorage.setItem("cvp_cookie_consent", "accepted");
  }, theme);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator(".cvp-fc").scrollIntoViewIfNeeded();
  // ring fill is 1500ms; wait past it so we assert the resolved state
  await page.waitForTimeout(3200);
  return { ctx, page };
}

const read = (page) => page.evaluate(() => {
  const s = document.querySelector(".cvp-fc");
  if (!s) return null;
  const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
  const ring = s.querySelector(".cvp-fc-ring circle:last-of-type");
  const wrap = s.querySelector(".cvp-fc-wrap");
  const copy = s.querySelector(".cvp-fc-copy");
  const loader = s.querySelector(".cvp-fc-loader");
  const pill = s.querySelector(".cvp-fc-pill");
  const mark = s.querySelector(".cvp-fc-mark");
  const caveat = s.querySelector(".cvp-fc-caveat");
  const payoff = s.querySelector(".cvp-fc-payoff");
  return {
    text: s.innerText,
    badge: s.querySelector(".cvp-fc-badge")?.textContent.trim(),
    hook: s.querySelector(".cvp-fc-hook")?.textContent.trim(),
    body: s.querySelector(".cvp-fc-body")?.textContent.trim(),
    caveat: caveat?.textContent.trim(),
    payoff: s.querySelector(".cvp-fc-payoff p")?.textContent.trim(),
    sig: s.querySelector(".cvp-fc-sig-name")?.textContent.trim(),
    pill: pill?.innerText.trim(),
    pillCleared: pill?.getAttribute("data-cleared") === "true",
    pillColor: cs(pill, "color"),
    pillBg: cs(pill, "backgroundColor"),
    sub: s.querySelector(".cvp-fc-statussub")?.textContent.trim(),
    dashOffset: ring?.getAttribute("stroke-dashoffset"),
    ringStroke: cs(ring, "stroke"),
    sweepMounted: !!s.querySelector(".cvp-fc-sweep"),
    tickMounted: !!s.querySelector(".cvp-fc-tick"),
    markSrc: mark?.getAttribute("src"),
    markW: mark ? Math.round(mark.getBoundingClientRect().width) : 0,
    sectionBg: cs(s, "backgroundColor"),
    textColor: cs(s, "color"),
    payoffBg: cs(payoff, "backgroundColor"),
    // layout
    stacked: wrap ? getComputedStyle(wrap).flexDirection === "column" : null,
    copyOrder: cs(copy, "order"),
    loaderOrder: cs(loader, "order"),
    copyTop: copy ? Math.round(copy.getBoundingClientRect().top) : 0,
    loaderTop: loader ? Math.round(loader.getBoundingClientRect().top) : 0,
    // caveat/payoff pairing
    caveatPayoffGap: caveat && payoff
      ? Math.round(payoff.getBoundingClientRect().top - caveat.getBoundingClientRect().bottom)
      : null,
    // overflow
    sectionRight: Math.round(s.getBoundingClientRect().right),
    vw: window.innerWidth,
    docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    orbitAnim: cs(s.querySelector(".cvp-fc-orbit"), "animationName"),
  };
});

const noDashes = (t) => !/[—–]/.test(t) && !/\w-\w/.test(t.replace(/mycvpassport|e-mail/gi, ""));

/* ══════════ four states: {mobile, desktop} x {day, night} ══════════ */
for (const [w, h, dev] of [[390, 844, "mobile"], [1280, 800, "desktop"]]) {
  for (const theme of ["light", "dark"]) {
    const { ctx, page } = await open({ width: w, height: h, theme });
    const r = await read(page);
    await page.locator(".cvp-fc").screenshot({ path: join(OUT, `${dev}-${theme}.png`) });

    log(`${dev}/${theme}: section renders`, !!r);

    log(`${dev}/${theme}: copy is the locked design copy, word for word`,
      r.badge === COPY.badge && r.hook === COPY.hook && r.body === COPY.body &&
      r.caveat === COPY.caveat && r.payoff === COPY.payoff && r.sig === COPY.sig,
      `sig="${r.sig}"`);

    log(`${dev}/${theme}: no em dash, en dash or hyphenated word in rendered text`,
      noDashes(r.text), r.text.match(/[—–]/g)?.join("") || "clean");

    log(`${dev}/${theme}: ring resolved to CLEARED and HOLDS (sweep unmounted, no loop)`,
      r.dashOffset === "0" && r.sweepMounted === false && r.tickMounted === true && r.pillCleared === true,
      `dashOffset=${r.dashOffset} sweep=${r.sweepMounted} tick=${r.tickMounted}`);

    log(`${dev}/${theme}: CLEARED pill + caption match the design`,
      /CLEARED/i.test(r.pill) && r.sub === COPY.sub, `pill="${r.pill}"`);

    log(`${dev}/${theme}: brand mark is public/favicon.svg at 112px, not redrawn`,
      r.markSrc === "/favicon.svg" && r.markW === 112, `src=${r.markSrc} w=${r.markW}`);

    log(`${dev}/${theme}: no horizontal overflow from the decorations`,
      r.docOverflow === false && r.sectionRight <= r.vw, `right=${r.sectionRight} vw=${r.vw} docOverflow=${r.docOverflow}`);

    if (dev === "mobile") {
      log(`${dev}/${theme}: stacked, copy leads and the loader sits below`,
        r.stacked === true && r.copyOrder === "1" && r.loaderOrder === "2" && r.copyTop < r.loaderTop,
        `copyTop=${r.copyTop} loaderTop=${r.loaderTop}`);
      log(`${dev}/${theme}: caveat stays welded to the payoff card (gap tightened)`,
        r.caveatPayoffGap !== null && r.caveatPayoffGap <= 12, `gap=${r.caveatPayoffGap}px`);
      log(`${dev}/${theme}: perpetual orbit rotation is off on phones`,
        r.orbitAnim === "none", `animation-name=${r.orbitAnim}`);
    } else {
      log(`${dev}/${theme}: side by side, ring left and copy right`,
        r.stacked === false && r.loaderOrder === "1" && r.copyOrder === "2",
        `loaderOrder=${r.loaderOrder} copyOrder=${r.copyOrder}`);
    }

    if (theme === "dark") {
      const isWhite = /rgb\(255,\s*255,\s*255\)/.test(r.sectionBg) || /rgb\(255,\s*255,\s*255\)/.test(r.payoffBg);
      log(`${dev}/night: no white block, surfaces come from night tokens`,
        !isWhite && r.sectionBg === "rgb(10, 10, 10)", `sectionBg=${r.sectionBg} payoffBg=${r.payoffBg}`);
      log(`${dev}/night: green is the night token, not muddy`,
        r.ringStroke === "rgb(74, 222, 128)" && r.pillColor === "rgb(74, 222, 128)",
        `ring=${r.ringStroke} pill=${r.pillColor}`);
    } else {
      log(`${dev}/day: green reads on cream (ring token + darker caption token)`,
        r.ringStroke === "rgb(29, 158, 117)" && r.pillColor === "rgb(21, 122, 91)",
        `ring=${r.ringStroke} pill=${r.pillColor}`);
    }
    await ctx.close();
  }
}

/* ══════════ reduced motion: straight to CLEARED, no sweep ══════════ */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.route(/supabase|posthog|sentry|clarity/i, (r) => r.fulfill({ status: 204, body: "" }));
  await page.addInitScript(() => { localStorage.setItem("cvp_theme", "light"); localStorage.setItem("cvp_cookie_consent", "accepted"); });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator(".cvp-fc").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600); // deliberately SHORTER than the 1500ms fill
  const r = await read(page);
  await page.locator(".cvp-fc").screenshot({ path: join(OUT, "mobile-reduced-motion.png") });
  log("reduced motion: mounts straight into CLEARED without waiting for the fill",
    r.dashOffset === "0" && r.tickMounted === true && r.sweepMounted === false && r.pillCleared === true,
    `dashOffset=${r.dashOffset} sweep=${r.sweepMounted}`);
  log("reduced motion: no animations running", r.orbitAnim === "none", `orbit=${r.orbitAnim}`);
  await ctx.close();
}

/* ══════════ narrow + large phones: no clipping, no overflow ══════════ */
for (const w of [360, 430]) {
  const { ctx, page } = await open({ width: w, height: 800, theme: "light" });
  const r = await read(page);
  log(`${w}px: no horizontal overflow, ring + tick still mounted`,
    r.docOverflow === false && r.tickMounted === true, `right=${r.sectionRight} vw=${r.vw}`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed — screenshots in ${OUT}`);
if (failed.length) { failed.forEach((f) => console.log(`  · ${f.n}`)); process.exit(1); }
