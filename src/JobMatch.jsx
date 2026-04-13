import { useMemo, useState, useEffect, useCallback } from "react";
import { hasFeatureAccess, getPaymentLink } from "./utils/paywall";
import { useGeoContent } from "./hooks/useGeoContent";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: "Technical Skills", chips }];
}

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
  const techGroups = technicalSkillsGroupsForTemplate(resume?.technicalSkills);
  const technicalSkillsText = techGroups.map((g) => g.chips.join(" ")).join(" ");
  const exp = Array.isArray(resume?.experience)
    ? resume.experience.map((e) => [e?.role, e?.company, e?.location, e?.points, e?.period].filter(Boolean).join(" ")).join(" ")
    : "";
  const edu = Array.isArray(resume?.education)
    ? resume.education.map((e) => [e?.degree, e?.school, e?.fieldOfStudy, e?.year].filter(Boolean).join(" ")).join(" ")
    : "";
  const certs = Array.isArray(resume?.certifications)
    ? resume.certifications.map((c) => [c?.name, c?.issuer, c?.year].filter(Boolean).join(" ")).join(" ")
    : String(resume?.certifications || "");

  return normalizeText(
    [resume?.name, resume?.title, resume?.summary, resume?.skills, technicalSkillsText, resume?.languages, resume?.projects, resume?.volunteerWork, resume?.publications, exp, edu, certs]
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

/** Count unique words >4 chars in text */
function countKeywords(text) {
  if (!text || !text.trim()) return 0;
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return new Set(words).size;
}

/* ─── Sub-components ─── */

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
          style={{ transition: `stroke-dashoffset 300ms ${EASE}` }}
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

function BlurredScore() {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - 0.62 * circumference;

  return (
    <div style={{ position: "relative", width: 150, height: 150, filter: "blur(8px)" }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={radius} fill="transparent" stroke="#2A2A2A" strokeWidth="12" />
        <circle cx="75" cy="75" r={radius} fill="transparent" stroke="#D97706" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 75 75)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 38, lineHeight: 1 }}>??</div>
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
      {good ? "\u2713" : "\u2717"} {text}
    </span>
  );
}

function BlurredChip({ color }) {
  const w = 60 + Math.random() * 50;
  return (
    <span
      style={{
        display: "inline-block",
        width: w,
        height: 32,
        borderRadius: 999,
        background: color === "amber" ? "rgba(217, 119, 6, 0.18)" : "rgba(255,255,255,0.08)",
        border: `1px solid ${color === "amber" ? "rgba(217,119,6,0.3)" : "rgba(255,255,255,0.12)"}`,
        filter: "blur(6px)",
      }}
    />
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

/* ─── Geo copy maps ─── */

function getGeoSubheading(isIndia) {
  if (isIndia) return "10,000 applicants. One shortlist. Be on it.";
  return "UAE recruiters scan CVs in 6 seconds. See exactly which keywords you\u2019re missing.";
}

function getGeoSubheadingGlobal() {
  return "Global companies use ATS to filter hundreds of CVs in seconds. Make yours match.";
}

function getGeoPaywallHeadline(isIndia) {
  if (isIndia) return "Stop guessing. See the exact keywords that get you shortlisted.";
  return "See exactly which keywords Dubai recruiters are scanning for";
}

function getGeoPaywallHeadlineGlobal() {
  return "Global companies use ATS to filter CVs in seconds. See exactly where you stand.";
}

function getGeoCta(isIndia) {
  if (isIndia) return "Unlock Job Match \u2014 \u20B9199/month";
  return "Unlock Job Match \u2014 AED 29/month";
}

/* ─── Lock icon SVG ─── */
function LockIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* ─── Crosshair icon SVG ─── */
function CrosshairIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}

/* ─── Main component ─── */

export default function JobMatch({ resume, selectedTemplate, isPro = false, features = null, onJobDescriptionChange }) {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  const templateKey = useMemo(() => detectTemplateKey(selectedTemplate), [selectedTemplate]);
  const geo = useGeoContent();
  const isIndia = geo?.isIndia ?? false;

  const keywordCount = useMemo(() => countKeywords(jobDescription), [jobDescription]);

  const hasAccess = useMemo(
    () => hasFeatureAccess({ is_pro: isPro, features }, "activeHunter"),
    [isPro, features]
  );

  // Determine subheading based on geo
  const subheading = useMemo(() => {
    if (isIndia) return getGeoSubheading(true);
    if (geo?.currency === "AED") return getGeoSubheading(false);
    return getGeoSubheadingGlobal();
  }, [isIndia, geo?.currency]);

  useEffect(() => {
    onJobDescriptionChange?.(jobDescription.trim().length >= 40);
  }, [jobDescription, onJobDescriptionChange]);

  const handleAnalyse = useCallback(async () => {
    if (!hasAccess) {
      setShowPaywall(true);
      setPaywallDismissed(false);
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
    setShowPaywall(false);

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
        : 0;

      setResult({
        score: finalScore,
        matched: matched.slice(0, 40),
        missing: uniqueMissing.slice(0, 40),
        suggestion: suggestion || "Add 2\u20133 high-priority missing terms naturally in your summary and latest role bullets.",
      });
    } catch (e) {
      setError(e.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [hasAccess, jobDescription, templateKey, resume]);

  const handleUpgradeClick = useCallback(() => {
    window.open(getPaymentLink("jobMatch"), "_blank");
  }, []);

  /* ── Render ── */

  const showEmptyState = !loading && !result && !showPaywall;

  return (
    <div className="cvp-jobmatch-root" style={{ display: "grid", gap: 16, padding: 12 }}>

      {/* ── Hero section ── */}
      <div style={{ padding: "8px 0 0" }}>
        <h2 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "clamp(22px, 5vw, 28px)", lineHeight: 1.2, margin: 0 }}>
          Job Match
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(13px, 3.5vw, 15px)", lineHeight: 1.5, margin: "8px 0 0" }}>
          {subheading}
        </p>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 1.5, margin: "6px 0 0" }}>
          Engineered for ATS systems used by global recruiters across the Gulf, Europe and South America.
        </p>
      </div>

      {/* ── Textarea + counter + button ── */}
      <div style={{ display: "grid", gap: 0 }}>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          rows={7}
          style={{
            width: "100%",
            minHeight: 160,
            background: "#141414",
            color: "#FFFFFF",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: 16,
            fontSize: 15,
            resize: "vertical",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            boxSizing: "border-box",
            outline: "none",
            transition: `border-color 200ms ${EASE}`,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.08)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.boxShadow = "none"; }}
        />
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, padding: "8px 4px 0", minHeight: 20 }}>
          {keywordCount > 0
            ? `${keywordCount} keywords detected`
            : "Paste a job description to begin"}
        </div>
        <button
          type="button"
          onClick={handleAnalyse}
          disabled={loading}
          style={{
            marginTop: 12,
            border: "none",
            borderRadius: 12,
            padding: "0 16px",
            height: 54,
            background: "#D97706",
            color: "#000000",
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
            opacity: loading ? 0.7 : 1,
            transition: `opacity 200ms ${EASE}`,
          }}
        >
          {loading ? "Analysing..." : "Analyse Match"}
        </button>
        {error ? <div style={{ marginTop: 10, color: "#EF4444", fontSize: 13 }}>{error}</div> : null}
      </div>

      {/* ── Empty state ── */}
      {showEmptyState && !paywallDismissed ? (
        <div style={{
          background: "#141414",
          border: "1px solid #2A2A2A",
          borderRadius: 16,
          padding: "40px 24px",
          textAlign: "center",
          display: "grid",
          gap: 16,
          placeItems: "center",
        }}>
          <CrosshairIcon />
          <p style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 14,
            lineHeight: 1.7,
            margin: 0,
            maxWidth: 320,
          }}>
            When HSBC, Deloitte or any global firm posts in Dubai &mdash;{" "}
            hundreds apply within hours.<br />
            Paste their job description above.<br />
            See exactly where your CV stands.
          </p>
        </div>
      ) : null}

      {/* ── Blurred preview paywall ── */}
      {showPaywall && !hasAccess ? (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Blurred fake results */}
          <div style={{
            background: "#141414",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: 24,
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
              <BlurredScore />
              <div style={{ flex: "1 1 180px", display: "grid", gap: 8, filter: "blur(6px)" }}>
                <div style={{ height: 14, width: "50%", background: "rgba(255,255,255,0.1)", borderRadius: 6 }} />
                <div style={{ height: 10, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 6 }} />
                <div style={{ height: 10, width: "80%", background: "rgba(255,255,255,0.06)", borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <BlurredChip color="amber" />
              <BlurredChip color="amber" />
              <BlurredChip color="amber" />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <BlurredChip color="grey" />
              <BlurredChip color="grey" />
              <BlurredChip color="grey" />
            </div>
            {/* Lock overlay */}
            <div style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(10,10,10,0.45)",
              borderRadius: 16,
            }}>
              <LockIcon size={40} />
            </div>
          </div>

          {/* Upgrade CTA card */}
          <div style={{
            background: "#141414",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: 24,
            display: "grid",
            gap: 16,
          }}>
            <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 17, margin: 0, lineHeight: 1.3 }}>
              {isIndia
                ? getGeoPaywallHeadline(true)
                : geo?.currency === "AED"
                  ? getGeoPaywallHeadline(false)
                  : getGeoPaywallHeadlineGlobal()}
            </h3>
            <ul style={{ margin: 0, padding: "0 0 0 20px", display: "grid", gap: 8 }}>
              <li style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.5 }}>
                See your exact match score against any job description
              </li>
              <li style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.5 }}>
                Identify missing keywords before you apply
              </li>
              <li style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.5 }}>
                One improvement tip written by AI &mdash; specific to your CV
              </li>
            </ul>
            <button
              type="button"
              onClick={handleUpgradeClick}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "0 16px",
                height: 54,
                background: "#D97706",
                color: "#000000",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {getGeoCta(isIndia)}
            </button>
            <button
              type="button"
              onClick={() => { setShowPaywall(false); setPaywallDismissed(true); }}
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.35)",
                fontSize: 13,
                cursor: "pointer",
                padding: "4px 0",
                justifySelf: "center",
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{
            background: "#141414",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            alignItems: "center",
            justifyContent: "space-between",
          }}>
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

      {/* ── Results ── */}
      {result ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{
            background: "#141414",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            alignItems: "center",
            justifyContent: "space-between",
          }}>
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
        .cvp-jobmatch-root textarea::placeholder {
          color: rgba(255,255,255,0.28) !important;
          font-style: italic;
          font-family: Georgia, serif;
        }
      `}</style>
    </div>
  );
}
