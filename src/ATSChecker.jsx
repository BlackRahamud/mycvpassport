import { useState, useEffect } from "react";

// ─── Stop Words ───────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","being","have","has",
  "had","do","does","did","will","would","could","should","may","might",
  "that","this","these","those","it","its","we","you","your","our","their",
  "they","he","she","as","if","then","than","so","up","out","about","into",
  "through","during","including","until","against","among","throughout","within",
  "also","very","just","more","most","some","such","no","not","only","same",
  "other","each","few","many","how","all","both","between","i","me","my"
]);

// ─── Expected Resume Sections ─────────────────────────────────────────────────
const EXPECTED_SECTIONS = [
  { key: "experience", labels: ["experience", "work experience", "employment", "career history", "professional experience"] },
  { key: "education",  labels: ["education", "academic background", "qualifications", "academic qualifications"] },
  { key: "skills",     labels: ["skills", "key skills", "technical skills", "core competencies", "competencies"] },
  { key: "summary",    labels: ["summary", "profile", "objective", "professional summary", "career objective", "about me"] },
  { key: "certifications", labels: ["certification", "certifications", "courses", "training", "professional development"] },
];

// ─── Formatting Red Flags ─────────────────────────────────────────────────────
const FORMATTING_FLAGS = [
  { id: "table",    pattern: /\|.*\||\t.*\t/,               msg: "Tables detected — some ATS systems cannot parse table content." },
  { id: "image",    pattern: /\[image\]|\[photo\]|<img/i,   msg: "Image placeholders detected — ATS cannot read images." },
  { id: "header",   pattern: /header|footer/i,              msg: "Header/footer content may be skipped by ATS parsers." },
  { id: "special",  pattern: /[●◆■▶►✦✧★☆]/,               msg: "Special bullet symbols detected — use plain hyphens or asterisks." },
  { id: "columns",  pattern: /(.{1,40}\s{5,}.{1,40}){3,}/,  msg: "Multi-column layout detected — ATS reads left to right only." },
];

// ─── Load Mammoth (DOCX parser) via CDN ───────────────────────────────────────
function loadMammoth() {
  return new Promise((resolve) => {
    if (window.mammoth) { resolve(window.mammoth); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.onload = () => resolve(window.mammoth);
    document.head.appendChild(script);
  });
}

// ─── Text Extractors ──────────────────────────────────────────────────────────
async function extractFromPDF(file) {
  if (!window.pdfjsLib) throw new Error("PDF.js not loaded.");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async function () {
      try {
        const pdf = await window.pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // eslint-disable-next-line no-loop-func
          content.items.forEach((item) => { text += item.str + " "; });
        }
        resolve(text);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
  });
}

async function extractFromDOCX(file) {
  const mammoth = await loadMammoth();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async function () {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: this.result });
        resolve(result.value);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
  });
}

function extractFromTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

async function extractText(file) {
  const type = file.type;
  const name = file.name.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf"))
    return extractFromPDF(file);
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx"))
    return extractFromDOCX(file);
  if (type === "text/plain" || name.endsWith(".txt"))
    return extractFromTXT(file);
  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}

// ─── Analysis Functions ───────────────────────────────────────────────────────
function getKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function analyzeKeywords(resumeText, jobDesc) {
  const resumeSet = new Set(getKeywords(resumeText));
  const jobWords  = [...new Set(getKeywords(jobDesc))];
  if (jobWords.length === 0) return { score: 0, matched: [], missing: [], total: 0 };
  const matched = jobWords.filter((w) => resumeSet.has(w));
  const missing = jobWords.filter((w) => !resumeSet.has(w));
  const score = Math.round((matched.length / jobWords.length) * 50); // max 50
  return { score, matched, missing: missing.slice(0, 30), total: jobWords.length };
}

function analyzeSections(resumeText) {
  const lower = resumeText.toLowerCase();
  const found = [];
  const missing = [];
  EXPECTED_SECTIONS.forEach(({ key, labels }) => {
    const present = labels.some((label) => lower.includes(label));
    if (present) found.push(key);
    else missing.push(key);
  });
  // Score: each section = 6 points, max 30
  const score = Math.min(found.length * 6, 30);
  return { score, found, missing };
}

function analyzeFormatting(resumeText) {
  const warnings = [];
  FORMATTING_FLAGS.forEach(({ id, pattern, msg }) => {
    if (pattern.test(resumeText)) warnings.push({ id, msg });
  });
  // Score: start 20, deduct 4 per warning
  const score = Math.max(20 - warnings.length * 4, 0);
  return { score, warnings };
}

// ─── Score Label ──────────────────────────────────────────────────────────────
function getScoreLabel(score) {
  if (score >= 80) return { label: "Excellent — Strong ATS match", color: "#16a34a" };
  if (score >= 60) return { label: "Good — Minor improvements needed", color: "#ca8a04" };
  if (score >= 40) return { label: "Fair — Add missing keywords & sections", color: "#ea580c" };
  return { label: "Low — Significant improvements needed", color: "#dc2626" };
}

// ─── ScoreBar Component ───────────────────────────────────────────────────────
function ScoreBar({ label, score, max, color }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        <span>{label}</span>
        <span>{score} / {max}</span>
      </div>
      <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8 }}>
        <div style={{ width: `${pct}%`, background: color, borderRadius: 99, height: 8, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ATSChecker() {
  const [jobDesc,      setJobDesc]      = useState("");
  const [resumeFile,   setResumeFile]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [result,       setResult]       = useState(null);
  const [isDark,       setIsDark]       = useState(false);
  const [aiFixes,      setAiFixes]      = useState(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState("");

  // detect dark mode from parent app
  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
    const obs = new MutationObserver(() => setIsDark(html.classList.contains("dark")));
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const bg   = isDark ? "#0a0a0a" : "#ffffff";
  const card = isDark ? "#111111" : "#f9fafb";
  const border = isDark ? "#222" : "#e5e7eb";
  const text = isDark ? "#f1f5f9" : "#111827";
  const sub  = isDark ? "#94a3b8" : "#6b7280";

  async function handleCheck() {
    if (!resumeFile) { setError("Please upload your resume (PDF, DOCX, or TXT)."); return; }
    if (!jobDesc.trim()) { setError("Please paste a job description."); return; }
    setError("");
    setLoading(true);
    setResult(null);
    setAiFixes(null);
    setAiError("");
    try {
      const resumeText = await extractText(resumeFile);
      const kw   = analyzeKeywords(resumeText, jobDesc);
      const sec  = analyzeSections(resumeText);
      const fmt  = analyzeFormatting(resumeText);
      const total = kw.score + sec.score + fmt.score;
      setResult({ kw, sec, fmt, total, resumeText });
    } catch (err) {
      setError(err.message || "Failed to read file. Please try again.");
    }
    setLoading(false);
  }

  const scoreInfo = result ? getScoreLabel(result.total) : null;

  async function generateAIFixes() {
    if (!result) return;
    setAiLoading(true);
    setAiError("");
    setAiFixes(null);

    const missingKeywords = result.kw.missing.slice(0, 8);
    const lines = result.resumeText.split(/\n/).map(l => l.trim()).filter(Boolean);
    const weakBullets = lines.filter(l =>
      /^[-•*]|^\d+\./.test(l) &&
      /^(handled|did|worked|helped|assisted|supported|was responsible|responsible for|managed|performed)/i.test(l.replace(/^[-•*\d.]\s*/, ""))
    ).slice(0, 4);

    if (weakBullets.length === 0 && missingKeywords.length === 0) {
      setAiError("No obvious weak bullets or missing keywords to fix. Your resume looks solid!");
      setAiLoading(false);
      return;
    }

    const prompt = `You are an expert CV coach specialising in UAE banking and finance job applications.

Resume text:
${result.resumeText.slice(0, 3000)}

Issues found:
- Missing keywords from job description: ${missingKeywords.join(", ")}
- Weak bullet points detected:
${weakBullets.length > 0 ? weakBullets.map((b, i) => `  ${i + 1}. "${b}"`).join("\n") : "  (none detected — suggest 2 general improvements instead)"}

Task: For each weak bullet point (or 2 general improvements if none detected), provide ONE rewritten version that:
1. Starts with a strong past-tense action verb (Managed, Resolved, Facilitated, Processed, etc.)
2. Naturally includes 1-2 of the missing keywords where relevant
3. Adds a quantifiable or specific result where possible
4. Is suitable for a UAE banking Customer Service / Relationship Officer application

Respond ONLY with a valid JSON array. No markdown, no backticks, no preamble:
[{"original":"exact original text or general area","fixed":"rewritten bullet","keywords_added":["keyword1"]}]`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const raw = data.content[0].text.replace(/```json|```/g, "").trim();
      setAiFixes(JSON.parse(raw));
    } catch {
      setAiError("Something went wrong. Please try again.");
    }
    setAiLoading(false);
  }

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 16px", fontFamily: "'Inter', sans-serif", color: text, background: bg, minHeight: "100%" }}>

      {/* Header */}
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>ATS Resume Optimizer</h2>
      <p style={{ color: sub, fontSize: 14, marginBottom: 28 }}>
        Upload your resume + paste a job description. Get a full ATS score with keyword match, section check, and formatting analysis.
      </p>

      {/* Upload */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: text }}>
          Upload Resume
          <span style={{ fontWeight: 400, color: sub, marginLeft: 6 }}>PDF · DOCX · TXT</span>
        </label>
        <div style={{
          border: `2px dashed ${border}`, borderRadius: 10, padding: "20px 16px",
          textAlign: "center", cursor: "pointer", background: card,
          transition: "border-color 0.2s"
        }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setResumeFile(e.dataTransfer.files[0]); }}
        >
          {resumeFile ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{resumeFile.name}</div>
                <div style={{ color: sub, fontSize: 12 }}>{(resumeFile.size / 1024).toFixed(1)} KB</div>
              </div>
              <button onClick={() => setResumeFile(null)}
                style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", color: sub, fontSize: 18 }}>×</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>☁️</div>
              <div style={{ fontSize: 13, color: sub }}>Drag & drop or click to browse</div>
              <input type="file" accept=".pdf,.docx,.txt"
                onChange={(e) => setResumeFile(e.target.files[0])}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
              <label htmlFor="ats-file-input"
                style={{ display: "inline-block", marginTop: 10, padding: "7px 18px", background: isDark ? "#222" : "#111", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Browse File
              </label>
              <input id="ats-file-input" type="file" accept=".pdf,.docx,.txt"
                onChange={(e) => setResumeFile(e.target.files[0])}
                style={{ display: "none" }} />
            </>
          )}
        </div>
      </div>

      {/* Job Description */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: text }}>
          Paste Job Description
        </label>
        <textarea
          rows={6} value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          placeholder="Paste the full job description here..."
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 8,
            border: `1px solid ${border}`, fontSize: 13, lineHeight: 1.6,
            background: card, color: text, resize: "vertical",
            outline: "none", boxSizing: "border-box"
          }}
        />
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button onClick={handleCheck} disabled={loading} style={{
        background: "#111", color: "#fff", padding: "11px 28px",
        borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
        marginBottom: 36, width: "100%"
      }}>
        {loading ? "Analyzing your resume..." : "Run ATS Check"}
      </button>

      {/* Results */}
      {result && (
        <div>
          {/* Total Score */}
          <div style={{
            background: card, border: `1px solid ${border}`, borderRadius: 12,
            padding: "24px 24px", marginBottom: 20, textAlign: "center"
          }}>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: scoreInfo.color }}>
              {result.total}
            </div>
            <div style={{ fontSize: 13, color: sub, marginTop: 4 }}>out of 100</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10, color: scoreInfo.color }}>
              {scoreInfo.label}
            </div>
            <div style={{ marginTop: 20 }}>
              <ScoreBar label="Keyword Match" score={result.kw.score}  max={50} color="#2563eb" />
              <ScoreBar label="Section Check" score={result.sec.score} max={30} color="#7c3aed" />
              <ScoreBar label="Formatting"    score={result.fmt.score} max={20} color="#059669" />
            </div>
          </div>

          {/* Keyword Match */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, marginTop: 0 }}>
              🔍 Keyword Match — {result.kw.score} / 50
            </h3>
            <p style={{ color: sub, fontSize: 13, marginBottom: 14 }}>
              {result.kw.matched.length} of {result.kw.total} job keywords found in your resume.
            </p>
            {result.kw.matched.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>✅ MATCHED ({result.kw.matched.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.kw.matched.map((w) => (
                    <span key={w} style={{ background: isDark ? "#052e16" : "#dcfce7", color: "#16a34a", padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{w}</span>
                  ))}
                </div>
              </div>
            )}
            {result.kw.missing.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>❌ MISSING — ADD THESE ({result.kw.missing.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.kw.missing.map((w) => (
                    <span key={w} style={{ background: isDark ? "#450a0a" : "#fee2e2", color: "#dc2626", padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section Check */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, marginTop: 0 }}>
              📋 Section Check — {result.sec.score} / 30
            </h3>
            <p style={{ color: sub, fontSize: 13, marginBottom: 14 }}>ATS systems scan for standard resume sections.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EXPECTED_SECTIONS.map(({ key }) => {
                const found = result.sec.found.includes(key);
                return (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: found ? (isDark ? "#052e16" : "#dcfce7") : (isDark ? "#1a0505" : "#fee2e2"),
                    color: found ? "#16a34a" : "#dc2626"
                  }}>
                    {found ? "✅" : "❌"} {key.charAt(0).toUpperCase() + key.slice(1)}
                  </div>
                );
              })}
            </div>
            {result.sec.missing.length > 0 && (
              <p style={{ marginTop: 12, fontSize: 13, color: sub }}>
                ⚠️ Add these sections: <strong>{result.sec.missing.join(", ")}</strong>
              </p>
            )}
          </div>

          {/* Formatting Check */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, marginTop: 0 }}>
              🎨 Formatting Check — {result.fmt.score} / 20
            </h3>
            <p style={{ color: sub, fontSize: 13, marginBottom: 14 }}>Formatting issues that can confuse ATS parsers.</p>
            {result.fmt.warnings.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontWeight: 700, fontSize: 14 }}>
                ✅ No formatting issues detected — great job!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.fmt.warnings.map(({ id, msg }) => (
                  <div key={id} style={{
                    background: isDark ? "#1c1000" : "#fffbeb",
                    border: `1px solid ${isDark ? "#713f12" : "#fde68a"}`,
                    borderRadius: 8, padding: "10px 14px", fontSize: 13, color: isDark ? "#fcd34d" : "#92400e"
                  }}>
                    ⚠️ {msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Fix Suggestions — Pro Feature */}
          <div style={{
            background: isDark ? "#0f0f0f" : "#111", color: "#fff",
            borderRadius: 12, padding: "20px 24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#facc15", color: "#111" }}>PRO</span>
              <div style={{ fontWeight: 800, fontSize: 16 }}>AI Fix Suggestions</div>
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              Claude rewrites your weak bullet points and adds missing keywords — tailored to your uploaded resume and job description.
            </div>

            {!aiFixes && (
              <button
                onClick={generateAIFixes}
                disabled={aiLoading}
                style={{
                  background: aiLoading ? "#374151" : "#fff", color: "#111",
                  padding: "10px 24px", borderRadius: 8, fontWeight: 700,
                  fontSize: 14, border: "none", cursor: aiLoading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8, opacity: aiLoading ? 0.8 : 1
                }}
              >
                {aiLoading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ animation: "spin 0.7s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span style={{ color: "#9ca3af" }}>Claude is rewriting...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2">
                      <path d="M12 3l1.88 5.82L20 9l-4.56 3.5L17 18l-5-3-5 3 1.56-5.5L4 9l6.12-.18z"/>
                    </svg>
                    Generate AI fixes
                  </>
                )}
              </button>
            )}

            {aiError && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#fca5a5" }}>{aiError}</div>
            )}

            {aiFixes && (
              <div style={{ marginTop: 16 }}>
                {aiFixes.map((fix, i) => (
                  <div key={i} style={{
                    background: "#1a1a1a", borderRadius: 10, padding: "14px 16px", marginBottom: 12,
                    border: "1px solid #2a2a2a"
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                      Bullet {i + 1}
                    </div>
                    <div style={{
                      fontSize: 13, color: "#9ca3af", padding: "8px 12px",
                      background: "#111", borderRadius: 6, marginBottom: 10,
                      borderLeft: "3px solid #dc2626"
                    }}>
                      {fix.original}
                    </div>
                    <div style={{
                      fontSize: 13, color: "#f1f5f9", padding: "8px 12px",
                      background: "#111", borderRadius: 6,
                      borderLeft: "3px solid #16a34a"
                    }}>
                      {fix.fixed}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {(fix.keywords_added || []).map(k => (
                        <span key={k} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#1e3a5f", color: "#93c5fd" }}>{k}</span>
                      ))}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(fix.fixed);
                        }}
                        style={{
                          marginLeft: "auto", fontSize: 12, color: "#6b7280",
                          background: "none", border: "1px solid #374151",
                          borderRadius: 6, padding: "3px 10px", cursor: "pointer"
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {aiFixes.length} bullets rewritten · keywords added: {[...new Set(aiFixes.flatMap(f => f.keywords_added || []))].join(", ")}
                  </div>
                  <button
                    onClick={() => { setAiFixes(null); setAiError(""); }}
                    style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Run again
                  </button>
                </div>
              </div>
            )}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
