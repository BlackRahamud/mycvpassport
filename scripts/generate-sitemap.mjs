/**
 * Sitemap generator — runs in prebuild so public/sitemap.xml always
 * matches reality:
 *   - static public routes with curated lastmod dates
 *   - every blog post that HAS a body (stubs are noindexed placeholders
 *     and must stay out of the sitemap), lastmod from the post's date
 *   - no authed/app routes (/builder, /dashboard, /employer app pages…)
 *
 * posts.js is pure-data ESM; the repo is CJS, so it's imported via a
 * data: URL to avoid a transpile step.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = "https://www.mycvpassport.com";

// Curated lastmod per route — bump a date when that page's content
// materially changes. Deliberately NOT the build date: inflating lastmod
// on every deploy teaches Google to ignore it.
const STATIC_ROUTES = [
  ["/", "2026-07-02"],
  ["/blog", "2026-07-02"],
  ["/templates", "2026-04-24"],
  ["/tools", "2026-04-24"],
  ["/pricing", "2026-07-02"],
  ["/employer", "2026-07-02"],
  ["/jobs", "2026-05-05"],
  ["/ats", "2026-04-24"],
  ["/walk-in", "2026-04-24"],
  ["/linkedin-optimizer", "2026-06-01"],
  ["/salary-switcher", "2026-04-24"],
  ["/gulf-salary", "2026-05-20"],
  ["/gulf-career", "2026-05-20"],
  ["/about", "2026-04-24"],
  ["/india-to-uae", "2026-04-24"],
  ["/attestation", "2026-04-28"],
  ["/terms", "2026-04-24"],
  ["/privacy", "2026-04-24"],
  ["/refund", "2026-04-24"],
];

function postDateToISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.replace(/^[A-Za-z]+,\s*/, ""));
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const postsSource = readFileSync(path.join(root, "src", "data", "posts.js"), "utf8");
const { default: POSTS } = await import(
  "data:text/javascript," + encodeURIComponent(postsSource)
);

const articleUrls = POSTS.filter((p) => Array.isArray(p.body) && p.body.length > 0).map(
  (p) => [`/blog/${p.slug}`, postDateToISO(p.date)],
);

const entries = [...STATIC_ROUTES, ...articleUrls]
  .map(([route, lastmod]) => {
    const loc = `${SITE}${route}`;
    return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

writeFileSync(path.join(root, "public", "sitemap.xml"), xml);
console.log(`sitemap: wrote ${STATIC_ROUTES.length + articleUrls.length} URLs (${articleUrls.length} articles) → public/sitemap.xml`);
