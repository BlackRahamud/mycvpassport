/**
 * Vercel serverless: HTML → PDF via iLovePDF REST API (tool: htmlpdf).
 *
 * Official flow (https://developer.ilovepdf.com/docs):
 * 1. JWT Bearer: sign locally with public + secret key (same as @ilovepdf/ilovepdf-js-core JWT).
 * 2. Start: GET https://api.ilovepdf.com/v1/start/htmlpdf
 * 3. Upload: POST https://{server}/v1/upload — JSON body { task, cloud_file } (not multipart)
 * 4. Process: POST https://{server}/v1/process — JSON { task, tool: "htmlpdf", files: [...], ... }
 * 5. Download: GET https://{server}/v1/download/{task} (manual redirect handling; see downloadIlovePdfBuffer)
 * 6. Supabase: temp HTML at publicHtmlUrl; delete object in finally
 *
 * POST { html: string, filename?: string }
 *
 * Env: ILOVEPDF_PUBLIC_KEY, ILOVEPDF_SECRET_KEY,
 *      REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY
 */

const { randomBytes } = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const CV_HTML_BUCKET = "cv-html-temp";

const ILOVE_API_HOST = "api.ilovepdf.com";
const ILOVE_API_VER = "v1";
const ILOVE_TOOL = "htmlpdf";
/** Matches ilovepdf-js-core auth/JWT.js — servers reject tokens with iat “too new” */
const JWT_IAT_DELAY_SEC = 5;

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

function createIloveBearerToken(publicKey, secretKey) {
  const timeNow = Date.now() / 1000;
  const payload = {
    jti: publicKey,
    iss: ILOVE_API_HOST,
    iat: timeNow - JWT_IAT_DELAY_SEC,
  };
  return jwt.sign(payload, secretKey);
}

function basenameFromUrl(url) {
  const i = url.lastIndexOf("/") + 1;
  if (i <= 0) return "file.html";
  return url.substring(i).split("?")[0] || "file.html";
}

async function iloveStartHtmlpdf(bearerToken) {
  const { data } = await axios.get(`https://${ILOVE_API_HOST}/${ILOVE_API_VER}/start/${ILOVE_TOOL}`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
  });
  const { task, server } = data;
  if (!task || !server) {
    throw new Error("iLovePDF start/htmlpdf: missing task or server in response");
  }
  return { taskId: task, server };
}

async function iloveUploadCloudFile(bearerToken, server, taskId, cloudFileUrl) {
  const { data } = await axios.post(
    `https://${server}/${ILOVE_API_VER}/upload`,
    JSON.stringify({ task: taskId, cloud_file: cloudFileUrl }),
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json;charset=UTF-8",
      },
    },
  );
  const { server_filename } = data;
  if (!server_filename) {
    throw new Error("iLovePDF upload: missing server_filename in response");
  }
  return { server_filename, filename: basenameFromUrl(cloudFileUrl) };
}

async function iloveProcessHtmlpdf(bearerToken, server, taskId, files, options) {
  const body = {
    task: taskId,
    tool: ILOVE_TOOL,
    files,
    ...options,
  };
  const { data } = await axios.post(`https://${server}/${ILOVE_API_VER}/process`, JSON.stringify(body), {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
  });
  return data;
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
 * GET /v1/download/{task} may 302 to a CDN URL; avoid following back to the Supabase HTML source URL.
 */
async function downloadIlovePdfBuffer(ctx, sourceHtmlUrl) {
  const { bearerToken, server, taskId } = ctx;
  let url = `https://${server}/${ILOVE_API_VER}/download/${taskId}`;
  let useAuth = true;

  for (let hop = 0; hop < 12; hop++) {
    const res = await axios.get(url, {
      headers: useAuth ? { Authorization: `Bearer ${bearerToken}` } : {},
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

const PDF_MAGIC = Buffer.from("%PDF");
const PDF_EOF = Buffer.from("%%EOF");

function extractPdfFromZipLikeBuffer(buf) {
  const start = buf.indexOf(PDF_MAGIC);
  if (start === -1) return null;
  const tail = buf.slice(start);
  const eofRel = tail.lastIndexOf(PDF_EOF);
  if (eofRel === -1) return null;
  const out = tail.slice(0, eofRel + PDF_EOF.length);
  return looksLikePdf(out) ? out : null;
}

function normalizeToPdfBuffer(raw) {
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
    const extracted = extractPdfFromZipLikeBuffer(raw);
    if (extracted) {
      return extracted;
    }
    throw new Error(
      "iLovePDF returned a ZIP but no embedded %PDF…%%EOF could be read (compressed ZIP entries need a full unzip library).",
    );
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

    const bearerToken = createIloveBearerToken(publicKey, secretKey);
    const { taskId, server } = await iloveStartHtmlpdf(bearerToken);

    const { server_filename, filename } = await iloveUploadCloudFile(bearerToken, server, taskId, publicHtmlUrl);

    const processResult = await iloveProcessHtmlpdf(bearerToken, server, taskId, [{ server_filename, filename }], {
      page_size: "A4",
      page_orientation: "portrait",
      page_margin: 0,
    });

    if (processResult?.status && !ILOVEPDF_OK_STATUS.has(processResult.status)) {
      throw new Error(`iLovePDF process did not succeed (status: ${processResult.status})`);
    }

    const rawDownload = await downloadIlovePdfBuffer({ bearerToken, server, taskId }, publicHtmlUrl);
    const pdfBuf = normalizeToPdfBuffer(rawDownload);

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
