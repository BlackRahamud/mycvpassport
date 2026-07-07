// Shared motion primitives for the investor film: browser-framed stills
// with Ken Burns moves, click rings, lower-third captions.
import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { T } from "./theme";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

/** Scene-local fade in/out wrapper. */
export const Fade = ({ children, inFrames = 10, outFrames = 8, dur }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(
    f,
    [0, inFrames, dur - outFrames, dur],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/**
 * A captured portal screen inside a minimal browser frame, with a slow
 * Ken Burns move. `move` = {from:{x,y,scale}, to:{x,y,scale}} in fractions
 * of the frame (x/y shift the image center).
 */
export const BrowserShot = ({
  src,
  dur,
  move = { from: { x: 0, y: 0, scale: 1.02 }, to: { x: 0, y: 0, scale: 1.08 } },
  clickRing = null, // {x, y, at, label} — fractions of the image, frame offset
  vertical = false,
  urlLabel = "mycvpassport.com/employer",
}) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = interpolate(f, [0, dur], [0, 1], {
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const lerp = (a, b) => a + (b - a) * p;
  const scale = lerp(move.from.scale, move.to.scale);
  const tx = lerp(move.from.x, move.to.x) * 100;
  const ty = lerp(move.from.y, move.to.y) * 100;

  const frameW = vertical ? width * 0.94 : width * 0.86;
  const frameH = (frameW * 9) / 16 + 44;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: vertical ? "flex-start" : "center", paddingTop: vertical ? height * 0.16 : 0 }}>
      <div
        style={{
          width: frameW,
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: `0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 120px rgba(217,119,6,0.07)`,
          background: T.surface,
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 18px",
            background: T.elevated,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {["#3d3d3d", "#3d3d3d", "#3d3d3d"].map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />
          ))}
          <div
            style={{
              marginLeft: 14,
              flex: 1,
              maxWidth: 520,
              height: 26,
              borderRadius: 13,
              background: T.surface,
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 13,
              fontFamily: T.font,
              display: "flex",
              alignItems: "center",
              paddingLeft: 14,
            }}
          >
            {urlLabel}
          </div>
        </div>
        {/* Screenshot viewport with Ken Burns */}
        <div style={{ position: "relative", width: "100%", height: frameH - 44, overflow: "hidden", background: "#fff" }}>
          <Img
            src={staticFile(src)}
            style={{
              position: "absolute",
              width: "100%",
              transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
              transformOrigin: "center center",
            }}
          />
          {clickRing ? <ClickRing {...clickRing} /> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Pulsing highlight ring at (x,y) fractions of the shot viewport. */
export const ClickRing = ({ x, y, at = 30, label = null }) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0) return null;
  const cycle = t % 46;
  const ringScale = interpolate(cycle, [0, 46], [0.55, 1.5], { easing: EASE });
  const ringOpacity = interpolate(cycle, [0, 8, 46], [0, 0.9, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: 84,
          height: 84,
          marginLeft: -42,
          marginTop: -42,
          borderRadius: "50%",
          border: `3px solid ${T.amber}`,
          opacity: ringOpacity,
          transform: `scale(${ringScale})`,
        }}
      />
      {label ? (
        <div
          style={{
            position: "absolute",
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            marginTop: 30,
            marginLeft: -60,
            fontFamily: T.font,
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            background: "rgba(10,10,10,0.85)",
            border: `1px solid ${T.border}`,
            padding: "5px 12px",
            borderRadius: 8,
            opacity: interpolate(t, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {label}
        </div>
      ) : null}
    </>
  );
};

/** Lower-third caption — consistent across every scene. */
export const Caption = ({ text, sub = null, vertical = false }) => {
  const f = useCurrentFrame();
  const y = interpolate(f, [4, 18], [26, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const opacity = interpolate(f, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: vertical ? "center" : "flex-start", justifyContent: "flex-end", pointerEvents: "none" }}>
      <div
        style={{
          // Vertical cut: the browser frame ends ≈52% down the canvas —
          // pin the caption straight under it instead of the bottom edge.
          margin: vertical ? "0 0 780px 0" : "0 0 54px 84px",
          transform: `translateY(${y}px)`,
          opacity,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: vertical ? "86%" : 760,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            gap: 6,
            background: "rgba(10,10,10,0.9)",
            border: `1px solid ${T.border}`,
            borderLeft: `4px solid ${T.amber}`,
            borderRadius: 12,
            padding: "16px 26px",
          }}
        >
          <span style={{ fontFamily: T.font, fontSize: vertical ? 34 : 30, fontWeight: 700, color: T.text, lineHeight: 1.25 }}>
            {text}
          </span>
          {sub ? (
            <span style={{ fontFamily: T.font, fontSize: vertical ? 21 : 19, fontWeight: 500, color: T.textSecondary }}>
              {sub}
            </span>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** CVPassport wordmark. */
export const Wordmark = ({ size = 64 }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 16, fontFamily: T.font }}>
    <span style={{ fontSize: size, fontWeight: 800, color: T.text, letterSpacing: -1.5 }}>
      CVPassport
    </span>
    <span
      style={{
        fontSize: size * 0.32,
        fontWeight: 700,
        color: T.amber,
        letterSpacing: 3.5,
        textTransform: "uppercase",
      }}
    >
      For Employers
    </span>
  </div>
);
