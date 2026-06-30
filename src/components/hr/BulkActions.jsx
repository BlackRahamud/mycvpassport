// =============================================================
// src/components/hr/BulkActions.jsx
//
// Bulk candidate handling for the Candidates CRM. Two surfaces:
//   1. A floating action bar (appears when >= 1 candidate is checked) with
//      bulk status, CSV export, and the WhatsApp queue trigger.
//   2. An assisted bulk-WhatsApp queue (sub-action) — sequential, ONE wa.me
//      tab at a time. The recruiter taps send in their own WhatsApp; this is
//      NOT auto-send (true one-click bulk needs the Meta Cloud API, a later
//      phase).
//
// Reuses WhatsAppComposer's exported helpers (templates, substitute, wa.me
// link, candidate_events logging) — no duplication of that logic here.
//
// Status mutation itself lives in the parent (CandidatesPage owns `rows`);
// this component calls onApplyStatus(value). Per product decision, bulk
// status acts ONLY on each selected row's latest/displayed application.
// =============================================================

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import Select from "../ui/Select";
import {
  TEMPLATES as WA_TEMPLATES,
  substitute,
  buildWaLink,
  digitsOf,
  logWhatsappEvent,
} from "./WhatsAppComposer";

const EASE = [0.4, 0, 0.2, 1];
const WA_QUEUE_CAP = 10;       // WhatsApp safe limit — lower than the 50 DB cap
const DAILY_SOFT_LIMIT = 30;   // heuristic; soft warning, never a hard block

function firstName(full) { return String(full || "").trim().split(/\s+/)[0] || "there"; }

/* Real DB status values (mirrors the pipeline's STATUS_OVERRIDE_OPTIONS /
   migration 013 CHECK set). The founder note said "shortlist/reject" — the
   actual column values are "shortlisted"/"rejected". */
const BULK_STATUS = [
  { value: "shortlisted", label: "Shortlisted" },
  { value: "ready",       label: "Ready to interview" },
  { value: "interviewed", label: "Interviewed" },
  { value: "offered",     label: "Offer extended" },
  { value: "hired",       label: "Hired" },
  { value: "rejected",    label: "Passed" },
];

const STATUS_LABEL = {
  submitted: "Applied", viewed: "Viewed", shortlisted: "Shortlisted", new: "Applied",
  ready: "Ready", interviewing: "Interviewing", interviewed: "Interviewed",
  offered: "Offer", hired: "Hired", rejected: "Passed",
};
function statusLabel(s) { return STATUS_LABEL[s] || (s ? String(s) : "—"); }

/* Default first-contact template: nudges the candidate to save the number
   and reply. Reuses the composer's substitute() token format; the rest of the
   selectable templates are the composer's own (WA_TEMPLATES). */
const FIRST_CONTACT = {
  key: "first_contact", label: "First contact",
  body: {
    gulf: "Hi {first_name}, thanks for applying for the {job_title} role. Please save this number so we can keep in touch about next steps — and reply here to confirm you're still interested. Are you free for a quick call this week?",
    india: "Hello {first_name}, thank you for applying for the {job_title} position. Please save this number so we can stay in touch about next steps — and do reply here to confirm your interest. Would you be available for a brief call this week?",
  },
};
const QUEUE_TEMPLATES = [FIRST_CONTACT, ...WA_TEMPLATES];

/* ───────── CSV (client-side, no backend) ───────── */
function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function exportCsv(rows) {
  const header = ["Name", "Email", "Phone", "Market", "Latest status", "Jobs applied", "Visa", "Skills"];
  const lines = [header.join(",")];
  rows.forEach((c) => {
    lines.push([
      csvCell(c.name),
      csvCell(c.email),
      csvCell(c.phone),
      csvCell(c.market === "india" ? "India" : "Gulf"),
      csvCell(statusLabel(c.apps?.[0]?.status)),
      csvCell(c.apps?.length || 0),
      csvCell(c.visa),
      csvCell((c.skills || []).join("; ")),
    ].join(","));
  });
  // BOM so Excel reads UTF-8; CRLF line endings for spreadsheet friendliness.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `candidates-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ───────── Icons ───────── */
const WaIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

/* ───────── Shared inline styles (HR portal --pj-* / --hjl-* tokens) ───────── */
const pill = (kind) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "9px 13px", borderRadius: 10, font: "inherit", fontSize: 13, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1,
  border: "1px solid var(--pj-border)",
  background: kind === "ink" ? "var(--hjl-ink)" : kind === "wa" ? "var(--hjl-whatsapp)" : kind === "danger" ? "var(--hjl-pass)" : "var(--pj-surface)",
  color: (kind === "ink" || kind === "wa" || kind === "danger") ? "#FFFFFF" : "var(--pj-text)",
  borderColor: kind === "ink" ? "var(--hjl-ink)" : kind === "wa" ? "var(--hjl-whatsapp)" : kind === "danger" ? "var(--hjl-pass)" : "var(--pj-border)",
});
export default function BulkActions({ selected, onClear, onApplyStatus, statusBusy, statusError, hrId, onLogged }) {
  const reduce = useReducedMotion();
  const [queueOpen, setQueueOpen] = useState(false);

  const count = selected.length;

  return (
    <>
      {/* ── Floating action bar ── */}
      <div className="cand-bulkbar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", padding: "0 12px 16px", zIndex: 60, pointerEvents: "none" }}>
        <motion.div
          role="region"
          aria-label="Bulk actions"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: EASE }}
          style={{
            pointerEvents: "auto", width: "min(760px, 100%)",
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            padding: "10px 12px",
            // Floating surface → glass: translucent white + blur so the list
            // shows through. Allowed here precisely because it floats.
            background: "rgba(255, 255, 255, 0.74)",
            backdropFilter: "blur(18px) saturate(1.7)",
            WebkitBackdropFilter: "blur(18px) saturate(1.7)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            borderRadius: 16,
            boxShadow: "0 16px 44px -16px rgba(20, 19, 31, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pj-text)" }}>
            {count} selected
          </span>

          <span style={{ flex: 1, minWidth: 8 }} />

          <div style={{ width: 190 }} title="Updates each selected candidate's latest (displayed) application only">
            <Select
              size="sm"
              menuAlign="right"
              value=""
              placeholder={statusBusy ? "Updating…" : "Move latest to…"}
              disabled={statusBusy || count === 0}
              onChange={(v) => { if (v) onApplyStatus(v); }}
              options={BULK_STATUS}
              ariaLabel="Move latest application to status"
            />
          </div>

          <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.96 }} style={pill("plain")} onClick={() => exportCsv(selected)}>
            <DownloadIcon /> Export CSV
          </motion.button>

          <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.96 }} style={pill("wa")} onClick={() => setQueueOpen(true)}>
            <WaIcon /> WhatsApp
          </motion.button>

          <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.96 }} style={pill("plain")} onClick={onClear}>
            Clear
          </motion.button>

          {statusError && (
            <span role="status" style={{ flexBasis: "100%", fontSize: 12, color: "var(--hjl-pass)", fontWeight: 600 }}>
              {statusError}
            </span>
          )}
        </motion.div>
      </div>

      <WhatsAppQueue
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        selected={selected}
        hrId={hrId}
        onLogged={onLogged}
        reduce={reduce}
      />
    </>
  );
}

/* ───────── Assisted WhatsApp queue (sequential, one tab at a time) ───────── */
function WhatsAppQueue({ open, onClose, selected, hrId, onLogged, reduce }) {
  const [templateKey, setTemplateKey] = useState(FIRST_CONTACT.key);
  const [tone, setTone] = useState("gulf");
  const [messages, setMessages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [openedIdx, setOpenedIdx] = useState(-1);
  const [sentCount, setSentCount] = useState(0);
  const [sentToday, setSentToday] = useState(null);

  // First 10 of the selection (in list order). WhatsApp's safe limit is lower
  // than DB actions, so we deliberately cap below the 50-candidate selection.
  const firstN = useMemo(() => selected.slice(0, WA_QUEUE_CAP), [selected]);
  const capped = selected.length > WA_QUEUE_CAP;
  // Applicant-only is implicit (every row here has an application). Skip and
  // flag anyone without a phone — never build a recipient-less wa.me link.
  const queue = useMemo(() => firstN.filter((c) => digitsOf(c.phone)), [firstN]);
  const skipped = useMemo(() => firstN.filter((c) => !digitsOf(c.phone)), [firstN]);

  const currentTpl = useMemo(
    () => QUEUE_TEMPLATES.find((t) => t.key === templateKey) || QUEUE_TEMPLATES[0],
    [templateKey]
  );

  // Personalise per candidate (name + their applied role) — never an identical
  // blast. Rebuilds on open / template / tone change; manual edits persist
  // until one of those changes.
  useEffect(() => {
    if (!open) return;
    setMessages(queue.map((c) => substitute(currentTpl.body[tone] || currentTpl.body.gulf, {
      first_name: firstName(c.name),
      job_title: c.apps?.[0]?.jobTitle || "the role",
      company: "",
    })));
  }, [open, currentTpl, tone, queue]);

  // Reset progress + read today's outreach volume (soft safety counter).
  useEffect(() => {
    if (!open) return undefined;
    setIdx(0); setOpenedIdx(-1); setSentCount(0); setSentToday(null);
    if (!hrId) { setSentToday(0); return undefined; }
    let live = true;
    (async () => {
      try {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("candidate_events")
          .select("*", { count: "exact", head: true })
          .eq("hr_id", hrId)
          .eq("event_type", "whatsapp_outreach")
          .gte("created_at", start.toISOString());
        if (live) setSentToday(count || 0);
      } catch (_e) { if (live) setSentToday(0); }
    })();
    return () => { live = false; };
  }, [open, hrId]);

  const current = idx < queue.length ? queue[idx] : null;
  const done = idx >= queue.length;
  const sentTodayTotal = (sentToday || 0) + sentCount;
  const volumeWarn = sentTodayTotal >= DAILY_SOFT_LIMIT;

  function openCurrent() {
    if (!current) return;
    const href = buildWaLink(current.phone, messages[idx] || "");
    if (typeof window !== "undefined") window.open(href, "_blank", "noopener,noreferrer");
    setOpenedIdx(idx);
  }

  async function markSentAndNext() {
    if (!current) return;
    await logWhatsappEvent({
      candidateId: current.record?.candidate_id,
      jobId: current.apps?.[0]?.job_id,
      hrId,
      eventType: "whatsapp_outreach",
      metadata: { template: templateKey, tone, preview: String(messages[idx] || "").slice(0, 200), bulk: true },
    });
    setSentCount((n) => n + 1);
    if (onLogged) onLogged();
    setIdx((i) => i + 1);
  }

  function updateMessage(v) {
    setMessages((prev) => { const next = prev.slice(); next[idx] = v; return next; });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog" aria-modal="true" aria-label="Bulk WhatsApp queue"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(20,19,31,0.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: EASE }}
            style={{
              width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto",
              background: "var(--pj-surface)", border: "1px solid var(--pj-border)",
              borderRadius: 18, boxShadow: "var(--pj-shadow-card)", padding: 18,
            }}
          >
            <header style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "var(--pj-text)" }}>
                  <span style={{ color: "var(--hjl-whatsapp)" }}><WaIcon size={16} /></span>
                  Bulk WhatsApp
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--pj-muted)", lineHeight: 1.45 }}>
                  Assisted send — WhatsApp opens with each message ready and <strong>you tap send</strong>. One candidate at a time, never multiple tabs.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ background: "transparent", border: 0, color: "var(--pj-muted)", cursor: "pointer", padding: 4 }}>
                <CloseIcon />
              </button>
            </header>

            {capped && (
              <p style={noticeBox("info")}>
                Acting on the first {WA_QUEUE_CAP} of {selected.length} selected — WhatsApp's safe limit is lower than bulk database actions.
              </p>
            )}
            {skipped.length > 0 && (
              <p style={noticeBox("warn")}>
                Skipping {skipped.length} with no phone number: {skipped.map((c) => c.name).join(", ")}.
              </p>
            )}
            {volumeWarn && (
              <p style={noticeBox("warn")}>
                You've sent {sentTodayTotal} WhatsApp messages today. WhatsApp may flag high volume — consider spacing these out.
              </p>
            )}

            {queue.length === 0 ? (
              <div style={{ textAlign: "center", padding: "18px 8px" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--pj-text)", margin: "0 0 4px" }}>No reachable candidates</p>
                <p style={{ fontSize: 13, color: "var(--pj-muted)", margin: 0 }}>None of the selected candidates have a phone number on file.</p>
                <button type="button" style={{ ...pill("ink"), marginTop: 14 }} onClick={onClose}>Close</button>
              </div>
            ) : done ? (
              <div style={{ textAlign: "center", padding: "18px 8px" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--pj-text)", margin: "0 0 4px" }}>Queue complete</p>
                <p style={{ fontSize: 13, color: "var(--pj-muted)", margin: 0 }}>
                  Logged {sentCount} of {queue.length} {queue.length === 1 ? "message" : "messages"} as sent.
                </p>
                <button type="button" style={{ ...pill("ink"), marginTop: 14 }} onClick={onClose}>Done</button>
              </div>
            ) : (
              <>
                {/* Template + tone (reuse the composer's templates) */}
                <div style={{ marginBottom: 10 }}>
                  <span style={labelStyle}>Template</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {QUEUE_TEMPLATES.map((t) => (
                      <button
                        key={t.key} type="button" onClick={() => setTemplateKey(t.key)}
                        style={chipStyle(templateKey === t.key)}
                      >{t.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>Tone</span>
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    {["gulf", "india"].map((tk) => (
                      <button key={tk} type="button" onClick={() => setTone(tk)} style={chipStyle(tone === tk)}>
                        {tk === "gulf" ? "Gulf" : "India"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress + current candidate */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--pj-muted)" }}>
                    {idx + 1} of {queue.length}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--pj-muted)" }}>{sentCount} sent</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: "var(--hjl-ink-soft)", overflow: "hidden", marginBottom: 12 }}>
                  <motion.div
                    initial={false}
                    animate={{ width: `${(idx / queue.length) * 100}%` }}
                    transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                    style={{ height: "100%", background: "var(--hjl-whatsapp)" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--pj-text)" }}>{current.name}</span>
                  <span style={{ fontSize: 12, color: "var(--pj-muted)" }}>{current.apps?.[0]?.jobTitle || ""}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--pj-muted)", marginBottom: 8 }}>{current.phone}</div>

                <textarea
                  value={messages[idx] || ""}
                  onChange={(e) => updateMessage(e.target.value)}
                  rows={5}
                  aria-label={`Message to ${current.name}`}
                  style={{
                    width: "100%", boxSizing: "border-box", resize: "vertical",
                    padding: "10px 12px", borderRadius: 10, border: "1px solid var(--pj-border)",
                    background: "var(--pj-input-bg)", color: "var(--pj-text)", font: "inherit",
                    fontSize: 13.5, lineHeight: 1.5,
                  }}
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.96 }} style={pill("wa")} onClick={openCurrent} disabled={!messages[idx]?.trim()}>
                    <WaIcon /> Open in WhatsApp
                  </motion.button>
                  <motion.button
                    type="button" whileTap={reduce ? undefined : { scale: 0.96 }}
                    style={{ ...pill("ink"), opacity: openedIdx === idx ? 1 : 0.55 }}
                    onClick={markSentAndNext}
                    title={openedIdx === idx ? "" : "Open in WhatsApp first"}
                  >
                    Mark sent &amp; next
                  </motion.button>
                  <span style={{ flex: 1 }} />
                  <button type="button" style={pill("plain")} onClick={() => { setIdx((i) => i + 1); }}>
                    Skip
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pj-muted)", marginBottom: 6 };
const chipStyle = (active) => ({
  padding: "6px 11px", borderRadius: 999, font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  border: `1px solid ${active ? "var(--hjl-ink)" : "var(--pj-border)"}`,
  background: active ? "var(--hjl-ink)" : "var(--pj-surface)",
  color: active ? "#FFFFFF" : "var(--pj-text-soft)",
});
function noticeBox(kind) {
  return {
    fontSize: 12.5, lineHeight: 1.45, margin: "0 0 10px", padding: "8px 10px", borderRadius: 8,
    background: kind === "warn" ? "var(--hjl-pass-soft)" : "var(--hjl-ink-soft)",
    color: kind === "warn" ? "var(--hjl-pass)" : "var(--pj-text-soft)",
  };
}
