import { useState } from "react";

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
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  border: "#2a2a3a",
  accent: "#6366f1",
  accentHover: "#818cf8",
  gold: "#f59e0b",
  text: "#f0f0ff",
  muted: "#8888aa",
  success: "#10b981",
  danger: "#ef4444",
};

const styles = {
  app: {
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'Outfit', 'Segoe UI', sans-serif",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 40px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: "rgba(10,10,15,0.95)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(10px)",
  },
  logo: {
    fontSize: "22px",
    fontWeight: "800",
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  btn: (variant = "primary", size = "md") => ({
    padding: size === "lg" ? "14px 32px" : size === "sm" ? "8px 16px" : "10px 22px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: size === "lg" ? "16px" : size === "sm" ? "13px" : "14px",
    transition: "all 0.2s",
    background: variant === "primary" ? `linear-gradient(135deg, ${COLORS.accent}, #8b5cf6)`
      : variant === "gold" ? `linear-gradient(135deg, ${COLORS.gold}, #f97316)`
      : variant === "outline" ? "transparent"
      : variant === "danger" ? COLORS.danger
      : COLORS.surface,
    color: variant === "outline" ? COLORS.accent : "#fff",
    border: variant === "outline" ? `1px solid ${COLORS.accent}` : "none",
    boxShadow: variant === "primary" ? "0 4px 20px rgba(99,102,241,0.3)" : "none",
  }),
  input: {
    width: "100%",
    padding: "12px 16px",
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    color: COLORS.text,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: COLORS.muted,
    marginBottom: "6px",
    fontWeight: "500",
  },
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "16px",
    padding: "24px",
  },
  badge: (type = "free") => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    background: type === "free" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
    color: type === "free" ? COLORS.success : COLORS.gold,
    border: `1px solid ${type === "free" ? COLORS.success : COLORS.gold}`,
    letterSpacing: "0.5px",
  }),
};

// ─── LANDING PAGE ────────────────────────────────────────────────
function LandingPage({ onLogin, onSignup }) {
  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "80px 40px 60px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ ...styles.badge("free"), marginBottom: "20px", fontSize: "13px" }}>
          🇦🇪 Built for Gulf Job Seekers
        </div>
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 64px)", fontWeight: "900",
          lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-2px",
        }}>
          Your CV is your{" "}
          <span style={{
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            passport
          </span>{" "}
          to the Gulf
        </h1>
        <p style={{ fontSize: "18px", color: COLORS.muted, marginBottom: "36px", lineHeight: "1.7" }}>
          ATS-optimised CVs built for UAE, Saudi & GCC job markets.
          Free to build. Free to download. No tricks.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button style={styles.btn("primary", "lg")} onClick={onSignup}>
            Build My CV Free →
          </button>
          <button style={styles.btn("outline", "lg")} onClick={onLogin}>
            Sign In
          </button>
        </div>
        <p style={{ marginTop: "16px", fontSize: "13px", color: COLORS.muted }}>
          No credit card • No signup required to preview
        </p>
      </div>

      {/* Features */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", padding: "0 40px 60px", maxWidth: "1100px", margin: "0 auto" }}>
        {[
          { icon: "🎯", title: "ATS Optimised", desc: "Beat applicant tracking systems used by UAE banks & corporates" },
          { icon: "📄", title: "23 Templates", desc: "3 free + 20 premium templates for every Gulf industry" },
          { icon: "⚡", title: "5-Minute CV", desc: "Fill the form, pick a template, download your PDF instantly" },
          { icon: "🔒", title: "Trust First", desc: "Build & download free. Pay only for AI upgrades" },
        ].map((f, i) => (
          <div key={i} style={{ ...styles.card, textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
            <div style={{ fontWeight: "700", marginBottom: "8px" }}>{f.title}</div>
            <div style={{ fontSize: "13px", color: COLORS.muted, lineHeight: "1.6" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Templates Preview */}
      <div style={{ padding: "0 40px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: "800", marginBottom: "8px" }}>
          23 Professional Templates
        </h2>
        <p style={{ textAlign: "center", color: COLORS.muted, marginBottom: "32px" }}>
          Industry-specific designs for the Gulf market
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          {TEMPLATES.map(t => (
            <div key={t.id} style={{
              background: t.color,
              border: `2px solid ${t.accent}`,
              borderRadius: "12px",
              padding: "16px",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              onClick={onSignup}
            >
              <div style={{ ...styles.badge(t.tier), marginBottom: "10px" }}>
                {t.tier === "free" ? "FREE" : "PRO"}
              </div>
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#fff", marginBottom: "4px" }}>{t.name}</div>
              <div style={{ fontSize: "11px", color: t.accent }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH ────────────────────────────────────────────────────────
function AuthPage({ mode, onAuth, onToggle }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
      <div style={styles.card}>
        <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "6px" }}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p style={{ color: COLORS.muted, marginBottom: "28px", fontSize: "14px" }}>
          {mode === "login" ? "Sign in to your CVPassport account" : "Start building your Gulf CV today"}
        </p>

        {mode === "signup" && (
          <div style={{ marginBottom: "16px" }}>
            <label style={styles.label}>Full Name</label>
            <input style={styles.input} placeholder="Junaid Khan" value={form.name}
              onChange={e => set("name", e.target.value)} />
          </div>
        )}
        <div style={{ marginBottom: "16px" }}>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" placeholder="you@email.com" value={form.email}
            onChange={e => set("email", e.target.value)} />
        </div>
        <div style={{ marginBottom: "24px" }}>
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" placeholder="••••••••" value={form.password}
            onChange={e => set("password", e.target.value)} />
        </div>

        <button style={{ ...styles.btn("primary", "lg"), width: "100%" }}
          onClick={() => onAuth({ ...form, name: form.name || form.email.split("@")[0] })}>
          {mode === "login" ? "Sign In" : "Create Free Account"} →
        </button>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: COLORS.muted }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span style={{ color: COLORS.accent, cursor: "pointer", fontWeight: "600" }} onClick={onToggle}>
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

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "30px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "30px" }}>
        <button style={styles.btn("outline", "sm")} onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: "24px", fontWeight: "800", margin: 0 }}>CV Builder</h1>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: COLORS.muted }}>ATS Score:</span>
          <span style={{ fontSize: "20px", fontWeight: "800", color: scoreColor }}>{score}%</span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "30px", overflowX: "auto" }}>
        {["Personal Info", "Experience", "Education", "Skills", "Template", "Preview"].map((s, i) => (
          <button key={i} onClick={() => setStep(i + 1)} style={{
            padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
            fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap",
            background: step === i + 1 ? COLORS.accent : COLORS.card,
            color: step === i + 1 ? "#fff" : COLORS.muted,
          }}>{i + 1}. {s}</button>
        ))}
      </div>

      {/* Step 1: Personal */}
      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {[
            { label: "Full Name", key: "name", placeholder: "Junaid Khan" },
            { label: "Job Title", key: "title", placeholder: "Customer Service Officer" },
            { label: "Email", key: "email", placeholder: "you@email.com" },
            { label: "Phone", key: "phone", placeholder: "+971 58 550 8782" },
            { label: "Location", key: "location", placeholder: "Dubai, UAE" },
          ].map(f => (
            <div key={f.key}>
              <label style={styles.label}>{f.label}</label>
              <input style={styles.input} placeholder={f.placeholder} value={cv[f.key]}
                onChange={e => set(f.key, e.target.value)} />
            </div>
          ))}
          <div style={{ gridColumn: "1/-1" }}>
            <label style={styles.label}>Professional Summary</label>
            <textarea style={{ ...styles.input, height: "100px", resize: "vertical" }}
              placeholder="Results-driven professional with 3+ years experience in customer service across Gulf markets..."
              value={cv.summary} onChange={e => set("summary", e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 2: Experience */}
      {step === 2 && (
        <div>
          {cv.experience.map((exp, i) => (
            <div key={i} style={{ ...styles.card, marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontWeight: "700" }}>Experience #{i + 1}</span>
                {i > 0 && <button style={styles.btn("danger", "sm")} onClick={() =>
                  setCv(c => ({ ...c, experience: c.experience.filter((_, j) => j !== i) }))}>Remove</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { label: "Company", key: "company", placeholder: "ADIB Bank" },
                  { label: "Role", key: "role", placeholder: "Customer Service Officer" },
                  { label: "Period", key: "period", placeholder: "Jan 2023 – Present" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={styles.label}>{f.label}</label>
                    <input style={styles.input} placeholder={f.placeholder} value={exp[f.key]}
                      onChange={e => {
                        const updated = [...cv.experience];
                        updated[i] = { ...updated[i], [f.key]: e.target.value };
                        set("experience", updated);
                      }} />
                  </div>
                ))}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={styles.label}>Key Achievements (one per line)</label>
                  <textarea style={{ ...styles.input, height: "80px", resize: "vertical" }}
                    placeholder="• Handled 50+ customer queries daily&#10;• Achieved 98% customer satisfaction score"
                    value={exp.points} onChange={e => {
                      const updated = [...cv.experience];
                      updated[i] = { ...updated[i], points: e.target.value };
                      set("experience", updated);
                    }} />
                </div>
              </div>
            </div>
          ))}
          <button style={styles.btn("outline")} onClick={() =>
            setCv(c => ({ ...c, experience: [...c.experience, { company: "", role: "", period: "", points: "" }] }))}>
            + Add Experience
          </button>
        </div>
      )}

      {/* Step 3: Education */}
      {step === 3 && (
        <div>
          {cv.education.map((edu, i) => (
            <div key={i} style={{ ...styles.card, marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                {[
                  { label: "Institution", key: "school", placeholder: "Amity University" },
                  { label: "Degree", key: "degree", placeholder: "B.Com / BBA" },
                  { label: "Year", key: "year", placeholder: "2021" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={styles.label}>{f.label}</label>
                    <input style={styles.input} placeholder={f.placeholder} value={edu[f.key]}
                      onChange={e => {
                        const updated = [...cv.education];
                        updated[i] = { ...updated[i], [f.key]: e.target.value };
                        set("education", updated);
                      }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button style={styles.btn("outline")} onClick={() =>
            setCv(c => ({ ...c, education: [...c.education, { school: "", degree: "", year: "" }] }))}>
            + Add Education
          </button>
        </div>
      )}

      {/* Step 4: Skills */}
      {step === 4 && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={styles.label}>Skills (comma separated)</label>
            <textarea style={{ ...styles.input, height: "80px" }}
              placeholder="Customer Service, CRM Systems, Problem Solving, Communication, MS Office"
              value={cv.skills} onChange={e => set("skills", e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Languages</label>
            <input style={styles.input} placeholder="English (Fluent), Hindi (Native), Arabic (Basic)"
              value={cv.languages} onChange={e => set("languages", e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 5: Templates */}
      {step === 5 && (
        <div>
          <h3 style={{ marginBottom: "20px", fontWeight: "700" }}>Choose Your Template</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
            {TEMPLATES.map(t => (
              <div key={t.id} onClick={() => setSelectedTemplate(t)} style={{
                background: t.color,
                border: `2px solid ${selectedTemplate?.id === t.id ? "#fff" : t.accent}`,
                borderRadius: "12px", padding: "18px", cursor: "pointer",
                transform: selectedTemplate?.id === t.id ? "scale(1.03)" : "scale(1)",
                transition: "all 0.2s",
                boxShadow: selectedTemplate?.id === t.id ? `0 0 20px ${t.accent}55` : "none",
              }}>
                <div style={{ ...styles.badge(t.tier), marginBottom: "10px" }}>
                  {t.tier === "free" ? "FREE" : "⭐ PRO"}
                </div>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#fff", marginBottom: "4px" }}>{t.name}</div>
                <div style={{ fontSize: "11px", color: t.accent }}>{t.desc}</div>
                {selectedTemplate?.id === t.id && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#fff", fontWeight: "700" }}>✓ Selected</div>
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
            borderRadius: "16px", padding: "40px", maxWidth: "700px", margin: "0 auto",
          }}>
            <div style={{ borderBottom: `2px solid ${selectedTemplate?.accent || COLORS.accent}`, paddingBottom: "20px", marginBottom: "20px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "900", margin: "0 0 4px", color: "#fff" }}>{cv.name || "Your Name"}</h1>
              <p style={{ color: selectedTemplate?.accent || COLORS.accent, fontWeight: "600", margin: "0 0 8px" }}>{cv.title || "Job Title"}</p>
              <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>{cv.email} • {cv.phone} • {cv.location}</p>
            </div>
            {cv.summary && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: selectedTemplate?.accent || COLORS.accent, fontSize: "13px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>SUMMARY</h3>
                <p style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.7", margin: 0 }}>{cv.summary}</p>
              </div>
            )}
            {cv.experience[0].company && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: selectedTemplate?.accent || COLORS.accent, fontSize: "13px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>EXPERIENCE</h3>
                {cv.experience.map((exp, i) => exp.company && (
                  <div key={i} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: "700", color: "#fff" }}>{exp.role}</span>
                      <span style={{ fontSize: "12px", color: "#aaa" }}>{exp.period}</span>
                    </div>
                    <div style={{ color: selectedTemplate?.accent || COLORS.accent, fontSize: "13px", marginBottom: "4px" }}>{exp.company}</div>
                    {exp.points && <p style={{ fontSize: "12px", color: "#bbb", margin: 0, lineHeight: "1.6" }}>{exp.points}</p>}
                  </div>
                ))}
              </div>
            )}
            {cv.skills && (
              <div>
                <h3 style={{ color: selectedTemplate?.accent || COLORS.accent, fontSize: "13px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>SKILLS</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {cv.skills.split(",").map((s, i) => (
                    <span key={i} style={{ padding: "4px 12px", background: `${selectedTemplate?.accent || COLORS.accent}22`, border: `1px solid ${selectedTemplate?.accent || COLORS.accent}55`, borderRadius: "20px", fontSize: "12px", color: "#ddd" }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button style={{ ...styles.btn("gold", "lg"), marginRight: "12px" }}
              onClick={() => window.print()}>
              ⬇ Download PDF
            </button>
            <button style={styles.btn("primary")} onClick={() => setStep(1)}>
              ✏️ Edit CV
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {step < 6 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px" }}>
          {step > 1 && <button style={styles.btn("outline")} onClick={() => setStep(s => s - 1)}>← Previous</button>}
          <button style={{ ...styles.btn("primary"), marginLeft: "auto" }} onClick={() => setStep(s => s + 1)}>
            {step === 5 ? "Preview CV →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────
function Dashboard({ user, onBuildCV, onLogout }) {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "6px" }}>
          Welcome back, {user.name} 👋
        </h1>
        <p style={{ color: COLORS.muted }}>Ready to build or update your Gulf CV?</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {[
          { label: "CVs Created", value: "1", icon: "📄", color: COLORS.accent },
          { label: "ATS Score", value: "85%", icon: "🎯", color: COLORS.success },
          { label: "Templates", value: "23", icon: "🎨", color: COLORS.gold },
          { label: "Downloads", value: "3", icon: "⬇️", color: "#ec4899" },
        ].map((stat, i) => (
          <div key={i} style={styles.card}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "13px", color: COLORS.muted }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div style={styles.card}>
          <h3 style={{ fontWeight: "800", marginBottom: "16px" }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button style={{ ...styles.btn("primary", "lg"), textAlign: "left" }} onClick={onBuildCV}>
              📄 Build New CV
            </button>
            <button style={{ ...styles.btn("gold"), textAlign: "left" }}>
              ⭐ Upgrade to Premium — AED 29/mo
            </button>
            <button style={{ ...styles.btn("outline"), textAlign: "left" }}>
              🎯 Check ATS Score
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ fontWeight: "800", marginBottom: "16px" }}>Your Plan</h3>
          <div style={{ ...styles.badge("free"), marginBottom: "12px", fontSize: "13px" }}>FREE PLAN</div>
          <ul style={{ color: COLORS.muted, fontSize: "13px", paddingLeft: "16px", lineHeight: "2" }}>
            <li>3 free templates</li>
            <li>1 CV download/day</li>
            <li>Basic ATS check</li>
          </ul>
          <button style={{ ...styles.btn("gold"), width: "100%", marginTop: "16px" }}>
            Upgrade → AED 29/mo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [authMode, setAuthMode] = useState("signup");
  const [user, setUser] = useState(null);

  const handleAuth = (userData) => {
    setUser(userData);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setPage("landing");
  };

  return (
    <div style={styles.app}>
      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.logo} onClick={() => setPage(user ? "dashboard" : "landing")}
          role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && setPage(user ? "dashboard" : "landing")}>
          CV Passport
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {user ? (
            <>
              <span style={{ color: COLORS.muted, fontSize: "14px" }}>Hi, {user.name}</span>
              <button style={styles.btn("outline", "sm")} onClick={() => setPage("builder")}>Build CV</button>
              <button style={styles.btn("", "sm")} onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <button style={styles.btn("outline", "sm")} onClick={() => { setAuthMode("login"); setPage("auth"); }}>Sign In</button>
              <button style={styles.btn("primary", "sm")} onClick={() => { setAuthMode("signup"); setPage("auth"); }}>Get Started</button>
            </>
          )}
        </div>
      </nav>

      {/* PAGES */}
      {page === "landing" && (
        <LandingPage
          onLogin={() => { setAuthMode("login"); setPage("auth"); }}
          onSignup={() => { setAuthMode("signup"); setPage("auth"); }}
        />
      )}
      {page === "auth" && (
        <AuthPage mode={authMode} onAuth={handleAuth}
          onToggle={() => setAuthMode(m => m === "login" ? "signup" : "login")} />
      )}
      {page === "dashboard" && user && (
        <Dashboard user={user} onBuildCV={() => setPage("builder")} onLogout={handleLogout} />
      )}
      {page === "builder" && (
        <CVBuilder user={user} onBack={() => setPage(user ? "dashboard" : "landing")} />
      )}
    </div>
  );
}