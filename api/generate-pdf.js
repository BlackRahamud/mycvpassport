/**
 * Vercel serverless: HTML → PDF via iLovePDF (htmlpdf).
 *
 * Flow (correct order, all awaited):
 * 1. Upload HTML → Supabase public bucket `cv-html-temp`
 * 2. ILovePDFApi.newTask('htmlpdf') → HtmlPdfTask (tool type `htmlpdf`)
 * 3. task.start() → worker server + task id
 * 4. task.addFile(publicHtmlUrl) → cloud_file URL registered
 * 5. task.process({ page_size, page_orientation, page_margin, tool: htmlpdf via task.type })
 * 6. Download binary from GET /v1/download/{task} (see downloadIlovePdfBuffer — avoids axios
 *    following a redirect back to the Supabase HTML URL, which returns raw HTML)
 * 7. Normalize: PDF bytes, or unzip if iLovePDF returned a ZIP, or throw if HTML/error body
 * 8. Respond with Content-Type: application/pdf
 * 9. finally: remove temp object from Supabase
 *
 * POST { html: string, filename?: string }
 *
 * Env: ILOVEPDF_PUBLIC_KEY, ILOVEPDF_SECRET_KEY,
 *      REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY
 */

const { randomBytes } = require("crypto");
const axios = require("axios");
const JSZip = require("jszip");
const { createClient } = require("@supabase/supabase-js");
const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");

const CV_HTML_BUCKET = "cv-html-temp";

const ILOVEPDF_OK_STATUS = new Set(["TaskSuccess", "TaskSuccessWithWarnings"]);

function getSupabaseConfig() {
  const url = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
}

function safeFilename(name) {
  const s = String(name || "cv_cvpassport")
    .replace(/[^\w\s\-_.]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return s || "cv_cvpassport";
}

function formatIlovepdfError(err) {
  if (err.response?.data != null) {
    const d = err.response.data;
    if (typeof d === "object" && d.error) return JSON.stringify(d.error);
    if (typeof d === "string") return d;
    return JSON.stringify(d);
  }
  return err.message || String(err);
}

function looksLikePdf(buf) {
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
}

function looksLikeZip(buf) {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

function looksLikeHtml(buf) {
  const head = buf.slice(0, Math.min(512, buf.length)).toString("utf8").trimStart();
  return head.startsWith("<!") || head.startsWith("<html") || head.startsWith("<HTML") || head.startsWith("<?xml");
}

/**
 * iLovePDF GET /v1/download/{task} may respond with 302 to a temporary file URL (e.g. S3).
 * Axios default: follow all redirects. If Location ever pointed at the same Supabase HTML URL
 * (or another HTML document), the client would return that HTML as the "PDF" body.
 * We follow redirects manually and refuse to follow to the source HTML URL.
 */
async function downloadIlovePdfBuffer(task, sourceHtmlUrl) {
  const token = await task.auth.getToken();
  let url = `https://${task.server}/v1/download/${task.id}`;
  let useAuth = true;

  for (let hop = 0; hop < 12; hop++) {
    const res = await axios.get(url, {
      headers: useAuth ? { Authorization: `Bearer ${token}` } : {},
      responseType: "arraybuffer",
      maxRedirects: 0,
      validateStatus: (s) =>
        (s >= 200 && s < 300) || s === 301 || s === 302 || s === 303 || s === 307 || s === 308,
    });

    if (res.status === 200) {
      return Buffer.from(res.data);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.location;
      if (!loc) {
        throw new Error("iLovePDF download redirect without Location header");
      }
      const next = new URL(loc, url).href;

      if (sourceHtmlUrl) {
        const src = sourceHtmlUrl.replace(/\/$/, "");
        const nxt = next.replace(/\/$/, "");
        const srcBase = src.split("?")[0];
        if (nxt === src || nxt.startsWith(srcBase)) {
          throw new Error(
            "iLovePDF download redirected to the HTML source URL; axios would otherwise return raw HTML instead of a PDF.",
          );
        }
      }

      url = next;
      useAuth = false;
      continue;
    }

    throw new Error(`iLovePDF download failed with HTTP ${res.status}`);
  }

  throw new Error("Too many download redirects");
}

async function normalizeToPdfBuffer(raw) {
  if (!raw || !raw.length) {
    throw new Error("iLovePDF returned an empty download body");
  }

  if (looksLikePdf(raw)) {
    return raw;
  }

  if (looksLikeHtml(raw)) {
    const preview = raw.slice(0, 400).toString("utf8").replace(/\s+/g, " ").trim();
    throw new Error(`iLovePDF download was not a PDF (HTML or XML response). Preview: ${preview.slice(0, 240)}`);
  }

  if (looksLikeZip(raw)) {
    const zip = await JSZip.loadAsync(raw);
    const pdfNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir && /\.pdf$/i.test(n));
    if (!pdfNames.length) {
      throw new Error("iLovePDF returned a ZIP without a .pdf entry");
    }
    pdfNames.sort();
    const u8 = await zip.file(pdfNames[0]).async("uint8array");
    const out = Buffer.from(u8);
    if (!looksLikePdf(out)) {
      throw new Error("Extracted file from ZIP was not a PDF");
    }
    return out;
  }

  throw new Error(`iLovePDF download was not a PDF (first bytes: ${raw.slice(0, 24).toString("hex")})`);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  let body = req.body;
  if (body == null) {
    return res.status(400).json({ error: "Missing body" });
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const html = body.html;
  if (!html || typeof html !== "string") {
    return res.status(400).json({ error: "Missing html string" });
  }

  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const secretKey = process.env.ILOVEPDF_SECRET_KEY;
  if (!publicKey || !secretKey) {
    return res.status(500).json({ error: "PDF service not configured" });
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "Missing REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY).",
    });
  }

  const attachmentName = `${safeFilename(body.filename)}.pdf`;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const storagePath = `pdf/${Date.now()}-${randomBytes(8).toString("hex")}.html`;
  let publicHtmlUrl;
  let htmlUploaded = false;

  try {
    const { error: uploadError } = await supabase.storage.from(CV_HTML_BUCKET).upload(storagePath, Buffer.from(html, "utf8"), {
      contentType: "text/html; charset=utf-8",
      upsert: false,
    });
    if (uploadError) {
      console.error("generate-pdf supabase upload", uploadError);
      return res.status(500).json({
        error: `Supabase upload failed: ${uploadError.message}. Ensure bucket "${CV_HTML_BUCKET}" exists and is public with insert allowed.`,
      });
    }
    htmlUploaded = true;

    const { data: pub } = supabase.storage.from(CV_HTML_BUCKET).getPublicUrl(storagePath);
    publicHtmlUrl = pub.publicUrl;

    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("htmlpdf");
    await task.start();

    await task.addFile(publicHtmlUrl);

    const processResult = await task.process({
      page_size: "A4",
      page_orientation: "portrait",
      page_margin: 0,
    });

    if (processResult?.status && !ILOVEPDF_OK_STATUS.has(processResult.status)) {
      throw new Error(`iLovePDF process did not succeed (status: ${processResult.status})`);
    }

    const rawDownload = await downloadIlovePdfBuffer(task, publicHtmlUrl);
    const pdfBuf = await normalizeToPdfBuffer(rawDownload);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${attachmentName}"`);
    return res.status(200).send(pdfBuf);
  } catch (err) {
    console.error("generate-pdf error", formatIlovepdfError(err), err);
    return res.status(500).json({ error: formatIlovepdfError(err) });
  } finally {
    if (htmlUploaded) {
      try {
        await supabase.storage.from(CV_HTML_BUCKET).remove([storagePath]);
      } catch (e) {
        console.error("generate-pdf supabase cleanup", e);
      }
    }
  }
};
