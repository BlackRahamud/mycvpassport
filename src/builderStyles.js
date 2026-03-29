// Builder / legacy layout tokens (split from App.js)

const C = {
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  border: "#2a2a3a",
  accent: "#FFFFFF",
  gold: "#f59e0b",
  text: "#f0f0ff",
  muted: "#8888aa",
  success: "#10b981",
  danger: "#ef4444",
};

export const CB_UI = {
  btn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#FFFFFF",
    color: "#000000",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    color: "#FFFFFF",
    padding: "10px 12px",
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  },
  card: {
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#2A2A2A",
    color: "#FFFFFF",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 13,
  },
};

export { C };

export const S = {
  app: { minHeight: "100vh", width: "100%", overflowX: "hidden", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: `1px solid ${C.border}`,
    background: "rgba(10,10,15,0.95)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(10px)",
  },
  logo: {
    fontSize: "22px",
    fontWeight: "800",
    cursor: "pointer",
    color: "#FFFFFF",
  },
  btn: (v = "primary", sz = "md") => ({
    padding: sz === "lg" ? "14px 32px" : sz === "sm" ? "8px 16px" : "10px 22px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: sz === "lg" ? "16px" : sz === "sm" ? "13px" : "14px",
    transition: "background-color 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1), border-color 150ms cubic-bezier(0.4,0,0.2,1)",
    background:
      v === "primary"
        ? C.accent
        : v === "gold"
          ? `linear-gradient(135deg,${C.gold},#f97316)`
          : v === "outline"
            ? "transparent"
            : v === "danger"
              ? C.danger
              : v === "success"
                ? C.success
                : C.surface,
    color: v === "primary" ? "#000" : v === "outline" ? C.accent : "#fff",
    border: v === "outline" ? `1px solid ${C.accent}` : "none",
    boxShadow: "none",
  }),
  input: {
    width: "100%",
    padding: "12px 16px",
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: "10px",
    color: C.text,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: "10px",
    color: C.text,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  label: { display: "block", fontSize: "13px", color: C.muted, marginBottom: "6px", fontWeight: "500" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" },
  badge: (type = "free") => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    background: type === "free" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
    color: type === "free" ? C.success : C.gold,
    border: `1px solid ${type === "free" ? C.success : C.gold}`,
  }),
  sectionHeading: {
    fontSize: "13px",
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "1px",
    paddingBottom: "10px",
    borderBottom: `1px solid ${C.border}`,
    marginBottom: "16px",
    marginTop: "8px",
  },
};
