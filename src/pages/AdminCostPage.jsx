import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Sprint #4: founder-only spend dashboard.
// Reads anthropic_calls via the admin-email RLS policy. Aggregates
// today's UTC window client-side — at the volumes we expect for the
// next year this is fine. Promote to a SQL view if it ever isn't.

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

function startOfUtcDay() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function fmtUsd(n) {
  return `$${Number(n || 0).toFixed(4)}`;
}

function fmtUsd2(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function aggregate(rows) {
  const byTier = {};
  const bySpender = new Map();
  const statusCounts = { ok: 0, rate_limited: 0, turnstile_blocked: 0, spend_capped: 0, error: 0 };
  let totalCalls = 0;
  let totalUsd = 0;
  let cacheReadTokens = 0;
  let cacheCreateTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const r of rows) {
    totalCalls += 1;
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    const cost = Number(r.estimated_cost_usd || 0);
    totalUsd += cost;
    cacheReadTokens += Number(r.cache_read_input_tokens || 0);
    cacheCreateTokens += Number(r.cache_creation_input_tokens || 0);
    inputTokens += Number(r.input_tokens || 0);
    outputTokens += Number(r.output_tokens || 0);

    const tier = r.tier || "anonymous";
    if (!byTier[tier]) {
      byTier[tier] = { calls: 0, usd: 0, ok: 0 };
    }
    byTier[tier].calls += 1;
    byTier[tier].usd += cost;
    if (r.status === "ok") byTier[tier].ok += 1;

    const key = r.user_id || `ip:${r.ip_hash || "unknown"}`;
    const cur = bySpender.get(key) || { id: key, calls: 0, usd: 0, tier };
    cur.calls += 1;
    cur.usd += cost;
    bySpender.set(key, cur);
  }

  const topSpenders = [...bySpender.values()]
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 10);

  const errorRate = totalCalls > 0
    ? (statusCounts.error || 0) / totalCalls
    : 0;
  const totalCacheTokens = cacheReadTokens + cacheCreateTokens;
  const cacheReadRate = totalCacheTokens > 0
    ? cacheReadTokens / totalCacheTokens
    : 0;

  return {
    totalCalls,
    totalUsd,
    byTier,
    topSpenders,
    statusCounts,
    errorRate,
    cacheReadRate,
    cacheReadTokens,
    cacheCreateTokens,
    inputTokens,
    outputTokens,
  };
}

export default function AdminCostPage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

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
    const since = startOfUtcDay().toISOString();
    setLoading(true);
    setError(null);
    supabase
      .from("anthropic_calls")
      .select("id, occurred_at, user_id, ip_hash, tier, endpoint, model, input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens, estimated_cost_usd, status, error_code")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(5000)
      .then(({ data, error: fnErr }) => {
        if (fnErr) {
          setError(fnErr.message);
          setRows([]);
        } else {
          setRows(data ?? []);
        }
        setLoading(false);
      });
  }, [authReady, user]);

  const agg = useMemo(() => aggregate(rows), [rows]);

  if (!authReady) return null;
  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return (
    <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', 'Outfit', sans-serif", lineHeight: 1.6 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 80px" }}>
        <Link to="/admin" style={{ color: T.muted, textDecoration: "none", fontSize: 14 }}>
          ← /admin
        </Link>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px" }}>
          Cost dashboard
        </h1>
        <p style={{ color: T.muted, margin: "0 0 28px", fontSize: 14 }}>
          Today (UTC). Source: <code>anthropic_calls</code>. Refreshes on page load.
        </p>

        {loading && <p style={{ color: T.muted }}>Loading…</p>}
        {error && (
          <div style={{ color: T.red, background: "rgba(248,113,113,0.08)", border: `1px solid ${T.red}`, padding: 12, borderRadius: 8 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
              <Stat label="Spend today" value={fmtUsd2(agg.totalUsd)} />
              <Stat label="Calls today" value={String(agg.totalCalls)} />
              <Stat label="Error rate" value={fmtPct(agg.errorRate)} accent={agg.errorRate > 0.05 ? T.red : T.muted} />
              <Stat label="Turnstile blocks" value={String(agg.statusCounts.turnstile_blocked || 0)} />
              <Stat label="Rate-limited" value={String(agg.statusCounts.rate_limited || 0)} />
              <Stat label="Spend-capped" value={String(agg.statusCounts.spend_capped || 0)} />
              <Stat label="Cache hit rate" value={fmtPct(agg.cacheReadRate)} accent={agg.cacheReadRate > 0.5 ? T.green : T.muted} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>By tier</h2>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={tableTh}>Tier</th>
                  <th style={{ ...tableTh, textAlign: "right" }}>Calls</th>
                  <th style={{ ...tableTh, textAlign: "right" }}>OK</th>
                  <th style={{ ...tableTh, textAlign: "right" }}>Spend</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(agg.byTier).length === 0 && (
                  <tr><td style={tableTd} colSpan={4}>No calls today.</td></tr>
                )}
                {Object.entries(agg.byTier)
                  .sort(([, a], [, b]) => b.usd - a.usd)
                  .map(([tier, t]) => (
                    <tr key={tier} style={tableRow}>
                      <td style={tableTd}>{tier}</td>
                      <td style={{ ...tableTd, textAlign: "right" }}>{t.calls}</td>
                      <td style={{ ...tableTd, textAlign: "right" }}>{t.ok}</td>
                      <td style={{ ...tableTd, textAlign: "right" }}>{fmtUsd(t.usd)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "28px 0 12px" }}>Top 10 spenders today</h2>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={tableTh}>Identity</th>
                  <th style={tableTh}>Tier</th>
                  <th style={{ ...tableTh, textAlign: "right" }}>Calls</th>
                  <th style={{ ...tableTh, textAlign: "right" }}>Spend</th>
                </tr>
              </thead>
              <tbody>
                {agg.topSpenders.length === 0 && (
                  <tr><td style={tableTd} colSpan={4}>No spenders today.</td></tr>
                )}
                {agg.topSpenders.map((s) => (
                  <tr key={s.id} style={tableRow}>
                    <td style={tableTd}>
                      <code style={{ fontSize: 12, color: T.muted }}>{s.id}</code>
                    </td>
                    <td style={tableTd}>{s.tier}</td>
                    <td style={{ ...tableTd, textAlign: "right" }}>{s.calls}</td>
                    <td style={{ ...tableTd, textAlign: "right" }}>{fmtUsd(s.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "28px 0 12px" }}>Token usage</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
              <Stat label="Input (uncached)" value={agg.inputTokens.toLocaleString()} />
              <Stat label="Cache write" value={agg.cacheCreateTokens.toLocaleString()} />
              <Stat label="Cache read" value={agg.cacheReadTokens.toLocaleString()} accent={agg.cacheReadTokens > 0 ? T.green : T.muted} />
              <Stat label="Output" value={agg.outputTokens.toLocaleString()} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "28px 0 12px" }}>Recent calls (last 30)</h2>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={tableTh}>Time</th>
                  <th style={tableTh}>Tier</th>
                  <th style={tableTh}>Model</th>
                  <th style={tableTh}>Status</th>
                  <th style={{ ...tableTh, textAlign: "right" }}>USD</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 30).map((r) => (
                  <tr key={r.id} style={tableRow}>
                    <td style={tableTd}>{new Date(r.occurred_at).toLocaleTimeString("en-GB", { hour12: false })}</td>
                    <td style={tableTd}>{r.tier}</td>
                    <td style={tableTd}><code style={{ fontSize: 12, color: T.muted }}>{r.model || "—"}</code></td>
                    <td style={tableTd}>
                      <span style={{ color: r.status === "ok" ? T.green : r.status === "error" ? T.red : T.amber }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ ...tableTd, textAlign: "right" }}>{fmtUsd(r.estimated_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
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

const tableStyle = { width: "100%", borderCollapse: "collapse", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", fontSize: 14 };
const tableHeadRow = { background: T.elevated };
const tableTh = { padding: "10px 14px", textAlign: "left", color: T.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, borderBottom: `1px solid ${T.border}` };
const tableRow = { borderBottom: `1px solid ${T.border}` };
const tableTd = { padding: "10px 14px", color: T.text, fontSize: 14 };
