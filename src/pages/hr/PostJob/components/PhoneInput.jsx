import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAnchoredPosition } from "../../../../components/ui/useAnchoredPosition";

const COUNTRIES = [
  { code: "+971", label: "🇦🇪 UAE",          short: "AE" },
  { code: "+91",  label: "🇮🇳 India",        short: "IN" },
  { code: "+966", label: "🇸🇦 Saudi Arabia", short: "SA" },
  { code: "+974", label: "🇶🇦 Qatar",        short: "QA" },
  { code: "+965", label: "🇰🇼 Kuwait",       short: "KW" },
  { code: "+968", label: "🇴🇲 Oman",         short: "OM" },
  { code: "+973", label: "🇧🇭 Bahrain",      short: "BH" },
];

const Caret = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function PhoneInput({ countryCode = "+971", number = "", onChange, placeholder = "50 123 4567" }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  // Portal + Floating UI so the country menu can't be clipped by the card.
  const { referenceRef, floatingRef, floatingStyle } = useAnchoredPosition({
    open, placement: "bottom-start", gap: 6, padding: 8,
  });

  const selected = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  const setCode = (code) => {
    onChange?.({ countryCode: code, number });
    setOpen(false);
  };
  const setNumber = (e) => onChange?.({ countryCode, number: e.target.value });

  // Close on outside click (the menu is portaled — check both refs).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (referenceRef.current?.contains(e.target)) return;
      if (floatingRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, referenceRef, floatingRef]);

  return (
    <div className="pj-phone">
      <button
        ref={referenceRef}
        type="button"
        className="pj-phone__country"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="pj-phone__country-code">{selected.code}</span>
        <Caret />
      </button>
      <input
        type="tel"
        className="pj-phone__number"
        value={number}
        onChange={setNumber}
        placeholder={placeholder}
        autoComplete="tel-national"
      />
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              ref={floatingRef}
              role="listbox"
              className="pj-phone__menu"
              style={floatingStyle}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              {COUNTRIES.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    className={`pj-phone__menu-item${c.code === selected.code ? " pj-phone__menu-item--active" : ""}`}
                    onClick={() => setCode(c.code)}
                  >
                    <span className="pj-phone__menu-flag">{c.label}</span>
                    <span className="pj-phone__menu-code">{c.code}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
