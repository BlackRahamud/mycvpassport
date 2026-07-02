// =============================================================
// TemplateSelect — the builder topbar's template picker.
//
// Replaces the native <select> (generic browser chrome) with a listbox in
// the product's design language: styled trigger showing the current
// template with its accent swatch, a spring-entrance panel (~200ms),
// hover/selected states, full keyboard support (arrows / Home / End /
// Enter / Esc), click-outside to close, scrollable list.
//
// Styled with semantic tokens + dark fallbacks: the builder is a
// dark-pinned island today, and the tokens flip correctly if that pin is
// ever lifted. Reduced motion collapses the spring to a fade.
// =============================================================
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.2, 0.9, 0.3, 1];

const S = {
  wrap: { position: "relative", minWidth: 0 },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    padding: "8px 12px 8px 14px",
    borderRadius: 8,
    border: "1px solid var(--border, #2A2A2A)",
    background: "var(--bg-surface, #141414)",
    color: "var(--text-primary, #FFFFFF)",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    minWidth: 0,
    maxWidth: 240,
    transition: "border-color 160ms cubic-bezier(0.4,0,0.2,1), background-color 160ms cubic-bezier(0.4,0,0.2,1)",
  },
  swatch: (color) => ({
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: color || "var(--accent, #D97706)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)", /* theme-fixed: rim on swatch color */
    flexShrink: 0,
  }),
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
  panel: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    zIndex: 220,
    width: 264,
    maxHeight: 322,
    overflowY: "auto",
    background: "var(--bg-elevated, #1C1C1C)",
    border: "1px solid var(--border, #2A2A2A)",
    borderRadius: 12,
    padding: 6,
    boxShadow: "0 16px 48px -16px rgba(0,0,0,0.55)",
    scrollbarWidth: "thin",
  },
  option: (active, selected) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "9px 10px",
    borderRadius: 8,
    border: 0,
    background: active ? "var(--hover-wash, rgba(255,255,255,0.06))" : "transparent",
    color: selected ? "var(--text-primary, #FFFFFF)" : "var(--text-secondary, #C9C9CE)",
    fontSize: 13,
    fontWeight: selected ? 600 : 500,
    fontFamily: "inherit",
    textAlign: "left",
    cursor: "pointer",
  }),
  meta: { marginLeft: "auto", fontSize: 10.5, color: "var(--text-muted, #7A7A82)", flexShrink: 0 },
  check: { flexShrink: 0, color: "var(--accent, #D97706)" },
};

function CheckIc() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;
}
function ChevIc({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms cubic-bezier(0.4,0,0.2,1)", flexShrink: 0, opacity: 0.7 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function TemplateSelect({ templates, value, onChange }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();

  const selectedIdx = templates.findIndex((t) => t.id === value?.id);

  // Click-outside closes.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option in view while arrowing.
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    listRef.current?.children?.[activeIdx]?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIdx]);

  const openPanel = () => { setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0); setOpen(true); };
  const pick = (idx) => { const t = templates[idx]; if (t) onChange(t); setOpen(false); };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openPanel(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, templates.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === "End") { e.preventDefault(); setActiveIdx(templates.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(activeIdx); }
    else if (e.key === "Tab") { setOpen(false); }
  };

  return (
    <div ref={wrapRef} style={S.wrap} onKeyDown={onKeyDown}>
      <button
        type="button"
        style={S.trigger}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="CV template"
      >
        <span style={S.swatch(value?.accent)} aria-hidden="true" />
        <span style={S.name}>{value?.name || "Choose template"}</span>
        <ChevIc open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="tpl-panel"
            id={listboxId}
            role="listbox"
            aria-label="CV templates"
            aria-activedescendant={activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined}
            ref={listRef}
            style={S.panel}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.985, transition: { duration: 0.14, ease: EASE } }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 480, damping: 32, mass: 0.7, opacity: { duration: 0.16, ease: EASE } }}
          >
            {templates.map((t, i) => (
              <button
                key={t.id}
                id={`${listboxId}-opt-${i}`}
                type="button"
                role="option"
                aria-selected={i === selectedIdx}
                style={S.option(i === activeIdx, i === selectedIdx)}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pick(i)}
              >
                <span style={S.swatch(t.accent)} aria-hidden="true" />
                <span style={S.name}>{t.name}</span>
                {t.tier === "premium" && i !== selectedIdx && <span style={S.meta}>Pro</span>}
                {i === selectedIdx && <span style={{ ...S.check, marginLeft: "auto" }}><CheckIc /></span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
