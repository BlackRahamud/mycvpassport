import { useState, useEffect } from "react";
import { splitCommaItems } from "../cvShared";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

function AmberTick() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#F59E0B" />
      <path
        d="M7 12l4 4 6-6"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerDot() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        border: "2px solid #2A2A2A",
        borderTop: "2px solid #F59E0B",
        borderRadius: "50%",
        animation: "cvpBuilderPdfSpin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

export default function SynthesisOverlay({
  visible,
  resume,
  selectedTemplateName,
  scanStatus,
  atsScore,
  onComplete,
}) {
  const [step, setStep] = useState(0);

  const expCount = Array.isArray(resume?.experience)
    ? resume.experience.filter(e => e.company || e.role).length
    : 0;
  const eduCount = Array.isArray(resume?.education)
    ? resume.education.filter(e => e.school || e.degree).length
    : 0;
  const skillsCount = splitCommaItems(resume?.skills || "").length;

  const items = [
    {
      text: `${resume?.name || "Your info"} — Personal info verified`,
    },
    {
      text: expCount > 0
        ? `${expCount} Experience ${expCount === 1 ? "entry" : "entries"} formatted`
        : "Experience section formatted",
    },
    {
      text: eduCount > 0
        ? `${eduCount} Education ${eduCount === 1 ? "entry" : "entries"} added`
        : "Education section added",
    },
    {
      text: skillsCount > 0
        ? `${skillsCount} Skills optimized for ATS`
        : "Skills section optimized",
    },
    {
      text: scanStatus === "complete" && atsScore
        ? `ATS Score: ${atsScore} — Strong ✦`
        : "ATS patterns applied",
    },
    {
      text: selectedTemplateName
        ? `Template: ${selectedTemplateName} applied`
        : "Template applied",
    },
  ];

  useEffect(() => {
    if (!visible) {
      setStep(0);
      return;
    }
    setStep(0);
    const timers = [];
    items.forEach((_, i) => {
      timers.push(
        setTimeout(() => setStep(i + 1), 400 + i * 400)
      );
    });
    timers.push(
      setTimeout(() => {
        onComplete?.();
      }, 400 + items.length * 400 + 600)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timed sequence when overlay opens; items/onComplete intentionally snapshot
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(10,10,10,0.97)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
        animation: "fabFadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 320,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#F59E0B",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          Compiling your CVPassport...
        </p>

        {items.map((item, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: done || active ? 1 : 0.25,
                transition: `opacity 300ms ${EASE}`,
              }}
            >
              {done ? <AmberTick /> : <SpinnerDot />}
              <span
                style={{
                  fontSize: 13,
                  color: done ? "#FFFFFF" : "#A0A0A0",
                  fontWeight: done ? 500 : 400,
                  transition: `color 300ms ${EASE}`,
                }}
              >
                {item.text}
              </span>
            </div>
          );
        })}

        {step >= items.length && (
          <div
            style={{
              marginTop: 20,
              textAlign: "center",
              fontSize: 14,
              color: "#F59E0B",
              fontWeight: 600,
              animation: "fabFadeIn 0.3s ease",
            }}
          >
            ↓ Downloading your CV...
          </div>
        )}
      </div>
    </div>
  );
}
