// Preview rebuild trigger: Career Services page deployment verification.
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import safeFetch from "../lib/net/safeFetch";
import { logEvent } from "../lib/analytics/logEvent";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const DELIVERY = {
  standard: { label: "Standard", price: 199, time: "Delivery within 3 hours" },
  express: { label: "Express", price: 299, time: "Priority · 30–60 minutes*" },
};
const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid #E3DFD9", borderRadius: 11,
  background: "#fff", color: "#22252B", padding: "12px 13px", font: "inherit", fontSize: 13,
  outlineColor: "#C87538",
};

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load secure checkout")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Unable to load secure checkout"));
    document.body.appendChild(script);
  });
}

export default function CareerServicesPage({ user }) {
  const [mode, setMode] = useState("upload");
  const [delivery, setDelivery] = useState("standard");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const price = DELIVERY[delivery];

  const hasSource = useMemo(() => mode === "upload" ? !!file : notes.trim().length >= 20, [mode, file, notes]);

  async function handleCheckout(event) {
    event.preventDefault();
    setError("");
    if (!user?.id) {
      setError("Please sign in to continue with secure payment.");
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim() || !role.trim()) {
      setError("Please complete your name, email, phone and target role.");
      return;
    }
    if (!hasSource) {
      setError(mode === "upload" ? "Please choose your existing CV file." : "Please add a few details about your work and experience (at least 20 characters).");
      return;
    }
    if (file) {
      const valid = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type);
      if (!valid) return setError("Please upload a PDF or DOCX file.");
      if (file.size > 8 * 1024 * 1024) return setError("Your CV must be 8 MB or smaller.");
    }

    setBusy(true);
    let uploadedPath = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
        uploadedPath = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("career-service-files")
          .upload(uploadedPath, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
      }

      const payload = {
        user_id: user.id,
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        market: "India",
        service_type: "cv_creation",
        delivery_speed: delivery,
        price_minor: price.price * 100,
        currency: "INR",
        target_role: role.trim(),
        experience: "Provided in CV / notes",
        notes: mode === "notes" ? notes.trim() : "",
        cv_file_path: uploadedPath,
      };
      const { data: order, error: insertError } = await supabase.from("career_service_orders")
        .insert(payload).select("id").single();
      if (insertError) throw insertError;

      const orderResponse = await safeFetch("/api/razorpay?action=order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cv_service: delivery, career_order_id: order.id }),
      });
      const orderData = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) throw new Error(orderData.error || "Could not start payment.");

      const Razorpay = await loadRazorpay();
      const key = process.env.REACT_APP_RAZORPAY_KEY_ID;
      if (!key) throw new Error("Payment gateway is not configured.");
      const checkout = new Razorpay({
        key,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CVPassport",
        description: `Human-written CV · ${price.label}`,
        prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() },
        theme: { color: "#B65D2C" },
        handler: async (response) => {
          try {
            const verify = await safeFetch("/api/razorpay?action=verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
                cv_service: delivery,
                career_order_id: order.id,
              }),
            });
            const verified = await verify.json().catch(() => ({}));
            if (!verify.ok || !verified.success) throw new Error(verified.error || "Payment verification failed.");
            setPaid(true);
            logEvent("purchase_completed", { plan: `human_cv_${delivery}`, amount: price.price, currency: "INR", gateway: "razorpay" });
          } catch (verifyError) {
            setError(verifyError.message || "Payment verification is pending. Contact support with your payment reference.");
          }
        },
        modal: { ondismiss: () => setError("Checkout closed. Your request is saved; you can try again.") },
      });
      checkout.on("payment.failed", (response) => setError(response?.error?.description || "Payment failed. Please try again."));
      logEvent("checkout_started", { plan: `human_cv_${delivery}`, amount: price.price, currency: "INR", gateway: "razorpay" });
      checkout.open();
    } catch (submitError) {
      setError(submitError?.message || "We couldn't start your order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F7F1EB", color: "#22252B", fontFamily: "'Outfit','Segoe UI',sans-serif" }}>
      <style>{`
        .hcv-wrap{max-width:1120px;margin:0 auto;padding:24px 24px 70px}
        .hcv-panel{background:rgba(255,255,255,.82);border:1px solid #E8DDD2;border-radius:18px;box-shadow:0 18px 50px rgba(74,47,30,.08)}
        .hcv-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .hcv-mode{border:1px solid #E3D8CE;background:#fff;border-radius:11px;padding:12px 14px;text-align:left;color:#3D3028;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
        .hcv-mode[aria-pressed="true"]{border-color:#B65D2C;background:#FFF5EC;color:#9A431E}
        .hcv-speed{border:1px solid #E5DCD4;border-radius:13px;padding:14px;background:#fff;text-align:left;cursor:pointer;color:#2B2B2B;font:inherit}
        .hcv-speed[aria-pressed="true"]{border:1.5px solid #B65D2C;background:#FFF7F0;box-shadow:0 0 0 2px rgba(182,93,44,.08)}
        .hcv-label{font-size:10px;letter-spacing:.08em;font-weight:800;color:#78685C}
        @media(max-width:760px){.hcv-grid{grid-template-columns:1fr}.hcv-wrap{padding:18px 14px 50px}}
      `}</style>
      <div className="hcv-wrap">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <Link to="/" style={{ color: "#24262C", textDecoration: "none", fontWeight: 850, fontSize: 19, letterSpacing: "-.04em" }}>❯❯ CVPassport</Link>
          <Link to="/" style={{ color: "#7A6B60", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>Back to home</Link>
        </header>

        {paid ? (
          <section className="hcv-panel" style={{ maxWidth: 650, margin: "70px auto", padding: 38, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 50, display: "grid", placeItems: "center", margin: "0 auto 16px", background: "#E8F4E9", color: "#267345", fontSize: 26 }}>✓</div>
            <p className="hcv-label">PAYMENT CONFIRMED</p>
            <h1 style={{ fontSize: 30, margin: "10px 0" }}>We'll take it from here.</h1>
            <p style={{ color: "#76685F", lineHeight: 1.7 }}>Your CV order is paid. Our team will review your file and notes, then prepare your CV for delivery. A confirmation will be sent to {email}.</p>
            <p style={{ color: "#8A7A6F", fontSize: 12 }}>Keep an eye on your email for delivery updates.</p>
            <Link to="/" style={{ display: "inline-flex", padding: "12px 18px", borderRadius: 10, background: "#292D35", color: "#fff", textDecoration: "none", fontWeight: 700 }}>Back to CVPassport</Link>
          </section>
        ) : (
          <>
            <section className="hcv-panel" style={{ padding: "22px 26px", marginBottom: 18, display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18, alignItems: "center", overflow: "hidden" }}>
              <div>
                <span style={{ display: "inline-flex", padding: "5px 9px", borderRadius: 99, background: "#FCE7D8", color: "#A94F25", fontSize: 10, fontWeight: 800, marginBottom: 10 }}>♙ Human CV Service</span>
                <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(29px,4vw,43px)", lineHeight: 1.05, letterSpacing: "-.045em", margin: "0 0 10px" }}>We’ll Take It From <em style={{ color: "#B65D2C" }}>Here.</em></h1>
                <p style={{ margin: 0, maxWidth: 520, color: "#71645A", fontSize: 13, lineHeight: 1.65 }}>Share what you have, and our CV experts will craft a clean, ATS-friendly CV that gets you noticed.</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18, color: "#59483C", fontSize: 11, fontWeight: 700 }}>
                  <span>✎ Human written</span><span>▤ ATS-friendly</span><span>▣ PDF + Word</span><span>↻ One revision</span>
                </div>
              </div>
              <div style={{ minHeight: 145, borderRadius: 14, background: "radial-gradient(circle at 70% 30%,#F8D7BF,transparent 55%),linear-gradient(135deg,#F5E6D9,#FFF9F3)", display: "grid", placeItems: "center", color: "#A65B37", fontFamily: "Georgia,serif", fontSize: 20, textAlign: "center", padding: 18 }}>
                <div style={{ transform: "rotate(-5deg)", background: "#fff", padding: "17px 25px", boxShadow: "0 12px 25px rgba(90,55,35,.12)", borderRadius: 7 }}>CV <span style={{ color: "#B65D2C" }}>Ready</span><div style={{ fontFamily: "Arial", fontSize: 9, marginTop: 7, color: "#8792A2" }}>YOUR NEXT CHAPTER</div></div>
              </div>
            </section>

            <form className="hcv-panel" onSubmit={handleCheckout} style={{ padding: 22 }}>
              <div className="hcv-grid" style={{ marginBottom: 14 }}>
                <button type="button" className="hcv-mode" aria-pressed={mode === "upload"} onClick={() => setMode("upload")}>▧　Mode 1　Drop Existing CV & Notes</button>
                <button type="button" className="hcv-mode" aria-pressed={mode === "notes"} onClick={() => setMode("notes")}>♩　Mode 2　Quick Notes / Rough Details</button>
              </div>
              <div className="hcv-grid" style={{ alignItems: "start" }}>
                <section>
                  {mode === "upload" ? (
                    <label htmlFor="hcv-file" style={{ display: "grid", placeItems: "center", minHeight: 112, padding: 16, border: "1px dashed #C9B7A8", borderRadius: 13, background: "#FFFCF9", cursor: "pointer", textAlign: "center" }}>
                      <strong style={{ fontSize: 13 }}>＋ Upload your CV file or browse</strong>
                      <span style={{ color: "#82756C", fontSize: 11, marginTop: 5 }}>PDF or Word · max 8 MB</span>
                      <input id="hcv-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginTop: 12, maxWidth: "100%" }} />
                      {file && <span style={{ marginTop: 7, color: "#277348", fontSize: 11, fontWeight: 700 }}>{file.name}</span>}
                    </label>
                  ) : (
                    <div>
                      <label className="hcv-label" htmlFor="hcv-notes">YOUR EXPERIENCE / ROUGH NOTES</label>
                      <textarea id="hcv-notes" rows={7} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write your previous roles, responsibilities, achievements, education and skills. Don't worry about formatting..." style={{ ...inputStyle, marginTop: 8, resize: "vertical", lineHeight: 1.6 }} />
                    </div>
                  )}
                  <div style={{ marginTop: 15 }}>
                    <label className="hcv-label" htmlFor="hcv-role">TARGET ROLE / ANY CHANGES? (OPTIONAL)</label>
                    <input id="hcv-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Target role is Marketing Manager..." style={{ ...inputStyle, marginTop: 7 }} required />
                  </div>
                </section>

                <section>
                  <div className="hcv-label" style={{ marginBottom: 8 }}>YOUR DETAILS</div>
                  <div style={{ display: "grid", gap: 9 }}>
                    <input aria-label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inputStyle} required />
                    <input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" style={inputStyle} required />
                    <input aria-label="Phone or WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone / WhatsApp" style={inputStyle} required />
                    {!user && <p style={{ margin: 0, color: "#9B5A2D", fontSize: 11 }}>Sign in is required before secure checkout.</p>}
                  </div>
                </section>
              </div>

              <div style={{ marginTop: 22, borderTop: "1px solid #EDE3DA", paddingTop: 18 }}>
                <div className="hcv-label" style={{ marginBottom: 10 }}>CHOOSE YOUR DELIVERY SPEED</div>
                <div className="hcv-grid">
                  {Object.entries(DELIVERY).map(([key, option]) => (
                    <button type="button" key={key} className="hcv-speed" aria-pressed={delivery === key} onClick={() => setDelivery(key)}>
                      <span className="hcv-label" style={{ color: "#B65D2C" }}>{option.label.toUpperCase()}</span>
                      <strong style={{ display: "block", fontSize: 25, margin: "3px 0" }}>₹{option.price}</strong>
                      <span style={{ color: "#7D7067", fontSize: 11 }}>{option.time}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginTop: 18, flexWrap: "wrap" }}>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#5F665A", fontSize: 11, lineHeight: 1.9 }}>
                  <li>Professional, tailored CV</li><li>ATS-friendly formatting</li><li>PDF + Word delivery</li><li>One free revision</li>
                </ul>
                <div style={{ flex: "1 1 280px", textAlign: "right" }}>
                  {error && <p role="alert" style={{ color: "#B43D35", fontSize: 12, margin: "0 0 9px" }}>{error}</p>}
                  <button type="submit" disabled={busy} style={{ width: "100%", maxWidth: 390, border: 0, borderRadius: 999, padding: "15px 20px", background: busy ? "#9D9A97" : "#245DDE", color: "#fff", font: "inherit", fontWeight: 800, fontSize: 13, cursor: busy ? "wait" : "pointer", boxShadow: "0 8px 18px rgba(36,93,222,.22)" }}>
                    {busy ? "Preparing secure checkout…" : `⚡ Continue to Secure Payment · ₹${price.price} →`}
                  </button>
                  <p style={{ color: "#8B7E74", fontSize: 10, margin: "9px 0 0" }}>♙ Secure checkout via Razorpay. Delivery time starts after payment and receipt of all required details. Express subject to availability.</p>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
