// Design tokens for the investor film overlays — mirrors the app's
// Design System block in CLAUDE.md. No purple in motion graphics.
export const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  border: "#2A2A2A",
  amber: "#D97706",
  green: "#1D9E75",
  blue: "#378ADD",
  font: "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif",
  ease: [0.4, 0, 0.2, 1],
};

export const FPS = 30;

/** Scene timeline (frames @30fps) — single source of truth for both cuts. */
export const SCENES = [
  { key: "intro", from: 0, dur: 135 },
  { key: "solution", from: 135, dur: 135 },
  { key: "landing", from: 270, dur: 150 },
  { key: "wizardStart", from: 420, dur: 180 },
  { key: "wizardSkills", from: 600, dur: 180 },
  { key: "wizardJD", from: 780, dur: 150 },
  { key: "publish", from: 930, dur: 195 },
  { key: "jobsList", from: 1125, dur: 165 },
  { key: "board", from: 1290, dur: 210 },
  { key: "detail", from: 1500, dur: 240 },
  { key: "cvViewer", from: 1740, dur: 210 },
  { key: "stageMove", from: 1950, dur: 165 },
  { key: "scheduleModal", from: 2115, dur: 195 },
  { key: "confirmed", from: 2310, dur: 210 },
  { key: "payoff", from: 2520, dur: 180 },
  { key: "whyTiles", from: 2700, dur: 210 },
  { key: "close", from: 2910, dur: 210 },
];

export const TOTAL_FRAMES = 3120;

export const sceneOf = (key) => SCENES.find((s) => s.key === key);
