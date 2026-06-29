// =============================================================
// SharedCandidatePage  -  /shared/candidate/:token  (public, no auth)
//
// Phase A read path. Ports the locked "Candidate Review (Shared Link)"
// Stacked design faithfully. Fetches ONLY through the get-shared-candidate
// Edge Function; never queries applications with the anon key. The
// internal ATS score and recruiter notes are never requested or shown.
//
// Phase B (not built here): the Approve / Pass / feedback / Submit panel
// renders, but Submit is inert with a quiet "not active yet" note.
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getSharedCandidate } from "../services/getSharedCandidate";
import "./sharedCandidate.css";

/* ── Icons (line, matched to portal weight) ─────────────── */
const Icon = {
  Lock: (p) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Clock: (p) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></svg>,
  MapPin: (p) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  Stamp: (p) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21h14" /><path d="M9 8a3 3 0 0 1 6 0c0 2-2 3-2 5h-2c0-2-2-3-2-5z" /><rect x="7" y="13" width="10" height="4" rx="1.5" /></svg>,
  Download: (p) => <svg {...p} width={p.size || 15} height={p.size || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Check: (p) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  EyeOff: (p) => <svg {...p} width={p.size || 13} height={p.size || 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" /><line x1="2" y1="2" x2="22" y2="22" /></svg>,
  Pass: (p) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
  Doc: (p) => <svg {...p} width={p.size || 15} height={p.size || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>,
};

// Real CVPassport brand mark (high-quality asset), used in the footers.
const BrandMark = ({ size = 22 }) => (
  <img src="/assets/brand/logo512.png" alt="CVPassport" width={size} height={size} style={{ borderRadius: 5, display: "block" }} />
);

/* ── Reused portal primitives ───────────────────────────── */
const initials = (name) => (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const avatarColor = (name) => {
  const palette = ["#DBEAFE", "#FCE7F3", "#DCFCE7", "#FEF3C7", "#E0E7FF", "#FEE2E2"];
  const fg = ["#1E40AF", "#9D174D", "#166534", "#92400E", "#3730A3", "#991B1B"];
  let sum = 0;
  for (let i = 0; i < (name || "").length; i++) sum += name.charCodeAt(i);
  const idx = sum % palette.length;
  return { bg: palette[idx], fg: fg[idx] };
};
const orNotSpecified = (v) => (v && String(v).trim() ? v : "Not specified");

function Avatar({ name, size = 56 }) {
  const c = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.bg, color: c.fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0, letterSpacing: 0.3,
    }}>{initials(name)}</div>
  );
}

function StatusPill({ status }) {
  const c = { bg: "var(--success-bg)", fg: "var(--success-fg)", dot: "var(--success)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: c.bg, color: c.fg,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 500, letterSpacing: 0.1, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {status}
    </span>
  );
}

/* ── Page blocks ────────────────────────────────────────── */
function SecureHeader({ company, expiryDays, step }) {
  return (
    <div className="reveal" style={{ "--d": `${step * 0.09}s`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap",
      background: "var(--wash)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "12px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
          background: "var(--hover)", color: "var(--muted)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><Icon.Lock size={14} /></span>
        <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>
          {company ? (
            <>
              <strong style={{ color: "var(--text)", fontWeight: 600 }}>{company}</strong>
              <span style={{ color: "var(--muted-2)", margin: "0 6px" }}>·</span>
              Candidate review portal
            </>
          ) : "Candidate review portal"}
        </span>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12.5, whiteSpace: "nowrap" }}>
        <Icon.Clock size={13} /> Secure link expires in {expiryDays} {expiryDays === 1 ? "day" : "days"}
      </div>
    </div>
  );
}

function Identity({ name, role, stage, contactHidden, step }) {
  return (
    <div className="reveal" style={{ "--d": `${step * 0.09}s`,
      display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
    }}>
      <Avatar name={name} size={60} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          {/* The single editorial serif moment - candidate name only */}
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400, fontSize: 38, lineHeight: 1.05,
            letterSpacing: "-0.01em", color: "var(--text)", margin: 0,
          }}>{name}</h1>
          <StatusPill status={stage} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{role}</span>
          {contactHidden && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11.5, color: "var(--muted-2)", whiteSpace: "nowrap",
              background: "var(--hover)", border: "1px solid var(--border)",
              padding: "2px 8px", borderRadius: 999,
            }}><Icon.EyeOff size={12} /> Contact hidden</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FitTile({ icon: IC, label, value }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "14px 16px", minWidth: 0, flex: 1,
    }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        <IC size={13} /> {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.25 }}>{value}</div>
    </div>
  );
}

function RegionalTiles({ location, noticePeriod, visaStatus, step }) {
  return (
    <div className="reveal" style={{ "--d": `${step * 0.09}s`,
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12,
    }}>
      <FitTile icon={Icon.MapPin} label="Location" value={orNotSpecified(location)} />
      <FitTile icon={Icon.Clock} label="Notice period" value={orNotSpecified(noticePeriod)} />
      <FitTile icon={Icon.Stamp} label="Visa status" value={orNotSpecified(visaStatus)} />
    </div>
  );
}

// Mobile browsers (Safari + Chrome on phones) frequently refuse to render a
// PDF inside an iframe and show a blank box. Most reviewers open the link from
// WhatsApp on a phone, so on mobile we skip the embed and show a clear "open
// CV" button instead. Desktop embeds inline, with an open-in-new-tab fallback.
const IS_MOBILE = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

function ResumeCard({ name, resumeUrl, resumeDownloadUrl, resumeFileName, step }) {
  const file = resumeFileName || (name ? `${name} resume.pdf` : "candidate resume.pdf");
  return (
    <div className="reveal" style={{ "--d": `${step * 0.09}s`,
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 2px" }}>Resume</h2>
          <div style={{ fontSize: 12.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumeUrl ? file : "Not attached to this candidate"}</div>
        </div>
        {resumeDownloadUrl && (
          // Download disposition comes from the signed URL, so this downloads
          // (no new tab). The inline embed below is the primary read path.
          <a className="snap" href={resumeDownloadUrl} style={{
            display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
            background: "#fff", color: "var(--text)", textDecoration: "none",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
            <Icon.Download size={15} /> Download PDF
          </a>
        )}
      </div>

      {!resumeUrl ? (
        <div style={{
          background: "var(--wash)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "22px 24px", fontSize: 13, color: "var(--muted)",
        }}>This candidate has no resume file attached.</div>
      ) : IS_MOBILE ? (
        // Mobile read path: open the CV in the phone's native viewer.
        <a className="snap" href={resumeUrl} target="_blank" rel="noreferrer noopener" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          background: "var(--accent)", color: "#fff", textDecoration: "none",
          borderRadius: "var(--radius)", padding: "14px 18px", fontSize: 14, fontWeight: 600,
        }}>
          <Icon.Doc size={16} /> Open CV
        </a>
      ) : (
        <>
          <iframe
            title="Resume preview"
            src={resumeUrl}
            style={{ width: "100%", height: "min(70vh, 640px)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--wash)", display: "block" }}
          />
          <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
            Cannot see the CV here?{" "}
            <a href={resumeUrl} target="_blank" rel="noreferrer noopener" style={{ color: "var(--text)", textDecoration: "none", borderBottom: "1px solid var(--border)" }}>Open it in a new tab</a>.
          </div>
        </>
      )}
    </div>
  );
}

function ReviewPanel({ company, step }) {
  const [decision, setDecision] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [showPhaseNote, setShowPhaseNote] = useState(false);

  const Choice = ({ id, icon: IC, title, desc, selBg, selBorder, selIcon, selText }) => {
    const sel = decision === id;
    return (
      <button
        className="snap"
        onClick={() => setDecision(id)}
        style={{
          flex: 1, textAlign: "left", cursor: "pointer",
          display: "flex", alignItems: "flex-start", gap: 11,
          padding: "14px 15px", borderRadius: "var(--radius)",
          border: `1px solid ${sel ? selBorder : "var(--border)"}`,
          background: sel ? selBg : "#fff",
          boxShadow: sel ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
        }}
        onMouseEnter={(e) => { if (!sel) e.currentTarget.style.borderColor = "var(--border-strong)"; }}
        onMouseLeave={(e) => { if (!sel) e.currentTarget.style.borderColor = "var(--border)"; }}>
        <span style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: sel ? selIcon : "var(--hover)",
          color: sel ? "#fff" : "var(--muted)",
        }}><IC size={15} /></span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: sel ? selText : "var(--text)" }}>{title}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{desc}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="reveal" style={{ "--d": `${step * 0.09}s`,
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: 22,
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 3px" }}>Your review</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>Share your recommendation. Only {company} will see it.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Choice id="approve" icon={Icon.Check} title="Approve for interview" desc="Move this candidate forward"
          selBg="var(--success-bg)" selBorder="var(--success)" selIcon="var(--success)" selText="var(--success-fg)" />
        <Choice id="pass" icon={Icon.Pass} title="Pass" desc="Not the right fit for now"
          selBg="var(--danger-bg)" selBorder="var(--danger)" selIcon="var(--danger)" selText="var(--danger-fg)" />
      </div>

      <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--text)", marginBottom: 7 }}>
        Feedback <span style={{ color: "var(--muted)", fontWeight: 400 }}>(required)</span>
      </label>
      <textarea
        className="field"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="What stood out, and why. A sentence or two is plenty."
        style={{
          width: "100%", minHeight: 92, resize: "vertical", lineHeight: 1.5,
          padding: "11px 13px", border: "1px solid var(--border)", borderRadius: "var(--radius)",
          fontSize: 13.5, color: "var(--text)", background: "#fff",
        }} />

      <button
        className="snap"
        onClick={() => setShowPhaseNote(true)}
        style={{
          width: "100%", marginTop: 14, cursor: "pointer",
          background: "var(--accent)", color: "#fff", border: "none",
          borderRadius: "var(--radius)", padding: "12px 18px",
          fontSize: 14, fontWeight: 500,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}>
        Submit review
      </button>

      {showPhaseNote && (
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
          Submitting a review is not active yet. We will turn this on shortly.
        </div>
      )}
    </div>
  );
}

function Footer({ step }) {
  return (
    <div className="reveal" style={{ "--d": `${step * 0.09}s`,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      paddingTop: 6, fontSize: 12.5, color: "var(--muted-2)",
    }}>
      <BrandMark />
      <span>Shared securely via CVPassport</span>
      <span style={{ color: "var(--border-strong)" }}>·</span>
      <a href="/" style={{ color: "var(--muted)", textDecoration: "none", borderBottom: "1px solid var(--border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>How teams hire</a>
    </div>
  );
}

/* ── Centered states (loading, expired, invalid) ────────── */
function CenteredCard({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div className="reveal" style={{
        maxWidth: 420, width: "100%", textAlign: "center",
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: 32,
      }}>{children}</div>
    </div>
  );
}

function StackedLayout({ data }) {
  const c = data.candidate;
  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px 56px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <SecureHeader company={c.company || "A recruiter"} expiryDays={data.expiresInDays || 7} step={0} />
        <Identity name={c.name} role={c.role} stage={c.stage} contactHidden={c.contactHidden} step={1} />
        <RegionalTiles location={c.location} noticePeriod={c.noticePeriod} visaStatus={c.visaStatus} step={2} />
        <ResumeCard name={c.name} resumeUrl={c.resumeUrl} resumeDownloadUrl={c.resumeDownloadUrl} resumeFileName={c.resumeFileName} step={3} />
        <ReviewPanel company={c.company || "the hiring team"} step={4} />
        <Footer step={5} />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default function SharedCandidatePage() {
  const { token } = useParams();
  const [state, setState] = useState({ phase: "loading", data: null });

  useEffect(() => {
    let live = true;
    setState({ phase: "loading", data: null });
    getSharedCandidate(token)
      .then(({ status, body }) => {
        if (!live) return;
        if (status === 200 && body?.candidate) setState({ phase: "ok", data: body });
        else if (status === 410) setState({ phase: "expired", data: null });
        else setState({ phase: "invalid", data: null });
      })
      .catch(() => { if (live) setState({ phase: "error", data: null }); });
    return () => { live = false; };
  }, [token]);

  return (
    <div className="shared-cand">
      <Helmet>
        <title>Candidate review · CVPassport</title>
        <meta name="robots" content="noindex, nofollow" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </Helmet>

      {state.phase === "loading" && (
        <CenteredCard>
          <div style={{ width: 44, height: 44, borderRadius: "50%", margin: "0 auto 14px", background: "var(--hover)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.Lock size={18} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>Opening secure link</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>One moment while we load this candidate.</p>
        </CenteredCard>
      )}

      {state.phase === "ok" && (
        <div key="ok"><StackedLayout data={state.data} /></div>
      )}

      {state.phase === "expired" && (
        <CenteredCard>
          <div style={{ width: 44, height: 44, borderRadius: "50%", margin: "0 auto 14px", background: "var(--warning-bg)", color: "var(--warning-fg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.Clock size={20} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>This link has expired</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 auto 18px", maxWidth: 340, lineHeight: 1.5 }}>
            Secure review links are time limited. Ask the recruiter who sent it to share a fresh link.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, color: "var(--muted-2)" }}>
            <BrandMark /> <span>Shared securely via CVPassport</span>
          </div>
        </CenteredCard>
      )}

      {(state.phase === "invalid" || state.phase === "error") && (
        <CenteredCard>
          <div style={{ width: 44, height: 44, borderRadius: "50%", margin: "0 auto 14px", background: "var(--hover)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.EyeOff size={20} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>This link is not valid</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 auto 18px", maxWidth: 340, lineHeight: 1.5 }}>
            The link may be incomplete or it may have been revoked. Ask the recruiter to send a new one.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, color: "var(--muted-2)" }}>
            <BrandMark /> <span>Shared securely via CVPassport</span>
          </div>
        </CenteredCard>
      )}
    </div>
  );
}
