# COWORK_HANDOFF.md — Resume Templates / Puppeteer / Page-Break Recon

Read-only recon for an upcoming layout / spacing / page-break overhaul of the resume templates. Template 13 is the lead; the rest follow.

> **Important architectural note up front.** There are two parallel rendering paths for every resume template:
>
> 1. **Client React preview** (`src/Template*.js`) — used by the on-screen builder preview and the *legacy* "iLovePDF / capture-from-DOM" download path (`src/downloadResumeFromPreview.js`). These files are where `GhostChip` (the ATS ghost layer) lives.
> 2. **Server HTML builders for Puppeteer** (`src/serverLib/*Template*Html.js`) — pure string-templated HTML+CSS used by `api/generate-pdf.js` (Vercel Serverless + `puppeteer-core` + `@sparticuz/chromium-min`). **This is the path that produces the actual PDF.** It does **not** include `GhostChip` today (see §4).
>
> Cowork's overhaul has to keep both paths in sync, *or* explicitly pick one as the source of truth. Flagging this so it isn't a surprise on day one.

---

## 1. Repo topology

- **Repo root (working dir):** `C:\Users\Junaid Khan\mycvpassport\mycvpassport`
- **Framework:** Create React App (`react-scripts ^5.0.1`), React 18.3.1, React Router 7.13.2. Not Next.js, not Vite.
- **Backend:** Vercel Serverless Functions in `api/*.js` (CommonJS, Node). Supabase Edge Functions in `supabase/functions/*` (Deno) for AI features only.
- **Package manager:** npm (`package-lock.json` present, no yarn/pnpm lockfile).
- **CSS approach:** Plain global CSS files (no Tailwind, no CSS-in-JS library, no CSS modules). Templates use **inline React `style={{...}}` objects**. Server HTML templates use inline `<style>…</style>` blocks per template. Design tokens are CSS custom properties in `src/index.css` (see §3).
- **Key deps for this work:**
  - `puppeteer-core` **22.0.0** (server-only)
  - `@sparticuz/chromium-min` **133.0.0** (binary host: `https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar`)
  - `puppeteer` (full, Chromium-bundled) lives only in `ghost-audit/package.json` and `scripts/debug-t8-pdf-heights.js` for local debug runs
  - `pdf-lib ^1.17.1` (used by `pdfDrawT11SidebarStripe.js` / `pdfDrawT8SidebarStripe.js` post-processors — **currently commented out** in `api/generate-pdf.js:324-330`)
  - `mammoth`, `ajv`, `framer-motion`, `lucide-react`
- **Vercel function config (`vercel.json:1-25`):** `api/generate-pdf.js` gets `memory: 1024`, `maxDuration: 60`.
- **Build/deploy:** CRA `react-scripts build` → Vercel; CLAUDE.md mandates `npm run lint → npm run build → git add → commit → push`. Husky blocks lint failures.

---

## 2. Template inventory

There are **18 templates** (IDs 1–18). Each has a **client React file** (`src/Template*.js`) and most have a paired **server HTML builder** (`src/serverLib/*Template*Html.js`). Templates 15–18 currently lack server builders (no Puppeteer entry in `api/generate-pdf.js` `BUILDERS` map — they are not server-renderable yet).

The canonical template registry lives at `src/cvShared.js:3-22` (`TEMPLATES` array — id, name, tier, color, accent, desc, layout key). `ResumePreview.jsx:22-43` maps `t.layout` → React component.

**Per-template files:**

| ID | Layout key | Client React file (preview, ghost layer) | Server HTML builder (Puppeteer PDF) | Notes |
|---:|---|---|---|---|
| 1 | `banner` | `src\Template1ModernEmerald.js` | `src\serverLib\bannerTemplate1Html.js` | `PreviewModernEmerald` |
| 2 | `twocol` | `src\Template2DubaiModern.js` | `src\serverLib\twocolTemplate2Html.js` | `PreviewTwoCol` |
| 3 | `sidebar` | `src\Template3ArabiaPro.js` | `src\serverLib\sidebarTemplate3Html.js` | `PreviewSidebar` |
| 4 | `timeline` | `src\Template4ExecutiveGold.js` | `src\serverLib\timelineTemplate4Html.js` | `PreviewTimeline` |
| 5 | `gulf-exec` | `src\Template5GulfExecutive.js` | `src\serverLib\gulfExecTemplate5Html.js` | `PreviewGulfExecutive` |
| 6 | `banking` | `src\Template6BankingFinance.js` | `src\serverLib\bankingTemplate6Html.js` | `PreviewBankingFinance` |
| 7 | `compact-pro` | `src\Template7CompactPro.js` | `src\serverLib\compactProTemplate7Html.js` | `PreviewCompactPro` |
| 8 | `creative` | `src\Template8CreativeSidebar.js` | `src\serverLib\creativeSidebarTemplate8Html.js` | `PreviewCreativeSidebar`; sidebar stripe post-processor `pdfDrawT8SidebarStripe.js` (currently disabled) |
| 9 | `hospitality` | `src\Template9Hospitality.js` | `src\serverLib\hospitalityTemplate9Html.js` | `PreviewHospitality` |
| 10 | `ats-intl` | `src\Template10ATSInternational.js` | `src\serverLib\atsInternationalTemplate10Html.js` | `PreviewATSInternational` |
| 11 | `tech-it` | `src\Template11TechITPro.js` | `src\serverLib\techITProTemplate11Html.js` | `PreviewTechITPro`; sidebar stripe post-processor `pdfDrawT11SidebarStripe.js` (currently disabled) |
| 12 | `flat-split` | `src\Template12Split.js` | `src\serverLib\template12Builder.js` (+ legacy `classicTemplate12Html.js`) | Wrapped through `markPageStarts(html, { PAGE_HEIGHT: 1027 })` in `api/generate-pdf.js:35` |
| **13** | **`finance`** | **`src\Template13Finance.js` (1066 lines)** | **`src\serverLib\financeTemplate13Html.js` (273 lines)** | **`PreviewFinance` is the live export at line 28; the file also contains 3 dead duplicates: `PreviewFinanceDuplicate` (line 268), `PreviewFinanceDuplicate2` (line 489), `PreviewFinanceLegacy` (line 726), plus `PreviewATSInternational` re-declaration at line 696 — flagged in §10.** |
| 14 | `figma-mirror` | `src\Template14.js` | `src\serverLib\template14Builder.js` | Wrapped through `markPageStarts(..., { PAGE_HEIGHT: 1027 })`; also has standalone reference at `figma-a4-template/` |
| 15 | `slate-carbon` | `src\Template15.js` | *(none — no server builder)* | `PreviewSlateCarbon` |
| 16 | `crimson-edge` | `src\Template16.js` | *(none)* | `PreviewCrimsonEdge` |
| 17 | `forest-pro` | `src\Template17.js` | *(none)* | `PreviewForestPro` |
| 18 | `midnight-gold` | `src\Template18.js` | *(none)* | `PreviewMidnightGold` |

**No per-template `.css` / `.scss` files exist for resume templates.** All template styling is inline (React style objects in client files, `<style>` blocks in server builders). The CSS files under `src/` (`index.css`, `App.css`, `pages/DashboardPage.css`, `pages/BlogPage.css`, `pages/BlogPostPage.css`, `components/FAB/FAB.css`) are app chrome, not template styling.

---

## 3. Shared layout primitives

### Section / entry wrappers
- **`EntryWrap`** is defined **inline inside each template file** (no shared component). Example: `src\Template1ModernEmerald.js:59-61`:
  ```js
  const EntryWrap = ({ children }) => (
    <div style={{ marginBottom: "6mm", breakInside: "avoid", pageBreakInside: "avoid" }}>{children}</div>
  );
  ```
  Same pattern in `Template2DubaiModern.js:55`, `Template15.js:91`, `Template16.js:88`, `Template17.js:88`, `Template18.js:83-89`. **There is no shared section wrapper component to edit once.** Cowork either has to extract one or sweep all 18 files.
- **`SectionTitle`** / **`SectionHeading`** are also inline per template (e.g. `Template13Finance.js:57-73`).

### A4 frame / page container
- **Live preview shell** (DOM that gets captured and PDF'd): `.cvp-builder-a4-fit` — defined in `src\index.css:556-577`:
  ```css
  .cvp-builder-a4-fit {
    background: #ffffff;
    width: 794px;
    min-height: 1123px;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    box-sizing: border-box;
  }
  /* Desktop & mobile builder override min-height to fit-content so PDF capture matches ink */
  ```
- **Inside the A4 frame, each template renders its own root.** Template 13's React preview uses `width: 800px` and `padding: 32px 32px 20px 32px` (inline) — the `.cvp-builder-a4-fit` 32px padding *plus* template's own padding *both* apply on screen.
- **Server-side A4 frame** is set per-template inside each `serverLib/*Html.js` file. T13 example (`financeTemplate13Html.js:170-188`):
  ```css
  @page { size: A4; margin: 0; }
  body { width: 794px; max-width: 100%; ... }
  .t13-root { width: 794px; max-width: 100%; margin: 0 auto; background: #fff; }
  ```
- **Wrapper helper:** `src\resumePageRootBoxStyle.js` (15 lines) — minor outermost-box style helper, only used by some preview components.
- **PDF page constants** (mm-based, used by jsPDF helpers, **not** used by Puppeteer path): `src\pdfA4Layout.js` exports `PDF_PAGE_HEIGHT_MM = 297`, `PDF_BOTTOM_MARGIN_MM = 15`, `PDF_TOP_NEW_PAGE_MM = 15`. These feed `experiencePointsPdf.js` which is referenced by Templates 11, 14, 15, 16, 17, 18 — but only on the *client preview* side. The Puppeteer renderer ignores these constants entirely.

### Design tokens (single file)
- **`src\index.css:15-61`** — root CSS custom properties. Relevant ones:
  ```css
  :root {
    --bg-page: #0A0A0A;
    --bg-surface: #141414;
    --bg-elevated: #1C1C1C;
    --text-primary: #FFF;
    --text-secondary: #A0A0A0;
    --border: #2A2A2A;
    --radius-lg: 16px;
    --radius-md: 12px;
    --nav-accent: #D97706;        /* amber accent — CTAs only per CLAUDE.md */
    --nav-ease: cubic-bezier(0.4, 0, 0.2, 1);
    /* ...landing-page-scoped --color-* tokens */
  }
  ```
- **These tokens are NOT consumed by the resume templates.** The templates hardcode their colors (T13: `ACCENT = "#5c6ac4"`, `TEXT_PRIMARY = "#1f2933"`, etc.). They are app chrome / dashboard tokens. Cowork's spacing/typography token file does not exist yet — it would be net-new.
- `src\builderStyles.js` — a `C` palette + `CB_UI`/`S` style object used by the builder UI (not the templates themselves).

### Global stylesheets loaded by the React app
- `src\index.css` (~1738 lines) — main global styles, design tokens, builder UI
- `src\App.css` (~58 lines) — leftover CRA defaults + landing globe animation
- `src\components\FAB\FAB.css` — FAB button
- `src\pages\DashboardPage.css`, `BlogPage.css`, `BlogPostPage.css` — page-specific

---

## 4. Ghost Layer / ATS chips

**Definition:** `src\components\GhostChip.jsx` (the entire file, 21 lines):

```jsx
const GhostChip = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      fontSize: '12px',
      color: 'transparent',
      transform: 'scale(0.01)',
      transformOrigin: 'top left',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}
    aria-hidden="true"
  >
    {children}
  </div>
);
```

**How it's wired (in 3–5 sentences):**
The ghost chip is a single React component that emits an absolutely-positioned, near-zero-scale, transparent `<div>` carrying ATS-friendly keyword text (e.g. `"${exp.role} ${exp.company}"`). It is imported directly by every client template file (`Template1*` through `Template18*`, mirrored for each major section) and placed *next to* the visible content inside a `position: relative` parent — typical pattern at `Template13Finance.js:138-155`:

```jsx
<div style={{ marginBottom: "20px", pageBreakInside: "avoid", position: "relative" }}>
  <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
  <div style={{ fontWeight: "bold", ... }}>{exp.role}</div>
  ...
</div>
```

The keywords live in the PDF text stream (so an ATS parser sees them) but are visually invisible. There is **no explicit page-break logic for chips** — they ride along with their parent entry, which carries `pageBreakInside: "avoid"`. **Critical:** The Puppeteer-served HTML builders in `src/serverLib/*Html.js` do **not** include any GhostChip equivalent — only `src/serverLib/coverLetterHtml.js:40-42` injects a similar transparent `ghostHtml` block (using the `ghostKeywords` field passed in). This means **the ATS ghost layer only reaches the PDF when the legacy "capture from DOM and POST as `html`" path is used** (`downloadResumeFromPreview.js`), not when `templateId+cv` is sent and the server builder fires. Cowork must be aware: if the overhaul standardizes on the server-HTML path, the ghost layer must be ported into each `serverLib/*Html.js` file or it is lost.

**Standalone proof-of-concept:** `ghost-audit/test-ghost-logic.js` (74 lines) — uses local Chrome + `pdf-parse` to assert ghost text appears *before* visual text in the PDF stream. Useful as a regression test harness.

---

## 5. Puppeteer setup

**Single PDF entry point:** `api\generate-pdf.js` (342 lines).

**Page format:** `A4`. **NOT** using `preferCSSPageSize`.

**Margins:** 10mm top / 15mm bottom / 0mm left / 0mm right.

**`printBackground`:** `true`.

**Viewport before PDF:** `794 × 1123` at `deviceScaleFactor: 2`. Media is emulated as `screen` (not `print`), then a `page.addStyleTag(...)` injects `@media print` rules.

**Verbatim config block (`api/generate-pdf.js:99-321`, abridged):**

```js
// Viewport + content load
await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
await page.setContent(finalHtml, { waitUntil: "networkidle0" });
await Promise.race([
  page.evaluate(() => document.fonts.ready),
  new Promise((resolve) => setTimeout(resolve, 2000)),
]);
await page.emulateMediaType("screen");

// Server-injected @media print rules
await page.addStyleTag({
  content: `
    @media print {
      .cvp-page-break { break-before: page; page-break-before: always; }
      .cvp-new-page-start { margin-top: 10mm !important; padding-top: 5mm !important; }
      .cvp-main { padding-top: 4mm; }
      [data-block="job"], [data-block="list"] { break-inside: avoid !important; page-break-inside: avoid !important; }
      [data-block="section"] { break-inside: avoid; page-break-inside: avoid; }
      .section-title { break-after: avoid; page-break-after: avoid; }
      .section-title + * { break-before: avoid; page-break-before: avoid; }
      p, li { orphans: 3; widows: 3; }
    }
  `,
});

// Smart-pagination JS pass (relaxes break-inside on tall blocks, inserts .cvp-page-break, marks page-starts, gently auto-scales)
const layoutTrace = await page.evaluate((ats) => { /* ... ~140 lines, see file ... */ }, Boolean(atsMode));

// page.pdf()
let pdfBuffer = await page.pdf({
  format: "A4",
  printBackground: true,
  preferCSSPageSize: false,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `
    <div style="font-family: 'Inter', sans-serif; font-size: 9px; color: #94A3B8; width: 100%; text-align: center; margin-bottom: 5mm;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>`,
  margin: { top: "10mm", bottom: "15mm", left: "0mm", right: "0mm" },
  ...(maxPagesN === 1 ? { pageRanges: "1" } : {}),
});
```

**Existing `@page` rules** (one per server-template, all identical):

```css
@page { size: A4; margin: 0; }
```

Found at: `bannerTemplate1Html.js:11`, `twocolTemplate2Html.js:11`, `sidebarTemplate3Html.js:13`, `timelineTemplate4Html.js:20`, `gulfExecTemplate5Html.js:14`, `bankingTemplate6Html.js:34`, `compactProTemplate7Html.js:31`, `creativeSidebarTemplate8Html.js:26`, `hospitalityTemplate9Html.js:26`, `atsInternationalTemplate10Html.js:28`, `techITProTemplate11Html.js:209`, `financeTemplate13Html.js:39 & 170`, `coverLetterHtml.js:51`. Note these conflict with Puppeteer's `margin: { top:"10mm", bottom:"15mm" }` since `preferCSSPageSize: false` makes the Puppeteer margins win — the in-template `@page margin: 0` is effectively dead code.

**Smart-pagination logic (`api/generate-pdf.js:114-297`)** runs in the page context and:
1. Finds elements with inline `break-inside`/`page-break-inside`, removes the constraint if `height > 35% of usable page` (prevents a tall single block from blowing a whole page of whitespace).
2. If a `.cvp-main` element exists, walks `[data-block]` children and inserts `.cvp-page-break` divs before blocks that would straddle a page boundary.
3. `markPageStarts()`: tags blocks within 20px of a page-top boundary with `.cvp-new-page-start` (which gets `margin-top: 10mm; padding-top: 5mm`).
4. `autoScaleTypography()`: if `.cvp-root` overflows page 1, scales it down to a floor of `0.92`.

Templates 12 and 14 are **also** wrapped server-side by `src\serverLib\markPageStarts.js`, which injects a `<script>` that runs the same `markPageStarts()` algorithm at `DOMContentLoaded` — this is for templates whose HTML doesn't use `.cvp-main` and so won't get tagged by the in-Puppeteer pass.

---

## 6. Content injection points

PDF generation is fed via POST to `/api/generate-pdf` from three call sites:

- `src\downloadResumeFromPreview.js:82-91` — main user-facing download. Captures the live DOM under `.cvp-builder-a4-fit`, wraps it in a minimal HTML doc, and POSTs `{ html, filename, cv, maxPages? }`. Because `html` is non-null, the server **skips** the `serverLib/*Html.js` builder and renders the captured DOM directly. **This is the path that includes the GhostChip layer.**
- `src\CoverLetterModal.jsx:189` and `src\pages\CoverLetterPage.jsx:463` — cover-letter PDFs (separate template).
- `src\WalkInMode.jsx:175` — Walk-In CV download.

If the request body has no `html` but has `templateId` + `cv`, the server uses the `BUILDERS` map (`api/generate-pdf.js:23-38`):

```js
const BUILDERS = {
  1: pdfModernEmerald, 2: buildTwocolTemplate2Html, 3: buildSidebarTemplate3Html,
  4: buildTimelineTemplate4Html, 5: buildGulfExecTemplate5Html, 6: buildBankingTemplate6Html,
  7: buildCompactProTemplate7Html, 8: buildCreativeSidebarTemplate8Html,
  9: buildHospitalityTemplate9Html, 10: buildATSInternationalTemplate10Html,
  11: buildTechITProTemplate11Html,
  12: (cv) => markPageStarts(buildTemplate12Html(cv), { PAGE_HEIGHT: 1027 }),
  13: buildFinanceTemplate13Html,
  14: (cv) => markPageStarts(buildTemplate14Html(cv), { PAGE_HEIGHT: 1027 }),
};
```

(IDs 15–18 have no entry; they fall through to the 400 error unless the caller pre-renders `html`.)

**Sample / seed data for filling templates (NOT production data):**

- **`src\pages\TemplatesPage.jsx:13-365`** — five hand-tuned dummy profiles (`DUMMY_AHMED`, `DUMMY_SARA`, `DUMMY_ROHAN`, `DUMMY_FATIMA`, `DUMMY_JAMES`) and a `TEMPLATE_DUMMY_MAP` (`:341-360`) that picks the right dummy per template. **Template 13 → `DUMMY_JAMES`.** Each profile is tuned to fill that template's page 1 with no whitespace. **This is where Cowork should source Tier-A / Tier-B / Tier-C content fixtures** — adding new dummies here (or extracting them to a `src/data/sampleProfiles.js`) won't disturb production data flow.
- **`src\cvShared.js:32-92`** — `EMPTY_RESUME`, `EMPTY_EXP`, `EMPTY_EDU`, `EMPTY_CERT` skeletons for the empty-state preview.
- **`scripts\debug-t8-pdf-heights.js:9-49`** — a `sampleCv` + `tallMainCv` used for one-off T8 layout debugging. Good template for a "render template X with fixture Y" CLI script.

Production CV data flows from Supabase tables → `cv` state in `src\pages\BuilderPage.jsx` → `ResumePreview` → DOM capture → POST. Cowork should not touch that flow.

---

## 7. Existing spacing values (baseline before standardization)

Inline pixel/mm values dominate. **Mixed units (px and mm) are common within a single file.** Sampled across all templates from grep + direct reads:

### Section bottom-gap (entry margin-bottom)
- `6mm` — T1 EntryWrap, T2 EntryWrap, T7 exp-item, T8 exp-item, T9 exp-item
- `5mm` — T2 EntryWrap section header
- `4mm` — T6 edu-item, T7 edu-item, T8 edu-item, T9 edu-item
- `20px` — T13 `.t13-item` exp-item, T10 exp-item, T5 exp-item server, T3 exp-item server
- `24px` — T10 React exp-item
- `16px` — T13 React edu-item, T10 React edu-item
- `25px` — T12 server `[data-block="job"]`
- `30px` — T14 React exp-item

### Section header margin
- `marginTop: 8mm; marginBottom: 5mm` — T5/T6 SectionTitle
- `marginTop: 18px; marginBottom: 10px` — T13 (line 737, in dead duplicate)
- `marginBottom: 12px` — T13 SectionHeading (live)

### Inter-bullet (point) margin
- `marginBottom: 4px` — T13, T10
- `marginBottom: 4mm` — T7/T8/T9 edu-item

### Line-height
- `1.5` — T13 points + summary, T11 skill row, T18 summary, most server templates
- `1.6` — T1 summary, T9 summary, T10 summary, builder textareas
- `1.65` — T5 preview lines, T9 preview lines
- `1.7` — T10 preview lines, T11 preview lines
- `1.8` — T13 cert list
- `1.4` — T13 tech skills paragraphs

### Font sizes (resume body text)
- `12.5px` — T13 points/summary
- `12px` — T13 meta/contact, T10 meta
- `13px` — T13 edu-degree
- `14px` — T13 exp-role, T1 title
- `pt(10)` / `pt(10.5)` — T11/T15/T16/T17/T18 (uses a `pt()` helper that converts to px)
- `9.5px` — T7/T8/T11 preview-exp lines
- `10px` — most preview-exp lines (`cvp-preview-exp-*-line` rules in `index.css:1404-1496`)

### A4 frame padding
- `15mm` — T1 outer padding (the body padding inside the .cvp-builder-a4-fit's 32px)
- `32px` — `.cvp-builder-a4-fit` global, T13 React (`padding: 32px`)
- `32px 32px 20px 32px` — T13 React header
- `0 32px 32px 32px` — T13 React content row

### Gaps (flex/grid)
- `gap: 8px` — T13 skill chips, T13 metric stack
- `gap: 10px` — T13 contact row
- `gap: 40px` — T13 main content two-col split
- `gap: 15mm` — T7 cols
- `gap: 10mm` — T6 exp row

### Padding-bottom safety for Puppeteer footer
- `paddingBottom: "40px"` appears in T1 and T13 outer container — explicit "Puppeteer footer safety" comment.

**There is no central spacing token file.** A standardization pass would create one (e.g. `src/serverLib/templateTokens.js` for server, parallel for client) or codify spacing into shared `EntryWrap` / `SectionTitle` components.

---

## 8. Existing page-break CSS — every occurrence

**Client React templates** (inline `style={{ pageBreakInside: ..., breakInside: ..., breakAfter: ..., pageBreakAfter: ... }}` — full list with file:line):

- `src\Template1ModernEmerald.js:41-42` — SectionTitle: `breakAfter: "avoid"`, `pageBreakAfter: "avoid"`
- `src\Template1ModernEmerald.js:60` — EntryWrap: `marginBottom: "6mm", breakInside: "avoid", pageBreakInside: "avoid"`
- `src\Template2DubaiModern.js:36-37` — SectionTitle break-after avoid
- `src\Template2DubaiModern.js:57` — EntryWrap (5mm)
- `src\Template3ArabiaPro.js:40-41` — SectionTitle
- `src\Template3ArabiaPro.js:155, 194` — exp-item, edu-item
- `src\Template4ExecutiveGold.js:39-40, 159-160` — SectionTitle + entry
- `src\Template5GulfExecutive.js:28, 152, 245` — SectionTitle + exp-item + edu-item
- `src\Template6BankingFinance.js:35, 111, 131, 171, 184, 213, 224` — multiple
- `src\Template7CompactPro.js:45, 118, 140, 193`
- `src\Template8CreativeSidebar.js:46, 99, 115, 149, 162, 188, 217`
- `src\Template9Hospitality.js:46, 100, 116, 150, 166, 192, 221`
- `src\Template10ATSInternational.js:164, 184` — exp-item, edu-item
- `src\Template11TechITPro.js:120-121, 144-145` — `breakInside: "avoid-page"` + section header avoid
- `src\Template12Split.js:220` — entry
- **`src\Template13Finance.js:58, 138, 161, 297, 380, 406, 515, 600, 617`** — `breakAfter: "avoid"` on SectionHeading; `pageBreakInside: "avoid"` on every exp-item and edu-item. Lines 297+, 515+ are inside dead duplicates (`PreviewFinanceDuplicate`, `PreviewFinanceDuplicate2`).
- `src\Template15.js:91-92, 115-116, 239+, 322, 383, 409, 436` — SectionTitle avoid + 5 instances of `marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto"` (this *opts out* of break-inside avoid for skills/cert lists)
- `src\Template16.js:88-89, 107-108, 260, 343, 404, 444, 471` — same pattern as T15
- `src\Template17.js:88-89, 112-113, 236, 319, 380, 406, 439` — same pattern
- `src\Template18.js:88-89, 107-108, 250, 333, 394, 420, 447` — same pattern
- `src\downloadResumeFromPreview.js:62` — counts `.cvp-page-break, .cvp-new-page-start` for trace logging

**Server HTML templates** (`@page` and break-* CSS in `<style>` blocks):

- `src\serverLib\bannerTemplate1Html.js:11, 30, 40` — `@page A4 margin:0`; `page-break-after: avoid` on section titles; `.entry { margin-bottom: 6mm; page-break-inside: avoid }`
- `src\serverLib\twocolTemplate2Html.js:11, 34, 47` — same pattern (5mm)
- `src\serverLib\sidebarTemplate3Html.js:13, 33` — `@page`; `.exp-item { margin-bottom: 20px; page-break-inside: avoid }`
- `src\serverLib\timelineTemplate4Html.js:20, 37` — `@page`; `.exp-item { margin-bottom: 22px; page-break-inside: avoid }`
- `src\serverLib\gulfExecTemplate5Html.js:14, 37, 57` — `@page`; exp-item 20px, edu-item 15px
- `src\serverLib\bankingTemplate6Html.js:34, 54, 71, 90` — `@page`; section/edu/exp avoid
- `src\serverLib\compactProTemplate7Html.js:31, 62, 66, 74, 79` — `@page`; .sect/.exp-item/.cols/.edu-item avoid
- `src\serverLib\creativeSidebarTemplate8Html.js:26, 51, 62, 74, 93, 141, 152` — `@page`; section/exp/edu avoid + 3 inline `<section style="page-break-inside: avoid;">`
- `src\serverLib\hospitalityTemplate9Html.js:26, 51, 62, 73, 92, 140, 151` — same pattern as T8
- `src\serverLib\atsInternationalTemplate10Html.js:28, 101, 106` — `@page`; exp-item 20px, edu-item 12px
- `src\serverLib\techITProTemplate11Html.js:209, 232-234, 463-464, 471-472` — `@page`; `break-inside: avoid-page` + `-webkit-column-break-inside: avoid` on entries; **uses `!important` aggressively** (12 occurrences — the only file that does)
- `src\serverLib\template12Builder.js:43` — inline `<div data-block="job" style="margin-bottom: 25px; page-break-inside: avoid;">`
- `src\serverLib\classicTemplate12Html.js:175-176, 182-183` — `break-inside: avoid; page-break-inside: avoid` + `break-after: avoid; page-break-after: avoid`
- **`src\serverLib\financeTemplate13Html.js:39, 170, 217, 249, 251`** — `@page A4 margin:0` (twice — placeholder + main); `.t13-item { margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid }`; `@media print { .t13-item ... ; .t13-section-title, .t13-item { break-after: avoid } }`
- `src\serverLib\coverLetterHtml.js:51` — `@page A4 margin:0`

**Server-injected `@media print` rules** (added by Puppeteer at runtime, see §5): `api\generate-pdf.js:99-112`.

---

## 9. How to run locally

### Install
```bash
npm install
```
(uses `package-lock.json`; do not run `npm audit fix --force` per CLAUDE.md)

### Dev server (CRA, port 3000)
```bash
npm start
```
The CRA dev server does **not** run the `api/*.js` Vercel functions. To exercise `/api/generate-pdf` locally, either:
- Run the production build behind `vercel dev` (requires `vercel` CLI) — not currently scripted.
- Or use the standalone debug script (next bullet).

### Run Puppeteer PDF gen for a single template
**There is no first-class CLI/script that takes `--template <id>` and produces a PDF.** The closest things:
- `scripts\debug-t8-pdf-heights.js` — measures T8 layout heights only (no PDF written). Run with `node scripts/debug-t8-pdf-heights.js`. Uses devDependency `puppeteer` (full Chromium); not currently in `package.json` `devDependencies`, so a `npm i -D puppeteer` may be needed first. Easy to fork into per-template scripts.
- `scripts\test-t8-pdf-generation.js` — exists; Cowork should read it for the same purpose.
- `ghost-audit\test-ghost-logic.js` — uses local Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) to render and assert ghost text via `pdf-parse`. Pattern is reusable per template.

The production PDF flow is request-driven (`POST /api/generate-pdf`) and only fires inside Vercel or `vercel dev`. **If Cowork wants a per-template render loop, the cleanest entry is to write a small Node script that imports the relevant `serverLib/*Html.js` builder, runs `puppeteer-core` (or full `puppeteer` for local) with the same config block from `api/generate-pdf.js:99-321`, and writes `out/template-<id>.pdf`.** Sample data is already inventoried in `src/pages/TemplatesPage.jsx`'s dummy profiles — re-export them so a CLI script can import.

### Lint / build (mandatory before commit per CLAUDE.md)
```bash
npm run lint
npm run build
```
Husky hook blocks commits on lint failures.

---

## 10. Known gotchas

A targeted list of things that will trip up an automated CSS / spacing pass:

1. **Two parallel rendering paths must be kept in sync.** `src/Template*.js` (React preview, used by current download flow via DOM capture) and `src/serverLib/*Html.js` (server builder, used when caller sends `templateId+cv` instead of `html`). Today the user-facing download path always sends pre-captured `html`, so the server builders are partly dormant — but they are still wired in `BUILDERS`. A spacing change in only one path will cause visible drift the next time the other path fires.

2. **No shared section-wrapper component.** `EntryWrap`, `SectionTitle`, `SectionHeading` are redefined inside every template file. A "change all entries to 12px gap" pass means editing 18 files (or 36 across both paths). A useful first refactor would be to extract `src/components/templates/SectionPrimitives.jsx`.

3. **Inline `style={{...}}` everywhere — design tokens are not consumed.** `index.css` has `:root` CSS vars but the resume templates ignore them and hardcode hex values. There is no `tokens.js` or theme provider. Standardizing to `15mm` margins / `20px` section gaps means touching every inline style object.

4. **Mixed units within one file.** T13 React preview uses both `px` (`12px`, `20px`) and `mm` is rare; T1 uses `mm` heavily (`6mm`, `15mm`). Server T1 uses `mm`, server T13 uses `px`. Picking a single unit (probably `mm` for everything since it's A4) is a foot-gun if done piecemeal.

5. **`Template13Finance.js` has 4 dead duplicate render functions** — `PreviewFinanceDuplicate` (line 268), `PreviewFinanceDuplicate2` (line 489), `PreviewATSInternational` (line 696, conflicts with T10's exported name), `PreviewFinanceLegacy` (line 726). Only `PreviewFinance` (line 28, exported) is live. The file is 1066 lines but only the first ~260 matter. If Cowork edits without knowing this, they will spend time on dead code. **Recommend deleting the duplicates as a pre-step** (separate PR, not part of the spacing pass).

6. **`techITProTemplate11Html.js` is the only file that uses `!important`** — 12 occurrences for break-inside / break-after rules. If the new `@media print` rules from `api/generate-pdf.js` need to override per-template rules, T11 may resist. Either drop the `!important` in T11 or escalate the runtime rules to match.

7. **`@page { size: A4; margin: 0; }` declared inside every server template is dead code** because Puppeteer is invoked with `preferCSSPageSize: false` — Puppeteer's own `margin: { top: "10mm", bottom: "15mm", left/right: "0mm" }` wins. A clean overhaul should either (a) remove all in-template `@page` blocks, or (b) flip Puppeteer to `preferCSSPageSize: true` and trust per-template `@page` (probably better for per-template control).

8. **The runtime "smart pagination" pass actively *strips* `break-inside: avoid` from any element taller than 35% of usable page** (`api/generate-pdf.js:138-151`). Adding more `break-inside: avoid` constraints does not necessarily mean they survive — they're relaxed if the element is too tall. If Cowork wants tall entries to *split* gracefully (orphan/widow control), the relaxation logic is the place to look.

9. **The runtime auto-scale pass shrinks `.cvp-root` typography to a floor of `0.92`** if page 1 overflows (`api/generate-pdf.js:271-286`). This is a silent rescaler — if Cowork increases default font sizes it may trigger silent shrinking on long CVs without obvious feedback.

10. **`Template13Finance.js` body header style hardcodes `padding: 32px 32px 20px 32px`** but the live preview wrapper `.cvp-builder-a4-fit` *also* sets `padding: 32px`. So inside the preview, T13's content is offset 32px (from the wrapper) + 32px (from the template header) = 64px from the top of the A4 sheet — but in the server-rendered HTML there is no `.cvp-builder-a4-fit` wrapper at all (only `.t13-root`), so the offset is just 32px. This means **T13 looks different in the on-screen preview vs. the server PDF.** It's worse for the templates that pre-render via the server builder (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13) because their server CSS doesn't include the A4 wrapper padding.

11. **Some templates use the legacy jsPDF helpers** (`src/pdfA4Layout.js`, `src/experiencePointsPdf.js`, `src/serverLib/pdfDrawT8SidebarStripe.js`, `src/serverLib/pdfDrawT11SidebarStripe.js`) — currently dead code in the Puppeteer flow (the T11/T8 sidebar post-processors are commented out in `api/generate-pdf.js:324-330`). Safe to ignore but may confuse readers.

12. **`global *` selector in `src/index.css:3-7`** — `* { margin: 0; padding: 0; box-sizing: border-box; }` is applied app-wide. Inside `.cvp-builder-a4-fit` this means *every* template element starts with zero margins/padding, and the only spacing is whatever the template adds back. Server-rendered HTML doesn't import `index.css`, so server output has browser defaults — another source of preview-vs-PDF drift.

13. **`input, textarea, select { font-size: 16px !important; }`** in `index.css:128-130` — irrelevant to PDF, but worth knowing if Cowork tries to render any form-like preview.

14. **`@media screen { [data-section] { cursor: pointer; ... } }`** in `index.css:1607-1650` — wraps every template section in click-targets for in-preview editing. Puppeteer renders with `screen` media (not print), so these styles **will leak into the PDF**: `outline: 2px solid transparent`, `cursor: pointer`, hover/breathe animations. The `@media print { [data-section] { outline: none; cursor: default; animation: none } }` block at `:1652-1658` resets them — but only when print media is emulated, which the current Puppeteer setup does **not** do. This is a real risk; an outline-color change to non-transparent would print ugly.

15. **`atsMode` flag in `api/generate-pdf.js:162-177`** flattens sidebar layouts to single-column and is documented as expecting `.cvp-root`, `.cvp-sidebar`, `.cvp-main` class names — which most templates don't use. Don't rely on this without checking each template adopts those classes.

---

## Quick file map (copy-paste convenience)

```
api/generate-pdf.js                                  ← Puppeteer entry, 342 lines
src/components/GhostChip.jsx                         ← ATS ghost layer (21 lines)
src/cvShared.js                                      ← TEMPLATES registry, EMPTY_RESUME
src/ResumePreview.jsx                                ← layout key → component switch
src/pages/TemplatesPage.jsx (lines 13-365)           ← per-template dummy profiles
src/index.css                                        ← global tokens, .cvp-builder-a4-fit, [data-section] rules
src/builderStyles.js                                 ← builder UI tokens (not template tokens)
src/pdfA4Layout.js                                   ← jsPDF mm constants (legacy / dead in Puppeteer flow)

src/Template1ModernEmerald.js  ↔  src/serverLib/bannerTemplate1Html.js
src/Template2DubaiModern.js    ↔  src/serverLib/twocolTemplate2Html.js
src/Template3ArabiaPro.js      ↔  src/serverLib/sidebarTemplate3Html.js
src/Template4ExecutiveGold.js  ↔  src/serverLib/timelineTemplate4Html.js
src/Template5GulfExecutive.js  ↔  src/serverLib/gulfExecTemplate5Html.js
src/Template6BankingFinance.js ↔  src/serverLib/bankingTemplate6Html.js
src/Template7CompactPro.js     ↔  src/serverLib/compactProTemplate7Html.js
src/Template8CreativeSidebar.js↔  src/serverLib/creativeSidebarTemplate8Html.js
src/Template9Hospitality.js    ↔  src/serverLib/hospitalityTemplate9Html.js
src/Template10ATSInternational.js ↔ src/serverLib/atsInternationalTemplate10Html.js
src/Template11TechITPro.js     ↔  src/serverLib/techITProTemplate11Html.js  (uses !important x12)
src/Template12Split.js         ↔  src/serverLib/template12Builder.js (+ classicTemplate12Html.js)
src/Template13Finance.js (1066 lines) ↔ src/serverLib/financeTemplate13Html.js (273 lines)  ← LEAD
src/Template14.js              ↔  src/serverLib/template14Builder.js
src/Template15.js (Slate Carbon)        ← no server builder
src/Template16.js (Crimson Edge)        ← no server builder
src/Template17.js (Forest Pro)          ← no server builder
src/Template18.js (Midnight Gold)       ← no server builder

src/serverLib/markPageStarts.js          ← injects client-side page-start tagger for T12/T14
src/serverLib/pdfCommon.js               ← escapeHtml, normalizeCvForPdf, etc.
src/downloadResumeFromPreview.js         ← user download path (DOM capture → POST html)
ghost-audit/test-ghost-logic.js          ← standalone ghost-stream regression harness
scripts/debug-t8-pdf-heights.js          ← per-template height-debug pattern (forkable)
```

**Report ends.**
