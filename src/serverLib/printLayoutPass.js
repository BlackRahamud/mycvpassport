/**
 * The in-page layout pass that runs against the CV HTML right before
 * Chromium prints it — relaxation of break-inside constraints, the T11
 * straddle-break workaround, smart pagination for .cvp-main templates,
 * page-start marking and gentle typography auto-scale.
 *
 * ONE source of truth, three consumers:
 *   1. api/generate-pdf.js       — page.evaluate(printLayoutPass, {ats, templateId})
 *   2. scripts/verify-preview-parity.mjs — same call, local Chromium
 *   3. src/lib/preview/printSim.js — runs it in-app against a cloned
 *      preview DOM (opts.root) so the live preview paginates exactly
 *      like the export.
 *
 * MUST stay fully self-contained (no imports, no closures) — Puppeteer
 * serializes the function into the page. `opts.root` scopes every query
 * for the in-app consumer; the print consumers omit it (scope=document).
 * Behaviour with scope=document is byte-for-byte the pass that used to
 * live inline in api/generate-pdf.js.
 */
function printLayoutPass(opts) {
  const ats = Boolean(opts && opts.ats);
  const templateId = opts ? opts.templateId : undefined;
  const scope = (opts && opts.root) || document;

  // Only run if templates implement semantic layout markers
  const main = scope.querySelector(".cvp-main");
  const trace = {
    sawCvpMain: !!main,
    initialRootHeight: 0,
    initialBlockCount: 0,
    breaksInserted: 0,
    finalRootHeight: 0,
  };
  const rootEl =
    scope.querySelector(".cvp-builder-a4-fit") ||
    (scope === document ? document.body : scope);
  // Page math below uses rect.top, which is viewport-relative. In the
  // print page the document sits at viewport origin (rootTop === 0), so
  // subtracting it is a no-op there — but it makes the pass correct when
  // run against an in-app clone that lives anywhere on screen.
  const rootTop = rootEl.getBoundingClientRect().top;
  trace.initialRootHeight = Math.round(rootEl.getBoundingClientRect().height);
  trace.initialBlockCount = scope.querySelectorAll("[data-block]").length;

  // Relaxation pass — runs for ALL templates (client-rendered HTML has
  // no .cvp-main so the pagination logic below is a no-op). Every
  // template wraps entries in EntryWrap with inline
  // `break-inside: avoid`, which Chromium respects during page.pdf()
  // even with screen media emulation. When an entry would straddle a
  // page boundary, Chromium pushes the whole entry to the next page —
  // leaving whitespace behind and inflating the page count. Strip the
  // constraint from any element large enough that keeping it intact
  // would blow a full page of whitespace; small entries keep the
  // constraint so single-job blocks still stay together.
  const PAGE_USABLE_PX = 1028; // A4 @ 96dpi minus 10mm top + 15mm bottom margins
  const SPLIT_THRESHOLD = PAGE_USABLE_PX * 0.35;
  let relaxedCount = 0;
  scope
    .querySelectorAll('[style*="break-inside"], [style*="page-break-inside"]')
    .forEach((el) => {
      const h = el.getBoundingClientRect().height;
      if (h > SPLIT_THRESHOLD) {
        el.style.removeProperty("break-inside");
        el.style.removeProperty("page-break-inside");
        el.style.removeProperty("-webkit-column-break-inside");
        relaxedCount += 1;
      }
    });
  trace.breakInsideRelaxed = relaxedCount;

  // ─── T11 ROUND 2 FIX: text-stream reorder workaround ──────────────────
  // When Chromium has to defer an element with break-inside: avoid that
  // would straddle a page boundary, it emits subsequent siblings first
  // in the PDF content stream and emits the deferred element LAST.
  // The visual layout is correct (positions are computed once and
  // honored), but the text stream reads:
  //   bullets → EDUCATION → LANGUAGES → header
  // ATS readers parse text in stream order and see orphaned bullets
  // followed by a header at the end — destroying job-context for that
  // entry. Sidestep the deferral entirely by inserting an explicit
  // .cvp-page-break before any [data-block="job"] that would straddle.
  // The injected @media print rule turns .cvp-page-break into
  // break-before: page, forcing a clean page start. T11-only because
  // (a) only T11 has captured DOM with [data-block="job"] but no
  // .cvp-main wrapper to drive the existing runSmartPagination, and
  // (b) other templates either go through runSmartPagination already
  // (T12/T14) or have no [data-block="job"].
  let t11BreaksInserted = 0;
  if (Number(templateId) === 11) {
    // After the T11 staged-rollout fix (commit 18df25a) the page is
    // rendered with @page margin: 15mm + preferCSSPageSize, so usable
    // per page = 297mm - 30mm = 267mm = ~1009px @ 96dpi.
    const T11_PAGE_USABLE_PX = Math.round((267 * 96) / 25.4);
    const jobs = Array.from(scope.querySelectorAll('[data-block="job"]'));
    jobs.forEach((el) => {
      const r = el.getBoundingClientRect();
      // Subtract 1 from bottom to handle exact-boundary equality.
      const pageOfTop = Math.floor((r.top - rootTop) / T11_PAGE_USABLE_PX);
      const pageOfBottom = Math.floor((r.bottom - rootTop - 1) / T11_PAGE_USABLE_PX);
      if (pageOfTop !== pageOfBottom && el.parentNode) {
        const brk = document.createElement("div");
        brk.className = "cvp-page-break";
        el.parentNode.insertBefore(brk, el);
        t11BreaksInserted += 1;
      }
    });
  }
  trace.t11BreaksInserted = t11BreaksInserted;

  if (!main) {
    trace.finalRootHeight = Math.round(rootEl.getBoundingClientRect().height);
    return trace;
  }

  const PAGE_HEIGHT = 1122; // ~A4 @ 96dpi (794x1123)

  function applyATSMode() {
    if (!ats) return;
    const root = scope.querySelector(".cvp-root");
    const sidebar = scope.querySelector(".cvp-sidebar");
    const mainEl = scope.querySelector(".cvp-main");
    if (root) root.style.display = "block";
    if (sidebar) {
      sidebar.style.position = "static";
      sidebar.style.width = "100%";
      sidebar.style.height = "auto";
    }
    if (mainEl) {
      mainEl.style.marginLeft = "0";
      mainEl.style.display = "block";
    }
  }

  function optimizeSpacing() {
    const sections = scope.querySelectorAll(
      '[data-block="section"], [data-block="experience"], [data-block="education"]',
    );
    sections.forEach((section) => {
      const body = section.querySelector(".section-body");
      if (!body) return;
      const h = section.getBoundingClientRect().height;
      if (h > 600) {
        body.style.rowGap = "4px";
        body.style.marginTop = "4px";
        body.querySelectorAll("[data-block]").forEach((el) => {
          el.style.marginBottom = "4px";
        });
      }
    });
  }

  function runSmartPagination() {
    const blocks = Array.from(main.querySelectorAll("[data-block]"));
    if (!blocks.length) return;

    let cursorY = 0;
    const breaks = [];

    blocks.forEach((el, index) => {
      const h = el.getBoundingClientRect().height;
      const type = el.dataset.block;

      const next = blocks[index + 1];
      const nextH = next ? next.getBoundingClientRect().height : 0;

      let SAFE_MARGIN = 40;
      if (cursorY > PAGE_HEIGHT * 0.7) SAFE_MARGIN = 80;

      const projected = cursorY + h + nextH * 0.6;

      if (type === "job" || type === "list") {
        if (projected > PAGE_HEIGHT - SAFE_MARGIN) {
          breaks.push(el);
          cursorY = 0;
        }
        cursorY += h;
        return;
      }

      if (
        type === "section" ||
        type === "experience" ||
        type === "education"
      ) {
        const isLargeSection = h > PAGE_HEIGHT * 0.5;

        if (projected > PAGE_HEIGHT - SAFE_MARGIN) {
          if (isLargeSection) {
            cursorY += h;
          } else {
            breaks.push(el);
            cursorY = h;
          }
        } else {
          cursorY += h;
        }
        return;
      }

      cursorY += h;
    });

    breaks.forEach((el) => {
      const b = document.createElement("div");
      b.className = "cvp-page-break";
      el.parentNode && el.parentNode.insertBefore(b, el);
    });
  }

  function markPageStarts() {
    const PAGE_HEIGHT_MARK = 1027;
    const blocks = scope.querySelectorAll("[data-block]");

    blocks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - rootTop;
      const pageIndex = Math.floor(top / PAGE_HEIGHT_MARK);
      if (pageIndex > 0) {
        const distanceIntoPage = top % PAGE_HEIGHT_MARK;
        if (distanceIntoPage < 20) {
          el.classList.add("cvp-new-page-start");
        }
      }
    });
  }

  function autoScaleTypography() {
    const root = scope.querySelector(".cvp-root");
    if (!root) return;
    let scale = 1;

    const max = PAGE_HEIGHT;
    const height = () => root.getBoundingClientRect().height;

    // Only gently scale down if the first page is badly overflowing.
    while (height() > max && scale > 0.92) {
      scale -= 0.02;
      root.style.transform = `scale(${scale})`;
      root.style.transformOrigin = "top left";
      root.style.width = `${100 / scale}%`;
    }
  }

  applyATSMode();
  optimizeSpacing();
  const breaksBefore = scope.querySelectorAll(".cvp-page-break").length;
  runSmartPagination();
  trace.breaksInserted = scope.querySelectorAll(".cvp-page-break").length - breaksBefore;
  markPageStarts();
  autoScaleTypography();
  trace.finalRootHeight = Math.round(rootEl.getBoundingClientRect().height);
  return trace;
}

module.exports = { printLayoutPass };
