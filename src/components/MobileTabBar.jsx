import React from "react";

/**
 * Icon color palette matches the desktop sidebar in src/pages/DashboardPage.jsx
 * (navItems iconColor values). Keep these two in sync when adding tabs.
 */
const COLOR = {
  mycvs: "#FFFFFF",
  ats: "#1D9E75",
  coverletter: "#D97706",
  walkin: "#D85A30",
  account: "#FFFFFF",
};

function TabIconDoc({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}
function TabIconTarget({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TabIconBolt({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function TabIconUser({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function TabIconCoverLetter({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    { id: "/dashboard", label: "My CVs", Icon: TabIconDoc, color: COLOR.mycvs },
    { id: "/ats", label: "ATS", Icon: TabIconTarget, color: COLOR.ats },
    { id: "/cover-letter", label: "Cover Letter", Icon: TabIconCoverLetter, color: COLOR.coverletter },
    { id: "/walk-in", label: "Walk-In", Icon: TabIconBolt, color: COLOR.walkin },
    { id: "/dashboard", label: "Account", Icon: TabIconUser, color: COLOR.account, account: true },
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
        const labelColor = active ? "#FFFFFF" : "#A0A0A0";
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
              color: labelColor,
              display: "grid",
              justifyItems: "center",
              gap: 4,
              cursor: "pointer",
              padding: "4px 2px",
              minHeight: 52,
              alignContent: "center",
              opacity: active ? 1 : 0.7,
              transition: "opacity 180ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <t.Icon color={t.color} />
            <span style={{ fontSize: 10, fontWeight: 600, color: labelColor, lineHeight: 1.15, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
export default MobileTabBar;
