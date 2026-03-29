import { useState, useEffect } from "react";

export function readFabSeen(tabKey) {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(`fab_seen_${tabKey}`) === "true";
  } catch {
    return true;
  }
}

export function writeFabSeen(tabKey) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(`fab_seen_${tabKey}`, "true");
  } catch {
    /* ignore */
  }
}

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

/** Bottom sheet: overlay z 200, sheet z 201 — callers can raise if needed */
export function FabGuideBottomSheet({
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
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: zOverlay,
        }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: zSheet,
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px 32px",
          boxSizing: "border-box",
          maxWidth: "100vw",
          transform: "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
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

export const BUILDER_FAB_GUIDES = {
  content: {
    title: "Building your content",
    points: [
      { icon: "edit", text: "Tap Edit on any section to expand and fill it" },
      { icon: "edit", text: "Your CV updates live as you type" },
      { icon: "plus", text: "Add sections using the + button at the bottom" },
    ],
  },
  templates: {
    title: "Choosing a template",
    points: [
      { icon: "filter", text: "Browse by category using the filter pills" },
      { icon: "edit", text: "Free templates apply instantly" },
      { icon: "target", text: "Pro templates unlock with an upgrade" },
    ],
  },
  ats: {
    title: "Your ATS score",
    points: [
      { icon: "target", text: "ATS systems scan your CV before humans see it" },
      { icon: "edit", text: "Fix red items first for the biggest score jump" },
      { icon: "filter", text: "Pro scan checks 40+ signals vs our free 12" },
    ],
  },
  jobmatch: {
    title: "Job Match",
    points: [
      { icon: "paste", text: "Paste a job description in the field below" },
      { icon: "target", text: "We match it against your CV instantly" },
      { icon: "edit", text: "Shows your gaps and strengths for that role" },
    ],
  },
};

export const ATS_HIGH_SCORE_GUIDE = {
  title: "Your score looks good — but are you 100% sure?",
  points: [
    { icon: "target", text: "Free scan checks 12 signals" },
    { icon: "filter", text: "Pro scan checks 40+ recruiter signals" },
    { icon: "edit", text: "ATS systems vary across every company" },
  ],
};

export const ROUTE_FAB_GUIDES = {
  mycvs: {
    title: "Managing your CVs",
    points: [
      { icon: "edit", text: "Tap any CV card to open and edit it" },
      { icon: "menu", text: "Use ⋯ menu for rename, duplicate, delete" },
      { icon: "bolt", text: "Walk-In mode builds a CV in 90 seconds" },
    ],
  },
  account: {
    title: "Your account",
    points: [
      { icon: "user", text: "Manage your plan and billing here" },
      { icon: "edit", text: "View your download history" },
      { icon: "target", text: "Upgrade to Pro for unlimited templates" },
    ],
  },
  ats: {
    title: "Your ATS score",
    points: [
      { icon: "target", text: "ATS systems scan your CV before humans see it" },
      { icon: "edit", text: "Fix red items first for the biggest score jump" },
      { icon: "filter", text: "Pro scan checks 40+ signals vs our free 12" },
    ],
  },
  "cover-letter": {
    title: "Cover Letter",
    points: [
      { icon: "letter", text: "We write it based on your CV + job details" },
      { icon: "edit", text: "Fill the fields and generate in seconds" },
      { icon: "edit", text: "Edit the output before downloading" },
    ],
  },
  walkin: {
    title: "Walk-In Mode",
    points: [
      { icon: "bolt", text: "Fill 3 fields — CV generated in 90 seconds" },
      { icon: "user", text: "No account needed" },
      { icon: "target", text: "Perfect for same-day walk-in interviews" },
    ],
  },
};

export function MobileScrollFab({
  tabKey,
  showDot = false,
  sheetZOverlay = 200,
  sheetZSheet = 201,
  fabAnimStyle = null,
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const guide = ROUTE_FAB_GUIDES[tabKey];
  const seen = readFabSeen(tabKey);
  const dot = showDot || !seen;

  const onClose = () => setOpen(false);

  if (!mobile || !guide) return null;

  return (
    <>
      <style>{`
        @keyframes cvpRouteFabSpin { to { transform: rotate(360deg); } }
      `}</style>
      <div
        style={{
          position: "sticky",
          bottom: 80,
          zIndex: 55,
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px 12px 0",
          pointerEvents: "none",
        }}
      >
        <button
          type="button"
          aria-label="Guide"
          onClick={() => setOpen(true)}
          style={{
            pointerEvents: "auto",
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            borderRadius: "50%",
            background: "#0A0A0A",
            border: "1.5px solid #333",
            padding: 0,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            boxSizing: "border-box",
            ...fabAnimStyle,
          }}
        >
          <span style={{ position: "relative", width: 28, height: 28, display: "grid", placeItems: "center" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden style={{ display: "block" }}>
              <rect x="6" y="4" width="14" height="18" rx="3" fill="none" stroke="#444" strokeWidth="1" />
              <rect
                x="6"
                y="4"
                width="14"
                height="18"
                rx="3"
                fill="none"
                stroke="#fff"
                strokeWidth="1"
                strokeDasharray="11 45"
                strokeLinecap="round"
                style={{ transformOrigin: "14px 13px", animation: "cvpRouteFabSpin 3s linear infinite" }}
              />
              <line x1="8" y1="10" x2="20" y2="10" stroke="#fff" strokeWidth="1" />
              <line x1="8" y1="13" x2="16" y2="13" stroke="#444" strokeWidth="1" />
              <line x1="8" y1="16" x2="15" y2="16" stroke="#444" strokeWidth="1" />
              <circle cx="20" cy="20" r="5" fill="#fff" />
              <path d="M17.5 20 L19.5 22 L23 18" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {dot ? (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  background: "#E24B4A",
                  borderRadius: "50%",
                  border: "2px solid #0A0A0A",
                  boxSizing: "border-box",
                }}
              />
            ) : null}
          </span>
        </button>
      </div>
      <FabGuideBottomSheet
        open={open}
        onClose={onClose}
        title={guide.title}
        points={guide.points}
        tabStorageKey={tabKey}
        zOverlay={sheetZOverlay}
        zSheet={sheetZSheet}
      />
    </>
  );
}
