import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const S = {
  page: {
    minHeight: "100vh",
    background: "#0A0A0A",
    color: "#FFFFFF",
    fontFamily: "Inter, -apple-system, system-ui, sans-serif",
  },
  shell: {
    maxWidth: 920,
    margin: "0 auto",
    padding: "32px 24px 80px",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  back: {
    background: "transparent",
    border: "none",
    color: "#A0A0A0",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  h1: {
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 8px",
    letterSpacing: "-0.015em",
  },
  sub: {
    fontSize: 14,
    color: "#A0A0A0",
    margin: "0 0 28px",
  },
  card: {
    background: "#141414",
    border: "1px solid #2A2A2A",
    borderRadius: 12,
    overflow: "hidden",
  },
  empty: {
    padding: "40px 24px",
    textAlign: "center",
    color: "#A0A0A0",
    fontSize: 14,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 1fr 100px",
    gap: 18,
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1F1F1F",
    fontSize: 13,
  },
  rowHead: {
    color: "#8A8378",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: 10.5,
    fontWeight: 600,
    background: "#0E0E0E",
  },
  numMono: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    color: "#FFFFFF",
    fontVariantNumeric: "tabular-nums",
  },
  badge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.06em",
    background: "rgba(31,122,77,0.14)",
    color: "#4ADE80",
  },
  viewLink: {
    color: "#D97706",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
  },
};

function formatMoney(currency, total) {
  const v = Number(total || 0).toFixed(2);
  if (currency === "INR") return `₹${v}`;
  if (currency === "AED") return `AED ${v}`;
  return `${currency} ${v}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function InvoicesList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // RLS scopes to current user — no explicit user_id filter needed.
        const { data, error: err } = await supabase
          .from("invoices")
          .select("id, invoice_number, kind, description, currency, total, status, issued_at, gateway")
          .order("issued_at", { ascending: false });
        if (cancelled) return;
        if (err) {
          setError(err.message);
        } else {
          setRows(data || []);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <div style={S.topBar}>
          <button type="button" onClick={() => navigate("/account")} style={S.back}>← Account</button>
        </div>
        <h1 style={S.h1}>Billing</h1>
        <p style={S.sub}>Invoices and receipts for every CVPassport purchase you've made.</p>

        <div style={S.card}>
          <div style={{ ...S.row, ...S.rowHead }}>
            <div>Document</div>
            <div>Plan</div>
            <div>Date</div>
            <div style={{ textAlign: "right" }}>Amount</div>
            <div style={{ textAlign: "right" }}>View</div>
          </div>

          {loading ? (
            <div style={S.empty}>Loading…</div>
          ) : error ? (
            <div style={{ ...S.empty, color: "#FCA5A5" }}>{error}</div>
          ) : rows.length === 0 ? (
            <div style={S.empty}>No invoices yet. Once you upgrade, your receipts will land here.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} style={S.row}>
                <div>
                  <div style={S.numMono}>{r.invoice_number}</div>
                  <div style={{ fontSize: 11, color: "#8A8378", marginTop: 2, textTransform: "capitalize" }}>
                    {r.kind} · {r.gateway === "razorpay" ? "Razorpay" : "Ziina"}
                  </div>
                </div>
                <div style={{ color: "#E5E5E5" }}>{r.description || "—"}</div>
                <div style={{ color: "#A0A0A0" }}>{formatDate(r.issued_at)}</div>
                <div style={{ textAlign: "right" }}>
                  <span style={S.numMono}>{formatMoney(r.currency, r.total)}</span>
                  <div style={{ marginTop: 4 }}>
                    <span style={S.badge}>{(r.status || "paid").toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Link to={`/account/invoices/${r.id}`} style={S.viewLink}>Open →</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
