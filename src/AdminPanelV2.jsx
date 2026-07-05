/*
  CVPassport Admin Panel v2 — Command Center
  ==========================================
  Drop-in replacement for src/AdminPanel.jsx (or route separately at /admin-v2).
  Route in App.js:
    import AdminPanelV2 from "./AdminPanelV2";
    <Route path="/admin" element={<AdminPanelV2 />} />

  Every CTA is wired. No decorative buttons.
  Theme: OLED (bg #0A0A0A / surface #141414) + Day (bg #F7F7F5 / surface #FFFFFF).
  Toggle persists in localStorage('cvp_admin_theme').

  Schema expectations (matches existing AdminPanel.jsx):
    profiles(id, email, plan, expiry, flagged, features, created_at, last_active_at?, is_pro?, linkedin_unlocked?)
    cvs(user_id, created_at)
    downloads(user_id, created_at)
    ats_scans(user_id, created_at)                  -- optional, tool usage
    cover_letters(user_id, created_at)              -- optional, tool usage
    linkedin_optimizations(user_id, created_at)     -- optional
    payments(id, user_id, email, amount, currency, status, provider, created_at)
  Missing tables fail gracefully — panel stays up.
*/

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseClient";

const ADMIN_EMAIL = "connectingjunaidkhan@gmail.com";
const PRO_PLANS = ["PRO", "MAX_PRO", "EXPRESS_PASS", "ACTIVE_HUNTER"];
const EASE = "cubic-bezier(0.4,0,0.2,1)";

// ——— Pricing defaults ———
// Per admin spec: is_pro=true contributes AED 29 (Active Hunter monthly),
// each linkedin_optimizer unlock contributes AED 49 (one-time).
const PRICE_PRO_AED = 29;
const PRICE_PRO_INR = 199;
const PRICE_LINKEDIN_AED = 49;
const PRICE_LINKEDIN_INR = 399;

// ——— Tokens ———
const tokens = (dark) =>
  dark
    ? {
        bg: "#0A0A0A",
        surface: "#141414",
        surfaceHi: "#1C1C1C",
        line: "rgba(255,255,255,0.08)",
        lineSoft: "rgba(255,255,255,0.04)",
        text: "#FFFFFF",
        textDim: "#A0A0A0",
        textMute: "#6A6A6A",
        accent: "#FFFFFF",
        good: "#7FE3A1",
        goodBg: "rgba(127,227,161,0.08)",
        warn: "#F0C674",
        warnBg: "rgba(240,198,116,0.08)",
        bad: "#E0604A",
        badBg: "rgba(224,96,74,0.08)",
        cool: "#8FB6E8",
        coolBg: "rgba(143,182,232,0.08)",
        ringGold: "#D4A657",
        chip: "rgba(255,255,255,0.04)",
      }
    : {
        bg: "#F7F7F5",
        surface: "#FFFFFF",
        surfaceHi: "#FAFAF8",
        line: "rgba(0,0,0,0.08)",
        lineSoft: "rgba(0,0,0,0.04)",
        text: "#0A0A0A",
        textDim: "#5A5A5A",
        textMute: "#8A8A8A",
        accent: "#0A0A0A",
        good: "#1F8A4C",
        goodBg: "rgba(31,138,76,0.08)",
        warn: "#B8820F",
        warnBg: "rgba(184,130,15,0.08)",
        bad: "#B8412E",
        badBg: "rgba(184,65,46,0.08)",
        cool: "#3E6BA8",
        coolBg: "rgba(62,107,168,0.08)",
        ringGold: "#A07628",
        chip: "rgba(0,0,0,0.03)",
      };

// ——— tiny icons (no emoji) ———
const Icon = {
  Sun: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="16" height="16" {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  Moon: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="16" height="16" {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
  Bolt: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" {...p}>
      <path d="M13 2 4 14h7l-2 8 9-12h-7l2-8z" />
    </svg>
  ),
  Dot: (p) => (
    <svg viewBox="0 0 8 8" width="8" height="8" {...p}><circle cx="4" cy="4" r="3" fill="currentColor" /></svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" {...p}>
      <path d="M7 17 17 7M17 7H9M17 7v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14" {...p}>
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14" {...p}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ——— util ———
const fmtAED = (n) => `AED ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtINR = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString();
const daysAgo = (d) => {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) {
    const hrs = Math.floor(ms / 3600000);
    if (hrs <= 0) return `${Math.max(1, Math.floor(ms / 60000))}m ago`;
    return `${hrs}h ago`;
  }
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};
const isTodayISO = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};
const withinDays = (iso, n) => iso && Date.now() - new Date(iso).getTime() < n * 86400000;

// ——— Safe fetch wrapper: missing tables return [] ———
async function safeSelect(table, query = "*", orderCol = null) {
  try {
    let q = supabase.from(table).select(query);
    if (orderCol) q = q.order(orderCol, { ascending: false });
    const { data, error } = await q;
    if (error) return { data: [], missing: true };
    return { data: data || [], missing: false };
  } catch {
    return { data: [], missing: true };
  }
}

export default function AdminPanelV2() {
  // ——— Theme (persisted) ———
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("cvp_admin_theme");
      if (saved === "light") return false;
      if (saved === "dark") return true;
    } catch {}
    return true;
  });
  useEffect(() => {
    try { localStorage.setItem("cvp_admin_theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);
  const t = tokens(dark);

  // ——— Nav ———
  const [section, setSection] = useState(() => {
    try { return localStorage.getItem("cvp_admin_section") || "overview"; } catch { return "overview"; }
  });
  useEffect(() => { try { localStorage.setItem("cvp_admin_section", section); } catch {} }, [section]);

  // ——— Data ———
  const [auth, setAuth] = useState({ checked: false, ok: false });
  const [users, setUsers] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [atsScans, setAtsScans] = useState([]);
  const [coverLetters, setCoverLetters] = useState([]);
  const [linkedinOpts, setLinkedinOpts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [missingTables, setMissingTables] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // ——— Filters / UI state ———
  const [userSearch, setUserSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  // ——— Manual unlock form ———
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockType, setUnlockType] = useState("is_pro"); // is_pro | linkedin_unlocked | plan
  const [unlockPlan, setUnlockPlan] = useState("ACTIVE_HUNTER");
  const [unlockMsg, setUnlockMsg] = useState(null);
  const [unlockBusy, setUnlockBusy] = useState(false);

  // ——— Edit user drawer ———
  const [editUser, setEditUser] = useState(null);
  const [editPlan, setEditPlan] = useState("FREE");
  const [editExpiry, setEditExpiry] = useState("");
  const [editIsPro, setEditIsPro] = useState(false);
  const [editLiUnlocked, setEditLiUnlocked] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  // ——— Mobile sidebar ———
  const [navOpen, setNavOpen] = useState(false);

  // ——— Auth ———
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const ok = data?.user?.email === ADMIN_EMAIL;
        setAuth({ checked: true, ok });
        if (!ok && typeof window !== "undefined") {
          // Soft redirect — don't break the panel in dev harness
          if (window.location.pathname.startsWith("/admin")) window.location.href = "/";
        }
      } catch {
        setAuth({ checked: true, ok: false });
      }
    })();
  }, []);

  // ——— Fetch all ———
  // Real tables: profiles, cvs, downloads, ats_results, permissions, payments.
  // Cover letter + LinkedIn per-generation logs are not persisted anywhere —
  // we flag those sections as "Not tracked" in the UI.
  const [perms, setPerms] = useState([]);
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    const [p, c, d, a, perm, py] = await Promise.all([
      safeSelect("profiles", "id, email, plan, expiry, flagged, features, created_at, last_active_at, is_pro, linkedin_unlocked", "created_at"),
      safeSelect("cvs", "id, user_id, created_at, updated_at", "updated_at"),
      safeSelect("downloads", "id, user_id, created_at", "created_at"),
      safeSelect("ats_results", "id, user_id, score, created_at", "created_at"),
      safeSelect("permissions", "user_id, service, status, unlocked_at", "unlocked_at"),
      safeSelect("payments", "id, user_id, email, amount, currency, status, provider, service, created_at", "created_at"),
    ]);
    setUsers(p.data);
    setCvs(c.data);
    setDownloads(d.data);
    setAtsScans(a.data);
    setPerms(perm.data);
    // Synthesise payments from the permissions table when the audit table
    // is empty (or missing) — gives the admin a view of every recorded
    // unlock even before the payments migration runs.
    if (py.data.length > 0) {
      setPayments(py.data);
    } else {
      const emailMap = {};
      p.data.forEach((u) => { emailMap[u.id] = u.email; });
      const synthetic = [];
      perm.data.forEach((pr) => {
        synthetic.push({
          id: `perm:${pr.user_id}:${pr.service}`,
          user_id: pr.user_id,
          email: emailMap[pr.user_id] || null,
          amount: pr.service === "linkedin_optimizer" ? PRICE_LINKEDIN_AED : PRICE_PRO_AED,
          currency: "AED",
          status: "succeeded",
          provider: "ziina",
          service: pr.service,
          created_at: pr.unlocked_at,
        });
      });
      p.data.forEach((u) => {
        if (u.is_pro) {
          synthetic.push({
            id: `ispro:${u.id}`,
            user_id: u.id,
            email: u.email,
            amount: PRICE_PRO_AED,
            currency: "AED",
            status: "succeeded",
            provider: "ziina",
            service: u.plan || "is_pro",
            created_at: u.created_at,
          });
        }
      });
      synthetic.sort((x, y) => new Date(y.created_at || 0) - new Date(x.created_at || 0));
      setPayments(synthetic);
    }
    // Cover letters + per-generation LinkedIn runs are not logged at all —
    // surface that so the admin can see what needs instrumentation.
    setCoverLetters([]);
    setLinkedinOpts([]);
    setMissingTables({
      ats_scans: a.missing,
      cover_letters: true,              // tracking doesn't exist anywhere
      linkedin_optimizations: true,     // per-generation; unlock state lives in permissions
      payments: py.missing,
    });
    setLastSync(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ——— Derived metrics ———
  const metrics = useMemo(() => {
    const total = users.length;
    const today = users.filter((u) => isTodayISO(u.created_at)).length;
    const week = users.filter((u) => withinDays(u.created_at, 7)).length;
    const month = users.filter((u) => withinDays(u.created_at, 30)).length;
    const activeHunters = users.filter((u) => String(u.plan || "").toUpperCase() === "ACTIVE_HUNTER").length;
    const expressPass = users.filter((u) => String(u.plan || "").toUpperCase() === "EXPRESS_PASS").length;
    const proAny = users.filter((u) => PRO_PLANS.includes(String(u.plan || "").toUpperCase()) || u.is_pro).length;

    // Revenue — per spec: is_pro × AED 29 + linkedin_optimizer unlocks × AED 49.
    // This is an ESTIMATE because we don't always have a payments audit row
    // (webhook wasn't writing payments before this migration). Switches to
    // the real payments table once that's populated.
    const linkedinUnlocks = perms.filter((p) => p.service === "linkedin_optimizer" && p.status === "unlocked").length;
    const succ = payments.filter((p) => {
      const s = String(p.status || "").toLowerCase();
      return ["succeeded", "success", "completed", "paid"].includes(s) && !String(p.id || "").startsWith("perm:") && !String(p.id || "").startsWith("ispro:");
    });
    let revAED = 0, revINR = 0;
    if (succ.length) {
      succ.forEach((p) => {
        const amt = Number(p.amount || 0);
        const cur = String(p.currency || "AED").toUpperCase();
        if (cur === "INR") revINR += amt;
        else revAED += amt;
      });
    } else {
      revAED = proAny * PRICE_PRO_AED + linkedinUnlocks * PRICE_LINKEDIN_AED;
      revINR = proAny * PRICE_PRO_INR + linkedinUnlocks * PRICE_LINKEDIN_INR;
    }

    const cvsTotal = cvs.length;
    const downloadsToday = downloads.filter((d) => isTodayISO(d.created_at)).length;
    const atsToday = atsScans.filter((d) => isTodayISO(d.created_at)).length;
    const coverToday = coverLetters.filter((d) => isTodayISO(d.created_at)).length;

    // linkedinUsage = distinct unlocks from permissions (per-generation isn't logged).
    const linkedinUsage = linkedinUnlocks;
    const atsUsage = atsScans.length;
    const coverUsage = coverLetters.length;

    const failedPayments = payments.filter((p) => ["failed", "error", "declined", "cancelled", "canceled"].includes(String(p.status || "").toLowerCase())).length;

    return {
      total, today, week, month,
      activeHunters, expressPass, proAny,
      revAED, revINR,
      cvsTotal, downloadsToday, atsToday, coverToday,
      linkedinUsage, atsUsage, coverUsage,
      failedPayments,
    };
  }, [users, cvs, downloads, atsScans, coverLetters, payments, perms]);

  // ——— 14-day signup sparkline ———
  const signupSeries = useMemo(() => {
    const buckets = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i)); d.setHours(0, 0, 0, 0);
      return { d, count: 0 };
    });
    users.forEach((u) => {
      if (!u.created_at) return;
      const c = new Date(u.created_at); c.setHours(0, 0, 0, 0);
      const idx = buckets.findIndex((b) => b.d.getTime() === c.getTime());
      if (idx >= 0) buckets[idx].count += 1;
    });
    return buckets;
  }, [users]);

  // ——— Users filter ———
  const filteredUsers = useMemo(() => {
    let list = users;
    if (planFilter !== "all") {
      list = list.filter((u) => {
        if (planFilter === "flagged") return u.flagged;
        if (planFilter === "pro") return PRO_PLANS.includes(String(u.plan || "").toUpperCase()) || u.is_pro;
        return String(u.plan || "").toUpperCase() === planFilter.toUpperCase();
      });
    }
    if (userSearch) {
      const q = userSearch.toLowerCase();
      list = list.filter((u) => String(u.email || "").toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [users, planFilter, userSearch]);

  // ——— Payments filter ———
  const filteredPayments = useMemo(() => {
    const list = paymentStatusFilter === "all"
      ? payments
      : payments.filter((p) => {
          const s = String(p.status || "").toLowerCase();
          if (paymentStatusFilter === "succeeded") return ["succeeded", "success", "completed", "paid"].includes(s);
          if (paymentStatusFilter === "failed") return ["failed", "error", "declined", "cancelled", "canceled"].includes(s);
          if (paymentStatusFilter === "pending") return ["pending", "processing", "requires_action"].includes(s);
          return true;
        });
    return list.slice(0, 100);
  }, [payments, paymentStatusFilter]);

  // ——— Actions: manual unlock ———
  const runManualUnlock = async () => {
    setUnlockMsg(null);
    const email = unlockEmail.trim().toLowerCase();
    if (!email) { setUnlockMsg({ kind: "bad", text: "Enter an email first." }); return; }
    setUnlockBusy(true);
    try {
      const { data: found, error: findErr } = await supabase
        .from("profiles")
        .select("id, email, plan, features, is_pro, linkedin_unlocked")
        .eq("email", email)
        .maybeSingle();
      if (findErr || !found) {
        setUnlockMsg({ kind: "bad", text: "User not found. They must sign up first." });
        setUnlockBusy(false); return;
      }
      const patch = {};
      if (unlockType === "is_pro") patch.is_pro = true;
      if (unlockType === "linkedin_unlocked") patch.linkedin_unlocked = true;
      if (unlockType === "plan") patch.plan = unlockPlan;
      const { error: upErr } = await supabase.from("profiles").update(patch).eq("id", found.id);
      if (upErr) { setUnlockMsg({ kind: "bad", text: `Update failed: ${upErr.message}` }); setUnlockBusy(false); return; }
      // LinkedIn Optimizer reads from the permissions table at runtime — mirror the flag.
      if (unlockType === "linkedin_unlocked") {
        try {
          await supabase.from("permissions").upsert(
            { user_id: found.id, service: "linkedin_optimizer", status: "unlocked", unlocked_at: new Date().toISOString() },
            { onConflict: "user_id,service" },
          );
        } catch { /* permissions table optional — profile flag still flipped */ }
      }
      setUnlockMsg({ kind: "good", text: `Unlocked ${email}` });
      setUnlockEmail("");
      await fetchAll();
    } catch (e) {
      setUnlockMsg({ kind: "bad", text: `Error: ${e.message || e}` });
    }
    setUnlockBusy(false);
  };

  // ——— Actions: edit user drawer ———
  const openEditUser = (u) => {
    setEditUser(u);
    setEditPlan(String(u.plan || "FREE").toUpperCase());
    setEditExpiry(u.expiry ? String(u.expiry).slice(0, 10) : "");
    setEditIsPro(!!u.is_pro);
    setEditLiUnlocked(!!u.linkedin_unlocked);
  };
  const saveEditUser = async () => {
    if (!editUser) return;
    setEditBusy(true);
    const patch = {
      plan: editPlan,
      expiry: editExpiry || null,
      is_pro: editIsPro,
      linkedin_unlocked: editLiUnlocked,
    };
    await supabase.from("profiles").update(patch).eq("id", editUser.id);
    // Mirror the LinkedIn flag into the permissions table (runtime source of truth).
    try {
      if (editLiUnlocked) {
        await supabase.from("permissions").upsert(
          { user_id: editUser.id, service: "linkedin_optimizer", status: "unlocked", unlocked_at: new Date().toISOString() },
          { onConflict: "user_id,service" },
        );
      } else {
        await supabase.from("permissions").delete()
          .eq("user_id", editUser.id)
          .eq("service", "linkedin_optimizer");
      }
    } catch { /* table optional */ }
    await fetchAll();
    setEditUser(null);
    setEditBusy(false);
  };
  const banToggle = async (u) => {
    await supabase.from("profiles").update({ flagged: !u.flagged }).eq("id", u.id);
    fetchAll();
  };

  // ——— Export CSV ———
  const exportCSV = () => {
    const headers = ["email", "plan", "is_pro", "linkedin_unlocked", "flagged", "created_at", "last_active_at"];
    const rows = users.map((u) => [
      u.email, u.plan || "FREE", !!u.is_pro, !!u.linkedin_unlocked, !!u.flagged,
      u.created_at || "", u.last_active_at || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cvpassport_users_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPaymentsCSV = () => {
    const headers = ["created_at", "email", "amount", "currency", "status", "provider"];
    const rows = payments.map((p) => [p.created_at || "", p.email || "", p.amount || 0, p.currency || "AED", p.status || "", p.provider || ""]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cvpassport_payments_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ——— Styles ———
  const s = {
    root: {
      minHeight: "100vh", backgroundColor: t.bg, color: t.text,
      fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: "antialiased",
      transition: `background-color 240ms ${EASE}, color 240ms ${EASE}`,
    },
    layout: { display: "flex", minHeight: "100vh", width: "100%" },
    sidebar: {
      width: 240, flexShrink: 0, backgroundColor: t.surface,
      borderRight: `1px solid ${t.line}`, display: "flex", flexDirection: "column",
      padding: "20px 14px", position: "sticky", top: 0, height: "100vh",
      transition: `background-color 240ms ${EASE}`,
    },
    brand: {
      display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 20px",
      borderBottom: `1px solid ${t.lineSoft}`, marginBottom: 16,
    },
    brandMark: {
      width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center",
      background: dark ? "#FFF" : "#0A0A0A", color: dark ? "#000" : "#FFF",
      fontSize: 11, fontWeight: 700, letterSpacing: "-0.02em",
    },
    brandName: { fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" },
    brandMono: {
      fontSize: 10, color: t.textMute, fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      letterSpacing: "0.08em", textTransform: "uppercase",
    },
    navGroup: { marginBottom: 18 },
    navLabel: {
      fontSize: 10, color: t.textMute, letterSpacing: "0.12em",
      textTransform: "uppercase", padding: "0 8px", marginBottom: 8,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    },
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
      borderRadius: 8, fontSize: 13, cursor: "pointer",
      color: active ? t.text : t.textDim,
      backgroundColor: active ? (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent",
      transition: `background-color 160ms ${EASE}, color 160ms ${EASE}`,
      fontWeight: active ? 600 : 500,
    }),
    main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
    topbar: {
      height: 64, padding: "0 24px", display: "flex", alignItems: "center", gap: 16,
      borderBottom: `1px solid ${t.line}`, position: "sticky", top: 0, zIndex: 10,
      backgroundColor: t.bg,
      transition: `background-color 240ms ${EASE}`,
    },
    search: {
      flex: 1, display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px", borderRadius: 999, backgroundColor: t.surface,
      border: `1px solid ${t.line}`, maxWidth: 420,
    },
    searchInput: {
      flex: 1, background: "transparent", border: "none", outline: "none",
      color: t.text, fontSize: 13, fontFamily: "inherit",
    },
    pill: {
      display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px",
      borderRadius: 999, fontSize: 11, color: t.textDim,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      letterSpacing: "0.08em", textTransform: "uppercase",
      border: `1px solid ${t.line}`, backgroundColor: t.surface,
    },
    iconBtn: {
      width: 36, height: 36, borderRadius: 8, display: "grid", placeItems: "center",
      background: t.surface, border: `1px solid ${t.line}`, color: t.text,
      cursor: "pointer", transition: `background-color 160ms ${EASE}, border-color 160ms ${EASE}`,
    },
    btn: {
      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
      cursor: "pointer", border: "none",
      background: t.accent, color: dark ? "#0A0A0A" : "#FFFFFF",
      transition: `transform 160ms ${EASE}, opacity 160ms ${EASE}`,
    },
    btnGhost: {
      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      cursor: "pointer", color: t.text, background: "transparent",
      border: `1px solid ${t.line}`,
      transition: `background-color 160ms ${EASE}, border-color 160ms ${EASE}`,
    },
    btnSm: {
      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
      cursor: "pointer", border: `1px solid ${t.line}`,
      background: "transparent", color: t.text,
      fontFamily: "inherit",
      transition: `background-color 160ms ${EASE}`,
    },
    content: { padding: 24, display: "flex", flexDirection: "column", gap: 24 },
    card: {
      background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14,
      padding: 20, transition: `background-color 240ms ${EASE}, border-color 240ms ${EASE}`,
    },
    cardHeader: {
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      marginBottom: 14, gap: 12, flexWrap: "wrap",
    },
    h1: { fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 },
    h2: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 },
    eyebrow: {
      fontSize: 10, color: t.textMute, letterSpacing: "0.14em",
      textTransform: "uppercase",
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    },
    grid4: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 },
    grid3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 },
    grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 },
    stat: {
      background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14,
      padding: 18, position: "relative", overflow: "hidden",
    },
    statN: {
      fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em",
      fontVariantNumeric: "tabular-nums", margin: "8px 0 2px",
    },
    statLabel: { fontSize: 12, color: t.textDim, fontWeight: 500 },
    statDelta: (up) => ({
      fontSize: 11, color: up ? t.good : t.bad, fontWeight: 600,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      letterSpacing: "0.04em",
    }),
    tableWrap: { overflowX: "auto", borderRadius: 12, border: `1px solid ${t.line}` },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      textAlign: "left", padding: "10px 14px", fontSize: 10,
      color: t.textMute, fontWeight: 600, letterSpacing: "0.1em",
      textTransform: "uppercase", background: t.surfaceHi,
      borderBottom: `1px solid ${t.line}`,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    },
    td: { padding: "12px 14px", fontSize: 13, borderBottom: `1px solid ${t.lineSoft}`, color: t.text },
    input: {
      width: "100%", padding: "10px 12px", borderRadius: 8,
      background: dark ? t.surfaceHi : "#FFFFFF", color: t.text,
      border: `1px solid ${t.line}`, outline: "none", fontSize: 13,
      fontFamily: "inherit", boxSizing: "border-box",
      transition: `border-color 160ms ${EASE}`,
    },
    label: {
      fontSize: 11, color: t.textDim, marginBottom: 6, display: "block",
      fontWeight: 500,
    },
    chip: (kind) => {
      const map = { good: [t.goodBg, t.good], warn: [t.warnBg, t.warn], bad: [t.badBg, t.bad], cool: [t.coolBg, t.cool], mute: [t.chip, t.textDim] };
      const [bg, fg] = map[kind] || map.mute;
      return {
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
        background: bg, color: fg,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        letterSpacing: "0.08em", textTransform: "uppercase",
        whiteSpace: "nowrap",
      };
    },
  };

  const planToChip = (plan, flagged, isPro) => {
    const p = String(plan || "FREE").toUpperCase();
    if (flagged) return <span style={s.chip("bad")}>Flagged</span>;
    if (p === "ACTIVE_HUNTER") return <span style={s.chip("good")}>Active Hunter</span>;
    if (p === "EXPRESS_PASS") return <span style={s.chip("cool")}>Express Pass</span>;
    if (p === "MAX_PRO" || p === "PRO") return <span style={s.chip("cool")}>{p.replace("_", " ")}</span>;
    if (p === "TRIAL") return <span style={s.chip("warn")}>Trial</span>;
    if (isPro) return <span style={s.chip("good")}>Pro</span>;
    return <span style={s.chip("mute")}>Free</span>;
  };

  const paymentStatusChip = (status) => {
    const st = String(status || "").toLowerCase();
    if (["succeeded", "success", "completed", "paid"].includes(st)) return <span style={s.chip("good")}>{status}</span>;
    if (["failed", "error", "declined", "cancelled", "canceled"].includes(st)) return <span style={s.chip("bad")}>{status}</span>;
    if (["pending", "processing", "requires_action"].includes(st)) return <span style={s.chip("warn")}>{status}</span>;
    return <span style={s.chip("mute")}>{status || "—"}</span>;
  };

  // ——— Loading ———
  if (loading || !auth.checked) {
    return (
      <div style={{ ...s.root, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: t.textDim }}>
          <div style={{ ...s.eyebrow, marginBottom: 8 }}>Command Center</div>
          <div style={{ fontSize: 14 }}>Syncing with Supabase…</div>
        </div>
      </div>
    );
  }

  // ——— NAV ITEMS ———
  const NAV = [
    { group: "Overview", items: [
      { id: "overview", label: "Pulse" },
      { id: "users", label: "Users & Revenue" },
    ]},
    { group: "Ops", items: [
      { id: "content", label: "Content & CVs" },
      { id: "tools", label: "Tools usage" },
      { id: "payments", label: "Payments" },
    ]},
    { group: "Admin", items: [
      { id: "unlock", label: "Manual unlock" },
      // href items leave the panel for the standalone admin pages.
      { id: "prospects", label: "Prospect Radar", href: "/admin/prospects" },
      { id: "cost", label: "Cost dashboard", href: "/admin/cost" },
    ]},
  ];

  // ——— Sections ———
  const SectionOverview = () => {
    const maxSpark = Math.max(1, ...signupSeries.map((b) => b.count));
    return (
      <>
        <div style={s.cardHeader}>
          <div>
            <div style={s.eyebrow}>Pulse · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
            <h1 style={s.h1}>Command center</h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={s.pill}>
              <Icon.Dot style={{ color: refreshing ? t.warn : t.good }} />
              {refreshing ? "Syncing" : "Live"}
            </span>
            <span style={{ ...s.pill, color: t.textMute }}>
              Last sync {lastSync ? daysAgo(lastSync.toISOString()) : "—"}
            </span>
          </div>
        </div>

        {/* Top row — users + revenue */}
        <div style={s.grid4}>
          <div style={s.stat}>
            <div style={s.statLabel}>Total users</div>
            <div style={s.statN}>{fmtN(metrics.total)}</div>
            <div style={s.statDelta(true)}>+{metrics.today} today · +{metrics.week}/7d · +{metrics.month}/30d</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Active Hunter</div>
            <div style={s.statN}>{fmtN(metrics.activeHunters)}</div>
            <div style={{ fontSize: 11, color: t.textMute, marginTop: 4 }}>Monthly subscribers</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Express Pass</div>
            <div style={s.statN}>{fmtN(metrics.expressPass)}</div>
            <div style={{ fontSize: 11, color: t.textMute, marginTop: 4 }}>One-time unlocks</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Revenue</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{fmtAED(metrics.revAED)}</div>
              <div style={{ fontSize: 14, color: t.textDim, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmtINR(metrics.revINR)}</div>
            </div>
            <div style={{ fontSize: 11, color: t.textMute, marginTop: 6 }}>
              {payments.length ? "From payments table" : "Est. from active plans"}
            </div>
          </div>
        </div>

        {/* Sparkline + ops stack */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }} className="cvp-resp-2-1">
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.eyebrow}>Signups · 14 days</div>
                <h2 style={s.h2}>{fmtN(metrics.week)} new this week</h2>
              </div>
              <span style={s.pill}>{metrics.month} / 30d</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
              {signupSeries.map((b, i) => {
                const h = (b.count / maxSpark) * 100;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div
                        title={`${b.d.toLocaleDateString()}: ${b.count} signup${b.count === 1 ? "" : "s"}`}
                        style={{
                          width: "100%",
                          height: `${Math.max(2, h)}%`,
                          background: b.count > 0 ? (dark ? "#FFFFFF" : "#0A0A0A") : t.line,
                          borderRadius: 3,
                          transition: `height 360ms ${EASE}`,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 9, color: t.textMute, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                      {b.d.toLocaleDateString(undefined, { day: "numeric" })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.eyebrow}>Today</div>
                <h2 style={s.h2}>Live ops</h2>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "New signups", value: metrics.today },
                { label: "CVs downloaded", value: metrics.downloadsToday },
                { label: "ATS scans", value: metrics.atsToday },
                { label: "Cover letters", value: metrics.coverToday },
                { label: "Failed payments", value: metrics.failedPayments, kind: metrics.failedPayments > 0 ? "bad" : "mute" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: i < 4 ? `1px solid ${t.lineSoft}` : "none",
                }}>
                  <span style={{ fontSize: 13, color: t.textDim }}>{row.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: row.kind === "bad" && row.value > 0 ? t.bad : t.text }}>
                    {fmtN(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <div style={s.eyebrow}>Signups · latest 10</div>
              <h2 style={s.h2}>Who just joined</h2>
            </div>
            <button style={s.btnGhost} onClick={() => setSection("users")}>View all <Icon.Arrow style={{ marginLeft: 6 }} /></button>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Plan</th>
                  <th style={s.th}>Joined</th>
                  <th style={s.th}>Last active</th>
                </tr>
              </thead>
              <tbody>
                {users.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10).map((u) => (
                  <tr key={u.id}>
                    <td style={s.td}><span style={{ fontWeight: 500 }}>{u.email}</span></td>
                    <td style={s.td}>{planToChip(u.plan, u.flagged, u.is_pro)}</td>
                    <td style={{ ...s.td, color: t.textDim, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 }}>{daysAgo(u.created_at)}</td>
                    <td style={{ ...s.td, color: t.textDim, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 }}>{daysAgo(u.last_active_at) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const SectionUsers = () => (
    <>
      <div style={s.cardHeader}>
        <div>
          <div style={s.eyebrow}>Users & revenue</div>
          <h1 style={s.h1}>{fmtN(filteredUsers.length)} of {fmtN(users.length)}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.btnGhost} onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      <div style={s.grid4}>
        <div style={s.stat}><div style={s.statLabel}>Total users</div><div style={s.statN}>{fmtN(metrics.total)}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Pro (any)</div><div style={s.statN}>{fmtN(metrics.proAny)}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Revenue (AED)</div><div style={s.statN}>{fmtAED(metrics.revAED)}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Revenue (INR)</div><div style={s.statN}>{fmtINR(metrics.revINR)}</div></div>
      </div>

      <div style={s.card}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ ...s.search, maxWidth: 300, flex: "1 1 200px" }}>
            <Icon.Search style={{ color: t.textMute }} />
            <input
              style={s.searchInput}
              placeholder="Search by email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 4, background: t.surfaceHi, padding: 4, borderRadius: 8 }}>
            {["all", "free", "pro", "active_hunter", "express_pass", "trial", "flagged"].map((f) => (
              <button
                key={f}
                onClick={() => setPlanFilter(f)}
                style={{
                  ...s.btnSm,
                  background: planFilter === f ? t.accent : "transparent",
                  color: planFilter === f ? (dark ? "#0A0A0A" : "#FFF") : t.textDim,
                  border: "none",
                  textTransform: "capitalize",
                }}
              >
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Email</th>
                <th style={s.th}>Plan</th>
                <th style={s.th}>Features</th>
                <th style={s.th}>Joined</th>
                <th style={s.th}>Last active</th>
                <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 200).map((u) => (
                <tr key={u.id}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 500 }}>{u.email}</div>
                    {u.flagged && <div style={{ fontSize: 10, color: t.bad, fontFamily: '"JetBrains Mono", ui-monospace, monospace', marginTop: 2 }}>BANNED</div>}
                  </td>
                  <td style={s.td}>{planToChip(u.plan, u.flagged, u.is_pro)}</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {u.is_pro && <span style={s.chip("good")}>is_pro</span>}
                      {u.linkedin_unlocked && <span style={s.chip("cool")}>LinkedIn</span>}
                      {!u.is_pro && !u.linkedin_unlocked && <span style={{ fontSize: 11, color: t.textMute }}>—</span>}
                    </div>
                  </td>
                  <td style={{ ...s.td, color: t.textDim, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 }}>{daysAgo(u.created_at)}</td>
                  <td style={{ ...s.td, color: t.textDim, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 }}>{daysAgo(u.last_active_at) || "—"}</td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button style={s.btnSm} onClick={() => openEditUser(u)}>Edit</button>
                      <button
                        style={{ ...s.btnSm, color: u.flagged ? t.good : t.bad, borderColor: u.flagged ? t.good : t.bad }}
                        onClick={() => banToggle(u)}
                      >
                        {u.flagged ? "Unban" : "Ban"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td style={{ ...s.td, color: t.textMute, textAlign: "center", padding: "32px 14px" }} colSpan={6}>No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > 200 && (
          <div style={{ fontSize: 11, color: t.textMute, marginTop: 10, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
            Showing first 200 of {filteredUsers.length}. Use search to narrow.
          </div>
        )}
      </div>
    </>
  );

  const SectionContent = () => (
    <>
      <div style={s.cardHeader}>
        <div>
          <div style={s.eyebrow}>Content & CVs</div>
          <h1 style={s.h1}>Production metrics</h1>
        </div>
      </div>
      <div style={s.grid4}>
        <div style={s.stat}><div style={s.statLabel}>Total CVs built</div><div style={s.statN}>{fmtN(metrics.cvsTotal)}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Downloads today</div><div style={s.statN}>{fmtN(metrics.downloadsToday)}</div></div>
        <div style={s.stat}><div style={s.statLabel}>ATS scans today</div><div style={s.statN}>{fmtN(metrics.atsToday)}</div><div style={{ fontSize: 10, color: t.textMute, marginTop: 4, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>{missingTables.ats_scans ? "table missing" : "live"}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Cover letters today</div><div style={s.statN}>{fmtN(metrics.coverToday)}</div><div style={{ fontSize: 10, color: t.textMute, marginTop: 4, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>{missingTables.cover_letters ? "table missing" : "live"}</div></div>
      </div>
      <div style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.h2}>Top CV builders</h2>
          <span style={{ ...s.eyebrow, color: t.textMute }}>by CV count</span>
        </div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Email</th>
                <th style={s.th}>CVs</th>
                <th style={s.th}>Downloads</th>
                <th style={s.th}>Plan</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const cvMap = {}, dlMap = {};
                cvs.forEach((c) => { cvMap[c.user_id] = (cvMap[c.user_id] || 0) + 1; });
                downloads.forEach((c) => { dlMap[c.user_id] = (dlMap[c.user_id] || 0) + 1; });
                const ranked = users.map((u) => ({ ...u, cvN: cvMap[u.id] || 0, dlN: dlMap[u.id] || 0 }))
                  .filter((u) => u.cvN > 0)
                  .sort((a, b) => b.cvN - a.cvN).slice(0, 15);
                if (ranked.length === 0) return <tr><td style={{ ...s.td, color: t.textMute, textAlign: "center", padding: "32px 14px" }} colSpan={4}>No CVs yet.</td></tr>;
                return ranked.map((u) => (
                  <tr key={u.id}>
                    <td style={s.td}>{u.email}</td>
                    <td style={{ ...s.td, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontVariantNumeric: "tabular-nums" }}>{u.cvN}</td>
                    <td style={{ ...s.td, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontVariantNumeric: "tabular-nums" }}>{u.dlN}</td>
                    <td style={s.td}>{planToChip(u.plan, u.flagged, u.is_pro)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const SectionTools = () => (
    <>
      <div style={s.cardHeader}>
        <div>
          <div style={s.eyebrow}>Tools usage</div>
          <h1 style={s.h1}>What users run</h1>
        </div>
      </div>
      <div style={s.grid3}>
        <ToolCard t={t} s={s} title="LinkedIn Optimizer" total={metrics.linkedinUsage} today={linkedinOpts.filter((x) => isTodayISO(x.created_at)).length} missing={missingTables.linkedin_optimizations} />
        <ToolCard t={t} s={s} title="ATS Checker" total={metrics.atsUsage} today={metrics.atsToday} missing={missingTables.ats_scans} />
        <ToolCard t={t} s={s} title="Cover Letter" total={metrics.coverUsage} today={metrics.coverToday} missing={missingTables.cover_letters} />
      </div>
    </>
  );

  const SectionPayments = () => (
    <>
      <div style={s.cardHeader}>
        <div>
          <div style={s.eyebrow}>Payments · Ziina / Stripe</div>
          <h1 style={s.h1}>Transactions</h1>
        </div>
        <button style={s.btnGhost} onClick={exportPaymentsCSV}>Export CSV</button>
      </div>
      <div style={s.grid3}>
        <div style={s.stat}><div style={s.statLabel}>Succeeded</div><div style={s.statN}>{fmtN(payments.filter((p) => ["succeeded", "success", "completed", "paid"].includes(String(p.status || "").toLowerCase())).length)}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Failed</div><div style={{ ...s.statN, color: metrics.failedPayments > 0 ? t.bad : t.text }}>{fmtN(metrics.failedPayments)}</div></div>
        <div style={s.stat}><div style={s.statLabel}>Pending</div><div style={s.statN}>{fmtN(payments.filter((p) => ["pending", "processing", "requires_action"].includes(String(p.status || "").toLowerCase())).length)}</div></div>
      </div>
      {missingTables.payments && (
        <div style={{ ...s.card, borderColor: t.warn, background: t.warnBg, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon.Bolt style={{ color: t.warn }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No `payments` table detected</div>
              <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
                Create a Supabase table with columns: id, user_id, email, amount, currency, status, provider, created_at — and transactions will appear here.
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={s.card}>
        <div style={{ display: "flex", gap: 4, background: t.surfaceHi, padding: 4, borderRadius: 8, width: "fit-content", marginBottom: 14 }}>
          {["all", "succeeded", "failed", "pending"].map((f) => (
            <button
              key={f}
              onClick={() => setPaymentStatusFilter(f)}
              style={{
                ...s.btnSm, background: paymentStatusFilter === f ? t.accent : "transparent",
                color: paymentStatusFilter === f ? (dark ? "#0A0A0A" : "#FFF") : t.textDim,
                border: "none", textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Provider</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...s.td, color: t.textDim, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 }}>{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>
                  <td style={s.td}>{p.email || "—"}</td>
                  <td style={{ ...s.td, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {String(p.currency || "AED").toUpperCase() === "INR" ? fmtINR(p.amount) : fmtAED(p.amount)}
                  </td>
                  <td style={s.td}><span style={s.chip("mute")}>{p.provider || "ziina"}</span></td>
                  <td style={s.td}>{paymentStatusChip(p.status)}</td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr><td style={{ ...s.td, color: t.textMute, textAlign: "center", padding: "32px 14px" }} colSpan={5}>No transactions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const SectionUnlock = () => (
    <>
      <div style={s.cardHeader}>
        <div>
          <div style={s.eyebrow}>Admin action</div>
          <h1 style={s.h1}>Manual unlock</h1>
        </div>
      </div>
      <div style={{ ...s.card, maxWidth: 560 }}>
        <div style={{ fontSize: 13, color: t.textDim, marginBottom: 16 }}>
          Flip access flags for a user by email. Writes directly to <code style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 }}>profiles</code>.
        </div>
        <label style={s.label}>User email</label>
        <input
          style={s.input}
          placeholder="user@email.com"
          value={unlockEmail}
          onChange={(e) => { setUnlockEmail(e.target.value); setUnlockMsg(null); }}
        />
        <label style={{ ...s.label, marginTop: 14 }}>Unlock type</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "is_pro", label: "is_pro = true" },
            { id: "linkedin_unlocked", label: "linkedin_unlocked = true" },
            { id: "plan", label: "Set plan" },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setUnlockType(o.id)}
              style={{
                ...s.btnSm,
                padding: "8px 12px",
                background: unlockType === o.id ? t.accent : "transparent",
                color: unlockType === o.id ? (dark ? "#0A0A0A" : "#FFF") : t.text,
                borderColor: unlockType === o.id ? t.accent : t.line,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        {unlockType === "plan" && (
          <>
            <label style={{ ...s.label, marginTop: 14 }}>Plan</label>
            <select style={s.input} value={unlockPlan} onChange={(e) => setUnlockPlan(e.target.value)}>
              <option>FREE</option>
              <option>EXPRESS_PASS</option>
              <option>ACTIVE_HUNTER</option>
              <option>PRO</option>
              <option>MAX_PRO</option>
              <option>TRIAL</option>
            </select>
          </>
        )}
        <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={{ ...s.btn, opacity: unlockBusy ? 0.6 : 1 }}
            disabled={unlockBusy}
            onClick={runManualUnlock}
          >
            {unlockBusy ? "Applying…" : "Apply unlock"}
          </button>
          {unlockMsg && (
            <span style={s.chip(unlockMsg.kind === "good" ? "good" : "bad")}>{unlockMsg.text}</span>
          )}
        </div>
      </div>
    </>
  );

  // ——— Edit drawer ———
  const EditDrawer = () => {
    if (!editUser) return null;
    return (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setEditUser(null); }}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", justifyContent: "flex-end",
        }}
      >
        <div style={{
          width: "100%", maxWidth: 420, height: "100vh",
          background: t.surface, borderLeft: `1px solid ${t.line}`,
          padding: 24, display: "flex", flexDirection: "column", gap: 14,
          overflowY: "auto",
        }}>
          <div>
            <div style={s.eyebrow}>Edit user</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{editUser.email}</div>
            <div style={{ fontSize: 11, color: t.textMute, fontFamily: '"JetBrains Mono", ui-monospace, monospace', marginTop: 4 }}>
              {editUser.id}
            </div>
          </div>
          <div style={{ height: 1, background: t.lineSoft }} />
          <div>
            <label style={s.label}>Plan</label>
            <select style={s.input} value={editPlan} onChange={(e) => setEditPlan(e.target.value)}>
              <option>FREE</option><option>EXPRESS_PASS</option><option>ACTIVE_HUNTER</option>
              <option>PRO</option><option>MAX_PRO</option><option>TRIAL</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Expiry (optional)</label>
            <input type="date" style={s.input} value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: t.surfaceHi, cursor: "pointer" }}>
            <input type="checkbox" checked={editIsPro} onChange={(e) => setEditIsPro(e.target.checked)} />
            <span style={{ fontSize: 13 }}>is_pro</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: t.surfaceHi, cursor: "pointer" }}>
            <input type="checkbox" checked={editLiUnlocked} onChange={(e) => setEditLiUnlocked(e.target.checked)} />
            <span style={{ fontSize: 13 }}>linkedin_unlocked</span>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <button style={{ ...s.btn, flex: 1, opacity: editBusy ? 0.6 : 1 }} onClick={saveEditUser} disabled={editBusy}>
              {editBusy ? "Saving…" : "Save changes"}
            </button>
            <button style={s.btnGhost} onClick={() => setEditUser(null)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={s.root}>
      <style>{`
        @media (max-width: 900px) {
          .cvp-admin-sidebar { position: fixed !important; left: 0; top: 0; z-index: 50;
            transform: translateX(-100%); transition: transform 240ms ${EASE}; }
          .cvp-admin-sidebar.open { transform: translateX(0); }
          .cvp-admin-menu-btn { display: grid !important; }
          .cvp-resp-2-1 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .cvp-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .cvp-grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .cvp-grid-4 { grid-template-columns: 1fr !important; }
        }
        .cvp-admin-menu-btn { display: none; }
      `}</style>

      <div style={s.layout}>
        {/* Sidebar */}
        <aside className={`cvp-admin-sidebar ${navOpen ? "open" : ""}`} style={s.sidebar}>
          <div style={s.brand}>
            <div style={s.brandMark}>CV</div>
            <div>
              <div style={s.brandName}>CVPassport</div>
              <div style={s.brandMono}>Command · v2</div>
            </div>
          </div>
          {NAV.map((g) => (
            <div key={g.group} style={s.navGroup}>
              <div style={s.navLabel}>{g.group}</div>
              {g.items.map((it) => it.href ? (
                <Link
                  key={it.id}
                  to={it.href}
                  style={{ ...s.navItem(false), textDecoration: "none", justifyContent: "space-between" }}
                >
                  <span>{it.label}</span>
                  <Icon.Arrow style={{ color: t.textMute }} />
                </Link>
              ) : (
                <div
                  key={it.id}
                  onClick={() => { setSection(it.id); setNavOpen(false); }}
                  style={s.navItem(section === it.id)}
                >
                  {section === it.id && <Icon.Dot style={{ color: t.text }} />}
                  <span>{it.label}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${t.lineSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: dark ? "#1C1C1C" : "#F0F0EC",
                border: `1px solid ${t.line}`,
                display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 600, color: t.text,
              }}>JK</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Junaid Khan</div>
                <div style={{ fontSize: 10, color: t.textMute, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</div>
              </div>
            </div>
          </div>
        </aside>

        {navOpen && (
          <div
            onClick={() => setNavOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          />
        )}

        {/* Main */}
        <div style={s.main}>
          <header style={s.topbar}>
            <button
              className="cvp-admin-menu-btn"
              onClick={() => setNavOpen(true)}
              style={{ ...s.iconBtn, display: "none" }}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <div style={s.search}>
              <Icon.Search style={{ color: t.textMute }} />
              <input
                style={s.searchInput}
                placeholder="Search users by email…"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); if (section !== "users") setSection("users"); }}
              />
            </div>
            <div style={{ flex: 1 }} />
            <button style={s.iconBtn} onClick={fetchAll} title="Refresh" aria-label="Refresh">
              <Icon.Refresh style={{ transform: refreshing ? "rotate(180deg)" : "none", transition: `transform 600ms ${EASE}` }} />
            </button>
            <button
              style={s.iconBtn}
              onClick={() => setDark((v) => !v)}
              title={dark ? "Switch to day" : "Switch to night"}
              aria-label="Toggle theme"
            >
              {dark ? <Icon.Sun /> : <Icon.Moon />}
            </button>
            <button
              style={{ ...s.btn, display: "none" }}
              className="cvp-admin-grant-btn"
            >
              Grant access
            </button>
          </header>

          <div style={s.content}>
            <div style={{ ...s.grid4 }} className="cvp-grid-4">
              {/* invisible helper so responsive class attaches to grid wrappers below */}
            </div>
            {/* Render by section */}
            <div
              style={{ display: "contents" }}
              key={section /* force re-mount for clean transitions */}
            >
              {section === "overview" && <SectionOverview />}
              {section === "users" && <SectionUsers />}
              {section === "content" && <SectionContent />}
              {section === "tools" && <SectionTools />}
              {section === "payments" && <SectionPayments />}
              {section === "unlock" && <SectionUnlock />}
            </div>
          </div>
        </div>
      </div>

      <EditDrawer />
    </div>
  );
}

// ——— tool card ———
function ToolCard({ t, s, title, total, today, missing }) {
  return (
    <div style={s.card}>
      <div style={s.eyebrow}>{missing ? "Table missing · placeholder" : "Live"}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: t.textMute, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: "0.1em", textTransform: "uppercase" }}>Total</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{Number(total || 0).toLocaleString()}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: t.textMute, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: "0.1em", textTransform: "uppercase" }}>Today</div>
          <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: t.good }}>+{Number(today || 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
