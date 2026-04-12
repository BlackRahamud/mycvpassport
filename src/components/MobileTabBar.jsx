import React from "react";

function TabIconDoc({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}
function TabIconTarget({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TabIconBolt({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function TabIconUser({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function TabIconCoverLetter({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
      <path d="M8 13h4" />
      <path d="M8 17h8" />
    </svg>
  );
}
function MobileTabBar({ currentPath, onNavigate, user, fabGuideTab }) {
  if (!user) return null;
  const clean = currentPath.replace(/\/$/, "") || "/";
  const show = ["/dashboard", "/ats", "/cover-letter", "/walk-in", "/builder"].includes(clean);
  if (!show) return null;
  const tabs = [
    { id: "/dashboard", label: "My CVs", Icon: TabIconDoc },
    { id: "/ats", label: "ATS", Icon: TabIconTarget },
    { id: "/cover-letter", label: "Cover Letter", Icon: TabIconCoverLetter },
    { id: "/walk-in", label: "Walk-In", Icon: TabIconBolt },
    { id: "/dashboard", label: "Account", Icon: TabIconUser, account: true },
  ];
  return (
    <div
      className="cvp-mobile-tabbar"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 64,
        background: "#0A0A0A",
        borderTop: "1px solid #1E1E1E",
        display: "none",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        alignItems: "stretch",
        padding: "6px 4px",
        paddingBottom: "calc(env(safe-area-inset-bottom, 12px) + 6px)",
        zIndex: 60,
        maxWidth: "100vw",
        boxSizing: "border-box",
      }}
    >
      {tabs.map((t, idx) => {
        const active = t.account
          ? clean === "/dashboard" && fabGuideTab === "account"
          : t.label === "My CVs"
            ? (clean === "/dashboard" || clean === "/builder") && fabGuideTab !== "account"
            : clean === t.id;
        return (
          <button
            key={`${t.label}-${idx}`}
            type="button"
            onClick={() => {
              if (t.account) onNavigate("/dashboard", { state: { fabGuideTab: "account" } });
              else if (t.label === "My CVs") onNavigate("/dashboard", { state: {} });
              else onNavigate(t.id);
            }}
            className="cvp-mobile-tabbar-btn"
            style={{
              background: "transparent",
              border: "none",
              color: active ? "#FFFFFF" : "#555",
              display: "grid",
              justifyItems: "center",
              gap: 4,
              cursor: "pointer",
              padding: "4px 2px",
              minHeight: 52,
              alignContent: "center",
            }}
          >
            <t.Icon active={active} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#FFFFFF" : "#555", lineHeight: 1.15, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
export default MobileTabBar;
