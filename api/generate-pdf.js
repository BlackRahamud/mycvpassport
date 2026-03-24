/**
 * Vercel serverless: HTML → PDF via iLovePDF (htmlpdf).
 * iLovePDF only accepts htmlpdf inputs as public URLs (cloud_file), not raw multipart HTML.
 * We upload HTML to Vercel Blob (public), pass the URL to iLovePDF, then delete the blob.
 *
 * POST { html: string, filename?: string }
 *
 * Env: ILOVEPDF_PUBLIC_KEY, ILOVEPDF_SECRET_KEY, BLOB_READ_WRITE_TOKEN (Vercel Blob)
 */

const { randomBytes } = require("crypto");
const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");
const { put, del } = require("@vercel/blob");

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error:
        "PDF: add BLOB_READ_WRITE_TOKEN (Vercel Blob). iLovePDF HTML→PDF requires a public URL; the server uploads HTML to Blob and passes that URL.",
    });
  }

  const attachmentName = `${safeFilename(body.filename)}.pdf`;
  let htmlBlobUrl;

  try {
    const pathname = `cv-pdf-html/${Date.now()}-${randomBytes(8).toString("hex")}.html`;
    const blob = await put(pathname, html, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      addRandomSuffix: true,
    });
    htmlBlobUrl = blob.url;

    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("htmlpdf");
    await task.start();

    await task.addFile(htmlBlobUrl);

    await task.process({
      page_size: "A4",
      page_orientation: "portrait",
      page_margin: 0,
    });

    const data = await task.download();
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${attachmentName}"`);
    return res.status(200).send(buf);
  } catch (err) {
    console.error("generate-pdf error", formatIlovepdfError(err), err);
    return res.status(500).json({ error: formatIlovepdfError(err) });
  } finally {
    if (htmlBlobUrl) {
      try {
        await del(htmlBlobUrl);
      } catch (e) {
        console.error("generate-pdf blob cleanup", e);
      }
    }
  }
};
