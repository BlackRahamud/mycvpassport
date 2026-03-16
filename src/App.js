import { Analytics } from "@vercel/analytics/react";
import { useState, useEffect, useCallback } from "react";
import LandingGlobe from "./LandingGlobe";
import { supabase } from "./supabaseClient";
import ATSChecker from "./ATSChecker";
import { PreviewGulfExecutive,    pdfGulfExecutive    } from "./Template5GulfExecutive";
import { PreviewBankingFinance,   pdfBankingFinance   } from "./Template6BankingFinance";
import { PreviewCompactPro,       pdfCompactPro       } from "./Template7CompactPro";
import { PreviewCreativeSidebar,  pdfCreativeSidebar  } from "./Template8CreativeSidebar";
import { PreviewHospitality,      pdfHospitality      } from "./Template9Hospitality";
import { PreviewATSInternational, pdfATSInternational } from "./Template10ATSInternational";
import { PreviewTechITPro,        pdfTechITPro        } from "./Template11TechITPro";

// ─── TEMPLATES ───────────────────────────────────────────────────
const TEMPLATES = [
  { id: 1,  name: "Gulf Classic",         tier: "free",    color: "#1a1a2e", accent: "#e94560", desc: "Bold banner header",              layout: "banner"      },
  { id: 2,  name: "Dubai Modern",         tier: "free",    color: "#0f3460", accent: "#00b4d8", desc: "Two-column split",                layout: "twocol"      },
  { id: 3,  name: "Arabia Pro",           tier: "free",    color: "#1a1a2e", accent: "#C9A84C", desc: "Sidebar with skills column",      layout: "sidebar"     },
  { id: 4,  name: "Executive Gold",       tier: "premium", color: "#1a0a00", accent: "#d4a017", desc: "Timeline experience style",       layout: "timeline"    },
  { id: 5,  name: "Gulf Executive",       tier: "premium", color: "#0D1B2A", accent: "#C9A84C", desc: "Dark navy with gold accents",     layout: "gulf-exec"   },
  { id: 6,  name: "Banking & Finance",    tier: "premium", color: "#000000", accent: "#000000", desc: "Ultra-clean ATS-first serif",     layout: "banking"     },
  { id: 7,  name: "Compact Pro",          tier: "premium", color: "#14213D", accent: "#0D7377", desc: "Dense teal layout, max content",  layout: "compact-pro" },
  { id: 8,  name: "Creative Sidebar",     tier: "premium", color: "#2D2D2D", accent: "#E8533F", desc: "Coral sidebar for Sales/RE",      layout: "creative"    },
  { id: 9,  name: "Hospitality & Service",tier: "premium", color: "#6B4C3B", accent: "#6B4C3B", desc: "Warm tone for hotels & F&B",      layout: "hospitality" },
  { id: 10, name: "ATS International",    tier: "premium", color: "#000000", accent: "#333333", desc: "Pure ATS — zero colour, max score",layout: "ats-intl"   },
  { id: 11, name: "Tech & IT Pro",        tier: "premium", color: "#1E2D45", accent: "#4A90D9", desc: "Dark slate sidebar for tech roles",layout: "tech-it"    },
];

const EMPTY_RESUME = {
  // Personal
  name: "", email: "", phone: "", location: "Dubai, UAE",
  title: "", summary: "",
  // Gulf-specific personal
  nationality: "", visaStatus: "", dob: "", gender: "", maritalStatus: "",
  // Experience
  experience: [{ company: "", role: "", location: "", period: "", points: "" }],
  // Education
  education: [{ school: "", degree: "", year: "" }],
  // Skills & extras
  skills: "", languages: "English, Hindi",
  certifications: "",
  technicalSkills: "",
  // Additional
  availability: "Immediately Available",
  drivingLicense: "",
  willingToRelocate: "Yes",
  references: "References available upon request",
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  bg: "#050505",
  surface: "#101010",
  card: "#151515",
  border: "#262626",
  accent: "#f5f5f5",
  gold: "#e5e5e5",
  text: "#f5f5f5",
  muted: "#9b9b9b",
  success: "#d4d4d4",
  danger: "#a3a3a3",
};

const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
  btn: (v = "primary", sz = "md") => ({
    padding: sz === "lg" ? "14px 32px" : sz === "sm" ? "8px 16px" : "10px 22px",
    borderRadius: "10px", cursor: "pointer", fontWeight: "600",
    fontSize: sz === "lg" ? "16px" : sz === "sm" ? "13px" : "14px",
    transition: "all 0.2s",
    background: v === "primary" ? `linear-gradient(135deg,${C.accent},#8b5cf6)`
      : v === "gold" ? `linear-gradient(135deg,${C.gold},#f97316)`
      : v === "outline" ? "transparent"
      : v === "danger" ? C.danger
      : v === "success" ? C.success : C.surface,
    color: v === "outline" ? C.accent : "#fff",
    border: v === "outline" ? `1px solid ${C.accent}` : "none",
    boxShadow: v === "primary" ? "0 4px 20px rgba(99,102,241,0.3)" : "none",
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
  const { data, error } = await supabase.from("cvs").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function deleteResume(resumeId, userId) {
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
                {e.points && <p style={{ fontSize: "10px", color: "#555", margin: 0, lineHeight: "1.6" }}>{e.points}</p>}
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
    <div style={{ background: "#fff", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial,sans-serif", color: "#222", display: "flex", minHeight: "500px", fontSize: "11px" }}>
      {/* Left sidebar */}
      <div style={{ width: "34%", background: t.color, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>
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
                {e.points && <p style={{ fontSize: "10px", color: "#555", margin: 0, lineHeight: "1.5" }}>{e.points}</p>}
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
    <div style={{ background: "#fff", borderRadius: "10px", overflow: "hidden", fontFamily: "'Trebuchet MS',sans-serif", color: "#222", display: "flex", fontSize: "11px" }}>
      {/* Sidebar */}
      <div style={{ width: "28%", background: t.color, padding: "22px 14px" }}>
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
                {e.points && <p style={{ fontSize: "10px", color: "#555", margin: 0, lineHeight: "1.5" }}>{e.points}</p>}
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
                  {e.points && <p style={{ fontSize: "10px", color: "#555", margin: 0, lineHeight: "1.6" }}>{e.points}</p>}
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
  if (t.layout === "twocol")      return <PreviewTwoCol          cv={cv} t={t} />;
  if (t.layout === "sidebar")     return <PreviewSidebar         cv={cv} t={t} />;
  if (t.layout === "timeline")    return <PreviewTimeline        cv={cv} t={t} />;
  if (t.layout === "gulf-exec")   return <PreviewGulfExecutive   cv={cv} t={t} />;
  if (t.layout === "banking")     return <PreviewBankingFinance  cv={cv} t={t} />;
  if (t.layout === "compact-pro") return <PreviewCompactPro      cv={cv} t={t} />;
  if (t.layout === "creative")    return <PreviewCreativeSidebar cv={cv} t={t} />;
  if (t.layout === "hospitality") return <PreviewHospitality     cv={cv} t={t} />;
  if (t.layout === "ats-intl")    return <PreviewATSInternational cv={cv} t={t} />;
  if (t.layout === "tech-it")     return <PreviewTechITPro       cv={cv} t={t} />;
  return <PreviewBanner cv={cv} t={t} />;
}

// ─── PDF DOWNLOAD ─────────────────────────────────────────────────
async function downloadResume(cv, template) {
  const t = template || TEMPLATES[0];

  // ── Delegate to dedicated PDF renderers for T5–T11 ──
  if (t.layout === "gulf-exec")    return pdfGulfExecutive(cv, t);
  if (t.layout === "banking")      return pdfBankingFinance(cv, t);
  if (t.layout === "compact-pro")  return pdfCompactPro(cv, t);
  if (t.layout === "creative")     return pdfCreativeSidebar(cv, t);
  if (t.layout === "hospitality")  return pdfHospitality(cv, t);
  if (t.layout === "ats-intl")     return pdfATSInternational(cv, t);
  if (t.layout === "tech-it")      return pdfTechITPro(cv, t);

  // ── Built-in jsPDF renderer for T1–T4 ──
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18;
  const hex2rgb = h => { const x = h.replace("#", ""); return [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)]; };
  const [ar, ag, ab] = hex2rgb(t.accent);
  const [cr, cg, cb] = hex2rgb(t.color);

  const sectionTitle = (title, y) => {
    doc.setDrawColor(ar,ag,ab); doc.setLineWidth(0.4); doc.line(M, y, W-M, y); y += 4;
    doc.setTextColor(ar,ag,ab); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text(title.toUpperCase(), M, y); y += 5;
    doc.setTextColor(40,40,40); doc.setFont("helvetica","normal");
    return y;
  };

  // Gulf info line helper
  const gulfLine = () => {
    const parts = [];
    if (cv.nationality) parts.push(`Nationality: ${cv.nationality}`);
    if (cv.visaStatus)  parts.push(`Visa: ${cv.visaStatus}`);
    if (cv.dob)         parts.push(`DOB: ${cv.dob}`);
    if (cv.gender)      parts.push(`Gender: ${cv.gender}`);
    if (cv.maritalStatus) parts.push(`Marital: ${cv.maritalStatus}`);
    return parts.join("   |   ");
  };

  if (t.layout === "twocol" || t.layout === "sidebar") {
    const sideW = t.layout === "sidebar" ? 58 : 68;
    doc.setFillColor(cr,cg,cb); doc.rect(0,0,sideW,297,"F");

    // Name & title
    doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont("helvetica","bold");
    const nameLines = doc.splitTextToSize(cv.name||"Your Name", sideW-10);
    doc.text(nameLines, 7, 18);
    doc.setTextColor(ar,ag,ab); doc.setFontSize(9); doc.setFont("helvetica","bolditalic");
    const titleLines = doc.splitTextToSize(cv.title||"Job Title", sideW-10);
    doc.text(titleLines, 7, 18 + nameLines.length*6);

    let sy = 18 + nameLines.length*6 + titleLines.length*5 + 6;

    const sideSection = (label) => {
      doc.setTextColor(ar,ag,ab); doc.setFontSize(7); doc.setFont("helvetica","bold");
      doc.text(label.toUpperCase(), 7, sy); sy += 3;
      doc.setDrawColor(ar,ag,ab); doc.setLineWidth(0.2); doc.line(7, sy, sideW-4, sy); sy += 4;
      doc.setTextColor(200,200,200); doc.setFont("helvetica","normal"); doc.setFontSize(7);
    };

    sideSection("Contact");
    if(cv.email){const l=doc.splitTextToSize(cv.email,sideW-12);doc.text(l,7,sy);sy+=l.length*3.5+2;}
    if(cv.phone){doc.text(cv.phone,7,sy);sy+=5;}
    if(cv.location){doc.text(cv.location,7,sy);sy+=7;}

    // Personal info section
    if(cv.nationality||cv.visaStatus||cv.dob||cv.gender||cv.maritalStatus){
      sideSection("Personal Info");
      if(cv.nationality){doc.text(`Nationality: ${cv.nationality}`,7,sy);sy+=4.5;}
      if(cv.visaStatus){doc.text(`Visa: ${cv.visaStatus}`,7,sy);sy+=4.5;}
      if(cv.dob){doc.text(`DOB: ${cv.dob}`,7,sy);sy+=4.5;}
      if(cv.gender){doc.text(cv.gender,7,sy);sy+=4.5;}
      if(cv.maritalStatus){doc.text(cv.maritalStatus,7,sy);sy+=6;}
    }

    if(cv.skills){sideSection("Core Skills");cv.skills.split(",").forEach(sk=>{if(!sk.trim())return;const l=doc.splitTextToSize("• "+sk.trim(),sideW-12);doc.text(l,7,sy);sy+=l.length*3.5+1.5;});sy+=3;}
    if(cv.languages){sideSection("Languages");cv.languages.split(",").forEach(lg=>{doc.text("• "+lg.trim(),7,sy);sy+=4.5;});sy+=3;}
    if(cv.certifications){sideSection("Certifications");cv.certifications.split(",").forEach(c=>{if(!c.trim())return;const l=doc.splitTextToSize("• "+c.trim(),sideW-12);doc.text(l,7,sy);sy+=l.length*3.5+1.5;});sy+=3;}
    if(cv.education.some(e=>e.school)){
      sideSection("Education");
      cv.education.filter(e=>e.school).forEach(e=>{
        doc.setFont("helvetica","bold");doc.setTextColor(ar,ag,ab);doc.text(e.year||"",7,sy);sy+=3.5;
        doc.setTextColor(220,220,220);doc.setFont("helvetica","normal");
        const dl=doc.splitTextToSize(e.degree,sideW-12);doc.text(dl,7,sy);sy+=dl.length*3.5+1;
        const sl=doc.splitTextToSize(e.school,sideW-12);doc.text(sl,7,sy);sy+=sl.length*3.5+4;
      });
    }
    if(cv.availability||cv.drivingLicense||cv.willingToRelocate){
      sideSection("Additional");
      if(cv.availability){doc.text(cv.availability,7,sy);sy+=4;}
      if(cv.drivingLicense){doc.text("License: "+cv.drivingLicense,7,sy);sy+=4;}
      if(cv.willingToRelocate){doc.text("Relocate: "+cv.willingToRelocate,7,sy);sy+=4;}
    }

    // Right column
    let ry = 14; const rx = sideW+8, rw = W-sideW-14;
    const rightSection=(label)=>{
      doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(ar,ag,ab);
      doc.text(label,rx,ry);ry+=2;
      doc.setDrawColor(ar,ag,ab);doc.line(rx,ry,rx+rw,ry);ry+=5;
    };

    if(cv.summary){rightSection("PROFESSIONAL SUMMARY");doc.setFont("helvetica","normal");doc.setTextColor(60,60,60);doc.setFontSize(8);const sl=doc.splitTextToSize(cv.summary,rw);doc.text(sl,rx,ry);ry+=sl.length*4+7;}
    if(cv.experience.some(e=>e.company)){
      rightSection("WORK EXPERIENCE");
      cv.experience.filter(e=>e.company).forEach(e=>{
        doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(40,40,40);doc.text(e.role||"",rx,ry);
        doc.setFont("helvetica","italic");doc.setFontSize(7);doc.setTextColor(120,120,120);doc.text(e.period||"",W-M,ry,{align:"right"});ry+=4.5;
        doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(ar,ag,ab);
        const compStr = e.company+(e.location?` · ${e.location}`:"");
        doc.text(compStr,rx,ry);ry+=4.5;
        if(e.points){doc.setFont("helvetica","normal");doc.setTextColor(70,70,70);doc.setFontSize(7.5);const pl=doc.splitTextToSize(e.points,rw);doc.text(pl,rx,ry);ry+=pl.length*3.5+3;}
        ry+=2;
      });
    }
    if(cv.technicalSkills){rightSection("TECHNICAL SKILLS");doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.technicalSkills,rw);doc.text(sl,rx,ry);ry+=sl.length*3.5+6;}
    if(cv.references){doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(140,140,140);doc.text(cv.references,rx,ry);}

  } else if (t.layout === "timeline") {
    doc.setFillColor(ar,ag,ab); doc.rect(0,0,W,1.5,"F");
    doc.setTextColor(cr,cg,cb); doc.setFontSize(20); doc.setFont("helvetica","bold"); doc.text(cv.name||"Your Name",M,14);
    doc.setTextColor(ar,ag,ab); doc.setFontSize(10); doc.setFont("helvetica","bolditalic"); doc.text(cv.title||"Job Title",M,21);
    doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,100);
    doc.text([cv.email,cv.phone,cv.location].filter(Boolean).join("   |   "),M,27);
    const gl = gulfLine();
    if(gl){doc.text(gl,M,32);doc.setDrawColor(ar,ag,ab);doc.setLineWidth(0.8);doc.line(M,35,W-M,35);}
    else{doc.setDrawColor(ar,ag,ab);doc.setLineWidth(0.8);doc.line(M,30,W-M,30);}

    let y = gl ? 42 : 38;
    if(cv.summary){doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(70,70,70);const sl=doc.splitTextToSize(cv.summary,W-M*2);doc.text(sl,M,y);y+=sl.length*4+8;}
    if(cv.skills){y=sectionTitle("Core Skills",y);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.skills,W-M*2);doc.text(sl,M,y);y+=sl.length*4+6;}
    if(cv.experience.some(e=>e.company)){
      y=sectionTitle("Work Experience",y);
      const lineX=M+3;
      cv.experience.filter(e=>e.company).forEach(e=>{
        doc.setFillColor(ar,ag,ab);doc.circle(lineX,y+1,1.5,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(40,40,40);doc.text(e.role||"",lineX+5,y+2);
        doc.setFont("helvetica","italic");doc.setFontSize(7);doc.setTextColor(120,120,120);doc.text(e.period||"",W-M,y+2,{align:"right"});
        doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(ar,ag,ab);
        const compStr=e.company+(e.location?` · ${e.location}`:"");
        doc.text(compStr,lineX+5,y+7);y+=10;
        if(e.points){doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(70,70,70);const pl=doc.splitTextToSize(e.points,W-M*2-8);doc.text(pl,lineX+5,y);y+=pl.length*3.5+2;}
        y+=5;
      });
    }
    if(cv.education.some(e=>e.school)){y=sectionTitle("Education",y);cv.education.filter(e=>e.school).forEach(e=>{doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(40,40,40);doc.text(e.degree||"",M,y);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(100,100,100);doc.text(e.school||"",M,y+4.5);doc.text(e.year||"",W-M,y,{align:"right"});y+=11;});}
    if(cv.certifications){y=sectionTitle("Certifications",y);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.certifications,W-M*2);doc.text(sl,M,y);y+=sl.length*4+5;}
    if(cv.technicalSkills){y=sectionTitle("Technical Skills",y);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.technicalSkills,W-M*2);doc.text(sl,M,y);y+=sl.length*4+5;}
    if(cv.languages){y=sectionTitle("Languages",y);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(60,60,60);doc.text(cv.languages,M,y);y+=8;}
    if(cv.availability||cv.drivingLicense||cv.willingToRelocate){
      y=sectionTitle("Additional Information",y);
      const adds=[];
      if(cv.availability)adds.push(cv.availability);
      if(cv.drivingLicense)adds.push("Driving License: "+cv.drivingLicense);
      if(cv.willingToRelocate)adds.push("Willing to Relocate: "+cv.willingToRelocate);
      doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(60,60,60);
      doc.text(adds.join("   •   "),M,y);y+=8;
    }
    if(cv.references){doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(140,140,140);doc.text(cv.references,M,y);}

  } else {
    // Banner layout
    doc.setFillColor(cr,cg,cb); doc.rect(0,0,W,36,"F"); doc.setFillColor(ar,ag,ab); doc.rect(0,34,W,2,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(20); doc.setFont("helvetica","bold"); doc.text(cv.name||"Your Name",M,13);
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(ar,ag,ab); doc.text(cv.title||"Job Title",M,20);
    doc.setFontSize(7.5); doc.setTextColor(200,200,200); doc.text([cv.email,cv.phone,cv.location].filter(Boolean).join("  •  "),M,27);
    const gl = gulfLine();
    if(gl){doc.setFontSize(7);doc.text(gl,M,33);}

    let y = 44;
    if(cv.summary){y=sectionTitle("Professional Summary",y);doc.setFontSize(8.5);const l=doc.splitTextToSize(cv.summary,W-M*2);doc.text(l,M,y);y+=l.length*4.5+7;}
    if(cv.skills){y=sectionTitle("Core Skills",y);doc.setFontSize(8);const sl=doc.splitTextToSize(cv.skills,W-M*2);doc.text(sl,M,y);y+=sl.length*4+6;}
    if(cv.experience.some(e=>e.company)){
      y=sectionTitle("Work Experience",y);
      cv.experience.filter(e=>e.company).forEach(e=>{
        doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(40,40,40);doc.text(e.role||"",M,y);
        doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(120,120,120);doc.text(e.period||"",W-M,y,{align:"right"});y+=4.5;
        doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor(ar,ag,ab);
        const compStr=e.company+(e.location?` · ${e.location}`:"");
        doc.text(compStr,M,y);y+=4.5;
        if(e.points){doc.setFont("helvetica","normal");doc.setTextColor(70,70,70);doc.setFontSize(8);const pl=doc.splitTextToSize(e.points,W-M*2);doc.text(pl,M,y);y+=pl.length*4+2;}
        y+=3;
      });
      y+=3;
    }
    if(cv.education.some(e=>e.school)){y=sectionTitle("Education",y);cv.education.filter(e=>e.school).forEach(e=>{doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(40,40,40);doc.text(`${e.degree} — ${e.school}`,M,y);doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(120,120,120);doc.text(e.year||"",W-M,y,{align:"right"});y+=8;});y+=3;}
    if(cv.certifications){y=sectionTitle("Certifications",y);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.certifications,W-M*2);doc.text(sl,M,y);y+=sl.length*4+5;}
    if(cv.technicalSkills){y=sectionTitle("Technical Skills",y);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.technicalSkills,W-M*2);doc.text(sl,M,y);y+=sl.length*4+5;}
    if(cv.skills&&false){}
    if(cv.languages){y=sectionTitle("Languages",y);doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(60,60,60);doc.text(cv.languages,M,y);y+=8;}
    if(cv.availability||cv.drivingLicense||cv.willingToRelocate){
      y=sectionTitle("Additional Information",y);
      const adds=[];
      if(cv.availability)adds.push(cv.availability);
      if(cv.drivingLicense)adds.push("Driving License: "+cv.drivingLicense);
      if(cv.willingToRelocate)adds.push("Willing to Relocate: "+cv.willingToRelocate);
      doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(60,60,60);
      const al=doc.splitTextToSize(adds.join("   •   "),W-M*2);doc.text(al,M,y);y+=al.length*4+5;
    }
    if(cv.references){doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(140,140,140);doc.text(cv.references,M,y);}
  }

  doc.save(`${(cv.name || "Resume").replace(/\s+/g,"_")}_CVPassport.pdf`);
}

// ─── FALCON LOGO (shared) ─────────────────────────────────────────
function FalconLogo({ size = 28, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className} style={{ display: "block" }}>
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 38c6-8 10-12 14-13 4-1 9 0 14 3-4 1-7 3-9 6 3 0 6 1 9 3-4 1-8 2-12 2-4 0-8-1-12-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 42c2 3 4 5 8 6 4-1 6-3 8-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 22c1.5-2 3-3 4-3s2.5 1 4 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── LANDING PAGE (Phase 2) ───────────────────────────────────────
const LANDING_TEMPLATES = TEMPLATES.slice(0, 6);
const PRICING_UAE = [
  { name: "Free", price: "Free", period: "" },
  { name: "Monthly", price: "AED 29", period: "/mo" },
  { name: "Quarterly", price: "AED 69", period: "/quarter", recommended: true },
  { name: "Yearly", price: "AED 199", period: "/yr" },
  { name: "Lifetime", price: "AED 299", period: " once" },
];
const PRICING_IN = [
  { name: "Free", price: "Free", period: "" },
  { name: "Monthly", price: "₹199", period: "/mo" },
  { name: "Quarterly", price: "₹449", period: "/quarter", recommended: true },
  { name: "Yearly", price: "₹999", period: "/yr" },
  { name: "Lifetime", price: "₹1,499", period: " once" },
];

function LandingPage({ onLogin, onSignup }) {
  const [theme, setTheme] = useState("dark");
  const [activeSection, setActiveSection] = useState("features");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingRegion, setPricingRegion] = useState("uae");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  const isDark = theme === "dark";
  const bg = isDark ? "#050505" : "#fafafa";
  const text = isDark ? "#f5f5f5" : "#171717";
  const muted = isDark ? "#9b9b9b" : "#737373";
  const border = isDark ? "#262626" : "#e5e5e5";

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div style={{ background: bg, color: text, minHeight: "100vh" }}>
      {/* Nav — tubelight, sticky, backdrop blur */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: isDark ? "rgba(5,5,5,0.85)" : "rgba(250,250,250,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} role="button" tabIndex={0}>
        <img
  src="/images/falcon-icon.png"
  alt="CV Passport Logo"
  style={{ height: "80px", width: "auto" }}
/>        </div>
        <div className="landing-nav-center" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["features", "templates", "pricing"].map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={`landing-nav-tubelight ${activeSection === id ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); scrollTo(id); setActiveSection(id); }}
              style={{ padding: "8px 14px", fontSize: "14px", fontWeight: "600", color: activeSection === id ? text : muted, textDecoration: "none", textTransform: "capitalize" }}
            >
              {id === "templates" ? "Templates" : id === "pricing" ? "Pricing" : "Features"}
            </a>
          ))}
        </div>
        <div className="landing-nav-cta" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${border}`, borderRadius: "8px", color: text, fontSize: "13px", cursor: "pointer" }}>
            {isDark ? "Light" : "Dark"}
          </button>
          <button type="button" onClick={onLogin} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${border}`, borderRadius: "8px", color: text, fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Login</button>
          <button type="button" onClick={onSignup} style={{ padding: "10px 20px", background: "#fff", color: "#000", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>Get Started</button>
        </div>
        <button type="button" className="landing-nav-hamburger" aria-label="Menu" onClick={() => setMobileMenuOpen(o => !o)} style={{ display: "none", padding: 8, background: "transparent", border: "none", color: text, cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </nav>
      {mobileMenuOpen && (
        <div className="landing-mobile-menu" style={{ position: "fixed", top: 57, left: 0, right: 0, background: isDark ? "#0a0a0a" : "#fff", borderBottom: `1px solid ${border}`, padding: 16, zIndex: 99, display: "flex", flexDirection: "column", gap: 8 }}>
          {["features", "templates", "pricing"].map((id) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); setActiveSection(id); setMobileMenuOpen(false); }} style={{ padding: "12px", fontSize: "14px", fontWeight: "600", color: text, textDecoration: "none" }}>{id === "templates" ? "Templates" : id === "pricing" ? "Pricing" : "Features"}</a>
          ))}
          <button type="button" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ padding: "12px", textAlign: "left", background: "transparent", border: "none", color: text, fontSize: "14px", cursor: "pointer" }}>{isDark ? "Light mode" : "Dark mode"}</button>
          <button type="button" onClick={() => { onLogin(); setMobileMenuOpen(false); }} style={{ padding: "12px", textAlign: "left", background: "transparent", border: "none", color: text, fontSize: "14px", cursor: "pointer" }}>Login</button>
          <button type="button" onClick={() => { onSignup(); setMobileMenuOpen(false); }} style={{ padding: "12px", background: "#fff", color: "#000", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Get Started</button>
        </div>
      )}

      {/* Hero */}
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "60px 40px 48px", maxWidth: 1200, margin: "0 auto", flexWrap: "wrap", gap: 40, position: "relative", minHeight: "85vh" }}>
        <div className="landing-hero-content" style={{ flex: "1 1 400px", maxWidth: 560 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <span style={{ padding: "6px 12px", borderRadius: "999px", border: `1px solid ${border}`, fontSize: "12px", fontWeight: "600" }}>🇦🇪 UAE Ready</span>
            <span style={{ padding: "6px 12px", borderRadius: "999px", border: `1px solid ${border}`, fontSize: "12px", fontWeight: "600" }}>🎯 ATS Optimised</span>
            <span style={{ padding: "6px 12px", borderRadius: "999px", border: `1px solid ${border}`, fontSize: "12px", fontWeight: "600" }}>⚡ 5 Minute Build</span>
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: "800", lineHeight: "1.15", marginBottom: 16, letterSpacing: "-0.02em" }}>Your Gulf Career Starts Here</h1>
          <p style={{ fontSize: "17px", color: muted, lineHeight: "1.65", marginBottom: 28 }}>Build an ATS-ready CV in minutes. Trusted by job seekers across UAE, India and GCC.</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button type="button" className="landing-btn-primary" onClick={onSignup} style={{ padding: "14px 28px", background: "#fff", color: "#000", border: "none", borderRadius: "999px", fontSize: "15px", fontWeight: "700", cursor: "pointer", boxShadow: "0 0 16px rgba(255,255,255,0.3)" }}>
              Build My CV →
            </button>
            <button type="button" className="landing-btn-secondary" onClick={onLogin} style={{ padding: "14px 28px", background: "transparent", color: text, border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, borderRadius: "999px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
              Analyse My CV
            </button>
          </div>
          <div style={{ marginTop: 28, fontSize: "13px", color: muted }}>
            10,000+ CVs Created · UAE & GCC Focused · ATS Optimised Templates
          </div>
        </div>
        <div className="landing-hero-globe" style={{ flex: "0 1 420px", width: "100%", maxWidth: 420 }}>
          <LandingGlobe isMobile={isMobile} />
        </div>
      </section>

      {/* Features (anchor) */}
      <section id="features" style={{ padding: "48px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: 24, textAlign: "center" }}>Built for Gulf & India job markets</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            { title: "ATS Optimised", desc: "Beat applicant tracking systems used by UAE employers" },
            { title: "Gulf CV Sections", desc: "Nationality, Visa, DOB, Marital Status & more" },
            { title: "Auto-Saved", desc: "Your resume saves automatically — never lose your work" },
            { title: "Free Download", desc: "Build & download free. No tricks" },
          ].map((f, i) => (
            <div key={i} style={{ padding: 20, border: `1px solid ${border}`, borderRadius: 12, background: isDark ? "#0a0a0a" : "#fff" }}>
              <div style={{ fontWeight: "700", marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: "14px", color: muted, lineHeight: "1.5" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section id="templates" style={{ padding: "48px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: 24, textAlign: "center" }}>Professional Templates Built for Gulf Jobs</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {LANDING_TEMPLATES.map((t) => (
            <div
              key={t.id}
              onClick={onSignup}
              style={{
                border: `1px solid ${border}`,
                borderRadius: 14,
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                background: isDark ? "#0a0a0a" : "#fff",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ position: "relative", width: "100%", height: 220, overflow: "hidden", borderRadius: 8, background: "#fff" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 794, transformOrigin: "top left", transform: "scale(0.27)" }}>
                  <ResumePreview cv={{ ...EMPTY_RESUME, name: "Your Name", title: "Job Title" }} template={t} />
                </div>
              </div>
              <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "600", fontSize: "14px" }}>{t.name}</span>
                <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: 999, border: `1px solid ${border}`, color: muted }}>{t.tier === "free" ? "Free" : "Pro"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "48px 40px 64px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: 12, textAlign: "center" }}>Pricing</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          <span style={{ fontSize: "14px", color: pricingRegion === "uae" ? text : muted, fontWeight: "600" }}>UAE</span>
          <button
            type="button"
            onClick={() => setPricingRegion(r => r === "uae" ? "in" : "uae")}
            style={{ width: 48, height: 26, borderRadius: 999, background: pricingRegion === "uae" ? "#fff" : border, border: `1px solid ${border}`, cursor: "pointer", position: "relative" }}
          >
            <span style={{ position: "absolute", left: pricingRegion === "uae" ? 4 : 26, top: 3, width: 20, height: 18, borderRadius: 999, background: pricingRegion === "uae" ? "#000" : text, transition: "left 0.2s" }} />
          </button>
          <span style={{ fontSize: "14px", color: pricingRegion === "in" ? text : muted, fontWeight: "600" }}>India</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          {(pricingRegion === "uae" ? PRICING_UAE : PRICING_IN).map((plan) => (
            <div key={plan.name} style={{ padding: 20, borderRadius: 12, border: `1px solid ${plan.recommended ? (isDark ? "#fff" : "#000") : border}`, background: plan.recommended ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent", textAlign: "center" }}>
              {plan.recommended && <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, color: muted }}>Recommended</div>}
              <div style={{ fontWeight: "700", fontSize: "18px" }}>{plan.price}<span style={{ fontSize: "12px", color: muted }}>{plan.period}</span></div>
              <div style={{ fontSize: "12px", color: muted, marginTop: 4 }}>{plan.name}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, padding: "16px 20px", border: `1px solid ${border}`, borderRadius: 12, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", fontSize: "13px", color: muted }}>
          <span>Watermark Removal AED 5</span>
          <span>·</span>
          <span>ATS Single Scan AED 9</span>
          <span>·</span>
          <span>ATS 5-Pack AED 29</span>
          <span>·</span>
          <span>Cover Letter AED 9</span>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 40px", borderTop: `1px solid ${border}`, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <FalconLogo size={22} style={{ color: text }} />
          <span style={{ fontSize: "16px", fontWeight: "700" }}>CVPassport</span>
        </div>
        <p style={{ fontSize: "13px", color: muted, marginBottom: 12 }}>Built for the Gulf. Trusted across South Asia.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", fontSize: "13px" }}>
          <a href="#privacy" style={{ color: muted, textDecoration: "none" }}>Privacy Policy</a>
          <a href="#terms" style={{ color: muted, textDecoration: "none" }}>Terms</a>
          <a href="#contact" style={{ color: muted, textDecoration: "none" }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────
function AuthPage({ mode, onAuth, onToggle, loading, error }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
      <div style={S.card}>
        <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "6px" }}>{mode === "login" ? "Welcome back" : "Create account"}</h2>
        <p style={{ color: C.muted, marginBottom: "28px", fontSize: "14px" }}>{mode === "login" ? "Sign in to your CVPassport account" : "Start building your Gulf resume today"}</p>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${C.danger}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: C.danger }}>{error}</div>}
        {mode === "signup" && <div style={{ marginBottom: "16px" }}><label style={S.label}>Full Name</label><input style={S.input} placeholder="Your Name" value={form.name} onChange={e=>set("name",e.target.value)}/></div>}
        <div style={{ marginBottom: "16px" }}><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="you@email.com" value={form.email} onChange={e=>set("email",e.target.value)}/></div>
        <div style={{ marginBottom: "24px" }}><label style={S.label}>Password</label><input style={S.input} type="password" placeholder="••••••••" value={form.password} onChange={e=>set("password",e.target.value)}/></div>
        <button style={{ ...S.btn("primary","lg"), width: "100%", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading} onClick={() => onAuth({ ...form, name: form.name||form.email.split("@")[0] })}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Free Account →"}
        </button>
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: C.muted }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span style={{ color: C.accent, cursor: "pointer", fontWeight: "600" }} onClick={onToggle}>{mode === "login" ? "Sign up free" : "Sign in"}</span>
        </p>
      </div>
    </div>
  );
}

// ─── RESUME BUILDER ───────────────────────────────────────────────
function ResumeBuilder({ user, onBack, initialResume, initialResumeId, initialTemplateId }) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES.find(t => t.id === initialTemplateId) || TEMPLATES[0]);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [resumeId, setResumeId] = useState(initialResumeId || null);
  const [resume, setResume] = useState(initialResume || { ...EMPTY_RESUME, name: user?.name||"", email: user?.email||"" });

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
    if (resume.experience[0].company) s += 16;
    if (resume.skills?.length > 20) s += 12;
    if (resume.certifications) s += 6;
    if (resume.languages) s += 6;
    return s;
  })();
  const scoreColor = score >= 80 ? C.success : score >= 50 ? C.gold : C.danger;

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
    try { await downloadResume(resume, selectedTemplate); }
    catch(e) { alert("PDF error: " + e.message); }
    finally { setDownloading(false); }
  };

  const STEPS = ["Personal Info", "Gulf Details", "Experience", "Education", "Skills & Certs", "Template", "Preview"];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "30px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px", flexWrap: "wrap" }}>
        <button style={S.btn("outline","sm")} onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0 }}>Resume Builder</h1>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {saveStatus === "saved" && <span style={{ fontSize: "12px", color: C.success }}>✓ Saved</span>}
          {saveStatus === "error" && <span style={{ fontSize: "12px", color: C.danger }}>✗ Save failed</span>}
          {saving && <span style={{ fontSize: "12px", color: C.muted }}>Saving...</span>}
          <button style={{ ...S.btn("success","sm"), opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>💾 Save Resume</button>
          <span style={{ fontSize: "13px", color: C.muted }}>ATS:</span>
          <span style={{ fontSize: "20px", fontWeight: "800", color: scoreColor }}>{score}%</span>
        </div>
      </div>

      {/* Step tabs */}
      <div style={{ display: "flex", gap: "5px", marginBottom: "28px", overflowX: "auto" }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i+1)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "11px", whiteSpace: "nowrap", background: step === i+1 ? C.accent : C.card, color: step === i+1 ? "#fff" : C.muted }}>
            {i+1}. {s}
          </button>
        ))}
      </div>

      {/* ── STEP 1: Personal Info ── */}
      {step === 1 && (
        <div>
          <div style={S.sectionHeading}>Basic Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { label: "Full Name",  key: "name",     placeholder: "Junaid Khan" },
              { label: "Job Title",  key: "title",    placeholder: "Customer Service Officer" },
              { label: "Email",      key: "email",    placeholder: "you@email.com" },
              { label: "Phone",      key: "phone",    placeholder: "+971 5X XXX XXXX" },
              { label: "Location",   key: "location", placeholder: "Dubai, UAE" },
            ].map(f => (
              <div key={f.key}><label style={S.label}>{f.label}</label><input style={S.input} placeholder={f.placeholder} value={resume[f.key]} onChange={e=>set(f.key,e.target.value)}/></div>
            ))}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={S.label}>Professional Summary (2–3 lines)</label>
              <textarea style={{ ...S.input, height: "100px", resize: "vertical" }} placeholder="Client-focused professional with 4+ years experience in customer service across Gulf markets..." value={resume.summary} onChange={e=>set("summary",e.target.value)}/>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Gulf Details ── */}
      {step === 2 && (
        <div>
          <div style={S.sectionHeading}>Gulf / UAE CV Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={S.label}>Nationality</label>
              <input style={S.input} placeholder="Indian, Pakistani, Filipino..." value={resume.nationality} onChange={e=>set("nationality",e.target.value)}/>
            </div>
            <div>
              <label style={S.label}>Visa Status</label>
              <select style={S.select} value={resume.visaStatus} onChange={e=>set("visaStatus",e.target.value)}>
                <option value="">Select visa status</option>
                <option>UAE Residence Visa</option>
                <option>Employment Visa</option>
                <option>Visit Visa</option>
                <option>Freelance Permit</option>
                <option>Golden Visa</option>
                <option>Husband / Family Visa</option>
                <option>Transferable Visa</option>
                <option>Outside UAE</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Date of Birth</label>
              <input style={S.input} placeholder="DD/MM/YYYY or Month Year" value={resume.dob} onChange={e=>set("dob",e.target.value)}/>
            </div>
            <div>
              <label style={S.label}>Gender <span style={{ color: C.muted }}>(optional)</span></label>
              <select style={S.select} value={resume.gender} onChange={e=>set("gender",e.target.value)}>
                <option value="">Prefer not to say</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Marital Status <span style={{ color: C.muted }}>(optional)</span></label>
              <select style={S.select} value={resume.maritalStatus} onChange={e=>set("maritalStatus",e.target.value)}>
                <option value="">Prefer not to say</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Availability</label>
              <select style={S.select} value={resume.availability} onChange={e=>set("availability",e.target.value)}>
                <option>Immediately Available</option>
                <option>1 Month Notice</option>
                <option>2 Months Notice</option>
                <option>3 Months Notice</option>
                <option>Currently Employed</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Driving License</label>
              <input style={S.input} placeholder="UAE License, Indian License, None..." value={resume.drivingLicense} onChange={e=>set("drivingLicense",e.target.value)}/>
            </div>
            <div>
              <label style={S.label}>Willing to Relocate</label>
              <select style={S.select} value={resume.willingToRelocate} onChange={e=>set("willingToRelocate",e.target.value)}>
                <option>Yes</option>
                <option>No</option>
                <option>Within UAE Only</option>
                <option>GCC Countries</option>
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={S.label}>References</label>
              <input style={S.input} placeholder="References available upon request" value={resume.references} onChange={e=>set("references",e.target.value)}/>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Experience ── */}
      {step === 3 && (
        <div>
          <div style={S.sectionHeading}>Work Experience</div>
          {resume.experience.map((exp, i) => (
            <div key={i} style={{ ...S.card, marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ fontWeight: "700" }}>Experience #{i+1}</span>
                {i > 0 && <button style={S.btn("danger","sm")} onClick={() => setResume(r => ({ ...r, experience: r.experience.filter((_,j) => j !== i) }))}>Remove</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { label: "Company",  key: "company",  placeholder: "ADIB / Mashreq / FAB" },
                  { label: "Job Title", key: "role",    placeholder: "Customer Service Officer" },
                  { label: "Location", key: "location", placeholder: "Dubai, UAE" },
                  { label: "Period",   key: "period",   placeholder: "Jan 2023 – Present" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={S.label}>{f.label}</label>
                    <input style={S.input} placeholder={f.placeholder} value={exp[f.key]||""} onChange={e=>{const u=[...resume.experience];u[i]={...u[i],[f.key]:e.target.value};set("experience",u);}}/>
                  </div>
                ))}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={S.label}>Key Achievements & Responsibilities (one per line)</label>
                  <textarea style={{ ...S.input, height: "90px", resize: "vertical" }} placeholder={"Handled 50+ customer queries daily\nAchieved 98% satisfaction score\nManaged KYC documentation for 200+ clients"} value={exp.points} onChange={e=>{const u=[...resume.experience];u[i]={...u[i],points:e.target.value};set("experience",u);}}/>
                </div>
              </div>
            </div>
          ))}
          <button style={S.btn("outline")} onClick={() => setResume(r => ({ ...r, experience: [...r.experience, { company: "", role: "", location: "", period: "", points: "" }] }))}>+ Add Experience</button>
        </div>
      )}

      {/* ── STEP 4: Education ── */}
      {step === 4 && (
        <div>
          <div style={S.sectionHeading}>Education</div>
          {resume.education.map((edu, i) => (
            <div key={i} style={{ ...S.card, marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                {[
                  { label: "Institution", key: "school", placeholder: "Amity University" },
                  { label: "Degree",      key: "degree", placeholder: "B.Com / BBA / BATA" },
                  { label: "Year",        key: "year",   placeholder: "2021" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={S.label}>{f.label}</label>
                    <input style={S.input} placeholder={f.placeholder} value={edu[f.key]} onChange={e=>{const u=[...resume.education];u[i]={...u[i],[f.key]:e.target.value};set("education",u);}}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button style={S.btn("outline")} onClick={() => setResume(r => ({ ...r, education: [...r.education, { school: "", degree: "", year: "" }] }))}>+ Add Education</button>
        </div>
      )}

      {/* ── STEP 5: Skills & Certifications ── */}
      {step === 5 && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={S.sectionHeading}>Skills & Certifications</div>
          <div>
            <label style={S.label}>Core Skills <span style={{ color: C.muted }}>(comma separated)</span></label>
            <textarea style={{ ...S.input, height: "80px" }} placeholder="Customer Service, CRM Systems, Problem Solving, MS Office, Communication" value={resume.skills} onChange={e=>set("skills",e.target.value)}/>
          </div>
          <div>
            <label style={S.label}>Technical Skills <span style={{ color: C.muted }}>(optional — comma separated)</span></label>
            <input style={S.input} placeholder="Salesforce, SAP, Temenos, Finacle, MS Excel, Power BI" value={resume.technicalSkills} onChange={e=>set("technicalSkills",e.target.value)}/>
          </div>
          <div>
            <label style={S.label}>Languages</label>
            <input style={S.input} placeholder="English (Fluent), Hindi (Native), Arabic (Basic)" value={resume.languages} onChange={e=>set("languages",e.target.value)}/>
          </div>
          <div>
            <label style={S.label}>Certifications <span style={{ color: C.muted }}>(optional — comma separated)</span></label>
            <input style={S.input} placeholder="AML/KYC Certificate, CISI, Certified Banker, IELTS 7.5" value={resume.certifications} onChange={e=>set("certifications",e.target.value)}/>
          </div>
        </div>
      )}

      {/* ── STEP 6: Template ── */}
      {step === 6 && (
        <div>
          <div style={S.sectionHeading}>Choose Your Template</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "14px" }}>
            {TEMPLATES.map(t => (
              <div key={t.id} onClick={() => setSelectedTemplate(t)} style={{ background: t.color, border: `2px solid ${selectedTemplate?.id === t.id ? "#fff" : t.accent}`, borderRadius: "14px", padding: "20px", cursor: "pointer", transform: selectedTemplate?.id === t.id ? "scale(1.04)" : "scale(1)", transition: "all 0.2s", boxShadow: selectedTemplate?.id === t.id ? `0 0 20px ${t.accent}66` : "none" }}>
                <div style={{ ...S.badge(t.tier), marginBottom: "10px" }}>{t.tier === "free" ? "FREE" : "⭐ PRO"}</div>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#fff", marginBottom: "4px" }}>{t.name}</div>
                <div style={{ fontSize: "11px", color: t.accent, marginBottom: "6px" }}>{t.desc}</div>
                {selectedTemplate?.id === t.id && <div style={{ marginTop: "8px", fontSize: "11px", color: "#fff", fontWeight: "700" }}>✓ Selected</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 7: Preview ── */}
      {step === 7 && (
        <div>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <ResumePreview cv={resume} template={selectedTemplate}/>
          </div>
          <div style={{ textAlign: "center", marginTop: "24px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ ...S.btn("gold","lg"), opacity: downloading ? 0.7 : 1, cursor: downloading ? "not-allowed" : "pointer" }} disabled={downloading} onClick={handleDownload}>
              {downloading ? "Generating PDF..." : "⬇ Download Resume"}
            </button>
            <button style={S.btn("success")} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "💾 Save Resume"}
            </button>
            <button style={S.btn("outline")} onClick={() => setStep(1)}>✏️ Edit Resume</button>
          </div>
          {saveStatus === "saved" && <p style={{ textAlign: "center", color: C.success, marginTop: "12px", fontSize: "13px" }}>✓ Resume saved to your account!</p>}
        </div>
      )}

      {/* Nav */}
      {step < 7 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px" }}>
          {step > 1 ? <button style={S.btn("outline")} onClick={() => setStep(s => s-1)}>← Previous</button> : <div/>}
          <button style={S.btn("primary")} onClick={() => setStep(s => s+1)}>{step === 6 ? "Preview Resume →" : "Next →"}</button>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function Dashboard({ user, onBuildResume, onEditResume }) {
  const [resumeList, setResumeList] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState(null);
  const [activeNav, setActiveNav]   = useState("home");
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadUserResumes(user.id)
      .then(data => setResumeList(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (resumeId) => {
    if (!window.confirm("Delete this resume?")) return;
    setDeleting(resumeId);
    try {
      await deleteResume(resumeId, user.id);
      setResumeList(prev => prev.filter(r => r.id !== resumeId));
    } catch(e) {
      alert("Error deleting resume");
    } finally {
      setDeleting(null);
    }
  };

  const navItems = [
    { id: "home",      label: "Home" },
    { id: "mycvs",     label: "My CVs" },
    { id: "ats",       label: "ATS Checker" },
    { id: "templates", label: "Templates" },
    { id: "settings",  label: "Settings" },
  ];

  const getStrength = (r) => {
    if (!r) return 0;
    const fields = [
      r.name,
      r.email,
      r.phone,
      r.title,
      r.summary,
      r.nationality,
      r.visaStatus,
      r.skills,
      r.languages,
      r.experience?.[0]?.company,
      r.experience?.[0]?.role,
      r.education?.[0]?.school,
    ];
    const filled = fields.filter(f => f && String(f).trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  };

  const openProModal = () => {
    setShowProModal(true);
  };

  const closeProModal = () => {
    setShowProModal(false);
  };

  return (
    <div className="dashboard-shell" style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* ── SIDEBAR ── */}
      <aside className="dashboard-sidebar" style={{ width: "220px", background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed", height: "100vh", zIndex: 10 }}>
        <div className="dashboard-sidebar-header" style={{ padding: "0 20px 28px", display: "flex", alignItems: "center", gap: 10 }}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 64 64"
            aria-hidden="true"
            focusable="false"
            style={{ display: "block" }}
          >
            <circle cx="32" cy="32" r="30" fill="none" stroke="#f5f5f5" strokeWidth="1.5" />
            <path
              d="M18 38c6-8 10-12 14-13 4-1 9 0 14 3-4 1-7 3-9 6 3 0 6 1 9 3-4 1-8 2-12 2-4 0-8-1-12-3z"
              fill="none"
              stroke="#f5f5f5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M24 42c2 3 4 5 8 6 4-1 6-3 8-6"
              fill="none"
              stroke="#f5f5f5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M28 22c1.5-2 3-3 4-3s2.5 1 4 3"
              fill="none"
              stroke="#f5f5f5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "0.06em" }}>CVPassport</span>
        </div>
        <nav className="dashboard-sidebar-nav" style={{ flex: 1, padding: "0 10px" }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setActiveNav(item.id)} style={{ padding: "10px 12px", borderRadius: "8px", cursor: "pointer", marginBottom: "2px", background: activeNav === item.id ? C.card : "transparent", color: activeNav === item.id ? C.text : C.muted, border: activeNav === item.id ? `1px solid ${C.border}` : "1px solid transparent", fontSize: "14px", transition: "all 0.2s ease" }}>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "0 10px", marginTop: "auto" }}>
          <button
            type="button"
            onClick={openProModal}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.text,
              textAlign: "left",
              marginBottom: "12px",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: "600", marginBottom: 4 }}>Upgrade to Pro</div>
            <div style={{ fontSize: "11px", color: C.muted }}>AED 29/mo • Unlock all templates</div>
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: "10px",
              background: C.card,
              border: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "999px",
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {(user?.name || user?.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name || "User"}</div>
                <div style={{ fontSize: 11, color: C.muted }}>Free Plan</div>
              </div>
            </div>
            <button
              type="button"
              onClick={user?.onLogout}
              style={{
                border: "none",
                background: "transparent",
                color: C.muted,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="dashboard-main" style={{ marginLeft: "220px", marginRight: "260px", flex: 1, padding: "32px 28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Welcome back, {user?.name}</h1>
        <p style={{ color: C.muted, marginBottom: "28px", fontSize: "14px" }}>Manage your CVs for UAE and Gulf roles.</p>

        {activeNav === "home" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px", marginBottom: "28px" }}>
              {[
                { label: "Saved CVs", value: resumeList.length.toString() },
                { label: "Last Updated", value: resumeList[0] ? new Date(resumeList[0].updated_at).toLocaleDateString() : "—" },
                { label: "Templates", value: "11" },
                { label: "Plan", value: "Free" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "18px" }}>
                  <div style={{ fontSize: "22px", fontWeight: "700" }}>{stat.value}</div>
                  <div style={{ fontSize: "12px", color: C.muted, marginTop: "4px" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {(activeNav === "home" || activeNav === "mycvs") && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700" }}>My CVs</h2>
              <button
                type="button"
                onClick={onBuildResume}
                style={{
                  padding: "10px 18px",
                  borderRadius: "999px",
                  background: C.text,
                  color: "#000",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  minHeight: 48,
                }}
              >
                + New CV
              </button>
            </div>

            {loading ? (
              <div style={{ color: C.muted, fontSize: "14px" }}>Loading your CVs...</div>
            ) : resumeList.length === 0 ? (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: "10px",
                  padding: "32px",
                  textAlign: "center",
                }}
              >
                <div style={{ color: C.muted, fontSize: "14px", marginBottom: "16px" }}>
                  No CVs yet. Create your first Gulf-ready CV.
                </div>
                <button
                  type="button"
                  onClick={onBuildResume}
                  style={{
                    padding: "12px 22px",
                    borderRadius: "999px",
                    background: C.text,
                    color: "#000",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    minHeight: 48,
                  }}
                >
                  Build My CV
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
                {resumeList.map((r) => {
                  const cvData = r.cv_data || EMPTY_RESUME;
                  const strength = getStrength(cvData);
                  const template = TEMPLATES.find((t) => t.id === r.template_id) || TEMPLATES[0];
                  const title = r.title || cvData.name || "My CV";
                  return (
                    <div
                      key={r.id}
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: "12px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          borderRadius: "8px",
                          border: `1px solid ${C.border}`,
                          background: "#000",
                          padding: "6px",
                          height: 140,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            transform: "scale(0.32)",
                            transformOrigin: "top left",
                            width: "310%",
                            pointerEvents: "none",
                          }}
                        >
                          <ResumePreview cv={cvData} template={template} />
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            fontSize: "14px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {title}
                        </div>
                        <div style={{ fontSize: "11px", color: C.muted, marginTop: 4 }}>
                          Last edited {new Date(r.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={strength < 90 ? openProModal : undefined}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            border: `1px solid ${C.border}`,
                            background: "transparent",
                            fontSize: "11px",
                            cursor: strength < 90 ? "pointer" : "default",
                          }}
                        >
                          Resume strength: {strength}%
                        </button>
                        {typeof r.ats_score === "number" && (
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "999px",
                              border: `1px solid ${C.border}`,
                              fontSize: "11px",
                            }}
                          >
                            ATS {r.ats_score}%
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => onEditResume(r)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "8px",
                            border: `1px solid ${C.border}`,
                            background: "transparent",
                            color: C.text,
                            fontSize: "12px",
                            cursor: "pointer",
                            minHeight: 48,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "8px",
                            border: `1px solid ${C.border}`,
                            background: "transparent",
                            color: C.muted,
                            fontSize: "12px",
                            cursor: deleting === r.id ? "wait" : "pointer",
                            minHeight: 48,
                          }}
                        >
                          {deleting === r.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={onBuildResume}
                  style={{
                    border: `1px dashed ${C.border}`,
                    borderRadius: "12px",
                    background: "transparent",
                    color: C.muted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: "13px",
                    cursor: "pointer",
                    minHeight: 180,
                  }}
                >
                  <span style={{ fontSize: 24 }}>+</span>
                  <span>New CV</span>
                </button>
              </div>
            )}
          </>
        )}

        {activeNav === "ats" && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: 12 }}>ATS Checker</h2>
            <p style={{ fontSize: "13px", color: C.muted, marginBottom: 16 }}>
              Analyse your CV against a target job description and identify missing keywords.
            </p>
            <div style={{ borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <ATSChecker />
            </div>
          </div>
        )}

        {activeNav === "templates" && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: 12 }}>Templates</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              {TEMPLATES.map((t) => (
                <div
                  key={t.id}
                  style={{
                    borderRadius: "10px",
                    border: `1px solid ${C.border}`,
                    padding: "12px",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: "11px", color: C.muted }}>{t.tier === "free" ? "Free" : "Pro"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeNav === "settings" && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: 12 }}>Settings</h2>
            <p style={{ fontSize: "13px", color: C.muted }}>Account and workspace settings will appear here.</p>
          </div>
        )}
      </main>

      {/* ── RIGHT PANEL ── */}
      <aside className="dashboard-right" style={{ width: "240px", background: C.surface, borderLeft: `1px solid ${C.border}`, padding: "28px 16px", position: "fixed", right: 0, top: 0, height: "100vh", overflowY: "auto" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "14px" }}>Overview</h3>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: C.muted }}>Plan</div>
          <div style={{ fontSize: "18px", fontWeight: "700" }}>Free</div>
        </div>

        <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "14px" }}>Quick Tip</h3>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: C.muted, lineHeight: "1.6" }}>
            Add Gulf-specific details like visa status and nationality to improve recruiter matches.
          </div>
        </div>

        <button
          type="button"
          onClick={openProModal}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.text,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Upgrade to Pro — AED 29/mo
        </button>
      </aside>

      {showProModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            style={{
              background: "#050505",
              borderRadius: "16px",
              border: "1px solid #f5f5f5",
              maxWidth: 420,
              width: "90%",
              padding: "24px 22px",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Upgrade to Pro</h2>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Boost your CV score with ATS optimisation, keyword matching and AI suggestions tailored for UAE and Gulf roles.
            </p>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>AED 29<span style={{ fontSize: 12, color: C.muted }}>/mo</span></div>
            <button
              type="button"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "999px",
                border: "1px solid #ffffff",
                background: "#f5f5f5",
                color: "#000",
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              Go Pro
            </button>
            <button
              type="button"
              onClick={closeProModal}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "999px",
                border: "none",
                background: "transparent",
                color: C.muted,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

    </div>
  );
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

  useEffect(() => {
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

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setPage("landing"); };

  const handleEditResume  = (record) => { setEditingResume(record); setPage("builder"); };
  const handleNewResume   = ()       => { setEditingResume(null);   setPage("builder"); };

  return (
    <div style={S.app}>
      {page === "landing"   && <LandingPage onLogin={() => { setAuthMode("login"); setPage("auth"); }} onSignup={() => { setAuthMode("signup"); setPage("auth"); }}/>}
      {page === "auth"      && <AuthPage mode={authMode} onAuth={handleAuth} onToggle={() => { setAuthMode(m => m === "login" ? "signup" : "login"); setAuthError(null); }} loading={authLoading} error={authError}/>}
      {page === "dashboard" && user && (
        <Dashboard
          user={{ ...user, onLogout: handleLogout }}
          onBuildResume={handleNewResume}
          onEditResume={handleEditResume}
        />
      )}
      {page === "builder"   && (
        <ResumeBuilder
          user={user}
          onBack={() => setPage(user ? "dashboard" : "landing")}
          initialResume={editingResume?.cv_data || null}
          initialResumeId={editingResume?.id || null}
          initialTemplateId={editingResume?.template_id || null}
        />
      )}
      {page === "ats" && <ATSChecker />}
      <Analytics />
    </div>
  );
}
