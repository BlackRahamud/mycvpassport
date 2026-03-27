import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const ADMIN_EMAIL = "connectingjunaidkhan@gmail.com";

export default function AdminPanel() {
  const TOKENS = {
    bg: "#0A0A0A",
    surface: "#141414",
    elevated: "#1C1C1C",
    border: "#2A2A2A",
    text: "#FFFFFF",
    muted: "#A1A1AA",
    accent: "#4F46E5",
  };

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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: TOKENS.bg,
          color: TOKENS.text,
          fontFamily: "Inter, sans-serif",
          padding: 24,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: TOKENS.bg,
        color: TOKENS.text,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <aside
        style={{
          width: 260,
          background: TOKENS.surface,
          borderRight: `1px solid ${TOKENS.border}`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>CVPassport Admin</div>
        <div style={{ color: TOKENS.muted, fontSize: 13, lineHeight: 1.5 }}>
          Dark control centre for users, plans, downloads and payment settings.
        </div>
        <div
          style={{
            marginTop: 8,
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              background: TOKENS.elevated,
              border: `1px solid ${TOKENS.border}`,
              padding: 12,
            }}
          >
            <div style={{ color: TOKENS.muted, fontSize: 12 }}>Total Users</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{users.length}</div>
          </div>
          <div
            style={{
              background: TOKENS.elevated,
              border: `1px solid ${TOKENS.border}`,
              padding: 12,
            }}
          >
            <div style={{ color: TOKENS.muted, fontSize: 12 }}>Flagged</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {users.filter((u) => u.flagged).length}
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, padding: 24 }}>
        {/* 🔝 TOP BAR */}
        <div
          style={{
            display: "flex",
            marginBottom: 20,
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: TOKENS.surface,
              border: `1px solid ${TOKENS.border}`,
              color: TOKENS.text,
              outline: "none",
            }}
          />
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: TOKENS.accent,
              border: "none",
              color: TOKENS.text,
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Grant Access
          </button>
        </div>

        {/* 💳 PAYMENT CONTROL */}
        <div
          style={{
            background: TOKENS.surface,
            padding: 16,
            border: `1px solid ${TOKENS.border}`,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, marginBottom: 10, color: TOKENS.muted }}>
            Payment Control
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            {["stripe", "manual", "disabled"].map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                style={{
                  background: provider === p ? TOKENS.accent : TOKENS.elevated,
                  border: `1px solid ${TOKENS.border}`,
                  color: TOKENS.text,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, marginBottom: 6, color: TOKENS.muted }}>
            Pricing
          </div>

          <input
            type="number"
            value={pricing.PRO || ""}
            onChange={(e) => setPricing({ ...pricing, PRO: Number(e.target.value) })}
            placeholder="PRO price"
            style={{
              marginRight: 10,
              background: TOKENS.elevated,
              border: `1px solid ${TOKENS.border}`,
              color: TOKENS.text,
              padding: "8px 10px",
            }}
          />

          <input
            type="number"
            value={pricing.MAX || ""}
            onChange={(e) => setPricing({ ...pricing, MAX: Number(e.target.value) })}
            placeholder="MAX price"
            style={{
              background: TOKENS.elevated,
              border: `1px solid ${TOKENS.border}`,
              color: TOKENS.text,
              padding: "8px 10px",
            }}
          />

          <div style={{ marginTop: 10 }}>
            <button
              onClick={savePaymentSettings}
              style={{
                background: TOKENS.accent,
                color: TOKENS.text,
                border: "none",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Save Settings
            </button>
          </div>
        </div>

        {/* 📊 TABS */}
        <div style={{ marginBottom: 20 }}>
          {["all", "free", "pro", "trial", "flagged"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                marginRight: 10,
                marginBottom: 8,
                background: tab === t ? TOKENS.accent : TOKENS.elevated,
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.text,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, padding: 12 }}>
            <div style={{ color: TOKENS.muted, fontSize: 12 }}>Shown Users</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{filtered.length}</div>
          </div>
          <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, padding: 12 }}>
            <div style={{ color: TOKENS.muted, fontSize: 12 }}>Total CVs</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {filtered.reduce((sum, u) => sum + (u.cv_count || 0), 0)}
            </div>
          </div>
          <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, padding: 12 }}>
            <div style={{ color: TOKENS.muted, fontSize: 12 }}>Total Downloads</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {filtered.reduce((sum, u) => sum + (u.download_count || 0), 0)}
            </div>
          </div>
        </div>

        {/* 📋 TABLE */}
        <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, overflow: "hidden" }}>
          <table width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: TOKENS.elevated }}>
                <th style={{ padding: "12px 10px", textAlign: "left", fontSize: 12, color: TOKENS.muted }}>Email</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontSize: 12, color: TOKENS.muted }}>Plan</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontSize: 12, color: TOKENS.muted }}>CVs</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontSize: 12, color: TOKENS.muted }}>Downloads</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontSize: 12, color: TOKENS.muted }}>Features</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontSize: 12, color: TOKENS.muted }}>Expiry</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontSize: 12, color: TOKENS.muted }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ borderTop: `1px solid ${TOKENS.border}` }}>
                  <td style={{ padding: "12px 10px", fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: "12px 10px", fontSize: 13 }}>{u.plan}</td>
                  <td style={{ padding: "12px 10px", fontSize: 13 }}>{u.cv_count}</td>
                  <td style={{ padding: "12px 10px", fontSize: 13 }}>{u.download_count}</td>

                  {/* FEATURE DOTS */}
                  <td style={{ padding: "12px 10px" }}>
                    {u.features &&
                      Object.values(u.features).map((f, i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-block",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: f ? TOKENS.accent : "#333",
                            marginRight: 4,
                          }}
                        />
                      ))}
                  </td>

                  <td style={{ padding: "12px 10px", fontSize: 13 }}>
                    {u.expiry ? new Date(u.expiry).toLocaleDateString() : "-"}
                  </td>

                  <td style={{ padding: "12px 10px" }}>
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowModal(true);
                      }}
                      style={{
                        background: TOKENS.elevated,
                        color: TOKENS.text,
                        border: `1px solid ${TOKENS.border}`,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🧠 MODAL */}
        {showModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.78)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: TOKENS.surface,
                border: `1px solid ${TOKENS.border}`,
                padding: 20,
                minWidth: 320,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 14 }}>Grant Access</h3>

              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  background: TOKENS.elevated,
                  color: TOKENS.text,
                  border: `1px solid ${TOKENS.border}`,
                  padding: "8px 10px",
                }}
              >
                <option>FREE</option>
                <option>PRO</option>
                <option>TRIAL</option>
                <option>MAX</option>
              </select>

              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                style={{
                  width: "100%",
                  background: TOKENS.elevated,
                  color: TOKENS.text,
                  border: `1px solid ${TOKENS.border}`,
                  padding: "8px 10px",
                }}
              />

              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button
                  onClick={updatePlan}
                  style={{
                    background: TOKENS.accent,
                    color: TOKENS.text,
                    border: "none",
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: TOKENS.elevated,
                    color: TOKENS.text,
                    border: `1px solid ${TOKENS.border}`,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

