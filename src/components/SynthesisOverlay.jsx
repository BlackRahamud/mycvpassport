import { useState, useEffect, useRef } from "react";
import { splitCommaItems } from "../cvShared";

export default function SynthesisOverlay({
  resume,
  selectedTemplateName,
  atsScore,
  onComplete,
  isExiting = false,
}) {
  const [states, setStates] = useState(Array(6).fill("pending"));
  const [downloadReady, setDownloadReady] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers = [];
    for (let i = 0; i < 6; i++) {
      timers.push(
        setTimeout(() => {
          setStates((prev) => {
            const n = [...prev];
            n[i] = "checking";
            return n;
          });
        }, i * 850 + 200)
      );
      timers.push(
        setTimeout(() => {
          setStates((prev) => {
            const n = [...prev];
            n[i] = "confirmed";
            return n;
          });
        }, i * 850 + 750)
      );
    }
    timers.push(setTimeout(() => setDownloadReady(true), 6 * 850 + 400));
    timers.push(setTimeout(() => onCompleteRef.current?.(), 6 * 850 + 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  const userName = resume?.name || "You";
  const expCount = resume?.experience?.length || 0;
  const edu = resume?.education?.[0];
  const eduLabel = edu?.school
    ? `${edu.school}${
        edu.endDate || edu.year
          ? ", " + (edu.endDate?.slice(-4) || edu.year || "")
          : ""
      }`
    : "Education added";
  const skillsCount = splitCommaItems(resume?.skills || "").length;
  const score = typeof atsScore === "number" ? atsScore : 0;
  const scoreLabel =
    score >= 70 ? "Strong match" : score >= 50 ? "Good match" : "Fair match";
  const templateName = selectedTemplateName || "Default";

  const items = [
    { label: userName, sub: "Identity confirmed" },
    {
      label: expCount === 1 ? "1 role added" : `${expCount} roles added`,
      sub: "Work history structured",
    },
    { label: eduLabel, sub: "Qualifications formatted" },
    {
      label: `${skillsCount} skills — ATS optimised`,
      sub: "Keywords matched to job signals",
    },
    {
      label: "ATS Score",
      sub: scoreLabel,
      score,
      badge: score >= 70 ? "Strong" : score >= 50 ? "Good" : "Fair",
    },
    { label: `${templateName} applied`, sub: "Design applied" },
  ];

  return (
    <div
      className={isExiting ? "synthesis-exiting" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "40px 16px 64px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes synthFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .synthesis-exiting {
          animation: synthFadeOut 250ms ease forwards;
        }
        @keyframes travel-light {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes synth-check-draw {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes synth-pulse {
          0%,100% { border-color: rgba(245,158,11,0.3); }
          50% { border-color: rgba(245,158,11,0.9); }
        }
        @keyframes synth-fade-up {
          from { opacity:0; transform:translateY(6px); }
          to { opacity:1; transform:translateY(0); }
        }
      `}</style>
      <div
        style={{
          padding: "1.5px",
          borderRadius: 20,
          maxWidth: 400,
          width: "100%",
          background:
            "linear-gradient(90deg,#1C1C1C 0%,#1C1C1C 35%,rgba(255,255,255,0.4) 50%,#1C1C1C 65%,#1C1C1C 100%)",
          backgroundSize: "300% 100%",
          animation: "travel-light 2.5s linear infinite",
        }}
      >
        <div
          style={{
            background: "#111111",
            borderRadius: 18,
            padding: "1.5rem 1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: "1.25rem",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="6" fill="#F59E0B" />
              <path d="M11 5L17 11L11 17L5 11Z" fill="#0A0A0A" />
              <path d="M11 8.5L13.5 11L11 13.5L8.5 11Z" fill="#F59E0B" />
            </svg>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#F59E0B",
                letterSpacing: "0.1em",
              }}
            >
              CVPASSPORT
            </span>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Verifying your
            </p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "#FFFFFF" }}>
              CV<span style={{ color: "#F59E0B" }}>…</span>
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {items.map((item, i) => {
              const state = states[i];
              const confirmed = state === "confirmed";
              const checking = state === "checking";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom:
                      i < items.length - 1 ? "0.5px solid rgba(255,255,255,0.07)" : "none",
                    animation:
                      state !== "pending" ? "synth-fade-up 0.3s ease-out" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: confirmed
                        ? "1.5px solid #22C55E"
                        : checking
                          ? "1.5px solid rgba(245,158,11,0.7)"
                          : "1.5px solid rgba(255,255,255,0.15)",
                      background: confirmed ? "rgba(34,197,94,0.08)" : "transparent",
                      animation: checking ? "synth-pulse 0.6s ease-in-out infinite" : "none",
                      transition: "border-color 0.3s ease, background 0.3s ease",
                    }}
                  >
                    {confirmed && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M2.5 7L5.5 10L11.5 4"
                          stroke="#22C55E"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="12"
                          strokeDashoffset="0"
                          style={{ animation: "synth-check-draw 0.3s ease-out both" }}
                        />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 500,
                          color:
                            state === "pending" ? "rgba(255,255,255,0.3)" : "#FFFFFF",
                          transition: "color 0.3s ease",
                        }}
                      >
                        {item.label}
                      </p>
                      {item.score != null && confirmed && (
                        <span style={{ fontSize: 16, fontWeight: 600, color: "#F59E0B" }}>
                          {item.score}
                        </span>
                      )}
                      {item.badge && confirmed && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#F59E0B",
                            border: "0.5px solid rgba(245,158,11,0.4)",
                            borderRadius: 20,
                            padding: "2px 8px",
                            fontWeight: 500,
                          }}
                        >
                          ✦ {item.badge}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color:
                          state === "pending"
                            ? "rgba(255,255,255,0.15)"
                            : "#F59E0B",
                        fontFamily: "monospace",
                        transition: "color 0.3s ease",
                      }}
                    >
                      {item.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {downloadReady && (
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                animation: "synth-fade-up 0.4s ease-out",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#F59E0B",
                  flexShrink: 0,
                }}
              />
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                Preparing your download…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
