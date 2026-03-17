import { useState } from "react";

// Copy constants from App.js
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

const TEMPLATES = [
  { id: 1,  name: "Gulf Classic",         tier: "free",    color: "#1a1a2e", accent: "#e94560", desc: "Bold banner header",              layout: "banner"      },
  { id: 2,  name: "Dubai Modern",         tier: "free",    color: "#0f3460", accent: "#00b4d8", desc: "Two-column split",                layout: "twocol"      },
  { id: 3,  name: "Arabia Pro",           tier: "free",    color: "#533483", accent: "#f0c040", desc: "Sidebar with skills column",      layout: "sidebar"     },
  { id: 4,  name: "Executive Gold",       tier: "premium", color: "#1a0a00", accent: "#d4a017", desc: "Timeline experience style",       layout: "timeline"    },
  { id: 5,  name: "Gulf Executive",       tier: "premium", color: "#0D1B2A", accent: "#C9A84C", desc: "Dark navy with gold accents",     layout: "gulf-exec"   },
  { id: 6,  name: "Banking & Finance",    tier: "premium", color: "#000000", accent: "#000000", desc: "Ultra-clean ATS-first serif",     layout: "banking"     },
  { id: 7,  name: "Compact Pro",          tier: "premium", color: "#14213D", accent: "#0D7377", desc: "Dense teal layout, max content",  layout: "compact-pro" },
  { id: 8,  name: "Creative Sidebar",     tier: "premium", color: "#2D2D2D", accent: "#E8533F", desc: "Coral sidebar for Sales/RE",      layout: "creative"    },
  { id: 9,  name: "Hospitality & Service",tier: "premium", color: "#6B4C3B", accent: "#6B4C3B", desc: "Warm tone for hotels & F&B",      layout: "hospitality" },
  { id: 10, name: "ATS International",    tier: "premium", color: "#000000", accent: "#333333", desc: "Pure ATS — zero colour, max score",layout: "ats-intl"   },
  { id: 11, name: "Tech & IT Pro",        tier: "premium", color: "#1E2D45", accent: "#4A90D9", desc: "Dark slate sidebar for tech roles",layout: "tech-it"    },
];

// Design tokens (copy from App.js)
const C = {
  bg: "#0a0a0f", surface: "#12121a", card: "#1a1a26", border: "#2a2a3a",
  accent: "#6366f1", gold: "#f59e0b", text: "#f0f0ff", muted: "#8888aa",
  success: "#FFFFFF", danger: "#ef4444",
};

const S = {
  input: {
    width: "100%", padding: "12px 16px", background: C.card,
    border: `1px solid ${C.border}`, borderRadius: "10px",
    color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box",
  },
};

export default function WalkInPage({ onBack, onComplete, setResume, setSelectedTemplate }) {
  const [walkInData, setWalkInData] = useState({
    fullName: "",
    jobTitle: "",
    phone: "",
    email: "",
    skills: "",
    experience: "",
  });

  const handleWalkInSubmit = () => {
    if (!walkInData.fullName || !walkInData.jobTitle || !walkInData.phone || !walkInData.email) {
      alert("Please fill in all required fields");
      return;
    }
    // Pre-fill resume state
    const prefilledResume = {
      ...EMPTY_RESUME,
      name: walkInData.fullName,
      title: walkInData.jobTitle,
      phone: walkInData.phone,
      email: walkInData.email,
      skills: walkInData.skills,
      summary: walkInData.experience,
    };
    // Store in session storage and navigate
    sessionStorage.setItem("walkInResume", JSON.stringify(prefilledResume));
    setResume(prefilledResume);
    setSelectedTemplate(TEMPLATES[0]);
    onComplete();
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ffffff", fontFamily: "'Inter', sans-serif", padding: "40px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "#888",
            fontSize: "16px",
            cursor: "pointer",
            marginBottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ← Back
        </button>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "48px", fontWeight: "900", lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-2px" }}>
            Walk-In CV Builder
          </h1>
          <p style={{ fontSize: "18px", color: "#888", lineHeight: "1.7" }}>
            Build a complete Gulf-ready CV in 60 seconds. Share instantly on WhatsApp.
          </p>
        </div>

        <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "16px", padding: "40px", marginBottom: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input
              style={S.input}
              placeholder="Ahmed Al Mansouri"
              value={walkInData.fullName}
              onChange={e => setWalkInData({...walkInData, fullName: e.target.value})}
            />
            <input
              style={S.input}
              placeholder="Sales Executive"
              value={walkInData.jobTitle}
              onChange={e => setWalkInData({...walkInData, jobTitle: e.target.value})}
            />
            <input
              style={S.input}
              placeholder="+971 50 123 4567"
              value={walkInData.phone}
              onChange={e => setWalkInData({...walkInData, phone: e.target.value})}
            />
            <input
              style={S.input}
              placeholder="ahmed@email.com"
              value={walkInData.email}
              onChange={e => setWalkInData({...walkInData, email: e.target.value})}
            />
            <input
              style={S.input}
              placeholder="Sales, CRM, Communication, Arabic, English"
              value={walkInData.skills}
              onChange={e => setWalkInData({...walkInData, skills: e.target.value})}
            />
            <input
              style={S.input}
              placeholder="3 years in UAE retail banking"
              value={walkInData.experience}
              onChange={e => setWalkInData({...walkInData, experience: e.target.value})}
            />
          </div>

          <button
            onClick={handleWalkInSubmit}
            style={{
              width: "100%",
              background: "#fff",
              color: "#000",
              border: "none",
              borderRadius: "12px",
              padding: "16px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              marginTop: "24px",
            }}
          >
            Build My Walk-In CV →
          </button>

          <div style={{ fontSize: "12px", color: "#666", textAlign: "center", marginTop: "16px" }}>
            ⚡ Ready in 60 seconds · 📲 Share on WhatsApp · 🆓 Free
          </div>
        </div>
      </div>
    </div>
  );
}