const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");
const { createClient } = require("@supabase/supabase-js");

// Shared access helper lives as ESM in src/config/access.js. This file is
// authored as CJS for compatibility with the puppeteer/chromium toolchain,
// so we dynamic-import the helper on first use and cache it.
let _accessModule;
async function loadAccess() {
  if (!_accessModule) _accessModule = await import("../src/config/access.js");
  return _accessModule;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { pdfModernEmerald } = require("../src/serverLib/bannerTemplate1Html");
const { buildTwocolTemplate2Html } = require("../src/serverLib/twocolTemplate2Html");
const { buildSidebarTemplate3Html } = require("../src/serverLib/sidebarTemplate3Html");
const { buildTimelineTemplate4Html } = require("../src/serverLib/timelineTemplate4Html");
const { buildGulfExecTemplate5Html } = require("../src/serverLib/gulfExecTemplate5Html");
const { buildBankingTemplate6Html } = require("../src/serverLib/bankingTemplate6Html");
const { buildCompactProTemplate7Html } = require("../src/serverLib/compactProTemplate7Html");
const { buildCreativeSidebarTemplate8Html } = require("../src/serverLib/creativeSidebarTemplate8Html");
const { buildHospitalityTemplate9Html } = require("../src/serverLib/hospitalityTemplate9Html");
const { buildATSInternationalTemplate10Html } = require("../src/serverLib/atsInternationalTemplate10Html");
const { buildTechITProTemplate11Html } = require("../src/serverLib/techITProTemplate11Html");
const { buildClassicTemplate12Html } = require("../src/serverLib/classicTemplate12Html");
const { buildTemplate12Html } = require("../src/serverLib/template12Builder");
const { markPageStarts } = require("../src/serverLib/markPageStarts");
const { buildFinanceTemplate13Html } = require("../src/serverLib/financeTemplate13Html");
const { buildTemplate14Html } = require("../src/serverLib/template14Builder");
const { buildUaeAtsTemplate19Html } = require("../src/serverLib/uaeAtsTemplate19Html");
const { drawT11SidebarStripeOnPdf } = require("../src/serverLib/pdfDrawT11SidebarStripe");
const { normalizeCvForPdf } = require("../src/serverLib/pdfCommon");
const { printLayoutPass } = require("../src/serverLib/printLayoutPass");

const BUILDERS = {
  1: pdfModernEmerald,
  2: buildTwocolTemplate2Html,
  3: buildSidebarTemplate3Html,
  4: buildTimelineTemplate4Html,
  5: buildGulfExecTemplate5Html,
  6: buildBankingTemplate6Html,
  7: buildCompactProTemplate7Html,
  8: buildCreativeSidebarTemplate8Html,
  9: buildHospitalityTemplate9Html,
  10: buildATSInternationalTemplate10Html,
  11: buildTechITProTemplate11Html,
  12: (cv) => markPageStarts(buildTemplate12Html(cv), { PAGE_HEIGHT: 1027 }),
  13: buildFinanceTemplate13Html,
  14: (cv) => markPageStarts(buildTemplate14Html(cv), { PAGE_HEIGHT: 1027 }),
  19: buildUaeAtsTemplate19Html,
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  let body = req.body;
  if (body == null) return res.status(400).json({ error: "Missing body" });
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { html, templateId, cv, atsMode, maxPages, consumeCredit } = body;

  // Live kill switch — PDF export can be turned off in the admin command
  // center (feature_flags.pdf_export = false). Public-read flag, so the anon
  // key is enough. FAIL-OPEN: a read error or a missing flag leaves export
  // working, so a flag outage never blocks downloads.
  try {
    const flagKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    if (SUPABASE_URL && flagKey) {
      const flagClient = createClient(SUPABASE_URL, flagKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: flag } = await flagClient.from("feature_flags").select("enabled").eq("key", "pdf_export").maybeSingle();
      if (flag && flag.enabled === false) {
        return res.status(503).json({ error: "pdf_export_disabled", message: "PDF export is temporarily unavailable. Please try again shortly." });
      }
    }
  } catch { /* flag unavailable → export stays on */ }

  // Credit gate — opt-in via `consumeCredit: true` from the builder's main
  // download path (src/downloadResumeFromPreview.js). Other callers (Walk-In
  // Mode, Cover Letter, Transform success, Scout) don't send this flag and
  // bypass the gate, preserving their existing free / pre-paid flows.
  //
  // When the flag is set we require a valid Supabase session and enforce:
  //   * hasProAccess(profile) → unlimited, no decrement
  //   * download_credits > 0  → allowed; ONE credit decremented on success
  //   * neither               → 402 with paywall payload
  //
  // The userId is taken from the verified token, never from the body.
  let creditConsumer = null; // populated only when a decrement should fire
  if (consumeCredit === true) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Server not configured" });
    }
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ error: "Invalid session" });
    }
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profErr } = await db
      .from("profiles")
      .select("id, is_pro, pro_access_expires_at, download_credits")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) {
      console.error("[generate-pdf] profile lookup failed", profErr.message);
      return res.status(500).json({ error: "Could not verify entitlement" });
    }
    const { hasProAccess } = await loadAccess();
    // Free tier gets ONE builder download, tracked by the client inserting a
    // row into `downloads` after a successful render. Kept in sync with
    // src/services/gatekeeper.js FREE_DOWNLOAD_LIMIT.
    const FREE_BUILDER_DOWNLOADS = 1;
    if (hasProAccess(profile)) {
      // Pro / Career Pro / grandfathered: unlimited downloads, no decrement.
    } else if ((profile?.download_credits || 0) > 0) {
      // Single-CV Unlock holder with download credits remaining. Schedule a
      // decrement that fires only after the PDF render succeeds.
      creditConsumer = { db, userId: user.id };
    } else {
      // Free tier: allow the first download (no decrement — the client
      // tracks it in `downloads` on success), then 402 once used.
      const { count, error: cntErr } = await db
        .from("downloads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (cntErr) {
        console.error("[generate-pdf] free-download count failed", cntErr.message);
        return res.status(500).json({ error: "Could not verify entitlement" });
      }
      if ((count || 0) >= FREE_BUILDER_DOWNLOADS) {
        return res.status(402).json({
          error: "Free download used. Unlock more downloads to continue.",
          code: "no_credit",
          paywall: true,
        });
      }
      // else: within the free allowance — allow, no credit decrement.
    }
  }

  const rawCvForLog = body.cv != null ? body.cv : cv;
  if (rawCvForLog && typeof rawCvForLog === "object") {
    console.log(
      "[generate-pdf] CV data for Puppeteer (normalized)",
      JSON.stringify(normalizeCvForPdf(rawCvForLog)),
    );
  }

  // Determine which HTML to render
  let finalHtml = html;
  if (!finalHtml && templateId && cv) {
    const builder = BUILDERS[templateId];
    if (builder) {
      finalHtml = builder(normalizeCvForPdf(cv));
    }
  }

  if (!finalHtml || typeof finalHtml !== "string") {
    return res.status(400).json({ error: "Missing html or templateId+cv" });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar"
      ),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    await page.emulateMediaType("screen");

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

    // The layout pass is shared source — see src/serverLib/printLayoutPass.js.
    // It also powers the live preview's pagination (scoped via opts.root) and
    // the parity harness, so preview and print can never drift apart.
    const layoutTrace = await page.evaluate(printLayoutPass, {
      ats: Boolean(atsMode),
      templateId,
    });
    console.log("[cvp-pdf-trace] server layout", {
      ...layoutTrace,
      maxPagesRequested: maxPages,
    });

    const maxPagesN = Number(maxPages);

    // ─── T11 STAGED ROLLOUT ─────────────────────────────────────────────────
    // Template 11 (Tech & IT Pro) is the only template currently routed
    // through a CSS-driven page-margin model. The captured T11 DOM applies
    // padding-top/bottom: 15mm and min-height: 297mm on its root; stacked on
    // top of the global Puppeteer margin: { top: 10mm, bottom: 15mm }, the
    // doubled top padding eats ~95px of page-1 usable area and the min-height
    // forces the document past the page boundary even for short CVs — which
    // orphans the LANGUAGES section onto a near-empty page 2.
    //
    // Fix: when templateId === 11, set Puppeteer margin to 0 and let the
    // wrapper-injected `@page { size: A4; margin: 15mm }` (see
    // src/downloadResumeFromPreview.js#buildCvPdfHtmlDocument) own the
    // page margin. Combined with the wrapper's strip of T11 root padding +
    // min-height, this collapses the duplicated whitespace and the orphan
    // disappears for light CVs.
    //
    // Templates 1-10 and 12-18 keep the existing config byte-for-byte.
    const isT11 = Number(templateId) === 11;

    const sharedPdfOpts = {
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
    <div style="font-family: 'Inter', sans-serif; font-size: 9px; color: #94A3B8; width: 100%; text-align: center; margin-bottom: 5mm;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>`,
      ...(maxPagesN === 1 ? { pageRanges: "1" } : {}),
    };

    let pdfBuffer = await page.pdf(
      isT11
        ? {
            ...sharedPdfOpts,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          }
        : {
            ...sharedPdfOpts,
            preferCSSPageSize: false,
            margin: {
              top: "10mm",
              bottom: "15mm",
              left: "0mm",
              right: "0mm",
            },
          },
    );

    // Template 11: repaint sidebar with a subtle per-page visual reset.
    // if (Number(templateId) === 11) {
    //   pdfBuffer = await drawT11SidebarStripeOnPdf(pdfBuffer, {
    //     page2TopOffset: 6,
    //     accentHeight: 3,
    //     drawSeparator: true,
    //   });
    // }

    // Atomic decrement on successful render. The RPC's `download_credits > 0`
    // guard makes this race-safe — concurrent downloads can't drive the
    // counter negative, and a row already at zero returns NULL.
    if (creditConsumer) {
      const { data: remaining, error: decErr } = await creditConsumer.db.rpc(
        "consume_download_credit",
        { p_user_id: creditConsumer.userId },
      );
      if (decErr) {
        console.error("[generate-pdf] credit decrement failed", {
          userId: creditConsumer.userId,
          error: decErr.message,
        });
        // Fall through — user paid for the unlock, ship the PDF anyway.
      } else if (remaining == null) {
        console.warn("[generate-pdf] credit decrement matched zero rows", {
          userId: creditConsumer.userId,
        });
      } else {
        console.log("[generate-pdf] credit consumed", {
          userId: creditConsumer.userId,
          remaining,
        });
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="cv.pdf"');
    return res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error("generate-pdf error", err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    if (browser) await browser.close();
  }
};
