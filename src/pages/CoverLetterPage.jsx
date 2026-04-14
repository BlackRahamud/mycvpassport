import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import mammoth from "mammoth";
import { generateCoverLetterFromTemplate } from "../coverLetterDataBank.generated";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import { loadUserResumes } from "../resumeDb";
import { getPaymentLink, hasFeatureAccess } from "../utils/paywall";
import "../components/FAB/FAB.css";

const CL_GREEN = "#6EE7B7";

const CL_YEARS_EXPERIENCE_OPTIONS = ["Less than 1 year", "1–2 years", "3–5 years", "5+ years"];

function validateCoverLetterStructuredFields({ fullName, currentJobTitle, targetRole }) {
  const err = {};
  if (!String(fullName || "").trim()) err.fullName = "Please enter your full name.";
  if (!String(currentJobTitle || "").trim()) err.currentJobTitle = "Please enter your current or last job title.";
  if (!String(targetRole || "").trim()) err.targetRole = "Please enter the role you are applying for.";
  return err;
}

function getTodayDateLabelCL() {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** Matches Pricing.jsx: AE → UAE template, IN → India template. */
function getCoverLetterPricingMarket() {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("cvp_pricing_currency") === "IN" ? "India" : "UAE";
  } catch {
    return "UAE";
  }
}

function defaultLetterTemplateForCL({ resume, generatedBody, companyName, jobTitle, salutationLine, closingBlock }) {
  const fullName = resume?.name || "Candidate Name";
  const email = resume?.email || "email@example.com";
  const phone = resume?.phone || "Phone";
  const location = resume?.location || "Location";
  const companyLine = (companyName || "").trim() || "your company";
  const dateLine = getTodayDateLabelCL();
  const salutation = salutationLine != null ? salutationLine : "Dear Hiring Manager,";
  const closing = closingBlock != null ? closingBlock : `Yours sincerely,\n${fullName}`;
  return `${fullName} | ${email} | ${phone} | ${location}
${dateLine}

${companyLine}
${salutation}

${generatedBody || `I am writing to express my interest in the ${jobTitle || "position"}. My background aligns well with this opportunity.`}

${closing}`;
}

/**
 * PDF text is not extracted in-browser here (avoids bundling pdfjs-dist — fixes Vercel/CRA resolve issues).
 * Cover letter API uses the structured six fields plus profile contact details from the chosen CV source.
 */

function resumeFromPdfText(text, nameFallback) {
  const t = text.replace(/\s+/g, " ").trim();
  const emailMatch = t.match(/[\w.+-]+@[\w.-]+\.\w+/);
  const summary =
    t.length > 0
      ? t.slice(0, 4000)
      : "Uploaded CV file (PDF). Your pasted job description below is used to tailor the letter.";
  return {
    name: nameFallback || "Candidate",
    title: "",
    email: emailMatch ? emailMatch[0] : "",
    phone: "",
    location: "",
    summary,
    experience: [],
    skills: "",
    languages: "",
    technicalSkills: "",
  };
}

export function CoverLetterSpinnerArrow({ size = 48 }) {
  const s = typeof size === "number" ? size : 48;
  return (
    <div style={{ position: "relative", width: s, height: s, margin: "0 auto" }}>
      <style>{`
        @keyframes cvpClSpin { to { transform: rotate(360deg); } }
        @keyframes cvpClBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
      `}</style>
      <svg
        width={s}
        height={s}
        viewBox="0 0 48 48"
        style={{ animation: "cvpClSpin 1.1s linear infinite" }}
        aria-hidden
      >
        <circle cx="24" cy="24" r="20" stroke={CL_GREEN} strokeWidth="3" fill="none" strokeDasharray="32 120" strokeLinecap="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
          animation: "cvpClBounce 0.9s ease-in-out infinite",
        }}
      >
        <svg width={Math.round(s * 0.38)} height={Math.round(s * 0.38)} viewBox="0 0 24 24" fill="none" stroke={CL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
function CoverLetterPage({ user, profile, onBack }) {
  const [phase, setPhase] = useState("entry");
  const [selectedOption, setSelectedOption] = useState(null);
  const [savedList, setSavedList] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadResume, setUploadResume] = useState(null);
  const [clFullName, setClFullName] = useState("");
  const [clCurrentJobTitle, setClCurrentJobTitle] = useState("");
  const [clYearsOfExperience, setClYearsOfExperience] = useState("3–5 years");
  const [clTargetRole, setClTargetRole] = useState("");
  const [clKeyStrength, setClKeyStrength] = useState("");
  const [clCompanyName, setClCompanyName] = useState("");
  const [clFieldErrors, setClFieldErrors] = useState({});
  const [letterBody, setLetterBody] = useState("");
  const [activeResume, setActiveResume] = useState(null);
  const [genError, setGenError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [clFreePreview, setClFreePreview] = useState(false);
  const [clTemplateVariant, setClTemplateVariant] = useState(null);
  const [clUnlocking, setClUnlocking] = useState(false);
  const uploadInputRef = useRef(null);
  const lastClPayloadRef = useRef(null);
  const userTriggeredRef = useRef(false);
  const clRefFullName = useRef(null);
  const clRefCurrentJob = useRef(null);
  const clRefYears = useRef(null);
  const clRefTargetRole = useRef(null);
  const clRefKeyStrength = useRef(null);
  const clRefCompany = useRef(null);

  const hasAccess = hasFeatureAccess(profile, 'coverLetter');

  const clInputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #2A2A2A",
    background: "#141414",
    color: "#FFF",
    fontSize: 15,
    boxSizing: "border-box",
    fontFamily: "'DM Sans',sans-serif",
  };
  const clLabelStyle = { fontSize: 13, color: "#A0A0A0", display: "block", marginBottom: 8 };

  useEffect(() => {
    writeFabMemory({ hasVisitedCoverLetter: true });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadUserResumes(user.id)
      .then((rows) => {
        setSavedList(rows || []);
        if (rows?.length && !selectedCvId) {
          setSelectedCvId(String(rows[0].id));
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (selectedOption !== "saved" || !savedList.length) return;
    const row = savedList.find((r) => String(r.id) === String(selectedCvId));
    if (row?.cv_data) setActiveResume(row.cv_data);
  }, [selectedOption, selectedCvId, savedList]);

  useEffect(() => {
    if (selectedOption !== "upload") {
      setUploadName("");
      setUploadResume(null);
    }
  }, [selectedOption]);

  useEffect(() => {
    if (selectedOption !== "saved" || !activeResume) return;
    setClFullName(activeResume.name || "");
    setClCurrentJobTitle(activeResume.title || "");
    setClYearsOfExperience("3–5 years");
    const firstSkill = String(activeResume.skills || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)[0];
    setClKeyStrength(firstSkill || "");
    setClTargetRole("");
    setClCompanyName("");
  }, [selectedOption, selectedCvId, activeResume]);

  useEffect(() => {
    if (selectedOption !== "upload" || !activeResume || !uploadName) return;
    setClFullName(activeResume.name || "");
    setClCurrentJobTitle(activeResume.title || "");
    setClYearsOfExperience("3–5 years");
    const firstSkill = String(activeResume.skills || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)[0];
    setClKeyStrength(firstSkill || "");
    setClTargetRole("");
    setClCompanyName("");
  }, [selectedOption, activeResume, uploadName]);

  useEffect(() => {
    if (selectedOption !== "describe") return;
    const dn = (user?.user_metadata?.name || user?.email?.split("@")[0] || "").trim();
    setClFullName(dn);
    setClCurrentJobTitle("");
    setClYearsOfExperience("Less than 1 year");
    setClTargetRole("");
    setClKeyStrength("");
    setClCompanyName("");
  }, [selectedOption, user?.email, user?.user_metadata?.name]);

  const resumeForApi = useMemo(() => {
    const base =
      selectedOption === "describe"
        ? {
            name: "",
            title: "",
            email: user?.email || "",
            phone: "",
            location: "",
            summary: "",
            experience: [],
            skills: "",
            languages: "",
            technicalSkills: "",
          }
        : activeResume;
    if (selectedOption !== "describe" && !base) return null;
    const merged = {
      ...(base || {}),
      name:
        clFullName.trim() ||
        base?.name ||
        (user?.user_metadata?.name || "").trim() ||
        (user?.email?.split("@")[0] || "").trim() ||
        "Candidate",
      title: clCurrentJobTitle.trim() || base?.title || "",
    };
    return merged;
  }, [selectedOption, activeResume, user, clFullName, clCurrentJobTitle]);

  const sourceReady =
    selectedOption !== null &&
    ((selectedOption === "saved" &&
      selectedCvId &&
      savedList.some((r) => String(r.id) === String(selectedCvId) && r.cv_data)) ||
      (selectedOption === "upload" && uploadResume) ||
      selectedOption === "describe");

  const coverLetterFabState = useMemo(() => {
    if (phase === "result" && letterBody && !hasAccess && clFreePreview) return "paywall";
    if (phase === "result" && letterBody) return "generated";
    if (!selectedOption || !sourceReady) return "empty";
    const fn = clFullName.trim();
    const ct = clCurrentJobTitle.trim();
    const tr = clTargetRole.trim();
    const ks = clKeyStrength.trim();
    const cn = clCompanyName.trim();
    const anyText = fn || ct || tr || ks || cn;
    if (!anyText) return "empty";
    const core = fn && ct && tr && ks;
    if (!core) return "partial";
    return "ready";
  }, [
    phase,
    letterBody,
    hasAccess,
    clFreePreview,
    selectedOption,
    sourceReady,
    clFullName,
    clCurrentJobTitle,
    clTargetRole,
    clKeyStrength,
    clCompanyName,
  ]);

  const coverLetterEmptyFieldLabels = useMemo(() => {
    if (!sourceReady || !selectedOption) return [];
    const labels = [];
    if (!clFullName.trim()) labels.push("Full name");
    if (!clCurrentJobTitle.trim()) labels.push("Current job title");
    if (!clTargetRole.trim()) labels.push("Target role");
    if (!clKeyStrength.trim()) labels.push("Key strength");
    if (!clCompanyName.trim()) labels.push("Company name");
    return labels;
  }, [
    sourceReady,
    selectedOption,
    clFullName,
    clCurrentJobTitle,
    clTargetRole,
    clKeyStrength,
    clCompanyName,
  ]);

  const focusFirstEmptyClField = useCallback(() => {
    if (!selectedOption) return;
    const fn = clFullName.trim();
    const ct = clCurrentJobTitle.trim();
    const tr = clTargetRole.trim();
    const ks = clKeyStrength.trim();
    const cn = clCompanyName.trim();
    if (!fn) {
      clRefFullName.current?.focus();
      return;
    }
    if (!ct) {
      clRefCurrentJob.current?.focus();
      return;
    }
    if (!tr) {
      clRefTargetRole.current?.focus();
      return;
    }
    if (!ks) {
      clRefKeyStrength.current?.focus();
      return;
    }
    if (!cn) {
      clRefCompany.current?.focus();
      return;
    }
    clRefYears.current?.focus();
  }, [selectedOption, clFullName, clCurrentJobTitle, clTargetRole, clKeyStrength, clCompanyName]);

  const fullLetterDisplay = useMemo(() => {
    if (!letterBody || !resumeForApi) return "";
    const jt = clTargetRole.trim() || "Position";
    const companyResolved = clCompanyName.trim() || "your company";
    const fullName = resumeForApi?.name || "Candidate Name";
    const market = getCoverLetterPricingMarket();
    const variant = clTemplateVariant ?? (market === "India" ? "india" : "uae");
    let salutationLine;
    let closingBlock;
    if (variant === "uae") {
      salutationLine = "Dear Hiring Manager,";
      closingBlock = `Sincerely,\n${fullName}`;
    } else {
      salutationLine = "Dear Sir/Madam,";
      closingBlock = `Yours sincerely,\n${fullName}`;
    }
    return defaultLetterTemplateForCL({
      resume: resumeForApi,
      generatedBody: letterBody,
      companyName: companyResolved,
      jobTitle: jt,
      salutationLine,
      closingBlock,
    });
  }, [letterBody, resumeForApi, clTargetRole, clCompanyName, clTemplateVariant]);

  const handleCoverLetterPdfDownload = useCallback(async () => {
    const fullText = fullLetterDisplay;
    if (!String(fullText || "").trim()) return;
    const escaped = String(fullText)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: #fff; }
    .cvp-root { width: 794px; padding: 48px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="cvp-root">${escaped}</div>
</body>
</html>`;
    try {
      const res = await fetch(`${window.location.origin}/api/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileBase = (resumeForApi?.name || "Cover_Letter").replace(/\s+/g, "_");
      a.download = `${fileBase}_Cover_Letter.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Download failed.");
    }
  }, [fullLetterDisplay, resumeForApi]);

  const clPreviewParts = useMemo(() => {
    if (!clFreePreview || !letterBody || !resumeForApi) return null;
    const fullName = resumeForApi?.name || "Candidate Name";
    const email = resumeForApi?.email || "email@example.com";
    const phone = resumeForApi?.phone || "Phone";
    const location = resumeForApi?.location || "Location";
    const dateLine = getTodayDateLabelCL();
    const companyResolved = clCompanyName.trim() || "your company";
    const header = `${fullName} | ${email} | ${phone} | ${location}\n${dateLine}\n\n${companyResolved}`;
    const salutation = clTemplateVariant === "india" ? "Dear Sir/Madam," : "Dear Hiring Manager,";
    const closing = clTemplateVariant === "india" ? `Yours sincerely,\n${fullName}` : `Sincerely,\n${fullName}`;
    const bodyParts = letterBody.split(/\n\n+/).filter(Boolean);
    const firstPara = bodyParts[0] || "";
    const restBody = bodyParts.slice(1).join("\n\n");
    return { header, salutation, firstPara, restBody, closing };
  }, [clFreePreview, letterBody, resumeForApi, clTemplateVariant, clCompanyName]);

  const processUploadFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Max file size is 5MB.");
      return;
    }
    const lower = file.name.toLowerCase();
    const isDocx =
      lower.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
    if (!isDocx && !isPdf) {
      alert("Please upload a PDF or Word (.docx) file.");
      return;
    }
    try {
      if (isDocx) {
        const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        const base = file.name.replace(/\.docx$/i, "").replace(/_/g, " ");
        const r = resumeFromPdfText(value, base);
        setUploadResume(r);
        setActiveResume(r);
      } else {
        const base = file.name.replace(/\.pdf$/i, "").replace(/_/g, " ");
        const r = resumeFromPdfText("", base);
        setUploadResume(r);
        setActiveResume(r);
      }
      setUploadName(file.name);
    } catch (err) {
      console.error(err);
      alert("Could not read this file. Try another file.");
      setUploadName("");
      setUploadResume(null);
      setActiveResume(null);
    }
  };

  const handleUploadInput = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) processUploadFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processUploadFile(f);
  };

  const handleGenerate = async () => {
    userTriggeredRef.current = true;
    if (!sourceReady || !resumeForApi) return;
    setGenError("");
    const fieldErrs = validateCoverLetterStructuredFields({
      fullName: clFullName,
      currentJobTitle: clCurrentJobTitle,
      targetRole: clTargetRole,
    });
    if (Object.keys(fieldErrs).length) {
      setClFieldErrors(fieldErrs);
      return;
    }
    setClFieldErrors({});

    const market = getCoverLetterPricingMarket();
    const companyResolved = clCompanyName.trim() || "your company";
    const fn = clFullName.trim();
    const ct = clCurrentJobTitle.trim();
    const tr = clTargetRole.trim();
    const ks = clKeyStrength.trim();
    const y = clYearsOfExperience;

    const templateForm = {
      structuredCoverLetter: true,
      fullName: fn,
      currentJobTitle: ct,
      yearsOfExperience: y,
      targetRole: tr,
      keyStrength: ks,
      companyName: companyResolved,
      market,
    };
    const templateBody = generateCoverLetterFromTemplate(templateForm, {});

    const requestPayload = {
      cvData: {
        name: fn,
        role: ct,
        summary: `Experience band: ${y}. Applying for: ${tr}. Key strength: ${ks}.`,
        skills: ks,
        experience: [ct],
        email: resumeForApi?.email || "",
        phone: resumeForApi?.phone || "",
        location: resumeForApi?.location || "",
      },
      jobTitle: tr,
      companyName: companyResolved,
      jobDescription: `Target role: ${tr}. Company: ${companyResolved}. Current or last title: ${ct}. Years of experience: ${y}. Key strength: ${ks}.`,
      date: getTodayDateLabelCL(),
      market,
    };
    lastClPayloadRef.current = requestPayload;

    if (!hasAccess) {
      setLetterBody(templateBody);
      setClTemplateVariant(market === "India" ? "india" : "uae");
      setClFreePreview(true);
      setPhase("result");
      userTriggeredRef.current = false;
      return;
    }

    if (!hasFeatureAccess(profile, 'coverLetter') || !userTriggeredRef.current) {
      userTriggeredRef.current = false;
      return;
    }

    setPhase("loading");
    setLetterBody("");
    setClFreePreview(false);
    setClTemplateVariant(null);
    const minWait = new Promise((r) => setTimeout(r, 5000));
    const apiCall = fetch("/api/cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Cover letter generation failed.");
      return String(data?.coverLetterBody || "").trim();
    });
    try {
      const [, body] = await Promise.all([minWait, apiCall]);
      setLetterBody(body);
      setClFreePreview(false);
      setClTemplateVariant(null);
      setPhase("result");
    } catch (err) {
      console.error(err);
      setGenError(err.message || "Generation failed.");
      setPhase("entry");
    } finally {
      userTriggeredRef.current = false;
    }
  };

  const handleUnlockFullCoverLetter = async () => {
    if (!hasFeatureAccess(profile, 'coverLetter')) {
      window.open(getPaymentLink('coverLetter'), '_blank');
      return;
    }
    const payload = lastClPayloadRef.current;
    if (!payload) {
      alert("Generate a letter first.");
      return;
    }
    setClUnlocking(true);
    setGenError("");
    try {
      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Cover letter generation failed.");
      const body = String(data?.coverLetterBody || "").trim();
      setLetterBody(body);
      setClFreePreview(false);
      setClTemplateVariant(null);
    } catch (e) {
      console.error(e);
      setGenError(e.message || "Could not unlock the full letter. Try again.");
    } finally {
      setClUnlocking(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page, #0A0A0A)",
        color: "var(--text-primary, #FFFFFF)",
        fontFamily: "'DM Sans',sans-serif",
        padding: "16px 16px 96px",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 1,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 36,
          height: 36,
          padding: 0,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "#A0A0A0",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      {phase === "entry" && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Cover Letter</h1>
          <p style={{ fontSize: 15, color: "#A0A0A0", marginTop: 0, marginBottom: 20 }}>How would you like to start?</p>
          {genError ? (
            <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{genError}</div>
          ) : null}

          <div style={{ display: "grid", gap: 12 }}>
            {[
              {
                id: "saved",
                title: "Use my CVPassport CV",
                sub: "Pull from your saved profile",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                ),
              },
              {
                id: "upload",
                title: "Upload existing CV",
                sub: "PDF or Word — we'll read it for you",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                ),
              },
              {
                id: "describe",
                title: "Describe yourself",
                sub: "Just tell us about yourself",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ),
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  textAlign: "left",
                  padding: 16,
                  borderRadius: 14,
                  border: selectedOption === opt.id ? `1px solid ${CL_GREEN}` : "1px solid #2A2A2A",
                  background: "#141414",
                  color: "#FFF",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ color: CL_GREEN, flexShrink: 0, marginTop: 2 }}>{opt.icon}</span>
                <span>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{opt.title}</span>
                  <span style={{ display: "block", fontSize: 13, color: "#A0A0A0", marginTop: 4 }}>{opt.sub}</span>
                </span>
              </button>
            ))}
          </div>

          {selectedOption === "saved" && (
            <div style={{ marginTop: 18 }}>
              {savedList.length === 0 && (
                <div style={{ color: "#A0A0A0", fontSize: 13 }}>No saved CVs yet</div>
              )}
            </div>
          )}

          {selectedOption === "upload" && (
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 13, color: "#A0A0A0", display: "block", marginBottom: 8 }}>Your CV</label>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={handleUploadInput}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  width: "100%",
                  padding: "28px 16px",
                  borderRadius: 14,
                  border: dragOver ? `1px dashed ${CL_GREEN}` : "1px dashed #2A2A2A",
                  background: "#141414",
                  cursor: "pointer",
                  display: "grid",
                  gap: 10,
                  placeItems: "center",
                  boxSizing: "border-box",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={CL_GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: 14, color: "#E5E5E5" }}>Drop your CV here or tap to browse</span>
                <span style={{ fontSize: 12, color: "#707070" }}>PDF or Word · max 5MB</span>
              </button>
              {uploadName ? (
                <div
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: "#1C1C1C",
                    border: "1px solid #2A2A2A",
                    fontSize: 13,
                    color: "#FFF",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={CL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {uploadName}
                </div>
              ) : null}
            </div>
          )}

          {selectedOption ? (
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div>
                <label style={clLabelStyle}>Full name</label>
                <input
                  ref={clRefFullName}
                  type="text"
                  value={clFullName}
                  onChange={(e) => {
                    setClFullName(e.target.value);
                    setClFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder="As it should appear on the letter"
                  style={{ ...clInputStyle, borderColor: clFieldErrors.fullName ? "#f87171" : "#2A2A2A" }}
                />
                {clFieldErrors.fullName ? (
                  <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{clFieldErrors.fullName}</div>
                ) : null}
              </div>
              <div>
                <label style={clLabelStyle}>Current or last job title</label>
                <input
                  ref={clRefCurrentJob}
                  type="text"
                  value={clCurrentJobTitle}
                  onChange={(e) => {
                    setClCurrentJobTitle(e.target.value);
                    setClFieldErrors((prev) => ({ ...prev, currentJobTitle: undefined }));
                  }}
                  placeholder='e.g. "Cashier", "Sales Associate"'
                  style={{ ...clInputStyle, borderColor: clFieldErrors.currentJobTitle ? "#f87171" : "#2A2A2A" }}
                />
                {clFieldErrors.currentJobTitle ? (
                  <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{clFieldErrors.currentJobTitle}</div>
                ) : null}
              </div>
              <div>
                <label style={clLabelStyle}>Years of experience</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CL_YEARS_EXPERIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setClYearsOfExperience(opt)}
                      style={{
                        background: clYearsOfExperience === opt ? "#D97706" : "#1C1C1C",
                        color: clYearsOfExperience === opt ? "#000" : "#fff",
                        fontWeight: clYearsOfExperience === opt ? 700 : 400,
                        border: clYearsOfExperience === opt ? "none" : "1px solid #333",
                        borderRadius: 20,
                        padding: "6px 14px",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={clLabelStyle}>Role you are applying for</label>
                <input
                  ref={clRefTargetRole}
                  type="text"
                  value={clTargetRole}
                  onChange={(e) => {
                    setClTargetRole(e.target.value);
                    setClFieldErrors((prev) => ({ ...prev, targetRole: undefined }));
                  }}
                  placeholder="Target job title"
                  style={{ ...clInputStyle, borderColor: clFieldErrors.targetRole ? "#f87171" : "#2A2A2A" }}
                />
                {clFieldErrors.targetRole ? (
                  <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{clFieldErrors.targetRole}</div>
                ) : null}
              </div>
              <div>
                <label style={clLabelStyle}>Key strength</label>
                <input
                  ref={clRefKeyStrength}
                  type="text"
                  value={clKeyStrength}
                  onChange={(e) => setClKeyStrength(e.target.value)}
                  placeholder='e.g. "customer service", "sales", "operations"'
                  style={clInputStyle}
                />
              </div>
              <div>
                <label style={clLabelStyle}>Company name (optional)</label>
                <input
                  ref={clRefCompany}
                  type="text"
                  value={clCompanyName}
                  onChange={(e) => setClCompanyName(e.target.value)}
                  placeholder="Leave blank to use “your company” in the draft"
                  style={clInputStyle}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!sourceReady}
            style={{
              width: "100%",
              marginTop: 24,
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background: sourceReady ? CL_GREEN : "#1C1C1C",
              color: sourceReady ? "#000000" : "#A0A0A0",
              fontSize: 15,
              fontWeight: 700,
              cursor: sourceReady ? "pointer" : "not-allowed",
              boxShadow: sourceReady ? "0 0 16px rgba(110,231,183,0.3)" : "none",
            }}
          >
            Generate My Cover Letter
          </button>
        </>
      )}

      {phase === "loading" && (
        <div style={{ textAlign: "center", paddingTop: 32 }}>
          <style>{`@keyframes cvpClPulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.55;transform:scale(1.15);} }`}</style>
          <CoverLetterSpinnerArrow size={56} />
          <div style={{ fontSize: 17, fontWeight: 600, color: "#FFF", marginTop: 20 }}>Crafting your letter</div>
          <div style={{ display: "grid", gap: 10, marginTop: 28, textAlign: "left" }}>
            {[
              { id: 1, label: "CV extracted", sub: "Reading your profile", done: true, pulse: false },
              { id: 2, label: "Matching to role", sub: "Aligning with job description", done: false, pulse: true },
              { id: 3, label: "Writing your letter", sub: "Drafting personalised copy", done: false, pulse: false },
            ].map((step) => (
              <div
                key={step.id}
                style={{
                  background: "#141414",
                  border: step.done ? `1px solid ${CL_GREEN}` : step.pulse ? `1px solid ${CL_GREEN}` : "1px solid #2A2A2A",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ width: 22, height: 22, flexShrink: 0, position: "relative" }}>
                  {step.done ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="10" fill={CL_GREEN} />
                      <path d="M8 12l2.5 2.5L16 9" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : step.pulse ? (
                    <>
                      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                        <circle cx="12" cy="12" r="9" stroke={CL_GREEN} strokeWidth="2" fill="none" />
                      </svg>
                      <span
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          width: 8,
                          height: 8,
                          marginLeft: -4,
                          marginTop: -4,
                          borderRadius: "50%",
                          background: CL_GREEN,
                          animation: "cvpClPulse 1.2s ease-in-out infinite",
                        }}
                      />
                    </>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="#444" strokeWidth="2" fill="none" />
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#FFF" }}>{step.label}</div>
                  <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2 }}>{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div style={{ marginTop: 8 }}>
          {genError ? (
            <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{genError}</div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Your cover letter</h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
                background: clFreePreview ? "#2A2A2A" : "#0D2B1F",
                color: clFreePreview ? "#A0A0A0" : CL_GREEN,
              }}
            >
              {clFreePreview ? "Preview" : "AI Generated"}
            </span>
          </div>
          <div style={{ position: "relative", background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 16, marginBottom: 16, overflow: "hidden" }}>
            {clPreviewParts ? (
              <>
                <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#E5E5E5" }}>
                  {clPreviewParts.header}
                  {"\n\n"}
                  {clPreviewParts.salutation}
                  {"\n\n"}
                  {clPreviewParts.firstPara}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#E5E5E5", filter: "blur(5px)", marginTop: 12 }}>
                  {clPreviewParts.restBody}
                  {clPreviewParts.restBody ? "\n\n" : ""}
                  {clPreviewParts.closing}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: "55%",
                    background: "linear-gradient(to bottom, rgba(20,20,20,0), #141414 55%, #141414)",
                    pointerEvents: "none",
                  }}
                />
              </>
            ) : (
              <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#E5E5E5" }}>{fullLetterDisplay}</div>
            )}
          </div>
          {clFreePreview ? (
            <>
              <div style={{ position: "relative", marginBottom: 12, width: "100%" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "15%",
                    right: "15%",
                    top: 15,
                    height: 1,
                    background: "#2A2A2A",
                    zIndex: 0,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 8, position: "relative", zIndex: 1 }}>
                  {[
                    { key: "ats", label: "ATS scan", sub: "done", done: true },
                    { key: "job", label: "Job match", sub: "done", done: true },
                    { key: "cl", label: "Cover letter", sub: "locked", locked: true },
                  ].map((step) => (
                    <div
                      key={step.key}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0 }}
                    >
                      {step.done ? (
                        <>
                          <div
                            className="cvp-ats-step-pop"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: "#378ADD",
                              display: "grid",
                              placeItems: "center",
                              zIndex: 1,
                            }}
                          >
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 9, fontWeight: 500, color: "#378ADD" }}>{step.label}</div>
                          <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>{step.sub}</div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: "#1C1C1C",
                              border: "1px solid #2A2A2A",
                              boxSizing: "border-box",
                              display: "grid",
                              placeItems: "center",
                              zIndex: 1,
                            }}
                          >
                            {step.locked ? (
                              <svg width={11} height={11} viewBox="0 0 11 11" aria-hidden>
                                <rect x="2" y="5" width="7" height="5" rx="1" fill="none" stroke="#A0A0A0" strokeWidth="1.2" />
                                <path d="M3.5 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="#A0A0A0" strokeWidth="1.2" />
                              </svg>
                            ) : null}
                          </div>
                          <div style={{ marginTop: 8, fontSize: 9, fontWeight: 500, color: "#A0A0A0" }}>{step.label}</div>
                          <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>{step.sub}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#A0A0A0", margin: "0 0 12px", lineHeight: 1.4 }}>
                One step from a complete application.
                <br />
                ATS cleared — now close it with a letter.
              </p>
              <div
                style={{
                  background: "linear-gradient(135deg, #0D1117, #0D2B1F)",
                  border: "1px solid #1a4a30",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: CL_GREEN,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#FFF" }}>Unlock full AI cover letter</div>
                  <div style={{ fontSize: 12, color: CL_GREEN, marginTop: 4, lineHeight: 1.4 }}>
                    Reveal the rest with a personalised Anthropic-powered letter for this role
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={clUnlocking}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleUnlockFullCoverLetter();
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: CL_GREEN,
                  color: "#000000",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: clUnlocking ? "wait" : "pointer",
                  opacity: clUnlocking ? 0.75 : 1,
                }}
              >
                {clUnlocking
                  ? "Unlocking…"
                  : getCoverLetterPricingMarket() === "India"
                    ? "Unlock full letter — ₹49"
                    : "Unlock full letter — AED 10"}
              </button>
              <p style={{ fontSize: 11, color: "#444", textAlign: "center", margin: "10px 0 0" }}>One-time payment. No subscription.</p>
            </div>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setPhase("entry");
              setLetterBody("");
              setClFreePreview(false);
              setClTemplateVariant(null);
              setGenError("");
              setClFieldErrors({});
            }}
            style={{
              marginTop: clFreePreview ? 12 : 16,
              width: "100%",
              padding: 12,
              border: "none",
              background: "transparent",
              color: "#505050",
              fontSize: 12,
              textAlign: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#A0A0A0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#505050";
            }}
          >
            Start over
          </button>
        </div>
      )}
      <FAB
        tabKey="cover-letter"
        coverLetterState={coverLetterFabState}
        coverLetterEmptyFieldLabels={coverLetterEmptyFieldLabels}
        coverLetterOnFocusFirstEmpty={focusFirstEmptyClField}
        coverLetterOnGenerate={handleGenerate}
        coverLetterOnDownload={handleCoverLetterPdfDownload}
        coverLetterOnRegenerate={handleGenerate}
      />
    </div>
  );
}

/**
 * Progress ladder UI lives above the paywall unlock card.
 * Steps: ATS (done) → Job match (done) → Cover letter (locked).
 * Unlock card and AED 10 CTA are unchanged.
 */
export default CoverLetterPage;
