// =============================================================
// ShareForReviewModal
//
// Recruiter action in the candidate detail view. Mints a secure,
// expiring, read-only share link for an application (the shareable unit)
// and copies the public URL to the clipboard.
//
// Phase A: write the candidate_shares row (RLS scopes it to the creating
// recruiter) and hand back the public_token URL. Revoke UI, teammate
// teaser, and the feedback path are Phase B.
// =============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import Select from "../ui/Select";

const EXPIRY_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
];

const PUBLIC_BASE = "https://mycvpassport.com/shared/candidate/";

function LockIc() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function CheckIc() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;
}
function CloseIc() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

export default function ShareForReviewModal({ open, onClose, applicationId, candidateName, hrId }) {
  const reduce = useReducedMotion();
  const [hideContact, setHideContact] = useState(true);
  const [expiryDays, setExpiryDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { url, copied }

  // Reset to defaults each time the modal opens.
  useEffect(() => {
    if (open) {
      setHideContact(true);
      setExpiryDays("7");
      setBusy(false);
      setError(null);
      setResult(null);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const generate = async () => {
    if (busy) return;
    setError(null);
    if (!applicationId || !hrId) {
      setError("Could not start the share. Please reopen this candidate and try again.");
      return;
    }
    setBusy(true);
    try {
      const days = parseInt(expiryDays, 10) || 7;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error: insErr } = await supabase
        .from("candidate_shares")
        .insert({
          application_id: applicationId,
          created_by: hrId,
          hide_contact_info: hideContact,
          expires_at: expiresAt,
        })
        .select("public_token")
        .single();
      if (insErr || !data?.public_token) {
        throw new Error(insErr?.message || "Could not create the link.");
      }
      const url = `${PUBLIC_BASE}${data.public_token}`;
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = false;
      }
      setResult({ url, copied });
    } catch (e) {
      setError(e?.message || "Could not create the link. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyAgain = async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setResult((r) => ({ ...r, copied: true }));
    } catch {
      // clipboard blocked - the field is selectable as a fallback
    }
  };

  if (!open) return null;

  const label = { fontSize: 13, fontWeight: 600, color: "var(--pj-text)", fontFamily: "var(--pj-font)" };
  const sub = { fontSize: 12.5, color: "var(--pj-muted)", fontFamily: "var(--pj-font)", lineHeight: 1.5 };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        style={{
          // Below the 4000 portal-dropdown layer so the expiry Select options
          // (anchored + portaled to body) sit above this modal card.
          position: "fixed", inset: 0, zIndex: 1200,
          background: "rgba(20, 19, 31, 0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
        role="dialog" aria-modal="true" aria-labelledby="sfr-title"
      >
        <motion.div
          key="panel"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width: "100%", maxWidth: 460,
            background: "var(--pj-surface)", color: "var(--pj-text)",
            border: "1px solid var(--pj-border)", borderRadius: "var(--pj-radius-lg)",
            boxShadow: "var(--pj-shadow-card)", fontFamily: "var(--pj-font)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--pj-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "var(--pj-primary-soft)", color: "var(--pj-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><LockIc /></span>
              <div style={{ minWidth: 0 }}>
                <h3 id="sfr-title" style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: "var(--pj-text)" }}>Share for review</h3>
                <p style={{ margin: "1px 0 0", ...sub }}>{candidateName ? `Secure, read-only link for ${candidateName}.` : "Secure, read-only link."}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: "1px solid var(--pj-border)", background: "#fff", color: "var(--pj-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CloseIc />
            </button>
          </div>

          {/* Body */}
          {!result ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Hide contact toggle */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={label}>Hide contact details</div>
                  <div style={{ ...sub, marginTop: 2 }}>Hides contact fields on this page. The CV document is shown as provided.</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hideContact}
                  onClick={() => setHideContact((v) => !v)}
                  style={{
                    flexShrink: 0, width: 44, height: 26, borderRadius: 999, border: "none", cursor: "pointer", padding: 3,
                    background: hideContact ? "var(--pj-primary)" : "var(--pj-border-strong)",
                    transition: "background-color .18s var(--pj-ease)",
                    display: "flex", alignItems: "center",
                    justifyContent: hideContact ? "flex-end" : "flex-start",
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                </button>
              </div>

              {/* Expiry */}
              <div>
                <div style={{ ...label, marginBottom: 7 }}>Link expires in</div>
                <Select
                  value={expiryDays}
                  onChange={setExpiryDays}
                  options={EXPIRY_OPTIONS}
                  ariaLabel="Link expiry"
                  theme="light"
                />
              </div>

              {error && (
                <div style={{ fontSize: 12.5, color: "var(--pj-danger)", lineHeight: 1.5 }}>{error}</div>
              )}

              <button
                type="button"
                onClick={generate}
                disabled={busy}
                style={{
                  width: "100%", marginTop: 2, cursor: busy ? "default" : "pointer",
                  background: "var(--pj-primary)", color: "#fff", border: "none",
                  borderRadius: "var(--pj-radius-md)", padding: "12px 18px",
                  fontSize: 14, fontWeight: 600, opacity: busy ? 0.7 : 1,
                  transition: "background-color .15s var(--pj-ease)",
                }}
                onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = "var(--pj-primary-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--pj-primary)"; }}
              >
                {busy ? "Generating…" : "Generate secure link"}
              </button>
            </div>
          ) : (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "rgba(5,150,105,0.12)", color: "var(--pj-success)", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckIc /></span>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pj-text)" }}>
                  {result.copied ? "Link copied to clipboard" : "Secure link ready"}
                </div>
              </div>
              <p style={{ ...sub, margin: 0 }}>Anyone with this link can review the candidate until it expires. No account needed.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  readOnly
                  value={result.url}
                  onFocus={(e) => e.target.select()}
                  style={{
                    flex: 1, minWidth: 0, padding: "10px 12px", fontSize: 12.5,
                    color: "var(--pj-text)", background: "var(--pj-input-bg)",
                    border: "1px solid var(--pj-border)", borderRadius: "var(--pj-radius-md)",
                    fontFamily: "var(--pj-font)",
                  }}
                />
                <button
                  type="button"
                  onClick={copyAgain}
                  style={{ flexShrink: 0, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--pj-text)", border: "none", borderRadius: "var(--pj-radius-md)", cursor: "pointer" }}
                >
                  {result.copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ alignSelf: "flex-end", marginTop: 2, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "var(--pj-text)", background: "#fff", border: "1px solid var(--pj-border)", borderRadius: "var(--pj-radius-md)", cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
