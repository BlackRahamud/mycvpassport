import { useState, useEffect, useRef } from "react";

const DOT_GRID_SVG = `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`;

/* ─── Phone Shell ─────────────────────────────────────────────────────────── */
function PhoneShell({ children, glow }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {glow && (
        <div style={{
          position: "absolute", inset: "-60px",
          background: "radial-gradient(ellipse at 50% 60%, rgba(13,61,56,0.55) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />
      )}
      <div style={{
        position: "relative", zIndex: 1,
        width: 220, height: 440,
        background: "#1A1A1A",
        border: "1.5px solid #2A2A2A",
        borderRadius: 40,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset",
        display: "flex", flexDirection: "column",
      }}>
        {/* Speaker notch */}
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          width: 52, height: 5, background: "#2A2A2A", borderRadius: 99, zIndex: 10,
        }} />
        {/* Camera dot */}
        <div style={{
          position: "absolute", top: 13, left: "calc(50% + 34px)", transform: "translateX(-50%)",
          width: 7, height: 7, background: "#222", borderRadius: "50%", border: "1px solid #333", zIndex: 10,
        }} />
        {/* Status bar */}
        <div style={{
          height: 28, minHeight: 28, display: "flex", alignItems: "flex-end",
          justifyContent: "space-between", padding: "0 18px 4px",
          fontSize: 8, color: "#666", fontFamily: "monospace", zIndex: 5,
          background: "transparent",
        }}>
          <span>9:41</span>
          <span>▮▮▮ 📶 🔋</span>
        </div>
        {/* Screen */}
        <div style={{
          flex: 1, overflow: "hidden", position: "relative",
          background: "#141414",
          backgroundImage: DOT_GRID_SVG,
        }}>
          {children}
        </div>
        {/* Home bar */}
        <div style={{
          height: 18, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#141414",
        }}>
          <div style={{ width: 60, height: 3, background: "#2E2E2E", borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 01 Phone ───────────────────────────────────────────────────────── */
function Step01Phone() {
  const [active, setActive] = useState(1);
  const templates = [
    { id: 0, color: "#1e3a5f" },
    { id: 1, color: "#1a3d2e" },
    { id: 2, color: "#3d1a1a" },
    { id: 3, color: "#2a1a3d" },
  ];

  return (
    <PhoneShell>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        background: "#fff",
      }}>
        {/* CV Document */}
        <div style={{
          flex: 1, overflow: "hidden", padding: "10px 12px 4px",
          fontFamily: "'Georgia', serif",
          background: "#fff",
        }}>
          {/* Header Band */}
          <div style={{
            background: "#BAE6FD", padding: "8px 10px 7px", marginBottom: 8,
            borderRadius: 3,
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#0A0A0A", letterSpacing: 0.3, lineHeight: 1.2 }}>
              Ahmed Al Mansouri
            </div>
            <div style={{ fontSize: 6.5, color: "#0A0A0A", marginTop: 1.5, letterSpacing: 0.5 }}>
              Senior Operations Manager · Emirates NBD
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {["Dubai, UAE", "ahmed@email.com", "+971 50 000 0000"].map(t => (
                <span key={t} style={{ fontSize: 5, color: "#0A0A0A", background: "#93C5FD", padding: "1.5px 4px", borderRadius: 2 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Section: Summary */}
          <SectionBlock label="Professional Summary" accent="#c9a84c">
            <p style={{ fontSize: 5.5, color: "#444", lineHeight: 1.6, margin: 0 }}>
              Results-driven operations leader with 12+ years in banking and financial services across the GCC. Specialised in process optimisation, team leadership, and regulatory compliance within UAE's dynamic financial sector.
            </p>
          </SectionBlock>

          {/* Section: Experience */}
          <SectionBlock label="Experience" accent="#c9a84c">
            <ExpItem
              role="Senior Operations Manager"
              company="Emirates NBD"
              period="2018 – Present"
              points={["Led cross-functional team of 45+ across 3 departments", "Reduced processing time by 34% via lean methodology", "Managed AED 2.3B annual operational budget"]}
            />
            <ExpItem
              role="Operations Manager"
              company="Abu Dhabi Islamic Bank"
              period="2014 – 2018"
              points={["Oversaw daily clearing operations, 99.8% SLA achievement", "Implemented new CRM, improving NPS by 22 points"]}
            />
          </SectionBlock>

          {/* Section: Education */}
          <SectionBlock label="Education" accent="#c9a84c">
            <div style={{ fontSize: 5.5, color: "#333", marginBottom: 2 }}>
              <strong>MBA — Finance &amp; Strategy</strong>
            </div>
            <div style={{ fontSize: 5, color: "#888" }}>American University of Sharjah · 2013</div>
            <div style={{ fontSize: 5.5, color: "#333", marginTop: 4, marginBottom: 2 }}>
              <strong>BSc — Business Administration</strong>
            </div>
            <div style={{ fontSize: 5, color: "#888" }}>UAE University · 2010</div>
          </SectionBlock>

          {/* Skills */}
          <SectionBlock label="Key Skills" accent="#c9a84c">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {["Operations", "Risk Management", "P&L Ownership", "Lean Six Sigma", "Arabic / English", "Stakeholder Mgmt"].map(s => (
                <span key={s} style={{
                  fontSize: 4.5, background: "#f5f5f5", border: "0.5px solid #e0e0e0",
                  color: "#555", padding: "2px 5px", borderRadius: 3,
                }}>{s}</span>
              ))}
            </div>
          </SectionBlock>
        </div>

        {/* Template Switcher Strip */}
        <div style={{
          height: 44, background: "#0f0f0f", borderTop: "1px solid #1e1e1e",
          display: "flex", alignItems: "center", gap: 6, padding: "0 10px",
        }}>
          <span style={{ fontSize: 5, color: "#555", marginRight: 2, letterSpacing: 0.5, textTransform: "uppercase" }}>Templates</span>
          {templates.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              width: active === t.id ? 30 : 24,
              height: active === t.id ? 38 : 32,
              borderRadius: 4,
              background: t.color,
              border: active === t.id ? "1.5px solid #34C97A" : "1px solid #2a2a2a",
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: active === t.id ? "0 0 8px rgba(52,201,122,0.4)" : "none",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 3, left: 2, right: 2, height: 1.5, background: "rgba(255,255,255,0.2)", borderRadius: 1 }} />
              <div style={{ position: "absolute", top: 6, left: 2, right: 4, height: 1, background: "rgba(255,255,255,0.1)", borderRadius: 1 }} />
              <div style={{ position: "absolute", top: 9, left: 2, right: 6, height: 1, background: "rgba(255,255,255,0.1)", borderRadius: 1 }} />
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 5, color: "#34C97A", letterSpacing: 0.3 }}>14 total ›</div>
        </div>
      </div>
    </PhoneShell>
  );
}

function SectionBlock({ label, accent, children }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 6, fontWeight: 700, color: "#1a2e1a", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
        <div style={{ flex: 1, height: 0.5, background: accent, opacity: 0.6 }} />
      </div>
      {children}
    </div>
  );
}

function ExpItem({ role, company, period, points }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 5.5, fontWeight: 700, color: "#222" }}>{role}</div>
          <div style={{ fontSize: 5, color: "#777" }}>{company}</div>
        </div>
        <div style={{ fontSize: 4.5, color: "#aaa", whiteSpace: "nowrap" }}>{period}</div>
      </div>
      <ul style={{ margin: "2px 0 0 8px", padding: 0 }}>
        {points.map((p, i) => (
          <li key={i} style={{ fontSize: 5, color: "#555", marginBottom: 1, lineHeight: 1.5 }}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Step 02 Phone ───────────────────────────────────────────────────────── */
function Step02Phone() {
  const [focused, setFocused] = useState("name");

  return (
    <PhoneShell>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        background: "#141414", backgroundImage: DOT_GRID_SVG, padding: "12px 14px 8px",
      }}>
        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 6, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Step 2 of 5</span>
            <span style={{ fontSize: 6, color: "#34C97A" }}>40%</span>
          </div>
          <div style={{ height: 2.5, background: "#222", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", background: "linear-gradient(90deg, #34C97A, #2DD4BF)", borderRadius: 99 }} />
          </div>
        </div>

        {/* Section label */}
        <div style={{ fontSize: 6, color: "#555", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
          Personal Info
        </div>

        {/* Fields + keyboard area + CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
          {[
            { id: "name", label: "Full Name", value: "Ahmed Al Mansouri", placeholder: "" },
            { id: "title", label: "Job Title", value: "Senior Operations Manager", placeholder: "" },
            { id: "company", label: "Current Company", value: "Emirates NBD", placeholder: "" },
          ].map(f => (
            <div key={f.id}>
              <div style={{ fontSize: 5.5, color: focused === f.id ? "#34C97A" : "#555", marginBottom: 3, letterSpacing: 0.4, transition: "color 0.2s" }}>
                {f.label}
              </div>
              <div
                onClick={() => setFocused(f.id)}
                style={{
                  background: focused === f.id ? "#1C1C1C" : "#181818",
                  border: `1px solid ${focused === f.id ? "#34C97A" : "#252525"}`,
                  borderRadius: 8,
                  padding: "7px 9px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: focused === f.id ? "0 0 0 2px rgba(52,201,122,0.1)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 7, color: f.value ? "#e8e8e8" : "#444" }}>{f.value || f.placeholder}</span>
                {focused === f.id && (
                  <span style={{ display: "inline-block", width: 1, height: 9, background: "#34C97A", borderRadius: 1, animation: "blink 1s steps(1) infinite" }} />
                )}
              </div>
            </div>
          ))}

          <div style={{
            flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
            justifyContent: "flex-end", gap: 5, paddingBottom: 4, pointerEvents: "none",
          }}>
            <div style={{ display: "flex", gap: 3, justifyContent: "stretch" }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={`k1-${i}`}
                  style={{
                    flex: 1, height: 11, minWidth: 0,
                    background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 3,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 3, justifyContent: "stretch" }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={`k2-${i}`}
                  style={{
                    flex: 1, height: 11, minWidth: 0,
                    background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 3,
                  }}
                />
              ))}
            </div>
            <div style={{
              width: "100%", height: 13,
              background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 3,
            }} />
          </div>

          {/* Continue Button */}
          <button style={{
            width: "100%", background: "#fff", border: "none",
            borderRadius: 10, padding: "9px 0", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#0A0A0A", letterSpacing: 0.3 }}>Continue</span>
            <span style={{ fontSize: 9, color: "#0A0A0A", fontWeight: 700 }}>→</span>
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

/* ─── Step 03 Phone ───────────────────────────────────────────────────────── */
function Step03Phone() {
  const score = 84;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  const rows = [
    { icon: "✓", label: "Keywords matched", value: "12 / 14", ok: true },
    { icon: "✓", label: "Format clean", value: "Pass", ok: true },
    { icon: "✓", label: "Section order correct", value: "Pass", ok: true },
    { icon: "⚠", label: "Add measurable achievements", value: "Improve", ok: false },
  ];

  return (
    <PhoneShell glow>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        background: "#141414", backgroundImage: DOT_GRID_SVG, padding: "10px 14px 8px",
        alignItems: "stretch",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 6, color: "#555", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 }}>ATS Score</div>
          <div style={{ fontSize: 5.5, color: "#0E7490", letterSpacing: 0.5 }}>Gulf Market Ready ✦</div>
        </div>

        {/* Score Ring */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <svg width={100} height={100} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle cx={50} cy={50} r={radius} fill="none" stroke="#1e1e1e" strokeWidth={6} />
              {/* Glow blur */}
              <circle
                cx={50} cy={50} r={radius} fill="none"
                stroke="#0E7490" strokeWidth={9}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                opacity={0.15}
                filter="url(#glow)"
              />
              {/* Main arc */}
              <circle
                cx={50} cy={50} r={radius} fill="none"
                stroke="#0E7490" strokeWidth={6}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
              />
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "system-ui, sans-serif" }}>{score}</span>
              <span style={{ fontSize: 5, color: "#555", marginTop: 1 }}>/ 100</span>
            </div>
          </div>
        </div>

        {/* Data rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
          {rows.map((r, i) => (
            <div key={i} style={{
              background: "#191919",
              border: `1px solid ${r.ok ? "#1e2e1e" : "#2e2318"}`,
              borderRadius: 7,
              padding: "6px 9px",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{
                fontSize: 7, width: 14, height: 14, borderRadius: "50%",
                background: r.ok ? "rgba(14,116,144,0.12)" : "rgba(251,191,36,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: r.ok ? "#0E7490" : "#FBBF24", flexShrink: 0, lineHeight: 1,
              }}>{r.icon}</span>
              <span style={{ fontSize: 5.5, color: "#ccc", flex: 1 }}>{r.label}</span>
              <span style={{
                fontSize: 5, color: r.ok ? "#0E7490" : "#FBBF24",
                background: r.ok ? "rgba(14,116,144,0.08)" : "rgba(251,191,36,0.08)",
                padding: "1.5px 5px", borderRadius: 4,
                fontWeight: 600, letterSpacing: 0.3,
              }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Download Button */}
        <button style={{
          width: "100%", background: "#fff", border: "none",
          borderRadius: 10, padding: "8px 0", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          marginTop: "auto",
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#0A0A0A", letterSpacing: 0.3 }}>Download PDF</span>
          <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
            <path d="M6 1v7M3 5.5l3 3 3-3M2 10h8" stroke="#0A0A0A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </PhoneShell>
  );
}

/* ─── Step Card ───────────────────────────────────────────────────────────── */
function StepCard({ number, title, description, phone, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(40px)",
      transition: `opacity 0.7s ease ${index * 0.18}s, transform 0.7s ease ${index * 0.18}s`,
    }}>
      {/* Phone */}
      <div style={{ position: "relative" }}>
        {phone}
        {/* Step number badge */}
        <div style={{
          position: "absolute", top: -10, left: -10,
          width: 28, height: 28, borderRadius: "50%",
          background: "#1C1C1C", border: "1px solid #2A2A2A",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 800, color: "#A0A0A0",
          fontFamily: "system-ui, monospace",
          letterSpacing: -0.5,
        }}>
          {String(number).padStart(2, "0")}
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: "center", maxWidth: 260 }}>
        <h3 style={{
          margin: "0 0 8px",
          fontSize: 17,
          fontWeight: 700,
          color: "#f0f0f0",
          letterSpacing: -0.4,
          lineHeight: 1.25,
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}>
          {title}
        </h3>
        <p style={{
          margin: 0, fontSize: 13, color: "#555", lineHeight: 1.65,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {description}
        </p>
      </div>
    </div>
  );
}

/* ─── Connector Line ──────────────────────────────────────────────────────── */
function ConnectorLine({ vertical }) {
  if (vertical) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{
          width: 1, height: 36,
          background: "linear-gradient(to bottom, #2A2A2A, transparent)",
        }} />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #2A2A2A, transparent)" }} />
      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#34C97A", opacity: 0.5, margin: "0 6px" }} />
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #2A2A2A, transparent)" }} />
    </div>
  );
}

/* ─── Main Section ────────────────────────────────────────────────────────── */
export default function HowItWorks() {
  return (
    <section style={{
      background: "radial-gradient(ellipse at center, #0D1F1A 0%, #0A0A0A 70%)",
      padding: "80px 20px 100px",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(1.18);opacity:0} }
      `}</style>

      {/* Subtle top vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 120,
        background: "linear-gradient(to bottom, rgba(10,10,10,1), transparent)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#141414", border: "1px solid #222", borderRadius: 99,
          padding: "5px 14px", marginBottom: 18,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34C97A", boxShadow: "0 0 6px #34C97A" }} />
          <span style={{ fontSize: 11, color: "#555", letterSpacing: 1.2, textTransform: "uppercase" }}>How It Works</span>
        </div>

        <h2 style={{
          margin: "0 0 14px",
          fontSize: "clamp(28px, 6vw, 42px)",
          fontWeight: 700,
          color: "#FFFFFF",
          letterSpacing: -1,
          lineHeight: 1.1,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Your Gulf career,<br />
          launched in minutes.
        </h2>
        <p style={{
          margin: 0, fontSize: 15, color: "#444", maxWidth: 400,
          lineHeight: 1.7, marginInline: "auto",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Three steps. No fluff. A CV that actually gets past ATS and lands interviews.
        </p>
      </div>

      {/* Steps — Responsive: row on desktop, column on mobile */}
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Desktop 3-col layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0 0",
          alignItems: "start",
        }} className="how-it-works-grid">
          <StepCard
            index={0}
            number={1}
            title="Choose from 14 Gulf-ready templates"
            description="Professionally designed for UAE, KSA, and GCC hiring managers. ATS-optimised layouts that clear automated screening systems."
            phone={<Step01Phone />}
          />

          {/* Desktop connector */}
          <div style={{
            display: "flex", alignItems: "flex-start", paddingTop: 220,
            justifyContent: "center",
          }}>
            <ConnectorLine />
          </div>

          <StepCard
            index={1}
            number={2}
            title="Fill in 5 minutes"
            description="Smart prompts guide every section. Paste your existing CV or start fresh — our assistant fills gaps and suggests Gulf-market phrasing."
            phone={<Step02Phone />}
          />

          {/* Spacer */}
          <div />
          <div style={{
            display: "flex", alignItems: "flex-start", paddingTop: 220,
            justifyContent: "center",
          }}>
            <ConnectorLine />
          </div>
          <StepCard
            index={2}
            number={3}
            title="Download. Apply. Get hired."
            description="Instant ATS analysis scores your CV against real Gulf job postings. One-click PDF export, ready to attach and send."
            phone={<Step03Phone />}
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", marginTop: 72 }}>
        <button style={{
          background: "#34C97A",
          color: "#0A0A0A",
          border: "none", borderRadius: 12,
          padding: "14px 36px",
          fontSize: 14, fontWeight: 700,
          cursor: "pointer", letterSpacing: 0.3,
          boxShadow: "0 0 40px rgba(52,201,122,0.2), 0 4px 16px rgba(0,0,0,0.4)",
          transition: "transform 0.15s, box-shadow 0.15s",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
          onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 0 60px rgba(52,201,122,0.3), 0 8px 24px rgba(0,0,0,0.5)"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 0 40px rgba(52,201,122,0.2), 0 4px 16px rgba(0,0,0,0.4)"; }}
        >
          Build My Gulf CV — It's Free →
        </button>
        <div style={{ marginTop: 12, fontSize: 12, color: "#3a3a3a" }}>
          No credit card · Takes 5 minutes · Download instantly
        </div>
      </div>

      {/* Bottom glow */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 200,
        background: "radial-gradient(ellipse, rgba(52,201,122,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <style>{`
        @media (max-width: 700px) {
          .how-it-works-grid {
            grid-template-columns: 1fr !important;
            gap: 48px 0 !important;
          }
          .how-it-works-grid > *:nth-child(2),
          .how-it-works-grid > *:nth-child(5),
          .how-it-works-grid > *:nth-child(4) {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
