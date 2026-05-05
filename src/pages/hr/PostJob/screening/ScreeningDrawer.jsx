import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

const CATEGORY_LABEL = {
  "background-check":  "Background Check",
  "certifications":    "Certifications",
  "drivers-license":   "Driver's License",
  "gpa":               "GPA",
  "work-authorization":"Work Authorization",
  "drug-test":         "Drug Test",
  "education":         "Education",
  "expertise-tools":   "Expertise with Tools",
  "hybrid-work":       "Hybrid Work",
  "industry-experience":"Industry Experience",
  "language":          "Language",
  "location":          "Location",
  "onsite-work":       "Onsite Work",
  "remote-work":       "Remote Work",
  "urgent-hiring":     "Urgent Hiring Needed",
  "visa-status":       "Visa Status",
  "work-experience":   "Work Experience",
  "custom":            "Custom",
};

const PRESET_QUESTIONS = {
  "background-check": [
    { text: "Can you work in person in Menlo Park, CA?", responseType: "yes-no", idealAnswer: "yes", mustHave: false },
    { text: "How many years of experience do you have as a engineer?", responseType: "yes-no", idealAnswer: "yes", mustHave: false },
  ],
};

const DEFAULT_QUESTION = () => ({
  text: "",
  responseType: "yes-no",
  idealAnswer: "yes",
  mustHave: false,
});

const CloseGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PlusGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const XSmall = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function ScreeningDrawer({ open, categoryKey, onClose, onSave }) {
  const reduce = useReducedMotion();
  const [questions, setQuestions] = useState([]);
  const [activeCategory, setActiveCategory] = useState(categoryKey || "background-check");

  useEffect(() => {
    if (!open) return;
    setActiveCategory(categoryKey || "background-check");
    const preset = PRESET_QUESTIONS[categoryKey || "background-check"];
    setQuestions(preset ? preset.map((q) => ({ ...q })) : [DEFAULT_QUESTION(), DEFAULT_QUESTION()]);
  }, [open, categoryKey]);

  if (!open) return null;

  const updateQ = (idx, patch) => setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  const removeQ = (idx) => setQuestions((qs) => qs.filter((_, i) => i !== idx));
  const addQ = () => setQuestions((qs) => [...qs, DEFAULT_QUESTION()]);

  const handleSave = () => {
    const valid = questions.filter((q) => q.text.trim() || true);
    onSave?.({ categoryKey: activeCategory, questions: valid });
  };

  const headerLabel = `${CATEGORY_LABEL[activeCategory] || activeCategory} (${questions.length} questions)`;

  return (
    <AnimatePresence>
      <motion.div
        key="bd"
        className="pj-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        onClick={onClose}
      />
      <motion.aside
        key="dr"
        role="dialog"
        aria-modal="true"
        aria-label="Add screening questions"
        className="pj-drawer-wrap"
        initial={reduce ? { opacity: 0 } : { x: "100%" }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: "100%" }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="pj-drawer__head">
          <h2 className="pj-modal__title">Add Screening Questions</h2>
          <button type="button" className="pj-modal__close" onClick={onClose} aria-label="Close"><CloseGlyph /></button>
        </div>

        <div className="pj-drawer__body">
          <div className="pj-field" style={{ marginBottom: 18 }}>
            <span className="pj-label">Screening Questions Category</span>
            <div className="pj-select-wrap">
              <select
                className="pj-select"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
              >
                {Object.entries(CATEGORY_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label} ({questions.length} questions)</option>
                ))}
              </select>
            </div>
            <span style={{ display: "none" }}>{headerLabel}</span>
          </div>

          {questions.map((q, idx) => (
            <motion.div
              key={idx}
              className="pj-qcard"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1], delay: idx * 0.05 }}
            >
              <button type="button" className="pj-qcard__close" onClick={() => removeQ(idx)} aria-label="Remove question"><XSmall /></button>
              <div className="pj-qcard__head">
                <span className="pj-qcard__head-label">Write a custom screening question.</span>
              </div>
              <p className="pj-qcard__sub">Help keep LinkedIn respectful and professional</p>
              <textarea
                className="pj-qcard__textarea"
                value={q.text}
                onChange={(e) => updateQ(idx, { text: e.target.value })}
                rows={1}
                placeholder="Enter your question…"
              />
              <div className="pj-qcard__row">
                <div className="pj-qcard__field">
                  <span className="pj-label">Response type:</span>
                  <div className="pj-select-wrap">
                    <select
                      className="pj-select"
                      style={{ height: 36 }}
                      value={q.responseType}
                      onChange={(e) => updateQ(idx, { responseType: e.target.value })}
                    >
                      <option value="yes-no">Yes/No</option>
                      <option value="number">Number</option>
                      <option value="text">Text</option>
                    </select>
                  </div>
                </div>
                <div className="pj-qcard__field">
                  <span className="pj-label">Ideal answer</span>
                  <div className="pj-select-wrap">
                    <select
                      className="pj-select"
                      style={{ height: 36 }}
                      value={q.idealAnswer}
                      onChange={(e) => updateQ(idx, { idealAnswer: e.target.value })}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
                <label className="pj-checkbox">
                  <input
                    type="checkbox"
                    checked={!!q.mustHave}
                    onChange={(e) => updateQ(idx, { mustHave: e.target.checked })}
                  />
                  <span className="pj-checkbox__box" aria-hidden />
                  <span>Must-have qualification</span>
                </label>
              </div>
            </motion.div>
          ))}

          <button type="button" className="pj-link-btn" onClick={addQ}>
            <PlusGlyph />
            Add screening question
          </button>
        </div>

        <div className="pj-drawer__foot">
          <button type="button" className="pj-btn pj-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="pj-btn pj-btn--primary" onClick={handleSave} disabled={questions.length === 0}>Save</button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
