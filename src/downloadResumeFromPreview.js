import { ANON_DOWNLOADS_KEY } from "./components/FAB/FABLogic";
import { supabase } from "./appSupabaseClient";
import { cvWithTemplateCertifications } from "./cvShared";
import safeFetch from "./lib/net/safeFetch";

/** Full HTML document for iLovePDF (fonts + A4 preview shell; mirrors index.css .cvp-builder-a4-fit desktop rules). */
function buildCvPdfHtmlDocument(cvFragmentHtml, templateId) {
  // ─── T11 STAGED ROLLOUT ─────────────────────────────────────────────────────
  // Template 11 (Tech & IT Pro) is the only template currently routed through a
  // CSS-driven page-margin model. The captured T11 DOM has its own
  // padding-top/bottom: 15mm and min-height: 297mm — when stacked on top of the
  // global Puppeteer margin: { top: 10mm, bottom: 15mm }, the doubled top
  // padding eats ~95px of page-1 usable area and the min-height forces the
  // document past the page boundary even for short CVs, orphaning the last
  // section (the "LANGUAGES on a blank page 2" bug). Strip those for T11 and
  // let @page { margin: 15mm } own the margins; the matching server change is
  // page.pdf({ margin: 0, preferCSSPageSize: true }) in api/generate-pdf.js.
  // No @media print wrapper: this CSS only ever runs in the download path
  // (never the live preview), so unconditional rules are safe and avoid the
  // page.emulateMediaType('screen') interaction that would mask print rules.
  const t11Css =
    Number(templateId) === 11
      ? `
    @page { size: A4; margin: 15mm; }
    .cvp-builder-a4-fit { padding: 0 !important; }
    .cvp-builder-a4-fit > div {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      min-height: 0 !important;
    }
  `
      : "";

  const style = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #ffffff; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    /* Placeholder text keeps the same muted treatment it has in the live
       preview (src/previewPlaceholder.js) — WYSIWYG for unfinished CVs. */
    .cvp-ph { opacity: 0.55; }
    .cvp-builder-a4-fit {
      background: #ffffff;
      width: 794px;
      min-height: unset;
      height: auto;
      padding: 32px;
      border-radius: 8px;
      box-shadow: none;
      box-sizing: border-box;
    }
    ${t11Css}
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap"/>
<style>${style}</style>
</head>
<body${templateId ? ` data-template-id="${Number(templateId)}"` : ""}>
${cvFragmentHtml}
</body>
</html>`;
}

// ─── PDF DOWNLOAD — iLovePDF API (A4) from live preview HTML ───────────────────
/**
 * @param {object} cvInput
 * @param {HTMLElement} captureElement
 * @param {{ maxPages?: 1 | 2, templateId?: number }} [opts]
 *   - maxPages: when 1, PDF is clipped to the first page (server-side).
 *   - templateId: passed to the server so per-template Puppeteer config can
 *     be applied. Used for the T11 staged rollout (see api/generate-pdf.js).
 */
export async function downloadResumeFromPreview(cvInput, captureElement, opts = {}) {
  const cv = cvWithTemplateCertifications(cvInput);
  if (!captureElement) throw new Error("Preview not ready");

  const cvElement = captureElement.classList.contains("cvp-builder-a4-fit")
    ? captureElement
    : captureElement.querySelector(".cvp-builder-a4-fit");
  if (!cvElement) throw new Error("Preview not ready");

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  // Trace what's actually being captured. If PDF page count doesn't shrink
  // when content is trimmed, this tells us whether the capture itself is
  // stale (same HTML size, same block count, same rendered height) or if
  // the server-side pagination is introducing breaks that don't collapse.
  const capturedFragment = cvElement.outerHTML;
  const rect = cvElement.getBoundingClientRect();
  const blockCount = cvElement.querySelectorAll("[data-block]").length;
  const explicitBreaks = cvElement.querySelectorAll(".cvp-page-break, .cvp-new-page-start").length;
  const inlineHeightNodes = cvElement.querySelectorAll("[style*='height']").length;
  console.log("[cvp-pdf-trace] capture snapshot", {
    htmlLength: capturedFragment.length,
    renderedHeightPx: Math.round(rect.height),
    renderedWidthPx: Math.round(rect.width),
    blockCount,
    explicitBreaks,
    inlineHeightNodes,
    experienceEntries: Array.isArray(cv.experience) ? cv.experience.length : null,
    educationEntries: Array.isArray(cv.education) ? cv.education.length : null,
    skillsChars: typeof cv.skills === "string" ? cv.skills.length : null,
    summaryChars: typeof cv.summary === "string" ? cv.summary.length : null,
    maxPages: opts.maxPages ?? "unset",
  });

  const templateId =
    opts.templateId != null && Number.isFinite(Number(opts.templateId))
      ? Number(opts.templateId)
      : undefined;
  const html = buildCvPdfHtmlDocument(capturedFragment, templateId);
  const baseName = `${(cv.name || "Resume").replace(/\s+/g, "_")}_CVPassport`;

  const maxPages = opts.maxPages === 1 ? 1 : opts.maxPages === 2 ? 2 : undefined;

  // Builder CV download path — gated by the server credit logic. We send
  // the user's access token so the server can validate the session, and
  // `consumeCredit: true` so the server applies the
  // hasProAccess-OR-credit gate and decrements on success. Other callers
  // of /api/generate-pdf (Walk-In, Cover Letter, Transform, Scout) skip
  // both — they have their own paywalls or are free flows.
  const headers = { "Content-Type": "application/json" };
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  const res = await safeFetch(`${window.location.origin}/api/generate-pdf`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      html,
      filename: baseName,
      cv,
      consumeCredit: true,
      ...(templateId != null ? { templateId } : {}),
      ...(maxPages != null ? { maxPages } : {}),
    }),
  });
  if (!res.ok) {
    let msg = `Server error ${res.status}`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("downloads").insert([{ user_id: user.id }]);
      if (error) console.error("Error tracking download:", error);
    } else {
      try {
        if (typeof localStorage !== "undefined") {
          const cur = parseInt(localStorage.getItem(ANON_DOWNLOADS_KEY) || "0", 10) || 0;
          localStorage.setItem(ANON_DOWNLOADS_KEY, String(cur + 1));
        }
      } catch {
        /* ignore */
      }
    }
  }
}
