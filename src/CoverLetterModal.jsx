import { useMemo, useState } from "react";
import { generateCoverLetterFromTemplate } from "./coverLetterDataBank.generated";
import UpgradeModal from "./UpgradeModal";

function getTodayDateLabel() {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function toExperienceBullets(resume) {
  const list = Array.isArray(resume?.experience) ? resume.experience : [];
  return list
    .slice(0, 3)
    .map((e) => {
      const role = e?.role ? `${e.role}` : "Role";
      const company = e?.company ? ` at ${e.company}` : "";
      const points = String(e?.points || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const topPoint = points[0] ? ` — ${points[0]}` : "";
      return `${role}${company}${topPoint}`;
    })
    .filter(Boolean);
}

function getCoverLetterPricingMarket() {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("cvp_pricing_currency") === "IN" ? "India" : "UAE";
  } catch {
    return "UAE";
  }
}

function defaultLetterTemplate({ resume, generatedBody, companyName, jobTitle }) {
  const fullName = resume?.name || "Candidate Name";
  const email = resume?.email || "email@example.com";
  const phone = resume?.phone || "Phone";
  const location = resume?.location || "Location";
  const companyLine = companyName?.trim() || "Company Name";
  const dateLine = getTodayDateLabel();

  return `${fullName} | ${email} | ${phone} | ${location}
${dateLine}

${companyLine}
Dear Hiring Manager,

${generatedBody || `I am writing to express my interest in the ${jobTitle} position. My background aligns well with this opportunity.`}

Yours sincerely,
${fullName}`;
}

export default function CoverLetterModal({ isOpen, onClose, resume }) {
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [describeYourselfInput, setDescribeYourselfInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [letterFromTemplateEngine, setLetterFromTemplateEngine] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const importedSummary = useMemo(() => {
    const skills = String(resume?.skills || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join(", ");
    const exp = toExperienceBullets(resume);
    return {
      name: resume?.name || "",
      role: resume?.title || "",
      summary: resume?.summary || "",
      skills,
      exp,
    };
  }, [resume]);

  if (!isOpen) return null;

  async function callCoverLetterAPI() {
    setLetterFromTemplateEngine(false);
    setLoading(true);
    setLetterBody("");
    try {
      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvData: {
            name: importedSummary.name,
            role: importedSummary.role,
            summary: importedSummary.summary,
            skills: importedSummary.skills,
            experience: importedSummary.exp,
            email: resume?.email || "",
            phone: resume?.phone || "",
            location: resume?.location || "",
          },
          jobTitle: jobTitle.trim(),
          companyName: companyName.trim(),
          date: getTodayDateLabel(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Cover letter generation failed.");

      setLetterBody(String(data?.coverLetterBody || "").trim());
    } catch (e) {
      setError(e.message || "Cover letter generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    const formData = {
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      region: getCoverLetterPricingMarket(),
      selfDescription: describeYourselfInput,
    };
    if (!formData.jobTitle || !formData.companyName) {
      setError("Job title and company name are required.");
      return;
    }
    setError("");

    const isPaid =
      typeof localStorage !== "undefined" && localStorage.getItem("cvp_cl_full_unlocked") === "1";

    if (!isPaid) {
      const skillsList = String(resume?.skills || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const cvData = {
        fullName: resume?.name || (resume?.email ? resume.email.split("@")[0] : "") || "",
        experience: resume?.experience || [],
        skills: skillsList,
      };
      const result = generateCoverLetterFromTemplate(formData, cvData);
      setLetterFromTemplateEngine(true);
      setLetterBody(result);
      setShowPaywall(true);
      return;
    }

    await callCoverLetterAPI();
  }

  async function handleDownloadPdf() {
    const fullText = letterFromTemplateEngine
      ? `${resume?.name || "Candidate Name"} | ${resume?.email || "email@example.com"} | ${resume?.phone || "Phone"} | ${resume?.location || "Location"}
${getTodayDateLabel()}

${companyName?.trim() || "Company Name"}

${letterBody}`
      : defaultLetterTemplate({
          resume,
          generatedBody: letterBody,
          companyName,
          jobTitle,
        });

    const escaped = String(fullText || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: #fff; }
    .cvp-root { width: 794px; padding: 48px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="cvp-root">${escaped}</div>
</body>
</html>`;

    const res = await fetch(`${window.location.origin}/api/generate-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Server error ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileBase = (resume?.name || "Cover_Letter").replace(/\s+/g, "_");
    a.download = `${fileBase}_Cover_Letter.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const displayLetter = letterBody
    ? letterFromTemplateEngine
      ? `${resume?.name || "Candidate Name"} | ${resume?.email || "email@example.com"} | ${resume?.phone || "Phone"} | ${resume?.location || "Location"}
${getTodayDateLabel()}

${companyName?.trim() || "Company Name"}

${letterBody}`
      : defaultLetterTemplate({ resume, generatedBody: letterBody, companyName, jobTitle })
    : "";

  return (
    <>
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#141414",
          border: "1px solid #2A2A2A",
          borderRadius: 16,
          padding: 16,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 700 }}>Cover Letter Generator</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: "1px solid #2A2A2A", background: "#1C1C1C", color: "#A0A0A0", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Auto-imported from CV</div>
          <div style={{ color: "#A0A0A0", fontSize: 12, lineHeight: 1.5 }}>
            <div><span style={{ color: "#FFFFFF" }}>Name:</span> {importedSummary.name || "—"}</div>
            <div><span style={{ color: "#FFFFFF" }}>Role:</span> {importedSummary.role || "—"}</div>
            <div><span style={{ color: "#FFFFFF" }}>Summary:</span> {importedSummary.summary || "—"}</div>
            <div><span style={{ color: "#FFFFFF" }}>Skills:</span> {importedSummary.skills || "—"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ color: "#A0A0A0", fontSize: 12, display: "block", marginBottom: 6 }}>Job Title (required)</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Banking Associate"
              style={{ width: "100%", boxSizing: "border-box", background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF", borderRadius: 8, padding: "10px 12px", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ color: "#A0A0A0", fontSize: 12, display: "block", marginBottom: 6 }}>Company Name (optional)</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Emirates NBD"
              style={{ width: "100%", boxSizing: "border-box", background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF", borderRadius: 8, padding: "10px 12px", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ color: "#A0A0A0", fontSize: 12, display: "block", marginBottom: 6 }}>About you</label>
            <textarea
              value={describeYourselfInput}
              onChange={(e) => setDescribeYourselfInput(e.target.value)}
              placeholder="Brief background, career change, or how you fit the role"
              rows={4}
              style={{ width: "100%", boxSizing: "border-box", background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF", borderRadius: 8, padding: "10px 12px", outline: "none", resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 8,
            padding: "12px 16px",
            background: "#FFFFFF",
            color: "#000000",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Cover Letter"}
        </button>

        {error ? <div style={{ marginTop: 10, color: "#EF4444", fontSize: 13 }}>{error}</div> : null}

        {displayLetter ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div
              style={{
                background: "#1C1C1C",
                border: "1px solid #2A2A2A",
                borderRadius: 12,
                padding: 14,
                color: "#FFFFFF",
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {displayLetter}
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              style={{
                width: "100%",
                border: "1px solid #2A2A2A",
                borderRadius: 8,
                padding: "11px 16px",
                background: "transparent",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Download PDF
            </button>
          </div>
        ) : null}
      </div>
    </div>
    <UpgradeModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}
