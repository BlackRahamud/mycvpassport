import { useEffect, useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Pick your template",
    desc: "Choose from 11 professionally designed templates — Banking & Finance, Gulf Executive, ATS International, and more.",
    active: true,
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="4" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="6" y="4" width="24" height="9" rx="3" fill="currentColor" fillOpacity="0.08" stroke="none"/>
        <line x1="11" y1="19" x2="25" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="11" y1="24" x2="20" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
        <circle cx="18" cy="10" r="3" fill="currentColor"/>
      </svg>
    ),
  },
  {
    number: "02",
    title: "Fill in your details",
    desc: "Type directly into a live split-panel editor. See your CV update in real time as you add experience, skills, and education.",
    active: false,
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="5" y="8" width="26" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <line x1="10" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="10" y1="19" x2="22" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
        <line x1="10" y1="23" x2="18" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
        <circle cx="28" cy="26" r="5" fill="currentColor"/>
        <line x1="26" y1="26" x2="30" y2="26" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="28" y1="24" x2="28" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    number: "03",
    title: "Download and apply",
    desc: "Export a polished, ATS-optimised PDF instantly. Arabic CV export available. No watermark on Pro.",
    active: false,
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 5 L18 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 16 L18 23 L24 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M7 26 L7 30 L29 30 L29 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
];

const pills = ["11 templates", "ATS optimised", "Arabic CV export", "UAE · India · KSA", "Free to start"];

export default function HowItWorks() {
  const stepRefs = useRef([]);

  useEffect(() => {
    const observers = stepRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add("hiw-visible"), i * 180);
            obs.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o && o.disconnect());
  }, []);

  return (
    <section style={styles.section}>
      <p style={styles.eyebrow}>How it works</p>
      <h2 style={styles.headline}>Your Gulf-ready CV in 3 steps</h2>
      <p style={styles.subline}>No design skills needed. Built for UAE, Saudi, and India job markets.</p>

      <div style={styles.stepsWrapper}>
        <div style={styles.connectorLine} />

        {steps.map((step, i) => (
          <div
            key={i}
            ref={(el) => (stepRefs.current[i] = el)}
            className="hiw-step"
            style={styles.step}
          >
            <div
              style={{
                ...styles.iconWrap,
                border: step.active ? "1.5px solid #000" : "0.5px solid rgba(0,0,0,0.18)",
              }}
            >
              <span style={styles.icon}>{step.icon}</span>
            </div>
            <span style={styles.stepLabel}>Step {step.number}</span>
            <h3 style={styles.stepTitle}>{step.title}</h3>
            <p style={styles.stepDesc}>{step.desc}</p>
          </div>
        ))}
      </div>

      <div style={styles.ctaRow}>
        <a href="https://mycvpassport.com" style={styles.btnPrimary}>
          Build my CV — it's free
        </a>
        <a href="https://mycvpassport.com/#templates" style={styles.btnGhost}>
          See all templates
        </a>
      </div>

      <div style={styles.pillRow}>
        {pills.map((p, i) => (
          <span key={i} style={styles.pill}>{p}</span>
        ))}
      </div>

      <style>{`
        .hiw-step {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .hiw-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        @media (max-width: 640px) {
          .hiw-steps-grid {
            grid-template-columns: 1fr !important;
          }
          .hiw-connector {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

const styles = {
  section: {
    padding: "80px 24px",
    maxWidth: "960px",
    margin: "0 auto",
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    color: "#888",
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: "12px",
  },
  headline: {
    fontSize: "clamp(24px, 4vw, 36px)",
    fontWeight: 500,
    color: "#000",
    textAlign: "center",
    lineHeight: 1.3,
    marginBottom: "12px",
  },
  subline: {
    fontSize: "16px",
    color: "#666",
    textAlign: "center",
    lineHeight: 1.6,
    marginBottom: "56px",
  },
  stepsWrapper: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "0",
    position: "relative",
    className: "hiw-steps-grid",
  },
  connectorLine: {
    position: "absolute",
    top: "44px",
    left: "calc(16.66% + 44px)",
    width: "calc(66.66% - 88px)",
    height: "1px",
    background: "rgba(0,0,0,0.1)",
    zIndex: 0,
    className: "hiw-connector",
  },
  step: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "0 20px",
    position: "relative",
    zIndex: 2,
  },
  iconWrap: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  icon: {
    color: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    color: "#aaa",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  stepTitle: {
    fontSize: "17px",
    fontWeight: 500,
    color: "#000",
    marginBottom: "10px",
    lineHeight: 1.3,
  },
  stepDesc: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.65,
  },
  ctaRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginTop: "48px",
    flexWrap: "wrap",
  },
  btnPrimary: {
    padding: "12px 28px",
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  },
  btnGhost: {
    padding: "12px 28px",
    background: "transparent",
    color: "#000",
    border: "0.5px solid rgba(0,0,0,0.25)",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  },
  pillRow: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginTop: "20px",
    flexWrap: "wrap",
  },
  pill: {
    fontSize: "12px",
    padding: "4px 12px",
    borderRadius: "999px",
    border: "0.5px solid rgba(0,0,0,0.15)",
    color: "#666",
    background: "#f5f5f5",
  },
};
