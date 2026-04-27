import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { logEvent } from "../lib/analytics/logEvent";
import ScannerRing, { getBand, withAlpha } from "./ScannerRing";

// JD-nudge sprint: the conversion-hook result page.
//
// Renders when the Edge Function returns mode === "cv_only" — the user
// uploaded a CV but didn't paste a JD. We deliver a CV-health analysis
// up top, then below it a glassmorphism "Unlock your match score" CTA
// card sitting on top of a blurred preview of the locked match output.
//
// OLED-restore sprint:
//   1. ScannerRing (separate component) for the health-score badge
//      with rotating arc + glow pulse + animated count-up.
//   2. Severity glow on structure-issue cards — left border, inset +
//      outer drop-shadow, pulse, badge text-shadow.
//   3. Skill pills bucketed by category (OS / Tools / Hardware /
//      Networking / Security / Soft / default) with gradient bg,
//      border, hover lift, 40 ms stagger entrance.
// All three respect prefers-reduced-motion.

const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  amber: "#D97706",
  amberDim: "rgba(217,119,6,0.12)",
  amberBorder: "rgba(217,119,6,0.35)",
  green: "#1D9E75",
  blue: "#378ADD",
  red: "#F87171",
};

const JD_MIN_CHARS = 50;

// Severity colour map (priority 2). Same OLED language as the ring.
const SEVERITY = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#06b6d4",
};

function severityColor(weight) {
  return SEVERITY[String(weight ?? "").toLowerCase()] ?? T.muted;
}

// Skill-category buckets (priority 3). First-match-wins ordering: more
// specific buckets (security, networking) come before broader ones
// (os_infra) so "Cisco firewall" lands in security, not networking.
const SKILL_CATEGORIES = [
  {
    id: "security",
    name: "Security",
    color: "#f43f5e",
    keywords: [
      "security", "cyber", "penetration", "pentest", "encryption",
      "oauth", "ssl", "tls", "owasp", "kerberos", "iam", "siem",
      "firewall", "ids", "ips", "soc", "vulnerability", "compliance",
    ],
  },
  {
    id: "networking",
    name: "Networking",
    color: "#10b981",
    keywords: [
      "tcp/ip", "tcpip", "tcp", "dns", "dhcp", "vpn", "router", "switch",
      "ccna", "ccnp", "cisco", "lan", "wan", "vlan", "wireshark",
      "subnet", "bgp", "ospf", "mpls", "load balanc", "fortinet",
      "palo alto", "juniper", "f5",
    ],
  },
  {
    id: "os_infra",
    name: "OS / infra",
    color: "#6366f1",
    keywords: [
      "linux", "windows server", "ubuntu", "redhat", "centos", "macos",
      "kubernetes", "k8s", "docker", "aws", "azure", "gcp", "terraform",
      "ansible", "jenkins", "ci/cd", "cicd", "devops", "lambda", "ec2",
      "s3", "kafka", "redis", "postgres", "mysql", "mongo", "dynamodb",
      "rabbitmq", "node.js", "java spring", "active directory", "office 365",
      "powershell", "vmware", "hyper-v", "azure ad",
    ],
  },
  {
    id: "hardware",
    name: "Hardware",
    color: "#f97316",
    keywords: [
      "welding", "welder", "plumbing", "plumber", "electrician", "electrical",
      "mechanical", "drill", "lathe", "ndt", "hvac", "refrigeration",
      "asme", "asnt", "crane", "forklift", "rigging", "scaffolding",
      "site supervis", "site engineer", "concrete", "rebar", "civil work",
      "trade test", "iti ", "diploma in", "diesel", "automotive",
    ],
  },
  {
    id: "tools_saas",
    name: "Tools / SaaS",
    color: "#06b6d4",
    keywords: [
      "figma", "slack", "jira", "salesforce", "hubspot", "github", "gitlab",
      "notion", "confluence", "asana", "tableau", "power bi", "powerbi",
      "opera pms", "opera cloud", "sap fico", "sap mm", "sap sd", "tally",
      "quickbooks", "zoho", "servicenow", "zendesk", "freshdesk", "trello",
    ],
  },
  {
    id: "soft",
    name: "Soft skills",
    color: "#a855f7",
    keywords: [
      "communication", "leadership", "teamwork", "collaboration",
      "problem-solving", "problem solving", "time management", "negotiation",
      "mentoring", "stakeholder management", "cross-functional",
      "presentation", "public speaking",
    ],
  },
];

const DEFAULT_SKILL_CAT = { id: "default", name: "Default", color: "#64748b" };

function categorizeSkill(skill) {
  const s = String(skill ?? "").toLowerCase();
  if (!s) return DEFAULT_SKILL_CAT;
  for (const cat of SKILL_CATEGORIES) {
    if (cat.keywords.some((k) => s.includes(k))) return cat;
  }
  return DEFAULT_SKILL_CAT;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

export default function CvOnlyResult({ result, onAnalyze, isAnalyzing = false }) {
  const reduce = useReducedMotion();
  const [jdText, setJdText] = useState("");
  const [hasFiredFocused, setHasFiredFocused] = useState(false);
  const [hasFiredPasted, setHasFiredPasted] = useState(false);
  const textareaRef = useRef(null);

  // ── Analytics: cv_only_result_shown on mount ─────────────────────────────
  useEffect(() => {
    logEvent("cv_only_result_shown", {
      cvHealthScore: result?.cvHealthScore ?? null,
      industry: result?.industry ?? null,
      seniority: result?.seniority ?? null,
      hasBilingualHeadline: Boolean(result?.bilingualHeadline?.english),
      topSkillsCount: Array.isArray(result?.topSkills) ? result.topSkills.length : 0,
      structureIssuesCount: Array.isArray(result?.structureIssues) ? result.structureIssues.length : 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFocus = () => {
    if (hasFiredFocused) return;
    setHasFiredFocused(true);
    logEvent("jd_cta_focused", { source: "cv_only_result" });
  };

  const onChange = (e) => {
    const v = e.target.value;
    setJdText(v);
    if (!hasFiredPasted && v.length >= 30) {
      setHasFiredPasted(true);
      logEvent("jd_pasted", { chars: v.length, source: "cv_only_result" });
    }
  };

  const canSubmit = jdText.trim().length >= JD_MIN_CHARS && !isAnalyzing;

  const onSubmit = () => {
    if (!canSubmit) return;
    logEvent("jd_cta_clicked", { chars: jdText.trim().length, source: "cv_only_result" });
    onAnalyze?.(jdText.trim());
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const score = typeof result?.cvHealthScore === "number" ? result.cvHealthScore : 0;
  const band = getBand(score);

  const flagRows = useMemo(() => {
    const flags = result?.atsFlags || {};
    return [
      { key: "hasContactBlock", label: "Contact block detected", positive: !!flags.hasContactBlock },
      { key: "hasTablesOrColumns", label: "Tables / multi-column layout", positive: !flags.hasTablesOrColumns },
      { key: "imageHeavy", label: "Image-heavy / non-text content", positive: !flags.imageHeavy },
      { key: "fontIssues", label: "Parser-friendly fonts", positive: !flags.fontIssues },
    ];
  }, [result?.atsFlags]);

  const styleAnimAttrs = reduce
    ? { initial: false, animate: false }
    : { initial: "hidden", animate: "show", variants: containerVariants };

  return (
    <motion.main
      {...styleAnimAttrs}
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans', 'Outfit', sans-serif",
        lineHeight: 1.6,
        padding: "32px 20px 80px",
      }}
    >
      <style>{`
        @property --cvp-hue {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes cvp-hue-rot { to { --cvp-hue: 360deg; } }
        @keyframes cvp-shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes cvp-pulse-soft {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes cvp-issue-glow-pulse {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.95; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-cta-border, .cvp-shimmer, .cvp-pulse, .cvp-issue-glow {
            animation: none !important;
          }
          .cvp-issue-glow { opacity: 0.6 !important; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: T.muted, marginBottom: 8 }}>
            CV health check
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 8px" }}>
            Your CV in absolute terms
          </h1>
          <p style={{ color: T.muted, margin: "0 0 28px", fontSize: 15 }}>
            We didn't have a job description to score fit against, so this is a parseability + structure read.
            Want a real match score? <span style={{ color: T.amber, fontWeight: 600 }}>Paste a JD below ↓</span>
          </p>
        </motion.div>

        {/* ── CV HEALTH SCORE — OLED scanner ring ─────────────────────── */}
        <motion.section
          variants={itemVariants}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "32px 24px 28px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 28,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <ScannerRing score={score} size={180} reveal={!reduce} />
          <div>
            <div style={{ color: T.muted, fontSize: 14 }}>
              {result?.industry ? `Inferred industry: ${result.industry}` : "Industry not inferred"}
              {result?.seniority ? ` · ${result.seniority.replace("_", " ")}` : ""}
            </div>
            <div style={{ color: T.muted, fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
              Health score is parseability + structure in absolute terms — not fit. Paste a JD below for the real match score.
            </div>
          </div>
        </motion.section>

        {/* ── TOP SKILLS — categorised pills ──────────────────────────── */}
        {Array.isArray(result?.topSkills) && result.topSkills.length > 0 && (
          <motion.section variants={itemVariants} style={sectionStyle}>
            <div style={sectionLabelStyle}>Top skills detected</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.topSkills.map((skill, i) => {
                const cat = categorizeSkill(skill);
                return (
                  <SkillPill
                    key={`${skill}-${i}`}
                    skill={skill}
                    category={cat}
                    index={i}
                    reduce={reduce}
                  />
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ── ATS FLAGS ───────────────────────────────────────────────── */}
        <motion.section variants={itemVariants} style={sectionStyle}>
          <div style={sectionLabelStyle}>ATS-friendliness</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {flagRows.map((row) => (
              <li
                key={row.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  color: row.positive ? T.text : T.amber,
                }}
              >
                {row.positive ? (
                  <CheckCircle size={16} color={T.green} aria-hidden />
                ) : (
                  <AlertTriangle size={16} color={T.amber} aria-hidden />
                )}
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* ── BILINGUAL HEADLINE ──────────────────────────────────────── */}
        {result?.bilingualHeadline?.english && (
          <motion.section variants={itemVariants} style={sectionStyle}>
            <div style={sectionLabelStyle}>Headline you can paste</div>
            <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, fontSize: 15 }}>
              {result.bilingualHeadline.english}
            </div>
            {result.bilingualHeadline.arabic && (
              <div
                dir="rtl"
                lang="ar"
                style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "'Noto Sans Arabic', 'DM Sans', sans-serif" }}
              >
                {result.bilingualHeadline.arabic}
              </div>
            )}
          </motion.section>
        )}

        {/* ── STRUCTURE ISSUES — severity OLED glow ───────────────────── */}
        {Array.isArray(result?.structureIssues) && result.structureIssues.length > 0 && (
          <motion.section variants={itemVariants} style={sectionStyle}>
            <div style={sectionLabelStyle}>Structure issues</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {result.structureIssues.map((issue, i) => (
                <SeverityIssueCard
                  key={i}
                  issue={issue}
                  index={i}
                  reduce={reduce}
                />
              ))}
            </ul>
          </motion.section>
        )}

        {/* ── UNLOCK CTA ──────────────────────────────────────────────── */}
        <motion.section
          variants={itemVariants}
          style={{ marginTop: 32, position: "relative" }}
        >
          <div
            className="cvp-cta-border"
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              padding: 1.5,
              background: `conic-gradient(from var(--cvp-hue, 0deg), ${T.amber}, ${T.green}, ${T.blue}, ${T.amber})`,
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animation: "cvp-hue-rot 8s linear infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              borderRadius: 20,
              background: "rgba(20, 20, 20, 0.62)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              padding: "28px 24px 24px",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", background: T.amberDim, border: `1px solid ${T.amberBorder}`, borderRadius: 999, marginBottom: 14, fontSize: 11, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: T.amber }}>
              <Sparkles size={13} aria-hidden />
              Unlock your match score
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
              See exactly where your CV fits
            </h2>
            <p style={{ color: T.muted, margin: "0 0 18px", fontSize: 14 }}>
              Paste any job description and we'll match your CV against it — strengths, gaps, and a real score in 8 seconds.
            </p>

            <label htmlFor="cvp-jd-cta" style={{ position: "absolute", left: -9999, top: -9999 }}>
              Paste a job description
            </label>
            <textarea
              id="cvp-jd-cta"
              ref={textareaRef}
              value={jdText}
              onChange={onChange}
              onFocus={onFocus}
              onKeyDown={onKeyDown}
              aria-label="Paste a job description here"
              placeholder="Paste a job description here..."
              disabled={isAnalyzing}
              style={{
                width: "100%",
                background: T.elevated,
                border: `1.5px solid ${T.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: T.text,
                resize: "vertical",
                minHeight: 110,
                outline: "none",
                lineHeight: 1.55,
                boxSizing: "border-box",
                transition: "border-color 200ms cubic-bezier(0.4,0,0.2,1)",
              }}
              onFocusCapture={(e) => { e.target.style.borderColor = T.amberBorder; }}
              onBlurCapture={(e) => { e.target.style.borderColor = T.border; }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 12, color: T.muted }}>
              <span>{jdText.length} chars · need ≥ {JD_MIN_CHARS}</span>
              <span style={{ opacity: 0.6 }}>⌘/Ctrl + Enter to submit</span>
            </div>

            <motion.button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              aria-label="Analyze CV against this job description"
              whileTap={reduce ? {} : { scale: 0.97 }}
              transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
              style={{
                marginTop: 14,
                width: "100%",
                background: canSubmit ? T.amber : "rgba(217,119,6,0.35)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "16px 22px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                cursor: canSubmit ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: -0.2,
                boxShadow: canSubmit ? "0 0 0 1px rgba(217,119,6,0.4) inset, 0 0 28px rgba(217,119,6,0.18)" : "none",
                transition: "background 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={(e) => {
                if (!canSubmit) return;
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(217,119,6,0.6) inset, 0 0 36px rgba(217,119,6,0.32)";
              }}
              onMouseLeave={(e) => {
                if (!canSubmit) return;
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(217,119,6,0.4) inset, 0 0 28px rgba(217,119,6,0.18)";
              }}
            >
              {isAnalyzing ? (
                <span className="cvp-pulse" style={{ animation: "cvp-pulse-soft 1.2s ease-in-out infinite" }}>
                  Matching against the JD…
                </span>
              ) : (
                <>
                  <Sparkles size={16} aria-hidden />
                  Analyze match
                </>
              )}
            </motion.button>
          </div>
        </motion.section>

        {/* ── LOCKED PREVIEW ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!isAnalyzing && (
            <motion.section
              key="locked-preview"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={reduce ? false : { opacity: 1, y: 0 }}
              exit={reduce ? false : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
              style={{
                marginTop: 16,
                position: "relative",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              <LockedPreview band={band} />
            </motion.section>
          )}
          {isAnalyzing && (
            <motion.section
              key="shimmer"
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? false : { opacity: 1 }}
              exit={reduce ? false : { opacity: 0 }}
              transition={{ duration: 0.25 }}
              aria-busy="true"
              aria-live="polite"
              style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}
            >
              <ShimmerBar height={42} />
              <ShimmerBar height={120} />
              <ShimmerBar height={140} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}

// ── Severity-glow card (priority 2) ─────────────────────────────────────────
function SeverityIssueCard({ issue, index, reduce }) {
  const color = severityColor(issue?.weight);
  const innerShadow = `inset 4px 0 0 ${withAlpha(color, 0.16)}`;
  const outerShadow = `0 0 12px ${withAlpha(color, 0.45)}`;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={reduce ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reduce ? 0 : index * 0.04 }}
      style={{
        position: "relative",
        background: T.elevated,
        border: `1px solid ${T.border}`,
        borderLeft: `2px solid ${color}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        className="cvp-issue-glow"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 10,
          boxShadow: `${innerShadow}, ${outerShadow}`,
          pointerEvents: "none",
          animation: "cvp-issue-glow-pulse 2.5s ease-in-out infinite",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          fontSize: 11,
          color,
          textShadow: `0 0 6px ${withAlpha(color, 0.55)}`,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: 4,
          position: "relative",
        }}
      >
        {issue?.weight ?? "info"}
      </div>
      <div style={{ fontSize: 14, color: T.text, marginBottom: issue?.evidence ? 4 : 0, position: "relative" }}>
        {issue?.claim}
      </div>
      {issue?.evidence && (
        <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic", position: "relative" }}>
          “{issue.evidence}”
        </div>
      )}
    </motion.li>
  );
}

// ── Skill pill (priority 3) ─────────────────────────────────────────────────
function SkillPill({ skill, category, index, reduce }) {
  const [hovered, setHovered] = useState(false);
  const bg = `linear-gradient(135deg, ${withAlpha(category.color, 0.12)} 0%, ${withAlpha(category.color, 0.04)} 100%)`;
  const border = `1px solid ${withAlpha(category.color, 0.35)}`;
  const text = withAlpha(category.color, 0.95);
  const hoverGlow = `0 0 18px ${withAlpha(category.color, 0.4)}`;

  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={reduce ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: reduce ? 0 : index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={category.name === "Default" ? skill : `${skill} · ${category.name}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 13px",
        background: bg,
        border,
        borderRadius: 999,
        fontSize: 13,
        color: text,
        fontWeight: 600,
        cursor: "default",
        boxShadow: hovered && !reduce ? hoverGlow : "none",
        transition: "box-shadow 200ms cubic-bezier(0.4,0,0.2,1), transform 200ms cubic-bezier(0.4,0,0.2,1)",
        transform: hovered && !reduce ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {skill}
    </motion.span>
  );
}

// ── Locked preview ──────────────────────────────────────────────────────────
function LockedPreview({ band }) {
  const accent = band?.hex ?? T.amber;
  return (
    <div
      style={{
        position: "relative",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "20px 22px",
        filter: "blur(2.5px) saturate(0.5)",
        opacity: 0.65,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.elevated, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: accent, fontSize: 24, fontWeight: 800 }}>•••</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Match score</div>
          <div style={{ fontSize: 13, color: T.muted }}>0–100 against your target JD</div>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>Top missing skills</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ ...chipStyle, opacity: 0.5 }}>•••••••••••</span>
          <span style={{ ...chipStyle, opacity: 0.5 }}>••••••••</span>
          <span style={{ ...chipStyle, opacity: 0.5 }}>•••••••••</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>Why you fit</div>
        <div style={{ background: T.elevated, borderRadius: 8, height: 14, marginBottom: 6 }} />
        <div style={{ background: T.elevated, borderRadius: 8, height: 14, width: "80%", marginBottom: 6 }} />
        <div style={{ background: T.elevated, borderRadius: 8, height: 14, width: "65%" }} />
      </div>
      <div
        aria-hidden="false"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          background: "rgba(20,20,20,0.85)",
          backdropFilter: "blur(6px)",
          border: `1px solid ${T.border}`,
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: T.muted,
          filter: "blur(0)",
        }}
      >
        <Lock size={11} aria-hidden />
        Locked
      </div>
    </div>
  );
}

function ShimmerBar({ height = 80 }) {
  return (
    <div
      style={{
        position: "relative",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        height,
        overflow: "hidden",
      }}
    >
      <div
        className="cvp-shimmer"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)`,
          animation: "cvp-shimmer-sweep 1.4s linear infinite",
        }}
      />
    </div>
  );
}

const sectionStyle = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  padding: "20px 22px",
  marginBottom: 16,
};

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: T.muted,
  marginBottom: 12,
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  background: T.elevated,
  border: `1px solid ${T.border}`,
  borderRadius: 999,
  fontSize: 13,
  color: T.text,
  fontWeight: 500,
};
