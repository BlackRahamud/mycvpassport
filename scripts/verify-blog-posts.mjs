/* New blog posts, rendered and read.
   Serves the PRODUCTION build and checks both articles the way a reader
   and a crawler would see them: images actually load (naturalWidth > 0,
   not just present in the DOM), the SEO block never leaks onto the page,
   the calls to action point at real routes AND those routes resolve, the
   metadata is right, and it reads on a phone.

   Screenshots are READ by eye.
   Usage: node scripts/verify-blog-posts.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "scripts/.screenshots/blog";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) failures += 1;
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".xml": "text/xml", ".txt": "text/plain" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  const ext = extname(p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (ext) { res.writeHead(404); return res.end(); }
    // Serve the PRERENDERED page the way the real host does. Jumping
    // straight to spa.html skips the prerender entirely, so the crawler
    // view (title, canonical, og tags, JSON-LD) is never exercised, which
    // is precisely what this harness exists to check.
    const pre = join("./build", p, "index.html");
    file = existsSync(pre) ? pre : join("./build", "spa.html");
  }
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4205, r));

const browser = await chromium.launch();

async function newPage(width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 1100 } });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.port === "4205") return route.continue();
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
  const page = await context.newPage();
  // React 418/423 are a PRE-EXISTING prerender hydration mismatch on the
  // blog, reproduced identically on older posts, so they are reported but
  // not counted against these articles. Anything else is a real failure.
  page.on("pageerror", (e) => {
    const known = /Minified React error #(418|423)/.test(e.message);
    console.log(known ? "[known-prerender-hydration]" : "[pageerror]", e.message.slice(0, 80));
    if (!known) failures += 1;
  });
  return { context, page };
}

const POSTS = [
  {
    slug: "ai-cv-builder-win-jobs-2026",
    label: "candidate",
    title: "AI CV builder for 2026, how to beat AI screening and win Gulf jobs",
    hero: "ai-cv-builder-2026-hero.jpg",
    inline: "ai-cv-builder-2026-checklist.jpg",
    cta: "/builder",
    ctaText: "Try the free CVPassport CV builder",
  },
  {
    slug: "ai-in-recruitment-hiring-2026",
    label: "hr",
    title: "AI in recruitment for 2026, how AI is changing hiring and how to use it well",
    hero: "ai-in-recruitment-2026-hero.jpg",
    inline: "ai-in-recruitment-2026-split.jpg",
    cta: "/employer/pricing",
    ctaText: "Start a 30 day free trial",
  },
];

for (const post of POSTS) {
  console.log(`\n${"=".repeat(66)}\n${post.label.toUpperCase()} · /blog/${post.slug}\n${"=".repeat(66)}`);
  const { context, page } = await newPage();
  await page.goto(`http://localhost:4205/blog/${post.slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  // Scroll so the lazy inline image is actually requested.
  await page.evaluate(async () => {
    const step = window.innerHeight - 100;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);

  // 1. Metadata
  const meta = await page.evaluate(() => {
    const g = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) || null;
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } })
      .filter(Boolean);
    return {
      title: document.title,
      desc: g('meta[name="description"]'),
      keywords: g('meta[name="keywords"]'),
      canonical: g('link[rel="canonical"]', "href"),
      ogTitle: g('meta[property="og:title"]'),
      ogImage: g('meta[property="og:image"]'),
      ogType: g('meta[property="og:type"]'),
      twCard: g('meta[name="twitter:card"]'),
      twImage: g('meta[name="twitter:image"]'),
      article: ld.find((x) => x["@type"] === "Article") || null,
    };
  });
  check(meta.title === post.title, "title tag is the supplied one", meta.title);
  check((meta.desc || "").length > 100, "meta description present", `${(meta.desc || "").length} chars`);
  check(!!meta.keywords, "keywords present", meta.keywords);
  check(meta.canonical === `https://www.mycvpassport.com/blog/${post.slug}`, "canonical is correct", meta.canonical);
  check(meta.ogType === "article", "og:type is article");
  check(meta.ogImage === `https://www.mycvpassport.com/assets/blog/${post.hero}`, "og:image is ABSOLUTE and the hero", meta.ogImage);
  check(meta.twCard === "summary_large_image", "twitter card is summary_large_image");
  check(meta.twImage === meta.ogImage, "twitter:image matches og:image");
  check(!!meta.article, "Article JSON-LD present");
  if (meta.article) {
    const a = meta.article;
    check(!!a.headline && !!a.description && !!a.image?.length && !!a.author && !!a.datePublished,
      "JSON-LD has headline, description, image, author and date",
      `${a.headline?.slice(0, 40)} | ${a.datePublished} | ${a.author?.name}`);
    check(String(a.image[0]).startsWith("https://"), "JSON-LD image is absolute", a.image[0]);
  }

  // 2. Images actually LOAD, not merely exist
  const imgs = await page.evaluate(() => [...document.querySelectorAll("article img, .blog-post__hero, .blog-post__figure-img")]
    .map((i) => ({ src: i.getAttribute("src"), nw: i.naturalWidth, nh: i.naturalHeight, alt: i.getAttribute("alt"), loading: i.getAttribute("loading") })));
  const hero = imgs.find((i) => (i.src || "").includes(post.hero));
  const inline = imgs.find((i) => (i.src || "").includes(post.inline));
  check(!!hero && hero.nw > 0, "hero image LOADS, not broken", hero ? `${hero.nw}x${hero.nh}` : "not found");
  check(!!inline && inline.nw > 0, "inline supporting image LOADS, not broken", inline ? `${inline.nw}x${inline.nh}` : "not found");
  check(!!inline?.alt && inline.alt.length > 30, "inline image has descriptive alt text", inline?.alt?.slice(0, 70));
  check(inline?.loading === "lazy", "inline image is lazy loaded", inline?.loading);

  // 3. The SEO block must NOT be on the page anywhere
  const body = await page.evaluate(() => document.body.innerText);
  for (const leak of ["SEO details", "Meta description:", "Primary keyword", "Suggested slug", "Note on the slug", "Primary call to action"]) {
    check(!body.includes(leak), `SEO block not visible: "${leak}"`);
  }
  // Scoped to the ARTICLE, not the whole page: the blog footer carries a
  // pre-existing dash ("India–Gulf hiring corridor") on every blog page,
  // which is existing chrome and not something these posts introduced.
  const articleText = await page.evaluate(() => document.querySelector("article")?.innerText || "");
  check(articleText.length > 500, "article body rendered", );
  check(!/[–—]/.test(articleText), "no dash characters in the article body");
  check(!articleText.includes("!"), "no exclamation marks in the article body");

  // 4. The CTA is a real link to a real route
  const ctaHref = await page.evaluate((sel) => {
    const a = [...document.querySelectorAll("a")].find((x) => (x.getAttribute("href") || "") === sel);
    return a ? { href: a.getAttribute("href"), text: a.textContent.trim() } : null;
  }, post.cta);
  check(!!ctaHref, `call to action links to ${post.cta}`, ctaHref?.text);

  await page.screenshot({ path: join(OUT, `${post.label}-1-full.png`), fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(OUT, `${post.label}-2-top.png`) });

  // 5. Follow the CTA and confirm the destination actually resolves
  await page.locator(`a[href="${post.cta}"]`).first().click();
  await page.waitForTimeout(1600);
  const landed = page.url();
  check(landed.includes(post.cta), `following the CTA lands on ${post.cta}`, landed);
  const destText = await page.evaluate(() => document.body.innerText.slice(0, 120).replace(/\s+/g, " "));
  check(destText.length > 20, "destination page renders content, not a blank or error", destText);
  await page.screenshot({ path: join(OUT, `${post.label}-3-cta-destination.png`) });
  await context.close();

  // 6. Mobile
  const m = await newPage(390);
  await m.page.goto(`http://localhost:4205/blog/${post.slug}`, { waitUntil: "networkidle" });
  await m.page.waitForTimeout(800);
  const overflow = await m.page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: window.innerWidth }));
  check(overflow.doc <= overflow.vw + 1, "mobile 390px: no horizontal overflow", `${overflow.doc} <= ${overflow.vw}`);
  await m.page.screenshot({ path: join(OUT, `${post.label}-4-mobile.png`), fullPage: false });
  await m.context.close();
}

// 7. Index and sitemap
{
  const { context, page } = await newPage();
  await page.goto("http://localhost:4205/blog", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const idx = await page.evaluate(() => document.body.innerText);
  console.log(`\n${"=".repeat(66)}\nINDEX and SITEMAP\n${"=".repeat(66)}`);
  check(/AI is changing the job hunt/i.test(idx), "candidate post appears on the blog index");
  check(/AI is changing hiring/i.test(idx), "hr post appears on the blog index");
  await page.screenshot({ path: join(OUT, "index.png"), fullPage: false });
  await context.close();
}
{
  const xml = readFileSync("public/sitemap.xml", "utf8");
  check(xml.includes("/blog/ai-cv-builder-win-jobs-2026"), "candidate post is in the sitemap");
  check(xml.includes("/blog/ai-in-recruitment-hiring-2026"), "hr post is in the sitemap");
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "Both posts render, load, link and index correctly." : `${failures} check(s) failed.`}`);
console.log(`Screenshots: ${OUT}`);
process.exitCode = failures === 0 ? 0 : 1;
