import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../appSupabaseClient";
import CVPassportLogo from "../components/CVPassportLogo";

// ─── DESIGN TOKENS (Public page) ─────────────────────────────────
const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  accent: "#635bff",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  green: "#1D9E75",
  amber: "#D97706",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function getHiringStatus(postedAt, hiringStatus) {
  if (hiringStatus === "closed")
    return { color: T.muted, label: "Applications closed" };
  if (!postedAt) return { color: T.muted, label: "Unknown" };
  const days = Math.floor(
    (Date.now() - new Date(postedAt).getTime()) / 86400000
  );
  if (days <= 7) return { color: T.green, label: "Actively hiring" };
  if (days <= 21) return { color: T.amber, label: "Few spots left" };
  return { color: T.muted, label: "Applications closing soon" };
}

function daysAgo(date) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function initialsAvatar(name, size = 40) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "linear-gradient(135deg, #635bff 0%, #7c75ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      {initials}
    </div>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────────
function StepProgress({ step }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: s <= step ? T.accent : T.border,
            transition: "background-color 200ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      ))}
    </div>
  );
}

// ─── APPLY FORM ──────────────────────────────────────────────────
function ApplyForm({ job, user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: user?.email || "",
    phone: "",
    visa_status: "",
    cv_file: null,
    cv_filename: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [cooldownDays, setCooldownDays] = useState(null);

  // Check if user already applied + cooldown
  useEffect(() => {
    if (!supabase || !user?.id || !job?.id) return;
    (async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, cooldown_expires_at, applied_at")
        .eq("candidate_id", user.id)
        .eq("job_id", job.id)
        .maybeSingle();
      if (data) {
        setExistingApp(data);
        if (data.cooldown_expires_at && new Date(data.cooldown_expires_at) > new Date()) {
          const remaining = Math.ceil(
            (new Date(data.cooldown_expires_at).getTime() - Date.now()) / 86400000
          );
          setCooldownDays(remaining);
        }
      }
    })();
  }, [user?.id, job?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: T.font,
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
    fontFamily: T.font,
  };

  const btnDisabled = step === 1
    ? !form.first_name || !form.last_name || !form.email || !form.phone
    : step === 2
      ? !form.cv_file || !form.visa_status
      : false;

  const submitApplication = async (isEasyApply) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!supabase) { setStep(3); return; }
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + 7);

      const candidateName = isEasyApply
        ? (user.user_metadata?.name || user.email?.split("@")[0] || "")
        : `${form.first_name} ${form.last_name}`;

      const appData = {
        candidate_id: user?.id || null,
        job_id: job.id,
        hr_id: job.hr_id,
        ats_score: 0,
        match_keywords: [],
        missing_keywords: [],
        is_visible_to_hr: true,
        cooldown_expires_at: cooldownDate.toISOString(),
        status: "submitted",
        candidate_name: candidateName,
        candidate_email: isEasyApply ? user.email : form.email,
        candidate_phone: form.phone,
        visa_status: form.visa_status || (isEasyApply ? "Own visa" : ""),
        applied_at: new Date().toISOString(),
      };

      // Upsert handles reapply after cooldown
      if (existingApp && !cooldownDays) {
        await supabase
          .from("applications")
          .update(appData)
          .eq("id", existingApp.id);
      } else if (!existingApp) {
        await supabase.from("applications").insert(appData);
      }

      // Notify HR
      await supabase.from("hr_notifications").insert({
        hr_id: job.hr_id,
        candidate_id: user?.id || null,
        job_id: job.id,
        title: `New applicant — ${candidateName}`,
        body: `Applied for ${job.title}`,
        type: "new_application",
      });

      // Insert candidate event
      if (user?.id) {
        await supabase.from("candidate_events").insert({
          candidate_id: user.id,
          job_id: job.id,
          hr_id: job.hr_id,
          event_type: existingApp ? "reapplied" : "applied",
          metadata: {
            source: isEasyApply ? "easy_apply" : "manual",
            visa_status: form.visa_status,
          },
        });
      }

      setStep(3);
    } catch (err) {
      console.error("Apply error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Show cooldown state
  if (cooldownDays) {
    return (
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 24,
          marginTop: 20,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, color: T.text, margin: "0 0 8px", fontFamily: T.font }}>
          Applied {daysAgo(existingApp?.applied_at)}
        </p>
        <p style={{ fontSize: 12, color: T.muted, margin: 0, fontFamily: T.font }}>
          You can reapply in {cooldownDays} day{cooldownDays !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 24,
        marginTop: 20,
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: "0 0 16px", fontFamily: T.font }}>
        {step === 3 ? "" : "Apply for this role"}
      </h3>
      <StepProgress step={step} />

      {step === 1 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>First name</label>
              <input style={fieldStyle} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label style={labelStyle}>Last name</label>
              <input style={fieldStyle} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Last name" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input style={fieldStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Phone (WhatsApp)</label>
            <input style={fieldStyle} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 50 123 4567" />
          </div>
          <button
            type="button"
            disabled={btnDisabled}
            onClick={() => setStep(2)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: btnDisabled ? T.border : T.accent,
              color: btnDisabled ? T.muted : "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: btnDisabled ? "not-allowed" : "pointer",
              fontFamily: T.font,
              transition: "background-color 200ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          {/* Easy apply for logged-in CVPassport users */}
          {user && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => submitApplication(true)}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: `2px solid ${T.accent}`,
                  background: "rgba(99,91,255,0.08)",
                  color: T.accent,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {submitting ? "Applying..." : "Easy Apply with my CVPassport CV"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontSize: 11, color: T.muted }}>or upload manually</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>
            </div>
          )}

          <div
            style={{
              background: "rgba(99,91,255,0.08)",
              border: "1px solid rgba(99,91,255,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 12, color: T.accent, margin: 0, fontFamily: T.font }}>
              Upload your CV — we&apos;ll check your ATS match before the recruiter even opens your application
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "28px 16px",
                border: `2px dashed ${T.border}`,
                borderRadius: 10,
                cursor: "pointer",
                background: "transparent",
                transition: "border-color 200ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    set("cv_file", file);
                    set("cv_filename", file.name);
                  }
                }}
              />
              {form.cv_filename ? (
                <span style={{ fontSize: 13, color: T.green, fontWeight: 500, fontFamily: T.font }}>{form.cv_filename}</span>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span style={{ fontSize: 12, color: T.muted, marginTop: 8, fontFamily: T.font }}>Click to upload CV (PDF, DOC)</span>
                </>
              )}
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Visa status</label>
            <select style={fieldStyle} value={form.visa_status} onChange={(e) => set("visa_status", e.target.value)}>
              <option value="">Select visa status</option>
              <option value="Sponsored">Need sponsorship</option>
              <option value="Own visa">Own visa / residency</option>
              <option value="Visit visa">Visit visa</option>
              <option value="Freelance">Freelance permit</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "transparent",
                color: T.muted,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={btnDisabled || submitting}
              onClick={() => submitApplication(false)}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: btnDisabled ? T.border : T.accent,
                color: btnDisabled ? T.muted : "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: btnDisabled ? "not-allowed" : "pointer",
                fontFamily: T.font,
                transition: "background-color 200ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {submitting ? "Submitting..." : "Submit application"}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(29,158,117,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: "0 0 8px", fontFamily: T.font }}>
            You&apos;re in the pipeline
          </h3>
          <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px", fontFamily: T.font }}>
            Hear back via WhatsApp or email within 3 business days
          </p>

          {/* Conversion card */}
          <div
            style={{
              background: "rgba(99,91,255,0.08)",
              border: "1px solid rgba(99,91,255,0.2)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 13, color: T.accent, margin: "0 0 12px", fontWeight: 500, fontFamily: T.font }}>
              Your ATS match score is being calculated — build a stronger CV on CVPassport to rank higher
            </p>
            <button
              type="button"
              onClick={() => navigate("/auth")}
              style={{
                background: T.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              View my ATS score
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN JOB PAGE ───────────────────────────────────────────────
export default function JobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  }, []);

  useEffect(() => {
    if (!supabase || !jobId) return;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("status", "published")
        .single();
      setJob(data || null);
      setLoading(false);
      // Increment view count
      if (data) {
        supabase.rpc("increment_job_views", { p_job_id: jobId }).catch(() => {});
      }
    })();
  }, [jobId]);

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: T.muted, fontFamily: T.font }}>Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: T.muted, fontFamily: T.font, marginBottom: 16 }}>Job not found</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            background: T.accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Go home
        </button>
      </div>
    );
  }

  const hiring = getHiringStatus(job.posted_at, job.hiring_status);
  // requirements is jsonb array
  const requirements = Array.isArray(job.requirements) ? job.requirements : [];
  const perks = Array.isArray(job.perks) ? job.perks : [];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.font }}>
      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <CVPassportLogo height={24} />
        </button>
        <button
          type="button"
          onClick={() => navigate("/auth")}
          style={{
            background: "none",
            border: `1px solid ${T.border}`,
            color: T.text,
            fontSize: 13,
            padding: "6px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Sign in
        </button>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Job card */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            {initialsAvatar(job.company || job.title, 48)}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: T.muted }}>{job.company || "Company"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={T.green} stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 500, color: T.text, margin: "0 0 10px", fontFamily: T.font }}>
                {job.title}
              </h1>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {job.location && (
                  <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: T.elevated, color: T.muted, fontFamily: T.font }}>
                    {job.location}
                  </span>
                )}
                {job.job_type && (
                  <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: T.elevated, color: T.muted, fontFamily: T.font }}>
                    {job.job_type}
                  </span>
                )}
                {(job.salary_min || job.salary_max) && (
                  <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: T.elevated, color: T.muted, fontFamily: T.font }}>
                    {job.salary_min && job.salary_max
                      ? `${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()} ${job.currency || "AED"}`
                      : job.salary_min
                        ? `From ${job.salary_min.toLocaleString()} ${job.currency || "AED"}`
                        : `Up to ${job.salary_max.toLocaleString()} ${job.currency || "AED"}`}
                  </span>
                )}
                {job.visa_sponsored && (
                  <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(29,158,117,0.12)", color: T.green, fontFamily: T.font }}>
                    Visa sponsored
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meta line */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: T.muted }}>{daysAgo(job.posted_at)}</span>
            {job.view_count != null && (
              <>
                <span style={{ fontSize: 12, color: T.border }}>·</span>
                <span style={{ fontSize: 12, color: T.muted }}>{job.view_count} views</span>
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: hiring.color }} />
              <span style={{ fontSize: 12, color: hiring.color, fontWeight: 500 }}>{hiring.label}</span>
            </div>
          </div>

          {/* Body — About the role */}
          {job.description && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 8px", fontFamily: T.font }}>About the role</h3>
              <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", fontFamily: T.font }}>
                {job.description}
              </p>
            </div>
          )}

          {/* Requirements */}
          {requirements.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 8px", fontFamily: T.font }}>What you&apos;ll need</h3>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {requirements.map((r, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: T.muted, lineHeight: 1.5, fontFamily: T.font }}>
                    <span style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}>•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Perks */}
          {perks.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 8px", fontFamily: T.font }}>Perks</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {perks.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: T.elevated,
                      color: T.muted,
                      fontFamily: T.font,
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Apply form */}
        <ApplyForm job={job} user={user} />
      </div>
    </div>
  );
}
