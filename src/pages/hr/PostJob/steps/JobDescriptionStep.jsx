import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* Inline-icon glyphs — small, monoline, fall back to text when unrelated. */
const Glyph = {
  B: () => <span style={{ fontWeight: 700 }}>B</span>,
  U: () => <span style={{ textDecoration: "underline" }}>U</span>,
  I: () => <span style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }}>I</span>,
  AlignLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="14" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
    </svg>
  ),
  Bullet: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
      <circle cx="4" cy="6" r="1.4" fill="currentColor"/><circle cx="4" cy="12" r="1.4" fill="currentColor"/><circle cx="4" cy="18" r="1.4" fill="currentColor"/>
    </svg>
  ),
  Numbered: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
      <text x="2" y="8" fontSize="6.5" fill="currentColor" stroke="none" fontFamily="ui-monospace">1</text>
      <text x="2" y="14" fontSize="6.5" fill="currentColor" stroke="none" fontFamily="ui-monospace">2</text>
      <text x="2" y="20" fontSize="6.5" fill="currentColor" stroke="none" fontFamily="ui-monospace">3</text>
    </svg>
  ),
  H1: () => <span style={{ fontWeight: 700, fontSize: 11 }}>H1</span>,
  Link: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Image: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><polyline points="21 15 16 10 5 21"/>
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const TOOL_ROW_1 = [
  { kind: "exec",   id: "bold",          label: "Bold",       cmd: "bold",          glyph: <Glyph.B /> },
  { kind: "exec",   id: "underline",     label: "Underline",  cmd: "underline",     glyph: <Glyph.U /> },
  { kind: "exec",   id: "italic",        label: "Italic",     cmd: "italic",        glyph: <Glyph.I /> },
  { kind: "sep" },
  { kind: "decor",  id: "align",         label: "Align",      glyph: <Glyph.AlignLeft /> },
  { kind: "exec",   id: "bullet",        label: "Bullet list",cmd: "insertUnorderedList", glyph: <Glyph.Bullet /> },
  { kind: "exec",   id: "numbered",      label: "Numbered",   cmd: "insertOrderedList",   glyph: <Glyph.Numbered /> },
  { kind: "sep" },
  { kind: "h1",     id: "h1",            label: "Heading",    glyph: <Glyph.H1 /> },
  { kind: "link",   id: "link",          label: "Link",       glyph: <Glyph.Link /> },
  { kind: "decor",  id: "image",         label: "Image",      glyph: <Glyph.Image /> },
];

export default function JobDescriptionStep({ value, onChange, onContinue, onBack }) {
  const reduce = useReducedMotion();
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && (value.jobDescription || "") !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value.jobDescription || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch) => onChange({ ...value, ...patch });

  const exec = (cmd) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, null);
    set({ jobDescription: editorRef.current?.innerHTML || "" });
  };

  const formatH1 = () => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, "H1");
    set({ jobDescription: editorRef.current?.innerHTML || "" });
  };

  const insertLink = () => {
    editorRef.current?.focus();
    const url = window.prompt("Enter URL:");
    if (!url) return;
    document.execCommand("createLink", false, url);
    set({ jobDescription: editorRef.current?.innerHTML || "" });
  };

  const onInput = () => set({ jobDescription: editorRef.current?.innerHTML || "" });

  const containerVariants = { initial: {}, animate: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } } };
  const item = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } } };

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <motion.h1 className="pj-h1" variants={item}>Lastly, add a Job Description</motion.h1>

      <motion.div className="pj-field" variants={item}>
        <span className="pj-label">Job Description <span className="pj-label-hint">(Optional)</span></span>
        <div className="pj-editor">
          <div className="pj-editor__toolbar" role="toolbar" aria-label="Formatting">
            {TOOL_ROW_1.map((t, i) => {
              if (t.kind === "sep") return <span key={`sep-${i}`} className="pj-tool-sep" />;
              const click = () => {
                if (t.kind === "exec")  return exec(t.cmd);
                if (t.kind === "h1")    return formatH1();
                if (t.kind === "link")  return insertLink();
                /* decor: keep visual feedback only */
                editorRef.current?.focus();
              };
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  className="pj-tool-btn"
                  onClick={click}
                  aria-label={t.label}
                  whileTap={reduce ? undefined : { scale: 0.92 }}
                  transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                >
                  {t.glyph}
                </motion.button>
              );
            })}
          </div>
          <div
            ref={editorRef}
            className="pj-editor__surface"
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            data-placeholder="Describe the role, what success looks like, and what you're looking for in a candidate…"
          />
        </div>
      </motion.div>

      <motion.div className="pj-actions" variants={item}>
        <motion.button type="button" className="pj-btn pj-btn--ghost" onClick={onBack}
          whileHover={reduce ? undefined : { y: -1 }} whileTap={reduce ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}>Previous</motion.button>
        <motion.button type="button" className="pj-btn pj-btn--primary" onClick={onContinue}
          whileHover={reduce ? undefined : { y: -1 }} whileTap={reduce ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}>Continue</motion.button>
      </motion.div>
    </motion.div>
  );
}
