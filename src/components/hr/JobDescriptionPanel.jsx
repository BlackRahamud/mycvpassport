// =============================================================
// JobDescriptionPanel — the job description, always one click away.
//
// Two homes (candidate evaluation redesign):
//  - Review mode right rail (frame 1a): always open on desktop,
//    collapsible on mobile.
//  - Job pipeline header (frame 1h): collapsible everywhere,
//    collapsed by default.
//
// Owns the empty state ("No description for this role. Add details to
// sharpen AI matching.", frame 1i) and the inline add/edit editor that
// writes jobs.description — so "Add description" is a real action,
// never a dead button.
// =============================================================
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import "./jobDescriptionPanel.css";

const EASE = [0.4, 0, 0.2, 1];

const ChevIc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);

function formatSalaryRange(j) {
  if (!j) return "";
  const lo = j.salary_min, hi = j.salary_max;
  if (!lo && !hi) return "";
  const cur = j.currency || "AED";
  const fmt = (n) => Number(n).toLocaleString();
  if (lo && hi) return `${cur} ${fmt(lo)} to ${fmt(hi)}`;
  return `${cur} ${fmt(lo || hi)}`;
}

function shortJobRef(id) {
  const s = String(id || "").replace(/-/g, "");
  return s ? s.slice(0, 6).toUpperCase() : "";
}

export default function JobDescriptionPanel({
  job,
  collapsible = false,
  defaultOpen = true,
  showChips = true,
  groundNote = null,
  onDescriptionSaved,
  reduce,
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const hasDescription = Boolean(job?.description && String(job.description).trim());
  const requirements = Array.isArray(job?.requirements) ? job.requirements.filter(Boolean) : [];
  const isOpen = collapsible ? open : true;

  const save = async () => {
    const text = draft.trim();
    if (!text || !job?.id) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from("jobs").update({ description: text }).eq("id", job.id);
    setSaving(false);
    if (error) {
      setSaveError("Couldn't save the description. Check your connection and try again.");
      return;
    }
    onDescriptionSaved?.(text);
    setEditing(false);
  };

  return (
    <section className="jdp" aria-label="Job description">
      <button
        type="button"
        className="jdp__head"
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
        aria-expanded={isOpen}
        style={{ cursor: collapsible ? "pointer" : "default" }}
      >
        <span className="jdp__titles">
          <span className="jdp__eyebrow">Job description</span>
          <span className="jdp__title">{job?.title || "This role"}</span>
        </span>
        {collapsible && (
          <span className={`jdp__chev${isOpen ? " is-open" : ""}`} aria-hidden="true"><ChevIc /></span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="jdp-body"
            className="jdp__body"
            initial={reduce || !collapsible ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            {showChips && (
              <div className="jdp__chips">
                {job?.location && <span className="jdp__chip">{job.location}{job.position ? `, ${job.position}` : ""}</span>}
                {job?.job_type && <span className="jdp__chip">{String(job.job_type).replace(/_/g, " ")}</span>}
                {formatSalaryRange(job) && <span className="jdp__chip">{formatSalaryRange(job)}</span>}
                {job?.id && <span className="jdp__chip jdp__chip--soft">Job ID {shortJobRef(job.id)}</span>}
              </div>
            )}

            {hasDescription && !editing && (
              <>
                {/<[a-z][\s\S]*>/i.test(job.description) ? (
                  // Descriptions accept HTML (migration 011); authored by the
                  // signed-in recruiter in the post wizard.
                  <div className="jdp__desc jdp__desc--rich" dangerouslySetInnerHTML={{ __html: job.description }} />
                ) : (
                  <div className="jdp__desc">
                    {String(job.description).split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                )}
                {requirements.length > 0 && (
                  <div className="jdp__desc">
                    <p className="jdp__subhead">Requirements</p>
                    <ul className="jdp__list">
                      {requirements.slice(0, 10).map((r, i) => <li key={i}>{typeof r === "string" ? r : r?.label || ""}</li>)}
                    </ul>
                  </div>
                )}
                <button type="button" className="jdp__linkbtn" onClick={() => { setDraft(job.description || ""); setEditing(true); }}>
                  Edit description
                </button>
              </>
            )}

            {!hasDescription && !editing && (
              <div className="jdp__empty">
                <span className="jdp__empty-title">No description for this role</span>
                <span className="jdp__empty-body">Add details to sharpen AI matching.</span>
                <button type="button" className="jdp__addbtn" onClick={() => { setDraft(""); setEditing(true); }}>
                  Add description
                </button>
              </div>
            )}

            {editing && (
              <div className="jdp__editor">
                <textarea
                  className="jdp__textarea"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={7}
                  placeholder="What the role does, the stack, the schedule, the salary band…"
                />
                {saveError && <span className="jdp__error" role="alert">{saveError}</span>}
                <div className="jdp__editor-acts">
                  <button type="button" className="jdp__btn" onClick={() => { setEditing(false); setSaveError(null); }}>Cancel</button>
                  <button type="button" className="jdp__btn jdp__btn--primary" onClick={save} disabled={saving || !draft.trim()}>
                    {saving ? "Saving…" : "Save description"}
                  </button>
                </div>
              </div>
            )}

            {groundNote && <div className="jdp__ground">{groundNote}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
