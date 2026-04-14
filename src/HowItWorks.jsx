import { useState, useEffect, useRef } from "react";

/* ─── Profile data for rotating CV ─────────────────────────────────── */
const CV_PROFILES = [
  {
    name: "Ahmed Al Mansouri",
    role: "Senior Operations Manager",
    company: "Emirates NBD",
    location: "Dubai, UAE",
    email: "ahmed@email.com",
    phone: "+971 50 000 0000",
    summary:
      "Results-driven operations leader with 12+ years in banking and financial services across the GCC.",
    exp: [
      {
        role: "Senior Operations Manager",
        company: "Emirates NBD",
        period: "2018 – Present",
        points: [
          "Led cross-functional team of 45+",
          "Reduced processing time by 34%",
        ],
      },
    ],
    skills: ["Operations", "Risk Management", "Lean Six Sigma", "Arabic / English"],
  },
  {
    name: "Priya Sharma",
    role: "Marketing Manager",
    company: "Noon.com",
    location: "Dubai, UAE",
    email: "priya@email.com",
    phone: "+971 55 123 4567",
    summary:
      "Performance marketer with 8+ years driving growth for e-commerce and FMCG brands across India and GCC.",
    exp: [
      {
        role: "Marketing Manager",
        company: "Noon.com",
        period: "2020 – Present",
        points: [
          "Grew organic traffic 120% YoY",
          "Managed AED 4M annual ad spend",
        ],
      },
    ],
    skills: ["SEO/SEM", "Growth Marketing", "Google Analytics", "Hindi / English"],
  },
  {
    name: "Mohammed Al Rashidi",
    role: "Finance Analyst",
    company: "Dubai Islamic Bank",
    location: "Dubai, UAE",
    email: "mohammed@email.com",
    phone: "+971 52 987 6543",
    summary:
      "Detail-oriented finance analyst specialising in Islamic banking products and regulatory compliance.",
    exp: [
      {
        role: "Finance Analyst",
        company: "Dubai Islamic Bank",
        period: "2019 – Present",
        points: [
          "Built financial models for AED 500M portfolio",
          "Achieved 99.7% reporting accuracy",
        ],
      },
    ],
    skills: ["Financial Modelling", "Islamic Finance", "SAP", "Arabic / English"],
  },
];

const TEMPLATE_CHIPS = [
  { color: "#1A3A5C", label: "Classic" },
  { color: "#1D9E75", label: "Gulf Pro", active: true },
  { color: "#4A1B0C", label: "Executive" },
  { color: "#26215C", label: "Tech" },
];

/* ─── Phone Shell ─────────────────────────────────────────────────── */
function PhoneShell({ children, glow }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: "-60px",
            background:
              "radial-gradient(ellipse at 50% 60%, rgba(13,61,56,0.55) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 280,
          height: 560,
          background: "#1A1A1A",
          border: "1.5px solid #2A2A2A",
          borderRadius: 40,
          overflow: "hidden",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Speaker notch */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 52,
            height: 5,
            background: "#2A2A2A",
            borderRadius: 99,
            zIndex: 10,
          }}
        />
        {/* Camera dot */}
        <div
          style={{
            position: "absolute",
            top: 13,
            left: "calc(50% + 34px)",
            transform: "translateX(-50%)",
            width: 7,
            height: 7,
            background: "#222",
            borderRadius: "50%",
            border: "1px solid #333",
            zIndex: 10,
          }}
        />
        {/* Status bar */}
        <div
          style={{
            height: 28,
            minHeight: 28,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 18px 4px",
            fontSize: 8,
            color: "#666",
            fontFamily: "monospace",
            zIndex: 5,
            background: "transparent",
          }}
        >
          <span>9:41</span>
          <span style={{ letterSpacing: 2 }}>|||</span>
        </div>
        {/* Screen */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            background: "#141414",
          }}
        >
          {children}
        </div>
        {/* Home bar */}
        <div
          style={{
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#141414",
          }}
        >
          <div
            style={{
              width: 60,
              height: 3,
              background: "#2E2E2E",
              borderRadius: 99,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 01: Template chooser with rotating profiles ─────────────── */
function Step01Phone() {
  const [profileIndex, setProfileIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setProfileIndex((i) => (i + 1) % CV_PROFILES.length);
        setOpacity(1);
      }, 400);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const p = CV_PROFILES[profileIndex];

  return (
    <PhoneShell>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          transition: "opacity 0.4s cubic-bezier(0.4,0,0.2,1)",
          opacity,
        }}
      >
        {/* CV Document */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "10px 12px 4px",
            fontFamily: "'Georgia', serif",
            background: "#fff",
          }}
        >
          {/* Header Band */}
          <div
            style={{
              background: "#BAE6FD",
              padding: "8px 10px 7px",
              marginBottom: 8,
              borderRadius: 3,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#0A0A0A",
                letterSpacing: 0.3,
                lineHeight: 1.2,
              }}
            >
              {p.name}
            </div>
            <div
              style={{
                fontSize: 6.5,
                color: "#0A0A0A",
                marginTop: 1.5,
                letterSpacing: 0.5,
              }}
            >
              {p.role} &middot; {p.company}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[p.location, p.email, p.phone].map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 5,
                    color: "#0A0A0A",
                    background: "#93C5FD",
                    padding: "1.5px 4px",
                    borderRadius: 2,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Summary */}
          <SectionBlock label="Professional Summary" accent="#c9a84c">
            <p
              style={{
                fontSize: 5.5,
                color: "#444",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {p.summary}
            </p>
          </SectionBlock>

          {/* Experience */}
          <SectionBlock label="Experience" accent="#c9a84c">
            {p.exp.map((e, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 5.5,
                        fontWeight: 700,
                        color: "#222",
                      }}
                    >
                      {e.role}
                    </div>
                    <div style={{ fontSize: 5, color: "#777" }}>
                      {e.company}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 4.5,
                      color: "#aaa",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.period}
                  </div>
                </div>
                <ul style={{ margin: "2px 0 0 8px", padding: 0 }}>
                  {e.points.map((pt, j) => (
                    <li
                      key={j}
                      style={{
                        fontSize: 5,
                        color: "#555",
                        marginBottom: 1,
                        lineHeight: 1.5,
                      }}
                    >
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </SectionBlock>

          {/* Skills */}
          <SectionBlock label="Key Skills" accent="#c9a84c">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {p.skills.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 4.5,
                    background: "#f5f5f5",
                    border: "0.5px solid #e0e0e0",
                    color: "#555",
                    padding: "2px 5px",
                    borderRadius: 3,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </SectionBlock>
        </div>

        {/* Template Switcher Strip */}
        <div
          style={{
            height: 44,
            background: "#0f0f0f",
            borderTop: "1px solid #1e1e1e",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
          }}
        >
          <span
            style={{
              fontSize: 5,
              color: "#555",
              marginRight: 2,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Templates
          </span>
          {TEMPLATE_CHIPS.map((t) => (
            <div
              key={t.label}
              style={{
                width: t.active ? 30 : 24,
                height: t.active ? 38 : 32,
                borderRadius: 4,
                background: t.color,
                border: t.active
                  ? "1.5px solid #34C97A"
                  : "1px solid #2a2a2a",
                boxShadow: t.active
                  ? "0 0 8px rgba(52,201,122,0.4)"
                  : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: 2,
                  right: 2,
                  height: 1.5,
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 1,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 2,
                  right: 4,
                  height: 1,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 1,
                }}
              />
            </div>
          ))}
          <div
            style={{
              marginLeft: "auto",
              fontSize: 5,
              color: "#34C97A",
              letterSpacing: 0.3,
            }}
          >
            More &rsaquo;
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function SectionBlock({ label, accent, children }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 3,
        }}
      >
        <span
          style={{
            fontSize: 6,
            fontWeight: 700,
            color: "#1a2e1a",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </span>
        <div
          style={{ flex: 1, height: 0.5, background: accent, opacity: 0.6 }}
        />
      </div>
      {children}
    </div>
  );
}

/* ─── Step 02: Fill-in form with green glowing field ─────────────────── */
function Step02Phone() {
  return (
    <PhoneShell>
      <style>{`
        @keyframes hiw-field-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(29,158,117,0.3); }
          50% { box-shadow: 0 0 0 2px rgba(29,158,117,0.08); }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#141414",
          padding: "12px 14px 8px",
        }}
      >
        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <span
              style={{
                fontSize: 6,
                color: "#555",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Step 2 of 5 &middot; Personal Info
            </span>
            <span style={{ fontSize: 6, color: "#1D9E75" }}>40%</span>
          </div>
          <div
            style={{
              height: 2.5,
              background: "#222",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "40%",
                height: "100%",
                background: "#1D9E75",
                borderRadius: 99,
              }}
            />
          </div>
        </div>

        {/* Fields */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Active field — Full Name */}
          <div>
            <div
              style={{
                fontSize: 5.5,
                color: "#1D9E75",
                marginBottom: 3,
                letterSpacing: 0.4,
              }}
            >
              Full Name
            </div>
            <div
              style={{
                background: "#1C1C1C",
                border: "1px solid #1D9E75",
                borderRadius: 8,
                padding: "7px 9px",
                animation: "hiw-field-pulse 1.5s ease-in-out infinite",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 7, color: "#e8e8e8" }}>
                Ahmed Al Mansouri
              </span>
              <span
                style={{
                  display: "inline-block",
                  width: 1,
                  height: 9,
                  background: "#1D9E75",
                  borderRadius: 1,
                  animation: "blink 1s steps(1) infinite",
                }}
              />
            </div>
          </div>

          {/* Normal fields */}
          {[
            { label: "Job Title", value: "Senior Operations Manager" },
            { label: "Current Company", value: "Emirates NBD" },
          ].map((f) => (
            <div key={f.label}>
              <div
                style={{
                  fontSize: 5.5,
                  color: "#555",
                  marginBottom: 3,
                  letterSpacing: 0.4,
                }}
              >
                {f.label}
              </div>
              <div
                style={{
                  background: "#181818",
                  border: "1px solid #252525",
                  borderRadius: 8,
                  padding: "7px 9px",
                }}
              >
                <span style={{ fontSize: 7, color: "#888" }}>{f.value}</span>
              </div>
            </div>
          ))}

          {/* CV section preview bars */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4,
              padding: "8px 0",
            }}
          >
            {[
              { color: "#378ADD", width: "85%" },
              { color: "#1D9E75", width: "70%" },
              { color: "#6366F1", width: "55%" },
              { color: "#D97706", width: "40%" },
            ].map((bar, i) => (
              <div
                key={i}
                style={{
                  height: 3,
                  width: bar.width,
                  background: bar.color,
                  borderRadius: 2,
                  opacity: 0.5,
                }}
              />
            ))}
          </div>

          {/* Continue Button */}
          <button
            style={{
              width: "100%",
              background: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "#0A0A0A",
                letterSpacing: 0.3,
              }}
            >
              Continue
            </span>
            <span
              style={{ fontSize: 9, color: "#0A0A0A", fontWeight: 700 }}
            >
              &rarr;
            </span>
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

/* ─── Step 03: ATS score + download ──────────────────────────────────── */
function Step03Phone() {
  const score = 84;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  const rows = [
    { icon: "\u2713", label: "Keywords matched", value: "Pass", ok: true },
    { icon: "\u2713", label: "Format clean", value: "Pass", ok: true },
    {
      icon: "\u2713",
      label: "Section order correct",
      value: "Pass",
      ok: true,
    },
    {
      icon: "\u26A0",
      label: "Add measurable achievements",
      value: "Improve",
      ok: false,
    },
  ];

  return (
    <PhoneShell glow>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#141414",
          padding: "10px 14px 8px",
          alignItems: "stretch",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div
            style={{
              fontSize: 6,
              color: "#555",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            ATS Score
          </div>
          <div
            style={{
              fontSize: 5.5,
              color: "#1D9E75",
              letterSpacing: 0.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Gulf Market Ready &#x2713;
          </div>
        </div>

        {/* Score Ring */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <svg
              width={100}
              height={100}
              viewBox="0 0 100 100"
              style={{ transform: "rotate(-90deg)" }}
            >
              <defs>
                <linearGradient
                  id="hiw-score-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#1D9E75" />
                  <stop offset="100%" stopColor="#378ADD" />
                </linearGradient>
                <filter id="hiw-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke="#1e1e1e"
                strokeWidth={6}
              />
              <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke="url(#hiw-score-grad)"
                strokeWidth={9}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                opacity={0.15}
                filter="url(#hiw-glow)"
              />
              <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke="url(#hiw-score-grad)"
                strokeWidth={6}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {score}
              </span>
              <span style={{ fontSize: 5, color: "#555", marginTop: 1 }}>
                / 100
              </span>
            </div>
          </div>
        </div>

        {/* Data rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            marginBottom: 10,
          }}
        >
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                background: "#191919",
                border: `1px solid ${r.ok ? "#1e2e1e" : "#2e2318"}`,
                borderRadius: 7,
                padding: "6px 9px",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  fontSize: 7,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: r.ok
                    ? "rgba(29,158,117,0.12)"
                    : "rgba(251,191,36,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: r.ok ? "#1D9E75" : "#FBBF24",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {r.icon}
              </span>
              <span style={{ fontSize: 5.5, color: "#ccc", flex: 1 }}>
                {r.label}
              </span>
              <span
                style={{
                  fontSize: 5,
                  color: r.ok ? "#1D9E75" : "#FBBF24",
                  background: r.ok
                    ? "rgba(29,158,117,0.08)"
                    : "rgba(251,191,36,0.08)",
                  padding: "1.5px 5px",
                  borderRadius: 4,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        {/* Download Button */}
        <button
          style={{
            width: "100%",
            background: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "8px 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "#0A0A0A",
              letterSpacing: 0.3,
            }}
          >
            Download PDF
          </span>
          <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v7M3 5.5l3 3 3-3M2 10h8"
              stroke="#0A0A0A"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </PhoneShell>
  );
}

/* ─── Step layout ────────────────────────────────────────────────────── */
const STEPS = [
  {
    number: "01",
    title: "Choose from Gulf-ready templates",
    description:
      "Professionally designed for UAE, KSA, and GCC hiring managers. ATS-optimised layouts that clear automated screening systems.",
    Phone: Step01Phone,
  },
  {
    number: "02",
    title: "Fill in 5 minutes",
    description:
      "Smart prompts guide every section. Paste your existing CV or start fresh — our assistant fills gaps and suggests Gulf-market phrasing.",
    Phone: Step02Phone,
  },
  {
    number: "03",
    title: "Download. Apply. Get hired.",
    description:
      "Instant ATS analysis scores your CV against real Gulf job postings. One-click PDF export, ready to attach and send.",
    Phone: Step03Phone,
  },
];

/* ─── Main Section ───────────────────────────────────────────────────── */
export default function HowItWorks() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: "#0A0A0A",
        padding: "80px 20px 100px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes hiw-pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #34C97A; }
          50% { opacity: 0.5; box-shadow: 0 0 2px #34C97A; }
        }

        .hiw-desktop-layout {
          display: none;
        }
        .hiw-mobile-layout {
          display: flex;
          flex-direction: column;
          gap: 64px;
          align-items: center;
        }

        @media (min-width: 1024px) {
          .hiw-desktop-layout {
            display: flex;
            flex-direction: column;
            gap: 80px;
            max-width: 1100px;
            margin: 0 auto;
            position: relative;
          }
          .hiw-mobile-layout {
            display: none;
          }
          .hiw-desktop-layout::before {
            content: '';
            position: absolute;
            left: 32px;
            top: 0;
            bottom: 0;
            width: 1px;
            background: linear-gradient(to bottom, transparent, #2A2A2A 10%, #2A2A2A 90%, transparent);
          }
          .hiw-step-row {
            display: grid;
            grid-template-columns: 72px 1fr;
            gap: 48px;
            align-items: start;
          }
          .hiw-step-number {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: #141414;
            border: 1px solid #2A2A2A;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 800;
            color: #A0A0A0;
            font-family: system-ui, monospace;
            position: relative;
            z-index: 2;
          }
          .hiw-step-body {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 48px;
            align-items: center;
          }
          .hiw-step-text {
            max-width: 480px;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#141414",
            border: "1px solid #222",
            borderRadius: 99,
            padding: "5px 14px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#34C97A",
              animation: "hiw-pulse-dot 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "#555",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            How It Works
          </span>
        </div>

        <h2
          style={{
            margin: "0 0 14px",
            fontSize: "clamp(28px, 6vw, 42px)",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: -1,
            lineHeight: 1.1,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Your Gulf career,
          <br />
          launched in minutes.
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: "#444",
            maxWidth: 400,
            lineHeight: 1.7,
            marginInline: "auto",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Three steps. No fluff. A CV that gets past ATS and lands
          interviews.
        </p>
      </div>

      {/* Desktop layout: vertical numbered steps with connector line */}
      <div className="hiw-desktop-layout">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            className="hiw-step-row"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(40px)",
              transition: `opacity 0.7s ease ${i * 0.2}s, transform 0.7s ease ${i * 0.2}s`,
            }}
          >
            <div className="hiw-step-number">{step.number}</div>
            <div className="hiw-step-body">
              <div className="hiw-step-text">
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#f0f0f0",
                    letterSpacing: -0.4,
                    lineHeight: 1.25,
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#555",
                    lineHeight: 1.65,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {step.description}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <step.Phone />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile layout: stacked cards (preserves existing mobile experience) */}
      <div className="hiw-mobile-layout">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 28,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(40px)",
              transition: `opacity 0.7s ease ${i * 0.18}s, transform 0.7s ease ${i * 0.18}s`,
            }}
          >
            <div style={{ position: "relative" }}>
              <step.Phone />
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: -10,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#1C1C1C",
                  border: "1px solid #2A2A2A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#A0A0A0",
                  fontFamily: "system-ui, monospace",
                  letterSpacing: -0.5,
                }}
              >
                {step.number}
              </div>
            </div>
            <div style={{ textAlign: "center", maxWidth: 260 }}>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#f0f0f0",
                  letterSpacing: -0.4,
                  lineHeight: 1.25,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.65,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", marginTop: 72 }}>
        <button
          style={{
            background: "#34C97A",
            color: "#0A0A0A",
            border: "none",
            borderRadius: 12,
            padding: "14px 36px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow:
              "0 0 40px rgba(52,201,122,0.2), 0 4px 16px rgba(0,0,0,0.4)",
            transition:
              "transform 0.15s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s cubic-bezier(0.4,0,0.2,1)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow =
              "0 0 60px rgba(52,201,122,0.3), 0 8px 24px rgba(0,0,0,0.5)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow =
              "0 0 40px rgba(52,201,122,0.2), 0 4px 16px rgba(0,0,0,0.4)";
          }}
        >
          Build My Gulf CV &mdash; It&rsquo;s Free &rarr;
        </button>
        <div style={{ marginTop: 12, fontSize: 12, color: "#3a3a3a" }}>
          No credit card &middot; Takes 5 minutes &middot; Download instantly
        </div>
      </div>
    </section>
  );
}
