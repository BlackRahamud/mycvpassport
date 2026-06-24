// =============================================================
// src/components/hr/WhatsAppComposer.jsx
//
// Smart WhatsApp outreach composer (modal on desktop, bottom-sheet on
// mobile). Opened from the "Message [name]" action on the pipeline and
// Candidates detail panels. It:
//   - prefills from a built-in template (token substitution + Gulf/India
//     tone), editable before sending,
//   - can draft a tailored message via /api/ai?action=whatsapp_draft
//     (Anthropic server-side only — key never reaches the client),
//   - hands off to WhatsApp (wa.me) and logs a candidate_events row.
//
// Ceiling: true two-way (auto-send + receiving replies in-app) needs the
// Meta WhatsApp Cloud API — a later phase. This composes + logs the
// outbound message, then opens WhatsApp to send.
//
// Also exports <OutreachHistory> — a small jpp-timeline list of past
// whatsapp_outreach / whatsapp_replied events for a candidate.
// =============================================================

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import safeFetch from "../../lib/net/safeFetch";
import "./whatsappComposer.css";

const EASE = [0.4, 0, 0.2, 1];

function firstNameOf(full) {
  return String(full || "").trim().split(/\s+/)[0] || "there";
}
function digitsOf(phone) {
  return String(phone || "").replace(/\D/g, "");
}

/* Built-in templates — no DB table. Token substitution on send. Copy is
   professional per the marketing rules (no superlatives / claims). */
const TEMPLATES = [
  {
    key: "intro", label: "Intro",
    body: {
      gulf: "Hi {first_name}, thanks for applying for the {job_title} role. I'd like to learn more about your experience — are you free for a quick call this week?",
      india: "Hello {first_name}, thank you for applying for the {job_title} position. I'd like to know more about your background — would you be available for a brief call this week?",
    },
  },
  {
    key: "shortlisted", label: "Shortlisted",
    body: {
      gulf: "Hi {first_name}, good news — you've been shortlisted for the {job_title} role. Can we set up a short call to take things forward?",
      india: "Hello {first_name}, we're pleased to share that you've been shortlisted for the {job_title} position. Can we schedule a call to proceed?",
    },
  },
  {
    key: "interview", label: "Interview invite",
    body: {
      gulf: "Hi {first_name}, we'd like to invite you to interview for the {job_title} role. What times work for you over the next few days?",
      india: "Hello {first_name}, we'd like to invite you for an interview for the {job_title} position. Please share a few time slots that suit you.",
    },
  },
  {
    key: "followup", label: "Follow-up",
    body: {
      gulf: "Hi {first_name}, just following up on the {job_title} role — are you still interested? Happy to answer any questions.",
      india: "Hello {first_name}, following up regarding the {job_title} position — are you still interested? I'm happy to help with any questions.",
    },
  },
  {
    key: "softpass", label: "Soft pass",
    body: {
      gulf: "Hi {first_name}, thank you for your interest in the {job_title} role. We're moving ahead with other candidates for now, but we'll keep your profile on file for future openings.",
      india: "Hello {first_name}, thank you for your interest in the {job_title} position. We're proceeding with other candidates at this stage, but we'll keep your profile for future opportunities.",
    },
  },
];

function substitute(text, vars) {
  return String(text || "")
    .replace(/\{first_name\}/g, vars.first_name || "there")
    .replace(/\{job_title\}/g, vars.job_title || "the role")
    .replace(/\{company\}/g, vars.company || "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const WaIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);
const SparkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

export default function WhatsAppComposer({ open, onClose, candidate, job, hrId, onLogged }) {
  const reduce = useReducedMotion();
  const [templateKey, setTemplateKey] = useState("intro");
  const [tone, setTone] = useState("gulf");
  const [message, setMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { kind, text }

  const vars = useMemo(() => ({
    first_name: firstNameOf(candidate?.name),
    job_title: job?.title || "",
    company: job?.company || "",
  }), [candidate?.name, job?.title, job?.company]);

  const applyTemplate = (key, nextTone) => {
    const tpl = TEMPLATES.find((t) => t.key === key) || TEMPLATES[0];
    setMessage(substitute(tpl.body[nextTone] || tpl.body.gulf, vars));
  };

  // Seed the message when the composer opens (once per open).
  useEffect(() => {
    if (!open) return;
    setNotice(null);
    setTemplateKey("intro");
    setTone("gulf");
    const tpl = TEMPLATES[0];
    setMessage(substitute(tpl.body.gulf, {
      first_name: firstNameOf(candidate?.name),
      job_title: job?.title || "",
      company: job?.company || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidate?.id]);

  const onPickTemplate = (key) => { setTemplateKey(key); applyTemplate(key, tone); };
  const onPickTone = (t) => { setTone(t); applyTemplate(templateKey, t); };

  async function logOutreach(eventType, extraMeta) {
    if (!candidate?.id || !hrId) return; // guests without an auth id can't be logged
    try {
      await supabase.from("candidate_events").insert({
        candidate_id: candidate.id,
        job_id: job?.id || null,
        hr_id: hrId,
        event_type: eventType,
        metadata: { template: templateKey, tone, preview: String(message).slice(0, 200), ...(extraMeta || {}) },
      });
      if (onLogged) onLogged();
    } catch (_e) { /* logging is best-effort */ }
  }

  async function runAiDraft() {
    if (aiLoading) return;
    setAiLoading(true);
    setNotice(null);
    try {
      const { data: { session } = {} } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setNotice({ kind: "error", text: "Please sign in again." }); return; }
      const res = await safeFetch("/api/ai?action=whatsapp_draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cvSnapshot: candidate?.cvSnapshot || null, jobTitle: job?.title || "", tone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.message) {
        setNotice({ kind: "error", text: data.error || `Couldn't draft (${res.status}).` });
        return;
      }
      setMessage(String(data.message).trim());
    } catch (_e) {
      setNotice({ kind: "error", text: "Couldn't reach the AI service. Try again." });
    } finally {
      setAiLoading(false);
    }
  }

  function openWhatsApp() {
    const digits = digitsOf(candidate?.phone);
    const href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    if (typeof window !== "undefined") window.open(href, "_blank", "noopener,noreferrer");
    logOutreach("whatsapp_outreach");
    if (onClose) onClose();
  }

  async function markReplied() {
    await logOutreach("whatsapp_replied");
    setNotice({ kind: "ok", text: "Logged as replied." });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="wac-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Message ${firstNameOf(candidate?.name)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onClick={onClose}
        >
          <motion.div
            className="wac-panel"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <header className="wac-head">
              <div className="wac-head__title">
                <span className="wac-head__wa"><WaIcon size={15} /></span>
                Message {firstNameOf(candidate?.name)}
              </div>
              <button type="button" className="wac-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
            </header>

            <div className="wac-body">
              <div className="wac-row">
                <span className="wac-label">Template</span>
                <div className="wac-chips">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={`wac-chip${templateKey === t.key ? " wac-chip--active" : ""}`}
                      onClick={() => onPickTemplate(t.key)}
                    >{t.label}</button>
                  ))}
                </div>
              </div>

              <div className="wac-row">
                <span className="wac-label">Tone</span>
                <div className="wac-toggle" role="radiogroup" aria-label="Tone">
                  <button type="button" role="radio" aria-checked={tone === "gulf"} className={`wac-toggle__btn${tone === "gulf" ? " wac-toggle__btn--active" : ""}`} onClick={() => onPickTone("gulf")}>Gulf</button>
                  <button type="button" role="radio" aria-checked={tone === "india"} className={`wac-toggle__btn${tone === "india" ? " wac-toggle__btn--active" : ""}`} onClick={() => onPickTone("india")}>India</button>
                </div>
              </div>

              <textarea
                className="wac-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                aria-label="Message text"
              />

              <div className="wac-tools">
                <button type="button" className="wac-ai" onClick={runAiDraft} disabled={aiLoading}>
                  <SparkIcon /> {aiLoading ? "Drafting…" : "Improve with AI"}
                </button>
                {notice && (
                  <span className={`wac-notice wac-notice--${notice.kind}`} role="status">{notice.text}</span>
                )}
              </div>
            </div>

            <footer className="wac-foot">
              <button type="button" className="wac-replied" onClick={markReplied}>Mark replied</button>
              <span className="wac-foot__spacer" />
              <button type="button" className="pj-btn pj-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="wac-send" onClick={openWhatsApp} disabled={!message.trim()}>
                <WaIcon size={15} /> Open in WhatsApp
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Outreach history (past WhatsApp events) ───────── */
function fmtWhen(s) {
  const t = new Date(s).getTime();
  if (!t) return "";
  const d = Math.floor((Date.now() - t) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(s).toLocaleDateString();
}

export function OutreachHistory({ hrId, candidateId, refreshKey }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!hrId || !candidateId) { setEvents([]); return undefined; }
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("candidate_events")
        .select("id, event_type, metadata, created_at")
        .eq("hr_id", hrId)
        .eq("candidate_id", candidateId)
        .in("event_type", ["whatsapp_outreach", "whatsapp_replied"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (live) setEvents(data || []);
    })();
    return () => { live = false; };
  }, [hrId, candidateId, refreshKey]);

  if (!events.length) return null;

  return (
    <section className="jpp-section">
      <h3 className="jpp-section__title">Outreach</h3>
      <div className="jpp-timeline">
        {events.map((e) => (
          <div key={e.id} className="jpp-timeline__row">
            <div className="jpp-timeline__icon wac-history__icon"><WaIcon size={14} /></div>
            <div>
              <p className="jpp-timeline__title">
                {e.event_type === "whatsapp_replied" ? "Candidate replied" : "WhatsApp message sent"}
                {e.metadata?.template ? ` · ${e.metadata.template}` : ""}
              </p>
              {e.metadata?.preview && <p className="jpp-timeline__sub">{e.metadata.preview}</p>}
              <p className="jpp-timeline__date">{fmtWhen(e.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
