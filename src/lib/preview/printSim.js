/**
 * printSim — makes the live builder preview paginate exactly like the
 * exported PDF.
 *
 * The export path captures the preview's `.cvp-builder-a4-fit` outerHTML,
 * wraps it in the print document (src/downloadResumeFromPreview.js) and
 * has Chromium print it after running the shared layout pass
 * (src/serverLib/printLayoutPass.js). This module replays that exact
 * sequence in-app against a clone of the preview DOM:
 *
 *   1. clone the canonical 794px render into an offscreen host styled
 *      like the print wrapper (same width/padding, no radius/shadow),
 *   2. run the SAME printLayoutPass (scoped to the clone),
 *   3. simulate Chromium's fragmentation: any block that still carries
 *      `break-inside: avoid` after the relaxation pass gets pushed to the
 *      next page boundary with a spacer, exactly like the print engine
 *      pushes it (leaving the same whitespace behind); `break-after:
 *      avoid` section titles stay glued to their first block,
 *   4. return the mutated HTML + page geometry so the preview can window
 *      it into true A4 sheets.
 *
 * Parity is enforced by scripts/verify-preview-parity.mjs, which renders
 * both sides from the same fixture and compares page starts.
 */
import { printLayoutPass } from "../../serverLib/printLayoutPass";

export const A4_W = 794;
export const A4_H = 1123;
const MM = 96 / 25.4;

/**
 * Per-template page geometry, mirroring api/generate-pdf.js:
 * - default: page.pdf margins top 10mm / bottom 15mm, no side margins;
 *   content width equals the page width, so print scale is 1.
 * - T11: @page { margin: 15mm } via preferCSSPageSize (staged rollout).
 *   The 794px-wide capture is wider than the 180mm printable box, so
 *   Chromium shrink-to-fits it (uniform scale by width). One printed page
 *   therefore holds usable/scale layout-pixels — verified against real
 *   page.pdf output by scripts/verify-preview-parity.mjs.
 */
export function getPageGeometry(templateId) {
  if (Number(templateId) === 11) {
    const m = 15 * MM;
    const contentScale = (A4_W - 2 * m) / A4_W;
    return {
      topOffset: m,
      sideOffset: m,
      usable: (A4_H - 2 * m) / contentScale,
      contentScale,
    };
  }
  return { topOffset: 10 * MM, sideOffset: 0, usable: A4_H - 25 * MM, contentScale: 1 };
}

/** Field-group → how to locate the section inside the rendered document. */
const GROUP_SELECTORS = {
  header: "header, .cvp-header, [data-section='header']",
  summary: "[data-section='summary']",
  experience: "[data-section='experience']",
  education: "[data-section='education']",
  competencies: "[data-section='competencies']",
  languages: "[data-section='languages']",
  certifications: "[data-section='certifications']",
  personalDetails: "[data-section='personal-details'], [data-section='personalDetails']",
};

function isAvoidInside(el) {
  const v = `${el.style.breakInside || ""} ${el.style.pageBreakInside || ""}`;
  return v.includes("avoid");
}

function isAvoidAfter(el) {
  const v = `${el.style.breakAfter || ""} ${el.style.pageBreakAfter || ""}`;
  return v.includes("avoid");
}

/**
 * Chromium fragmentation simulation. Walks the document top-down; when a
 * protected unit straddles a page boundary it inserts a spacer that pushes
 * the unit to the next page (shifting everything below, like print).
 *
 * NOTE: `.cvp-page-break` divs are deliberately IGNORED. Their only style
 * lives in the @media print block, and production prints with
 * page.emulateMediaType("screen"), which masks print rules during
 * page.pdf() — so they are inert 0-height divs in the real export too.
 * Only inline break-inside/break-after styles actually fragment.
 */
function simulateFragmentation(clone, usable) {
  const rootTop = () => clone.getBoundingClientRect().top;

  const pushToNextBoundary = (el, top) => {
    const remainder = top % usable;
    if (remainder <= 0.5) return; // already at a boundary
    const spacer = document.createElement("div");
    spacer.className = "cvp-printsim-spacer";
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.height = `${usable - remainder}px`;
    spacer.style.flexShrink = "0";
    el.parentNode.insertBefore(spacer, el);
  };

  const candidates = Array.from(clone.querySelectorAll("*")).filter(
    (el) => isAvoidInside(el) || isAvoidAfter(el),
  );

  candidates.forEach((el) => {
    if (!el.parentNode || !el.isConnected) return;
    const base = rootTop();
    const r = el.getBoundingClientRect();
    const top = r.top - base;

    let bottom = r.bottom - base;
    if (isAvoidAfter(el)) {
      // Keep the title glued to the block that follows it: the unit that
      // must not straddle is title + the first following sibling that has
      // a real box (templates interleave zero-size ghost chips whose
      // empty rects would otherwise produce negative unit heights).
      let next = el.nextElementSibling;
      while (next) {
        const nr = next.getBoundingClientRect();
        if (nr.height > 0.5) {
          const nb = nr.bottom - base;
          if (nb > bottom) bottom = nb;
          break;
        }
        next = next.nextElementSibling;
      }
    }

    const height = bottom - top;
    if (height <= 0 || height >= usable) return; // degenerate, or can't be kept whole — print splits it too
    const pageOfTop = Math.floor(top / usable);
    const pageOfBottom = Math.floor((bottom - 1) / usable);
    if (pageOfTop !== pageOfBottom) {
      pushToNextBoundary(el, top);
    }
  });
}

/** First non-empty text content at or below a given content offset. */
function firstTextAfter(clone, baseTop, offsetY) {
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (text) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.height > 0 && r.bottom - baseTop > offsetY + 1) {
        return text.slice(0, 48);
      }
    }
    node = walker.nextNode();
  }
  return "";
}

/**
 * Build the paginated document from the canonical preview render.
 *
 * @param {HTMLElement} sourceFitEl — the live `.cvp-builder-a4-fit` node
 * @param {number|undefined} templateId
 * @returns {{ html: string, pageCount: number, geo: object,
 *             sectionRects: Object<string,{y:number,h:number}>,
 *             pageStarts: string[] }}
 */
export function buildPaginatedDocument(sourceFitEl, templateId) {
  const geo = getPageGeometry(templateId);

  const host = document.createElement("div");
  // Laid out but far offscreen — must NOT be display:none (we measure it).
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:794px;pointer-events:none;";
  const clone = sourceFitEl.cloneNode(true);

  // Mirror the print wrapper's .cvp-builder-a4-fit rules
  // (src/downloadResumeFromPreview.js buildCvPdfHtmlDocument).
  clone.style.background = "#ffffff";
  clone.style.width = "794px";
  clone.style.minHeight = "unset";
  clone.style.height = "auto";
  clone.style.padding = "32px";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";
  clone.style.boxSizing = "border-box";
  if (Number(templateId) === 11) {
    // T11 staged rollout: wrapper padding stripped, template root loses
    // vertical padding + min-height (mirrors the t11Css block).
    clone.style.padding = "0";
    const inner = clone.querySelector(":scope > div");
    if (inner) {
      inner.style.paddingTop = "0";
      inner.style.paddingBottom = "0";
      inner.style.minHeight = "0";
    }
  }

  host.appendChild(clone);
  document.body.appendChild(host);

  let html = "";
  let pageCount = 1;
  const sectionRects = {};
  const pageStarts = [];
  try {
    printLayoutPass({ root: host, templateId });
    simulateFragmentation(clone, geo.usable);

    const base = clone.getBoundingClientRect();
    const totalH = base.height;
    pageCount = Math.max(1, Math.ceil((totalH - 2) / geo.usable));

    Object.entries(GROUP_SELECTORS).forEach(([group, sel]) => {
      const el = clone.querySelector(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      sectionRects[group] = { y: r.top - base.top, h: r.height };
    });

    // First visible text of each page — the parity harness compares these
    // against the exported PDF's per-page text extraction.
    for (let k = 0; k < pageCount; k += 1) {
      pageStarts.push(firstTextAfter(clone, base.top, k * geo.usable));
    }

    html = clone.outerHTML;
  } finally {
    document.body.removeChild(host);
  }

  return { html, pageCount, geo, sectionRects, pageStarts };
}

/**
 * Which logical field group changed between two cv objects — drives the
 * "your edit landed here" pulse in the preview. Shallow, cheap, ordered
 * so the most specific group wins.
 */
export function changedFieldGroup(prev, next) {
  if (prev === next) return null;
  const groups = [
    ["summary", ["summary"]],
    ["experience", ["experience"]],
    ["education", ["education"]],
    ["competencies", ["skills", "technicalSkills"]],
    ["languages", ["languages"]],
    ["certifications", ["certifications"]],
    [
      "personalDetails",
      ["nationality", "visaStatus", "dob", "gender", "maritalStatus", "drivingLicense"],
    ],
    ["header", ["name", "title", "email", "phone", "linkedin", "location"]],
  ];
  for (const [group, keys] of groups) {
    for (const k of keys) {
      const a = prev ? prev[k] : undefined;
      const b = next ? next[k] : undefined;
      if (a === b) continue;
      // Arrays (experience/education/certifications) change identity on
      // every edit — compare serialized content to avoid false pulses.
      if (Array.isArray(a) && Array.isArray(b) && JSON.stringify(a) === JSON.stringify(b)) continue;
      return group;
    }
  }
  return null;
}
