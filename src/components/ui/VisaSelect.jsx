// =============================================================
// src/components/ui/VisaSelect.jsx
//
// The visa status picker for the candidate apply flow.
//   - Desktop: a custom glass listbox (a menu floating above the page is
//     the purest floating surface in the product, so glass is correct
//     here). Full keyboard support: arrows, Home, End, Enter, Space,
//     Escape, type ahead; role=listbox/option, aria-expanded; focus is
//     returned to the trigger on close; click outside and Escape close.
//   - Mobile: a native <select>, which hands the candidate the OS wheel
//     picker they already know, one thumb, never mispositioned against
//     the keyboard.
//
// It sits above the layer stack (z 4400) so it is never trapped under a
// scrim. Colours come from the --pj-* and --surface-glass-* tokens.
// =============================================================

import { useEffect, useRef, useState } from "react";
import { VISA_OPTIONS } from "../../lib/jobs/jobFormat";
import "./visaSelect.css";

export default function VisaSelect({ value, onChange, isMobile = false, options = VISA_OPTIONS, size = "md" }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(Math.max(0, options.indexOf(value)));
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Native select on mobile — the OS picker beats anything custom here.
  if (isMobile) {
    return (
      <select
        className={`vs-native vs-native--${size}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {!value && <option value="" disabled>Select your visa status</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  const commit = (v) => {
    onChange(v);
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
  };

  const onKey = (e) => {
    const n = options.length;
    const k = e.key;
    if (k === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
      return;
    }
    if (!open) {
      if (k === "Enter" || k === " " || k === "ArrowDown" || k === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(Math.max(0, options.indexOf(value)));
        setOpen(true);
      }
      return;
    }
    if (k === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % n); }
    else if (k === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + n) % n); }
    else if (k === "Home") { e.preventDefault(); setActiveIdx(0); }
    else if (k === "End") { e.preventDefault(); setActiveIdx(n - 1); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); commit(options[activeIdx]); }
    else if (k.length === 1) {
      const idx = options.findIndex((o) => o.toLowerCase().startsWith(k.toLowerCase()));
      if (idx >= 0) setActiveIdx(idx);
    }
  };

  return (
    <div className="vs-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`vs-trigger vs-trigger--${size}${open ? " vs-trigger--open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActiveIdx(Math.max(0, options.indexOf(value)));
          setOpen((v) => !v);
        }}
        onKeyDown={onKey}
      >
        <span className={value ? "vs-value" : "vs-value vs-value--placeholder"}>
          {value || "Select your visa status"}
        </span>
        <svg className="vs-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 8l8 8 8-8" />
        </svg>
      </button>
      {open && (
        <ul className="vs-menu" role="listbox" tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              className={`vs-opt${i === activeIdx ? " vs-opt--active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => commit(o)}
            >
              <span>{o}</span>
              {o === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
