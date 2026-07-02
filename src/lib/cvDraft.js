// Builder CV-draft localStorage helpers — SINGLE SOURCE OF TRUTH.
//
// Extracted from BuilderPage so the ATS → AI-tailor handoff can write a
// draft under the EXACT key the Builder reads on mount. Both sides import
// getDraftStorageKey from here; the key can never drift between writer and
// reader (that drift was the failure mode that left the tailor canvas blank).
//
// Key scheme:
//   from=ats present   → `cvp_cv_draft:ats`  (deterministic — wins over any
//                        saved-resume edit state so the SCANNED CV always
//                        loads, never the user's stored profile)
//   initialResumeId    → `cvp_cv_draft:edit:<id>`
//   else               → `cvp_cv_draft:new:<?new param || default>`

export const CVP_DRAFT_PREFIX = "cvp_cv_draft";
export const CVP_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Dedicated, fixed key for the ATS scan → AI-tailor handoff. Exported so the
// writer (ATSChecker) and reader (BuilderPage, via getDraftStorageKey) agree
// without re-deriving it.
export const ATS_HANDOFF_DRAFT_KEY = `${CVP_DRAFT_PREFIX}:ats`;

export function getDraftStorageKey(initialResumeId, locationSearch) {
  let params = null;
  try {
    params = new URLSearchParams(locationSearch || "");
  } catch {
    params = null;
  }
  // ATS → AI-tailor handoff: a dedicated key that ignores initialResumeId so
  // the scanned-CV draft is read regardless of any saved-resume edit state.
  if (params && params.get("from") === "ats") return ATS_HANDOFF_DRAFT_KEY;
  if (initialResumeId) return `${CVP_DRAFT_PREFIX}:edit:${initialResumeId}`;
  let sessionId = "default";
  if (params) sessionId = params.get("new") || "default";
  return `${CVP_DRAFT_PREFIX}:new:${sessionId}`;
}

/* Owner scoping — the privacy contract for shared machines.
   Drafts written during a logged-in session are stamped with that user's
   id. A later reader with a DIFFERENT identity (another account, or a
   logged-out/anonymous visitor at the same browser) gets null and the
   stale draft is cleared — a stranger opening /builder must never see the
   previous person's CV. Drafts authored anonymously carry no ownerId and
   stay readable in that browser (same anonymous person continuing). */
export function readCvDraft(key, currentUserId = null) {
  if (!key || typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.cv) return null;
    const age = Date.now() - (Number(parsed.updatedAt) || 0);
    if (age > CVP_DRAFT_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    if (parsed.ownerId && parsed.ownerId !== currentUserId) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCvDraft(key, payload, ownerId = null) {
  if (!key || typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ ...payload, ownerId: ownerId || payload?.ownerId || null, updatedAt: Date.now() }),
    );
  } catch { /* quota / private mode */ }
}

export function clearCvDraft(key) {
  if (!key || typeof window === "undefined" || !window.localStorage) return;
  try { window.localStorage.removeItem(key); } catch { /* noop */ }
}
