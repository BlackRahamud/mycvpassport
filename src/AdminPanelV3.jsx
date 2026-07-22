// ============================================================================
// AdminPanelV3.jsx — Admin Command Center (the "changing clothes" reskin).
//
// Ported from the Claude Design "CVPassport Admin" file: its own indigo
// identity (#4C6FFF), light + night, Plus Jakarta Sans. Owner-gated (the
// /admin route already restricts to the founder email; this also verifies).
//
// WIRED, not a mock:
//  - Reads real data via the owner's Supabase session (RLS): users/counts,
//    ops, Anthropic cost, plus revenue / plans / audit via /api/admin.
//  - Every WRITE goes through /api/admin (Phase 1/2/3 endpoints) with the
//    owner Bearer token, so it is audited server-side.
//  - Phase-4 surfaces (Emergency kill switches, GA analytics) render with the
//    design's own honest badges ("coming" / "needs setup") — nothing fake.
// ============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { TIERS } from "./config/tierConfig";
import NoIndex from "./components/seo/NoIndex";
import "./AdminPanelV3.css";

const OWNER_EMAIL = "connectingjunaidkhan@gmail.com";

/* ── Theme palettes (day / night) from the design. Applied as CSS vars. ── */
const DAY = {
  "--bg": "#F4F6FB", "--card": "#FFFFFF", "--surface2": "#F7F8FC", "--surface3": "#FAFBFE",
  "--text": "#1B2233", "--soft": "#5A6478", "--muted": "#8892A6", "--muted2": "#97A0B4",
  "--faint": "#B3BACB", "--border": "#EEF1F7", "--border2": "#EAEDF3", "--line": "#F2F4F9", "--line2": "#F6F7FB",
};
const NIGHT = {
  "--bg": "#0E1016", "--card": "#171A22", "--surface2": "#1C2029", "--surface3": "#1C2029",
  "--text": "#F4F5F7", "--soft": "#AEB4C2", "--muted": "#8891A2", "--muted2": "#6C7688",
  "--faint": "#525B6B", "--border": "#242A38", "--border2": "#2B3242", "--line": "#222836", "--line2": "#1E2430",
};
const ACCENT = "#4C6FFF";
const VIOLET = "#8B6DE8";
const GREEN = "#1F8A4C";
const AMBER = "#B8820F";
const RED = "#D05252";

/* ── Data-state badges (matches the design's sb()). ── */
const BADGE = {
  live: { label: "Live data", color: "#1F8A4C", bg: "#E6F7F0" },
  real: { label: "Live data", color: "#1F8A4C", bg: "#E6F7F0" },
  estimated: { label: "Estimated", color: "#B8820F", bg: "#FDF6E7" },
  not_tracked: { label: "Not tracked", color: "#8892A6", bg: "#F2F4F9" },
  needs_wiring: { label: "Needs wiring", color: "#8B6DE8", bg: "#F1ECFC" },
  ga: { label: "Needs GA setup", color: "#B8820F", bg: "#FDF6E7" },
  coming: { label: "Coming", color: "#B8820F", bg: "#FDF6E7" },
  neu: { label: "New", color: "#4C6FFF", bg: "#EDF1FF" },
};
function Badge({ kind }) {
  const b = BADGE[kind] || BADGE.live;
  return <span style={{ fontSize: 10, fontWeight: 700, color: b.color, background: b.bg, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{b.label}</span>;
}

const PLAN_LABEL_TO_ENUM = { Free: "FREE", "Express Pass": "EXPRESS_PASS", "Active Hunter": "ACTIVE_HUNTER", "Career Pro": "CAREER_PRO", Foundation: "foundation" };
const PLAN_ENUM_TO_LABEL = { FREE: "Free", EXPRESS_PASS: "Express Pass", ACTIVE_HUNTER: "Active Hunter", CAREER_PRO: "Career Pro" };

/* ── Small helpers ── */
function initials(s) { return String(s || "?").trim().split(/[\s@.]+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase(); }
function avatar(seed) {
  const sets = [["#EDF1FF", "#4C6FFF"], ["#E6F7F0", "#1F8A4C"], ["#F1ECFC", "#8B6DE8"], ["#FDF1E7", "#E08A2B"], ["#FDECEF", "#E1567F"], ["#E7F6F9", "#1B9AAA"]];
  let h = 0; for (const ch of String(seed || "?")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return sets[h % sets.length];
}
function planChip(plan) {
  const u = String(plan || "").toLowerCase();
  if (u.includes("hunter")) return { color: "#1F8A4C", bg: "#E6F7F0" };
  if (u.includes("foundation")) return { color: "#8B6DE8", bg: "#F1ECFC" };
  if (u.includes("career")) return { color: "#1B9AAA", bg: "#E7F6F9" };
  if (u.includes("express")) return { color: "#4C6FFF", bg: "#EDF1FF" };
  return { color: "#8892A6", bg: "var(--line)" };
}
function portalOf(userType) { return userType === "recruiter" || userType === "both" ? "hr" : "candidate"; }
function timeAgo(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
function planLabelFrom(row) {
  const enumP = String(row.plan || "FREE").toUpperCase();
  if (portalOf(row.user_type) === "hr") return "Foundation";
  return PLAN_ENUM_TO_LABEL[enumP] || "Free";
}
const nowISO = () => new Date().toISOString();
const startOfDayISO = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const startOfMonthISO = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const fmtMinor = (m, cur) => (m == null ? "—" : `${cur} ${(m / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

/* ── Icons (subset from the design's path map). ── */
const PATHS = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  ops: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  emergency: '<path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  access: '<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/>',
  marketing: '<path d="M12 2.5l1.9 5.1a3 3 0 0 0 1.8 1.8L20.8 11l-5.1 1.9a3 3 0 0 0-1.8 1.8L12 19.8l-1.9-5.1a3 3 0 0 0-1.8-1.8L3.2 11l5.1-1.9a3 3 0 0 0 1.8-1.8z"/>',
  plans: '<path d="M20.6 13.4 12 22l-8-8V4h10z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  analytics: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="m7 14 3-3 3 2 4-6"/>',
  prospects: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12 18 7"/>',
  star: '<path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17l-6.1 3.4 1.4-6.8L2.2 9l6.9-.7z"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.3"/>',
  spark: '<path d="M12 2.5l1.9 5.1a3 3 0 0 0 1.8 1.8L20.8 11l-5.1 1.9a3 3 0 0 0-1.8 1.8L12 19.8l-1.9-5.1a3 3 0 0 0-1.8-1.8L3.2 11l5.1-1.9a3 3 0 0 0 1.8-1.8z"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  down: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  key: '<circle cx="8" cy="8" r="4"/><path d="m11 11 8 8M17 17l2-2M14 14l2-2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  tag: '<path d="M20.6 13.4 12 22l-8-8V4h10z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
};
function Ico({ n, size = 18, color = "currentColor", fill = "none" }) {
  const p = PATHS[n];
  if (!p) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: p }} />;
}

/* ── /api/admin caller (owner Bearer token). ── */
async function callAdmin(action, body) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`/api/admin?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  let json = {};
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, ...json };
}

async function countWhere(table, build) {
  try {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (build) q = build(q);
    const { count, error } = await q;
    return error ? null : (count ?? 0);
  } catch { return null; }
}

const NAV = [
  { group: "Overview", items: [{ id: "overview", label: "Overview", icon: "overview" }] },
  { group: "Core", items: [{ id: "users", label: "Users and revenue", icon: "users" }, { id: "ops", label: "Ops", icon: "ops" }, { id: "plans", label: "Plan builder", icon: "plans" }] },
  { group: "Control", items: [{ id: "emergency", label: "Emergency", icon: "emergency", badge: "!" }, { id: "access", label: "Access and audit", icon: "access" }] },
  { group: "Growth", items: [{ id: "marketing", label: "Marketing", icon: "marketing" }, { id: "analytics", label: "Analytics", icon: "analytics" }, { id: "prospects", label: "Prospect radar", icon: "prospects" }] },
];

/* Hold-to-confirm button (900ms press → fire). */
function HoldButton({ onConfirm, children, style }) {
  const [fill, setFill] = useState("0%");
  const timer = useRef(null);
  const start = () => { setFill("100%"); timer.current = setTimeout(() => { onConfirm(); setFill("0%"); }, 900); };
  const end = () => { clearTimeout(timer.current); setFill("0%"); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button type="button" onPointerDown={start} onPointerUp={end} onPointerLeave={end}
      style={{ position: "relative", overflow: "hidden", ...style }}>
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: fill, background: "#E15656", opacity: 0.22, transition: "width .85s linear" }} />
      <span style={{ position: "relative" }}>{children}</span>
    </button>
  );
}

export default function AdminPanelV3({ preview }) {
  const [authed, setAuthed] = useState(preview ? true : null); // null=checking, false=deny, true=owner

  const [mode, setMode] = useState(() => { try { return localStorage.getItem("cvp_admin_theme") === "night" || localStorage.getItem("cvp_admin_theme") === "dark" ? "night" : "day"; } catch { return "day"; } });
  useEffect(() => { try { localStorage.setItem("cvp_admin_theme", mode); } catch { /* ignore */ } }, [mode]);
  const themeVars = mode === "night" ? NIGHT : DAY;

  const [sec, setSec] = useState("overview");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});
  const [cost, setCost] = useState({ usd: null, rows: [], state: "live" });
  const [revenue, setRevenue] = useState(null);
  const [plans, setPlans] = useState({ plans: [], data_state: "needs_wiring" });
  const [audit, setAudit] = useState({ rows: [], data_state: "needs_wiring" });
  const [toast, setToast] = useState(null);
  const [sel, setSel] = useState(null); // drawer user
  const [selExtra, setSelExtra] = useState({});
  const [grant, setGrant] = useState(null); // { email, portal, plan, duration, custom, busy }
  const [flags, setFlags] = useState({ flags: [], data_state: "needs_wiring" });
  const [analytics, setAnalytics] = useState(null);
  const [incidentMsg, setIncidentMsg] = useState("");
  const [incidentPortal, setIncidentPortal] = useState("both");

  const showToast = useCallback((text, ok = true) => { setToast({ text, ok }); setTimeout(() => setToast(null), 2600); }, []);

  // ── Owner gate (defence in depth; the route already restricts).
  useEffect(() => {
    if (preview) return;
    (async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser();
        setAuthed(String(user?.email || "").toLowerCase() === OWNER_EMAIL);
      } catch { setAuthed(false); }
    })();
  }, [preview]);

  const loadAll = useCallback(async () => {
    if (preview) {
      setUsers(preview.users || []);
      setCounts(preview.counts || {});
      setCost(preview.cost || { usd: 12.4, rows: [], state: "live" });
      setRevenue(preview.revenue || null);
      setPlans(preview.plans || { plans: [], data_state: "needs_wiring" });
      setAudit(preview.audit || { rows: [], data_state: "real" });
      setFlags(preview.flags || { flags: [{ key: "candidate_checkout", enabled: true }, { key: "hr_checkout", enabled: true }, { key: "ai_evaluation", enabled: true }, { key: "ats_checker", enabled: true }, { key: "pdf_export", enabled: false }, { key: "hr_portal", enabled: true }], data_state: "real" });
      setAnalytics(preview.analytics || { posthog: { data_state: "real", tiles: [{ label: "Weekly active users", value: "1,240" }] }, ga: { data_state: "ga" } });
      return;
    }
    const { data: profs } = await supabase.from("profiles")
      .select("id,email,plan,user_type,is_pro,pro_access_expires_at,created_at,account_status,download_credits,cover_letter_credits,linkedin_unlocked")
      .order("created_at", { ascending: false }).limit(400);
    setUsers(profs || []);

    const [total, subs, signupsToday, cvsAll, dlToday, atsToday] = await Promise.all([
      countWhere("profiles"),
      countWhere("profiles", (x) => x.gt("pro_access_expires_at", nowISO())),
      countWhere("profiles", (x) => x.gte("created_at", startOfDayISO())),
      countWhere("cvs"),
      countWhere("downloads", (x) => x.gte("created_at", startOfDayISO())),
      countWhere("ats_results", (x) => x.gte("created_at", startOfDayISO())),
    ]);
    setCounts({ total, subs, signupsToday, cvsAll, dlToday, atsToday });

    try {
      const { data: calls, error } = await supabase.from("anthropic_calls").select("endpoint,estimated_cost_usd").gte("occurred_at", startOfMonthISO());
      if (error) setCost({ usd: null, rows: [], state: "needs_wiring" });
      else {
        const byEp = {};
        let usd = 0;
        (calls || []).forEach((c) => { const v = Number(c.estimated_cost_usd || 0); usd += v; byEp[c.endpoint] = (byEp[c.endpoint] || 0) + v; });
        const rows = Object.entries(byEp).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([ep, v]) => ({ label: ep, value: v }));
        setCost({ usd, rows, state: "live" });
      }
    } catch { setCost({ usd: null, rows: [], state: "needs_wiring" }); }

    setRevenue(await callAdmin("revenue", {}));
    setPlans(await callAdmin("plans_list", {}));
    setAudit(await callAdmin("audit_query", { limit: 20 }));
    setFlags(await callAdmin("flags_list", {}));
    setAnalytics(await callAdmin("analytics", {}));
  }, [preview]);

  useEffect(() => { if (authed) loadAll(); }, [authed, loadAll]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    const list = s ? users.filter((u) => (u.email || "").toLowerCase().includes(s)) : users;
    return list;
  }, [users, q]);

  // ── Drawer ──
  const openUser = useCallback(async (u) => {
    setSel(u); setSelExtra({});
    const [cvN, pays] = await Promise.all([
      countWhere("cvs", (x) => x.eq("user_id", u.id)),
      supabase.from("payments").select("amount,currency,status,payment_intent_id,created_at").eq("user_id", u.id).order("created_at", { ascending: false }).limit(20).then((r) => r.data || []).catch(() => []),
    ]);
    const paid = pays.filter((p) => Number(p.amount) > 0);
    const lifetime = paid.reduce((acc, p) => { const c = String(p.currency || "AED"); acc[c] = (acc[c] || 0) + Number(p.amount || 0); return acc; }, {});
    setSelExtra({ cvN, latestPayment: paid[0] || null, lifetime });
  }, []);

  const act = useCallback(async (action, body, label) => {
    const r = await callAdmin(action, body);
    const ok = r.ok !== false && r.status < 400;
    showToast(ok ? `${label} done` : `${label} failed: ${r.reason || r.error || r.status}`, ok);
    if (ok) loadAll();
    return r;
  }, [showToast, loadAll]);

  // ── Grant modal submit ──
  const submitGrant = useCallback(async () => {
    if (!grant?.email) { showToast("Enter an email", false); return; }
    const plan = grant.portal === "hr" ? "foundation" : PLAN_LABEL_TO_ENUM[grant.plan] || "ACTIVE_HUNTER";
    const body = { email: grant.email, portal: grant.portal, plan };
    if (grant.duration === "full") body.accessKind = "permanent";
    else if (grant.duration === "30") { body.accessKind = "duration"; body.durationDays = 30; }
    else { body.accessKind = "expiry"; body.expiry = grant.custom || nowISO(); }
    setGrant((g) => ({ ...g, busy: true }));
    const r = await callAdmin("grant_access", body);
    const ok = r.ok !== false;
    showToast(ok ? (r.applied === "pending" ? "Pending grant saved (resolves on signup)" : "Access granted") : `Grant failed: ${r.reason || r.error}`, ok);
    setGrant((g) => ({ ...g, busy: false, done: ok }));
    if (ok) { loadAll(); setTimeout(() => setGrant(null), 1300); }
  }, [grant, showToast, loadAll]);

  if (authed === null) return <div style={{ minHeight: "100vh", background: "#F4F6FB", display: "grid", placeItems: "center", color: "#8892A6", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Checking access…</div>;
  if (authed === false) return <div style={{ minHeight: "100vh", background: "#F4F6FB", display: "grid", placeItems: "center", fontFamily: "'Plus Jakarta Sans',sans-serif" }}><div style={{ textAlign: "center" }}><p style={{ fontWeight: 700 }}>Not authorised</p><Link to="/" style={{ color: ACCENT }}>Go home</Link></div></div>;

  const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, boxShadow: "0 12px 30px -24px rgba(27,34,51,0.3)" };
  const h1 = { margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" };
  const sub = { margin: "6px 0 0", fontSize: 14, color: "var(--muted)" };
  const sectionTitle = (title, subtitle) => (
    <div style={{ marginBottom: 20 }}><h1 style={h1}>{title}</h1>{subtitle && <p style={sub}>{subtitle}</p>}</div>
  );
  const infoBanner = (text, tone = "amber") => {
    const c = tone === "amber" ? { color: "#B8820F", bg: "#FDF6E7", border: "#F5E4B8" } : { color: "var(--muted)", bg: "var(--line)", border: "var(--border)" };
    return <div style={{ display: "inline-flex", alignItems: "center", gap: 9, margin: "0 0 20px", fontSize: 13, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "11px 15px" }}><Ico n="info" size={16} color={c.color} /> {text}</div>;
  };

  /* ─────────── Section: Overview ─────────── */
  const kpis = [
    { label: "Total users", value: counts.total ?? "—", icon: "users", iconBg: "#EDF1FF", iconColor: ACCENT, trend: counts.signupsToday != null ? `+${counts.signupsToday} today` : "", state: "live" },
    { label: "Subscribers", value: counts.subs ?? "—", icon: "star", iconBg: "#E6F7F0", iconColor: GREEN, trend: "active passes", state: "live" },
    { label: "Revenue, 30 days", value: revenue?.byCurrency?.AED ? fmtMinorMajor(revenue.byCurrency.AED.net, "AED") : "AED —", icon: "wallet", iconBg: "#F1ECFC", iconColor: VIOLET, trend: revenue?.data_state === "real" ? "real" : "est", state: revenue?.data_state === "real" ? "live" : "estimated" },
    { label: "Signups today", value: counts.signupsToday ?? "—", icon: "spark", iconBg: "#FDF1E7", iconColor: "#E08A2B", trend: "today", state: "live" },
  ];
  function fmtMinorMajor(n, cur) { return n == null ? `${cur} —` : `${cur} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }
  const revenueCards = [
    { market: "UAE market", gateway: "Ziina", value: revenue?.byCurrency?.AED ? fmtMinorMajor(revenue.byCurrency.AED.net, "AED") : "AED —", sub: revenue?.byCurrency?.AED ? `${revenue.byCurrency.AED.count || 0} payments` : "no data", state: revenue?.data_state === "real" ? "live" : "estimated" },
    { market: "India market", gateway: "Razorpay", value: revenue?.byCurrency?.INR ? fmtMinorMajor(revenue.byCurrency.INR.net, "INR") : "INR —", sub: revenue?.byCurrency?.INR ? `${revenue.byCurrency.INR.count || 0} payments` : "no data", state: revenue?.data_state === "real" ? "live" : "estimated" },
    { market: "HR employer", gateway: "Ziina and Razorpay", value: "—", sub: "split not wired", state: "needs_wiring" },
  ];

  const renderOverview = () => (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div><p style={{ margin: "0 0 5px", fontSize: 13, color: "var(--muted)" }}>Command center</p><h1 style={h1}>Overview</h1></div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: "#EDF1FF", borderRadius: 999, padding: "7px 13px" }}>Candidate</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: VIOLET, background: "#F1ECFC", borderRadius: 999, padding: "7px 13px" }}>HR employer</span>
        </div>
      </div>
      <div className="adv3-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
        {kpis.map((k, i) => (
          <div key={k.label} className="adv3-rise adv3-card" style={{ padding: 20, animationDelay: `${i * 60}ms` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: k.iconBg, color: k.iconColor, display: "grid", placeItems: "center" }}><Ico n={k.icon} size={20} color={k.iconColor} /></span>
              {k.trend && <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, background: "#E6F7F0", borderRadius: 999, padding: "4px 9px" }}>{k.trend}</span>}
            </div>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{k.value}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{k.label}</p><Badge kind={k.state} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Revenue, per market</h2><span style={{ fontSize: 12, color: "var(--muted2)" }}>never converted or summed</span></div>
      <div className="adv3-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
        {revenueCards.map((r) => (
          <div key={r.market} className="adv3-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--soft)" }}>{r.market}</span><Badge kind={r.state} /></div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{r.value}</p>
            <p style={{ margin: "7px 0 0", fontSize: 12, color: "var(--muted2)" }}>{r.gateway} · {r.sub}</p>
          </div>
        ))}
      </div>
      <div className="adv3-card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Who just joined</h2><button type="button" onClick={() => setSec("users")} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: ACCENT, background: "#EDF1FF", border: 0, borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}>See everyone</button></div>
        {users.slice(0, 6).map((u) => { const av = avatar(u.email); const pc = planChip(planLabelFrom(u)); const port = portalOf(u.user_type); return (
          <div key={u.id} onClick={() => openUser(u)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 6px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: av[0], color: av[1], fontSize: 13, fontWeight: 700, display: "grid", placeItems: "center" }}>{initials(u.email)}</span>
            <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted2)" }}>{u.account_status === "suspended" ? "suspended" : "active"}</p></div>
            <span className="adv3-hide-sm" style={{ fontSize: 12, fontWeight: 600, color: port === "hr" ? VIOLET : ACCENT, background: port === "hr" ? "#F1ECFC" : "#EDF1FF", borderRadius: 999, padding: "5px 11px" }}>{port === "hr" ? "HR" : "Candidate"}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: pc.color, background: pc.bg, borderRadius: 999, padding: "5px 11px" }}>{planLabelFrom(u)}</span>
            <span className="adv3-hide-sm" style={{ fontSize: 12.5, color: "var(--muted2)", minWidth: 64, textAlign: "right" }}>{timeAgo(u.created_at)}</span>
          </div>
        ); })}
      </div>
    </>
  );

  /* ─────────── Section: Users ─────────── */
  const renderUsers = () => (
    <>
      {sectionTitle("Users and revenue", "Find anyone and open their full profile")}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 11, padding: "15px 18px", borderRadius: 16, ...card }}>
          <Ico n="search" size={18} color="#97A0B4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type an email" style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: 15 }} />
        </div>
        <button type="button" onClick={() => setGrant({ email: q.trim(), portal: "candidate", plan: "Active Hunter", duration: "full" })} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#fff", background: ACCENT, border: 0, borderRadius: 14, padding: "15px 20px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 12px 24px -12px rgba(76,111,255,0.7)", whiteSpace: "nowrap" }}><Ico n="plus" size={16} color="#fff" /> Grant access</button>
        <button type="button" onClick={exportUsersCsv} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "var(--soft)", background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 14, padding: "15px 18px", cursor: "pointer", whiteSpace: "nowrap" }}>Export CSV</button>
      </div>
      <div style={{ ...card, padding: "8px 22px 16px" }}>
        <div className="adv3-hide-sm" style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1.2fr 1fr 0.9fr", gap: 12, padding: "16px 0 12px", fontSize: 12, fontWeight: 700, color: "var(--faint)", borderBottom: "1px solid var(--line)" }}><span>Person</span><span>Portal</span><span>Plan</span><span>Joined</span><span /></div>
        {filtered.slice(0, 200).map((u) => { const av = avatar(u.email); const pc = planChip(planLabelFrom(u)); const port = portalOf(u.user_type); return (
          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1.2fr 1fr 0.9fr", gap: 12, alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--line2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}><span style={{ width: 38, height: 38, borderRadius: "50%", background: av[0], color: av[1], fontSize: 12.5, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0 }}>{initials(u.email)}</span><div style={{ minWidth: 0 }}><p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted2)" }}>{u.account_status === "suspended" ? "suspended" : "active"}</p></div></div>
            <span className="adv3-hide-sm"><span style={{ fontSize: 12, fontWeight: 600, color: port === "hr" ? VIOLET : ACCENT, background: port === "hr" ? "#F1ECFC" : "#EDF1FF", borderRadius: 999, padding: "5px 11px" }}>{port === "hr" ? "HR" : "Candidate"}</span></span>
            <span><span style={{ fontSize: 12, fontWeight: 600, color: pc.color, background: pc.bg, borderRadius: 999, padding: "5px 11px" }}>{planLabelFrom(u)}</span></span>
            <span className="adv3-hide-sm" style={{ fontSize: 12.5, color: "var(--muted)" }}>{timeAgo(u.created_at)}</span>
            <span style={{ textAlign: "right" }}><button type="button" onClick={() => openUser(u)} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: ACCENT, background: "#EDF1FF", border: 0, borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}>Open</button></span>
          </div>
        ); })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px 20px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>No user matches {q}</p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted2)" }}>You can still choose a plan and invite them</p>
            <button type="button" onClick={() => setGrant({ email: q.trim(), portal: "candidate", plan: "Active Hunter", duration: "full" })} style={{ fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "#fff", background: ACCENT, border: 0, borderRadius: 12, padding: "12px 18px", cursor: "pointer" }}>Grant access to a new person</button>
          </div>
        )}
      </div>
    </>
  );

  function exportUsersCsv() {
    const headers = ["email", "plan", "portal", "is_pro", "account_status", "created_at"];
    const rows = users.map((u) => [u.email, u.plan || "FREE", portalOf(u.user_type), !!u.is_pro, u.account_status || "active", u.created_at || ""]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `cvpassport_users_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    showToast("Exported CSV");
  }

  /* ─────────── Section: Ops ─────────── */
  const opsStats = [
    { label: "CVs built, all time", value: counts.cvsAll ?? "—", icon: "doc", iconBg: "#EDF1FF", iconColor: ACCENT, state: "live" },
    { label: "Downloads today", value: counts.dlToday ?? "—", icon: "down", iconBg: "#E6F7F0", iconColor: GREEN, state: "live" },
    { label: "ATS scans today", value: counts.atsToday ?? "—", icon: "target", iconBg: "#E7F6F9", iconColor: "#1B9AAA", state: counts.atsToday == null ? "needs_wiring" : "live" },
    { label: "Cover letters", value: "—", icon: "mail", iconBg: "#FDF6E7", iconColor: AMBER, state: "not_tracked" },
  ];
  const renderOps = () => (
    <>
      {sectionTitle("Ops", "Content, CVs and how the tools are used")}
      <div className="adv3-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
        {opsStats.map((o) => (
          <div key={o.label} className="adv3-card" style={{ padding: 20 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: o.iconBg, color: o.iconColor, display: "grid", placeItems: "center" }}><Ico n={o.icon} size={20} color={o.iconColor} /></span>
            <p style={{ margin: "14px 0 0", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{o.value}</p>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted)" }}>{o.label}</p>
            <div style={{ marginTop: 9 }}><Badge kind={o.state} /></div>
          </div>
        ))}
      </div>
      <div className="adv3-card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}><div><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Cost dashboard</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Real Anthropic API spend, this month (USD)</p></div><span style={{ fontSize: 22, fontWeight: 800 }}>{cost.usd == null ? "—" : `$${cost.usd.toFixed(2)}`}</span></div>
        {cost.rows.length === 0 && <p style={{ fontSize: 13, color: "var(--muted2)" }}>No calls recorded this month, or the table is not readable.</p>}
        {cost.rows.map((c) => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line2)" }}>
            <span style={{ flex: 1, fontSize: 13.5, color: "var(--soft)" }}>{c.label}</span>
            <Badge kind="live" />
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 80, textAlign: "right" }}>${c.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>{infoBanner("Cover letters are not tracked, and per-generation LinkedIn runs are unlogged. Those tiles stay honest until the tracking event is wired.")}</div>
    </>
  );

  /* ─────────── Section: Plan builder ─────────── */
  const renderPlans = () => (
    <>
      {sectionTitle("Plan builder", "Create and edit plans with per market pricing and limits")}
      {plans.data_state !== "real" && infoBanner(plans.reason || "Apply migration 050_plans to populate the plan catalogue.")}
      <div style={{ ...card, padding: "8px 22px 16px" }}>
        <div className="adv3-hide-sm" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 2fr 0.8fr", gap: 12, padding: "16px 0 12px", fontSize: 12, fontWeight: 700, color: "var(--faint)", borderBottom: "1px solid var(--line)" }}><span>Plan</span><span>AED, Ziina</span><span>INR, Razorpay</span><span>Limits</span><span /></div>
        {(plans.plans || []).map((p) => (
          <div key={p.slug} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 2fr 0.8fr", gap: 12, alignItems: "center", padding: "15px 0", borderBottom: "1px solid var(--line2)" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
            <span style={{ fontSize: 13.5 }}>{fmtMinor(p.aed_minor, "AED")}</span>
            <span style={{ fontSize: 13.5 }}>{fmtMinor(p.inr_minor, "INR")}</span>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.duration_days ? `${p.duration_days} days` : "permanent"} · {p.portal}</span>
            <span style={{ textAlign: "right" }}>{p.immutable ? <span style={{ fontSize: 11, fontWeight: 700, color: VIOLET, background: "#F1ECFC", borderRadius: 999, padding: "4px 10px" }}>Fixed</span> : null}</span>
          </div>
        ))}
        <p style={{ margin: "14px 2px 4px", fontSize: 12, color: "var(--muted2)" }}>Foundation and Explorer are immutable. Editing rows and creating new plans call plan_upsert / plan_delete (both audited).</p>
      </div>
    </>
  );

  /* ─────────── Section: Access and audit ─────────── */
  const renderAccess = () => (
    <>
      {sectionTitle("Access and audit", "Least privilege, and a record of everything")}
      {infoBanner("Roles and just-in-time elevation are the target model. Today access is a single owner login, so the endpoints are owner-only for now.")}
      <div className="adv3-card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Audit log</h2><Badge kind={audit.data_state === "real" ? "live" : "needs_wiring"} /></div>
        {(audit.rows || []).length === 0 && <p style={{ fontSize: 13, color: "var(--muted2)" }}>{audit.reason || "No audit rows yet — every write from here will appear."}</p>}
        {(audit.rows || []).map((a) => { const av = avatar(a.actor_email || "?"); return (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--line2)" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: av[0], color: av[1], fontSize: 11.5, fontWeight: 700, display: "grid", placeItems: "center" }}>{initials(a.actor_email)}</span>
            <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: 13.5 }}>{a.action.replace(/_/g, " ")}{a.target_email ? ` · ${a.target_email}` : ""}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted2)" }}>{a.actor_email} · {timeAgo(a.occurred_at)}</p></div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: ACCENT, background: "#EDF1FF", borderRadius: 999, padding: "5px 11px" }}>{a.action.split("_")[0]}</span>
          </div>
        ); })}
      </div>
    </>
  );

  /* ─────────── Section: Emergency (Phase 4 — LIVE) ─────────── */
  const KILLS = [
    { key: "candidate_checkout", label: "Candidate checkout" },
    { key: "hr_checkout", label: "HR checkout" },
    { key: "ai_evaluation", label: "AI evaluation" },
    { key: "ats_checker", label: "ATS checker" },
    { key: "pdf_export", label: "PDF export" },
    { key: "hr_portal", label: "Whole HR portal" },
  ];
  const flagFor = (k) => (flags.flags || []).find((f) => f.key === k);
  const renderEmergency = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 8 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "#FDECEC", color: "#E15656", display: "grid", placeItems: "center" }}><Ico n="emergency" size={21} color="#E15656" /></span>
        <div><h1 style={h1}>Emergency</h1><p style={sub}>Serious controls, held to confirm and always logged</p></div>
      </div>
      {flags.data_state !== "real" && infoBanner(flags.reason || "Apply migration 051_feature_flags to enable live kill switches.")}
      <div style={{ border: "1px solid #F6D9D9", background: "#FEF7F7", borderRadius: 22, padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "#B84343" }}>Kill switches</h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "#B58A8A" }}>Hold to flip. Takes effect live, no deploy. Every flip is audited. Off means the feature is disabled for everyone.</p>
        <div className="adv3-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {KILLS.map((k) => { const f = flagFor(k.key); const on = f ? f.enabled !== false : true; return (
            <div key={k.key} style={{ background: "var(--card)", border: `1px solid ${on ? "var(--border)" : "#F3C7C7"}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>{k.label}</span><span style={{ fontSize: 11, fontWeight: 700, color: on ? GREEN : RED, background: on ? "#E6F7F0" : "#FDECEC", borderRadius: 999, padding: "3px 9px" }}>{on ? "On" : "Off"}</span></div>
              <HoldButton onConfirm={() => act("flag_set", { key: k.key, enabled: !on, confirm: "CONFIRM" }, on ? `Turn off ${k.label}` : `Turn on ${k.label}`)} style={{ width: "100%", height: 40, borderRadius: 11, border: "1px solid #F3C7C7", background: "#FDF1F1", color: RED, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{on ? "hold to turn off" : "hold to turn on"}</HoldButton>
            </div>
          ); })}
        </div>
      </div>
      <div className="adv3-card" style={{ padding: 22 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Incident banner</h2>
        <p style={{ margin: "0 0 13px", fontSize: 13, color: "var(--muted)" }}>Show a calm status message to a portal. The app reads it live.</p>
        <textarea value={incidentMsg} onChange={(e) => setIncidentMsg(e.target.value)} placeholder="We are looking into checkout issues and expect a fix shortly." style={{ width: "100%", height: 70, resize: "none", borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "inherit", fontSize: 13.5, padding: "12px 14px", outline: "none", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <select value={incidentPortal} onChange={(e) => setIncidentPortal(e.target.value)} style={{ borderRadius: 11, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "inherit", fontSize: 13, padding: "11px 14px" }}>
            <option value="both">Both portals</option><option value="candidate">Candidate</option><option value="hr">HR</option>
          </select>
          <button type="button" onClick={() => act("set_incident", { message: incidentMsg, portal: incidentPortal, active: true, confirm: "CONFIRM" }, "Incident pushed")} disabled={!incidentMsg.trim()} style={{ fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "#fff", background: incidentMsg.trim() ? "#E15656" : "#C9CFDB", border: 0, borderRadius: 11, padding: "11px 18px", cursor: incidentMsg.trim() ? "pointer" : "not-allowed" }}>Push banner</button>
          <button type="button" onClick={() => act("set_incident", { message: "", active: false, confirm: "CONFIRM" }, "Incident cleared")} style={{ fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--soft)", background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 11, padding: "11px 18px", cursor: "pointer" }}>Clear</button>
          {flagFor("incident_banner")?.enabled && <span style={{ alignSelf: "center", fontSize: 12, fontWeight: 700, color: "#E15656" }}>banner live</span>}
        </div>
      </div>
    </>
  );

  /* ─────────── Section: Marketing / Analytics / Prospects ─────────── */
  const renderMarketing = () => (
    <>
      {sectionTitle("Marketing", "Where growth comes from, and what it costs")}
      {infoBanner("The funnel and channels come from PostHog + payments; attribution and unit economics need UTM capture, marked as setup and never faked.")}
      <div className="adv3-card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Funnel and channels</h2><Badge kind="needs_wiring" /></div>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Wire PostHog's query API (a personal API key + project id) and UTM capture to fill this. Product events already flow to PostHog; only the read-back and attribution are pending.</p>
      </div>
    </>
  );
  const renderAnalytics = () => {
    const ph = analytics?.posthog || { data_state: "needs_wiring", tiles: [] };
    const phTiles = ph.tiles && ph.tiles.length ? ph.tiles : [{ label: "Weekly active users", value: "—" }, { label: "Activation rate", value: "—" }, { label: "30 day retention", value: "—" }];
    return (
      <>
        {sectionTitle("Analytics", "Product analytics from PostHog, web analytics from Google")}
        <div className="adv3-card" style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>PostHog</h2><Badge kind={ph.data_state === "real" ? "live" : "needs_wiring"} /></div>
          <div className="adv3-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {phTiles.map((t) => (
              <div key={t.label} style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--surface3)" }}><p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>{t.label}</p><p style={{ margin: "10px 0 0", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{t.value}</p></div>
            ))}
          </div>
          {ph.data_state !== "real" && <p style={{ margin: "14px 2px 0", fontSize: 12, color: "var(--muted2)" }}>{ph.reason || "Set POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID to fill these."}</p>}
        </div>
        <div className="adv3-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Google Analytics</h2><Badge kind="ga" /></div>
          <div className="adv3-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {["Sessions", "Traffic sources", "Landing pages"].map((l) => (
              <div key={l} style={{ border: "1px dashed #E6D9B8", borderRadius: 16, padding: 16, background: "#FEFBF3" }}><p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>{l}</p><p style={{ margin: "10px 0 0", fontSize: 20, fontWeight: 800, color: AMBER }}>—</p></div>
            ))}
          </div>
          <p style={{ margin: "14px 2px 0", fontSize: 12, color: "var(--muted2)" }}>{analytics?.ga?.reason || "Connect a GA4 property id + service account (Data API) to fill these."}</p>
        </div>
      </>
    );
  };
  const renderProspects = () => (
    <>
      {sectionTitle("Prospect radar", "A read only B2B outreach list for the HR side")}
      {infoBanner("Read only and never public. The full radar lives on its own page.", "grey")}
      <div className="adv3-card" style={{ padding: 22 }}>
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--soft)" }}>Prospect Radar is built from your accumulated Scout jobs and is owner-only.</p>
        <Link to="/admin/prospects" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: ACCENT, borderRadius: 12, padding: "12px 18px", textDecoration: "none" }}>Open Prospect Radar</Link>
      </div>
    </>
  );

  const renderSection = () => {
    switch (sec) {
      case "users": return renderUsers();
      case "ops": return renderOps();
      case "plans": return renderPlans();
      case "emergency": return renderEmergency();
      case "access": return renderAccess();
      case "marketing": return renderMarketing();
      case "analytics": return renderAnalytics();
      case "prospects": return renderProspects();
      default: return renderOverview();
    }
  };

  /* ─────────── Drawer quick actions ─────────── */
  const drawerFacts = sel ? [
    { label: "Plan", value: planLabelFrom(sel), color: "var(--text)" },
    { label: "Pro access", value: sel.pro_access_expires_at && new Date(sel.pro_access_expires_at) > new Date() ? `until ${new Date(sel.pro_access_expires_at).toLocaleDateString()}` : "no active plan", color: sel.pro_access_expires_at && new Date(sel.pro_access_expires_at) > new Date() ? "var(--text)" : "var(--muted2)" },
    { label: "CVs built", value: selExtra.cvN == null ? "…" : String(selExtra.cvN), color: "var(--text)" },
    { label: "Lifetime paid", value: selExtra.lifetime ? (Object.entries(selExtra.lifetime).map(([c, v]) => `${c} ${v}`).join(", ") || "none") : "…", color: GREEN },
  ] : [];

  const safeControls = sel ? [
    { label: "Grant access", icon: "check", kind: "good", run: () => setGrant({ email: sel.email, portal: portalOf(sel.user_type), plan: portalOf(sel.user_type) === "hr" ? "Foundation" : "Active Hunter", duration: "full" }) },
    { label: "Set plan", icon: "tag", kind: "primary", run: () => setGrant({ email: sel.email, portal: portalOf(sel.user_type), plan: portalOf(sel.user_type) === "hr" ? "Foundation" : "Active Hunter", duration: "30" }) },
    { label: "Manual unlock", icon: "key", kind: "primary", run: () => act("manual_unlock", { email: sel.email, service: "linkedin_optimizer" }, "Unlock LinkedIn") },
    { label: "Add credits", icon: "plus", kind: "primary", run: () => act("add_credits", { email: sel.email, kind: "download", amount: 1 }, "Add credit") },
    { label: "Reset password", icon: "lock", kind: "plain", run: () => act("reset_password", { email: sel.email }, "Reset email") },
    { label: "Resend verify", icon: "mail", kind: "plain", run: () => act("resend_verification", { email: sel.email }, "Resend") },
    { label: "View as user", icon: "eye", kind: "plain", run: async () => { const r = await callAdmin("view_as", { email: sel.email }); if (r.action_link) { window.open(r.action_link, "_blank", "noopener"); showToast("Magic link opened (time-boxed)"); } else showToast(`View-as failed: ${r.reason || r.error}`, false); } },
    { label: "Export data", icon: "down", kind: "plain", run: () => { const url = URL.createObjectURL(new Blob([JSON.stringify(sel, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = `${sel.email}.json`; a.click(); URL.revokeObjectURL(url); showToast("Exported"); } },
  ] : [];
  const ctlColors = { good: ["#E6F7F0", "#C6ECDB", "#1F8A4C"], primary: ["#EDF1FF", "#DCE6FF", "#4C6FFF"], plain: ["var(--card)", "var(--border2)", "var(--soft)"] };

  const dangerControls = sel ? [
    { label: sel.account_status === "suspended" ? "Unsuspend" : "Suspend", desc: "Blocks sign in (soft)", run: () => act(sel.account_status === "suspended" ? "unsuspend" : "suspend", { email: sel.email, reason: "admin action" }, sel.account_status === "suspended" ? "Unsuspend" : "Suspend") },
    { label: "Anonymize", desc: "Scrub email, keep rows", run: () => act("delete_or_anonymize", { email: sel.email, mode: "anonymize" }, "Anonymize") },
    { label: "Refund latest", desc: selExtra.latestPayment ? `${selExtra.latestPayment.currency} ${selExtra.latestPayment.amount}` : "no payment on file", run: () => { if (!selExtra.latestPayment?.payment_intent_id) { showToast("No refundable payment on file", false); return; } act("refund", { paymentIntentId: selExtra.latestPayment.payment_intent_id }, "Refund"); } },
  ] : [];

  const newControls = sel ? [
    { label: "Generate payment link", desc: "Ziina for AED, Razorpay for INR", run: async () => { const port = portalOf(sel.user_type); const r = await callAdmin("payment_link", { email: sel.email, portal: port, plan: port === "hr" ? "foundation" : "ACTIVE_HUNTER", currency: "AED" }); if (r.url) { try { await navigator.clipboard.writeText(r.url); } catch { /* ignore */ } window.open(r.url, "_blank", "noopener"); showToast("Test link created + copied"); } else showToast(`Link failed: ${r.reason || r.error}`, false); } },
    { label: "Grant, already paid", desc: "For someone charged but not provisioned", run: () => { const port = portalOf(sel.user_type); act("reconcile", { email: sel.email, portal: port, plan: port === "hr" ? undefined : "ACTIVE_HUNTER", currency: "AED", amountMinor: getServerMinor(port) }, "Reconcile"); } },
  ] : [];
  function getServerMinor(port) { const slug = port === "hr" ? "foundation" : "active_hunter"; return (TIERS[slug]?.prices?.AED || 0) * 100; }

  return (
    <div className="adv3-root" data-theme={mode} style={themeVars}>
      <NoIndex />
      <div className="adv3-shell">
        {/* Sidebar */}
        <aside className="adv3-sidebar">
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 20px" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#4C6FFF,#8B6DE8)", color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800 }}>CV</span>
            <div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 15, fontWeight: 700 }}>CVPassport</div><div style={{ fontSize: 11.5, color: "var(--muted2)" }}>Command center</div></div>
          </div>
          {NAV.map((g) => (
            <div key={g.group} style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px 10px", fontSize: 11, fontWeight: 700, color: "var(--faint)" }}>{g.group}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {g.items.map((n) => { const on = sec === n.id; const em = n.id === "emergency"; return (
                  <button key={n.id} type="button" className="adv3-nav-item" onClick={() => setSec(n.id)}
                    style={{ background: on ? (em ? "#FDECEC" : "#EDF1FF") : "transparent", color: on ? (em ? "#D05252" : ACCENT) : "var(--soft)", fontWeight: on ? 700 : 500 }}>
                    <span style={{ display: "flex", width: 19, color: on ? (em ? "#D05252" : ACCENT) : "var(--muted2)" }}><Ico n={n.icon} size={19} color={on ? (em ? "#D05252" : ACCENT) : "var(--muted2)"} /></span>
                    <span style={{ flex: 1 }}>{n.label}</span>
                    {n.badge && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "#F26D6D", borderRadius: 999, padding: "1px 8px" }}>{n.badge}</span>}
                  </button>
                ); })}
              </div>
            </div>
          ))}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 11, padding: 11, borderRadius: 15, background: "var(--surface2)" }}>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#4C6FFF,#8B6DE8)", color: "#fff", fontSize: 12.5, fontWeight: 700, display: "grid", placeItems: "center" }}>JK</span>
            <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>Owner</div><div style={{ fontSize: 11, color: "#2FB37C", fontWeight: 600 }}>signed in</div></div>
          </div>
        </aside>

        {/* Main */}
        <div className="adv3-main">
          <div style={{ height: 74, flexShrink: 0, padding: "0 26px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--border)" }}>
            <div className="adv3-mobilebar" style={{ alignItems: "center", gap: 8, marginRight: 8 }}>
              <select value={sec} onChange={(e) => setSec(e.target.value)} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "var(--text)", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "8px 10px" }}>
                {NAV.flatMap((g) => g.items).map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, maxWidth: 500, display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", borderRadius: 14, background: "var(--bg)" }}>
              <Ico n="search" size={17} color="#97A0B4" />
              <input value={q} onChange={(e) => { setQ(e.target.value); if (sec !== "users") setSec("users"); }} placeholder="Search anyone by email" style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: "var(--text)", fontFamily: "inherit", fontSize: 14 }} />
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <span className="adv3-hide-sm" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "#2FB37C", background: "#E6F7F0", borderRadius: 999, padding: "8px 13px" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2FB37C", animation: "adPulse 2s ease-in-out infinite" }} /> Live</span>
              <button type="button" onClick={() => setMode((m) => (m === "day" ? "night" : "day"))} aria-label="Toggle theme" style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--soft)", cursor: "pointer", display: "grid", placeItems: "center" }}><Ico n={mode === "day" ? "sun" : "moon"} size={17} color="currentColor" /></button>
              <button type="button" onClick={loadAll} aria-label="Refresh" style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--soft)", cursor: "pointer", display: "grid", placeItems: "center" }}><Ico n="target" size={16} color="currentColor" /></button>
            </div>
          </div>
          <div className="adv3-content">{renderSection()}</div>
        </div>
      </div>

      {/* ── User drawer ── */}
      {sel && (
        <>
          <div className="adv3-drawer-scrim" onClick={() => setSel(null)} />
          <div className="adv3-drawer">
            <div style={{ flexShrink: 0, padding: "24px 24px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 52, height: 52, borderRadius: "50%", background: avatar(sel.email)[0], color: avatar(sel.email)[1], fontSize: 17, fontWeight: 700, display: "grid", placeItems: "center" }}>{initials(sel.email)}</span>
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: 17, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.email}</p><p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--muted2)" }}>{portalOf(sel.user_type) === "hr" ? "HR employer" : "Candidate"} · joined {timeAgo(sel.created_at)}</p></div>
                <button type="button" onClick={() => setSel(null)} style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center" }}><Ico n="close" size={16} color="currentColor" /></button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: planChip(planLabelFrom(sel)).color, background: planChip(planLabelFrom(sel)).bg, borderRadius: 999, padding: "5px 11px" }}>{planLabelFrom(sel)}</span>
                {sel.account_status === "suspended" && <span style={{ fontSize: 12, fontWeight: 600, color: RED, background: "#FDECEC", borderRadius: 999, padding: "5px 11px" }}>Suspended</span>}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 22 }}>
                {drawerFacts.map((f) => (
                  <div key={f.label} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "var(--surface3)" }}><p style={{ margin: "0 0 7px", fontSize: 12, color: "var(--muted2)" }}>{f.label}</p><p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: f.color, wordBreak: "break-word" }}>{f.value}</p></div>
                ))}
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Quick actions</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
                {safeControls.map((c) => { const [bg, border, color] = ctlColors[c.kind]; return (
                  <button key={c.label} type="button" onClick={c.run} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 13, border: `1px solid ${border}`, background: bg, color, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <span style={{ display: "flex", width: 17 }}><Ico n={c.icon} size={16} color={color} /></span><span>{c.label}</span>
                  </button>
                ); })}
              </div>
              <button type="button" onClick={() => setGrant({ email: sel.email, portal: portalOf(sel.user_type), plan: portalOf(sel.user_type) === "hr" ? "Foundation" : "Active Hunter", duration: "full" })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginBottom: 20, height: 46, borderRadius: 13, border: 0, background: ACCENT, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><Ico n="plus" size={17} color="#fff" /> Grant access, choose portal and plan</button>
              <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 700 }}>Payment help <Badge kind="neu" /></p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted2)" }}>Generate a link, or grant to someone who already paid (test mode)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                {newControls.map((n) => (
                  <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #DCE6FF", borderRadius: 14, padding: "13px 15px", background: "#F7F9FF" }}>
                    <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#1B2233" }}>{n.label}</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#97A0B4" }}>{n.desc}</p></div>
                    <button type="button" onClick={n.run} style={{ flexShrink: 0, height: 36, padding: "0 16px", borderRadius: 10, border: 0, background: ACCENT, color: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Run</button>
                  </div>
                ))}
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: RED }}>Money and destructive</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {dangerControls.map((d) => (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #F6D9D9", borderRadius: 14, padding: "14px 16px", background: "#FEF7F7" }}>
                    <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#1B2233" }}>{d.label}</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#B58A8A" }}>{d.desc}</p></div>
                    <HoldButton onConfirm={d.run} style={{ flexShrink: 0, height: 36, padding: "0 15px", borderRadius: 10, border: "1px solid #F3C7C7", background: "var(--card)", color: RED, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>hold</HoldButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Grant modal ── */}
      {grant && (
        <>
          <div className="adv3-modal-scrim" onClick={() => setGrant(null)} />
          <div className="adv3-modal">
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}><h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>Grant access</h2><p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--muted2)" }}>Give a plan directly, whether or not they are a user</p></div>
              <button type="button" onClick={() => setGrant(null)} style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center" }}><Ico n="close" size={16} color="currentColor" /></button>
            </div>
            <div style={{ padding: "20px 24px 6px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--soft)" }}>Email</p>
              <input value={grant.email} onChange={(e) => setGrant((g) => ({ ...g, email: e.target.value }))} placeholder="name@company.com" style={{ width: "100%", padding: "13px 15px", borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              {grant.email && !users.some((u) => (u.email || "").toLowerCase() === grant.email.trim().toLowerCase()) && (
                <p style={{ margin: "9px 0 0", fontSize: 12, color: VIOLET }}>New person — a pending grant is saved and resolves on signup.</p>
              )}
              <p style={{ margin: "20px 0 9px", fontSize: 12, fontWeight: 700, color: "var(--soft)" }}>1 · Portal</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {["candidate", "hr"].map((p) => { const on = grant.portal === p; return (
                  <button key={p} type="button" onClick={() => setGrant((g) => ({ ...g, portal: p, plan: p === "hr" ? "Foundation" : "Active Hunter" }))} style={{ padding: 13, borderRadius: 12, border: `1.5px solid ${on ? (p === "hr" ? VIOLET : ACCENT) : "var(--border2)"}`, background: on ? (p === "hr" ? "#F1ECFC" : "#EDF1FF") : "var(--card)", color: on ? (p === "hr" ? VIOLET : ACCENT) : "var(--soft)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{p === "hr" ? "HR employer" : "Candidate"}</button>
                ); })}
              </div>
              <p style={{ margin: "20px 0 9px", fontSize: 12, fontWeight: 700, color: "var(--soft)" }}>2 · Plan</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {(grant.portal === "hr" ? [{ label: "Foundation", price: "AED 99 / INR 999" }] : [{ label: "Express Pass", price: "AED 19" }, { label: "Active Hunter", price: "AED 29" }, { label: "Career Pro", price: "AED 169" }]).map((pl) => { const on = grant.plan === pl.label; return (
                  <button key={pl.label} type="button" onClick={() => setGrant((g) => ({ ...g, plan: pl.label }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", borderRadius: 12, border: `1.5px solid ${on ? ACCENT : "var(--border2)"}`, background: on ? "#EDF1FF" : "var(--card)", color: on ? ACCENT : "var(--text)", fontFamily: "inherit", cursor: "pointer" }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>{pl.label}</span><span style={{ fontSize: 12, color: on ? ACCENT : "var(--muted2)" }}>{pl.price}</span></button>
                ); })}
              </div>
              <p style={{ margin: "20px 0 9px", fontSize: 12, fontWeight: 700, color: "var(--soft)" }}>3 · Duration</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[{ k: "full", l: "Full access" }, { k: "30", l: "30 days" }, { k: "custom", l: "Custom date" }].map((d) => { const on = grant.duration === d.k; return (
                  <button key={d.k} type="button" onClick={() => setGrant((g) => ({ ...g, duration: d.k }))} style={{ padding: 11, borderRadius: 11, border: 0, background: on ? ACCENT : "var(--bg)", color: on ? "#fff" : "var(--soft)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{d.l}</button>
                ); })}
              </div>
              {grant.duration === "custom" && <input type="date" value={grant.custom || ""} onChange={(e) => setGrant((g) => ({ ...g, custom: e.target.value }))} style={{ width: "100%", marginTop: 10, padding: "12px 14px", borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "inherit", fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />}
            </div>
            <div style={{ padding: "16px 24px 22px" }}>
              <button type="button" onClick={submitGrant} disabled={grant.busy} style={{ width: "100%", height: 50, borderRadius: 14, border: 0, background: grant.done ? "#2FB37C" : ACCENT, color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, opacity: grant.busy ? 0.7 : 1 }}>
                {grant.done ? <><Ico n="check" size={18} color="#fff" /> Access granted</> : `Grant ${grant.plan} on ${grant.portal === "hr" ? "HR employer" : "Candidate"}`}
              </button>
              <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--faint)", lineHeight: 1.55 }}>A new email is stored as a pending grant that resolves on signup. An existing user is provisioned now. Both are audited.</p>
            </div>
          </div>
        </>
      )}

      {toast && <div className="adv3-toast" style={{ background: toast.ok ? "#111827" : "#B84343", color: "#fff" }}>{toast.text}</div>}
    </div>
  );
}
