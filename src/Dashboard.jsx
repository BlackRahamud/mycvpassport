import React, { useState } from 'react';

const C = {
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  border: "#2a2a3a",
  text: "#f0f0ff",
  muted: "#8888aa",
  accent: "#6366f1",
  gold: "#f59e0b",
  success: "#10b981",
  danger: "#ef4444",
};

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text }}>
      
      {/* SIDEBAR */}
      <div style={{ width: "240px", background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed", height: "100vh" }}>
        {/* Logo */}
        <div style={{ padding: "0 24px 32px" }}>
  <img
    src="/images/website-logo.png"
    alt="CV Passport Logo"
    style={{ width: "160px", height: "auto" }}
  />
</div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'mycvs', label: 'My CVs' },
            { id: 'templates', label: 'Templates' },
            { id: 'ats', label: 'ATS Check' },
            { id: 'cover', label: 'Cover Letter' },
          ].map(item => (
            <div
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                marginBottom: "4px",
                background: activeNav === item.id ? C.card : "transparent",
                color: activeNav === item.id ? C.text : C.muted,
                border: activeNav === item.id ? `1px solid ${C.border}` : "1px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              {item.label}
            </div>
          ))}
        </nav>

        {/* User + Upgrade */}
        <div style={{ padding: "0 12px" }}>
          <div style={{ padding: "12px", borderRadius: "8px", background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "13px", color: C.muted, marginBottom: "8px" }}>Free Plan</div>
            <button style={{
              width: "100%", padding: "8px", borderRadius: "6px",
              background: C.accent, color: C.text, border: "none",
              cursor: "pointer", fontWeight: "600", fontSize: "13px"
            }}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: "240px", flex: 1, padding: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Dashboard</h1>
        <p style={{ color: C.muted, marginBottom: "32px" }}>Welcome back, Junaid</p>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
          {[
            { label: "Total CVs", value: "3" },
            { label: "ATS Score", value: "78%" },
            { label: "Downloads", value: "5" },
            { label: "Profile", value: "60%" },
          ].map(stat => (
            <div key={stat.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: C.text }}>{stat.value}</div>
              <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CV CARDS */}
        <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>My CVs</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {["Banking CV", "Tech CV", "General CV"].map(cv => (
            <div key={cv} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ height: "120px", background: C.surface, borderRadius: "8px", marginBottom: "16px", border: `1px solid ${C.border}` }} />
              <div style={{ fontWeight: "600", marginBottom: "4px" }}>{cv}</div>
              <div style={{ fontSize: "12px", color: C.muted, marginBottom: "16px" }}>ATS Score: 78%</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ flex: 1, padding: "8px", borderRadius: "6px", background: "transparent", color: C.text, border: `1px solid ${C.border}`, cursor: "pointer", fontSize: "13px", transition: "all 0.2s ease" }}>Edit</button>
                <button style={{ flex: 1, padding: "8px", borderRadius: "6px", background: C.surface, color: C.text, border: `1px solid ${C.border}`, cursor: "pointer", fontSize: "13px", transition: "all 0.2s ease" }}>Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: "280px", background: C.surface, borderLeft: `1px solid ${C.border}`, padding: "32px 20px", position: "fixed", right: 0, height: "100vh", overflowY: "auto" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>ATS Score</h3>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
          <div style={{ fontSize: "32px", fontWeight: "800", color: C.success }}>78%</div>
          <div style={{ fontSize: "13px", color: C.muted }}>Good — above average</div>
        </div>

        <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Quick Tip</h3>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.6" }}>Add your visa status to increase your profile match rate in the UAE job market.</div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.gold}`, borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: C.gold, marginBottom: "4px" }}>Go Pro</div>
          <div style={{ fontSize: "13px", color: C.muted, marginBottom: "12px" }}>Unlimited CVs, all templates, ATS matching</div>
          <div style={{ fontSize: "20px", fontWeight: "800", marginBottom: "12px" }}>AED 29<span style={{ fontSize: "13px", color: C.muted }}>/mo</span></div>
          <button style={{ width: "100%", padding: "10px", borderRadius: "6px", background: C.gold, color: "#000", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}>Upgrade Now</button>
        </div>
      </div>

    </div>
  );
}