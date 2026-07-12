// =============================================================
// RejectModal — the ONE reject/pass dialog for the HR portal.
//
// Shipped with the evaluation redesign (review mode), extracted so the
// Candidates tab's per job staging reuses it exactly: a required reason
// code, an honest note (no notification promises the product cannot keep),
// and a bottom sheet on phones. Callers name the blast radius themselves
// via title/lede/confirmLabel ("Pass on Ayesha Noor for Cashier",
// "This only changes Cashier…").
// =============================================================
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REJECT_REASONS } from "../../lib/hr/rejectReasons";
import "./rejectModal.css";

const EASE = [0.4, 0, 0.2, 1];

const XIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const ClockIc = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export default function RejectModal({
  open,
  title,
  lede = "Pick a reason. It sharpens future AI matching and talent pool search.",
  note = "The candidate is not notified right away, and you can undo this decision. Rejected candidates stay in the Rejected bucket and are never deleted.",
  confirmLabel = "Reject candidate",
  reason,
  onPick,
  onCancel,
  onConfirm,
  mobile,
  reduce,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="rjm-scrim"
          className="rjm-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            className={`rjm-modal${mobile ? " rjm-modal--sheet" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 32 : 14, scale: mobile ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 24 : 8, scale: mobile ? 1 : 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="rjm-modal__head">
              <span className="rjm-modal__title">{title}</span>
              <button type="button" className="rjm-modal__close" onClick={onCancel} aria-label="Close"><XIc /></button>
            </div>
            <p className="rjm-modal__lede">{lede}</p>
            <div className="rjm-modal__reasons" role="radiogroup" aria-label="Reason">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.code}
                  className={`rjm-reason${reason === r.code ? " rjm-reason--active" : ""}`}
                  onClick={() => onPick(r.code)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="rjm-modal__note">
              <span aria-hidden="true"><ClockIc /></span>
              <span>{note}</span>
            </div>
            <div className="rjm-modal__acts">
              <button type="button" className="rjm-btn" onClick={onCancel}>Cancel</button>
              <button type="button" className="rjm-btn rjm-btn--danger" disabled={!reason} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
