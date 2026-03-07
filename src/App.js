import { Analytics } from "@vercel/analytics/react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ─── TEMPLATES ───────────────────────────────────────────────────
const TEMPLATES = [
  { id: 1, name: "Gulf Classic",   tier: "free",    color: "#1a1a2e", accent: "#e94560", desc: "Bold banner header",         layout: "banner" },
  { id: 2, name: "Dubai Modern",   tier: "free",    color: "#0f3460", accent: "#00b4d8", desc: "Two-column split",           layout: "twocol" },
  { id: 3, name: "Arabia Pro",     tier: "free",    color: "#533483", accent: "#f0c040", desc: "Sidebar with skills column", layout: "sidebar" },
  { id: 4, name: "Executive Gold", tier: "premium", color: "#1a0a00", accent: "#d4a017", desc: "Timeline experience style",  layout: "timeline" },
];

const EMPTY_CV = {
  name: "", email: "", phone: "", location: "Dubai, UAE",
  title: "", summary: "",
  experience: [{ company: "", role: "", period: "", points: "" }],
  education: [{ school: "", degree: "", year: "" }],
  skills: "", languages: "English, Hindi",
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  bg: "#0a0a0f", surface: "#12121a", card: "#1a1a26", border: "#2a2a3a",
  accent: "#6366f1", gold: "#f59e0b", text: "#f0f0ff", muted: "#8888aa",
  success: "#10b981", danger: "#ef4444",
};

const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 40px", borderBottom: `1px solid ${C.border}`,
    background: "rgba(10,10,15,0.95)", position: "sticky", top: 0, zIndex: 100,
    backdropFilter: "blur(10px)",
  },
  logo: {
    fontSize: "22px", fontWeight: "800", cursor: "pointer",
    background: `linear-gradient(135deg,${C.accent},${C.gold})`,
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
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
  label: { display: "block", fontSize: "13px", color: C.muted, marginBottom: "6px", fontWeight: "500" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" },
  badge: (type = "free") => ({
    display: "inline-block", padding: "3px 10px", borderRadius: "20px",
    fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px",
    background: type === "free" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
    color: type === "free" ? C.success : C.gold,
    border: `1px solid ${type === "free" ? C.success : C.gold}`,
  }),
};

// ─── SUPABASE CV OPERATIONS ──────────────────────────────────────
async function saveCV(userId, cv, templateId, existingId = null) {
  const payload = {
    user_id: userId,
    title: cv.name ? `${cv.name} — ${cv.title || "CV"}` : "My CV",
    template_id: templateId,
    cv_data: cv,
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("cvs")
      .update(payload)
      .eq("id", existingId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("cvs")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

async function loadUserCVs(userId) {
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function deleteCV(cvId, userId) {
  const { error } = await supabase
    .from("cvs")
    .delete()
    .eq("id", cvId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── SHARED SUB-COMPONENTS ───────────────────────────────────────
function Section({ title, accent, children }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", color: accent, textTransform: "uppercase", fontFamily: "sans-serif" }}>{title}</span>
        <div style={{ flex: 1, height: "1px", background: `${accent}44` }} />
      </div>
      {children}
    </div>
  );
}
function ColLabel({ accent, children }) {
  return <div style={{ fontSize: "10px", fontWeight: "800", color: accent, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px", fontFamily: "sans-serif" }}>{children}</div>;
}
function ColItem({ icon, children }) {
  return <div style={{ fontSize: "11px", color: "#bbb", marginBottom: "6px", wordBreak: "break-all" }}>{icon} {children}</div>;
}
function RightLabel({ accent, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", color: accent, textTransform: "uppercase", fontFamily: "sans-serif" }}>{children}</span>
      <div style={{ flex: 1, height: "2px", background: `${accent}33` }} />
    </div>
  );
}

// ─── PREVIEW LAYOUTS ─────────────────────────────────────────────
function PreviewBanner({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", fontFamily: "Georgia,serif", color: "#222" }}>
      <div style={{ background: t.color, borderBottom: `6px solid ${t.accent}`, padding: "32px 36px 24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "900", color: "#fff", margin: "0 0 4px" }}>{cv.name || "Your Name"}</h1>
        <p style={{ color: t.accent, fontWeight: "700", fontSize: "14px", margin: "0 0 10px", fontFamily: "sans-serif" }}>{cv.title || "Job Title"}</p>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "12px", color: "#ccc", fontFamily: "sans-serif" }}>
          {cv.email && <span>✉ {cv.email}</span>}{cv.phone && <span>📞 {cv.phone}</span>}{cv.location && <span>📍 {cv.location}</span>}
        </div>
      </div>
      <div style={{ padding: "28px 36px" }}>
        {cv.summary && <Section title="Summary" accent={t.accent}><p style={{ fontSize: "13px", lineHeight: "1.8", margin: 0, color: "#444" }}>{cv.summary}</p></Section>}
        {cv.experience.some(e => e.company) && (
          <Section title="Experience" accent={t.accent}>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{e.role}</strong><span style={{ fontSize: "11px", color: "#888" }}>{e.period}</span></div>
                <div style={{ color: t.accent, fontSize: "13px", fontWeight: "700", marginBottom: "4px" }}>{e.company}</div>
                {e.points && <p style={{ fontSize: "12px", color: "#555", margin: 0, lineHeight: "1.7" }}>{e.points}</p>}
              </div>
            ))}
          </Section>
        )}
        {cv.education.some(e => e.school) && (
          <Section title="Education" accent={t.accent}>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                <div><strong style={{ fontSize: "13px" }}>{e.degree}</strong><div style={{ fontSize: "12px", color: "#666" }}>{e.school}</div></div>
                <span style={{ fontSize: "12px", color: "#888" }}>{e.year}</span>
              </div>
            ))}
          </Section>
        )}
        {skillList.length > 0 && <Section title="Skills" accent={t.accent}><div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{skillList.map((s, i) => <span key={i} style={{ padding: "4px 12px", background: `${t.accent}18`, border: `1px solid ${t.accent}44`, borderRadius: "20px", fontSize: "12px", color: "#333" }}>{s}</span>)}</div></Section>}
        {cv.languages && <Section title="Languages" accent={t.accent}><p style={{ fontSize: "13px", margin: 0, color: "#444" }}>{cv.languages}</p></Section>}
      </div>
    </div>
  );
}

function PreviewTwoCol({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", fontFamily: "Arial,sans-serif", color: "#222", display: "flex", minHeight: "500px" }}>
      <div style={{ width: "36%", background: t.color, padding: "32px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div><h1 style={{ fontSize: "20px", fontWeight: "900", color: "#fff", margin: "0 0 4px" }}>{cv.name || "Your Name"}</h1><p style={{ color: t.accent, fontWeight: "700", fontSize: "12px", margin: 0 }}>{cv.title || "Job Title"}</p></div>
        <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "16px" }}>
          <ColLabel accent={t.accent}>Contact</ColLabel>
          {cv.email && <ColItem icon="✉">{cv.email}</ColItem>}{cv.phone && <ColItem icon="📞">{cv.phone}</ColItem>}{cv.location && <ColItem icon="📍">{cv.location}</ColItem>}
        </div>
        {skillList.length > 0 && <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "16px" }}><ColLabel accent={t.accent}>Skills</ColLabel>{skillList.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.accent }} /><span style={{ fontSize: "11px", color: "#ddd" }}>{s}</span></div>)}</div>}
        {cv.languages && <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "16px" }}><ColLabel accent={t.accent}>Languages</ColLabel>{cv.languages.split(",").map((l, i) => <ColItem key={i} icon="🌐">{l.trim()}</ColItem>)}</div>}
        {cv.education.some(e => e.school) && <div style={{ borderTop: `1px solid ${t.accent}44`, paddingTop: "16px" }}><ColLabel accent={t.accent}>Education</ColLabel>{cv.education.filter(e => e.school).map((e, i) => <div key={i} style={{ marginBottom: "10px" }}><div style={{ fontSize: "11px", color: t.accent, fontWeight: "700" }}>{e.year}</div><div style={{ fontSize: "11px", color: "#fff", fontWeight: "700" }}>{e.degree}</div><div style={{ fontSize: "11px", color: "#aaa" }}>{e.school}</div></div>)}</div>}
      </div>
      <div style={{ flex: 1, padding: "32px 24px" }}>
        {cv.summary && <div style={{ marginBottom: "20px" }}><RightLabel accent={t.accent}>Profile</RightLabel><p style={{ fontSize: "13px", lineHeight: "1.8", margin: 0, color: "#444" }}>{cv.summary}</p></div>}
        {cv.experience.some(e => e.company) && <div><RightLabel accent={t.accent}>Experience</RightLabel>{cv.experience.filter(e => e.company).map((e, i) => <div key={i} style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: `3px solid ${t.accent}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: "13px" }}>{e.role}</strong><span style={{ fontSize: "11px", color: "#888" }}>{e.period}</span></div><div style={{ color: t.accent, fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>{e.company}</div>{e.points && <p style={{ fontSize: "12px", color: "#555", margin: 0, lineHeight: "1.6" }}>{e.points}</p>}</div>)}</div>}
      </div>
    </div>
  );
}

function PreviewSidebar({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", fontFamily: "'Trebuchet MS',sans-serif", color: "#222", display: "flex" }}>
      <div style={{ width: "30%", background: t.color, padding: "28px 16px" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "900", color: t.color, marginBottom: "14px" }}>{(cv.name || "?")[0].toUpperCase()}</div>
        <ColLabel accent={t.accent}>Contact</ColLabel>
        {cv.email && <ColItem icon="✉">{cv.email}</ColItem>}{cv.phone && <ColItem icon="📞">{cv.phone}</ColItem>}{cv.location && <ColItem icon="📍">{cv.location}</ColItem>}
        {skillList.length > 0 && <div style={{ marginTop: "20px" }}><ColLabel accent={t.accent}>Skills</ColLabel>{skillList.map((s, i) => <div key={i} style={{ fontSize: "11px", color: "#ddd", marginBottom: "8px" }}><div style={{ marginBottom: "3px" }}>{s}</div><div style={{ height: "4px", background: "#ffffff22", borderRadius: "2px" }}><div style={{ height: "4px", width: `${70+(i%3)*10}%`, background: t.accent, borderRadius: "2px" }} /></div></div>)}</div>}
        {cv.languages && <div style={{ marginTop: "20px" }}><ColLabel accent={t.accent}>Languages</ColLabel>{cv.languages.split(",").map((l, i) => <ColItem key={i} icon="🌐">{l.trim()}</ColItem>)}</div>}
      </div>
      <div style={{ flex: 1, padding: "28px 24px" }}>
        <div style={{ marginBottom: "20px" }}><h1 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 2px", color: t.color }}>{cv.name || "Your Name"}</h1><p style={{ color: t.accent, fontWeight: "700", fontSize: "13px", margin: 0 }}>{cv.title || "Job Title"}</p></div>
        {cv.summary && <div style={{ marginBottom: "18px" }}><RightLabel accent={t.accent}>About Me</RightLabel><p style={{ fontSize: "12px", lineHeight: "1.8", margin: 0, color: "#444" }}>{cv.summary}</p></div>}
        {cv.experience.some(e => e.company) && <div style={{ marginBottom: "18px" }}><RightLabel accent={t.accent}>Work Experience</RightLabel>{cv.experience.filter(e => e.company).map((e, i) => <div key={i} style={{ marginBottom: "14px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: "13px", color: t.color }}>{e.role}</strong><span style={{ fontSize: "11px", color: "#888", background: `${t.accent}18`, padding: "2px 8px", borderRadius: "10px" }}>{e.period}</span></div><div style={{ color: t.accent, fontSize: "12px", marginBottom: "4px" }}>{e.company}</div>{e.points && <p style={{ fontSize: "12px", color: "#555", margin: 0, lineHeight: "1.6" }}>{e.points}</p>}</div>)}</div>}
        {cv.education.some(e => e.school) && <div><RightLabel accent={t.accent}>Education</RightLabel>{cv.education.filter(e => e.school).map((e, i) => <div key={i} style={{ marginBottom: "10px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: "13px" }}>{e.degree}</strong><span style={{ fontSize: "11px", color: "#888" }}>{e.year}</span></div><div style={{ fontSize: "12px", color: "#666" }}>{e.school}</div></div>)}</div>}
      </div>
    </div>
  );
}

function PreviewTimeline({ cv, t }) {
  const skillList = cv.skills ? cv.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", fontFamily: "Georgia,serif", color: "#222" }}>
      <div style={{ padding: "32px 36px 20px", borderBottom: `4px solid ${t.accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div><h1 style={{ fontSize: "30px", fontWeight: "900", color: t.color, margin: "0 0 4px" }}>{cv.name || "Your Name"}</h1><p style={{ color: t.accent, fontWeight: "700", fontSize: "14px", margin: 0 }}>{cv.title || "Job Title"}</p></div>
          <div style={{ textAlign: "right", fontSize: "12px", color: "#666", lineHeight: "1.8" }}>{cv.email && <div>{cv.email}</div>}{cv.phone && <div>{cv.phone}</div>}{cv.location && <div>{cv.location}</div>}</div>
        </div>
      </div>
      <div style={{ padding: "24px 36px" }}>
        {cv.summary && <div style={{ marginBottom: "20px", padding: "16px", background: `${t.accent}0d`, borderLeft: `4px solid ${t.accent}`, borderRadius: "0 8px 8px 0" }}><p style={{ fontSize: "13px", lineHeight: "1.8", margin: 0, color: "#444", fontStyle: "italic" }}>{cv.summary}</p></div>}
        {cv.experience.some(e => e.company) && (
          <div style={{ marginBottom: "20px" }}>
            <RightLabel accent={t.accent}>Career Timeline</RightLabel>
            <div style={{ position: "relative", paddingLeft: "24px" }}>
              <div style={{ position: "absolute", left: "7px", top: "4px", bottom: "4px", width: "2px", background: `${t.accent}44` }} />
              {cv.experience.filter(e => e.company).map((e, i) => (
                <div key={i} style={{ position: "relative", marginBottom: "20px" }}>
                  <div style={{ position: "absolute", left: "-20px", top: "4px", width: "12px", height: "12px", borderRadius: "50%", background: t.accent, border: "2px solid #fff", boxShadow: `0 0 0 2px ${t.accent}` }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: "14px", color: t.color }}>{e.role}</strong><span style={{ fontSize: "11px", color: "#888" }}>{e.period}</span></div>
                  <div style={{ color: t.accent, fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>{e.company}</div>
                  {e.points && <p style={{ fontSize: "12px", color: "#555", margin: 0, lineHeight: "1.7" }}>{e.points}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {cv.education.some(e => e.school) && <div><RightLabel accent={t.accent}>Education</RightLabel>{cv.education.filter(e => e.school).map((e, i) => <div key={i} style={{ marginBottom: "10px" }}><strong style={{ fontSize: "13px" }}>{e.degree}</strong><div style={{ fontSize: "12px", color: "#666" }}>{e.school}</div><div style={{ fontSize: "11px", color: t.accent }}>{e.year}</div></div>)}</div>}
          <div>
            {skillList.length > 0 && <div style={{ marginBottom: "14px" }}><RightLabel accent={t.accent}>Skills</RightLabel><div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{skillList.map((s, i) => <span key={i} style={{ padding: "3px 10px", background: `${t.accent}15`, border: `1px solid ${t.accent}44`, borderRadius: "12px", fontSize: "11px", color: "#333" }}>{s}</span>)}</div></div>}
            {cv.languages && <div><RightLabel accent={t.accent}>Languages</RightLabel><p style={{ fontSize: "12px", margin: 0, color: "#444" }}>{cv.languages}</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CVPreview({ cv, template }) {
  const t = template || TEMPLATES[0];
  if (t.layout === "twocol")   return <PreviewTwoCol   cv={cv} t={t} />;
  if (t.layout === "sidebar")  return <PreviewSidebar  cv={cv} t={t} />;
  if (t.layout === "timeline") return <PreviewTimeline cv={cv} t={t} />;
  return <PreviewBanner cv={cv} t={t} />;
}

// ─── PDF DOWNLOAD ─────────────────────────────────────────────────
async function downloadCV(cv, template) {
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
  const W = 210, M = 20;
  const t = template || TEMPLATES[0];
  const hex2rgb = h => { const x = h.replace("#",""); return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)]; };
  const [ar,ag,ab] = hex2rgb(t.accent);
  const [cr,cg,cb] = hex2rgb(t.color);

  const sectionTitle = (title, y) => {
    doc.setDrawColor(ar,ag,ab); doc.setLineWidth(0.5); doc.line(M,y,W-M,y); y+=4;
    doc.setTextColor(ar,ag,ab); doc.setFontSize(9); doc.setFont("helvetica","bold");
    doc.text(title.toUpperCase(),M,y); y+=6;
    doc.setTextColor(40,40,40); doc.setFont("helvetica","normal");
    return y;
  };

  if (t.layout === "twocol" || t.layout === "sidebar") {
    const sideW = t.layout === "sidebar" ? 62 : 70;
    doc.setFillColor(cr,cg,cb); doc.rect(0,0,sideW,297,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont("helvetica","bold");
    const nameLines = doc.splitTextToSize(cv.name||"Your Name",sideW-10);
    doc.text(nameLines,8,20);
    doc.setTextColor(ar,ag,ab); doc.setFontSize(10); doc.setFont("helvetica","bolditalic");
    const titleLines = doc.splitTextToSize(cv.title||"Job Title",sideW-10);
    doc.text(titleLines,8,20+nameLines.length*7);
    let sy=20+nameLines.length*7+titleLines.length*6+6;
    const sideSection=(label)=>{doc.setTextColor(ar,ag,ab);doc.setFontSize(8);doc.setFont("helvetica","bold");doc.text(label.toUpperCase(),8,sy);sy+=4;doc.setDrawColor(ar,ag,ab);doc.setLineWidth(0.3);doc.line(8,sy,sideW-4,sy);sy+=4;doc.setTextColor(200,200,200);doc.setFont("helvetica","normal");doc.setFontSize(8);};
    sideSection("Contact");
    if(cv.email){const l=doc.splitTextToSize(cv.email,sideW-12);doc.text(l,8,sy);sy+=l.length*4+3;}
    if(cv.phone){doc.text(cv.phone,8,sy);sy+=7;}
    if(cv.location){doc.text(cv.location,8,sy);sy+=10;}
    if(cv.skills){sideSection("Skills");cv.skills.split(",").forEach(sk=>{if(!sk.trim())return;const l=doc.splitTextToSize("• "+sk.trim(),sideW-12);doc.text(l,8,sy);sy+=l.length*4+2;});sy+=4;}
    if(cv.languages){sideSection("Languages");cv.languages.split(",").forEach(lg=>{doc.text("• "+lg.trim(),8,sy);sy+=5;});sy+=4;}
    if(cv.education.some(e=>e.school)){sideSection("Education");cv.education.filter(e=>e.school).forEach(e=>{doc.setFont("helvetica","bold");doc.setTextColor(ar,ag,ab);doc.text(e.year||"",8,sy);sy+=4;doc.setTextColor(220,220,220);doc.setFont("helvetica","normal");const dl=doc.splitTextToSize(e.degree,sideW-12);doc.text(dl,8,sy);sy+=dl.length*4+1;const sl=doc.splitTextToSize(e.school,sideW-12);doc.text(sl,8,sy);sy+=sl.length*4+5;});}
    let ry=16; const rx=sideW+8,rw=W-sideW-12;
    if(cv.summary){doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(ar,ag,ab);doc.text("PROFILE",rx,ry);ry+=5;doc.setFont("helvetica","normal");doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.summary,rw);doc.text(sl,rx,ry);ry+=sl.length*4.5+8;}
    if(cv.experience.some(e=>e.company)){doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(ar,ag,ab);doc.text("EXPERIENCE",rx,ry);ry+=2;doc.setDrawColor(ar,ag,ab);doc.line(rx,ry,rx+rw,ry);ry+=5;cv.experience.filter(e=>e.company).forEach(e=>{doc.setFont("helvetica","bold");doc.setTextColor(40,40,40);doc.setFontSize(10);doc.text(e.role||"",rx,ry);doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(e.period||"",W-M,ry,{align:"right"});ry+=5;doc.setFont("helvetica","bold");doc.setTextColor(ar,ag,ab);doc.setFontSize(9);doc.text(e.company||"",rx,ry);ry+=5;if(e.points){doc.setFont("helvetica","normal");doc.setTextColor(70,70,70);doc.setFontSize(8);const pl=doc.splitTextToSize(e.points,rw);doc.text(pl,rx,ry);ry+=pl.length*4+4;}ry+=2;});}
  } else if (t.layout==="timeline") {
    doc.setFillColor(ar,ag,ab);doc.rect(0,0,W,2,"F");
    doc.setTextColor(cr,cg,cb);doc.setFontSize(22);doc.setFont("helvetica","bold");doc.text(cv.name||"Your Name",M,16);
    doc.setTextColor(ar,ag,ab);doc.setFontSize(11);doc.setFont("helvetica","bolditalic");doc.text(cv.title||"Job Title",M,24);
    doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(100,100,100);doc.text([cv.email,cv.phone,cv.location].filter(Boolean).join("   |   "),M,30);
    doc.setDrawColor(ar,ag,ab);doc.setLineWidth(1);doc.line(M,33,W-M,33);
    let y=42;
    if(cv.summary){doc.setFont("helvetica","italic");doc.setFontSize(9);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.summary,W-M*2);doc.text(sl,M,y);y+=sl.length*5+10;}
    if(cv.experience.some(e=>e.company)){y=sectionTitle("Career Timeline",y);const lineX=M+3;cv.experience.filter(e=>e.company).forEach(e=>{doc.setFillColor(ar,ag,ab);doc.circle(lineX,y+1,2,"F");doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(40,40,40);doc.text(e.role||"",lineX+6,y+2);doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(e.period||"",W-M,y+2,{align:"right"});doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(ar,ag,ab);doc.text(e.company||"",lineX+6,y+7);y+=10;if(e.points){doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(70,70,70);const pl=doc.splitTextToSize(e.points,W-M*2-10);doc.text(pl,lineX+6,y);y+=pl.length*4+2;}y+=6;});}
    if(cv.education.some(e=>e.school)){y=sectionTitle("Education",y);cv.education.filter(e=>e.school).forEach(e=>{doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(40,40,40);doc.text(e.degree||"",M,y);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text(e.school||"",M,y+5);doc.text(e.year||"",W-M,y,{align:"right"});y+=12;});}
    if(cv.skills){y=sectionTitle("Skills",y);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.skills,W-M*2);doc.text(sl,M,y);y+=sl.length*5+4;}
    if(cv.languages){y=sectionTitle("Languages",y);doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(60,60,60);doc.text(cv.languages,M,y);}
  } else {
    doc.setFillColor(cr,cg,cb);doc.rect(0,0,W,38,"F");doc.setFillColor(ar,ag,ab);doc.rect(0,36,W,2,"F");
    doc.setTextColor(255,255,255);doc.setFontSize(22);doc.setFont("helvetica","bold");doc.text(cv.name||"Your Name",M,16);
    doc.setFontSize(11);doc.setFont("helvetica","normal");doc.setTextColor(ar,ag,ab);doc.text(cv.title||"Job Title",M,24);
    doc.setFontSize(8);doc.setTextColor(200,200,200);doc.text([cv.email,cv.phone,cv.location].filter(Boolean).join("  •  "),M,31);
    let y=48;
    if(cv.summary){y=sectionTitle("Professional Summary",y);doc.setFontSize(9);const l=doc.splitTextToSize(cv.summary,W-M*2);doc.text(l,M,y);y+=l.length*5+8;}
    if(cv.experience.some(e=>e.company)){y=sectionTitle("Experience",y);cv.experience.filter(e=>e.company).forEach(e=>{doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(40,40,40);doc.text(`${e.role} — ${e.company}`,M,y);doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(e.period||"",W-M,y,{align:"right"});y+=5;if(e.points){doc.setFont("helvetica","normal");doc.setTextColor(70,70,70);const pl=doc.splitTextToSize(e.points,W-M*2-4);doc.text(pl,M+2,y);y+=pl.length*4.5+3;}y+=2;});y+=4;}
    if(cv.education.some(e=>e.school)){y=sectionTitle("Education",y);cv.education.filter(e=>e.school).forEach(e=>{doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(40,40,40);doc.text(`${e.degree} — ${e.school}`,M,y);doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text(e.year||"",W-M,y,{align:"right"});y+=9;});y+=4;}
    if(cv.skills){y=sectionTitle("Skills",y);doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(60,60,60);const sl=doc.splitTextToSize(cv.skills,W-M*2);doc.text(sl,M,y);y+=sl.length*5+6;}
    if(cv.languages){y=sectionTitle("Languages",y);doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(60,60,60);doc.text(cv.languages,M,y);}
  }
  doc.save(`${(cv.name||"CV").replace(/\s+/g,"_")}_CVPassport.pdf`);
}

// ─── LANDING ─────────────────────────────────────────────────────
function LandingPage({ onLogin, onSignup }) {
  return (
    <div>
      <div style={{ textAlign:"center", padding:"80px 40px 60px", maxWidth:"800px", margin:"0 auto" }}>
        <div style={{ ...S.badge("free"), marginBottom:"20px", fontSize:"13px" }}>🇦🇪 Built for Gulf Job Seekers</div>
        <h1 style={{ fontSize:"clamp(36px,6vw,64px)", fontWeight:"900", lineHeight:"1.1", marginBottom:"20px", letterSpacing:"-2px" }}>
          Your CV is your{" "}
          <span style={{ background:`linear-gradient(135deg,${C.accent},${C.gold})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>passport</span>
          {" "}to the Gulf
        </h1>
        <p style={{ fontSize:"18px", color:C.muted, marginBottom:"36px", lineHeight:"1.7" }}>ATS-optimised CVs built for UAE, Saudi & GCC job markets. Free to build. Free to download.</p>
        <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
          <button style={S.btn("primary","lg")} onClick={onSignup}>Build My CV Free →</button>
          <button style={S.btn("outline","lg")} onClick={onLogin}>Sign In</button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"20px", padding:"0 40px 60px", maxWidth:"1000px", margin:"0 auto" }}>
        {[{icon:"🎯",title:"ATS Optimised",desc:"Beat applicant tracking systems used by UAE banks"},{icon:"📐",title:"4 Unique Layouts",desc:"Banner, two-column, sidebar & timeline"},{icon:"💾",title:"Auto-Saved",desc:"Your CV saves automatically — never lose your work"},{icon:"🔒",title:"Free Download",desc:"Build & download free. No tricks"}].map((f,i)=>(
          <div key={i} style={{...S.card,textAlign:"center"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>{f.icon}</div><div style={{fontWeight:"700",marginBottom:"8px"}}>{f.title}</div><div style={{fontSize:"13px",color:C.muted,lineHeight:"1.6"}}>{f.desc}</div></div>
        ))}
      </div>
      <div style={{padding:"0 40px 80px",maxWidth:"900px",margin:"0 auto"}}>
        <h2 style={{textAlign:"center",fontSize:"28px",fontWeight:"800",marginBottom:"32px"}}>4 Different Layouts</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"16px"}}>
          {TEMPLATES.map(t=>(
            <div key={t.id} style={{background:t.color,border:`2px solid ${t.accent}`,borderRadius:"14px",padding:"20px",cursor:"pointer",transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"} onClick={onSignup}>
              <div style={{...S.badge(t.tier),marginBottom:"12px"}}>{t.tier==="free"?"FREE":"⭐ PRO"}</div>
              <div style={{fontWeight:"700",fontSize:"14px",color:"#fff",marginBottom:"4px"}}>{t.name}</div>
              <div style={{fontSize:"12px",color:t.accent}}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────
function AuthPage({ mode, onAuth, onToggle, loading, error }) {
  const [form, setForm] = useState({name:"",email:"",password:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div style={{maxWidth:"420px",margin:"60px auto",padding:"0 20px"}}>
      <div style={S.card}>
        <h2 style={{fontSize:"24px",fontWeight:"800",marginBottom:"6px"}}>{mode==="login"?"Welcome back":"Create account"}</h2>
        <p style={{color:C.muted,marginBottom:"28px",fontSize:"14px"}}>{mode==="login"?"Sign in to your CVPassport account":"Start building your Gulf CV today"}</p>
        {error&&<div style={{background:"rgba(239,68,68,0.1)",border:`1px solid ${C.danger}`,borderRadius:"8px",padding:"12px 16px",marginBottom:"20px",fontSize:"13px",color:C.danger}}>{error}</div>}
        {mode==="signup"&&<div style={{marginBottom:"16px"}}><label style={S.label}>Full Name</label><input style={S.input} placeholder="Your Name" value={form.name} onChange={e=>set("name",e.target.value)}/></div>}
        <div style={{marginBottom:"16px"}}><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="you@email.com" value={form.email} onChange={e=>set("email",e.target.value)}/></div>
        <div style={{marginBottom:"24px"}}><label style={S.label}>Password</label><input style={S.input} type="password" placeholder="••••••••" value={form.password} onChange={e=>set("password",e.target.value)}/></div>
        <button style={{...S.btn("primary","lg"),width:"100%",opacity:loading?0.7:1,cursor:loading?"not-allowed":"pointer"}} disabled={loading} onClick={()=>onAuth({...form,name:form.name||form.email.split("@")[0]})}>
          {loading?"Please wait...":mode==="login"?"Sign In →":"Create Free Account →"}
        </button>
        <p style={{textAlign:"center",marginTop:"20px",fontSize:"13px",color:C.muted}}>
          {mode==="login"?"No account? ":"Already have one? "}
          <span style={{color:C.accent,cursor:"pointer",fontWeight:"600"}} onClick={onToggle}>{mode==="login"?"Sign up free":"Sign in"}</span>
        </p>
      </div>
    </div>
  );
}

// ─── CV BUILDER ───────────────────────────────────────────────────
function CVBuilder({ user, onBack, initialCV, initialCVId, initialTemplateId }) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(
    TEMPLATES.find(t => t.id === initialTemplateId) || TEMPLATES[0]
  );
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // "saved" | "error" | null
  const [cvId, setCvId] = useState(initialCVId || null);
  const [cv, setCv] = useState(initialCV || { ...EMPTY_CV, name: user?.name||"", email: user?.email||"" });

  const set = (k,v) => setCv(c=>({...c,[k]:v}));

  const score=(()=>{let s=0;if(cv.name)s+=10;if(cv.email)s+=10;if(cv.phone)s+=10;if(cv.title)s+=15;if(cv.summary?.length>50)s+=20;if(cv.experience[0].company)s+=20;if(cv.skills?.length>20)s+=15;return s;})();
  const scoreColor=score>=80?C.success:score>=50?C.gold:C.danger;

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const saved = await saveCV(user.id, cv, selectedTemplate.id, cvId);
      setCvId(saved.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, cv, selectedTemplate, cvId]);

  const handleDownload = async () => {
    setDownloading(true);
    // Auto-save before download
    if (user?.id) await handleSave();
    try { await downloadCV(cv, selectedTemplate); }
    catch(e) { alert("PDF error: "+e.message); }
    finally { setDownloading(false); }
  };

  return (
    <div style={{maxWidth:"1000px",margin:"0 auto",padding:"30px 20px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"28px",flexWrap:"wrap"}}>
        <button style={S.btn("outline","sm")} onClick={onBack}>← Back</button>
        <h1 style={{fontSize:"22px",fontWeight:"800",margin:0}}>CV Builder</h1>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
          {/* Save status */}
          {saveStatus==="saved" && <span style={{fontSize:"12px",color:C.success}}>✓ Saved</span>}
          {saveStatus==="error" && <span style={{fontSize:"12px",color:C.danger}}>✗ Save failed</span>}
          {saving && <span style={{fontSize:"12px",color:C.muted}}>Saving...</span>}
          <button style={{...S.btn("success","sm"),opacity:saving?0.6:1}} onClick={handleSave} disabled={saving}>
            💾 Save
          </button>
          <span style={{fontSize:"13px",color:C.muted}}>ATS:</span>
          <span style={{fontSize:"20px",fontWeight:"800",color:scoreColor}}>{score}%</span>
        </div>
      </div>

      {/* Step tabs */}
      <div style={{display:"flex",gap:"6px",marginBottom:"28px",overflowX:"auto"}}>
        {["Personal Info","Experience","Education","Skills","Template","Preview"].map((s,i)=>(
          <button key={i} onClick={()=>setStep(i+1)} style={{padding:"8px 14px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"12px",whiteSpace:"nowrap",background:step===i+1?C.accent:C.card,color:step===i+1?"#fff":C.muted}}>{i+1}. {s}</button>
        ))}
      </div>

      {step===1&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          {[{label:"Full Name",key:"name",placeholder:"Junaid Khan"},{label:"Job Title",key:"title",placeholder:"Customer Service Officer"},{label:"Email",key:"email",placeholder:"you@email.com"},{label:"Phone",key:"phone",placeholder:"+971 5X XXX XXXX"},{label:"Location",key:"location",placeholder:"Dubai, UAE"}].map(f=>(
            <div key={f.key}><label style={S.label}>{f.label}</label><input style={S.input} placeholder={f.placeholder} value={cv[f.key]} onChange={e=>set(f.key,e.target.value)}/></div>
          ))}
          <div style={{gridColumn:"1/-1"}}><label style={S.label}>Professional Summary (2–3 lines only)</label><textarea style={{...S.input,height:"100px",resize:"vertical"}} placeholder="Client-focused professional with 4+ years experience in customer service across Gulf markets..." value={cv.summary} onChange={e=>set("summary",e.target.value)}/></div>
        </div>
      )}

      {step===2&&(
        <div>
          {cv.experience.map((exp,i)=>(
            <div key={i} style={{...S.card,marginBottom:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"14px"}}>
                <span style={{fontWeight:"700"}}>Experience #{i+1}</span>
                {i>0&&<button style={S.btn("danger","sm")} onClick={()=>setCv(c=>({...c,experience:c.experience.filter((_,j)=>j!==i)}))}>Remove</button>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                {[{label:"Company",key:"company",placeholder:"ADIB / Mashreq / FAB"},{label:"Role",key:"role",placeholder:"Customer Service Officer"},{label:"Period",key:"period",placeholder:"Jan 2023 – Present"}].map(f=>(
                  <div key={f.key}><label style={S.label}>{f.label}</label><input style={S.input} placeholder={f.placeholder} value={exp[f.key]} onChange={e=>{const u=[...cv.experience];u[i]={...u[i],[f.key]:e.target.value};set("experience",u);}}/></div>
                ))}
                <div style={{gridColumn:"1/-1"}}><label style={S.label}>Key Achievements (one per line)</label><textarea style={{...S.input,height:"80px",resize:"vertical"}} placeholder="Handled 50+ customer queries daily&#10;Achieved 98% satisfaction score" value={exp.points} onChange={e=>{const u=[...cv.experience];u[i]={...u[i],points:e.target.value};set("experience",u);}}/></div>
              </div>
            </div>
          ))}
          <button style={S.btn("outline")} onClick={()=>setCv(c=>({...c,experience:[...c.experience,{company:"",role:"",period:"",points:""}]}))}>+ Add Experience</button>
        </div>
      )}

      {step===3&&(
        <div>
          {cv.education.map((edu,i)=>(
            <div key={i} style={{...S.card,marginBottom:"16px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
                {[{label:"Institution",key:"school",placeholder:"Amity University"},{label:"Degree",key:"degree",placeholder:"B.Com / BBA"},{label:"Year",key:"year",placeholder:"2021"}].map(f=>(
                  <div key={f.key}><label style={S.label}>{f.label}</label><input style={S.input} placeholder={f.placeholder} value={edu[f.key]} onChange={e=>{const u=[...cv.education];u[i]={...u[i],[f.key]:e.target.value};set("education",u);}}/></div>
                ))}
              </div>
            </div>
          ))}
          <button style={S.btn("outline")} onClick={()=>setCv(c=>({...c,education:[...c.education,{school:"",degree:"",year:""}]}))}>+ Add Education</button>
        </div>
      )}

      {step===4&&(
        <div style={{display:"grid",gap:"16px"}}>
          <div><label style={S.label}>Skills (comma separated)</label><textarea style={{...S.input,height:"80px"}} placeholder="Customer Service, CRM Systems, Problem Solving, MS Office" value={cv.skills} onChange={e=>set("skills",e.target.value)}/></div>
          <div><label style={S.label}>Languages</label><input style={S.input} placeholder="English (Fluent), Hindi (Native), Arabic (Basic)" value={cv.languages} onChange={e=>set("languages",e.target.value)}/></div>
        </div>
      )}

      {step===5&&(
        <div>
          <h3 style={{marginBottom:"20px",fontWeight:"700"}}>Choose Your Template</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px"}}>
            {TEMPLATES.map(t=>(
              <div key={t.id} onClick={()=>setSelectedTemplate(t)} style={{background:t.color,border:`2px solid ${selectedTemplate?.id===t.id?"#fff":t.accent}`,borderRadius:"14px",padding:"20px",cursor:"pointer",transform:selectedTemplate?.id===t.id?"scale(1.04)":"scale(1)",transition:"all 0.2s",boxShadow:selectedTemplate?.id===t.id?`0 0 20px ${t.accent}66`:"none"}}>
                <div style={{...S.badge(t.tier),marginBottom:"10px"}}>{t.tier==="free"?"FREE":"⭐ PRO"}</div>
                <div style={{fontWeight:"700",fontSize:"13px",color:"#fff",marginBottom:"4px"}}>{t.name}</div>
                <div style={{fontSize:"11px",color:t.accent,marginBottom:"6px"}}>{t.desc}</div>
                {selectedTemplate?.id===t.id&&<div style={{marginTop:"8px",fontSize:"11px",color:"#fff",fontWeight:"700"}}>✓ Selected</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {step===6&&(
        <div>
          <div style={{maxWidth:"720px",margin:"0 auto"}}>
            <CVPreview cv={cv} template={selectedTemplate}/>
          </div>
          <div style={{textAlign:"center",marginTop:"24px",display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
            <button style={{...S.btn("gold","lg"),opacity:downloading?0.7:1,cursor:downloading?"not-allowed":"pointer"}} disabled={downloading} onClick={handleDownload}>
              {downloading?"Generating PDF...":"⬇ Download PDF"}
            </button>
            <button style={S.btn("success")} onClick={handleSave} disabled={saving}>
              {saving?"Saving...":"💾 Save CV"}
            </button>
            <button style={S.btn("outline")} onClick={()=>setStep(1)}>✏️ Edit CV</button>
          </div>
          {saveStatus==="saved"&&<p style={{textAlign:"center",color:C.success,marginTop:"12px",fontSize:"13px"}}>✓ CV saved to your account!</p>}
        </div>
      )}

      {step<6&&(
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"30px"}}>
          {step>1?<button style={S.btn("outline")} onClick={()=>setStep(s=>s-1)}>← Previous</button>:<div/>}
          <button style={S.btn("primary")} onClick={()=>setStep(s=>s+1)}>{step===5?"Preview CV →":"Next →"}</button>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function Dashboard({ user, onBuildCV, onEditCV }) {
  const [cvList, setCvList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadUserCVs(user.id)
      .then(data => setCvList(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (cvId) => {
    if (!window.confirm("Delete this CV?")) return;
    setDeleting(cvId);
    try {
      await deleteCV(cvId, user.id);
      setCvList(prev => prev.filter(c => c.id !== cvId));
    } catch(e) {
      alert("Error deleting CV");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{maxWidth:"1000px",margin:"0 auto",padding:"40px 20px"}}>
      <div style={{marginBottom:"36px"}}>
        <h1 style={{fontSize:"26px",fontWeight:"800",marginBottom:"6px"}}>Welcome back, {user.name} 👋</h1>
        <p style={{color:C.muted}}>Ready to build or update your Gulf CV?</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"16px",marginBottom:"36px"}}>
        {[{label:"CVs Saved",value:cvList.length.toString(),icon:"📄",color:C.accent},{label:"ATS Ready",value:"✓",icon:"🎯",color:C.success},{label:"Templates",value:"4",icon:"🎨",color:C.gold},{label:"Downloads",value:"–",icon:"⬇️",color:"#ec4899"}].map((s,i)=>(
          <div key={i} style={S.card}><div style={{fontSize:"28px",marginBottom:"8px"}}>{s.icon}</div><div style={{fontSize:"28px",fontWeight:"900",color:s.color}}>{s.value}</div><div style={{fontSize:"13px",color:C.muted}}>{s.label}</div></div>
        ))}
      </div>

      {/* Saved CVs */}
      <div style={{...S.card,marginBottom:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
          <h3 style={{fontWeight:"800",margin:0}}>My CVs</h3>
          <button style={S.btn("primary","sm")} onClick={onBuildCV}>+ New CV</button>
        </div>

        {loading && <p style={{color:C.muted,fontSize:"14px"}}>Loading your CVs...</p>}

        {!loading && cvList.length === 0 && (
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>📄</div>
            <p style={{color:C.muted,marginBottom:"16px"}}>No CVs saved yet</p>
            <button style={S.btn("primary")} onClick={onBuildCV}>Build Your First CV →</button>
          </div>
        )}

        {!loading && cvList.length > 0 && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {cvList.map(cvRecord => {
              const t = TEMPLATES.find(t => t.id === cvRecord.template_id) || TEMPLATES[0];
              const updatedDate = new Date(cvRecord.updated_at).toLocaleDateString("en-AE", {day:"numeric",month:"short",year:"numeric"});
              return (
                <div key={cvRecord.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px 16px",background:C.surface,borderRadius:"10px",border:`1px solid ${C.border}`}}>
                  <div style={{width:"36px",height:"36px",borderRadius:"8px",background:t.color,border:`2px solid ${t.accent}`,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:"700",fontSize:"14px",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cvRecord.title}</div>
                    <div style={{fontSize:"12px",color:C.muted}}>{t.name} • Updated {updatedDate}</div>
                  </div>
                  <div style={{display:"flex",gap:"8px",flexShrink:0}}>
                    <button style={S.btn("outline","sm")} onClick={()=>onEditCV(cvRecord)}>Edit</button>
                    <button style={S.btn("danger","sm")} onClick={()=>handleDelete(cvRecord.id)} disabled={deleting===cvRecord.id}>
                      {deleting===cvRecord.id?"...":"Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"20px"}}>
        <div style={S.card}>
          <h3 style={{fontWeight:"800",marginBottom:"16px"}}>Quick Actions</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <button style={{...S.btn("primary","lg"),textAlign:"left"}} onClick={onBuildCV}>📄 Build New CV</button>
            <button style={{...S.btn("gold"),textAlign:"left"}}>⭐ Upgrade to Premium — AED 29/mo</button>
          </div>
        </div>
        <div style={S.card}>
          <h3 style={{fontWeight:"800",marginBottom:"16px"}}>Your Plan</h3>
          <div style={{...S.badge("free"),marginBottom:"12px",fontSize:"13px"}}>FREE PLAN</div>
          <ul style={{color:C.muted,fontSize:"13px",paddingLeft:"16px",lineHeight:"2"}}><li>3 free templates</li><li>PDF download</li><li>CV auto-save</li></ul>
          <button style={{...S.btn("gold"),width:"100%",marginTop:"16px"}}>Upgrade → AED 29/mo</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
const extractName = u => u.user_metadata?.name||u.user_metadata?.full_name||u.email.split("@")[0];

export default function App() {
  const [page, setPage]           = useState("landing");
  const [authMode, setAuthMode]   = useState("signup");
  const [user, setUser]           = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [editingCV, setEditingCV] = useState(null); // CV record to edit

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){setUser({name:extractName(session.user),email:session.user.email,id:session.user.id});setPage("dashboard");}
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{
      if(session?.user)setUser(prev=>({name:prev?.name||extractName(session.user),email:session.user.email,id:session.user.id}));
      else setUser(null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const handleAuth=async(userData)=>{
    setAuthError(null);setAuthLoading(true);
    try{
      if(authMode==="signup"){
        const{data,error}=await supabase.auth.signUp({email:userData.email,password:userData.password,options:{data:{name:userData.name}}});
        if(error)throw error;
        if(data.user){setUser({name:userData.name,email:data.user.email,id:data.user.id});setPage("dashboard");}
      }else{
        const{data,error}=await supabase.auth.signInWithPassword({email:userData.email,password:userData.password});
        if(error)throw error;
        setUser({name:extractName(data.user),email:data.user.email,id:data.user.id});setPage("dashboard");
      }
    }catch(err){setAuthError(err.message);}
    finally{setAuthLoading(false);}
  };

  const handleLogout=async()=>{await supabase.auth.signOut();setUser(null);setPage("landing");};

  const handleEditCV=(cvRecord)=>{
    setEditingCV(cvRecord);
    setPage("builder");
  };

  const handleNewCV=()=>{
    setEditingCV(null);
    setPage("builder");
  };

  return (
    <div style={S.app}>
      <nav style={S.nav}>
        <div style={S.logo} onClick={()=>setPage(user?"dashboard":"landing")} role="button" tabIndex={0}>CV Passport</div>
        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          {user?(
            <><span style={{color:C.muted,fontSize:"14px"}}>Hi, {user.name}</span><button style={S.btn("outline","sm")} onClick={handleNewCV}>Build CV</button><button style={S.btn("","sm")} onClick={handleLogout}>Sign Out</button></>
          ):(
            <><button style={S.btn("outline","sm")} onClick={()=>{setAuthMode("login");setPage("auth");}}>Sign In</button><button style={S.btn("primary","sm")} onClick={()=>{setAuthMode("signup");setPage("auth");}}>Get Started</button></>
          )}
        </div>
      </nav>
      {page==="landing"&&<LandingPage onLogin={()=>{setAuthMode("login");setPage("auth");}} onSignup={()=>{setAuthMode("signup");setPage("auth");}}/>}
      {page==="auth"&&<AuthPage mode={authMode} onAuth={handleAuth} onToggle={()=>{setAuthMode(m=>m==="login"?"signup":"login");setAuthError(null);}} loading={authLoading} error={authError}/>}
      {page==="dashboard"&&user&&<Dashboard user={user} onBuildCV={handleNewCV} onEditCV={handleEditCV}/>}
      {page==="builder"&&(
        <CVBuilder
          user={user}
onBack={()=>setPage(user?"dashboard":"landing")}
          initialCV={editingCV?.cv_data||null}
          initialCVId={editingCV?.id||null}
          initialTemplateId={editingCV?.template_id||null}
        />
      )}
      <Analytics />
    </div>
  );
}