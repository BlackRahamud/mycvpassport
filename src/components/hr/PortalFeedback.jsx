// =============================================================
// src/components/hr/PortalFeedback.jsx
//
// One tap, from anywhere in the employer portal, to say what is not
// working (Feedback Canvas / Feedback Prototype). A quiet floating
// affordance, bottom-right, that opens a single text field and a send.
// The product silently carries the context she would otherwise have to
// describe, so one sentence is enough.
//
// The design thesis: make one sentence actionable. On submit we write a
// `feedback` row (migration 040) — that ROW is the record — then fire a
// founder email (best-effort, never blocks the submission). A failed
// email is silent; a failed ROW keeps her words on screen with a plain
// retry, because a silent send failure is the one unforgivable bug here.
//
// Mounted once in HrShell (covers every shell screen and every modal
// they render — it portals to <body> above the modal layer) and once in
// ReviewMode (the one full-screen portal screen outside the shell). The
// live companion runs in its own PiP window and is deliberately out of
// scope (a main-window layer cannot reach it, and she is interviewing).
//
// Motion (Motion principles.md, 2a): the panel opens from the affordance
// and collapses back into it, 350ms ease-out, reduced motion degrades to
// a plain fade. Same open-from-origin as the Interviews tab.
//
// No analytics here on purpose — the portal event taxonomy is a separate,
// UI-free change; the two are not merged.
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../appSupabaseClient";
import { getReplaySessionId } from "../../lib/analytics/posthog";
import "../../pages/hr/PostJob/postJob.css"; // :root --pj-* tokens
import "./surfaceGlass.css"; // --surface-glass-* tokens (light + dark)
import "./portalFeedback.css";

const EASE_CSS = "cubic-bezier(0.4, 0, 0.2, 1)";
const DRAFT_KEY = "cvp_feedback_draft";
// Placeholder — in the register of "put down whatever is not working", so
// it feels normal to say something negative. No dashes anywhere in copy.
const PLACEHOLDER = "Tell us what is not working, even if it is small";

function prefersReducedMotion() {
  try {
    return typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
}

// FLIP the panel out of (open) or back into (close) the affordance rect.
// Pure WAAPI so close can reverse it; reduced motion gets a plain fade.
function flip(el, origin, dir /* "in" | "out" */, done) {
  if (!el || typeof el.animate !== "function") { if (done) done(); return; }
  const reduce = prefersReducedMotion();
  const finish = () => { if (done) done(); };
  if (reduce || !origin) {
    const kf = dir === "in" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
    const a = el.animate(kf, { duration: reduce ? 120 : 150, easing: "ease-out", fill: "forwards" });
    a.onfinish = finish; a.oncancel = finish;
    return;
  }
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) { finish(); return; }
  const dx = origin.left + origin.width / 2 - (r.left + r.width / 2);
  const dy = origin.top + origin.height / 2 - (r.top + r.height / 2);
  const sx = Math.max(origin.width / r.width, 0.04);
  const sy = Math.max(origin.height / r.height, 0.04);
  const at = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  const kf = dir === "in"
    ? [{ transform: at, opacity: 0.2 }, { transform: "none", opacity: 1 }]
    : [{ transform: "none", opacity: 1 }, { transform: at, opacity: 0.15 }];
  const a = el.animate(kf, { duration: 350, easing: EASE_CSS, fill: "forwards" });
  a.onfinish = finish; a.oncancel = finish;
}

export default function PortalFeedback() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [reopened, setReopened] = useState(false);

  const affRef = useRef(null);
  const panelRef = useRef(null);
  const taRef = useRef(null);
  const originRef = useRef(null);
  const closingRef = useRef(false);
  const autoRef = useRef(null);

  // Restore a kept draft across a full reload (flaky-connection insurance,
  // on top of the in-memory draft that already survives panel open/close).
  useEffect(() => {
    try {
      const saved = window.localStorage?.getItem(DRAFT_KEY);
      if (saved && saved.trim()) setText(saved);
    } catch { /* ignore */ }
  }, []);

  const persistDraft = useCallback((val) => {
    try {
      if (val && val.trim()) window.localStorage?.setItem(DRAFT_KEY, val);
      else window.localStorage?.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, []);

  const openPanel = (e) => {
    originRef.current = e?.currentTarget?.getBoundingClientRect?.() || null;
    closingRef.current = false;
    setReopened(status !== "sent" && text.trim().length > 0);
    if (status === "sent") setStatus("idle");
    setOpen(true);
  };

  // Close, keeping her words (both in state and in localStorage). Never a
  // clean state on close — losing her sentence is worse than never asking.
  const closePanel = useCallback(() => {
    if (closingRef.current) return;
    const el = panelRef.current;
    closingRef.current = true;
    if (el) el.style.pointerEvents = "none";
    persistDraft(text);
    flip(el, originRef.current, "out", () => {
      setOpen(false);
      setReopened(false);
      if (status === "sent") setStatus("idle");
    });
  }, [text, status, persistDraft]);

  // Open-from-origin on mount of the panel.
  useEffect(() => {
    if (!open) return;
    flip(panelRef.current, originRef.current, "in");
    const t = setTimeout(() => {
      if (status !== "sent" && taRef.current) taRef.current.focus();
    }, 60);
    return () => clearTimeout(t);
    // Run once per open; status at open time is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes (draft kept). Capture phase + stopPropagation so an
  // underlying modal's own Escape handler does not also fire.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        ev.preventDefault();
        closePanel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, closePanel]);

  useEffect(() => () => clearTimeout(autoRef.current), []);

  const onInput = (e) => {
    const val = e.target.value;
    setText(val);
    persistDraft(val);
    if (status === "failed") setStatus("idle");
  };

  const finishSent = useCallback(() => {
    const el = panelRef.current;
    flip(el, originRef.current, "out", () => {
      setOpen(false);
      setText("");
      setReopened(false);
      setStatus("idle");
    });
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || status === "sending") return;
    setStatus("sending");
    setReopened(false);

    // Identity + silent context. Never shown to her, never confirmed.
    let user = null;
    try { ({ data: { user } = {} } = await supabase.auth.getUser()); } catch { /* offline */ }
    const route = (typeof window !== "undefined" && window.location) ? window.location.pathname : null;
    const sessionId = getReplaySessionId();
    const userAgent = (typeof navigator !== "undefined") ? navigator.userAgent : null;

    // 1) The ROW is the record. Its success is the submission's success.
    //    If it fails, keep her words on screen with a plain retry.
    if (!user?.id) { setStatus("failed"); return; }
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      body,
      route,
      session_id: sessionId,
      user_agent: userAgent,
    });
    if (error) { setStatus("failed"); return; }

    // She has been heard. Show sent immediately.
    setStatus("sent");
    setText("");
    persistDraft("");
    clearTimeout(autoRef.current);
    autoRef.current = setTimeout(finishSent, 1900);

    // 2) The email is only the notification. Best-effort: a failure here
    //    never rolls back the row and is never surfaced to her.
    try {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      fetch("/api/notify-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "feedback",
          feedbackBody: body,
          route,
          sessionId,
          userEmail: user.email || "",
          userName: name,
          userId: user.id,
        }),
      }).catch(() => { /* silent — the row already carries it */ });
    } catch { /* silent */ }
  };

  const empty = !text.trim();
  const isSending = status === "sending";
  const isSent = status === "sent";
  const isFailed = status === "failed";
  const sendDisabled = empty || isSending;
  const sendLabel = isSending ? "Sending" : (isFailed ? "Try again" : "Send");

  return createPortal(
    <div className="pfb-root">
      {!open && (
        <button
          ref={affRef}
          type="button"
          className="pfb-aff"
          onClick={openPanel}
          aria-label="Send feedback"
        >
          <span className="pfb-aff__icon" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
          Feedback
        </button>
      )}

      {open && (
        <div className="pfb-panelwrap">
          <div
            ref={panelRef}
            className="pfb-panel"
            role="dialog"
            aria-label="Send feedback"
          >
            {isSent ? (
              <div className="pfb-sent">
                <span className="pfb-sent__mark" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="pfb-sent__title">Sent</div>
                <div className="pfb-sent__sub">This goes straight to the founder. A human reads every one.</div>
              </div>
            ) : (
              <div className="pfb-compose">
                <div className="pfb-compose__head">
                  <div>
                    <div className="pfb-compose__title">Send feedback</div>
                    <div className="pfb-compose__sub">Goes straight to the founder. A human reads every one.</div>
                  </div>
                  <button type="button" className="pfb-x" onClick={closePanel} aria-label="Close">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {reopened && (
                  <div className="pfb-kept">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                    </svg>
                    Draft kept
                  </div>
                )}

                <textarea
                  ref={taRef}
                  className="pfb-ta"
                  value={text}
                  onChange={onInput}
                  placeholder={PLACEHOLDER}
                  rows={4}
                />

                {isFailed && (
                  <div className="pfb-err" role="alert">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Could not send. Your words are safe here, try again.</span>
                  </div>
                )}

                <div className="pfb-actions">
                  <button
                    type="button"
                    className={`pfb-send${sendDisabled ? " pfb-send--disabled" : ""}`}
                    onClick={send}
                    disabled={sendDisabled}
                  >
                    {isSending && (
                      <svg className="pfb-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                    {sendLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
