// =============================================================
// Nudge config for the HR Fab orb.
// Add items to FAB_NUDGES. Shape: { id, message, priority, targetActionId, screen }
// Optional `when(ctx)` hides a nudge until its condition is true.
// =============================================================

export const NUDGE_SEEN_KEY = "cvp_fab_nudge_seen";
export const NUDGE_IDLE_MS = 5000;
export const NUDGE_TEASER_MS = 6000;
export const NUDGE_FADE_MS = 320;

export const FAB_NUDGES = [
  {
    id: "jobs-zero-open-roles",
    message: "Post your first role in 5 calm steps",
    priority: "tip",
    targetActionId: "post",
    screen: "jobs",
    when: (ctx) => ctx.openRoleCount === 0,
  },
  {
    id: "candidates-waiting",
    message: "{n} candidates are waiting on you",
    priority: "tip",
    targetActionId: "candidates",
    screen: "jobs",
    // TODO: wire a waiting-candidate count into FabAssistant (ctx.waitingCount)
    // and interpolate {n}. Hidden until that data exists on this component.
    when: () => false,
  },
];

const PRIORITY_RANK = { urgent: 0, tip: 1 };

export function readSeenNudges() {
  try {
    const raw = window.localStorage?.getItem(NUDGE_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markNudgeSeen(id) {
  if (!id) return;
  try {
    const seen = readSeenNudges();
    seen.add(id);
    window.localStorage?.setItem(NUDGE_SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* app must keep working if storage fails */
  }
}

export function resolveNudgeMessage(nudge, ctx) {
  if (!nudge) return "";
  const n = ctx?.waitingCount;
  return String(nudge.message || "").replace(/\{n\}/g, n == null ? "" : String(n)).replace(/\s+/g, " ").trim();
}

export function pickFabNudge(ctx) {
  const seen = ctx.seen || new Set();
  const list = FAB_NUDGES
    .filter((n) => n && !seen.has(n.id) && n.screen === ctx.screen)
    .filter((n) => (typeof n.when === "function" ? n.when(ctx) : true))
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
  return list[0] || null;
}

export function isFormFieldFocused() {
  try {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  } catch {
    return false;
  }
}
