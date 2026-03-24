/**
 * Vercel serverless: HTML → PDF via iLovePDF (htmlpdf).
 * POST { html: string, filename?: string }
 */

const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");
const ILovePDFFile = require("@ilovepdf/ilovepdf-nodejs/ILovePDFFile");

function safeFilename(name) {
  const s = String(name || "cv_cvpassport")
    .replace(/[^\w\s\-_.]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return s || "cv_cvpassport";
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

  const attachmentName = `${safeFilename(body.filename)}.pdf`;

  try {
    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("htmlpdf");
    await task.start();

    const htmlBuffer = Buffer.from(html, "utf8");
    const file = ILovePDFFile.fromArray(htmlBuffer, "cv.html");
    await task.addFile(file);

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
    console.error("generate-pdf error", err);
    return res.status(500).json({ error: err.message || "PDF generation failed" });
  }
};
