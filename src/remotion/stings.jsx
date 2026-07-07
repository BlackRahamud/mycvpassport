// Programmatic intro/close stings + narrative cards. Pure Remotion motion
// on brand tokens — no AI-generated imagery, no fake UI.
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { T } from "./theme";
import { Wordmark } from "./ui";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

/** Deterministic pseudo-random particles (no Math.random at render). */
const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const h = ((i * 2654435761) % 1000) / 1000;
  const v = ((i * 40503) % 1000) / 1000;
  return { x: h, y: v, r: 1.5 + (i % 4), speed: 0.35 + ((i % 5) * 0.14) };
});

const ParticleField = ({ opacity = 1 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity }}>
      {PARTICLES.map((p, i) => {
        const y = ((p.y * height - f * p.speed) % height + height) % height;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x * width,
              top: y,
              width: p.r,
              height: p.r,
              borderRadius: "50%",
              background: i % 6 === 0 ? T.amber : "rgba(255,255,255,0.35)",
              opacity: 0.5,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Rotating conic ring — the brand's OLED moment. */
const ConicRing = ({ size, thickness = 3, speed = 0.55, opacity = 1 }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        padding: thickness,
        background: `conic-gradient(from ${f * speed}deg, transparent 0deg, ${T.amber} 80deg, transparent 160deg, transparent 360deg)`,
        WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px))",
        mask: "radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px))",
        opacity,
      }}
    />
  );
};

export const IntroSting = ({ dur, vertical = false }) => {
  const f = useCurrentFrame();
  const ringIn = interpolate(f, [0, 24], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  const hookIn = interpolate(f, [30, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hookY = interpolate(f, [30, 48], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const out = interpolate(f, [dur - 14, dur], [1, 0], { extrapolateLeft: "clamp" });
  const ringSize = vertical ? 560 : 620;
  return (
    <AbsoluteFill style={{ background: T.bg, alignItems: "center", justifyContent: "center", opacity: out }}>
      <ParticleField opacity={0.8} />
      <div style={{ position: "absolute", opacity: ringIn * 0.9 }}>
        <ConicRing size={ringSize} />
      </div>
      <div style={{ position: "absolute", opacity: ringIn * 0.4 }}>
        <ConicRing size={ringSize * 1.42} speed={-0.3} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34, padding: "0 60px" }}>
        <div style={{ opacity: ringIn, transform: `scale(${0.94 + ringIn * 0.06})` }}>
          <Wordmark size={vertical ? 56 : 72} />
        </div>
        <div
          style={{
            opacity: hookIn,
            transform: `translateY(${hookY}px)`,
            fontFamily: T.font,
            fontSize: vertical ? 34 : 38,
            fontWeight: 600,
            color: T.textSecondary,
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: 900,
          }}
        >
          Every Gulf role attracts hundreds of CVs.
          <br />
          <span style={{ color: T.text, fontWeight: 700 }}>Almost none of them fit.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SolutionCard = ({ dur, vertical = false }) => {
  const f = useCurrentFrame();
  const lines = ["Post the role.", "Screen scored applicants.", "Book the interview."];
  const out = interpolate(f, [dur - 14, dur], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ background: T.bg, alignItems: "center", justifyContent: "center", opacity: out }}>
      <ParticleField opacity={0.5} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: vertical ? "center" : "flex-start", gap: 22, padding: "0 70px" }}>
        {lines.map((line, i) => {
          const at = 6 + i * 16;
          const o = interpolate(f, [at, at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(f, [at, at + 14], [vertical ? 0 : -30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
          const y = interpolate(f, [at, at + 14], [vertical ? 24 : 0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
          return (
            <div
              key={line}
              style={{
                opacity: o,
                transform: `translate(${x}px, ${y}px)`,
                fontFamily: T.font,
                fontSize: vertical ? 52 : 64,
                fontWeight: 800,
                color: i === 2 ? T.amber : T.text,
                letterSpacing: -1,
              }}
            >
              {line}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 16,
            opacity: interpolate(f, [62, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            fontFamily: T.font,
            fontSize: vertical ? 28 : 30,
            fontWeight: 600,
            color: T.textSecondary,
          }}
        >
          One portal. The whole hiring loop.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const WhyTiles = ({ dur, vertical = false }) => {
  const f = useCurrentFrame();
  const tiles = [
    { title: "Scored on arrival", body: "Applicants land ranked against your JD — the shortlist starts sorted." },
    { title: "One-click pipeline", body: "Shortlist → ready → interviewed → offer, on one board." },
    { title: "Invites sent for you", body: "Calendar invite emailed the moment you pick a time." },
  ];
  const out = interpolate(f, [dur - 14, dur], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ background: T.bg, alignItems: "center", justifyContent: "center", opacity: out }}>
      <ParticleField opacity={0.4} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44, padding: "0 60px" }}>
        <div
          style={{
            fontFamily: T.font,
            fontSize: vertical ? 40 : 46,
            fontWeight: 800,
            color: T.text,
            opacity: interpolate(f, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          Built for the India → Gulf hiring corridor
        </div>
        <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: 26 }}>
          {tiles.map((tile, i) => {
            const at = 18 + i * 12;
            const o = interpolate(f, [at, at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const y = interpolate(f, [at, at + 14], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
            return (
              <div
                key={tile.title}
                style={{
                  opacity: o,
                  transform: `translateY(${y}px)`,
                  width: vertical ? 780 : 470,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderTop: `3px solid ${i === 1 ? T.amber : T.border}`,
                  borderRadius: 16,
                  padding: "30px 32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <span style={{ fontFamily: T.font, fontSize: 27, fontWeight: 700, color: T.text }}>{tile.title}</span>
                <span style={{ fontFamily: T.font, fontSize: 19, fontWeight: 500, color: T.textSecondary, lineHeight: 1.5 }}>
                  {tile.body}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: T.font,
            fontSize: 16,
            fontWeight: 500,
            color: T.textSecondary,
            opacity: interpolate(f, [60, 74], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          [ metric slots — replace with real time-to-shortlist / interviews-per-week data ]
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Closer = ({ dur, vertical = false }) => {
  const f = useCurrentFrame();
  const inO = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  const fadeToBlack = interpolate(f, [dur - 20, dur - 4], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ background: T.bg, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", opacity: inO * 0.85 * fadeToBlack }}>
        <ConicRing size={vertical ? 600 : 680} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, opacity: fadeToBlack }}>
        <div style={{ opacity: inO, transform: `scale(${0.95 + inO * 0.05})` }}>
          <Wordmark size={vertical ? 54 : 68} />
        </div>
        <div
          style={{
            fontFamily: T.font,
            fontSize: vertical ? 36 : 40,
            fontWeight: 700,
            color: T.text,
            opacity: interpolate(f, [16, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          The hiring loop, closed.
        </div>
        <div
          style={{
            fontFamily: T.font,
            fontSize: 24,
            fontWeight: 600,
            color: T.amber,
            letterSpacing: 0.5,
            opacity: interpolate(f, [30, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          mycvpassport.com/employer
        </div>
      </div>
    </AbsoluteFill>
  );
};
