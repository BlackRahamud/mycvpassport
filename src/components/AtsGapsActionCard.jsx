import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Inline SVG micro-icons drawn for this card. No glyph fonts, no emoji.
function PlusIcon({ size = 11, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const EASE = [0.4, 0, 0.2, 1];

// Threshold gates (also enforced at mount site as defence in depth)
const SHOW_BELOW_SCORE = 85;
const MIN_GAPS = 3;

export default function AtsGapsActionCard({
  score,
  visibilityBoosters,
  isPro,
  onUpgrade,
}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const gaps = (Array.isArray(visibilityBoosters) ? visibilityBoosters : []).slice(0, 3);
  const projected = Math.min(score + gaps.length * 10, 95);

  const shouldShow = score < SHOW_BELOW_SCORE && gaps.length >= MIN_GAPS;

  // Tick the "projected" number from current → projected so the after-state
  // feels like a calculation completing, not a static label.
  const [displayProjected, setDisplayProjected] = useState(score);
  useEffect(() => {
    if (!shouldShow) return undefined;
    if (reduce) {
      setDisplayProjected(projected);
      return undefined;
    }
    const start = performance.now();
    const duration = 800;
    const startDelay = 1400; // wait for the card frame to land
    let raf;
    const step = (now) => {
      const elapsed = now - start;
      if (elapsed < startDelay) {
        raf = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(1, (elapsed - startDelay) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplayProjected(Math.round(score + (projected - score) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [score, projected, reduce, shouldShow]);

  if (!shouldShow) return null;

  const handlePrimary = () => {
    const encoded = gaps.map((g) => encodeURIComponent(g)).join(",");
    navigate(`/builder?from=ats&gaps=${encoded}`);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, delay: 1.2, ease: EASE }}
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #181818 0%, #121212 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        padding: "22px 20px",
        marginTop: 24,
        marginBottom: 28,
        // Layered depth: faint amber edge ring + top-edge highlight + grounded
        // drop + wide outward amber spill so the card lifts off the page
        // without a heavy frame.
        boxShadow: [
          "0 0 0 1px rgba(217,119,6,0.06)",
          "inset 0 1px 0 rgba(255,255,255,0.04)",
          "0 24px 48px -12px rgba(0,0,0,0.6)",
          "0 0 60px -20px rgba(217,119,6,0.18)",
        ].join(", "),
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: "#FFFFFF",
          marginBottom: 18,
          lineHeight: 1.4,
        }}
      >
        {gaps.length} specific things hurting your score
      </div>

      {/* Before → after gauge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 22,
        }}
      >
        {/* now — dim desaturated red ring; reads as a warning, not a placeholder */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(239,68,68,0.06)",
              border: "1.5px solid rgba(239,68,68,0.32)",
              boxShadow: "inset 0 0 12px rgba(239,68,68,0.06)",
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1,
                color: "#F87171",
                letterSpacing: "-0.5px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {score}
            </span>
          </div>
          <span
            style={{
              fontSize: 9,
              color: "rgba(248,113,113,0.65)",
              marginTop: 6,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Now
          </span>
        </div>

        {/* gradient bar — base track + animated overlay from current to projected */}
        <div style={{ flex: 1, position: "relative", minWidth: 40 }}>
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: "linear-gradient(90deg, #EF4444 0%, #F59E0B 45%, #22C55E 100%)",
              opacity: 0.22,
            }}
          />
          <motion.div
            initial={reduce ? false : { width: `${score}%` }}
            animate={{ width: `${projected}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.85, delay: 1.4, ease: EASE }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              borderRadius: 999,
              background: "linear-gradient(90deg, #EF4444 0%, #F59E0B 45%, #22C55E 100%)",
              boxShadow:
                "0 0 4px rgba(74,222,128,0.65), 0 0 14px rgba(74,222,128,0.35)",
            }}
          />
        </div>

        {/* projected — conic-gradient ring around the circle */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <div style={{ position: "relative", padding: 3 }}>
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                padding: 1.5,
                background:
                  "conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(74,222,128,0.75) 80%, transparent 100%)",
                WebkitMask:
                  "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                animation: reduce ? "none" : "ats-spin-border 3s linear infinite",
              }}
            />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at 50% 30%, rgba(74,222,128,0.18) 0%, rgba(74,222,128,0.06) 70%)",
                boxShadow: "inset 0 0 18px rgba(74,222,128,0.08)",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#4ADE80",
                  letterSpacing: "-0.5px",
                  fontVariantNumeric: "tabular-nums",
                  textShadow: "0 0 14px rgba(74,222,128,0.55)",
                }}
              >
                {displayProjected}
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: 9,
              color: "#4ADE80",
              opacity: 0.85,
              marginTop: 6,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Projected
          </span>
        </div>
      </div>

      {/* Three named gaps — each row reads as a finding, not a list item */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
        {gaps.map((g, i) => (
          <motion.div
            key={g}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.32, delay: 1.6 + i * 0.06, ease: EASE }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
              fontSize: 14,
              color: "#A0A0A0",
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 6,
                background:
                  "linear-gradient(180deg, rgba(217,119,6,0.18) 0%, rgba(217,119,6,0.08) 100%)",
                border: "1px solid rgba(217,119,6,0.35)",
                color: "#F59E0B",
                flexShrink: 0,
                boxShadow: "0 0 8px rgba(217,119,6,0.18)",
              }}
            >
              <PlusIcon size={12} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              Add{" "}
              <span style={{ fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.005em" }}>
                {g}
              </span>
            </span>
            {i === 0 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "#D97706",
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(217,119,6,0.35)",
                  background: "rgba(217,119,6,0.08)",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                High impact
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Urgency line — relocated above the CTA so it primes the click */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.4, delay: 1.85, ease: EASE }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 12,
          fontSize: 12,
          fontWeight: 600,
          color: "#D97706",
          letterSpacing: "0.005em",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#D97706",
            boxShadow: "0 0 8px rgba(217,119,6,0.7)",
            flexShrink: 0,
          }}
        />
        Most Gulf roles fill in 48 hours.
      </motion.div>

      {/* Primary CTA — sharp white text on an amber gradient with the
          glow spilling outward like the score-ring on the ATS page */}
      <motion.button
        type="button"
        onClick={handlePrimary}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.4, delay: 1.95, ease: EASE }}
        style={{
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "linear-gradient(180deg, #E08810 0%, #B25E03 100%)",
          color: "#FFFFFF",
          border: "none",
          padding: "14px 18px",
          borderRadius: 9999,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "-0.005em",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.18)",
            "0 0 0 1px rgba(217,119,6,0.45)",
            "0 0 24px rgba(217,119,6,0.45)",
            "0 0 60px -8px rgba(217,119,6,0.55)",
            "0 6px 20px rgba(217,119,6,0.30)",
          ].join(", "),
          transition:
            "filter 160ms cubic-bezier(0.4,0,0.2,1), transform 160ms cubic-bezier(0.4,0,0.2,1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = "brightness(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "none";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = "scale(0.985)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "none";
        }}
      >
        <span>Fix the first one — free</span>
        <ArrowRightIcon size={14} color="#FFFFFF" />
      </motion.button>

      {/* Pro upsell — hidden for users who already have access */}
      {!isPro && (
        <button
          type="button"
          onClick={onUpgrade}
          style={{
            background: "none",
            border: "none",
            padding: "12px 0 0",
            color: "#A0A0A0",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "block",
            margin: "0 auto",
            textDecoration: "underline",
            textDecorationColor: "rgba(255,255,255,0.18)",
            textUnderlineOffset: 3,
            transition: "color 160ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#A0A0A0";
          }}
        >
          Or fix all {gaps.length} with Active Hunter — AED 29/mo
        </button>
      )}

    </motion.div>
  );
}
