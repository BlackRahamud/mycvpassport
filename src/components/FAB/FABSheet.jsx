import "./FAB.css";
import { writeFabSeen } from "./FABLogic";

export function FabSparkIcon({ size = 24, stroke = "#fff" }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", margin: "0 auto" }}>
      <path
        d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PointIcon({ type }) {
  const inner = (() => {
    switch (type) {
      case "edit":
        return <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#fff" strokeWidth="1.2" fill="none" />;
      case "menu":
        return (
          <>
            <circle cx="5" cy="12" r="1" fill="#fff" />
            <circle cx="12" cy="12" r="1" fill="#fff" />
            <circle cx="19" cy="12" r="1" fill="#fff" />
          </>
        );
      case "bolt":
        return <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinejoin="round" />;
      case "plus":
        return (
          <>
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
          </>
        );
      case "filter":
        return <path d="M4 6h16M7 12h10M10 18h4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />;
      case "target":
        return (
          <>
            <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="1.2" fill="none" />
            <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.2" fill="none" />
          </>
        );
      case "paste":
        return <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v0z" stroke="#fff" strokeWidth="1" fill="none" />;
      case "letter":
        return (
          <>
            <path d="M4 4h16v16H4z" stroke="#fff" strokeWidth="1" fill="none" />
            <path d="M4 8l8 5 8-5" stroke="#fff" strokeWidth="1" fill="none" />
          </>
        );
      case "user":
        return (
          <>
            <path d="M20 21a8 8 0 0 0-16 0" stroke="#fff" strokeWidth="1.2" fill="none" />
            <circle cx="12" cy="7" r="4" stroke="#fff" strokeWidth="1.2" fill="none" />
          </>
        );
      default:
        return <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.2" fill="none" />;
    }
  })();
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#1C1C1C",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" aria-hidden>
        {inner}
      </svg>
    </div>
  );
}

/**
 * Bottom sheet: overlay + panel (slide-up via keyframes only)
 */
export default function FABSheet({
  open,
  onClose,
  title,
  points,
  tabStorageKey,
  onGotIt,
  proCtaLabel,
  onProCta,
  zOverlay = 200,
  zSheet = 201,
}) {
  if (!open) return null;

  const handleGotIt = () => {
    if (tabStorageKey) writeFabSeen(tabStorageKey);
    onGotIt?.();
    onClose();
  };

  const handlePro = () => {
    if (tabStorageKey === "ats") writeFabSeen("ats");
    onProCta?.();
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        className="cvp-fab-layer cvp-fab-sheet-overlay"
        style={{ zIndex: zOverlay }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="cvp-fab-layer cvp-fab-sheet-panel"
        style={{ zIndex: zSheet }}
        onClick={(e) => e.stopPropagation()}
      >
        <FabSparkIcon size={24} stroke="#fff" />
        <div
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            marginTop: 12,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {title}
        </div>
        <div>
          {points.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 10,
                alignItems: "flex-start",
              }}
            >
              <PointIcon type={row.icon} />
              <span style={{ color: "#aaa", fontSize: 13, lineHeight: 1.45, flex: 1 }}>{row.text}</span>
            </div>
          ))}
        </div>
        {proCtaLabel && onProCta ? (
          <button
            type="button"
            onClick={handlePro}
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: 10,
              padding: 12,
              width: "100%",
              fontWeight: 500,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              marginTop: 8,
              minHeight: 44,
            }}
          >
            {proCtaLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleGotIt}
          style={{
            background: "#fff",
            color: "#000",
            borderRadius: 10,
            padding: 12,
            width: "100%",
            fontWeight: 500,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            marginTop: proCtaLabel ? 10 : 16,
            minHeight: 44,
          }}
        >
          Got it
        </button>
      </div>
    </>
  );
}
