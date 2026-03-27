import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const ADMIN_EMAIL = "connectingjunaidkhan@gmail.com";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPlan, setNewPlan] = useState("FREE");
  const [expiry, setExpiry] = useState("");

  // payment system
  const [provider, setProvider] = useState("stripe");
  const [pricing, setPricing] = useState({ PRO: 10, MAX: 25 });

  // 🔐 AUTH CHECK
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        window.location.href = "/";
      } else {
        fetchUsers();
        fetchPayment();
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 📡 FETCH USERS
  const fetchUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase.from("profiles").select(`
        id,
        email,
        plan,
        expiry,
        flagged,
        features,
        cvs(count),
        downloads(count)
      `);

    if (!error && data) {
      const mapped = data.map((u) => ({
        ...u,
        cv_count: u.cvs?.[0]?.count || 0,
        download_count: u.downloads?.[0]?.count || 0,
      }));

      setUsers(mapped);
      setFiltered(mapped);
    }

    setLoading(false);
  };

  // 💳 FETCH PAYMENT SETTINGS
  const fetchPayment = async () => {
    const { data } = await supabase.from("payment_settings").select("*").single();

    if (data) {
      setProvider(data.provider);
      setPricing(data.config || {});
    }
  };

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
      data = data.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()));
    }

    setFiltered(data);
  }, [search, tab, users]);

  // 🧠 UPDATE PLAN
  const updatePlan = async () => {
    if (!selectedUser) return;

    await supabase
      .from("profiles")
      .update({
        plan: newPlan,
        expiry: expiry || null,
      })
      .eq("id", selectedUser.id);

    setShowModal(false);
    fetchUsers();
  };

  // 💾 SAVE PAYMENT SETTINGS
  const savePaymentSettings = async () => {
    await supabase
      .from("payment_settings")
      .update({
        provider,
        config: pricing,
        updated_at: new Date(),
      })
      .neq("id", null);

    fetchPayment();
  };

  const s = {
    container: {
      display: "flex",
      height: "100vh",
      backgroundColor: "#000000",
      color: "#FFFFFF",
      fontFamily: "Inter, -apple-system, system-ui, sans-serif",
      overflow: "hidden",
    },
    sidebar: {
      width: "220px",
      backgroundColor: "#000000",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 16px",
      flexShrink: 0,
    },
    logo: {
      fontSize: "14px",
      fontWeight: "700",
      letterSpacing: "-0.02em",
      marginBottom: "32px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    navGroup: { marginBottom: "24px" },
    navLabel: {
      fontSize: "11px",
      fontWeight: "500",
      color: "#444",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: "12px",
      paddingLeft: "8px",
    },
    navItem: (active) => ({
      display: "flex",
      alignItems: "center",
      padding: "8px 12px",
      fontSize: "13px",
      color: active ? "#FFF" : "#888",
      backgroundColor: active ? "rgba(255,255,255,0.05)" : "transparent",
      borderRadius: "6px",
      textDecoration: "none",
      marginBottom: "4px",
      transition: "all 0.2s ease",
      cursor: "pointer",
    }),
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    topBar: {
      height: "64px",
      padding: "0 32px",
      display: "flex",
      alignItems: "center",
      gap: "24px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    searchPill: {
      flex: 1,
      backgroundColor: "#111111",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "20px",
      padding: "8px 16px",
      color: "#FFF",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
    },
    btnWhite: {
      backgroundColor: "#FFFFFF",
      color: "#000000",
      padding: "8px 16px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "600",
      border: "none",
      cursor: "pointer",
    },
    btnGhost: {
      backgroundColor: "transparent",
      color: "#888",
      padding: "8px 16px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "500",
      border: "1px solid rgba(255,255,255,0.08)",
      cursor: "pointer",
    },
    content: { padding: "32px", overflowY: "auto", flex: 1 },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "16px",
      marginBottom: "40px",
    },
    statCard: {
      backgroundColor: "#111111",
      border: "1px solid rgba(255,255,255,0.08)",
      padding: "20px",
      borderRadius: "10px",
    },
    statLabel: { fontSize: "12px", color: "#888", marginBottom: "8px" },
    statValue: { fontSize: "24px", fontWeight: "600", letterSpacing: "-0.02em" },
    tabBar: {
      display: "flex",
      gap: "8px",
      marginBottom: "24px",
      padding: "4px",
      backgroundColor: "#111111",
      borderRadius: "10px",
      width: "fit-content",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    tabBtn: (active) => ({
      padding: "6px 16px",
      fontSize: "13px",
      borderRadius: "6px",
      cursor: "pointer",
      backgroundColor: active ? "#1A1A1A" : "transparent",
      color: active ? "#FFF" : "#888",
      border: "none",
      transition: "0.2s",
    }),
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0",
      backgroundColor: "#111111",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.08)",
      overflow: "hidden",
    },
    th: {
      textAlign: "left",
      padding: "12px 16px",
      fontSize: "11px",
      fontWeight: "600",
      color: "#444",
      textTransform: "uppercase",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    td: {
      padding: "14px 16px",
      fontSize: "13px",
      color: "#CCC",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    },
    badge: (type) => {
      const colors = {
        PRO: { bg: "rgba(79, 70, 229, 0.1)", text: "#818CF8" },
        TRIAL: { bg: "rgba(245, 158, 11, 0.1)", text: "#FBBF24" },
        FREE: { bg: "rgba(255, 255, 255, 0.05)", text: "#888" },
        FLAGGED: { bg: "rgba(239, 68, 68, 0.1)", text: "#F87171" },
      };
      const style = colors[type] || colors.FREE;
      return {
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "10px",
        fontWeight: "700",
        backgroundColor: style.bg,
        color: style.text,
        textTransform: "uppercase",
      };
    },
    dot: (on) => ({
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      backgroundColor: on ? "#4F46E5" : "#333",
      display: "inline-block",
      marginRight: "4px",
    }),
    avatar: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      backgroundColor: "#1A1A1A",
      border: "1px solid rgba(255,255,255,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      fontWeight: "600",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      background: "#111",
      padding: 20,
      border: "1px solid rgba(255,255,255,0.08)",
      minWidth: 320,
    },
    input: {
      width: "100%",
      marginTop: 10,
      padding: "8px 10px",
      backgroundColor: "#111111",
      color: "#FFFFFF",
      border: "1px solid rgba(255,255,255,0.08)",
      outline: "none",
      boxSizing: "border-box",
    },
  };

  if (loading) {
    return (
      <div style={{ ...s.container, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#444", fontSize: "13px" }}>
          Syncing with Supabase...
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={{ width: 24, height: 24, backgroundColor: "#FFF", borderRadius: 4 }}></div>
          CVPassport
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.navGroup}>
            <div style={s.navLabel}>System</div>
            <div style={s.navItem(true)}>Dashboard</div>
            <div style={s.navItem(false)}>Analytics</div>
          </div>
          <div style={s.navGroup}>
            <div style={s.navLabel}>Users</div>
            <div style={s.navItem(false)}>All Users</div>
            <div style={s.navItem(false)}>Pro Access</div>
            <div style={s.navItem(false)}>Abuse Reports</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={s.avatar}>JK</div>
          <div style={{ fontSize: "12px" }}>
            <div style={{ fontWeight: "600" }}>Janis K.</div>
            <div style={{ color: "#444", fontSize: "10px" }}>Founder</div>
          </div>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.topBar}>
          <input
            style={s.searchPill}
            placeholder="Search users, emails, or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: "12px" }}>
            <button style={s.btnGhost} onClick={savePaymentSettings}>Save Settings</button>
            <button style={s.btnGhost}>Export CSV</button>
            <button style={s.btnWhite} onClick={() => setShowModal(true)}>Grant Access</button>
          </div>
        </header>

        <div style={s.content}>
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

          <div style={s.tabBar}>
            {["all", "free", "pro", "trial", "flagged"].map((t) => (
              <button
                key={t}
                style={s.tabBtn(tab === t)}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

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
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td style={s.td}>
                    <div style={{ fontWeight: "500", color: "#FFF" }}>{u.email}</div>
                    <div style={{ fontSize: "11px", color: "#444", fontFamily: "monospace" }}>ID: {String(u.id || "").slice(0, 8)}</div>
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(u.flagged ? "FLAGGED" : String(u.plan || "FREE").toUpperCase())}>{u.plan}</span>
                  </td>
                  <td style={s.td}>
                    <div style={{ fontSize: "12px" }}>{u.cv_count || 0} CVs</div>
                    <div style={{ fontSize: "11px", color: "#444" }}>{u.download_count || 0} DLs</div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <div style={s.dot(Boolean(u.features?.ats))}></div>
                      <div style={s.dot(Boolean(u.features?.ai))}></div>
                      <div style={s.dot(Boolean(u.features?.premium))}></div>
                      <div style={s.dot(Boolean(u.features?.custom))}></div>
                    </div>
                  </td>
                  <td style={s.td}>{u.expiry ? new Date(u.expiry).toLocaleDateString() : "-"}</td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <button
                      style={{ ...s.btnGhost, padding: "4px 12px", fontSize: "11px" }}
                      onClick={() => {
                        setSelectedUser(u);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>Grant Access</h3>
            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} style={s.input}>
              <option>FREE</option>
              <option>PRO</option>
              <option>TRIAL</option>
              <option>MAX</option>
            </select>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={s.input} />
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button onClick={updatePlan} style={s.btnWhite}>Save</button>
              <button onClick={() => setShowModal(false)} style={s.btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

