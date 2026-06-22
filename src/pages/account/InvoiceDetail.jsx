import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { renderInvoiceHTML } from "../../invoices/render";

const S = {
  page: {
    minHeight: "100vh",
    background: "#0A0A0A",
    color: "#FFFFFF",
    fontFamily: "Inter, -apple-system, system-ui, sans-serif",
  },
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "rgba(10,10,10,0.9)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderBottom: "1px solid #1F1F1F",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
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
  meta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  metaNum: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 13,
    color: "#FFFFFF",
  },
  metaSub: {
    fontSize: 11,
    color: "#8A8378",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  actions: {
    display: "flex",
    gap: 8,
  },
  btn: {
    background: "#FFFFFF",
    color: "#000000",
    border: "none",
    borderRadius: 9,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnGhost: {
    background: "transparent",
    color: "#A0A0A0",
    border: "1px solid #2A2A2A",
    borderRadius: 9,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  empty: {
    textAlign: "center",
    padding: "80px 24px",
    color: "#A0A0A0",
    fontSize: 14,
  },
  iframeWrap: {
    background: "#d9d6d0",
    minHeight: "calc(100vh - 60px)",
  },
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // RLS will return zero rows if the document doesn't belong to the
        // current user. .single() then throws PGRST116; we surface as 404.
        const { data, error: err } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", id)
          .single();
        if (cancelled) return;
        if (err) {
          setError(err.code === "PGRST116" ? "Document not found." : err.message);
        } else {
          setInvoice(data);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load document.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const srcDoc = useMemo(() => (invoice ? renderInvoiceHTML(invoice) : null), [invoice]);

  function handlePrint() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

  const docLabel = invoice?.kind === "receipt" ? "Receipt" : "Invoice";

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button type="button" onClick={() => navigate("/account/invoices")} style={S.back}>← Billing</button>
        <div style={S.meta}>
          <div style={S.metaNum}>{invoice?.invoice_number || ""}</div>
          <div style={S.metaSub}>{docLabel}</div>
        </div>
        <div style={S.actions}>
          <button type="button" onClick={() => navigate("/account/invoices")} style={S.btnGhost}>All documents</button>
          <button type="button" onClick={handlePrint} style={S.btn} disabled={!invoice}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={S.empty}>Loading…</div>
      ) : error ? (
        <div style={{ ...S.empty, color: "#FCA5A5" }}>{error}</div>
      ) : !invoice ? (
        <div style={S.empty}>Document not found.</div>
      ) : (
        <div style={S.iframeWrap}>
          <iframe
            ref={iframeRef}
            title={`CVPassport ${docLabel} ${invoice.invoice_number}`}
            srcDoc={srcDoc}
            style={{
              width: "100%",
              height: "calc(100vh - 60px)",
              border: "none",
              display: "block",
              background: "#d9d6d0",
            }}
          />
        </div>
      )}
    </div>
  );
}
