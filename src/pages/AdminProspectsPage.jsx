import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, Check, ExternalLink, Download } from "lucide-react";
import { supabase } from "../supabaseClient";
import { buildProspects, prospectsToCsv, GEO_BLOCK_FRAGMENT } from "../lib/scout/prospects";

// Prospect Radar — founder-only B2B call list built from accumulated
// scout_jobs rows (Scout plan, Step 1-2). Reads the founder's own rows
// via RLS; the transform lives in src/lib/scout/prospects.js.
//
// HARD BOUNDARY: this is outreach intelligence. Nothing on this page
// may ever be rendered as portal job listings — that would fake supply
// and break aggregator terms.

const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  amber: "#D97706",
  green: "#1D9E75",
  red: "#F87171",
  blue: "#378ADD",
};

const ADMIN_EMAIL = "connectingjunaidkhan@gmail.com";
const LJBFFR_ILIKE = `%${GEO_BLOCK_FRAGMENT}%`;

function timeAgo(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(min, 1)}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const MARKET_BADGE = {
  india: { label: "India", color: T.green },
  gulf: { label: "Gulf", color: T.blue },
  other: { label: "Other", color: T.muted },
};

export default function AdminProspectsPage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [geoBlockedCount, setGeoBlockedCount] = useState(0);
  const [marketFilter, setMarketFilter] = useState("all");
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [showAgencies, setShowAgencies] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user || user.email !== ADMIN_EMAIL) return;
    let active = true;
    setLoading(true);
    setError(null);

    // jd_text is up to 12KB per row, so the Ljbffr junk filter runs in
    // Postgres instead of shipping every description down just to grep
    // it. A separate head-count keeps the dropped-junk number honest.
    const dataQuery = supabase
      .from("scout_jobs")
      .select("id, title, company, location, apply_url, source_platform, fetched_at, jd_snippet")
      .not("jd_text", "ilike", LJBFFR_ILIKE)
      .not("apply_url", "ilike", LJBFFR_ILIKE)
      .order("fetched_at", { ascending: false })
      .limit(2000);
    const junkCountQuery = supabase
      .from("scout_jobs")
      .select("id", { count: "exact", head: true })
      .or(`jd_text.ilike.${LJBFFR_ILIKE},apply_url.ilike.${LJBFFR_ILIKE}`);

    Promise.all([dataQuery, junkCountQuery]).then(([dataRes, countRes]) => {
      if (!active) return;
      if (dataRes.error) {
        setError(dataRes.error.message);
        setRows([]);
      } else {
        setRows(dataRes.data ?? []);
      }
      setGeoBlockedCount(countRes.error ? 0 : (countRes.count ?? 0));
      setLoading(false);
    });
    return () => { active = false; };
  }, [authReady, user]);

  const { prospects, dropped } = useMemo(() => buildProspects(rows), [rows]);

  const visible = useMemo(
    () => prospects.filter((p) => {
      if (marketFilter !== "all" && p.market !== marketFilter) return false;
      if (!showEnterprise && p.flags.enterprise) return false;
      if (!showAgencies && p.flags.agency) return false;
      return true;
    }),
    [prospects, marketFilter, showEnterprise, showAgencies]
  );

  const stats = useMemo(() => ({
    india: prospects.filter((p) => p.market === "india" && !p.flags.enterprise).length,
    gulf: prospects.filter((p) => p.market === "gulf" && !p.flags.enterprise).length,
    hot: prospects.filter((p) => p.roleCount >= 2 && !p.flags.enterprise).length,
    filtered: dropped.noCompany + dropped.outOfLane + dropped.geoBlocked + geoBlockedCount,
  }), [prospects, dropped, geoBlockedCount]);

  const copyCompany = async (p) => {
    try {
      await navigator.clipboard.writeText(p.company);
      setCopiedKey(p.key);
      setTimeout(() => setCopiedKey((k) => (k === p.key ? null : k)), 1500);
    } catch { /* clipboard unavailable — no-op */ }
  };

  const exportCsv = () => {
    const blob = new Blob([prospectsToCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cvpassport-prospects.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authReady) return null;
  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return (
    <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', 'Outfit', sans-serif", lineHeight: 1.6 }}>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 16px 80px" }}
      >
        <Link to="/admin" style={{ color: T.muted, textDecoration: "none", fontSize: 14 }}>
          ← /admin
        </Link>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px" }}>
          Prospect Radar
        </h1>
        <p style={{ color: T.muted, margin: "0 0 28px", fontSize: 14 }}>
          Companies hiring right now, from your Scout runs. Outreach call list —{" "}
          <strong style={{ color: T.text }}>never portal inventory</strong>.
          Source: <code>scout_jobs</code>.
        </p>

        {loading && <p style={{ color: T.muted }}>Loading…</p>}
        {error && (
          <div style={{ color: T.red, background: "rgba(248,113,113,0.08)", border: `1px solid ${T.red}`, padding: 12, borderRadius: 8 }}>
            {error}
          </div>
        )}

        {!loading && !error && prospects.length === 0 && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>No radar data yet</p>
            <p style={{ color: T.muted, margin: "0 0 16px", fontSize: 14 }}>
              Run Scout a few times across your target roles and cities — every run feeds this list.
            </p>
            <Link to="/scout" style={{ color: T.amber, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
              Open Scout →
            </Link>
          </div>
        )}

        {!loading && !error && prospects.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              <Stat label="Prospects" value={String(prospects.length)} />
              <Stat label="India lane" value={String(stats.india)} accent={T.green} />
              <Stat label="Gulf lane" value={String(stats.gulf)} accent={T.blue} />
              <Stat label="Hot (2+ roles)" value={String(stats.hot)} accent={T.amber} />
              <Stat label="Junk filtered" value={String(stats.filtered)} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
              {["all", "india", "gulf"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketFilter(m)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: `1px solid ${marketFilter === m ? T.amber : T.border}`,
                    background: marketFilter === m ? "rgba(217,119,6,0.12)" : T.surface,
                    color: marketFilter === m ? T.amber : T.muted,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {m === "all" ? "All markets" : MARKET_BADGE[m].label}
                </button>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={showEnterprise} onChange={(e) => setShowEnterprise(e.target.checked)} />
                Show enterprise
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={showAgencies} onChange={(e) => setShowAgencies(e.target.checked)} />
                Show agencies
              </label>
              <button
                onClick={exportCsv}
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.elevated,
                  color: T.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Download size={14} /> Export CSV ({visible.length})
              </button>
            </div>

            <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: T.surface, fontSize: 14, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: T.elevated }}>
                    <th style={th}>#</th>
                    <th style={th}>Company</th>
                    <th style={th}>Market</th>
                    <th style={{ ...th, textAlign: "right" }}>Roles</th>
                    <th style={th}>Openings</th>
                    <th style={th}>Locations</th>
                    <th style={th}>Sources</th>
                    <th style={th}>Last seen</th>
                    <th style={th} aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td style={td} colSpan={9}>Nothing matches the current filters.</td></tr>
                  )}
                  {visible.map((p, i) => {
                    const badge = MARKET_BADGE[p.market];
                    return (
                      <tr key={p.key} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ ...td, color: T.muted }}>{i + 1}</td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600 }}>{p.company}</span>
                            {p.flags.enterprise && <Tag color={T.red}>Enterprise</Tag>}
                            {p.flags.agency && <Tag color={T.muted}>Agency</Tag>}
                          </div>
                        </td>
                        <td style={td}>
                          <Tag color={badge.color}>{badge.label}</Tag>
                        </td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: p.roleCount >= 2 ? T.amber : T.text }}>
                          {p.roleCount}
                        </td>
                        <td style={{ ...td, color: T.muted, maxWidth: 320 }}>
                          {p.roles.slice(0, 3).map((r) => r.title).join(" · ")}
                          {p.roles.length > 3 && ` +${p.roles.length - 3} more`}
                        </td>
                        <td style={{ ...td, color: T.muted }}>
                          {p.locations.slice(0, 2).join(" · ")}
                          {p.locations.length > 2 && ` +${p.locations.length - 2}`}
                        </td>
                        <td style={{ ...td, color: T.muted, fontSize: 12 }}>{p.sources.join(", ")}</td>
                        <td style={{ ...td, color: T.muted, whiteSpace: "nowrap" }}>{timeAgo(p.lastSeen)}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => copyCompany(p)}
                            title="Copy company name"
                            style={iconBtn}
                          >
                            {copiedKey === p.key ? <Check size={14} color={T.green} /> : <Copy size={14} color={T.muted} />}
                          </button>
                          {p.sampleUrl && (
                            <a
                              href={p.sampleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open a sample listing"
                              style={{ ...iconBtn, display: "inline-flex" }}
                            >
                              <ExternalLink size={14} color={T.muted} />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || T.text }}>{value}</div>
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 8px",
      borderRadius: 999,
      border: `1px solid ${color}`,
      color,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.3,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

const th = { padding: "10px 14px", textAlign: "left", color: T.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, borderBottom: `1px solid ${T.border}` };
const td = { padding: "10px 14px", color: T.text, fontSize: 14, verticalAlign: "top" };
const iconBtn = { background: "none", border: "none", padding: 6, cursor: "pointer", borderRadius: 6, alignItems: "center" };
