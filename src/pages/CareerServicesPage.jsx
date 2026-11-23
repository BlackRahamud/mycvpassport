import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const SERVICES = [
  { id: "cv_creation", title: "Professional CV creation", detail: "A recruiter-ready CV written around your experience and target role." },
  { id: "cv_ats", title: "CV + ATS improvement", detail: "Improve structure, keywords and clarity before you apply." },
  { id: "career_consultation", title: "One-to-one career consultation", detail: "A focused session to plan your next career move." },
  { id: "gulf_guidance", title: "India-to-Gulf career guidance", detail: "Practical guidance on GCC CV expectations and job-search preparation." },
];

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid #E2E7EF", borderRadius: 12,
  background: "#fff", color: "#172033", padding: "13px 14px", font: "inherit", fontSize: 14,
  outlineColor: "#7B91C8",
};

export default function CareerServicesPage({ user }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
    email: user?.email || "",
    phone: "",
    market: "India",
    service_type: "cv_creation",
    target_role: "",
    experience: "",
    notes: "",
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const selectedService = useMemo(
    () => SERVICES.find((service) => service.id === form.service_type) || SERVICES[0],
    [form.service_type]
  );

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    if (file) {
      const validType = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type);
      if (!validType) return setError("Please upload a PDF or DOCX file.");
      if (file.size > 8 * 1024 * 1024) return setError("Your CV must be 8 MB or smaller.");
    }

    setBusy(true);
    let uploadedPath = null;
    try {
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90);
        uploadedPath = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("career-service-files")
          .upload(uploadedPath, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
      }

      const payload = {
        user_id: user.id,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        market: form.market,
        service_type: form.service_type,
        target_role: form.target_role.trim(),
        experience: form.experience.trim(),
        notes: form.notes.trim(),
        cv_file_path: uploadedPath,
      };
      const { data, error: insertError } = await supabase
        .from("career_service_orders")
        .insert(payload)
        .select("id,created_at")
        .single();
      if (insertError) throw insertError;
      setSubmitted(data);
    } catch (submitError) {
      if (uploadedPath) {
        await supabase.storage.from("career-service-files").remove([uploadedPath]).catch(() => {});
      }
      setError(submitError?.message || "We couldn't submit your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F6F7F4", color: "#172033", fontFamily: "'Outfit','Segoe UI',sans-serif" }}>
      <style>{`
        .cs-wrap{max-width:1120px;margin:0 auto;padding:28px 24px 80px}
        .cs-grid{display:grid;grid-template-columns:1fr 1.12fr;gap:28px;align-items:start}
        .cs-card{background:#fff;border:1px solid #E8EBEF;border-radius:22px;box-shadow:0 16px 45px rgba(27,42,65,.045)}
        .cs-field{display:grid;gap:7px}
        .cs-label{font-size:12px;font-weight:700;color:#536078;letter-spacing:.02em}
        .cs-service{display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid #E5E9F0;border-radius:14px;background:#fff;text-align:left;cursor:pointer;width:100%;color:inherit}
        .cs-service[aria-pressed="true"]{border-color:#8094C7;background:#F5F7FC;box-shadow:0 0 0 2px rgba(91,117,178,.09)}
        .cs-service-dot{width:18px;height:18px;border:1.5px solid #AAB4C4;border-radius:50%;flex:0 0 18px;margin-top:2px;display:grid;place-items:center}
        .cs-service[aria-pressed="true"] .cs-service-dot{border-color:#526B9F}
        .cs-service[aria-pressed="true"] .cs-service-dot:after{content:"";width:8px;height:8px;border-radius:50%;background:#526B9F}
        @media(max-width:800px){.cs-grid{grid-template-columns:1fr}.cs-wrap{padding:20px 16px 60px}}
      `}</style>
      <div className="cs-wrap">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 44 }}>
          <Link to="/" style={{ color: "#172033", textDecoration: "none", fontWeight: 800, letterSpacing: "-.03em", fontSize: 20 }}>CVPassport</Link>
          <Link to="/" style={{ color: "#69758A", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Back to home</Link>
        </header>

        {submitted ? (
          <section className="cs-card" style={{ maxWidth: 650, margin: "50px auto", padding: "48px 34px", textAlign: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: "#EAF3EE", color: "#26734B", display: "grid", placeItems: "center", margin: "0 auto 20px", fontSize: 25 }}>✓</div>
            <p style={{ color: "#6D7A8E", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Request received</p>
            <h1 style={{ fontSize: 30, letterSpacing: "-.04em", margin: "10px 0" }}>Your next career move starts here.</h1>
            <p style={{ color: "#66738A", lineHeight: 1.7 }}>We've received your {selectedService.title.toLowerCase()} request. Our team will contact you at <strong>{form.email}</strong> to confirm the scope, price and next steps.</p>
            <p style={{ color: "#7D8798", fontSize: 12, marginTop: 22 }}>Reference: {submitted.id}</p>
            <Link to="/" style={{ display: "inline-flex", marginTop: 16, padding: "13px 20px", borderRadius: 12, background: "#172033", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Return to CVPassport</Link>
          </section>
        ) : (
          <>
            <div style={{ maxWidth: 720, marginBottom: 34 }}>
              <p style={{ color: "#6C7FA7", fontWeight: 800, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", margin: "0 0 14px" }}>CVPassport Career Services</p>
              <h1 style={{ fontSize: "clamp(36px,5vw,58px)", lineHeight: 1.04, letterSpacing: "-.055em", margin: "0 0 18px", fontWeight: 800 }}>Get expert help with your next career move.</h1>
              <p style={{ maxWidth: 620, color: "#68758A", fontSize: 16, lineHeight: 1.75, margin: 0 }}>Practical, human support for your CV, job search and Gulf career plans — built for candidates in India and across the GCC.</p>
            </div>

            <div className="cs-grid">
              <section>
                <div style={{ display: "grid", gap: 12 }}>
                  {SERVICES.map((service) => (
                    <button key={service.id} type="button" className="cs-service" aria-pressed={form.service_type === service.id} onClick={() => update("service_type", service.id)}>
                      <span className="cs-service-dot" />
                      <span><strong style={{ display: "block", fontSize: 14, marginBottom: 4 }}>{service.title}</strong><span style={{ color: "#748096", fontSize: 12.5, lineHeight: 1.5 }}>{service.detail}</span></span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 18, padding: 20, borderRadius: 18, background: "#EDEFEA" }}>
                  <p style={{ margin: "0 0 7px", fontWeight: 800, fontSize: 13 }}>What happens next?</p>
                  <p style={{ margin: 0, color: "#667187", fontSize: 13, lineHeight: 1.7 }}>Submit your details. We'll review your request, contact you to confirm the service and quote, then arrange payment and delivery. No recruitment or visa outcome is guaranteed.</p>
                </div>
              </section>

              <form className="cs-card" onSubmit={handleSubmit} style={{ padding: 26, display: "grid", gap: 16 }}>
                <div style={{ marginBottom: 2 }}>
                  <p style={{ margin: 0, color: "#77839A", fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Your request</p>
                  <h2 style={{ margin: "7px 0 0", fontSize: 22, letterSpacing: "-.03em" }}>{selectedService.title}</h2>
                </div>
                {!user && <div style={{ padding: 12, borderRadius: 10, background: "#FDF6E8", color: "#8A641E", fontSize: 13 }}>Please sign in before submitting your request. Your details and uploaded CV stay linked to your account.</div>}
                <div className="cs-field"><label className="cs-label" htmlFor="cs-name">FULL NAME</label><input id="cs-name" required maxLength={120} style={inputStyle} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Your full name" /></div>
                <div className="cs-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cs-field"><label className="cs-label" htmlFor="cs-email">EMAIL</label><input id="cs-email" type="email" required maxLength={254} style={inputStyle} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" /></div>
                  <div className="cs-field"><label className="cs-label" htmlFor="cs-phone">PHONE / WHATSAPP</label><input id="cs-phone" required maxLength={30} style={inputStyle} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91..." /></div>
                </div>
                <div className="cs-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="cs-field"><label className="cs-label" htmlFor="cs-market">TARGET MARKET</label><select id="cs-market" style={inputStyle} value={form.market} onChange={(e) => update("market", e.target.value)}><option>India</option><option>UAE / Gulf</option></select></div>
                  <div className="cs-field"><label className="cs-label" htmlFor="cs-exp">EXPERIENCE</label><input id="cs-exp" required maxLength={80} style={inputStyle} value={form.experience} onChange={(e) => update("experience", e.target.value)} placeholder="e.g. 3 years" /></div>
                </div>
                <div className="cs-field"><label className="cs-label" htmlFor="cs-role">TARGET JOB ROLE</label><input id="cs-role" required maxLength={120} style={inputStyle} value={form.target_role} onChange={(e) => update("target_role", e.target.value)} placeholder="e.g. Senior AR Caller" /></div>
                <div className="cs-field"><label className="cs-label" htmlFor="cs-notes">WHAT WOULD YOU LIKE HELP WITH?</label><textarea id="cs-notes" rows={4} maxLength={2000} style={{ ...inputStyle, resize: "vertical" }} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Share your goals, challenges or any important details..." /></div>
                <div className="cs-field"><label className="cs-label" htmlFor="cs-file">UPLOAD EXISTING CV (OPTIONAL)</label><input id="cs-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: 10 }} /><span style={{ color: "#8791A2", fontSize: 11 }}>PDF or DOCX · max 8 MB · stored privately</span></div>
                {error && <p role="alert" style={{ margin: 0, color: "#B54444", fontSize: 13 }}>{error}</p>}
                <button type="submit" disabled={busy} style={{ border: 0, borderRadius: 13, background: busy ? "#8792A5" : "#172033", color: "#fff", padding: "15px 18px", font: "inherit", fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer" }}>{busy ? "Submitting request..." : user ? "Submit service request" : "Sign in to continue"}</button>
                <p style={{ margin: 0, textAlign: "center", color: "#8A94A4", fontSize: 11, lineHeight: 1.5 }}>By submitting, you agree that CVPassport may contact you about this request. Your information is not sold to recruiters.</p>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
