import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BadgeCheck, Check, ChevronDown, Upload, Zap } from "lucide-react";
import { supabase } from "../appSupabaseClient";
import { saveApplyIntent, consumeApplyIntent } from "../lib/auth/applyIntent";
import { scoreApplicationStopgap } from "../lib/ats/stopgapScorer";
import UserMenu from "../components/UserMenu/UserMenu";
import "./hr/PostJob/postJob.css"; // reuse the HR portal's --pj-* light tokens

const RETURN_PATH_KEY = "cvp_return_path";

// ─── DESIGN TOKENS (Public page) ─────────────────────────────────
// Light theme mirroring the HR portal + the public job board, so the
// candidate journey (board → detail → apply) reads as one product.
// Values pull from the --pj-* tokens (postJob.css) — purple accent is
// intentional, tying to the board's purple header.
const T = {
  bg: "#FAFAFB",                     // page background (matches the job board)
  surface: "var(--pj-surface)",      // #FFFFFF cards
  elevated: "var(--pj-input-bg)",    // chips / subtle fills
  inputBg: "var(--pj-input-bg)",     // form field background
  border: "var(--pj-border)",
  borderStrong: "var(--pj-border-strong)",
  accent: "var(--pj-primary)",       // purple — ties to the board's purple header
  accentHover: "var(--pj-primary-hover)",
  accentSoft: "var(--pj-primary-soft)",
  accentRing: "var(--pj-primary-ring)",
  text: "var(--pj-text)",            // ink
  textSoft: "var(--pj-text-soft)",
  muted: "var(--pj-muted)",
  green: "#1D9E75",
  amber: "#D97706",
  font: "var(--pj-font)",
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
        background: "linear-gradient(135deg, var(--pj-primary) 0%, var(--pj-primary-hover) 100%)",
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

// ─── VISA SELECT ─────────────────────────────────────────────────
// Headless custom dropdown — replaces native <select> for full theme
// control (dark surface, amber chevron, deep elevation shadow,
// keyboard nav). Trigger occupies the full container width; popover
// fades+slides in over 150ms.
function VisaSelect({ value, onChange, options, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);
  const current = options.find((o) => o.value === value);

  // Click-outside + keyboard handling.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i < 0 ? 0 : i + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (activeIdx >= 0 && activeIdx < options.length) {
          e.preventDefault();
          onChange(options[activeIdx].value);
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, activeIdx, options, onChange]);

  // Reset hover when reopening.
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIdx(idx);
    }
  }, [open, options, value]);

  const triggerBorder = focused || open ? T.accent : T.border;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: T.surface,
          border: `1px solid ${triggerBorder}`,
          borderRadius: 8,
          color: current ? T.text : T.muted,
          fontSize: 13,
          fontFamily: T.font,
          outline: "none",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          boxSizing: "border-box",
          transition: "border-color 150ms ease-in-out, box-shadow 150ms ease-in-out",
          boxShadow: focused || open ? `0 0 0 3px ${T.accentRing}` : "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          color={T.accent}
          style={{
            flexShrink: 0,
            transition: "transform 150ms ease-in-out",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      <div
        role="listbox"
        aria-hidden={!open}
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          padding: 6,
          zIndex: 50,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-4px)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
          boxShadow:
            "0 18px 40px -22px rgba(20,19,31,0.18), 0 6px 14px -8px rgba(20,19,31,0.08)",
        }}
      >
        {options.map((o, i) => {
          const isSel = o.value === value;
          const isActive = i === activeIdx;
          return (
            <div
              role="option"
              aria-selected={isSel}
              key={o.value}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: T.font,
                background: isSel ? T.accent : isActive ? T.elevated : "transparent",
                color: isSel ? "#fff" : T.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                transition: "background-color 120ms ease-in-out, color 120ms ease-in-out",
              }}
            >
              <span>{o.label}</span>
              {isSel && <Check size={14} strokeWidth={2.5} color="#fff" />}
            </div>
          );
        })}
      </div>
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
function ApplyForm({ job, user, replayIntent }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: replayIntent?.form?.first_name || "",
    last_name:  replayIntent?.form?.last_name  || "",
    email:      replayIntent?.form?.email      || user?.email || "",
    phone:      replayIntent?.form?.phone      || "",
    visa_status: replayIntent?.form?.visa_status || "",
    cv_file: null,
    cv_filename: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [cooldownDays, setCooldownDays] = useState(null);
  const replayedRef = useRef(false);

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

  // Replay on auth return: when the user came back from /auth with an
  // intent stash for this job, auto-submit the application using the
  // form data they already entered. Single-shot — replayedRef gates
  // re-runs across re-renders, the parent consumed the sessionStorage
  // entry on mount so a fresh visit won't fire this branch.
  useEffect(() => {
    if (replayedRef.current) return;
    if (!replayIntent || !user?.id || !job?.id) return;
    if (cooldownDays) return; // already applied; respect cooldown
    replayedRef.current = true;
    // Defer one microtask so the form-state initializer (driven by the
    // same replayIntent) has settled into the closure submit reads from.
    Promise.resolve().then(() => submitApplication(false));
    // submitApplication closes over form state and isn't memoised; the
    // ref guard above plus the existence-check on replayIntent give us
    // single-shot semantics, so depending on it would only thrash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayIntent, user?.id, job?.id, cooldownDays]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    background: T.inputBg,
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

    // Logged-out submit: stash form + jobId in sessionStorage, mark
    // /jobs/<id> as the post-auth return path, then route to /auth.
    // Once auth completes useCvpAuth lands the user back here and the
    // replay branch in JobPage's mount effect re-fires the submit with
    // the same form data — no re-keying.
    if (!user?.id) {
      saveApplyIntent({ jobId: job.id, form });
      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          window.sessionStorage.setItem(RETURN_PATH_KEY, `/jobs/${job.id}`);
        }
      } catch { /* private mode etc. */ }
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      if (!supabase) { setStep(3); return; }
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + 7);

      const candidateName = isEasyApply
        ? (user.user_metadata?.name || user.email?.split("@")[0] || "")
        : `${form.first_name} ${form.last_name}`;

      // Pre-Phase-1 stopgap scoring. Pull the user's most recent CV
      // blob (cvs.cv_data) and overlap-match its skills/experience
      // against job.requirements. Tagged score_source='stopgap_keyword'
      // so the Phase 1 retro-rescan can overwrite these rows cleanly.
      // Manual upload (non-easy-apply) has no parsed CV yet — leave
      // ats_score=0 with score_source still tagged so the row is in
      // the rescan pool.
      let cvBlob = null;
      try {
        const { data: cvRow } = await supabase
          .from("cvs")
          .select("cv_data")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        cvBlob = cvRow?.cv_data || null;
      } catch (_e) { /* best-effort — fall through with no CV */ }

      const scored = scoreApplicationStopgap({
        jobRequirements: job.requirements,
        candidateCv: cvBlob,
      });

      // Keep the original uploaded file. It goes to the private
      // applicant-cvs bucket; the row keeps only the path. Best-effort:
      // if the upload fails we still record the application (cv_file_path
      // stays null and the HR just sees the parsed view). The File only
      // exists on the logged-in submit — the logged-out → /auth → replay
      // path can't carry a File through sessionStorage, so it uploads
      // nothing, which is the expected limitation.
      let cvFilePath = null;
      if (form.cv_file) {
        try {
          const ext = (form.cv_filename.split(".").pop() || "pdf")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "") || "pdf";
          const path = `${user.id}/${job.id}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("applicant-cvs")
            .upload(path, form.cv_file, {
              upsert: true,
              contentType: form.cv_file.type || undefined,
            });
          if (upErr) throw upErr;
          cvFilePath = path;
        } catch (_e) { /* best-effort — keep the application without the file */ }
      }

      const appData = {
        candidate_id: user.id,
        job_id: job.id,
        hr_id: job.hr_id,
        cv_snapshot: cvBlob || null,
        ats_score: scored.score,
        match_keywords: scored.match_keywords,
        missing_keywords: scored.missing_keywords,
        score_source: scored.score_source,
        is_visible_to_hr: true,
        cooldown_expires_at: cooldownDate.toISOString(),
        status: "new",
        candidate_name: candidateName,
        candidate_email: isEasyApply ? user.email : form.email,
        candidate_phone: form.phone,
        visa_status: form.visa_status || (isEasyApply ? "Own visa" : ""),
        applied_at: new Date().toISOString(),
      };

      // Only write the pointer when we actually uploaded a file this time,
      // so a re-apply that skips re-uploading keeps the prior file.
      if (cvFilePath) appData.cv_file_path = cvFilePath;

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
      <style>{`
        .jp-input:focus {
          border-color: var(--pj-primary) !important;
          box-shadow: 0 0 0 3px var(--pj-primary-ring) !important;
        }
        .jp-input::placeholder { color: var(--pj-muted); }
      `}</style>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: "0 0 16px", fontFamily: T.font }}>
        {step === 3 ? "" : "Apply for this role"}
      </h3>
      <StepProgress step={step} />

      {step === 1 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>First name</label>
              <input className="jp-input" style={fieldStyle} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label style={labelStyle}>Last name</label>
              <input className="jp-input" style={fieldStyle} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Last name" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input className="jp-input" style={fieldStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Phone (WhatsApp)</label>
            <input className="jp-input" style={fieldStyle} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 50 123 4567" />
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
                  background: "var(--pj-primary-soft)",
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
                <Zap size={16} strokeWidth={2} />
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
              background: "var(--pj-primary-soft)",
              border: "1px solid var(--pj-primary-ring)",
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
                  <Upload size={24} strokeWidth={1.75} color={T.muted} />
                  <span style={{ fontSize: 12, color: T.muted, marginTop: 8, fontFamily: T.font }}>Click to upload CV (PDF, DOC)</span>
                </>
              )}
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Visa status</label>
            <VisaSelect
              value={form.visa_status}
              onChange={(v) => set("visa_status", v)}
              placeholder="Select visa status"
              options={[
                { value: "Sponsored",     label: "Need sponsorship" },
                { value: "Own visa",      label: "Own visa / residency" },
                { value: "Visit visa",    label: "Visit visa" },
                { value: "Freelance",     label: "Freelance permit" },
              ]}
            />
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
            <Check size={28} strokeWidth={2.5} color={T.green} />
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
              background: "var(--pj-primary-soft)",
              border: "1px solid var(--pj-primary-ring)",
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
  const [profile, setProfile] = useState(null);
  // Read once on mount and pass down — single-shot. Stays the same
  // across re-renders so the ApplyForm replay effect can latch onto a
  // stable reference. consumeApplyIntent removes the stash on read so
  // a refresh / second visit won't re-fire the application.
  const [replayIntent] = useState(() => consumeApplyIntent(jobId));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  }, []);

  // Plan + display name for the UserMenu popover. Best-effort: a
  // missing profile row falls back to "Free plan" inside UserMenu.
  useEffect(() => {
    if (!supabase || !user?.id) return;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (live) setProfile(data || null);
    })();
    return () => { live = false; };
  }, [user?.id]);

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
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          aria-label="CVPassport home"
        >
          <span style={{ fontFamily: T.font, fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: T.accent }}>
            CV<span style={{ color: T.text, fontWeight: 600 }}>Passport</span>
          </span>
        </button>
        {user ? (
          <UserMenu
            email={user.email || ""}
            name={profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ""}
            plan={profile?.plan}
            switchTo={{ label: "Switch to HR", path: "/employer/jobs" }}
            settingsPath="/account"
            theme="light"
          />
        ) : (
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
        )}
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
                <BadgeCheck size={14} strokeWidth={2} color={T.green} fill="none" />
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
                <span style={{ fontSize: 12, color: T.muted }}>·</span>
                <span style={{ fontSize: 12, color: T.muted }}>{job.view_count} views</span>
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: hiring.color }} />
              <span style={{ fontSize: 12, color: hiring.color, fontWeight: 500 }}>{hiring.label}</span>
            </div>
          </div>

          {/* Body — About the role. New listings store rich HTML from the
              Tiptap editor (schema-constrained safe tags); legacy listings are
              plain text — render each appropriately. */}
          {job.description && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 8px", fontFamily: T.font }}>About the role</h3>
              {/<[a-z][\s\S]*>/i.test(job.description) ? (
                <div className="jobpage-rich" dangerouslySetInnerHTML={{ __html: job.description }} />
              ) : (
                <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", fontFamily: T.font }}>
                  {job.description}
                </p>
              )}
            </div>
          )}

          {/* Requirements */}
          {requirements.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 8px", fontFamily: T.font }}>What you&apos;ll need</h3>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {requirements.map((r, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: T.textSoft, lineHeight: 1.5, fontFamily: T.font }}>
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
        <ApplyForm job={job} user={user} replayIntent={replayIntent} />
      </div>
    </div>
  );
}
