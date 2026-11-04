import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, Check, FileText, Mic, Sparkles, Upload, Type, CircleCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { loadUserResumes } from "../../resumeDb";
import { extractCvText } from "../../services/cvExtraction";
import { createPracticeSession, callPracticeAI, deletePracticeSession } from "../../lib/candidatePractice";
import InterviewerShell from "./InterviewerShell";

function cvToText(value) {
  const lines = [];
  const walk = (node, label = "", field = "") => {
    if (/(photo|image|avatar|base64|dataurl|template|signature|logo)/i.test(field)) return;
    if (node == null || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      const text = String(node).trim();
      if (text && !/^https?:\/\//i.test(text) && !/^data:image\//i.test(text)) lines.push(`${label ? `${label}: ` : ""}${text}`);
      return;
    }
    if (Array.isArray(node)) { node.forEach((item) => walk(item, label, field)); return; }
    Object.entries(node).forEach(([key, child]) => walk(child, key.replace(/([A-Z])/g, " $1").replace(/_/g, " "), key));
  };
  walk(value);
  return lines.join("\n").slice(0, 18000);
}

export default function InterviewerSetupPage({ user }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const cvInput = useRef(null);
  const jdInput = useRef(null);
  const [resumes, setResumes] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [cvText, setCvText] = useState("");
  const [cvLabel, setCvLabel] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [category, setCategory] = useState("general");
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState("setup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resumeLoading, setResumeLoading] = useState(true);
  const [pendingSessionId, setPendingSessionId] = useState(null);

  useEffect(() => {
    let active = true;
    loadUserResumes(user.id).then((rows) => {
      if (!active) return;
      setResumes(rows);
      const first = rows[0];
      if (first) {
        setSelectedCvId(first.id);
        setCvText(cvToText(first.cv_data));
        setCvLabel(first.title || "Saved CV");
      }
    }).catch((e) => { console.error("[candidate-practice] saved CV lookup failed", { message: e?.message, code: e?.code }); if (active) setError("Saved CVs could not be loaded. You can upload one instead."); })
      .finally(() => { if (active) setResumeLoading(false); });
    return () => { active = false; };
  }, [user.id]);

  const ready = useMemo(() => roleTitle.trim().length >= 2 && cvText.trim().length >= 80, [roleTitle, cvText]);

  const chooseResume = (id) => {
    setSelectedCvId(id);
    const resume = resumes.find((item) => item.id === id);
    setCvText(cvToText(resume?.cv_data));
    setCvLabel(resume?.title || "Saved CV");
    setError("");
  };

  const uploadCv = async (file) => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error("Choose a CV under 12 MB.");
      const result = await extractCvText(file, { ocrFallback: true });
      setCvText(result.text.slice(0, 18000)); setCvLabel(file.name); setSelectedCvId("");
    } catch (e) { setError(e.hint || e.message || "The CV could not be read. Try a text-based PDF or DOCX."); }
    finally { setBusy(false); if (cvInput.current) cvInput.current.value = ""; }
  };

  const uploadJobDescription = async (file) => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Choose a job description under 8 MB.");
      const lower = file.name.toLowerCase();
      let text;
      if (lower.endsWith(".txt")) text = await file.text();
      else text = (await extractCvText(file)).text;
      if (text.trim().length < 40) throw new Error("The job description file has too little readable text.");
      setJobDescription(text.slice(0, 12000));
    } catch (e) { setError(e.hint || e.message || "The job description could not be read."); }
    finally { setBusy(false); if (jdInput.current) jdInput.current.value = ""; }
  };

  const startInterview = async () => {
    if (!ready || !mode || busy) return;
    setBusy(true); setError("");
    try {
      let sessionId = pendingSessionId;
      if (!sessionId) {
        const session = await createPracticeSession({
          candidateId: user.id, roleTitle, jobDescription, cvText,
          mode, difficulty, category,
        });
        sessionId = session.id;
        setPendingSessionId(sessionId);
      }
      await callPracticeAI({ task: "generate", sessionId });
      navigate(`/interviewer/session/${sessionId}`);
    } catch (e) {
      setError(e.message || "The interview could not start. Your setup is still here; try again.");
    } finally { setBusy(false); }
  };

  const editSetup = async () => {
    if (pendingSessionId) {
      try { await deletePracticeSession(pendingSessionId); } catch { setError("The unfinished setup could not be cleared. Try again."); return; }
      setPendingSessionId(null);
    }
    setStep("setup");
  };

  return (
    <InterviewerShell>
      <div className="civ-heading">
        <div><span className="civ-kicker"><Sparkles size={14} /> Interview practice</span><h1>Prepare for the conversation.</h1><p>Build a focused practice session around your experience and the role you want.</p></div>
        <button type="button" className="civ-button civ-button--quiet" onClick={() => navigate("/interviewer/history")}>My interviews</button>
      </div>

      {step === "setup" ? <section className="civ-panel civ-setup">
        <div className="civ-panel__head"><span className="civ-step">01</span><div><h2>Set up your practice</h2><p>Your CV stays attached to your private account.</p></div></div>
        <div className="civ-form-grid">
          <label className="civ-field civ-field--wide"><span>Target role</span><input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} maxLength={160} placeholder="For example, Senior Product Analyst" /></label>
          <label className="civ-field"><span>Interview focus</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="general">Balanced interview</option><option value="technical">Technical</option><option value="behavioral">Behavioral</option><option value="role_specific">Role specific</option></select></label>
          <label className="civ-field"><span>Difficulty</span><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="entry">Entry level</option><option value="intermediate">Experienced</option><option value="senior">Senior</option></select></label>

          <div className="civ-field civ-field--wide"><span>Your CV</span>
            {resumes.length > 0 && <select aria-label="Choose a saved CV" value={selectedCvId} onChange={(e) => chooseResume(e.target.value)}><option value="">Choose a saved CV or upload a new one</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title || "My CV"}</option>)}</select>}
            <div className="civ-upload-row"><span className={cvText ? "civ-file-ready" : "civ-file-empty"}><FileText size={17} />{cvText ? `${cvLabel} · ${cvText.length.toLocaleString()} characters` : resumeLoading ? "Checking for saved CVs…" : "PDF or DOCX, up to 12 MB"}</span><button type="button" className="civ-button civ-button--outline" onClick={() => cvInput.current?.click()} disabled={busy}><Upload size={16} /> Upload CV</button><input ref={cvInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => uploadCv(e.target.files?.[0])} /></div>
          </div>

          <label className="civ-field civ-field--wide"><span>Job description <small>Optional</small></span><textarea value={jobDescription} maxLength={12000} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description to make questions more specific." rows={5} /><div className="civ-upload-row civ-upload-row--compact"><span>Or add a PDF, DOCX or TXT file</span><button type="button" className="civ-text-button" onClick={() => jdInput.current?.click()}><Upload size={14} /> Upload description</button><input ref={jdInput} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => uploadJobDescription(e.target.files?.[0])} /></div></label>
        </div>
        {error && <p className="civ-error" role="alert">{error}</p>}
        <div className="civ-form-footer"><p><Check size={15} /> Your answers are private and saved to your account.</p><button type="button" className="civ-button civ-button--primary" disabled={!ready || busy} onClick={() => { setError(""); setStep("mode"); }}>{busy ? "Reading your file…" : "Choose interview mode"}</button></div>
      </section> : <section className="civ-panel civ-mode">
        <button type="button" className="civ-text-button civ-mode__back" onClick={editSetup}>{pendingSessionId ? "← Discard this setup and edit" : "← Back to setup"}</button>
        <div className="civ-panel__head"><span className="civ-step">02</span><div><h2>How would you like to practise?</h2><p>Both modes use the same questions, feedback and interview report.</p></div></div>
        <div className="civ-mode-grid">
          {[{ id: "voice", title: "Voice interview", description: "Hear each question and answer using your microphone when your browser supports speech recognition.", note: "Text fallback always available", icon: <Mic size={22} /> }, { id: "text", title: "Text interview", description: "Read one question at a time, write your answer and get focused feedback.", note: "Review and edit before submitting", icon: <Type size={22} /> }].map((option) => <motion.button key={option.id} type="button" aria-pressed={mode === option.id} className={`civ-mode-option${mode === option.id ? " is-selected" : ""}`} disabled={Boolean(pendingSessionId)} onClick={() => setMode(option.id)} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: 0.99 }} transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}><span className="civ-mode-option__icon">{option.icon}</span>{mode === option.id && <span className="civ-mode-option__selected"><CircleCheck size={16} /> Selected</span>}<b>{option.title}</b><span>{option.description}</span><small>{option.note}</small></motion.button>)}
        </div>
        {error && <p className="civ-error" role="alert">{error}</p>}
        <div className="civ-form-footer"><p><AudioLines size={16} /> {roleTitle}</p><button type="button" className="civ-button civ-button--primary" disabled={!mode || busy} onClick={startInterview}>{busy ? "Preparing questions…" : "Start interview"}</button></div>
      </section>}
    </InterviewerShell>
  );
}
