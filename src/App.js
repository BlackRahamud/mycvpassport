import { Analytics } from "@vercel/analytics/react";
import HowItWorks from "./HowItWorks";
import { useState, useEffect, useLayoutEffect, useCallback, useRef, memo } from "react";
import { supabase as supabaseImport } from "./supabaseClient";
import ATSChecker from "./ATSChecker";
import TiltedCard from './components/TiltedCard';
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { splitExperiencePointsForPreview, trimCanvasBottomWhitespace } from "./experiencePointsPreview";
import { PreviewGulfExecutive } from "./Template5GulfExecutive";
import { PreviewBankingFinance } from "./Template6BankingFinance";
import { PreviewCompactPro } from "./Template7CompactPro";
import { PreviewCreativeSidebar } from "./Template8CreativeSidebar";
import { PreviewHospitality } from "./Template9Hospitality";
import { PreviewATSInternational } from "./Template10ATSInternational";
import { PreviewTechITPro } from "./Template11TechITPro";
import { PreviewClassic } from "./Template12Classic";
import { PreviewFinance } from "./Template13Finance";
import LandingPage from './LandingPage';
import WalkInPage from './WalkInPage';
import Dashboard from './Dashboard';
import { ReactComponent as FalconLogo } from "./logo.svg";
// Mobile bottom tab bar icons (used when on ATS / Walk-In so nav is always visible)
function TabIconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}
function TabIconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TabIconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function TabIconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function MobileTabBar({ page, setPage, user }) {
  if (!user) return null;
  const show = ["dashboard", "ats", "walkin"].includes(page);
  if (!show) return null;
  const tabs = [
    { id: "dashboard", label: "My CVs", icon: <TabIconDoc /> },
    { id: "ats", label: "ATS", icon: <TabIconTarget /> },
    { id: "walkin", label: "Walk-In", icon: <TabIconBolt /> },
    { id: "account", label: "Account", icon: <TabIconUser /> },
  ];
  return (
    <div
      className="cvp-mobile-tabbar"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: 64,
        background: "rgba(10,10,10,0.96)",
        borderTop: "1px solid #1E1E1E",
        display: "none",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        alignItems: "center",
        padding: "6px 6px 10px",
        backdropFilter: "blur(10px)",
        zIndex: 50,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setPage(t.id === "account" ? "dashboard" : t.id)}
          style={{
            background: "transparent",
            border: "none",
            color: page === t.id ? "#FFFFFF" : "#555",
            display: "grid",
            justifyItems: "center",
            gap: 4,
            cursor: "pointer",
            padding: 6,
          }}
        >
          {t.icon}
          <span style={{ fontSize: 11, fontWeight: 600, color: page === t.id ? "#FFFFFF" : "#555" }}>
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// Skip Supabase usage during react-snap prerender
const isPrerender = typeof navigator !== 'undefined' && navigator.userAgent.includes('ReactSnap');
const supabase = isPrerender ? null : supabaseImport;

// ─── TEMPLATES ───────────────────────────────────────────────────
const TEMPLATES = [
  { id: 1,  name: "Gulf Classic",         tier: "free",    color: "#1a1a2e", accent: "#e94560", desc: "Bold banner header",              layout: "banner"      },
  { id: 2,  name: "Dubai Modern",         tier: "free",    color: "#0f3460", accent: "#00b4d8", desc: "Two-column split",                layout: "twocol"      },
  { id: 3,  name: "Arabia Pro",           tier: "free",    color: "#1a1a2e", accent: "#1B3A6B", desc: "Sidebar with skills column",      layout: "sidebar"     },
  { id: 4,  name: "Executive Gold",       tier: "premium", color: "#1a0a00", accent: "#d4a017", desc: "Timeline experience style",       layout: "timeline"    },
  { id: 5,  name: "Gulf Executive",       tier: "premium", color: "#0D1B2A", accent: "#C9A84C", desc: "Dark navy with gold accents",     layout: "gulf-exec"   },
  { id: 6,  name: "Banking & Finance",    tier: "premium", color: "#000000", accent: "#000000", desc: "Ultra-clean ATS-first serif",     layout: "banking"     },
  { id: 7,  name: "Compact Pro",          tier: "premium", color: "#14213D", accent: "#0D7377", desc: "Dense teal layout, max content",  layout: "compact-pro" },
  { id: 8,  name: "Creative Sidebar",     tier: "premium", color: "#2D2D2D", accent: "#E8533F", desc: "Coral sidebar for Sales/RE",      layout: "creative"    },
  { id: 9,  name: "Hospitality & Service",tier: "premium", color: "#6B4C3B", accent: "#6B4C3B", desc: "Warm tone for hotels & F&B",      layout: "hospitality" },
  { id: 10, name: "ATS International",    tier: "premium", color: "#000000", accent: "#333333", desc: "Pure ATS — zero colour, max score",layout: "ats-intl"   },
  { id: 11, name: "Tech & IT Pro",        tier: "premium", color: "#1E2D45", accent: "#4A90D9", desc: "Dark slate sidebar for tech roles",layout: "tech-it"    },
  { id: 12, name: "Classic",              tier: "free",    color: "#000000", accent: "#000000", desc: "Single-column black & white · Gulf-friendly", layout: "classic", tags: ["ATS Friendly", "Popular in UAE"] },
  { id: 13, name: "Finance",              tier: "premium", color: "#000000", accent: "#000000", desc: "Dense finance & accounting · UAE banking",    layout: "finance", tags: ["ATS Friendly", "Popular in UAE", "Banking & Finance"] },
];

const DUMMY_RESUME = {
  name: "Ahmed Al Mansouri",
  title: "Senior Sales Executive",
  email: "ahmed.mansouri@email.com",
  phone: "+971 50 456 7890",
  location: "Dubai, UAE",
  summary: "Results-driven sales professional with 6 years of experience in UAE retail and banking sectors. Proven track record of exceeding targets.",
  nationality: "UAE National",
  visaStatus: "Citizen",
  dob: "15 March 1990",
  gender: "Male",
  maritalStatus: "Married",
  experience: [
    { company: "Emirates NBD", role: "Relationship Officer", location: "Dubai, UAE", period: "2021 – Present", points: "Managed portfolio of 200+ HNW clients\nAchieved 140% of annual sales target\nOnboarded AED 45M in new deposits" },
    { company: "Mashreq Bank", role: "Personal Banking Advisor", location: "Dubai, UAE", period: "2018 – 2021", points: "Cross-sold investment and insurance products\nRanked top 5% nationally for customer satisfaction\nTrained 8 new joiners on CRM systems" }
  ],
  education: [{ school: "University of Dubai", degree: "Bachelor of Business Administration", year: "2018" }],
  skills: "Sales, Relationship Management, CRM, KYC/AML, Arabic, English, MS Office, Negotiation",
  languages: "Arabic (Native), English (Fluent)",
  certifications: [
    { name: "Certified Banking Professional (CBP)", issuer: "", year: "" },
    { name: "UAE Central Bank AML Certificate", issuer: "", year: "" },
  ],
  availability: "Immediately Available",
  willingToRelocate: "Yes",
  drivingLicense: "UAE Driving License"
};

const EMPTY_EXP = {
  company: "",
  role: "",
  location: "",
  period: "",
  points: "",
  startDate: "",
  endDate: "",
  present: false,
};

const EMPTY_EDU = {
  school: "",
  degree: "",
  year: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  location: "",
};

const EMPTY_CERT = {
  name: "",
  issuer: "",
  year: "",
};

const EMPTY_RESUME = {
  // Personal
  name: "", email: "", phone: "", location: "Dubai, UAE",
  title: "", summary: "",
  // Gulf-specific personal
  nationality: "", visaStatus: "", dob: "", gender: "", maritalStatus: "",
  // Experience (templates use company, role, location, period, points)
  experience: [],
  // Education
  education: [],
  // Skills & extras (skills/languages stay comma strings for T1–T13)
  skills: "", languages: "English, Hindi",
  certifications: [],
  technicalSkills: "",
  projects: "",
  volunteerWork: "",
  publications: "",
  /** Optional accordion sections user chose to show */
  builderExtraSectionIds: [],
  // Additional
  availability: "Immediately Available",
  drivingLicense: "",
  willingToRelocate: "Yes",
  references: "References available upon request",
};

const OPTIONAL_BUILDER_SECTIONS = [
  { id: "certifications", label: "Certifications", field: "certifications", multiline: false },
  { id: "projects", label: "Projects", field: "projects", multiline: true },
  { id: "volunteer", label: "Volunteer Work", field: "volunteerWork", multiline: true },
  { id: "publications", label: "Publications", field: "publications", multiline: true },
];

function normalizeCertificationsArray(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { ...EMPTY_CERT, name: n } : null;
        }
        return {
          ...EMPTY_CERT,
          name: String(c.name || "").trim(),
          issuer: String(c.issuer || "").trim(),
          year: String(c.year || "").trim(),
        };
      })
      .filter((c) => c && c.name);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s) => ({ ...EMPTY_CERT, name: s.trim() })).filter((c) => c.name);
  }
  return [];
}

/** One line per cert for templates that split by comma */
function formatCertificationLine(c) {
  if (!c || !c.name) return "";
  const n = c.name.replace(/,/g, " ");
  let s = n;
  if (c.issuer) s += ` — ${String(c.issuer).replace(/,/g, " ")}`;
  if (c.year) s += ` (${c.year})`;
  return s;
}

function certificationsToCommaString(arr) {
  return normalizeCertificationsArray(arr).map(formatCertificationLine).filter(Boolean).join(", ");
}

function cvWithTemplateCertifications(cv) {
  if (!cv || typeof cv !== "object") return cv;
  return {
    ...cv,
    certifications: certificationsToCommaString(cv.certifications),
  };
}

function normalizeResumeForBuilder(cv) {
  if (!cv || typeof cv !== "object") return { ...EMPTY_RESUME };
  const exp = Array.isArray(cv.experience) ? cv.experience : [];
  const edu = Array.isArray(cv.education) ? cv.education : [];
  return {
    ...EMPTY_RESUME,
    ...cv,
    experience: exp.length ? exp.map((e) => ({ ...EMPTY_EXP, ...e })) : [],
    education: edu.length ? edu.map((e) => ({ ...EMPTY_EDU, ...e })) : [],
    certifications: normalizeCertificationsArray(cv.certifications),
    builderExtraSectionIds: Array.isArray(cv.builderExtraSectionIds) ? cv.builderExtraSectionIds : [],
    projects: cv.projects ?? "",
    volunteerWork: cv.volunteerWork ?? "",
    publications: cv.publications ?? "",
  };
}

function splitCommaItems(str) {
  if (!str || typeof str !== "string") return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildExperiencePeriod(e) {
  if (e.startDate || e.endDate || e.present) {
    const end = e.present ? "Present" : (e.endDate || "").trim();
    const start = (e.startDate || "").trim();
    if (start && end) return `${start} – ${end}`;
    if (start) return e.present ? `${start} – Present` : start;
    if (end) return end;
    if (e.present) return "Present";
  }
  return (e.period || "").trim();
}

function buildEducationYearLine(e) {
  if (e.startDate || e.endDate) {
    const a = (e.startDate || "").trim();
    const b = (e.endDate || "").trim();
    if (a && b) return `${a} – ${b}`;
    return a || b || (e.year || "").trim();
  }
  return (e.year || "").trim();
}

const CB_UI = {
  btn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#FFFFFF",
    color: "#000000",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    color: "#FFFFFF",
    padding: "10px 12px",
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  },
  card: {
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#2A2A2A",
    color: "#FFFFFF",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 13,
  },
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  bg: "#0a0a0f", surface: "#12121a", card: "#1a1a26", border: "#2a2a3a",
  accent: "#FFFFFF", gold: "#f59e0b", text: "#f0f0ff", muted: "#8888aa",
  success: "#10b981", danger: "#ef4444",
};

const S = {
  app: { minHeight: "100vh", width: "100%", overflowX: "hidden", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
    background: "rgba(10,10,15,0.95)", position: "sticky", top: 0, zIndex: 100,
    backdropFilter: "blur(10px)",
  },
  logo: {
    fontSize: "22px", fontWeight: "800", cursor: "pointer",
    color: "#FFFFFF",
  },
  btn: (v = "primary", sz = "md") => ({
    padding: sz === "lg" ? "14px 32px" : sz === "sm" ? "8px 16px" : "10px 22px",
    borderRadius: "10px", cursor: "pointer", fontWeight: "600",
    fontSize: sz === "lg" ? "16px" : sz === "sm" ? "13px" : "14px",
    transition: "background-color 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1), border-color 150ms cubic-bezier(0.4,0,0.2,1)",
    background: v === "primary" ? C.accent
      : v === "gold" ? `linear-gradient(135deg,${C.gold},#f97316)`
      : v === "outline" ? "transparent"
      : v === "danger" ? C.danger
      : v === "success" ? C.success : C.surface,
    color: v === "primary" ? "#000" : v === "outline" ? C.accent : "#fff",
    border: v === "outline" ? `1px solid ${C.accent}` : "none",
    boxShadow: "none",
  }),
  input: {
    width: "100%", padding: "12px 16px", background: C.card,
    border: `1px solid ${C.border}`, borderRadius: "10px",
    color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "12px 16px", background: C.card,
    border: `1px solid ${C.border}`, borderRadius: "10px",
    color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box",
    cursor: "pointer",
  },
  label: { display: "block", fontSize: "13px", color: C.muted, marginBottom: "6px", fontWeight: "500" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" },
  badge: (type = "free") => ({
    display: "inline-block", padding: "3px 10px", borderRadius: "20px",
    fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px",
    background: type === "free" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
    color: type === "free" ? C.success : C.gold,
    border: `1px solid ${type === "free" ? C.success : C.gold}`,
  }),
  sectionHeading: {
    fontSize: "13px", fontWeight: "700", color: C.muted,
    textTransform: "uppercase", letterSpacing: "1px",
    paddingBottom: "10px", borderBottom: `1px solid ${C.border}`,
    marginBottom: "16px", marginTop: "8px",
  },
};

// ─── SUPABASE RESUME OPERATIONS ──────────────────────────────────
async function saveResume(userId, resume, templateId, existingId = null) {
  if (!supabase) return null;
  const payload = {
    user_id: userId,
    title: resume.name ? `${resume.name} — ${resume.title || "Resume"}` : "My Resume",
    template_id: templateId,
    cv_data: resume,
    updated_at: new Date().toISOString(),
  };
  if (existingId) {
    const { data, error } = await supabase.from("cvs").update(payload).eq("id", existingId).eq("user_id", userId).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from("cvs").insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}

async function loadUserResumes(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("cvs").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function deleteResume(resumeId, userId) {
  if (!supabase) return;
  const { error } = await supabase.from("cvs").delete().eq("id", resumeId).eq("user_id", userId);
  if (error) throw error;
}

// ─── SHARED PREVIEW SUB-COMPONENTS ───────────────────────────────
function Section({ title, accent, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.5px", color: accent, textTransform: "uppercase", fontFamily: "sans-serif" }}>{title}</span>
        <div style={{ flex: 1, height: "1px", background: `${accent}44` }} />
      </div>
      {children}
    </div>
  );
}

function ColLabel({ accent, children }) {
  return <div style={{ fontSize: "9px", fontWeight: "800", color: accent, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "6px", fontFamily: "sans-serif" }}>{children}</div>;
}

function ColItem({ children }) {
  return <div style={{ fontSize: "10px", color: "#ccc", marginBottom: "5px", wordBreak: "break-all", lineHeight: "1.4" }}>{children}</div>;
}

function RightLabel({ accent, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.5px", color: accent, textTransform: "uppercase", fontFamily: "sans-serif" }}>{children}</span>
      <div style={{ flex: 1, height: "1px", background: `${accent}33` }} />
    </div>
  );
}

// ─── PREVIEW: BANNER LAYOUT ───────────────────────────────────────
function PreviewBanner({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const techList  = cv.technicalSkills ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const certList  = cv.certifications ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "10px", overflow: "hidden", fontFamily: "Georgia,serif", color: "#222", fontSize: "12px" }}>
      {/* Header */}
      <div style={{ background: t.color, borderBottom: `5px solid ${t.accent}`, padding: "24px 28px 18px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 3px" }}>{cv.name || "Your Name"}</h1>
        <p style={{ color: t.accent, fontWeight: "700", fontSize: "12px", margin: "0 0 8px", fontFamily: "sans-serif" }}>{cv.title || "Job Title"}</p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "10px", color: "#ccc", fontFamily: "sans-serif" }}>
          {cv.email && <span>✉ {cv.email}</span>}
          {cv.phone && <span>📞 {cv.phone}</span>}
          {cv.location && <span>📍 {cv.location}</span>}
          {cv.nationality && <span>🌍 {cv.nationality}</span>}
          {cv.visaStatus && <span>🪪 {cv.visaStatus}</span>}
        </div>
        {/* Gulf info bar */}
        {(cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "10px", color: "#aaa", fontFamily: "sans-serif", marginTop: "5px" }}>
            {cv.dob && <span>DOB: {cv.dob}</span>}
            {cv.gender && <span>Gender: {cv.gender}</span>}
            {cv.maritalStatus && <span>Status: {cv.maritalStatus}</span>}
          </div>
        )}
      </div>
      <div style={{ padding: "20px 28px" }}>
        {cv.summary && <Section title="Professional Summary" accent={t.accent}><p style={{ fontSize: "11px", lineHeight: "1.7", margin: 0, color: "#444" }}>{cv.summary}</p></Section>}

        {skillList.length > 0 && (
          <Section title="Core Skills" accent={t.accent}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {skillList.map((s, i) => <span key={i} style={{ padding: "3px 10px", background: `${t.accent}18`, border: `1px solid ${t.accent}44`, borderRadius: "20px", fontSize: "10px", color: "#333" }}>{s}</span>)}
            </div>
          </Section>
        )}

        {cv.experience.some(e => e.company) && (
          <Section title="Work Experience" accent={t.accent}>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <strong style={{ fontSize: "12px" }}>{e.role}</strong>
                  <span style={{ fontSize: "10px", color: "#888", whiteSpace: "nowrap", marginLeft: "8px" }}>{e.period}</span>
                </div>
                <div style={{ color: t.accent, fontSize: "11px", fontWeight: "700", marginBottom: "3px" }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.points && (
                  <div className="cvp-preview-exp-banner-wrap">
                    {splitExperiencePointsForPreview(e.points).map((line, j) => (
                      <p key={j} className="cvp-preview-exp-banner-line">{j === 0 ? line : `• ${line}`}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {cv.education.some(e => e.school) && (
          <Section title="Education" accent={t.accent}>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                <div><strong style={{ fontSize: "11px" }}>{e.degree}</strong><div style={{ fontSize: "10px", color: "#666" }}>{e.school}</div></div>
                <span style={{ fontSize: "10px", color: "#888" }}>{e.year}</span>
              </div>
            ))}
          </Section>
        )}

        {certList.length > 0 && (
          <Section title="Certifications" accent={t.accent}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {certList.map((c, i) => <span key={i} style={{ padding: "2px 8px", background: `${t.accent}12`, border: `1px solid ${t.accent}33`, borderRadius: "4px", fontSize: "10px", color: "#333" }}>{c}</span>)}
            </div>
          </Section>
        )}

        {techList.length > 0 && (
          <Section title="Technical Skills" accent={t.accent}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {techList.map((s, i) => <span key={i} style={{ padding: "2px 8px", background: "#f5f5f5", borderRadius: "4px", fontSize: "10px", color: "#333" }}>{s}</span>)}
            </div>
          </Section>
        )}

        {cv.languages && <Section title="Languages" accent={t.accent}><p style={{ fontSize: "11px", margin: 0, color: "#444" }}>{cv.languages}</p></Section>}

        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <Section title="Additional Information" accent={t.accent}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "10px", color: "#555" }}>
              {cv.availability && <span>📅 {cv.availability}</span>}
              {cv.drivingLicense && <span>🚗 License: {cv.drivingLicense}</span>}
              {cv.willingToRelocate && <span>✈️ Relocate: {cv.willingToRelocate}</span>}
            </div>
          </Section>
        )}

        {cv.references && <Section title="References" accent={t.accent}><p style={{ fontSize: "10px", margin: 0, color: "#888", fontStyle: "italic" }}>{cv.references}</p></Section>}
      </div>
    </div>
  );
}

// ─── PREVIEW: TWO-COLUMN LAYOUT ───────────────────────────────────
function PreviewTwoCol({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const certList  = cv.certifications ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial,sans-serif", color: "#222", display: "flex", minHeight: "500px", fontSize: "11px", alignItems: "stretch" }}>
      {/* Left sidebar */}
      <div style={{ width: "34%", background: t.color, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "14px", alignSelf: "stretch" }}>
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: "900", color: "#fff", margin: "0 0 3px" }}>{cv.name || "Your Name"}</h1>
          <p style={{ color: t.accent, fontWeight: "700", fontSize: "10px", margin: 0 }}>{cv.title || "Job Title"}</p>
        </div>

        <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "12px" }}>
          <ColLabel accent={t.accent}>Contact</ColLabel>
          {cv.email && <ColItem>✉ {cv.email}</ColItem>}
          {cv.phone && <ColItem>📞 {cv.phone}</ColItem>}
          {cv.location && <ColItem>📍 {cv.location}</ColItem>}
        </div>

        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "12px" }}>
            <ColLabel accent={t.accent}>Personal Info</ColLabel>
            {cv.nationality && <ColItem>🌍 {cv.nationality}</ColItem>}
            {cv.visaStatus && <ColItem>🪪 {cv.visaStatus}</ColItem>}
            {cv.dob && <ColItem>📅 DOB: {cv.dob}</ColItem>}
            {cv.gender && <ColItem>👤 {cv.gender}</ColItem>}
            {cv.maritalStatus && <ColItem>💍 {cv.maritalStatus}</ColItem>}
          </div>
        )}

        {skillList.length > 0 && (
          <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "12px" }}>
            <ColLabel accent={t.accent}>Core Skills</ColLabel>
            {skillList.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
                <span style={{ fontSize: "10px", color: "#ddd" }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {cv.languages && (
          <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "12px" }}>
            <ColLabel accent={t.accent}>Languages</ColLabel>
            {cv.languages.split(",").map((l, i) => <ColItem key={i}>🌐 {l.trim()}</ColItem>)}
          </div>
        )}

        {certList.length > 0 && (
          <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "12px" }}>
            <ColLabel accent={t.accent}>Certifications</ColLabel>
            {certList.map((c, i) => <ColItem key={i}>🏅 {c}</ColItem>)}
          </div>
        )}

        {cv.education.some(e => e.school) && (
          <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "12px" }}>
            <ColLabel accent={t.accent}>Education</ColLabel>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "9px", color: t.accent, fontWeight: "700" }}>{e.year}</div>
                <div style={{ fontSize: "10px", color: "#fff", fontWeight: "700" }}>{e.degree}</div>
                <div style={{ fontSize: "9px", color: "#aaa" }}>{e.school}</div>
              </div>
            ))}
          </div>
        )}

        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "12px" }}>
            <ColLabel accent={t.accent}>Additional</ColLabel>
            {cv.availability && <ColItem>📅 {cv.availability}</ColItem>}
            {cv.drivingLicense && <ColItem>🚗 {cv.drivingLicense}</ColItem>}
            {cv.willingToRelocate && <ColItem>✈️ Relocate: {cv.willingToRelocate}</ColItem>}
          </div>
        )}
      </div>

      {/* Right main content */}
      <div style={{ flex: 1, padding: "24px 20px" }}>
        {cv.summary && (
          <div style={{ marginBottom: "16px" }}>
            <RightLabel accent={t.accent}>Professional Summary</RightLabel>
            <p style={{ fontSize: "10px", lineHeight: "1.7", margin: 0, color: "#444" }}>{cv.summary}</p>
          </div>
        )}
        {cv.experience.some(e => e.company) && (
          <div style={{ marginBottom: "16px" }}>
            <RightLabel accent={t.accent}>Work Experience</RightLabel>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{ marginBottom: "12px", paddingLeft: "10px", borderLeft: `3px solid ${t.accent}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "11px" }}>{e.role}</strong>
                  <span style={{ fontSize: "9px", color: "#888" }}>{e.period}</span>
                </div>
                <div style={{ color: t.accent, fontSize: "10px", fontWeight: "700", marginBottom: "3px" }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.points && (
                  <div className="cvp-preview-exp-twocol-wrap">
                    {splitExperiencePointsForPreview(e.points).map((line, j) => (
                      <p key={j} className="cvp-preview-exp-twocol-line">{j === 0 ? line : `• ${line}`}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {cv.technicalSkills && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Technical Skills</RightLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {cv.technicalSkills.split(",").map((s, i) => (
                <span key={i} style={{ padding: "2px 8px", background: "#f0f0f0", borderRadius: "4px", fontSize: "10px", color: "#333" }}>{s.trim()}</span>
              ))}
            </div>
          </div>
        )}
        {cv.references && <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: `1px solid #eee` }}><p style={{ fontSize: "10px", color: "#999", fontStyle: "italic", margin: 0 }}>{cv.references}</p></div>}
      </div>
    </div>
  );
}

// ─── PREVIEW: SIDEBAR LAYOUT ──────────────────────────────────────
function PreviewSidebar({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const certList  = cv.certifications ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "10px", overflow: "hidden", fontFamily: "'Trebuchet MS',sans-serif", color: "#222", display: "flex", fontSize: "11px", alignItems: "stretch" }}>
      {/* Sidebar */}
      <div style={{ width: "28%", background: t.color, padding: "22px 14px", alignSelf: "stretch" }}>
        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "900", color: t.color, marginBottom: "12px" }}>
          {(cv.name || "?")[0].toUpperCase()}
        </div>
        <ColLabel accent={t.accent}>Contact</ColLabel>
        {cv.email && <ColItem>✉ {cv.email}</ColItem>}
        {cv.phone && <ColItem>📞 {cv.phone}</ColItem>}
        {cv.location && <ColItem>📍 {cv.location}</ColItem>}

        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Personal</ColLabel>
            {cv.nationality && <ColItem>🌍 {cv.nationality}</ColItem>}
            {cv.visaStatus && <ColItem>🪪 {cv.visaStatus}</ColItem>}
            {cv.dob && <ColItem>DOB: {cv.dob}</ColItem>}
            {cv.gender && <ColItem>{cv.gender}</ColItem>}
            {cv.maritalStatus && <ColItem>{cv.maritalStatus}</ColItem>}
          </div>
        )}

        {skillList.length > 0 && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Core Skills</ColLabel>
            {skillList.map((s, i) => (
              <div key={i} style={{ fontSize: "9px", color: "#ddd", marginBottom: "6px" }}>
                <div style={{ marginBottom: "2px" }}>{s}</div>
                <div style={{ height: "3px", background: "#ffffff22", borderRadius: "2px" }}>
                  <div style={{ height: "3px", width: `${65 + (i % 4) * 9}%`, background: t.accent, borderRadius: "2px" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {cv.languages && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Languages</ColLabel>
            {cv.languages.split(",").map((l, i) => <ColItem key={i}>🌐 {l.trim()}</ColItem>)}
          </div>
        )}

        {certList.length > 0 && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Certifications</ColLabel>
            {certList.map((c, i) => <ColItem key={i}>🏅 {c}</ColItem>)}
          </div>
        )}

        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Additional</ColLabel>
            {cv.availability && <ColItem>📅 {cv.availability}</ColItem>}
            {cv.drivingLicense && <ColItem>🚗 {cv.drivingLicense}</ColItem>}
            {cv.willingToRelocate && <ColItem>✈️ Relocate: {cv.willingToRelocate}</ColItem>}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "22px 18px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 2px", color: t.color }}>{cv.name || "Your Name"}</h1>
          <p style={{ color: t.accent, fontWeight: "700", fontSize: "11px", margin: 0 }}>{cv.title || "Job Title"}</p>
        </div>

        {cv.summary && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Professional Summary</RightLabel>
            <p style={{ fontSize: "10px", lineHeight: "1.7", margin: 0, color: "#444" }}>{cv.summary}</p>
          </div>
        )}

        {cv.experience.some(e => e.company) && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Work Experience</RightLabel>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "11px", color: t.color }}>{e.role}</strong>
                  <span style={{ fontSize: "9px", color: "#888", background: `${t.accent}18`, padding: "1px 6px", borderRadius: "8px" }}>{e.period}</span>
                </div>
                <div style={{ color: t.accent, fontSize: "10px", marginBottom: "3px" }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.points && (
                  <div className="cvp-preview-exp-sidebar-wrap">
                    {splitExperiencePointsForPreview(e.points).map((line, j) => (
                      <p key={j} className="cvp-preview-exp-sidebar-line">{j === 0 ? line : `• ${line}`}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {cv.technicalSkills && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Technical Skills</RightLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {cv.technicalSkills.split(",").map((s, i) => (
                <span key={i} style={{ padding: "2px 7px", background: "#f0f0f0", borderRadius: "4px", fontSize: "9px", color: "#333" }}>{s.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {cv.education.some(e => e.school) && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Education</RightLabel>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: "11px" }}>{e.degree}</strong>
                  <div style={{ fontSize: "10px", color: "#666" }}>{e.school}</div>
                </div>
                <span style={{ fontSize: "9px", color: "#888" }}>{e.year}</span>
              </div>
            ))}
          </div>
        )}

        {cv.references && <p style={{ fontSize: "9px", color: "#999", fontStyle: "italic", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #eee" }}>{cv.references}</p>}
      </div>
    </div>
  );
}

// ─── PREVIEW: TIMELINE LAYOUT ─────────────────────────────────────
function PreviewTimeline({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const certList  = cv.certifications ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "10px", overflow: "hidden", fontFamily: "Georgia,serif", color: "#222", fontSize: "11px" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 16px", borderBottom: `3px solid ${t.accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "900", color: t.color, margin: "0 0 3px" }}>{cv.name || "Your Name"}</h1>
            <p style={{ color: t.accent, fontWeight: "700", fontSize: "11px", margin: "0 0 6px" }}>{cv.title || "Job Title"}</p>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "9px", color: "#666" }}>
              {cv.nationality && <span>🌍 {cv.nationality}</span>}
              {cv.visaStatus && <span>🪪 {cv.visaStatus}</span>}
              {cv.dob && <span>DOB: {cv.dob}</span>}
              {cv.gender && <span>{cv.gender}</span>}
              {cv.maritalStatus && <span>{cv.maritalStatus}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "9px", color: "#666", lineHeight: "1.8" }}>
            {cv.email && <div>✉ {cv.email}</div>}
            {cv.phone && <div>📞 {cv.phone}</div>}
            {cv.location && <div>📍 {cv.location}</div>}
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 28px" }}>
        {cv.summary && (
          <div style={{ marginBottom: "16px", padding: "12px 14px", background: `${t.accent}0d`, borderLeft: `3px solid ${t.accent}`, borderRadius: "0 6px 6px 0" }}>
            <p style={{ fontSize: "10px", lineHeight: "1.7", margin: 0, color: "#444", fontStyle: "italic" }}>{cv.summary}</p>
          </div>
        )}

        {skillList.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Core Skills</RightLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {skillList.map((s, i) => <span key={i} style={{ padding: "2px 9px", background: `${t.accent}15`, border: `1px solid ${t.accent}44`, borderRadius: "10px", fontSize: "9px", color: "#333" }}>{s}</span>)}
            </div>
          </div>
        )}

        {cv.experience.some(e => e.company) && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Work Experience</RightLabel>
            <div style={{ position: "relative", paddingLeft: "20px" }}>
              <div style={{ position: "absolute", left: "5px", top: "4px", bottom: "4px", width: "2px", background: `${t.accent}33` }} />
              {cv.experience.filter(e => e.company).map((e, i) => (
                <div key={i} style={{ position: "relative", marginBottom: "14px" }}>
                  <div style={{ position: "absolute", left: "-17px", top: "3px", width: "10px", height: "10px", borderRadius: "50%", background: t.accent, border: "2px solid #fff", boxShadow: `0 0 0 2px ${t.accent}` }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: "11px", color: t.color }}>{e.role}</strong>
                    <span style={{ fontSize: "9px", color: "#888" }}>{e.period}</span>
                  </div>
                  <div style={{ color: t.accent, fontSize: "10px", fontWeight: "700", marginBottom: "3px" }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                  {e.points && (
                    <div className="cvp-preview-exp-timeline-wrap">
                      {splitExperiencePointsForPreview(e.points).map((line, j) => (
                        <p key={j} className="cvp-preview-exp-timeline-line">{j === 0 ? line : `• ${line}`}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            {cv.education.some(e => e.school) && (
              <div style={{ marginBottom: "12px" }}>
                <RightLabel accent={t.accent}>Education</RightLabel>
                {cv.education.filter(e => e.school).map((e, i) => (
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <strong style={{ fontSize: "11px" }}>{e.degree}</strong>
                    <div style={{ fontSize: "9px", color: "#666" }}>{e.school}</div>
                    <div style={{ fontSize: "9px", color: t.accent }}>{e.year}</div>
                  </div>
                ))}
              </div>
            )}
            {certList.length > 0 && (
              <div>
                <RightLabel accent={t.accent}>Certifications</RightLabel>
                {certList.map((c, i) => <div key={i} style={{ fontSize: "10px", color: "#444", marginBottom: "3px" }}>🏅 {c}</div>)}
              </div>
            )}
          </div>
          <div>
            {cv.technicalSkills && (
              <div style={{ marginBottom: "12px" }}>
                <RightLabel accent={t.accent}>Technical Skills</RightLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {cv.technicalSkills.split(",").map((s, i) => <span key={i} style={{ padding: "2px 7px", background: "#f5f5f5", borderRadius: "4px", fontSize: "9px", color: "#333" }}>{s.trim()}</span>)}
                </div>
              </div>
            )}
            {cv.languages && (
              <div style={{ marginBottom: "12px" }}>
                <RightLabel accent={t.accent}>Languages</RightLabel>
                <p style={{ fontSize: "10px", margin: 0, color: "#444" }}>{cv.languages}</p>
              </div>
            )}
            {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
              <div>
                <RightLabel accent={t.accent}>Additional Info</RightLabel>
                {cv.availability && <div style={{ fontSize: "9px", color: "#555", marginBottom: "3px" }}>📅 {cv.availability}</div>}
                {cv.drivingLicense && <div style={{ fontSize: "9px", color: "#555", marginBottom: "3px" }}>🚗 License: {cv.drivingLicense}</div>}
                {cv.willingToRelocate && <div style={{ fontSize: "9px", color: "#555" }}>✈️ Relocate: {cv.willingToRelocate}</div>}
              </div>
            )}
          </div>
        </div>

        {cv.references && <p style={{ fontSize: "9px", color: "#999", fontStyle: "italic", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #eee" }}>{cv.references}</p>}
      </div>
    </div>
  );
}

function ResumePreview({ cv, template }) {
  const t = template || TEMPLATES[0];
  const cvT = cvWithTemplateCertifications(cv);
  if (t.layout === "twocol")      return <PreviewTwoCol          cv={cvT} t={t} />;
  if (t.layout === "sidebar")     return <PreviewSidebar         cv={cvT} t={t} />;
  if (t.layout === "timeline")    return <PreviewTimeline        cv={cvT} t={t} />;
  if (t.layout === "gulf-exec")   return <PreviewGulfExecutive   cv={cvT} t={t} />;
  if (t.layout === "banking")     return <PreviewBankingFinance  cv={cvT} t={t} />;
  if (t.layout === "compact-pro") return <PreviewCompactPro      cv={cvT} t={t} />;
  if (t.layout === "creative")    return <PreviewCreativeSidebar cv={cvT} t={t} />;
  if (t.layout === "hospitality") return <PreviewHospitality     cv={cvT} t={t} />;
  if (t.layout === "ats-intl")    return <PreviewATSInternational cv={cvT} t={t} />;
  if (t.layout === "tech-it")     return <PreviewTechITPro       cv={cvT} t={t} />;
  if (t.layout === "classic")     return <PreviewClassic         cv={cvT} />;
  if (t.layout === "finance")     return <PreviewFinance         cv={cvT} />;
  return <PreviewBanner cv={cvT} t={t} />;
}

/** A4 page at 96dpi — matches dynamic scale math (containerWidth / 794) */
const A4_PREVIEW_WIDTH_PX = 794;
const A4_PREVIEW_HEIGHT_PX = 1123;

function BuilderA4PreviewScaled({ cv, template, scale, fitRef, padded, previewCardRef }) {
  return (
    <div
      ref={fitRef}
      style={{
        width: "100%",
        overflowX: "hidden",
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
        minWidth: 0,
        ...(padded ? { padding: "0 16px" } : {}),
      }}
    >
      <div
        style={{
          width: A4_PREVIEW_WIDTH_PX,
          transformOrigin: "top center",
          transform: `scale(${scale})`,
          marginBottom: `${(scale - 1) * A4_PREVIEW_HEIGHT_PX}px`,
        }}
      >
        <div className="cvp-builder-a4-fit" ref={previewCardRef}>
          <ResumePreview cv={cv} template={template} />
        </div>
      </div>
    </div>
  );
}

/** Customise tab: template row with scaled live preview thumbnail */
const BuilderTemplateCard = memo(function BuilderTemplateCard({ template: t, isSelected, resume, onSelect }) {
  const isFree = t.tier === "free";
  return (
    <button
      type="button"
      onClick={() => onSelect(t)}
      style={{
        width: "100%",
        height: 120,
        padding: 0,
        borderRadius: 8,
        border: isSelected ? "1px solid #FFFFFF" : "1px solid #2A2A2A",
        background: isSelected ? "#1C1C1C" : "#141414",
        cursor: "pointer",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: 90,
          overflow: "hidden",
          background: "#1C1C1C",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        <div
          style={{
            width: A4_PREVIEW_WIDTH_PX,
            transform: "scale(0.2)",
            transformOrigin: "top center",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        >
          <ResumePreview cv={resume} template={t} />
        </div>
      </div>
      <div
        style={{
          height: 30,
          minHeight: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 10px",
          boxSizing: "border-box",
          borderTop: "1px solid #2A2A2A",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#FFFFFF",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {t.name}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
            flexShrink: 0,
            background: isFree ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
            color: isFree ? "#10b981" : "#f59e0b",
          }}
        >
          {isFree ? "Free" : "Pro"}
        </span>
      </div>
    </button>
  );
});

// ─── PDF DOWNLOAD (html2canvas snapshot → jsPDF) ───────────────────
async function downloadResumeFromPreview(cvInput, captureElement) {
  const cv = cvWithTemplateCertifications(cvInput);
  if (!captureElement) return;

  const el = captureElement;
  const prevWidth = el.style.width;
  const prevMaxWidth = el.style.maxWidth;
  const prevMinWidth = el.style.minWidth;
  el.style.width = "794px";
  el.style.maxWidth = "794px";
  el.style.minWidth = "794px";
  el.style.minHeight = "0";
  el.style.height = "auto";
  await new Promise((r) => setTimeout(r, 100));

  const fullHeight = el.scrollHeight;
  el.style.height = fullHeight + "px";
  el.style.overflow = "visible";

  let canvas;
  try {
    canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      height: fullHeight,
      windowWidth: 794,
      windowHeight: fullHeight,
    });
  } finally {
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
    el.style.minWidth = prevMinWidth;
    el.style.minHeight = "";
    el.style.height = "";
    el.style.overflow = "";
  }

  canvas = trimCanvasBottomWhitespace(canvas);

  const pageWidth = 210;
  const pageHeight = 297;
  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const canvasAspect = canvas.width / canvas.height;
  const imgHeight = pageWidth / canvasAspect;

  /** ~1 rendered text line at scale 3 — overlap hides mid-line cuts at page seams */
  const PAGE_SLICE_OVERLAP_PX = 48;

  if (imgHeight <= pageHeight) {
    doc.addImage(imgData, "JPEG", 0, 0, pageWidth, imgHeight);
  } else {
    const pxPerMm = canvas.width / 210;
    const pageHeightPx = Math.floor(297 * pxPerMm);
    let yOffset = 0;
    let pageNum = 0;

    while (yOffset < canvas.height) {
      const remaining = canvas.height - yOffset;
      const sliceHeight = Math.min(pageHeightPx, remaining);

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = pageHeightPx;
      const ctx = sliceCanvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

      ctx.drawImage(
        canvas,
        0,
        yOffset,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      const sliceData = sliceCanvas.toDataURL("image/jpeg", 1.0);
      if (pageNum > 0) doc.addPage();
      doc.addImage(sliceData, "JPEG", 0, 0, 210, 297);

      yOffset += sliceHeight;
      if (yOffset < canvas.height) {
        yOffset -= PAGE_SLICE_OVERLAP_PX;
      }
      pageNum++;
    }
  }

  doc.save(`${(cv.name || "Resume").replace(/\s+/g, "_")}_CVPassport.pdf`);
}

// ─── PREVIEW: TEMPLATE THUMB WRAPPER ──────────────────────────────
const TemplateThumb = ({ children }) => (
  <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#fff", borderRadius: "12px" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: "794px", transformOrigin: "top left", transform: "scale(0.27)", pointerEvents: "none" }}>
      {children}
    </div>
  </div>
);

// ─── INLINE PREVIEW: T1 (BANNER LAYOUT) ───────────────────────────
const T1Preview = ({ cv, t }) => (
  <TemplateThumb>
    <PreviewBanner cv={cv} t={t} />
  </TemplateThumb>
);

// ─── INLINE PREVIEW: T2 (TWO-COLUMN LAYOUT) ───────────────────────
const T2Preview = ({ cv, t }) => (
  <TemplateThumb>
    <PreviewTwoCol cv={cv} t={t} />
  </TemplateThumb>
);

// ─── INLINE PREVIEW: T3 (SIDEBAR LAYOUT) ──────────────────────────
const T3Preview = ({ cv, t }) => (
  <TemplateThumb>
    <PreviewSidebar cv={cv} t={t} />
  </TemplateThumb>
);

// —— LANDING PAGE (legacy, kept for reference) ───────────────────
// eslint-disable-next-line no-unused-vars
function LandingPageLegacy({ onLogin, onSignup, setView, setResume, setSelectedTemplate }) {

  return (
    <div>
      <div style={{ textAlign: "center", padding: "80px 40px 60px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ ...S.badge("free"), marginBottom: "20px", fontSize: "13px" }}>🇦🇪 Built for Gulf Job Seekers</div>
        <h1 style={{ fontSize: "clamp(36px,6vw,64px)", fontWeight: "900", lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-2px" }}>
          Your Resume is your{" "}
          <span style={{ background: `linear-gradient(135deg,${C.accent},${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>passport</span>
          {" "}to the Gulf
        </h1>
        <p style={{ fontSize: "18px", color: C.muted, marginBottom: "36px", lineHeight: "1.7" }}>ATS-optimised resumes built for UAE, Saudi & GCC job markets. Free to build. Free to download.</p>
        <HowItWorks />
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button style={S.btn("primary","lg")} onClick={onSignup}>Build My Resume Free →</button>
          <button style={S.btn("outline","lg")} onClick={onLogin}>Sign In</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "20px", padding: "0 40px 60px", maxWidth: "1000px", margin: "0 auto" }}>
        {[
          { icon: "🎯", title: "ATS Optimised",    desc: "Beat applicant tracking systems used by UAE banks" },
          { icon: "📐", title: "Gulf CV Sections",  desc: "Nationality, Visa, DOB, Marital Status & more" },
          { icon: "💾", title: "Auto-Saved",         desc: "Your resume saves automatically — never lose your work" },
          { icon: "🔒", title: "Free Download",      desc: "Build & download free. No tricks" },
        ].map((f, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
            <div style={{ fontWeight: "700", marginBottom: "8px" }}>{f.title}</div>
            <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.6" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 40px 80px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: "800", marginBottom: "32px" }}>Professional Templates Built for Gulf Jobs</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", maxWidth: "1100px", margin: "0 auto 40px", "@media (max-width: 768px)": { gridTemplateColumns: "repeat(2, 1fr)" }, "@media (max-width: 480px)": { gridTemplateColumns: "1fr" } }}>
          {/* T1 - Gulf Classic */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Gulf Classic</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600 }}>Free</span>
              </div>
            }
          >
            <T1Preview cv={DUMMY_RESUME} t={TEMPLATES[0]} />
          </TiltedCard>

          {/* T2 - Dubai Modern */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Dubai Modern</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600 }}>Free</span>
              </div>
            }
          >
            <T2Preview cv={DUMMY_RESUME} t={TEMPLATES[1]} />
          </TiltedCard>

          {/* T3 - Arabia Pro */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Arabia Pro</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600 }}>Free</span>
              </div>
            }
          >
            <T3Preview cv={DUMMY_RESUME} t={TEMPLATES[2]} />
          </TiltedCard>

          {/* T4 - Executive Gold (Timeline) */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Executive Gold</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewTimeline cv={DUMMY_RESUME} t={TEMPLATES[3]} />
            </TemplateThumb>
          </TiltedCard>

          {/* T5 - Gulf Executive */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Gulf Executive</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewGulfExecutive cv={DUMMY_RESUME} t={TEMPLATES[4]} />
            </TemplateThumb>
          </TiltedCard>

          {/* T6 - Banking & Finance */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Banking & Finance</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewBankingFinance cv={DUMMY_RESUME} t={TEMPLATES[5]} />
            </TemplateThumb>
          </TiltedCard>

          {/* T12 - Classic */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Classic</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 600 }}>Free</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewClassic cv={DUMMY_RESUME} />
            </TemplateThumb>
          </TiltedCard>

          {/* T13 - Finance */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Finance</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewFinance cv={DUMMY_RESUME} />
            </TemplateThumb>
          </TiltedCard>
        </div>

        <button 
          onClick={() => { setResume({...EMPTY_RESUME, name: ""}); setSelectedTemplate(TEMPLATES[0]); setView('builder'); }}
          style={{ marginTop: "40px", display: "block", margin: "40px auto 0", padding: "12px 32px", background: "transparent", border: "1px solid #444", color: "#fff", borderRadius: "8px", fontSize: "14px", cursor: "pointer", letterSpacing: "0.5px" }}
        >
          Explore All 13 Templates →
        </button>
      </div>
    </div>
  );
}

const AUTH_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const authCardStyle = {
  background: "#141414",
  backgroundColor: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: "16px",
  padding: "24px",
  fontFamily: AUTH_FONT,
};

const authLabelStyle = {
  display: "block",
  fontWeight: 500,
  color: "#A0A0A0",
  fontSize: "14px",
  marginBottom: "6px",
  fontFamily: AUTH_FONT,
};

const authInputStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "#1C1C1C",
  border: "1px solid #2A2A2A",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: AUTH_FONT,
};

const authPrimaryBtn = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#FFFFFF",
  color: "#000000",
  fontWeight: 600,
  fontSize: "16px",
  cursor: "pointer",
  fontFamily: AUTH_FONT,
  transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1)",
};

// ─── AUTH PAGE ────────────────────────────────────────────────────
function AuthPage({ mode, onAuth, onToggle, loading, error }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="cvp-auth-page" style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
      <div style={authCardStyle}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "6px", color: "#FFFFFF", fontFamily: AUTH_FONT }}>{mode === "login" ? "Welcome back" : "Create account"}</h2>
        <p style={{ color: "#A0A0A0", marginBottom: "28px", fontSize: "14px", fontFamily: AUTH_FONT }}>{mode === "login" ? "Sign in to your CVPassport account" : "Start building your Gulf resume today"}</p>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${C.danger}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: C.danger, fontFamily: AUTH_FONT }}>{error}</div>}
        {mode === "signup" && <div style={{ marginBottom: "16px" }}><label style={authLabelStyle}>Full Name</label><input style={authInputStyle} placeholder="Your Name" value={form.name} onChange={e=>set("name",e.target.value)}/></div>}
        <div style={{ marginBottom: "16px" }}><label style={authLabelStyle}>Email</label><input style={authInputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={e=>set("email",e.target.value)}/></div>
        <div style={{ marginBottom: "24px" }}><label style={authLabelStyle}>Password</label><input style={authInputStyle} type="password" placeholder="••••••••" value={form.password} onChange={e=>set("password",e.target.value)}/></div>
        <button type="button" style={{ ...authPrimaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading} onClick={() => onAuth({ ...form, name: form.name||form.email.split("@")[0] })}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Free Account →"}
        </button>
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#A0A0A0", fontFamily: AUTH_FONT }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span role="button" tabIndex={0} style={{ color: "#FFFFFF", cursor: "pointer", fontWeight: 600 }} onClick={onToggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(); }}>{mode === "login" ? "Sign up free" : "Sign in"}</span>
        </p>
      </div>
    </div>
  );
}

// ─── CERTIFICATIONS (optional section — multi-entry) ──────────────
function CertificationsBuilderSection({ resume, setResume, certificationEditor, setCertificationEditor, onRemoveSection }) {
  const list = normalizeCertificationsArray(resume.certifications);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {list.length === 0 && !certificationEditor && (
        <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No certifications yet. Add one below.</p>
      )}
      {list.map((c, i) => (
        <div
          key={i}
          style={{
            background: "#1C1C1C",
            border: "1px solid #2A2A2A",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setCertificationEditor({ mode: "edit", index: i, draft: { ...EMPTY_CERT, ...c } })}
            style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#FFFFFF" }}>{c.name || "Certification"}</div>
                {c.issuer ? <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2 }}>{c.issuer}</div> : null}
              </div>
              {c.year ? (
                <span style={{ fontSize: 12, color: "#A0A0A0", flexShrink: 0, textAlign: "right" }}>{c.year}</span>
              ) : (
                <span style={{ width: 0, flexShrink: 0 }} />
              )}
            </div>
          </button>
          <button
            type="button"
            aria-label="Delete certification"
            onClick={(e) => {
              e.stopPropagation();
              setResume((r) => ({
                ...r,
                certifications: normalizeCertificationsArray(r.certifications).filter((_, j) => j !== i),
              }));
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
          </button>
        </div>
      ))}
      {certificationEditor && (
        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 8, padding: 16, display: "grid", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Name</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Certification name"
              value={certificationEditor.draft.name}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, name: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Issuer</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Issuing organisation (optional)"
              value={certificationEditor.draft.issuer}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, issuer: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Year</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Year (optional)"
              value={certificationEditor.draft.year}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, year: e.target.value } } : null))}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setCertificationEditor(null)}>Cancel</button>
            <button
              type="button"
              style={CB_UI.btn}
              onClick={() => {
                const { mode, index, draft } = certificationEditor;
                const next = { ...EMPTY_CERT, name: draft.name.trim(), issuer: draft.issuer.trim(), year: draft.year.trim() };
                if (!next.name) return;
                setResume((r) => {
                  const cur = normalizeCertificationsArray(r.certifications);
                  if (mode === "add") return { ...r, certifications: [...cur, next] };
                  const u = [...cur];
                  u[index] = next;
                  return { ...r, certifications: u };
                });
                setCertificationEditor(null);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="cvp-builder-add-entry-btn"
        style={{ ...CB_UI.btn, width: "100%", display: "block", marginBottom: 8 }}
        onClick={() => setCertificationEditor({ mode: "add", index: -1, draft: { ...EMPTY_CERT } })}
      >
        + Add Certification
      </button>
      <button
        type="button"
        style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }}
        onClick={onRemoveSection}
      >
        Remove section
      </button>
    </div>
  );
}

// ─── RESUME BUILDER ───────────────────────────────────────────────
const EASE = "cubic-bezier(0.4,0,0.2,1)";
function ResumeBuilder({ user, onBack, initialResume, initialResumeId, initialTemplateId }) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES.find(t => t.id === initialTemplateId) || TEMPLATES[0]);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [resumeId, setResumeId] = useState(initialResumeId || null);
  const [resume, setResume] = useState(() =>
    normalizeResumeForBuilder(initialResume || { ...EMPTY_RESUME, name: user?.name || "", email: user?.email || "" })
  );
  const [builderTab, setBuilderTab] = useState("content");
  const [openSection, setOpenSection] = useState(null);
  const [mobileView, setMobileView] = useState("edit");
  const [experienceEditor, setExperienceEditor] = useState(null);
  const [educationEditor, setEducationEditor] = useState(null);
  const [certificationEditor, setCertificationEditor] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [addSectionPickerOpen, setAddSectionPickerOpen] = useState(false);
  const previewScrollRef = useRef(null);
  const mobilePreviewScrollRef = useRef(null);
  const desktopPreviewFitRef = useRef(null);
  const mobilePreviewFitRef = useRef(null);
  const desktopCvPreviewRef = useRef(null);
  const mobileCvPreviewRef = useRef(null);
  const [desktopPreviewScale, setDesktopPreviewScale] = useState(1);
  const [mobilePreviewScale, setMobilePreviewScale] = useState(1);

  const measureFitWidth = (el) => {
    const w = el.getBoundingClientRect().width;
    if (w < 1) return null;
    return Math.min(1, w / A4_PREVIEW_WIDTH_PX);
  };

  useLayoutEffect(() => {
    const el = desktopPreviewFitRef.current;
    if (!el) return;
    const s = measureFitWidth(el);
    if (s != null) setDesktopPreviewScale(s);
  }, []);

  useLayoutEffect(() => {
    if (mobileView !== "preview") return;
    const el = mobilePreviewFitRef.current;
    if (!el) return;
    const s = measureFitWidth(el);
    if (s != null) setMobilePreviewScale(s);
  }, [mobileView]);

  useEffect(() => {
    const el = desktopPreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w < 1) continue;
        setDesktopPreviewScale(Math.min(1, w / A4_PREVIEW_WIDTH_PX));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (mobileView !== "preview") return;
    const el = mobilePreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w < 1) continue;
        setMobilePreviewScale(Math.min(1, w / A4_PREVIEW_WIDTH_PX));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mobileView]);

  useEffect(() => {
    previewScrollRef.current?.scrollTo(0, 0);
    mobilePreviewScrollRef.current?.scrollTo(0, 0);
  }, [selectedTemplate?.id]);

  const set = (k, v) => setResume(r => ({ ...r, [k]: v }));

  const score = (() => {
    let s = 0;
    if (resume.name) s += 8;
    if (resume.email) s += 8;
    if (resume.phone) s += 8;
    if (resume.title) s += 10;
    if (resume.nationality) s += 5;
    if (resume.visaStatus) s += 5;
    if (resume.summary?.length > 50) s += 16;
    if (resume.experience?.some((e) => e?.company)) s += 16;
    if (resume.skills?.length > 20) s += 12;
    if (normalizeCertificationsArray(resume.certifications).length > 0) s += 6;
    if (resume.languages) s += 6;
    return s;
  })();
  const scoreColor = score >= 80 ? C.success : score >= 50 ? C.gold : C.danger;

  const customizePanel = (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Template</div>
      <div style={{ display: "grid", gap: 8 }}>
        {TEMPLATES.map((t) => (
          <BuilderTemplateCard
            key={t.id}
            template={t}
            isSelected={selectedTemplate?.id === t.id}
            resume={resume}
            onSelect={setSelectedTemplate}
          />
        ))}
      </div>
    </div>
  );

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const saved = await saveResume(user.id, resume, selectedTemplate.id, resumeId);
      setResumeId(saved.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch(e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, resume, selectedTemplate, resumeId]);

  const handleDownload = async () => {
    setDownloading(true);
    if (user?.id) await handleSave();
    try {
      const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
      const wasMobileEdit = isMobileViewport && mobileView === "edit";
      if (wasMobileEdit) setMobileView("preview");
      await new Promise((r) => setTimeout(r, 300));

      const el = isMobileViewport ? mobileCvPreviewRef.current : desktopCvPreviewRef.current;
      if (!el) throw new Error("Preview not ready");
      await downloadResumeFromPreview(resume, el);

      if (wasMobileEdit) setMobileView("edit");
    } catch (e) {
      alert("PDF error: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const isOpen = (id) => openSection === id;
  const toggleSection = (id) => setOpenSection(s => s === id ? null : id);

  const builderExtraSectionIds = resume.builderExtraSectionIds || [];
  const availableOptionalSections = OPTIONAL_BUILDER_SECTIONS.filter((s) => !builderExtraSectionIds.includes(s.id));
  const allOptionalSectionsAdded = OPTIONAL_BUILDER_SECTIONS.every((s) => builderExtraSectionIds.includes(s.id));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "'DM Sans',sans-serif" }}>
      {/* Top nav bar — 56px, Download = only primary */}
      <header
        className="cvp-builder-topbar"
        style={{
          flexShrink: 0,
          height: 56,
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#0A0A0A",
          borderBottom: "1px solid #2A2A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, overflowX: "auto", flex: "1 1 auto", minWidth: 0 }}>
          <button type="button" onClick={onBack} aria-label="Back" className="cvp-builder-back" style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0, borderRadius: 8, border: "none", background: "transparent", color: "#A0A0A0", cursor: "pointer", display: "grid", placeItems: "center", transition: `color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {["content", "customize", "ats"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setBuilderTab(tab); setMobileView("edit"); }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: builderTab === tab ? "#1C1C1C" : "transparent",
                  color: builderTab === tab ? "#FFFFFF" : "#A0A0A0",
                  fontWeight: builderTab === tab ? 600 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: `background-color 150ms ${EASE}, color 150ms ${EASE}`,
                }}
              >
                {tab === "content" ? "Content" : tab === "customize" ? "Customise" : "ATS Check"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select value={selectedTemplate?.id} onChange={e => setSelectedTemplate(TEMPLATES.find(t => t.id === Number(e.target.value)) || TEMPLATES[0])} className="cvp-builder-topbar-template" style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2A2A2A", background: "#141414", color: "#FFFFFF", fontSize: 13, cursor: "pointer", minWidth: 140 }}>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" onClick={handleSave} disabled={saving} className="cvp-builder-topbar-save" style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #2A2A2A", background: "transparent", color: "#A0A0A0", fontSize: 14, cursor: saving ? "not-allowed" : "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; } }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#A0A0A0"; }}>
            {saving ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={handleDownload} disabled={downloading} className="cvp-builder-topbar-download" style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#FFFFFF", color: "#000000", fontSize: 14, fontWeight: 600, cursor: downloading ? "not-allowed" : "pointer", transition: `opacity 150ms ${EASE}` }} onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.opacity = "0.9"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            {downloading ? "..." : "Download"}
          </button>
        </div>
      </header>

      {/* Desktop: split 380px | 1fr — layout in index.css */}
      <div className="cvp-builder-desktop">
        {/* Left panel — Editor */}
        <aside className="cvp-builder-left">
          {builderTab === "content" && (
            <>
              {/* Personal info card — always visible */}
              <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
                <button type="button" aria-label="Edit" style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 999, border: "1px solid #2A2A2A", background: "#1C1C1C", color: "#A0A0A0", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <div style={{ display: "grid", gap: 10 }}>
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Full name" value={resume.name} onChange={e=>set("name",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Job title" value={resume.title} onChange={e=>set("title",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Email" value={resume.email} onChange={e=>set("email",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Phone" value={resume.phone} onChange={e=>set("phone",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Location" value={resume.location} onChange={e=>set("location",e.target.value)} />
                </div>
              </div>

              <div className="cvp-sections-list">
              <AccordionSection id="summary" title="Professional Summary" isOpen={isOpen("summary")} onToggle={() => toggleSection("summary")} icon="summary">
                <div>
                  <textarea style={{ ...CB_UI.input, height: 100, resize: "vertical" }} placeholder="2–3 lines summary..." value={resume.summary} onChange={e=>set("summary",e.target.value)} />
                </div>
              </AccordionSection>

              <AccordionSection id="experience" title="Professional Experience" isOpen={isOpen("experience")} onToggle={() => toggleSection("experience")} icon="experience">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{exp.role || "Job title"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{exp.company || "Company"}{exp.location ? ` · ${exp.location}` : ""}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildExperiencePeriod(exp) || exp.period || "Dates"}</div>
                      </button>
                      <button type="button" aria-label="Delete experience" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
                </div>
              </AccordionSection>

              <AccordionSection id="education" title="Education" isOpen={isOpen("education")} onToggle={() => toggleSection("education")} icon="education">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
                  )}
                  {resume.education.map((edu, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{edu.degree || "Degree"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{edu.school || "Institution"}</div>
                        {edu.fieldOfStudy ? <div style={{ fontSize: 12, color: "#888" }}>{edu.fieldOfStudy}</div> : null}
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildEducationYearLine(edu) || edu.year || ""}</div>
                      </button>
                      <button type="button" aria-label="Delete education" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
                </div>
              </AccordionSection>

              <AccordionSection id="skills" title="Core Competencies" isOpen={isOpen("skills")} onToggle={() => toggleSection("skills")} icon="skills">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.skills).map((sk, si) => (
                      <span key={`${sk}-${si}`} style={CB_UI.chip}>
                        {sk}
                        <button type="button" aria-label={`Remove ${sk}`} onClick={() => setResume(r => ({ ...r, skills: splitCommaItems(r.skills).filter((x) => x !== sk).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={{ ...CB_UI.input }} placeholder="Add a skill" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); } }} />
                    <button type="button" className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }} onClick={() => { const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); }}>+ Add</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Technical skills</label>
                    <input style={CB_UI.input} placeholder="e.g. Python, SQL" value={resume.technicalSkills} onChange={e=>set("technicalSkills",e.target.value)} />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection id="languages" title="Languages" isOpen={isOpen("languages")} onToggle={() => toggleSection("languages")} icon="languages">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 120 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              {OPTIONAL_BUILDER_SECTIONS.filter((opt) => resume.builderExtraSectionIds?.includes(opt.id)).map((opt) => (
                <AccordionSection key={opt.id} id={opt.id} title={opt.label} isOpen={isOpen(opt.id)} onToggle={() => toggleSection(opt.id)} icon={opt.id}>
                  {opt.id === "certifications" ? (
                    <CertificationsBuilderSection
                      resume={resume}
                      setResume={setResume}
                      certificationEditor={certificationEditor}
                      setCertificationEditor={setCertificationEditor}
                      onRemoveSection={() => {
                        setCertificationEditor(null);
                        setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }));
                      }}
                    />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opt.multiline ? (
                        <textarea style={{ ...CB_UI.input, minHeight: 100, resize: "vertical" }} placeholder={opt.label} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      ) : (
                        <input style={CB_UI.input} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      )}
                      <button type="button" style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }))}>Remove section</button>
                    </div>
                  )}
                </AccordionSection>
              ))}
              </div>

              {builderTab === "content" && (
                <button type="button" onClick={() => setAddSectionPickerOpen(true)} className="cvp-builder-add-section" style={{ width: "100%", height: 44, padding: 0, borderRadius: 12, border: "1px dashed #333333", background: "transparent", color: "#A0A0A0", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#A0A0A0"; }}>+ Add section</button>
              )}
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "6px 16px", borderRadius: 100, background: "#141414", border: "1px solid #2A2A2A" }}>
                  <button type="button" aria-label="Undo" style={{ background: "none", border: "none", color: "#A0A0A0", cursor: "pointer", padding: 4 }}>↩</button>
                  <button type="button" aria-label="Redo" style={{ background: "none", border: "none", color: "#A0A0A0", cursor: "pointer", padding: 4 }}>↪</button>
                </div>
              </div>
            </>
          )}
          {builderTab === "customize" && customizePanel}
          {builderTab === "ats" && (
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor, marginBottom: 8 }}>{score}%</div>
              <div style={{ fontSize: 13, color: "#A0A0A0" }}>ATS readiness score. Add more sections and keywords to improve.</div>
            </div>
          )}
        </aside>

        {/* Right panel — Live Preview; scale-to-fit (794px A4) */}
        <div className="cvp-builder-preview" ref={previewScrollRef}>
          <BuilderA4PreviewScaled
            cv={resume}
            template={selectedTemplate}
            scale={desktopPreviewScale}
            fitRef={desktopPreviewFitRef}
            padded={false}
            previewCardRef={desktopCvPreviewRef}
          />
        </div>
      </div>

      {/* Mobile: single column + Edit | Preview pill */}
      <div className="cvp-builder-mobile" style={{ display: "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {mobileView === "edit" ? (
          <div className="cvp-builder-mobile-form">
            {builderTab === "content" && (
              <>
                <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Full name" value={resume.name} onChange={e=>set("name",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Job title" value={resume.title} onChange={e=>set("title",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Email" value={resume.email} onChange={e=>set("email",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Phone" value={resume.phone} onChange={e=>set("phone",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Location" value={resume.location} onChange={e=>set("location",e.target.value)} />
                  </div>
                </div>
                <div className="cvp-sections-list">
              <AccordionSection id="summary" title="Professional Summary" isOpen={isOpen("summary")} onToggle={() => toggleSection("summary")} icon="summary">
                <div>
                  <textarea style={{ ...CB_UI.input, height: 100, resize: "vertical" }} placeholder="2–3 lines summary..." value={resume.summary} onChange={e=>set("summary",e.target.value)} />
                </div>
              </AccordionSection>

              <AccordionSection id="experience" title="Professional Experience" isOpen={isOpen("experience")} onToggle={() => toggleSection("experience")} icon="experience">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{exp.role || "Job title"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{exp.company || "Company"}{exp.location ? ` · ${exp.location}` : ""}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildExperiencePeriod(exp) || exp.period || "Dates"}</div>
                      </button>
                      <button type="button" aria-label="Delete experience" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
                </div>
              </AccordionSection>

              <AccordionSection id="education" title="Education" isOpen={isOpen("education")} onToggle={() => toggleSection("education")} icon="education">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
                  )}
                  {resume.education.map((edu, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{edu.degree || "Degree"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{edu.school || "Institution"}</div>
                        {edu.fieldOfStudy ? <div style={{ fontSize: 12, color: "#888" }}>{edu.fieldOfStudy}</div> : null}
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildEducationYearLine(edu) || edu.year || ""}</div>
                      </button>
                      <button type="button" aria-label="Delete education" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
                </div>
              </AccordionSection>

              <AccordionSection id="skills" title="Core Competencies" isOpen={isOpen("skills")} onToggle={() => toggleSection("skills")} icon="skills">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.skills).map((sk, si) => (
                      <span key={`${sk}-${si}`} style={CB_UI.chip}>
                        {sk}
                        <button type="button" aria-label={`Remove ${sk}`} onClick={() => setResume(r => ({ ...r, skills: splitCommaItems(r.skills).filter((x) => x !== sk).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={{ ...CB_UI.input }} placeholder="Add a skill" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); } }} />
                    <button type="button" className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }} onClick={() => { const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); }}>+ Add</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Technical skills</label>
                    <input style={CB_UI.input} placeholder="e.g. Python, SQL" value={resume.technicalSkills} onChange={e=>set("technicalSkills",e.target.value)} />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection id="languages" title="Languages" isOpen={isOpen("languages")} onToggle={() => toggleSection("languages")} icon="languages">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 120 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              {OPTIONAL_BUILDER_SECTIONS.filter((opt) => resume.builderExtraSectionIds?.includes(opt.id)).map((opt) => (
                <AccordionSection key={opt.id} id={opt.id} title={opt.label} isOpen={isOpen(opt.id)} onToggle={() => toggleSection(opt.id)} icon={opt.id}>
                  {opt.id === "certifications" ? (
                    <CertificationsBuilderSection
                      resume={resume}
                      setResume={setResume}
                      certificationEditor={certificationEditor}
                      setCertificationEditor={setCertificationEditor}
                      onRemoveSection={() => {
                        setCertificationEditor(null);
                        setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }));
                      }}
                    />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opt.multiline ? (
                        <textarea style={{ ...CB_UI.input, minHeight: 100, resize: "vertical" }} placeholder={opt.label} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      ) : (
                        <input style={CB_UI.input} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      )}
                      <button type="button" style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }))}>Remove section</button>
                    </div>
                  )}
                </AccordionSection>
              ))}
                </div>
                {builderTab === "content" && (
                  <button type="button" onClick={() => setAddSectionPickerOpen(true)} className="cvp-builder-add-section" style={{ width: "100%", height: 44, padding: 0, borderRadius: 12, border: "1px dashed #333333", background: "transparent", color: "#A0A0A0", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#A0A0A0"; }}>+ Add section</button>
                )}
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "6px 16px", borderRadius: 100, background: "#141414", border: "1px solid #2A2A2A" }}>
                    <button type="button" aria-label="Undo" style={{ background: "none", border: "none", color: "#A0A0A0", cursor: "pointer", padding: 4 }}>↩</button>
                    <button type="button" aria-label="Redo" style={{ background: "none", border: "none", color: "#A0A0A0", cursor: "pointer", padding: 4 }}>↪</button>
                  </div>
                </div>
              </>
            )}
            {builderTab === "customize" && customizePanel}
            {builderTab === "ats" && <div style={{ padding: 12 }}><div style={{ fontSize: 20, fontWeight: 800, color: scoreColor, marginBottom: 8 }}>{score}%</div><div style={{ fontSize: 13, color: "#A0A0A0" }}>ATS readiness score.</div></div>}
          </div>
        ) : (
          <div
            ref={mobilePreviewScrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              background: "#111111",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "16px 0",
            }}
          >
            <BuilderA4PreviewScaled
              cv={resume}
              template={selectedTemplate}
              scale={mobilePreviewScale}
              fitRef={mobilePreviewFitRef}
              padded
              previewCardRef={mobileCvPreviewRef}
            />
          </div>
        )}
        <div className="cvp-builder-bottom-bar">
          <div className="cvp-builder-toggle-pill">
            <button type="button" onClick={() => setMobileView("edit")} className={mobileView === "edit" ? "cvp-toggle-active" : "cvp-toggle-inactive"}>Edit</button>
            <button type="button" onClick={() => setMobileView("preview")} className={mobileView === "preview" ? "cvp-toggle-active" : "cvp-toggle-inactive"}>Preview</button>
          </div>
          <div className="cvp-builder-mobile-download">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: 15,
                fontWeight: 700,
                cursor: downloading ? "not-allowed" : "pointer",
                transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {downloading ? "Preparing..." : "Download CV"}
            </button>
          </div>
        </div>
      </div>

      {experienceEditor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setExperienceEditor(null)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>{experienceEditor.mode === "add" ? "Add experience" : "Edit experience"}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Company name</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.company} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, company: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Job title</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.role} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, role: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Start (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} placeholder="01/2020" value={experienceEditor.draft.startDate} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: e.target.value } } : null))} /></div>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>End (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} placeholder="12/2023" disabled={experienceEditor.draft.present} value={experienceEditor.draft.endDate} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: e.target.value } } : null))} /></div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#FFF", cursor: "pointer" }}>
                <input type="checkbox" checked={experienceEditor.draft.present} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, present: e.target.checked, endDate: e.target.checked ? "" : ev.draft.endDate } } : null))} />
                Present (current role)
              </label>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Location (City, Country)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.location} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Description (bullet points, one per line)</label><textarea style={{ ...CB_UI.input, marginTop: 4, minHeight: 100, resize: "vertical" }} value={experienceEditor.draft.points} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: e.target.value } } : null))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setExperienceEditor(null)}>Cancel</button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const { mode, index, draft } = experienceEditor;
                  const next = { ...draft, period: buildExperiencePeriod({ ...draft, present: draft.present }) };
                  setResume((r) => {
                    if (mode === "add") return { ...r, experience: [...r.experience, next] };
                    const u = [...r.experience];
                    u[index] = next;
                    return { ...r, experience: u };
                  });
                  setExperienceEditor(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {educationEditor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setEducationEditor(null)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>{educationEditor.mode === "add" ? "Add education" : "Edit education"}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Institution name</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.school} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, school: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Degree / qualification</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.degree} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, degree: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Field of study</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.fieldOfStudy || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, fieldOfStudy: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Start (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.startDate || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: e.target.value } } : null))} /></div>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>End (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.endDate || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: e.target.value } } : null))} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Location (optional)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.location || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setEducationEditor(null)}>Cancel</button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const { mode, index, draft } = educationEditor;
                  const next = { ...draft, year: buildEducationYearLine(draft) };
                  setResume((r) => {
                    if (mode === "add") return { ...r, education: [...r.education, next] };
                    const u = [...r.education];
                    u[index] = next;
                    return { ...r, education: u };
                  });
                  setEducationEditor(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {addSectionPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setAddSectionPickerOpen(false)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 400, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>Add optional section</h3>
            <p style={{ fontSize: 13, color: "#A0A0A0", margin: "0 0 16px" }}>Choose a section to add to your CV.</p>
            <div style={{ display: "grid", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
              {availableOptionalSections.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={{ ...CB_UI.btn, width: "100%", textAlign: "left" }}
                  onClick={() => {
                    setResume((r) => ({
                      ...r,
                      builderExtraSectionIds: [...new Set([...(r.builderExtraSectionIds || []), opt.id])],
                    }));
                    setOpenSection(opt.id);
                  }}
                >
                  + {opt.label}
                </button>
              ))}
              {availableOptionalSections.length === 0 && (
                <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>
                  {allOptionalSectionsAdded ? "All optional sections have been added." : "No sections available."}
                </p>
              )}
            </div>
            <button type="button" style={{ ...CB_UI.btn, marginTop: 16, width: "100%", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setAddSectionPickerOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Accordion row inside .cvp-sections-list — unified list style
function AccordionSection({ id, title, isOpen, onToggle, icon, children }) {
  const ease = "cubic-bezier(0.4,0,0.2,1)";
  return (
    <div className={`cvp-section-row${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="cvp-section-row-header"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 16,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          borderLeft: isOpen ? "2px solid #FFFFFF" : "2px solid transparent",
          transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ width: 16, height: 16, display: "grid", placeItems: "center", color: "#A0A0A0", flexShrink: 0 }}>
            {icon === "summary" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>}
            {icon === "experience" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
            {icon === "education" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>}
            {icon === "skills" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
            {icon === "languages" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
            {icon === "certifications" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15l-2 2 2 2 2-2-2-2z" /><path d="M4 4h16v16H4z" /></svg>}
            {icon === "projects" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>}
            {icon === "volunteer" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
            {icon === "publications" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", letterSpacing: "0.02em" }}>{title}</span>
        </div>
        <span style={{ color: "#A0A0A0", display: "grid", placeItems: "center", transition: `transform 300ms ${ease}`, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: `grid-template-rows 300ms ${ease}`,
        }}
      >
        <div style={{ overflow: isOpen ? "visible" : "hidden" }}>
          <div
            className="cvp-section-row-content"
            style={{
              opacity: isOpen ? 1 : 0,
              transition: `opacity 300ms ${ease}`,
              padding: 16,
              background: "#141414",
              borderTop: "1px solid #2A2A2A",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Resume strength: count filled fields and return 0–100
function getStrength(cv) {
  if (!cv || typeof cv !== "object") return 0;
  const fields = [
    cv.name, cv.title, cv.email, cv.phone, cv.location, cv.summary,
    cv.skills, cv.languages, cv.nationality, cv.visaStatus,
    Array.isArray(cv.experience) && cv.experience.some(e => e?.company || e?.role),
    Array.isArray(cv.education) && cv.education.some(e => e?.school || e?.degree),
  ];
  const filled = fields.filter(Boolean).length;
  return Math.min(100, Math.round((filled / 12) * 100));
}

// ─── MAIN APP ─────────────────────────────────────────────────────
const extractName = u => u.user_metadata?.name || u.user_metadata?.full_name || u.email.split("@")[0];

export default function App() {
  const [page, setPage]             = useState("landing");
  const [authMode, setAuthMode]     = useState("signup");
  const [user, setUser]             = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]   = useState(null);
  const [editingResume, setEditingResume] = useState(null);
  const [resumeList, setResumeList] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [resume, setResume] = useState(EMPTY_RESUME);
  // eslint-disable-next-line no-unused-vars
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);

  useEffect(() => {
    if (!user?.id) return;
    loadUserResumes(user.id)
      .then(data => setResumeList(data || []))
      .catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser({ name: extractName(session.user), email: session.user.email, id: session.user.id }); setPage("dashboard"); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setUser(prev => ({ name: prev?.name||extractName(session.user), email: session.user.email, id: session.user.id }));
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (userData) => {
    if (!supabase) return;
    setAuthError(null); setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: userData.email, password: userData.password, options: { data: { name: userData.name } } });
        if (error) throw error;
        if (data.user) { setUser({ name: userData.name, email: data.user.email, id: data.user.id }); setPage("dashboard"); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: userData.email, password: userData.password });
        if (error) throw error;
        setUser({ name: extractName(data.user), email: data.user.email, id: data.user.id }); setPage("dashboard");
      }
    } catch(err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setPage("landing"); };

  const handleEditResume  = (record) => { setEditingResume(record); setPage("builder"); };
  const handleNewResume   = ()       => { setEditingResume(null);   setPage("builder"); };

  return (
    <div style={S.app}>
      {page !== "landing" && (
      <nav className="cvp-app-nav" style={S.nav}>
        <div style={{ ...S.logo, display: "flex", alignItems: "center", gap: "8px" }} onClick={() => setPage("landing")} role="button" tabIndex={0}>
          <FalconLogo width={28} height={28} style={{ display: "block", flexShrink: 0, color: "#FFFFFF", background: "none", border: "none", boxShadow: "none" }} aria-hidden="true" />
          CVPassport
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {user ? (
            <>
              <span style={{ color: C.muted, fontSize: "14px" }}>Hi, {user.name}</span>
              <button style={S.btn("outline","sm")} onClick={() => setPage("ats")}>ATS Checker</button>
              <button style={S.btn("outline","sm")} onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <button style={S.btn("outline","sm")} onClick={() => { setAuthMode("login"); setPage("auth"); }}>Sign In</button>
              <button style={S.btn("primary","sm")} onClick={() => { setAuthMode("signup"); setPage("auth"); }}>Get Started</button>
            </>
          )}
        </div>
      </nav>
      )}
{page === "landing" && <LandingPage onLogin={() => { setAuthMode("login"); setPage("auth"); }} onSignup={() => { setAuthMode("signup"); setPage("auth"); }} setPage={setPage} onWalkIn={() => setPage('walkin')} />}
{page === "walkin" && <WalkInPage onBack={() => setPage("landing")} onComplete={() => setPage("builder")} setResume={setResume} setSelectedTemplate={setSelectedTemplate} />}
{page === "auth" && <AuthPage mode={authMode} onAuth={handleAuth} onToggle={() => { setAuthMode(m => m === "login" ? "signup" : "login"); setAuthError(null); }} loading={authLoading} error={authError}/>}
{page === "dashboard" && user && (
  <Dashboard
    theme={document.documentElement.classList.contains("light") ? "light" : "dark"}
    user={user}
    resumeList={resumeList}
    getStrength={(r) => getStrength(r?.cv_data || r)}
    renderThumb={(r) => (
      <div className="cvp-thumb-inner">
        <ResumePreview cv={r?.cv_data || EMPTY_RESUME} template={TEMPLATES.find(t => t.id === r?.template_id) || TEMPLATES[0]} />
      </div>
    )}
    onBuildResume={handleNewResume}
    onEditResume={handleEditResume}
    onDelete={async (resumeId) => {
      try {
        await deleteResume(resumeId, user.id);
        setResumeList(prev => prev.filter(r => r.id !== resumeId));
      } catch (e) {
        alert("Error deleting resume");
      }
    }}
    onRunATS={() => setPage("ats")}
    onWalkIn={() => setPage("walkin")}
    onTemplates={() => {}}
    onGoHome={() => setPage("landing")}
  />
)}
{page === "builder" && (
  <ResumeBuilder
    user={user}
    onBack={() => setPage(user ? "dashboard" : "landing")}
    initialResume={editingResume?.cv_data || null}
    initialResumeId={editingResume?.id || null}
    initialTemplateId={editingResume?.template_id || null}
  />
)}
{page === "ats" && <ATSChecker onBack={() => setPage(user ? "dashboard" : "landing")} />}
<MobileTabBar page={page} setPage={setPage} user={user} />
<Analytics />
</div>
);
}