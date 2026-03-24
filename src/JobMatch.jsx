import { useMemo, useState } from "react";
import UpgradeModal from "./UpgradeModal";

const BANK_FILE = "/cvpassport_keywords.json";

const TEMPLATE_KEY_MAP = {
  banking: "banking_finance",
  finance: "banking_finance",
  "tech-it": "tech_it_pro",
  "gulf-exec": "gulf_executive",
  hospitality: "hospitality",
  "compact-pro": "compact_pro",
  creative: "creative_sidebar",
  "ats-intl": "ats_international",
};

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordToList(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (raw && typeof raw === "object") {
    const values = Object.values(raw).flatMap((v) => (Array.isArray(v) ? v : []));
    return values.map((x) => String(x).trim()).filter(Boolean);
  }
  return [];
}

function detectTemplateKey(template) {
  if (!template) return "banking_finance";
  const layout = String(template.layout || "").toLowerCase();
  const mapped = TEMPLATE_KEY_MAP[layout];
  if (mapped) return mapped;
  const name = String(template.name || "").toLowerCase();
  if (name.includes("tech") && name.includes("pro")) return "tech_it_pro";
  if (name.includes("tech")) return "tech_it";
  if (name.includes("bank") || name.includes("finance")) return "banking_finance";
  return "banking_finance";
}

function buildCvText(resume) {
  const exp = Array.isArray(resume?.experience)
    ? resume.experience
        .map((e) => [e?.role, e?.company, e?.location, e?.points, e?.period].filter(Boolean).join(" "))
        .join(" ")
    : "";
  const edu = Array.isArray(resume?.education)
    ? resume.education
        .map((e) => [e?.degree, e?.school, e?.fieldOfStudy, e?.year].filter(Boolean).join(" "))
        .join(" ")
    : "";
  const certs = Array.isArray(resume?.certifications)
    ? resume.certifications.map((c) => [c?.name, c?.issuer, c?.year].filter(Boolean).join(" ")).join(" ")
    : String(resume?.certifications || "");

  return normalizeText(
    [
      resume?.name,
      resume?.title,
      resume?.summary,
      resume?.skills,
      resume?.technicalSkills,
      resume?.languages,
      resume?.projects,
      resume?.volunteerWork,
      resume?.publications,
      exp,
      edu,
      certs,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildCvSummary(resume) {
  const summary =
    resume?.summary?.trim() ||
    `${resume?.title || "Professional"} with experience in ${resume?.skills || "multiple domains"}.`;
  return `${resume?.name || "Candidate"} | ${resume?.title || "Role not set"} | ${summary}`.slice(0, 800);
}

function CircularScore({ score }) {
  const safe = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 150, height: 150 }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={radius} fill="transparent" stroke="#2A2A2A" strokeWidth="12" />
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="transparent"
          stroke="#22C55E"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 75 75)"
          style={{ transition: "stroke-dashoffset 300ms ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 38, lineHeight: 1 }}>{safe}</div>
          <div style={{ color: "#A0A0A0", fontSize: 12, marginTop: 4 }}>% Match</div>
        </div>
      </div>
    </div>
  );
}

function Chip({ text, good }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${good ? "#22C55E" : "#EF4444"}`,
        background: good ? "rgba(34, 197, 94, 0.14)" : "rgba(239, 68, 68, 0.14)",
        color: good ? "#22C55E" : "#EF4444",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {good ? "✅" : "❌"} {text}
    </span>
  );
}

function SkeletonBlock({ height, width = "100%", radius = 10 }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background: "linear-gradient(90deg, #1C1C1C 25%, #232323 37%, #1C1C1C 63%)",
        backgroundSize: "400% 100%",
        animation: "jobmatch-skeleton 1.4s ease infinite",
      }}
    />
  );
}

export default function JobMatch({ resume, selectedTemplate, isPro = false }) {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const templateKey = useMemo(() => detectTemplateKey(selectedTemplate), [selectedTemplate]);

  async function handleAnalyse() {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    const jd = normalizeText(jobDescription);
    if (!jd) {
      setError("Paste a job description to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(BANK_FILE, { cache: "no-store" });
      if (!response.ok) throw new Error("Keyword bank file not found.");
      const bank = await response.json();
      const templateBank = keywordToList(bank?.[templateKey]);
      if (!templateBank.length) throw new Error(`No keyword bank found for ${templateKey}.`);

      const cvText = buildCvText(resume);
      const relevant = templateBank.filter((kw) => jd.includes(normalizeText(kw)));
      const pool = relevant.length ? relevant : templateBank;

      const matched = pool.filter((kw) => cvText.includes(normalizeText(kw)));
      const missing = pool.filter((kw) => !cvText.includes(normalizeText(kw)));

      const baseScore = pool.length ? Math.round((matched.length / pool.length) * 100) : 0;
      let aiMissing = [];
      let suggestion = "";

      if (missing.length > 0) {
        const aiRes = await fetch("/api/job-match-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unmatchedKeywords: missing,
            jobDescription: jobDescription.trim(),
            cvSummary: buildCvSummary(resume),
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          aiMissing = Array.isArray(aiData?.additionalMissingKeywords)
            ? aiData.additionalMissingKeywords.map((k) => String(k).trim()).filter(Boolean)
            : [];
          suggestion = String(aiData?.suggestion || "").trim();
        }
      }

      const uniqueMissing = Array.from(new Set([...missing, ...aiMissing]));
      const finalScore = pool.length
        ? Math.max(0, Math.min(100, Math.round(((pool.length - uniqueMissing.length) / pool.length) * 100)))
        : baseScore;

      setResult({
        score: finalScore,
        matched: matched.slice(0, 40),
        missing: uniqueMissing.slice(0, 40),
        suggestion: suggestion || "Add 2-3 high-priority missing terms naturally in your summary and latest role bullets.",
      });
    } catch (e) {
      setError(e.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, padding: 12 }}>
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16 }}>
        <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Job Description Match</div>
        <div style={{ color: "#A0A0A0", fontSize: 13, marginBottom: 12 }}>
          Template detected: <span style={{ color: "#FFFFFF" }}>{templateKey}</span>
        </div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          rows={8}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#1C1C1C",
            border: "1px solid #2A2A2A",
            color: "#FFFFFF",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
            resize: "vertical",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleAnalyse}
          disabled={loading}
          style={{
            marginTop: 12,
            border: "none",
            borderRadius: 10,
            padding: "12px 16px",
            background: "#FFFFFF",
            color: "#000000",
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {loading ? "Analysing..." : "Analyse Match"}
        </button>
        {error ? <div style={{ marginTop: 10, color: "#EF4444", fontSize: 13 }}>{error}</div> : null}
        {!isPro ? (
          <div style={{ marginTop: 10, color: "#A0A0A0", fontSize: 13 }}>
            Job Match is a Pro feature. Click Analyse Match to upgrade.
          </div>
        ) : null}
      </div>

      {!loading && !result ? (
        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16 }}>
          <div style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Ready to analyse</div>
          <div style={{ color: "#A0A0A0", fontSize: 13, lineHeight: 1.5 }}>
            Paste a job description and click <span style={{ color: "#FFFFFF" }}>Analyse Match</span> to see your keyword score, matched terms, missing terms, and one improvement tip.
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <SkeletonBlock height={150} width={150} radius={999} />
            <div style={{ flex: "1 1 220px", minWidth: 220, display: "grid", gap: 10 }}>
              <SkeletonBlock height={16} width="45%" radius={6} />
              <SkeletonBlock height={12} width="100%" radius={6} />
              <SkeletonBlock height={12} width="85%" radius={6} />
            </div>
          </div>

          <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, display: "grid", gap: 10 }}>
            <SkeletonBlock height={16} width="38%" radius={6} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SkeletonBlock height={32} width={110} radius={999} />
              <SkeletonBlock height={32} width={95} radius={999} />
              <SkeletonBlock height={32} width={120} radius={999} />
              <SkeletonBlock height={32} width={80} radius={999} />
            </div>
          </div>

          <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, display: "grid", gap: 10 }}>
            <SkeletonBlock height={16} width="38%" radius={6} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SkeletonBlock height={32} width={130} radius={999} />
              <SkeletonBlock height={32} width={100} radius={999} />
              <SkeletonBlock height={32} width={90} radius={999} />
            </div>
          </div>
        </div>
      ) : null}

      {result ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: "#141414",
              border: "1px solid #2A2A2A",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <CircularScore score={result.score} />
            <div style={{ flex: "1 1 220px", minWidth: 220 }}>
              <div style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Improvement Suggestion</div>
              <div style={{ color: "#A0A0A0", fontSize: 13, lineHeight: 1.5 }}>{result.suggestion}</div>
            </div>
          </div>

          <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16 }}>
            <div style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
              Matched Keywords ({result.matched.length})
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {result.matched.length ? result.matched.map((k) => <Chip key={`m-${k}`} text={k} good />) : <span style={{ color: "#A0A0A0", fontSize: 13 }}>No matched keywords yet.</span>}
            </div>
          </div>

          <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16 }}>
            <div style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
              Missing Keywords ({result.missing.length})
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {result.missing.length ? result.missing.map((k) => <Chip key={`x-${k}`} text={k} good={false} />) : <span style={{ color: "#A0A0A0", fontSize: 13 }}>No missing keywords detected.</span>}
            </div>
          </div>
        </div>
      ) : null}
      <style>{`
        @keyframes jobmatch-skeleton {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
}
