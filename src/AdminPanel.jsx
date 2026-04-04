import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const ADMIN_EMAIL = "connectingjunaidkhan@gmail.com";
const PRO_PLANS = ["PRO", "MAX_PRO", "EXPRESS_PASS", "ACTIVE_HUNTER"];

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [, setAdminUser] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPlan, setNewPlan] = useState("FREE");
  const [expiry, setExpiry] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantError, setGrantError] = useState("");

  // payment system
  const [provider, setProvider] = useState("stripe");
  const [pricing, setPricing] = useState({ PRO: 10, MAX: 25 });
  const [paymentId, setPaymentId] = useState(null);
  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";
  const modeColors = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];
  const [modeColorIndex, setModeColorIndex] = useState(0);

  // feedback
  const [feedbackItems, setFeedbackItems] = useState([]);

  // announcements
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");

  // logs
  const [logs, setLogs] = useState([]);

  // analytics
  const [analyticsData, setAnalyticsData] = useState(null);

  // email composer
  const [emailTo, setEmailTo] = useState("all");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  // 🔐 AUTH CHECK
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        window.location.href = "/";
      } else {
        setAdminUser(data.user);
        await ensureAdminProfileRow(data.user);
        fetchUsers();
        fetchPayment();
      }
    };
    init();
  }, []);

  const ensureAdminProfileRow = async (authUser) => {
    if (!authUser?.id || authUser.email !== ADMIN_EMAIL) return;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from("profiles").insert({
        id: authUser.id,
        email: authUser.email,
        plan: "MAX_PRO",
        flagged: false,
        features: {},
      });
    }
  };

  // 📡 FETCH USERS (FIX 3 — real cv_count & download_count)
  const fetchUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, created_at, email, plan, expiry, flagged, features");

    const { data: cvsData } = await supabase.from("cvs").select("user_id");
    const { data: dlsData } = await supabase.from("downloads").select("user_id");

    const cvMap = {};
    const dlMap = {};
    (cvsData || []).forEach((r) => { cvMap[r.user_id] = (cvMap[r.user_id] || 0) + 1; });
    (dlsData || []).forEach((r) => { dlMap[r.user_id] = (dlMap[r.user_id] || 0) + 1; });

    if (!error && data) {
      const mapped = data.map((u) => {
        let features = u.features;
        if (typeof features === "string") {
          try {
            const p = JSON.parse(features);
            features = p && typeof p === "object" && !Array.isArray(p) ? p : {};
          } catch { features = {}; }
        } else if (!features || typeof features !== "object" || Array.isArray(features)) {
          features = {};
        }
        return {
          ...u,
          features,
          cv_count: cvMap[u.id] || 0,
          download_count: dlMap[u.id] || 0,
        };
      });
      setUsers(mapped);
      setFiltered(mapped);
    }
    setLoading(false);
  };

  // 💳 FETCH PAYMENT (FIX 6 — store paymentId)
  const fetchPayment = async () => {
    const { data } = await supabase.from("payment_settings").select("*").single();
    if (data) {
      setPaymentId(data.id);
      setProvider(data.provider);
      setPricing(data.config || {});
    }
  };

  // 📨 FETCH FEEDBACK
  const fetchFeedback = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setFeedbackItems(data || []);
  };

  // 📢 FETCH ANNOUNCEMENTS
  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  // 🪵 FETCH LOGS
  const fetchLogs = async () => {
    const { data } = await supabase
      .from("logs")
      .select("*")
      .order("created_at", { ascending: false });
    setLogs(data || []);
  };

  // 📊 FETCH ANALYTICS
  const fetchAnalytics = async () => {
    const { data: profilesData } = await supabase.from("profiles").select("id, email, plan, flagged, created_at");
    const { data: cvsData } = await supabase.from("cvs").select("id");
    const { data: dlsData } = await supabase.from("downloads").select("id");

    if (!profilesData) return;

    const totalUsers = profilesData.length;
    const totalCvs = (cvsData || []).length;
    const totalDownloads = (dlsData || []).length;
    const proUsers = profilesData.filter((u) => PRO_PLANS.includes(String(u.plan || "").toUpperCase())).length;
    const freeUsers = profilesData.filter((u) => String(u.plan || "").toUpperCase() === "FREE").length;
    const flaggedUsers = profilesData.filter((u) => u.flagged).length;

    const sorted = [...profilesData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const newest = sorted[0] || null;

    const gccCount = profilesData.filter((u) => {
      const e = String(u.email || "").toLowerCase();
      return !e.endsWith(".in") && !e.includes("+india");
    }).length;
    const indiaCount = profilesData.filter((u) => {
      const e = String(u.email || "").toLowerCase();
      return e.endsWith(".in") || e.includes("+india");
    }).length;

    setAnalyticsData({ totalUsers, totalCvs, totalDownloads, proUsers, freeUsers, flaggedUsers, newest, gccCount, indiaCount });
  };

  // Load section-specific data when section changes
  useEffect(() => {
    if (activeSection === "feedback") fetchFeedback();
    if (activeSection === "announcements") fetchAnnouncements();
    if (activeSection === "logs") fetchLogs();
    if (activeSection === "analytics") fetchAnalytics();
  }, [activeSection]);

  // 🔎 FILTERING
  useEffect(() => {
    let data = [...users];
    if (tab !== "all") {
      data = data.filter((u) => {
        if (tab === "flagged") return u.flagged;
        return u.plan?.toLowerCase() === tab;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((u) => String(u.email || "").toLowerCase().includes(q));
    }
    setFiltered(data);
  }, [search, tab, users]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setModeColorIndex((prev) => (prev + 1) % modeColors.length);
    }, 15000);
    return () => clearInterval(intervalId);
  }, [modeColors.length]);

  // 🧠 UPDATE PLAN (FIX 8 — email-based grant)
  const updatePlan = async () => {
    setGrantError("");
    if (selectedUser) {
      await supabase.from("profiles").upsert({
        id: selectedUser.id,
        email: selectedUser.email,
        plan: newPlan,
        expiry: expiry || null,
        flagged: selectedUser.flagged ?? false,
        features: selectedUser.features ?? {},
      }, { onConflict: "id" });
    } else {
      if (!grantEmail) { setGrantError("Please enter an email."); return; }
      const { data: found } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", grantEmail)
        .maybeSingle();
      if (!found) { setGrantError("User not found — they must sign up first."); return; }
      await supabase.from("profiles").update({
        plan: newPlan,
        expiry: expiry || null,
      }).eq("id", found.id);
    }
    setShowModal(false);
    setSelectedUser(null);
    setGrantEmail("");
    fetchUsers();
  };

  // 💾 SAVE PAYMENT (FIX 6 — use paymentId)
  const savePaymentSettings = async () => {
    if (!paymentId) return;
    await supabase.from("payment_settings").update({
      provider,
      config: pricing,
      updated_at: new Date(),
    }).eq("id", paymentId);
    fetchPayment();
  };

  // 📋 EXPORT CSV (FIX 5)
  const exportCSV = () => {
    const headers = ["Email", "Plan", "CVs", "Downloads", "Joined", "Flagged"];
    const rows = users.map((u) => [
      u.email, u.plan, u.cv_count, u.download_count,
      new Date(u.created_at).toLocaleDateString(), u.flagged,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cvpassport_users.csv"; a.click();
  };

  // 🚫 BAN TOGGLE (FIX 7)
  const toggleBan = async (u) => {
    await supabase.from("profiles").update({ flagged: !u.flagged }).eq("id", u.id);
    fetchUsers();
  };

  // 📢 PUBLISH ANNOUNCEMENT (FIX 13)
  const publishAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    await supabase.from("announcements").insert({ message: newAnnouncement, active: true });
    setNewAnnouncement("");
    fetchAnnouncements();
  };

  const toggleAnnouncement = async (item) => {
    await supabase.from("announcements").update({ active: !item.active }).eq("id", item.id);
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id) => {
    await supabase.from("announcements").delete().eq("id", id);
    fetchAnnouncements();
  };

  // 📧 MARK FEEDBACK READ
  const markFeedbackRead = async (id) => {
    await supabase.from("feedback").update({ read: true }).eq("id", id);
    fetchFeedback();
  };

  // 🪵 CLEAR LOGS (FIX 14)
  const clearAllLogs = async () => {
    if (!window.confirm("Delete all logs? This cannot be undone.")) return;
    await supabase.from("logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    fetchLogs();
  };

  // 📧 EMAIL COMPOSER (FIX 16)
  const sendEmail = () => {
    let recipients = [];
    if (emailTo === "all") recipients = users.map((u) => u.email);
    else if (emailTo === "pro") recipients = users.filter((u) => PRO_PLANS.includes(String(u.plan || "").toUpperCase())).map((u) => u.email);
    else if (emailTo === "free") recipients = users.filter((u) => String(u.plan || "").toUpperCase() === "FREE").map((u) => u.email);
    else if (emailTo === "custom") recipients = [customEmail];

    const bcc = recipients.join(",");
    window.location.href = `mailto:support@mycvpassport.com?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  };

  // ===== THEME =====
  const T = isDark
    ? {
        bg: "#000000", surface: "#111111", panel: "#000000",
        text: "#FFFFFF", textMuted: "#888", textSubtle: "#444",
        border: "rgba(255,255,255,0.08)", borderSoft: "rgba(255,255,255,0.04)",
      }
    : {
        bg: "#F5F5F7", surface: "#FFFFFF", panel: "#FFFFFF",
        text: "#111111", textMuted: "#555", textSubtle: "#777",
        border: "rgba(0,0,0,0.10)", borderSoft: "rgba(0,0,0,0.06)",
      };

  const s = {
    container: {
      display: "flex", height: "100vh", backgroundColor: T.bg, color: T.text,
      fontFamily: "Inter, -apple-system, system-ui, sans-serif", overflow: "hidden",
    },
    sidebar: {
      width: "220px", backgroundColor: T.panel, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", padding: "24px 16px", flexShrink: 0,
    },
    logo: {
      fontSize: "14px", fontWeight: "700", letterSpacing: "-0.02em",
      marginBottom: "32px", display: "flex", alignItems: "center", gap: "8px",
    },
    navGroup: { marginBottom: "24px" },
    navLabel: {
      fontSize: "11px", fontWeight: "500", color: T.textSubtle,
      textTransform: "uppercase", letterSpacing: "0.05em",
      marginBottom: "12px", paddingLeft: "8px",
    },
    navItem: (active) => ({
      display: "flex", alignItems: "center", padding: "8px 12px",
      fontSize: "13px", color: active ? T.text : T.textMuted,
      backgroundColor: active ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)") : "transparent",
      borderRadius: "6px", textDecoration: "none", marginBottom: "4px",
      transition: "all 0.2s ease", cursor: "pointer",
      fontWeight: active ? "600" : "400",
    }),
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    topBar: {
      height: "64px", padding: "0 32px", display: "flex",
      alignItems: "center", gap: "24px", borderBottom: `1px solid ${T.border}`,
    },
    searchPill: {
      flex: 1, backgroundColor: T.surface, border: `1px solid ${T.border}`,
      borderRadius: "20px", padding: "8px 16px", color: T.text,
      fontSize: "13px", outline: "none",
    },
    btnWhite: {
      backgroundColor: "#FFFFFF", color: "#000000", padding: "8px 16px",
      borderRadius: "8px", fontSize: "13px", fontWeight: "600",
      border: "none", cursor: "pointer",
    },
    btnGhost: {
      backgroundColor: "transparent", color: T.textMuted, padding: "8px 16px",
      borderRadius: "8px", fontSize: "13px", fontWeight: "500",
      border: `1px solid ${T.border}`, cursor: "pointer",
    },
    btnRed: {
      backgroundColor: "rgba(239,68,68,0.1)", color: "#F87171", padding: "4px 12px",
      borderRadius: "8px", fontSize: "11px", fontWeight: "500",
      border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
    },
    btnGreen: {
      backgroundColor: "rgba(34,197,94,0.1)", color: "#4ade80", padding: "4px 12px",
      borderRadius: "8px", fontSize: "11px", fontWeight: "500",
      border: "1px solid rgba(34,197,94,0.2)", cursor: "pointer",
    },
    content: { padding: "32px", overflowY: "auto", flex: 1 },
    statsGrid: {
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      gap: "16px", marginBottom: "40px",
    },
    statCard: {
      backgroundColor: T.surface, border: `1px solid ${T.border}`,
      padding: "20px", borderRadius: "10px",
    },
    statLabel: { fontSize: "12px", color: T.textMuted, marginBottom: "8px" },
    statValue: { fontSize: "24px", fontWeight: "600", letterSpacing: "-0.02em" },
    tabBar: {
      display: "flex", gap: "8px", marginBottom: "24px", padding: "4px",
      backgroundColor: T.surface, borderRadius: "10px", width: "fit-content",
      border: `1px solid ${T.border}`,
    },
    tabBtn: (active) => ({
      padding: "6px 16px", fontSize: "13px", borderRadius: "6px", cursor: "pointer",
      backgroundColor: active ? (isDark ? "#1A1A1A" : "#F3F4F6") : "transparent",
      color: active ? T.text : T.textMuted, border: "none", transition: "0.2s",
    }),
    table: {
      width: "100%", borderCollapse: "separate", borderSpacing: "0",
      backgroundColor: T.surface, borderRadius: "10px",
      border: `1px solid ${T.border}`, overflow: "hidden",
    },
    th: {
      textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: "600",
      color: T.textSubtle, textTransform: "uppercase", borderBottom: `1px solid ${T.border}`,
    },
    td: {
      padding: "14px 16px", fontSize: "13px",
      color: isDark ? "#CCC" : "#333", borderBottom: `1px solid ${T.borderSoft}`,
    },
    badge: (type) => {
      const colors = {
        PRO: { bg: "rgba(79,70,229,0.1)", text: "#818CF8" },
        MAX_PRO: { bg: "rgba(79,70,229,0.15)", text: "#A78BFA" },
        EXPRESS_PASS: { bg: "rgba(14,165,233,0.1)", text: "#38BDF8" },
        ACTIVE_HUNTER: { bg: "rgba(16,185,129,0.1)", text: "#34D399" },
        TRIAL: { bg: "rgba(245,158,11,0.1)", text: "#FBBF24" },
        FREE: { bg: "rgba(255,255,255,0.05)", text: "#888" },
        FLAGGED: { bg: "rgba(239,68,68,0.1)", text: "#F87171" },
        ERROR: { bg: "rgba(239,68,68,0.1)", text: "#F87171" },
        WARNING: { bg: "rgba(245,158,11,0.1)", text: "#FBBF24" },
        INFO: { bg: "rgba(14,165,233,0.1)", text: "#38BDF8" },
      };
      const style = colors[String(type || "").toUpperCase()] || colors.FREE;
      return {
        padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "700",
        backgroundColor: style.bg, color: style.text, textTransform: "uppercase",
      };
    },
    dot: (on) => ({
      width: "6px", height: "6px", borderRadius: "50%",
      backgroundColor: on ? "#88E788" : "#EF4444",
      display: "inline-block", marginRight: "4px",
    }),
    avatar: {
      width: "32px", height: "32px", borderRadius: "50%",
      backgroundColor: isDark ? "#1A1A1A" : "#F3F4F6",
      border: `1px solid ${T.border}`, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: "11px", fontWeight: "600",
    },
    modalOverlay: {
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.7)", display: "flex",
      justifyContent: "center", alignItems: "center", zIndex: 1000,
    },
    modal: {
      background: T.surface, padding: 24, border: `1px solid ${T.border}`,
      borderRadius: "12px", minWidth: 340,
    },
    input: {
      width: "100%", marginTop: 10, padding: "8px 10px",
      backgroundColor: isDark ? "#1A1A1A" : "#F3F4F6",
      color: T.text, border: `1px solid ${T.border}`,
      outline: "none", boxSizing: "border-box", borderRadius: "6px",
      fontSize: "13px",
    },
    sectionTitle: { fontSize: "20px", fontWeight: "700", marginBottom: "24px", letterSpacing: "-0.02em" },
    card: {
      backgroundColor: T.surface, border: `1px solid ${T.border}`,
      borderRadius: "10px", padding: "20px", marginBottom: "16px",
    },
  };

  // ===== USERS TABLE (shared) =====
  const UsersTable = ({ data }) => (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>User</th>
          <th style={s.th}>Plan</th>
          <th style={s.th}>Usage</th>
          <th style={s.th}>Features</th>
          <th style={s.th}>Joined</th>
          <th style={s.th}></th>
        </tr>
      </thead>
      <tbody>
        {data.map((u) => (
          <tr key={u.id}>
            <td style={s.td}>
              <div style={{ fontWeight: "500", color: T.text }}>{String(u.email ?? "")}</div>
            </td>
            <td style={s.td}>
              <span style={s.badge(u.flagged ? "FLAGGED" : String(u.plan || "FREE").toUpperCase())}>{u.plan}</span>
            </td>
            <td style={s.td}>
              <div style={{ fontSize: "12px" }}>{u.cv_count || 0} CVs</div>
              <div style={{ fontSize: "11px", color: T.textSubtle }}>{u.download_count || 0} DLs</div>
            </td>
            <td style={s.td}>
              <div style={{ display: "flex", gap: "4px" }}>
                <div style={s.dot(u.features?.download === true)}></div>
                <div style={s.dot(u.features?.ats === true)}></div>
                <div style={s.dot(u.features?.cover_letter === true)}></div>
                <div style={s.dot(u.features?.premium_templates === true)}></div>
              </div>
            </td>
            {/* FIX 2 — use created_at */}
            <td style={s.td}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
            <td style={{ ...s.td, textAlign: "right" }}>
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  style={{ ...s.btnGhost, padding: "4px 12px", fontSize: "11px" }}
                  onClick={() => { setSelectedUser(u); setNewPlan(u.plan || "FREE"); setExpiry(u.expiry || ""); setShowModal(true); }}
                >
                  Edit
                </button>
                {/* FIX 7 — Ban toggle */}
                <button
                  style={u.flagged ? s.btnGreen : s.btnRed}
                  onClick={() => toggleBan(u)}
                >
                  {u.flagged ? "Unban" : "Ban"}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ===== SECTIONS =====

  const DashboardSection = () => (
    <>
      {/* Stats */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Users</div>
          <div style={s.statValue}>{users.length.toLocaleString()}</div>
          <div style={{ fontSize: "11px", color: "#22C55E", marginTop: "4px" }}>+12.5%</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Monthly Revenue</div>
          <div style={s.statValue}>${(pricing.PRO || 0) * users.filter((u) => String(u.plan || "").toUpperCase() === "PRO").length}</div>
          <div style={{ fontSize: "11px", color: "#22C55E", marginTop: "4px" }}>+4.2%</div>
        </div>
        {/* FIX 4 — real PDFs generated */}
        <div style={s.statCard}>
          <div style={s.statLabel}>PDFs Generated</div>
          <div style={s.statValue}>{users.reduce((sum, u) => sum + (u.download_count || 0), 0).toLocaleString()}</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>Stable</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Active Trials</div>
          <div style={s.statValue}>{users.filter((u) => String(u.plan || "").toUpperCase() === "TRIAL").length}</div>
          <div style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px" }}>-2.1%</div>
        </div>
      </div>

      {/* Email Composer (FIX 16) */}
      <div style={{ ...s.card, marginBottom: "32px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>📧 Email Composer — send via support@mycvpassport.com</div>
        <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
          <select value={emailTo} onChange={(e) => setEmailTo(e.target.value)} style={{ ...s.input, marginTop: 0, flex: 1 }}>
            <option value="all">All Users</option>
            <option value="pro">Pro Users</option>
            <option value="free">Free Users</option>
            <option value="custom">Single Email</option>
          </select>
          {emailTo === "custom" && (
            <input
              style={{ ...s.input, marginTop: 0, flex: 2 }}
              placeholder="Paste email..."
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
            />
          )}
        </div>
        <input style={s.input} placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
        <textarea
          style={{ ...s.input, height: "80px", resize: "vertical", marginTop: "10px" }}
          placeholder="Message body..."
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
        />
        <button style={{ ...s.btnWhite, marginTop: "12px" }} onClick={sendEmail}>Send via Mail Client</button>
      </div>

      {/* Payment Settings (FIX 15) */}
      <div style={{ ...s.card, marginBottom: "32px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>💳 Payment Settings</div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontSize: "12px", color: T.textMuted, marginBottom: "6px" }}>Provider</div>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ ...s.input, marginTop: 0 }}>
              <option value="stripe">Stripe</option>
              <option value="lemonsqueezy">LemonSqueezy</option>
              <option value="razorpay">Razorpay</option>
            </select>
          </div>
          {["express_pass_aed", "express_pass_inr", "active_hunter_aed", "active_hunter_inr", "career_pro_aed", "career_pro_inr"].map((key) => (
            <div key={key} style={{ flex: 1, minWidth: "140px" }}>
              <div style={{ fontSize: "12px", color: T.textMuted, marginBottom: "6px" }}>
                {key.replace(/_/g, " ").toUpperCase()}
              </div>
              <input
                type="number"
                style={{ ...s.input, marginTop: 0 }}
                value={pricing[key] || ""}
                onChange={(e) => setPricing((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          ))}
        </div>
        <button style={{ ...s.btnWhite, marginTop: "16px" }} onClick={savePaymentSettings}>Save Payment Settings</button>
      </div>

      {/* Users Table */}
      <div style={s.tabBar}>
        {["all", "free", "pro", "trial", "flagged"].map((t) => (
          <button key={t} style={s.tabBtn(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <UsersTable data={filtered} />
    </>
  );

  // FIX 11 — Analytics
  const AnalyticsSection = () => (
    <>
      <div style={s.sectionTitle}>Analytics</div>
      {!analyticsData ? (
        <div style={{ color: T.textMuted }}>Loading...</div>
      ) : (
        <>
          <div style={{ ...s.statsGrid, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { label: "Total Users", value: analyticsData.totalUsers },
              { label: "Total CVs Created", value: analyticsData.totalCvs },
              { label: "Total Downloads", value: analyticsData.totalDownloads },
              { label: "Pro Users", value: analyticsData.proUsers },
              { label: "Free Users", value: analyticsData.freeUsers },
              { label: "Flagged Users", value: analyticsData.flaggedUsers },
            ].map((item) => (
              <div key={item.label} style={s.statCard}>
                <div style={s.statLabel}>{item.label}</div>
                <div style={s.statValue}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={s.statCard}>
              <div style={s.statLabel}>Newest Signup</div>
              <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "4px" }}>{analyticsData.newest?.email || "—"}</div>
              <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>
                {analyticsData.newest ? new Date(analyticsData.newest.created_at).toLocaleString() : ""}
              </div>
            </div>
            <div style={s.statCard}>
              <div style={s.statLabel}>Geo Split (approx)</div>
              <div style={{ marginTop: "8px", display: "flex", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "600" }}>{analyticsData.gccCount}</div>
                  <div style={{ fontSize: "12px", color: T.textMuted }}>GCC</div>
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "600" }}>{analyticsData.indiaCount}</div>
                  <div style={{ fontSize: "12px", color: T.textMuted }}>India</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  // FIX 9 — Pro Access
  const ProAccessSection = () => {
    const proUsers = users.filter((u) => PRO_PLANS.includes(String(u.plan || "").toUpperCase()));
    return (
      <>
        <div style={s.sectionTitle}>Pro Access — {proUsers.length} users</div>
        <UsersTable data={proUsers} />
      </>
    );
  };

  // FIX 10 — Abuse Reports
  const AbuseReportsSection = () => {
    const flagged = users.filter((u) => u.flagged);
    return (
      <>
        <div style={s.sectionTitle}>Abuse Reports — {flagged.length} flagged</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Email</th>
              <th style={s.th}>Plan</th>
              <th style={s.th}>Joined</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {flagged.map((u) => (
              <tr key={u.id}>
                <td style={s.td}>{u.email}</td>
                <td style={s.td}><span style={s.badge("FLAGGED")}>{u.plan}</span></td>
                <td style={s.td}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <button style={s.btnGreen} onClick={() => toggleBan(u)}>Unban</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  // FIX 12 — Feedback
  const FeedbackSection = () => (
    <>
      <div style={s.sectionTitle}>Feedback Inbox</div>
      {feedbackItems.length === 0 && <div style={{ color: T.textMuted }}>No feedback yet.</div>}
      {feedbackItems.map((item) => (
        <div key={item.id} style={{ ...s.card, borderLeft: item.read ? `2px solid ${T.border}` : "2px solid #818CF8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                {!item.read && <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#818CF8" }}></div>}
                <span style={{ fontWeight: "600", fontSize: "13px" }}>{item.email}</span>
                <span style={s.badge(item.type || "general")}>{item.type || "general"}</span>
              </div>
              <div style={{ fontSize: "13px", color: T.textMuted, marginBottom: "8px" }}>{item.message}</div>
              <div style={{ fontSize: "11px", color: T.textSubtle }}>{new Date(item.created_at).toLocaleString()}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              {!item.read && (
                <button style={{ ...s.btnGhost, fontSize: "11px", padding: "4px 12px" }} onClick={() => markFeedbackRead(item.id)}>
                  Mark Read
                </button>
              )}
              <a
                href={`mailto:${item.email}?from=support@mycvpassport.com&subject=Re: Your Feedback on CVPassport`}
                style={{ ...s.btnWhite, fontSize: "11px", padding: "4px 12px", textDecoration: "none", display: "inline-block" }}
              >
                Reply
              </a>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  // FIX 13 — Announcements
  const AnnouncementsSection = () => (
    <>
      <div style={s.sectionTitle}>Announcements</div>
      <div style={{ ...s.card, marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "10px" }}>New Announcement</div>
        <textarea
          style={{ ...s.input, height: "80px", resize: "vertical" }}
          placeholder="Write announcement message..."
          value={newAnnouncement}
          onChange={(e) => setNewAnnouncement(e.target.value)}
        />
        <button style={{ ...s.btnWhite, marginTop: "12px" }} onClick={publishAnnouncement}>Publish</button>
      </div>
      {announcements.length === 0 && <div style={{ color: T.textMuted }}>No announcements yet.</div>}
      {announcements.map((item) => (
        <div key={item.id} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", marginBottom: "6px" }}>{item.message}</div>
              <div style={{ fontSize: "11px", color: T.textSubtle }}>
                {new Date(item.created_at).toLocaleString()} —{" "}
                <span style={{ color: item.active ? "#22C55E" : "#888" }}>{item.active ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={{ ...s.btnGhost, fontSize: "11px", padding: "4px 12px" }}
                onClick={() => toggleAnnouncement(item)}
              >
                {item.active ? "Deactivate" : "Activate"}
              </button>
              <button style={{ ...s.btnRed, fontSize: "11px" }} onClick={() => deleteAnnouncement(item.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  // FIX 14 — Logs
  const LogsSection = () => (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={s.sectionTitle}>Error Logs</div>
        <button style={s.btnRed} onClick={clearAllLogs}>Clear All Logs</button>
      </div>
      {logs.length === 0 && <div style={{ color: T.textMuted }}>No logs.</div>}
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Severity</th>
            <th style={s.th}>Error</th>
            <th style={s.th}>Page</th>
            <th style={s.th}>User ID</th>
            <th style={s.th}>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={s.td}><span style={s.badge(log.severity || "error")}>{log.severity || "error"}</span></td>
              <td style={{ ...s.td, maxWidth: "300px", wordBreak: "break-all" }}>{log.error}</td>
              <td style={s.td}>{log.page}</td>
              <td style={{ ...s.td, fontSize: "11px", color: T.textSubtle }}>{log.user_id || "—"}</td>
              <td style={s.td}>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "analytics": return <AnalyticsSection />;
      case "allusers": return (<><div style={s.sectionTitle}>All Users</div><UsersTable data={users} /></>);
      case "proaccess": return <ProAccessSection />;
      case "abusereports": return <AbuseReportsSection />;
      case "feedback": return <FeedbackSection />;
      case "announcements": return <AnnouncementsSection />;
      case "logs": return <LogsSection />;
      default: return <DashboardSection />;
    }
  };

  if (loading) {
    return (
      <div style={{ ...s.container, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: T.textSubtle, fontSize: "13px" }}>Syncing with Supabase...</div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={{ width: 24, height: 24, backgroundColor: "#FFF", borderRadius: 4 }}></div>
          CVPassport
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.navGroup}>
            <div style={s.navLabel}>System</div>
            <div style={s.navItem(activeSection === "dashboard")} onClick={() => setActiveSection("dashboard")}>Dashboard</div>
            <div style={s.navItem(activeSection === "analytics")} onClick={() => setActiveSection("analytics")}>Analytics</div>
          </div>
          <div style={s.navGroup}>
            <div style={s.navLabel}>Users</div>
            <div style={s.navItem(activeSection === "allusers")} onClick={() => setActiveSection("allusers")}>All Users</div>
            <div style={s.navItem(activeSection === "proaccess")} onClick={() => setActiveSection("proaccess")}>Pro Access</div>
            <div style={s.navItem(activeSection === "abusereports")} onClick={() => setActiveSection("abusereports")}>Abuse Reports</div>
          </div>
          <div style={s.navGroup}>
            <div style={s.navLabel}>Content</div>
            <div style={s.navItem(activeSection === "feedback")} onClick={() => setActiveSection("feedback")}>Feedback</div>
            <div style={s.navItem(activeSection === "announcements")} onClick={() => setActiveSection("announcements")}>Announcements</div>
            <div style={s.navItem(activeSection === "logs")} onClick={() => setActiveSection("logs")}>Error Logs</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderTop: `1px solid ${T.border}` }}>
          <div style={s.avatar}>JK</div>
          <div style={{ fontSize: "12px" }}>
            <div style={{ color: "#555", fontSize: "11px", fontWeight: 400 }}>Junaid Khan</div>
            <div style={{ color: modeColors[modeColorIndex], fontSize: "14px", fontWeight: 500 }}>Nuclear Mode</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        <header style={s.topBar}>
          <input
            style={s.searchPill}
            placeholder="Search users, emails, or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              style={{ ...s.btnGhost, padding: "8px 10px", color: T.text, display: "flex", alignItems: "center" }}
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            {/* FIX 5 — Export CSV */}
            <button style={s.btnGhost} onClick={exportCSV}>Export CSV</button>
            <button
              style={s.btnWhite}
              onClick={() => { setSelectedUser(null); setGrantEmail(""); setGrantError(""); setNewPlan("FREE"); setExpiry(""); setShowModal(true); }}
            >
              Grant Access
            </button>
          </div>
        </header>

        <div style={s.content}>
          {renderSection()}
        </div>
      </main>

      {/* MODAL (FIX 8) */}
      {showModal && (
        <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={s.modal}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "16px" }}>
              {selectedUser ? `Edit: ${selectedUser.email}` : "Grant Access"}
            </h3>
            {!selectedUser && (
              <>
                <div style={{ fontSize: "12px", color: T.textMuted, marginBottom: "4px" }}>User Email</div>
                <input
                  style={s.input}
                  placeholder="user@email.com"
                  value={grantEmail}
                  onChange={(e) => { setGrantEmail(e.target.value); setGrantError(""); }}
                />
                {grantError && <div style={{ color: "#F87171", fontSize: "12px", marginTop: "6px" }}>{grantError}</div>}
              </>
            )}
            <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "12px", marginBottom: "4px" }}>Plan</div>
            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} style={s.input}>
              <option>FREE</option>
              <option>PRO</option>
              <option>TRIAL</option>
              <option>MAX</option>
              <option>MAX_PRO</option>
              <option>EXPRESS_PASS</option>
              <option>ACTIVE_HUNTER</option>
            </select>
            <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "12px", marginBottom: "4px" }}>Expiry Date</div>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={s.input} />
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button onClick={updatePlan} style={s.btnWhite}>Save</button>
              <button onClick={() => setShowModal(false)} style={s.btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
