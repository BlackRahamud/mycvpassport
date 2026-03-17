import { useMemo, useState } from "react";

const ease = "cubic-bezier(0.4,0,0.2,1)";

const FalconIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" style={{ display: "block" }}>
    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" />
    <path d="M18 38c6-8 10-12 14-13 4-1 9 0 14 3-4 1-7 3-9 6 3 0 6 1 9 3-4 1-8 2-12 2-4 0-8-1-12-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 42c2 3 4 5 8 6 4-1 6-3 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28 22c1.5-2 3-3 4-3s2.5 1 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPlus = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const IconBolt = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
  </svg>
);

const IconDots = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 12h.01" />
    <path d="M19 12h.01" />
    <path d="M5 12h.01" />
  </svg>
);

const TabIconDoc = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h6" />
  </svg>
);

const TabIconTarget = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
  </svg>
);

const TabIconBolt = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
  </svg>
);

const TabIconUser = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function timeAgo(iso) {
  if (!iso) return "edited —";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `edited ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `edited ${h}h ago`;
  const d = Math.floor(h / 24);
  return `edited ${d}d ago`;
}

export default function Dashboard({
  theme = "dark",
  user = { name: "User", plan: "Free" },
  cvs = [],
  renderThumb = null, // (cv) => ReactNode
  onCreate = () => {},
  onOpen = () => {},
  onRunATS = () => {},
  onWalkIn = () => {},
  onTemplates = () => {},
}) {
  const [active, setActive] = useState("mycvs");

  const isLight = theme === "light";
  const themeClass = isLight ? "cvp-theme-light" : "cvp-theme-dark";

  const initials = useMemo(() => {
    const parts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [user?.name]);

  const navItems = [
    { id: "mycvs", label: "My CVs" },
    { id: "ats", label: "ATS Checker" },
    { id: "walkin", label: "Walk-In Mode" },
    { id: "templates", label: "Templates" },
  ];

  return (
    <div className={themeClass} style={{ height: "100vh", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "'DM Sans', system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", height: "100%" }}>
        {/* Sidebar (desktop only) */}
        <aside
          style={{
            background: "#0A0A0A",
            borderRight: "1px solid #1E1E1E",
            padding: "18px 12px",
            display: "flex",
            flexDirection: "column",
          }}
          className="cvp-dashboard-sidebar"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 14px", color: "var(--text-primary)" }}>
            <FalconIcon />
            <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>CVPassport</span>
          </div>

          <nav style={{ display: "grid", gap: 6, padding: "8px" }}>
            {navItems.map((it) => {
              const isActive = active === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setActive(it.id);
                    if (it.id === "ats") onRunATS();
                    if (it.id === "walkin") onWalkIn();
                    if (it.id === "templates") onTemplates();
                  }}
                  style={{
                    height: 44,
                    border: "none",
                    background: isActive ? "var(--bg-elevated)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    borderRadius: 8,
                    padding: "0 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: `background 150ms ${ease}, color 150ms ${ease}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{it.label}</span>
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto", padding: "12px 8px 6px" }}>
            <div style={{ height: 1, background: "var(--border)", opacity: 1, margin: "8px 0 12px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {initials}
              </div>
              <div style={{ display: "grid", lineHeight: 1.1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "User"}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{user?.plan || "Free Plan"}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ background: "var(--bg-page)", padding: 28, overflow: "auto" }}>
          <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>My CVs</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Need more? Upgrade</div>
          </div>

          {/* Cards grid */}
          <div
            className="cvp-cv-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {/* New CV card */}
            <button
              type="button"
              onClick={onCreate}
              style={{
                border: "1px dashed var(--border)",
                background: "transparent",
                borderRadius: "var(--radius-lg)",
                height: "100%",
                minHeight: 380,
                display: "grid",
                placeItems: "center",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 999, border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--text-primary)" }}>
                  <IconPlus />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>New CV</div>
              </div>
            </button>

            {/* Walk-in card */}
            <button
              type="button"
              onClick={onWalkIn}
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-lg)",
                minHeight: 380,
                padding: 16,
                cursor: "pointer",
                position: "relative",
                transition: `transform 200ms ${ease}, border-color 200ms ${ease}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "#3A3A3A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div style={{ position: "absolute", top: 14, left: 14, fontSize: 11, fontWeight: 700, background: "#fff", color: "#000", padding: "4px 8px", borderRadius: 999 }}>
                Walk-In
              </div>
              <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center", gap: 8 }}>
                <div style={{ width: 46, height: 46, borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", display: "grid", placeItems: "center" }}>
                  <IconBolt />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Walk-In CV</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ready in 60 sec</div>
              </div>
            </button>

            {/* CV cards */}
            {cvs.map((cv) => (
              <button
                key={cv.id}
                type="button"
                onClick={() => onOpen(cv)}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 16,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: `transform 200ms ${ease}, border-color 200ms ${ease}`,
                  minHeight: 380,
                  display: "grid",
                  gridTemplateRows: "auto 1fr auto",
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "#3A3A3A";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: "100%",
                    background: "#fff",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    aspectRatio: "0.707",
                    position: "relative",
                  }}
                >
                  {renderThumb ? renderThumb(cv) : null}
                </div>

                {/* Meta */}
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cv.title || "My CV"}
                    </div>
                    <div style={{ color: "var(--text-secondary)", marginTop: -2 }}>
                      <IconDots />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{timeAgo(cv.updated_at)} · A4</div>
                </div>

                {/* Strength bar */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>Resume strength</span>
                    <span>{cv.strength ?? 0}%</span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 2,
                      background: isLight ? "#E5E5E5" : "#1E1E1E",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, Number(cv.strength ?? 0)))}%`,
                        height: "100%",
                        background: isLight ? "#111" : "#fff",
                        borderRadius: 2,
                        transition: `width 200ms ${ease}`,
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* ATS banner */}
          <div
            style={{
              marginTop: 16,
              background: isLight ? "var(--bg-surface)" : "var(--bg-surface)",
              border: `1px solid var(--border)`,
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Check your ATS score</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>See how recruiters and ATS systems read your CV.</div>
            </div>
            <button
              type="button"
              onClick={onRunATS}
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: isLight ? "#111" : "#fff",
                color: isLight ? "#fff" : "#000",
                fontWeight: 700,
                cursor: "pointer",
                transition: `opacity 150ms ${ease}, transform 150ms ${ease}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.opacity = "0.95";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.opacity = "1";
              }}
            >
              Run ATS check →
            </button>
          </div>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <div
        className="cvp-dashboard-tabs"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          background: "rgba(10,10,10,0.96)",
          borderTop: "1px solid #1E1E1E",
          display: "none",
          gridTemplateColumns: "repeat(4, 1fr)",
          alignItems: "center",
          padding: "6px 6px 10px",
          backdropFilter: "blur(10px)",
          zIndex: 50,
        }}
      >
        {[
          { id: "mycvs", label: "My CVs", Icon: TabIconDoc, onClick: () => setActive("mycvs") },
          { id: "ats", label: "ATS", Icon: TabIconTarget, onClick: onRunATS },
          { id: "walkin", label: "Walk-In", Icon: TabIconBolt, onClick: onWalkIn },
          { id: "account", label: "Account", Icon: TabIconUser, onClick: () => {} },
        ].map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActive(t.id);
                t.onClick();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: isActive ? "var(--text-primary)" : "#555",
                display: "grid",
                justifyItems: "center",
                gap: 4,
                cursor: "pointer",
                padding: 6,
              }}
            >
              <t.Icon active={isActive} />
              <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "var(--text-primary)" : "#555" }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}