// =============================================================
// StageAdvanceMenu
//
// Consolidated stage control for the candidate detail header. A split
// button: the main segment advances to the next stage (reuses the
// pipeline's existing onAdvance), and the trailing chevron opens an
// anchored menu to jump straight to any stage (reuses the existing
// onStatusChange — the same handler the deleted Status Override box used).
//
// The menu is portaled to document.body and positioned with the shared
// useAnchoredPosition primitive, so it never clips against the detail
// panel's bounds. Dismisses on Esc and click-outside.
// =============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAnchoredPosition } from "../ui/useAnchoredPosition";

const EASE = [0.2, 0.9, 0.3, 1];

function ChevronDownIc() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>;
}
function CheckIc() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;
}

export default function StageAdvanceMenu({ stageDef, currentStatus, options, advancing, onAdvance, onJump }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { referenceRef, floatingRef, floatingStyle } = useAnchoredPosition({ open, placement: "bottom-end", gap: 6 });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e) => {
      if (referenceRef.current?.contains(e.target)) return;
      if (floatingRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, referenceRef, floatingRef]);

  const canAdvance = Boolean(stageDef?.actionLabel) && !advancing;
  const mainLabel = stageDef?.actionLabel || "Hired";

  const choose = (v) => {
    setOpen(false);
    if (onJump) onJump(v);
  };

  return (
    <div className="jpp-split" ref={referenceRef}>
      <button
        type="button"
        className="jpp-split__main"
        disabled={!canAdvance}
        aria-disabled={!canAdvance}
        onClick={() => { if (canAdvance && onAdvance) onAdvance(); }}
      >
        {mainLabel}
      </button>
      <button
        type="button"
        className="jpp-split__chev"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Move to a specific stage"
        disabled={advancing}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDownIc />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              ref={floatingRef}
              role="menu"
              className="jpp-stage-menu"
              style={floatingStyle}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: EASE }}
            >
              <li className="jpp-stage-menu__head" role="presentation">Move to stage</li>
              {options.map((o) => {
                const current = (currentStatus || "new") === o.value;
                return (
                  <li key={o.value} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      aria-current={current ? "true" : undefined}
                      className={`jpp-stage-menu__item${current ? " jpp-stage-menu__item--current" : ""}`}
                      onClick={() => choose(o.value)}
                    >
                      <span>{o.label}</span>
                      {current && <CheckIc />}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
