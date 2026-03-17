import { useMemo, useState } from "react";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

function FalconIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" style={{ display: "block" }}>
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 38c6-8 10-12 14-13 4-1 9 0 14 3-4 1-7 3-9 6 3 0 6 1 9 3-4 1-8 2-12 2-4 0-8-1-12-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 42c2 3 4 5 8 6 4-1 6-3 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 22c1.5-2 3-3 4-3s2.5 1 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconBolt({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function IconDots({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
    </svg>
  );
}

function TabIconDoc({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function TabIconTarget({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TabIconBolt({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function TabIconUser({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--text-primary)" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

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
  resumeList = [],
  getStrength = () => 0,
  renderThumb = null,
  onBuildResume = () => {},
  onEditResume = () => {},
  onDelete = null,
  onRunATS = () => {},
  onWalkIn = () => {},
  onTemplates = () => {},
  onGoHome = () => {},
}) {
  const [active, setActive] = useState("mycvs");
  const [menuOpenId, setMenuOpenId] = useState(null);
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
    <div
      className={themeClass}
      style={{
        height: "100vh",
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        fontFamily: "'DM Sans', system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", height: "100%" }}>
        {/* Sidebar — desktop only, hidden on mobile via CSS */}
        <aside
          className="cvp-dashboard-sidebar"
          style={{
            background: "#0A0A0A",
            borderRight: "1px solid #1E1E1E",
            padding: "18px 12px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 14px", color: "var(--text-primary)", cursor: "pointer" }}
            onClick={onGoHome}
            role="button"
            tabIndex={0}
          >
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
                    transition: `background 150ms ${EASE}, color 150ms ${EASE}`,
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
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0 12px" }} />
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

          <div className="cvp-cv-grid">
            {/* New CV card */}
            <button
              type="button"
              onClick={onBuildResume}
              style={{
                border: "1px dashed var(--border)",
                background: "transparent",
                borderRadius: "var(--radius-lg)",
                minHeight: 380,
                display: "grid",
                placeItems: "center",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: `border-color 150ms ${EASE}`,
              }}
            >
              <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 999, border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--text-primary)" }}>
                  <IconPlus />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>New CV</div>
              </div>
            </button>

            {/* Walk-In card — compact, ~190–200px */}
            <button
              type="button"
              onClick={onWalkIn}
              style={{
                border: "1px solid #2A2A2A",
                background: "#141414",
                borderRadius: 16,
                padding: "20px 24px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                maxHeight: 220,
                transition: `transform 150ms ${EASE}, border-color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "#3A3A3A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#2A2A2A";
              }}
            >
              <span style={{ fontSize: 11, background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 20, padding: "4px 10px", color: "#A0A0A0", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconBolt size={12} /> Walk-In
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#FFF", marginTop: 10 }}>Walk-In Mode</span>
              <span style={{ fontSize: 13, color: "#A0A0A0", marginTop: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>Ready in 60 seconds — no account needed.</span>
              <span style={{ marginTop: 16, height: 40, borderRadius: 8, background: "#FFF", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>Start Walk-In CV</span>
            </button>

            {/* CV cards */}
            {resumeList.map((r) => {
              const strength = getStrength(r?.cv_data || r);
              const title = r?.title || r?.cv_data?.name || r?.name || "My CV";
              const isMenuOpen = menuOpenId === (r?.id ?? title);
              return (
                <div
                  key={r?.id ?? title}
                  role="button"
                  tabIndex={0}
                  onClick={() => onEditResume(r)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEditResume(r); }}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: 16,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: `transform 200ms ${EASE}, border-color 200ms ${EASE}`,
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
                    setMenuOpenId(null);
                  }}
                >
                  <div style={{ position: "relative" }}>
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
                      {renderThumb ? renderThumb(r) : null}
                    </div>
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : (r?.id ?? title)); }}
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: 6, cursor: "pointer", color: "var(--text-secondary)" }}
                        aria-label="Options"
                      >
                        <IconDots />
                      </button>
                      {isMenuOpen && (
                        <div
                          style={{
                            position: "absolute",
                            top: 36,
                            right: 8,
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            overflow: "hidden",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                            zIndex: 10,
                          }}
                        >
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onEditResume(r); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: "none", border: "none", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>Edit</button>
                          {onDelete && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); if (window.confirm("Delete this resume?")) onDelete(r?.id); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: "none", border: "none", color: "#ef4444", fontSize: 13, cursor: "pointer" }}>Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{timeAgo(r?.updated_at)} · A4</div>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                      <span>Resume strength</span>
                      <span>{strength}%</span>
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
                          width: `${Math.max(0, Math.min(100, Number(strength)))}%`,
                          height: "100%",
                          background: isLight ? "#111" : "#fff",
                          borderRadius: 2,
                          transition: `width 200ms ${EASE}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ATS banner */}
          <div
            style={{
              marginTop: 16,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
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
                transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
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
