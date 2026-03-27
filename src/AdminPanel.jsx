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

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#09090b",
      color: "#fff",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{ flex: 1, padding: 20 }}>
        {/* 🔝 TOP BAR */}
        <div style={{ display: "flex", marginBottom: 20 }}>
          <input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: 8,
              background: "#111",
              border: "1px solid #333",
              color: "#fff"
            }}
          />
          <button
            onClick={() => setShowModal(true)}
            style={{ marginLeft: 10 }}
          >
            Grant Access
          </button>
        </div>

        {/* 💳 PAYMENT CONTROL */}
        <div
          style={{
            background: "#121214",
            padding: 16,
            border: "1px solid #27272a",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, marginBottom: 10 }}>
            Payment Control
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            {["stripe", "manual", "disabled"].map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                style={{
                  background: provider === p ? "#3b82f6" : "#222",
                  color: "#fff",
                  padding: "6px 12px",
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, marginBottom: 6 }}>Pricing</div>

          <input
            type="number"
            value={pricing.PRO || ""}
            onChange={(e) => setPricing({ ...pricing, PRO: Number(e.target.value) })}
            placeholder="PRO price"
            style={{ marginRight: 10 }}
          />

          <input
            type="number"
            value={pricing.MAX || ""}
            onChange={(e) => setPricing({ ...pricing, MAX: Number(e.target.value) })}
            placeholder="MAX price"
          />

          <div style={{ marginTop: 10 }}>
            <button onClick={savePaymentSettings}>Save Settings</button>
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
                background: tab === t ? "#3b82f6" : "#222",
                color: "#fff",
                padding: "6px 12px",
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* 📋 TABLE */}
        <table width="100%">
          <thead>
            <tr>
              <th>Email</th>
              <th>Plan</th>
              <th>CVs</th>
              <th>Downloads</th>
              <th>Features</th>
              <th>Expiry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.plan}</td>
                <td>{u.cv_count}</td>
                <td>{u.download_count}</td>

                {/* FEATURE DOTS */}
                <td>
                  {u.features &&
                    Object.values(u.features).map((f, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: f ? "#3b82f6" : "#333",
                          marginRight: 4,
                        }}
                      />
                    ))}
                </td>

                <td>{u.expiry ? new Date(u.expiry).toLocaleDateString() : "-"}</td>

                <td>
                  <button
                    onClick={() => {
                      setSelectedUser(u);
                      setShowModal(true);
                    }}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 🧠 MODAL */}
        {showModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ background: "#111", padding: 20 }}>
              <h3>Grant Access</h3>

              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)}>
                <option>FREE</option>
                <option>PRO</option>
                <option>TRIAL</option>
                <option>MAX</option>
              </select>

              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />

              <div style={{ marginTop: 10 }}>
                <button onClick={updatePlan}>Save</button>
                <button onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

