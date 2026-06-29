import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAnchoredPosition } from "./useAnchoredPosition";
import "./select.css";

/**
 * Select — one reusable, premium dropdown for the whole HR portal.
 *
 * Replaces native <select> (unstylable open menu, OS-blue row) with a custom
 * listbox: rounded menu, soft shadow, smooth open/close, hover + selected
 * states, a check on the selected option, brand-purple accents, themed to our
 * --pj-* tokens (light + dark).
 *
 * Accessible: button[aria-haspopup=listbox] keeps focus; arrow keys move the
 * active option (aria-activedescendant), Enter/Space selects, Esc + Tab +
 * outside-click close. Fully tabbable.
 *
 * Props:
 *   value      currently selected value (matched by ===, stringified)
 *   onChange   (value) => void
 *   options    [{ value, label, disabled? }]
 *   placeholder shown when no option matches value
 *   ariaLabel  accessible name (use when there's no visible <label>)
 *   id         id for the trigger (so an external <label htmlFor> works)
 *   disabled   disables the whole control
 *   variant    "field" (default, full-width) | "pill" (compact inline)
 *   size       "md" (default) | "sm"
 *   theme      "light" (default) | "dark"
 *   menuAlign  "left" (default) | "right"
 */
const CaretIcon = () => (
  <svg className="ui-select__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const CheckIcon = () => (
  <svg className="ui-select__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function nextEnabled(options, from, dir) {
  const n = options.length;
  let i = from;
  for (let step = 0; step < n; step += 1) {
    i = (i + dir + n) % n;
    if (!options[i]?.disabled) return i;
  }
  return from;
}

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  ariaLabel,
  id,
  disabled = false,
  variant = "field",
  size = "md",
  theme = "light",
  menuAlign = "left",
  className = "",
}) {
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Position the menu via Floating UI in a portal to <body> (flip/shift/size)
  // so no ancestor overflow or card boundary can clip it.
  const { referenceRef, floatingRef, floatingStyle } = useAnchoredPosition({
    open,
    placement: menuAlign === "right" ? "bottom-end" : "bottom-start",
    gap: 6,
    padding: 8,
    matchWidth: variant === "field",
    maxHeight: 280,
  });

  const selectedIdx = options.findIndex((o) => String(o.value) === String(value));
  const selected = selectedIdx >= 0 ? options[selectedIdx] : null;

  // Close on outside click — the menu lives in a portal, so check BOTH the
  // trigger and the floating menu before treating a click as "outside".
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (floatingRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, floatingRef]);

  // On open, point the active option at the current selection.
  useEffect(() => {
    if (open) setActiveIdx(selectedIdx >= 0 ? selectedIdx : nextEnabled(options, -1, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    floatingRef.current?.querySelector(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx, floatingRef]);

  const commit = (idx) => {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange?.(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape": e.preventDefault(); setOpen(false); break;
      case "Tab": setOpen(false); break;
      case "ArrowDown": e.preventDefault(); setActiveIdx((i) => nextEnabled(options, i, 1)); break;
      case "ArrowUp": e.preventDefault(); setActiveIdx((i) => nextEnabled(options, i, -1)); break;
      case "Home": e.preventDefault(); setActiveIdx(nextEnabled(options, -1, 1)); break;
      case "End": e.preventDefault(); setActiveIdx(nextEnabled(options, options.length, -1)); break;
      case "Enter":
      case " ": e.preventDefault(); commit(activeIdx); break;
      default: break;
    }
  };

  return (
    <div
      ref={rootRef}
      className={`ui-select ui-select--${variant} ui-select--${size} ui-select--${theme}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        ref={referenceRef}
        type="button"
        id={id}
        className={`ui-select__trigger${open ? " is-open" : ""}${selected ? "" : " is-placeholder"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-activedescendant={open && activeIdx >= 0 ? `${baseId}-opt-${activeIdx}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="ui-select__value">{selected ? selected.label : placeholder}</span>
        <CaretIcon />
      </button>

      {/* Portaled to <body> so no ancestor overflow/card bound can clip it.
          The carrier div re-scopes the --uis-* design tokens (display:contents
          → no layout box) so the menu keeps its exact colors. */}
      {createPortal(
        <div className={`ui-select ui-select--${variant} ui-select--${size} ui-select--${theme}`} style={{ display: "contents" }}>
          <AnimatePresence>
            {open && (
              <motion.ul
                ref={floatingRef}
                id={`${baseId}-list`}
                role="listbox"
                tabIndex={-1}
                style={floatingStyle}
                className="ui-select__menu"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.985 }}
                transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              >
                {options.map((o, idx) => (
                  <li
                    key={String(o.value)}
                    id={`${baseId}-opt-${idx}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={String(o.value) === String(value)}
                    aria-disabled={o.disabled || undefined}
                    className={`ui-select__option${idx === activeIdx ? " is-active" : ""}${String(o.value) === String(value) ? " is-selected" : ""}${o.disabled ? " is-disabled" : ""}`}
                    onMouseEnter={() => !o.disabled && setActiveIdx(idx)}
                    onClick={() => commit(idx)}
                  >
                    <span className="ui-select__option-label">{o.label}</span>
                    {String(o.value) === String(value) && <CheckIcon />}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  );
}
