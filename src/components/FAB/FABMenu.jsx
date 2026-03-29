import { useLayoutEffect, useState } from "react";
import "./FAB.css";

function MenuIcon({ kind, stroke }) {
  const sw = 1.5;
  if (kind === "info") {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} />
        <path d="M12 10v8M12 7h.01" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "eye") {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={stroke} strokeWidth={sw} />
        <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  }
  if (kind === "arrow") {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12h14M12 5l7 7-7 7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  /* spark */
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FABMenu({ open, onClose, options, anchorRef, onSelect }) {
  const [pos, setPos] = useState({ right: 16, bottom: 96 });

  useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef?.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - r.right);
    const bottom = Math.max(8, window.innerHeight - r.top + 12);
    setPos({ right, bottom });
  }, [open, anchorRef]);

  if (!open) return null;

  return (
    <>
      <div className="cvp-fab-layer cvp-fab-menu-overlay" role="presentation" onClick={onClose} />
      <div
        className="cvp-fab-layer cvp-fab-menu-root"
        style={{ right: pos.right, bottom: pos.bottom }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "flex-end", gap: 14, pointerEvents: "auto" }}>
          {options.map((opt, idx) => {
            const primary = !!opt.primary;
            const stroke = primary ? "#000" : "#fff";
            const popClass = idx === 0 ? "cvp-fab-menu-popin-1" : "cvp-fab-menu-popin-2";
            return (
              <div key={opt.id} className={`cvp-fab-menu-row ${popClass}`}>
                <div className="cvp-fab-menu-hit">
                  <button
                    type="button"
                    className={`cvp-fab-menu-icon-btn${primary ? " cvp-fab-menu-icon-btn--primary" : ""}`}
                    aria-label={opt.label}
                    onClick={() => {
                      onSelect(opt.id);
                      onClose();
                    }}
                  >
                    <MenuIcon kind={opt.icon} stroke={stroke} />
                  </button>
                </div>
                <span className="cvp-fab-menu-label">{opt.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
