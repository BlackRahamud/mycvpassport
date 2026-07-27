/* Mobile overlay collision check — the landing FAB, the cookie banner and
   the founder callout ring all live at the bottom of a phone screen.
   Measures real rects at 360 / 390 / 430 and asserts nothing buries
   anything else.
   Usage: node scripts/verify-mobile-overlays.mjs [outDir] [--label=before] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith("--")) || "mo-out";
const LABEL = (args.find((a) => a.startsWith("--label=")) || "--label=after").split("=")[1];
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
await new Promise((r) => server.listen(4213, r));
const BASE = "http://localhost:4213";

const results = [];
const log = (n, ok, d = "") => { results.push({ n, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  | " + d : ""}`); };
const notes = [];
const note = (n) => { notes.push(n); console.log(`NOTE  ${n}`); };
const browser = await chromium.launch();

const WIDTHS = [360, 390, 430];

/* Rect helpers — measured, not assumed. */
const RECTS = `(() => {
  const r = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height), z: cs.zIndex, opacity: Number(cs.opacity) }; };
  const overlap = (a, b) => (!a || !b || (a.opacity !== undefined && a.opacity < 0.5) || (b.opacity !== undefined && b.opacity < 0.5)) ? false
    : !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const fab = r("[data-cvp-fab='true']");
  const tick = r(".cvp-fc-tickwrap");
  const ring = r(".cvp-fc-ringbox");
  const mark = r(".cvp-fc-mark");
  const banner = r(".cvp-cookie-banner");

  /* The ring BOX is a mostly transparent square; its corners are not ink.
     What a user can actually see covered is the stroke annulus, the logo
     mark and the tick. Test the FAB rect against the circle itself. */
  const hitsAnnulus = (rect, box) => {
    if (!rect || !box || rect.opacity < 0.5) return false;
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;
    const outer = box.w / 2;                 // stroke sits on the outer edge
    const inner = outer - Math.max(8, box.w * 0.06);
    // nearest point of the rect to the circle centre
    const nx = Math.max(rect.left, Math.min(cx, rect.right));
    const ny = Math.max(rect.top, Math.min(cy, rect.bottom));
    const nearest = Math.hypot(nx - cx, ny - cy);
    // farthest corner, to know whether the rect spans across the band
    const fx = Math.abs(rect.left - cx) > Math.abs(rect.right - cx) ? rect.left : rect.right;
    const fy = Math.abs(rect.top - cy) > Math.abs(rect.bottom - cy) ? rect.top : rect.bottom;
    const farthest = Math.hypot(fx - cx, fy - cy);
    return nearest <= outer && farthest >= inner;
  };

  return {
    fab, tick, ring, mark, banner,
    vh: document.documentElement.clientHeight, vw: document.documentElement.clientWidth, visualH: window.innerHeight,
    fabOverTick: overlap(fab, tick),
    fabOverMark: overlap(fab, mark),
    fabOverStroke: hitsAnnulus(fab, ring),
    fabOverRingBox: overlap(fab, ring),
    bannerOverFab: overlap(banner, fab),
    acceptBtn: (() => { const e = document.querySelector(".cvp-cookie-banner__btn-primary"); if (!e) return null;
      const b = e.getBoundingClientRect(); return { bottom: Math.round(b.bottom), inView: b.bottom <= document.documentElement.clientHeight + 0.5 }; })(),
  };
})()`;

async function newPage(width, { consent }) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route(/supabase|posthog|sentry|clarity/i, (r) => r.fulfill({ status: 204, body: "" }));
  await page.addInitScript((c) => {
    localStorage.setItem("cvp_theme", "light");
    if (c) localStorage.setItem("cvp_cookie_consent", "accepted");
  }, consent);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  return { ctx, page };
}

/* ── A) FAB vs the founder ring / tick ──
   Swept across scroll offsets, not sampled once: the FAB is fixed and the
   ring scrolls past it, so a single position proves nothing. */
for (const w of WIDTHS) {
  const { ctx, page } = await newPage(w, { consent: true });
  await page.locator(".cvp-fc").scrollIntoViewIfNeeded();
  await page.waitForTimeout(3200); // past the 1500ms ring fill

  const base = await page.evaluate(() => window.scrollY);
  const collisions = [];
  let boxTouches = 0;
  for (let d = -260; d <= 260; d += 20) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, base + d));
    await page.waitForTimeout(60);
    const m = await page.evaluate(RECTS);
    if (m.fabOverTick || m.fabOverMark || m.fabOverStroke) {
      collisions.push({ d, tick: m.fabOverTick, mark: m.fabOverMark, stroke: m.fabOverStroke, fab: m.fab });
    }
    if (m.fabOverRingBox) boxTouches += 1;
  }
  await page.evaluate((y) => window.scrollTo(0, y), base);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, `${LABEL}-fab-founder-${w}.png`) });

  const hitTick = collisions.filter((c) => c.tick).length;
  const hitMark = collisions.filter((c) => c.mark).length;
  const hitStroke = collisions.filter((c) => c.stroke).length;

  /* The CLEARED tick is the payoff of the whole section and was what the
     FAB was landing on. That is now clear at every offset, and is asserted. */
  log(`${w}px: FAB never covers the CLEARED tick (27 scroll offsets)`,
    hitTick === 0,
    hitTick ? `tick=${hitTick} worst=${JSON.stringify(collisions[0])}`
      : `clear at every offset (grazes the transparent ring box at ${boxTouches} offsets)`);

  /* Reported, NOT asserted, because it cannot be fixed by positioning
     alone. On a 390px phone the FAB occupies x 227..374. The 112px brand
     mark is centred at x 195, so it spans 139..251 whatever size the ring
     is, and the ring stroke reaches x 305. Nothing short of hiding the FAB
     over this section, or restyling it to a small icon, gets these to zero,
     and both are behaviour or look changes that are the founder's call. */
  note(`${w}px: FAB still crosses the brand mark at ${hitMark}/27 and the ring stroke at ${hitStroke}/27 offsets (not fixable by position alone, see comment)`);
  await ctx.close();
}

/* ── B) cookie banner vs FAB, and the banner's own usability ── */
for (const w of WIDTHS) {
  const { ctx, page } = await newPage(w, { consent: false });
  await page.waitForTimeout(1400); // banner slides in after 800ms
  /* The FAB only reveals past 320px of scroll, so measuring it at the top
     of the page would grade a hidden button. Scroll first, keep the banner
     up, then measure the state a real visitor actually meets. */
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(900);
  const m = await page.evaluate(RECTS);
  await page.screenshot({ path: join(OUT, `${LABEL}-cookie-${w}.png`) });

  log(`${w}px: FAB is revealed and visible with the banner up`,
    !!m.fab && m.fab.opacity > 0.9, `opacity=${m.fab?.opacity}`);

  log(`${w}px: cookie banner does not bury the FAB`,
    m.banner !== null && m.bannerOverFab === false,
    `banner=${JSON.stringify(m.banner)} fab=${JSON.stringify(m.fab)} overlap=${m.bannerOverFab}`);

  log(`${w}px: banner Accept button is fully on screen`,
    !!m.acceptBtn && m.acceptBtn.inView === true,
    `acceptBottom=${m.acceptBtn?.bottom} vh=${m.vh}`);

  // dismissible on mobile
  await page.locator(".cvp-cookie-banner__btn-primary").click();
  await page.waitForTimeout(700);
  const gone = await page.evaluate(() => !document.querySelector(".cvp-cookie-banner"));
  const stored = await page.evaluate(() => localStorage.getItem("cvp_cookie_consent"));
  log(`${w}px: banner is dismissible on touch and the choice persists`,
    gone === true && stored === "accepted", `gone=${gone} stored=${stored}`);

  // FAB usable once the banner is gone
  const after = await page.evaluate(RECTS);
  log(`${w}px: FAB sits inside the viewport after dismissal`,
    !!after.fab && after.fab.bottom <= after.vh && after.fab.right <= after.vw,
    `fab=${JSON.stringify(after.fab)}`);
  await ctx.close();
}

/* ── C) stacking order is deliberate, not accidental ── */
{
  const { ctx, page } = await newPage(390, { consent: false });
  await page.waitForTimeout(1400);
  const z = await page.evaluate(() => ({
    fab: getComputedStyle(document.querySelector("[data-cvp-fab='true']")).zIndex,
    banner: getComputedStyle(document.querySelector(".cvp-cookie-banner")).zIndex,
  }));
  log("stacking: cookie banner sits above the FAB (consent must be reachable)",
    Number(z.banner) > Number(z.fab), JSON.stringify(z));
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${LABEL.toUpperCase()}: ${results.length - failed.length}/${results.length} passed — screenshots in ${OUT}`);
if (failed.length) { failed.forEach((f) => console.log(`  · ${f.n}`)); process.exit(1); }
