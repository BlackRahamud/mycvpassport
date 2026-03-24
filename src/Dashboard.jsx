import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ReactComponent as FalconLogo } from "./logo.svg";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

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
      <div className="cvp-dashboard-wrapper" style={{ display: "grid", gridTemplateColumns: "220px 1fr", height: "100%" }}>
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
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 14px", color: "var(--text-primary)", cursor: "pointer", textDecoration: "none" }}
            aria-label="CVPassport home"
          >
            <FalconLogo width={22} height={22} aria-hidden="true" style={{ display: "block", flexShrink: 0, color: "var(--text-primary)", background: "none", border: "none", boxShadow: "none" }} />
            <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>CVPassport</span>
          </Link>

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
              className="cvp-new-cv-card"
              style={{
                border: "1px dashed var(--border)",
                background: "transparent",
                borderRadius: "var(--radius-lg)",
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
              className="cvp-walkin-card"
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
              <span style={{ fontSize: 13, color: "#A0A0A0", marginTop: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>60 seconds. No account needed.</span>
              <span style={{ marginTop: 16, height: 40, borderRadius: 8, background: "#FFF", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>Start Walk-In CV</span>
            </button>

            {/* CV cards */}
            {resumeList.map((r) => {
              const strength = getStrength(r?.cv_data || r);
              const title = r?.title || r?.cv_data?.name || r?.name || "My CV";
              const isMenuOpen = menuOpenId === (r?.id ?? title);
              return (
                <div
                  key={r?.id ?? title}
                  className="cvp-cv-card"
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
                      className="cvp-thumb-container"
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

          {/* ATS banner — below CV grid */}
          <style>{`
            @media (max-width: 768px) {
              .cvp-ats-banner { flex-direction: column; align-items: flex-start; }
              .cvp-ats-banner-btn { width: 100%; margin-top: 16px; }
            }
          `}</style>
          <div
            className="cvp-ats-banner"
            style={{
              marginTop: 32,
              minHeight: 80,
              background: "#141414",
              border: "1px solid #2A2A2A",
              borderRadius: 16,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#FFFFFF" }}>Check your CV against any job description</div>
              <div style={{ fontSize: 13, color: "#A0A0A0" }}>See missing keywords instantly</div>
            </div>
            <button
              type="button"
              onClick={onRunATS}
              className="cvp-ats-banner-btn"
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: `opacity 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Run ATS Check
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
