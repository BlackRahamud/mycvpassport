import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const TEMPLATES = [
  // FREE
  { id: 1, name: "Gulf Classic", tier: "free", color: "#1a1a2e", accent: "#e94560", desc: "Clean & ATS-friendly" },
  { id: 2, name: "Dubai Modern", tier: "free", color: "#0f3460", accent: "#16213e", desc: "Sleek corporate look" },
  { id: 3, name: "Arabia Pro", tier: "free", color: "#533483", accent: "#e94560", desc: "Bold professional" },
  // PREMIUM
  { id: 4, name: "Executive Gold", tier: "premium", color: "#1a0a00", accent: "#d4a017", desc: "Luxury executive style" },
  { id: 5, name: "Sharjah Elite", tier: "premium", color: "#002147", accent: "#c9a84c", desc: "Refined & authoritative" },
  { id: 6, name: "Abu Dhabi Pro", tier: "premium", color: "#003366", accent: "#00b4d8", desc: "Government-ready" },
  { id: 7, name: "Finance First", tier: "premium", color: "#0d1b2a", accent: "#00c896", desc: "Banking & finance" },
  { id: 8, name: "Tech Minimal", tier: "premium", color: "#0a0a0a", accent: "#00ff88", desc: "Clean tech aesthetic" },
  { id: 9, name: "Hospitality Star", tier: "premium", color: "#2d1b00", accent: "#ffb347", desc: "Hotels & tourism" },
  { id: 10, name: "Healthcare Plus", tier: "premium", color: "#001a33", accent: "#4fc3f7", desc: "Medical professionals" },
  { id: 11, name: "Sales Champion", tier: "premium", color: "#1a0000", accent: "#ff4444", desc: "Sales & marketing" },
  { id: 12, name: "Creative Edge", tier: "premium", color: "#0d0d1a", accent: "#a855f7", desc: "Creative industries" },
  { id: 13, name: "Real Estate Pro", tier: "premium", color: "#0a1628", accent: "#22c55e", desc: "Property professionals" },
  { id: 14, name: "Legal Eagle", tier: "premium", color: "#1a1a00", accent: "#eab308", desc: "Legal & compliance" },
  { id: 15, name: "Logistics Master", tier: "premium", color: "#001a1a", accent: "#06b6d4", desc: "Supply chain & ops" },
  { id: 16, name: "Retail Leader", tier: "premium", color: "#1a001a", accent: "#ec4899", desc: "Retail management" },
  { id: 17, name: "HR Professional", tier: "premium", color: "#001a0d", accent: "#10b981", desc: "Human resources" },
  { id: 18, name: "IT Specialist", tier: "premium", color: "#000d1a", accent: "#3b82f6", desc: "IT & cybersecurity" },
  { id: 19, name: "Engineering Pro", tier: "premium", color: "#0d0d00", accent: "#f59e0b", desc: "Engineering & technical" },
  { id: 20, name: "Consulting Elite", tier: "premium", color: "#1a0a0a", accent: "#f43f5e", desc: "Management consulting" },
  { id: 21, name: "Education First", tier: "premium", color: "#0a001a", accent: "#8b5cf6", desc: "Teaching & academia" },
  { id: 22, name: "Aviation Pro", tier: "premium", color: "#000a1a", accent: "#38bdf8", desc: "Aviation & airline" },
  { id: 23, name: "Entrepreneur", tier: "premium", color: "#1a0a00", accent: "#fb923c", desc: "Startup founders" },
];

const COLORS = {
  bg: "#080c14",
  surface: "rgba(255, 255, 255, 0.03)",
  card: "rgba(255, 255, 255, 0.03)",
  border: "rgba(255, 255, 255, 0.07)",
  accent: "#6366f1",
  accentHover: "#818cf8",
  gold: "#f59e0b",
  text: "#f0f0ff",
  muted: "#8888aa",
  success: "#10b981",
  danger: "#ef4444",
};

// ─── LANDING PAGE ────────────────────────────────────────────────
function LandingPage({ onLogin, onSignup }) {
  return (
    <div>
      {/* Hero with glow effect */}
      <div style={{ 
        textAlign: "center", 
        padding: "120px 40px 80px", 
        maxWidth: "900px", 
        margin: "0 auto",
        position: "relative"
      }}>
        {/* Background glow behind headline */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "300px",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          zIndex: -1,
          pointerEvents: "none"
        }} />
        
        <div style={{ 
          display: "inline-block",
          padding: "8px 20px",
          background: "rgba(99, 102, 241, 0.1)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderRadius: "50px",
          marginBottom: "32px",
          fontSize: "14px",
          color: COLORS.accent,
          fontWeight: "500",
          letterSpacing: "0.5px"
        }}>
          🇦🇪 Built for Gulf Job Seekers
        </div>
        
        <h1 style={{
          fontSize: "clamp(48px, 7vw, 72px)", 
          fontWeight: "900",
          lineHeight: "1.05", 
          marginBottom: "24px", 
          letterSpacing: "-2px",
          fontFamily: "'Playfair Display', serif",
        }}>
          Your CV is your{" "}
          <span style={{
            background: "linear-gradient(135deg, #6366f1 0%, #f59e0b 100%)",
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
          }}>
            passport
          </span>{" "}
          to the Gulf
        </h1>
        
        <p style={{ 
          fontSize: "20px", 
          color: COLORS.muted, 
          marginBottom: "48px", 
          lineHeight: "1.7",
          maxWidth: "600px",
          margin: "0 auto 48px"
        }}>
          ATS-optimised CVs built for UAE, Saudi & GCC job markets.
          Free to build. Free to download. No tricks.
        </p>
        
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button 
            className="premium-btn"
            style={{
              padding: "18px 40px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "16px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              color: "#fff",
              border: "none",
              boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)",
            }} 
            onClick={onSignup}
          >
            Build My CV Free →
          </button>
          <button 
            className="premium-btn"
            style={{
              padding: "18px 40px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "16px",
              background: "transparent",
              color: COLORS.text,
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }} 
            onClick={onLogin}
          >
            Sign In
          </button>
        </div>
        
        <p style={{ marginTop: "24px", fontSize: "14px", color: COLORS.muted }}>
          No credit card • No signup required to preview
        </p>
      </div>

      {/* Features - Glass Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", 
        gap: "24px", 
        padding: "0 40px 100px", 
        maxWidth: "1200px", 
        margin: "0 auto" 
      }}>
        {[
          { icon: "🎯", title: "ATS Optimised", desc: "Beat applicant tracking systems used by UAE banks & corporates" },
          { icon: "📄", title: "23 Templates", desc: "3 free + 20 premium templates for every Gulf industry" },
          { icon: "⚡", title: "5-Minute CV", desc: "Fill the form, pick a template, download your PDF instantly" },
          { icon: "🔒", title: "Trust First", desc: "Build & download free. Pay only for AI upgrades" },
        ].map((f, i) => (
          <div key={i} style={{ 
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "20px",
            padding: "32px",
            backdropFilter: "blur(20px)",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
          >
            <div style={{ fontSize: "40px", marginBottom: "20px" }}>{f.icon}</div>
            <div style={{ 
              fontWeight: "700", 
              marginBottom: "12px",
              fontSize: "18px",
              fontFamily: "'Playfair Display', serif"
            }}>{f.title}</div>
            <div style={{ fontSize: "14px", color: COLORS.muted, lineHeight: "1.7" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Templates Preview */}
      <div style={{ padding: "0 40px 100px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ 
          textAlign: "center", 
          fontSize: "42px", 
          fontWeight: "900", 
          marginBottom: "16px",
          fontFamily: "'Playfair Display', serif"
        }}>
          23 Professional Templates
        </h2>
        <p style={{ textAlign: "center", color: COLORS.muted, marginBottom: "48px", fontSize: "18px" }}>
          Industry-specific designs for the Gulf market
        </p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
          {TEMPLATES.map(t => (
            <div key={t.id} style={{
              background: t.color,
              border: `2px solid ${t.accent}`,
              borderRadius: "16px",
              padding: "24px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden"
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = `0 20px 40px ${t.accent}33`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onClick={onSignup}
            >
              <div style={{ 
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: "700",
                background: t.tier === "free" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                color: t.tier === "free" ? COLORS.success : COLORS.gold,
                border: `1px solid ${t.tier === "free" ? COLORS.success : COLORS.gold}`,
                marginBottom: "16px",
                letterSpacing: "0.5px"
              }}>
                {t.tier === "free" ? "FREE" : "PRO"}
              </div>
              <div style={{ 
                fontWeight: "700", 
                fontSize: "15px", 
                color: "#fff", 
                marginBottom: "8px",
                fontFamily: "'Playfair Display', serif"
              }}>{t.name}</div>
              <div style={{ fontSize: "12px", color: t.accent, opacity: 0.9 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH ────────────────────────────────────────────────────────
function AuthPage({ mode, onAuth, onToggle, loading, error }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ 
      maxWidth: "480px", 
      margin: "80px auto", 
      padding: "0 20px" 
    }}>
      <div style={{ 
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "20px",
        padding: "48px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        <h2 style={{ 
          fontSize: "32px", 
          fontWeight: "900", 
          marginBottom: "8px",
          fontFamily: "'Playfair Display', serif"
        }}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p style={{ 
          color: COLORS.muted, 
          marginBottom: "36px", 
          fontSize: "15px",
          lineHeight: "1.6"
        }}>
          {mode === "login" ? "Sign in to your CVPassport account" : "Start building your Gulf CV today"}
        </p>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", 
            border: `1px solid ${COLORS.danger}`,
            borderRadius: "12px", 
            padding: "16px 20px", 
            marginBottom: "24px",
            fontSize: "14px", 
            color: COLORS.danger,
          }}>
            {error}
          </div>
        )}

        {mode === "signup" && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block",
              fontSize: "14px",
              color: COLORS.muted,
              marginBottom: "8px",
              fontWeight: "500",
            }}>Full Name</label>
            <input 
              style={{
                width: "100%",
                padding: "14px 18px",
                background: "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${COLORS.border}`,
                borderRadius: "12px",
                color: COLORS.text,
                fontSize: "15px",
                outline: "none",
                transition: "all 0.2s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              placeholder="Junaid Khan" 
              value={form.name}
              onChange={e => set("name", e.target.value)} 
            />
          </div>
        )}
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ 
            display: "block",
            fontSize: "14px",
            color: COLORS.muted,
            marginBottom: "8px",
            fontWeight: "500",
          }}>Email</label>
          <input 
            style={{
              width: "100%",
              padding: "14px 18px",
              background: "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "12px",
              color: COLORS.text,
              fontSize: "15px",
              outline: "none",
              transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
            }}
            type="email" 
            placeholder="you@email.com" 
            value={form.email}
            onChange={e => set("email", e.target.value)} 
          />
        </div>
        
        <div style={{ marginBottom: "32px" }}>
          <label style={{ 
            display: "block",
            fontSize: "14px",
            color: COLORS.muted,
            marginBottom: "8px",
            fontWeight: "500",
          }}>Password</label>
          <input 
            style={{
              width: "100%",
              padding: "14px 18px",
              background: "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "12px",
              color: COLORS.text,
              fontSize: "15px",
              outline: "none",
              transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
            }}
            type="password" 
            placeholder="••••••••" 
            value={form.password}
            onChange={e => set("password", e.target.value)} 
          />
        </div>

        <button
          className="premium-btn"
          style={{ 
            width: "100%",
            padding: "16px 24px",
            borderRadius: "12px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "16px",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "#fff",
            border: "none",
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)",
          }}
          disabled={loading}
          onClick={() => onAuth({ ...form, name: form.name || form.email.split("@")[0] })}
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Free Account →"}
        </button>

        <p style={{ textAlign: "center", marginTop: "28px", fontSize: "14px", color: COLORS.muted }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span 
            style={{ 
              color: COLORS.accent, 
              cursor: "pointer", 
              fontWeight: "600",
              transition: "color 0.2s"
            }} 
            onClick={onToggle}
          >
            {mode === "login" ? "Sign up free" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── CV BUILDER ──────────────────────────────────────────────────
function CVBuilder({ user, onBack }) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [cv, setCv] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    location: "Dubai, UAE",
    title: "",
    summary: "",
    experience: [{ company: "", role: "", period: "", points: "" }],
    education: [{ school: "", degree: "", year: "" }],
    skills: "",
    languages: "English, Hindi",
  });

  const set = (k, v) => setCv(c => ({ ...c, [k]: v }));

  const atsScore = () => {
    let score = 0;
    if (cv.name) score += 10;
    if (cv.email) score += 10;
    if (cv.phone) score += 10;
    if (cv.title) score += 15;
    if (cv.summary?.length > 50) score += 20;
    if (cv.experience[0].company) score += 20;
    if (cv.skills?.length > 20) score += 15;
    return score;
  };

  const score = atsScore();
  const scoreColor = score >= 80 ? COLORS.success : score >= 50 ? COLORS.gold : COLORS.danger;

  const inputStyle = {
    width: "100%",
    padding: "14px 18px",
    background: "rgba(255, 255, 255, 0.05)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "12px",
    color: COLORS.text,
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s",
    fontFamily: "'DM Sans', sans-serif",
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    color: COLORS.muted,
    marginBottom: "8px",
    fontWeight: "500",
  };

  const cardStyle = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "20px",
    padding: "32px",
    backdropFilter: "blur(20px)",
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "20px", 
        marginBottom: "40px",
        padding: "24px 32px",
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "20px",
        backdropFilter: "blur(20px)",
      }}>
        <button 
          className="premium-btn"
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            background: "transparent",
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
          }} 
          onClick={onBack}
        >
          ← Back
        </button>
        <h1 style={{ 
          fontSize: "28px", 
          fontWeight: "900", 
          margin: 0,
          fontFamily: "'Playfair Display', serif"
        }}>CV Builder</h1>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "14px", color: COLORS.muted }}>ATS Score:</span>
          <span style={{ 
            fontSize: "24px", 
            fontWeight: "800", 
            color: scoreColor,
            fontFamily: "'Playfair Display', serif"
          }}>{score}%</span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ 
        display: "flex", 
        gap: "12px", 
        marginBottom: "40px", 
        overflowX: "auto",
        padding: "4px"
      }}>
        {["Personal Info", "Experience", "Education", "Skills", "Template", "Preview"].map((s, i) => (
          <button 
            key={i} 
            onClick={() => setStep(i + 1)} 
            className="premium-btn"
            style={{
              padding: "12px 20px", 
              borderRadius: "12px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "600", 
              fontSize: "14px", 
              whiteSpace: "nowrap",
              background: step === i + 1 ? COLORS.accent : COLORS.card,
              color: step === i + 1 ? "#fff" : COLORS.muted,
              border: `1px solid ${step === i + 1 ? COLORS.accent : COLORS.border}`,
              backdropFilter: "blur(20px)",
            }}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step 1: Personal */}
      {step === 1 && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)", 
          gap: "24px",
          ...cardStyle
        }}>
          {[
            { label: "Full Name", key: "name", placeholder: "Junaid Khan" },
            { label: "Job Title", key: "title", placeholder: "Customer Service Officer" },
            { label: "Email", key: "email", placeholder: "you@email.com" },
            { label: "Phone", key: "phone", placeholder: "+971 58 550 8782" },
            { label: "Location", key: "location", placeholder: "Dubai, UAE" },
          ].map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input 
                style={inputStyle} 
                placeholder={f.placeholder} 
                value={cv[f.key]}
                onChange={e => set(f.key, e.target.value)} 
              />
            </div>
          ))}
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Professional Summary</label>
            <textarea 
              style={{...inputStyle, height: "120px", resize: "vertical", padding: "16px"}} 
              placeholder="Results-driven professional with 3+ years experience in customer service across Gulf markets..."
              value={cv.summary} 
              onChange={e => set("summary", e.target.value)} 
            />
          </div>
        </div>
      )}

      {/* Step 2: Experience */}
      {step === 2 && (
        <div>
          {cv.experience.map((exp, i) => (
            <div key={i} style={{...cardStyle, marginBottom: "24px"}}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "24px",
                alignItems: "center"
              }}>
                <span style={{ 
                  fontWeight: "700",
                  fontSize: "18px",
                  fontFamily: "'Playfair Display', serif"
                }}>Experience #{i + 1}</span>
                {i > 0 && (
                  <button 
                    className="premium-btn"
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "13px",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: COLORS.danger,
                      border: `1px solid ${COLORS.danger}`,
                    }} 
                    onClick={() => setCv(c => ({ 
                      ...c, 
                      experience: c.experience.filter((_, j) => j !== i) 
                    }))}
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {[
                  { label: "Company", key: "company", placeholder: "ADIB Bank" },
                  { label: "Role", key: "role", placeholder: "Customer Service Officer" },
                  { label: "Period", key: "period", placeholder: "Jan 2023 – Present" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input 
                      style={inputStyle} 
                      placeholder={f.placeholder} 
                      value={exp[f.key]}
                      onChange={e => {
                        const updated = [...cv.experience];
                        updated[i] = { ...updated[i], [f.key]: e.target.value };
                        set("experience", updated);
                      }} 
                    />
                  </div>
                ))}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Key Achievements (one per line)</label>
                  <textarea 
                    style={{...inputStyle, height: "100px", resize: "vertical", padding: "16px"}}
                    placeholder="• Handled 50+ customer queries daily&#10;• Achieved 98% customer satisfaction score"
                    value={exp.points} 
                    onChange={e => {
                      const updated = [...cv.experience];
                      updated[i] = { ...updated[i], points: e.target.value };
                      set("experience", updated);
                    }} 
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button 
            className="premium-btn"
            style={{
              padding: "14px 24px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              background: "transparent",
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
            }} 
            onClick={() => setCv(c => ({ 
              ...c, 
              experience: [...c.experience, { company: "", role: "", period: "", points: "" }] 
            }))}
          >
            + Add Experience
          </button>
        </div>
      )}

      {/* Step 3: Education */}
      {step === 3 && (
        <div>
          {cv.education.map((edu, i) => (
            <div key={i} style={{...cardStyle, marginBottom: "24px"}}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                {[
                  { label: "Institution", key: "school", placeholder: "Amity University" },
                  { label: "Degree", key: "degree", placeholder: "B.Com / BBA" },
                  { label: "Year", key: "year", placeholder: "2021" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input 
                      style={inputStyle} 
                      placeholder={f.placeholder} 
                      value={edu[f.key]}
                      onChange={e => {
                        const updated = [...cv.education];
                        updated[i] = { ...updated[i], [f.key]: e.target.value };
                        set("education", updated);
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <button 
            className="premium-btn"
            style={{
              padding: "14px 24px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              background: "transparent",
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
            }} 
            onClick={() => setCv(c => ({ 
              ...c, 
              education: [...c.education, { school: "", degree: "", year: "" }] 
            }))}
          >
            + Add Education
          </button>
        </div>
      )}

      {/* Step 4: Skills */}
      {step === 4 && (
        <div style={{...cardStyle, display: "grid", gap: "24px"}}>
          <div>
            <label style={labelStyle}>Skills (comma separated)</label>
            <textarea 
              style={{...inputStyle, height: "100px", resize: "vertical", padding: "16px"}}
              placeholder="Customer Service, CRM Systems, Problem Solving, Communication, MS Office"
              value={cv.skills} 
              onChange={e => set("skills", e.target.value)} 
            />
          </div>
          <div>
            <label style={labelStyle}>Languages</label>
            <input 
              style={inputStyle} 
              placeholder="English (Fluent), Hindi (Native), Arabic (Basic)"
              value={cv.languages} 
              onChange={e => set("languages", e.target.value)} 
            />
          </div>
        </div>
      )}

      {/* Step 5: Templates */}
      {step === 5 && (
        <div>
          <h3 style={{ 
            marginBottom: "28px", 
            fontWeight: "700",
            fontSize: "24px",
            fontFamily: "'Playfair Display', serif"
          }}>Choose Your Template</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
            {TEMPLATES.map(t => (
              <div 
                key={t.id} 
                onClick={() => setSelectedTemplate(t)} 
                className="premium-btn"
                style={{
                  background: t.color,
                  border: `2px solid ${selectedTemplate?.id === t.id ? "#fff" : t.accent}`,
                  borderRadius: "16px", 
                  padding: "24px", 
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: selectedTemplate?.id === t.id ? `0 0 30px ${t.accent}55` : "none",
                }}
              >
                <div style={{ 
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "700",
                  background: t.tier === "free" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                  color: t.tier === "free" ? COLORS.success : COLORS.gold,
                  border: `1px solid ${t.tier === "free" ? COLORS.success : COLORS.gold}`,
                  marginBottom: "16px",
                  letterSpacing: "0.5px"
                }}>
                  {t.tier === "free" ? "FREE" : "⭐ PRO"}
                </div>
                <div style={{ 
                  fontWeight: "700", 
                  fontSize: "15px", 
                  color: "#fff", 
                  marginBottom: "8px",
                  fontFamily: "'Playfair Display', serif"
                }}>{t.name}</div>
                <div style={{ fontSize: "12px", color: t.accent, opacity: 0.9 }}>{t.desc}</div>
                {selectedTemplate?.id === t.id && (
                  <div style={{ 
                    marginTop: "12px", 
                    fontSize: "12px", 
                    color: "#fff", 
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <span>✓</span> Selected
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Preview */}
      {step === 6 && (
        <div>
          <div style={{
            background: selectedTemplate ? selectedTemplate.color : "#1a1a26",
            border: `2px solid ${selectedTemplate ? selectedTemplate.accent : COLORS.border}`,
            borderRadius: "20px", 
            padding: "48px", 
            maxWidth: "800px", 
            margin: "0 auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>
            <div style={{ 
              borderBottom: `2px solid ${selectedTemplate?.accent || COLORS.accent}`, 
              paddingBottom: "24px", 
              marginBottom: "28px" 
            }}>
              <h1 style={{ 
                fontSize: "32px", 
                fontWeight: "900", 
                margin: "0 0 8px", 
                color: "#fff",
                fontFamily: "'Playfair Display', serif"
              }}>{cv.name || "Your Name"}</h1>
              <p style={{ 
                color: selectedTemplate?.accent || COLORS.accent, 
                fontWeight: "600", 
                margin: "0 0 12px",
                fontSize: "16px"
              }}>{cv.title || "Job Title"}</p>
              <p style={{ fontSize: "14px", color: "#aaa", margin: 0 }}>{cv.email} • {cv.phone} • {cv.location}</p>
            </div>
            
            {cv.summary && (
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ 
                  color: selectedTemplate?.accent || COLORS.accent, 
                  fontSize: "14px", 
                  fontWeight: "800", 
                  letterSpacing: "1px", 
                  textTransform: "uppercase", 
                  marginBottom: "12px",
                  fontFamily: "'DM Sans', sans-serif"
                }}>SUMMARY</h3>
                <p style={{ fontSize: "14px", color: "#ccc", lineHeight: "1.8", margin: 0 }}>{cv.summary}</p>
              </div>
            )}
            
            {cv.experience[0].company && (
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ 
                  color: selectedTemplate?.accent || COLORS.accent, 
                  fontSize: "14px", 
                  fontWeight: "800", 
                  letter
