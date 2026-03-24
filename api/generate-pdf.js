/**
 * Vercel serverless: HTML → PDF via @ilovepdf/ilovepdf-nodejs (tool: htmlpdf).
 *
 * Matches ilovepdf-js-core: addFile(string URL) → cloud_file JSON upload.
 * process({ page_size, page_orientation, single_page }); download() → Uint8Array.
 *
 * POST { html: string, filename?: string }
 *
 * Env: ILOVEPDF_PUBLIC_KEY, ILOVEPDF_SECRET_KEY,
 *      REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY
 */

const { randomBytes } = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");

const CV_HTML_BUCKET = "cv-html-temp";

function getSupabaseConfig() {
  const url = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
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

  const supabase = createClient(supabaseUrl, supabaseKey);
  const storagePath = `pdf/${Date.now()}-${randomBytes(8).toString("hex")}.html`;
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
    const publicHtmlUrl = pub.publicUrl;

    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("htmlpdf");
    await task.start();
    await task.addFile(publicHtmlUrl);
    await task.process({
      page_size: "A4",
      page_orientation: "portrait",
      single_page: false,
    });
    const data = await task.download();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="cv.pdf"');
    return res.status(200).send(Buffer.from(data));
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
