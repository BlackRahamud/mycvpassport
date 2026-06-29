import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { uploadJobImage } from "../../../../services/uploadJobImage";

/* Inline-icon glyphs — small, monoline. */
const Glyph = {
  B: () => <span style={{ fontWeight: 700 }}>B</span>,
  U: () => <span style={{ textDecoration: "underline" }}>U</span>,
  I: () => <span style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }}>I</span>,
  AlignLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="14" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
    </svg>
  ),
  AlignCenter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
    </svg>
  ),
  AlignRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
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
    </svg>
  ),
  Spinner: () => (
    <svg className="pj-tool-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  ),
};

export default function JobDescriptionStep({ value, onChange, onContinue, onBack }) {
  const reduce = useReducedMotion();
  const fileRef = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        // Configure the bundled Link (no separate package needed in v3).
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: "pj-editor__img" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Describe the role, what success looks like, and what you're looking for in a candidate…",
      }),
    ],
    content: value.jobDescription || "",
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      onChange({ ...valueRef.current, jobDescription: html });
    },
  });

  if (!editor) return null;

  // Toolbar buttons keep the editor selection: preventDefault on mousedown so
  // the click never blurs the editor (the root cause the old execCommand bar
  // tripped on).
  const guard = (fn) => (e) => { e.preventDefault(); fn(); };

  const cycleAlign = () => {
    const next = editor.isActive({ textAlign: "center" })
      ? "right"
      : editor.isActive({ textAlign: "right" })
        ? "left"
        : "center";
    editor.chain().focus().setTextAlign(next).run();
  };
  const alignGlyph = editor.isActive({ textAlign: "center" })
    ? <Glyph.AlignCenter />
    : editor.isActive({ textAlign: "right" })
      ? <Glyph.AlignRight />
      : <Glyph.AlignLeft />;

  const insertLink = () => {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL:", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const pickImage = () => { setImgError(null); fileRef.current?.click(); };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setImgError(null);
    setUploading(true);
    try {
      const url = await uploadJobImage(file);
      editor.chain().focus().setImage({ src: url, alt: "Job image" }).run();
    } catch (err) {
      setImgError(err?.message || "Couldn't upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const Btn = ({ onClick, label, active, disabled, children }) => (
    <motion.button
      type="button"
      className={`pj-tool-btn${active ? " pj-tool-btn--active" : ""}`}
      onMouseDown={guard(onClick)}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active || undefined}
      whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
      transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.button>
  );

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
            <Btn onClick={() => editor.chain().focus().toggleBold().run()} label="Bold" active={editor.isActive("bold")}><Glyph.B /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline" active={editor.isActive("underline")}><Glyph.U /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic" active={editor.isActive("italic")}><Glyph.I /></Btn>
            <span className="pj-tool-sep" />
            <Btn onClick={cycleAlign} label="Align" active={editor.isActive({ textAlign: "center" }) || editor.isActive({ textAlign: "right" })}>{alignGlyph}</Btn>
            <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list" active={editor.isActive("bulletList")}><Glyph.Bullet /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list" active={editor.isActive("orderedList")}><Glyph.Numbered /></Btn>
            <span className="pj-tool-sep" />
            <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Heading" active={editor.isActive("heading", { level: 1 })}><Glyph.H1 /></Btn>
            <Btn onClick={insertLink} label="Link" active={editor.isActive("link")}><Glyph.Link /></Btn>
            <Btn onClick={pickImage} label="Insert image" disabled={uploading}>{uploading ? <Glyph.Spinner /> : <Glyph.Image />}</Btn>
          </div>

          <EditorContent editor={editor} className="pj-editor__surface" />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} style={{ display: "none" }} />
        </div>
        {uploading && <span className="pj-editor__status" role="status">Uploading image…</span>}
        {imgError && <span className="pj-field-error" role="alert">{imgError}</span>}
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
