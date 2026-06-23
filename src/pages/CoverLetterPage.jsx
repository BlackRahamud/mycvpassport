import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { generateCoverLetterFromTemplate } from "../coverLetterDataBank.generated";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import { loadUserResumes } from "../resumeDb";
import { getPaymentLink, hasFeatureAccess } from "../utils/paywall";
import { buildCoverLetterHtml } from "../serverLib/coverLetterHtml";
import { CoverLetterTemplate } from "../CoverLetterTemplate";
import skillSuggestions from "../data/skillSuggestions";
import { detectRole } from "../utils/detectRole";
import safeFetch from "../lib/net/safeFetch";
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
        @property --ats-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes ats-spin-border { to { --ats-angle: 360deg; } }
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
  const [isDesktopCL, setIsDesktopCL] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => setIsDesktopCL(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
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
  const [, setRetryCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [countdown, setCountdown] = useState(30);
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

  // Countdown auto-retry when error phase
  useEffect(() => {
    if (phase !== "error") return;
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-retry using saved payload
          setGenError("");
          const payload = lastClPayloadRef.current;
          if (payload) {
            const doAutoRetry = async (attempt = 0) => {
              setPhase("loading");
              const minWait = new Promise((r) => setTimeout(r, 5000));
              const apiCall = safeFetch("/api/ai?action=cover_letter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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
                setRetryCount(0);
              } catch (err) {
                console.error(err);
                if (attempt < 2) {
                  await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
                  return doAutoRetry(attempt + 1);
                }
                setGenError(err.message || "Generation failed.");
                setPhase("error");
              }
            };
            doAutoRetry(0);
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setIsDownloading(true);
    const companyResolved = clCompanyName.trim() || "your company";
    const roleKey = detectRole(clTargetRole || "");
    const pack = roleKey ? skillSuggestions[roleKey] : null;
    const html = buildCoverLetterHtml({
      clFullName,
      clCurrentJobTitle,
      clTargetRole,
      clCompanyName: companyResolved,
      fullLetterDisplay: fullText,
      resumeForApi,
      ghostKeywords: [
        ...(pack?.atsKeywords || [])
          .slice(0, 3)
          .map((s) => (typeof s === "string" ? s : s.keyword || "")),
        "Strategic Leadership",
        "Cross-functional Collaboration",
        "Stakeholder Management",
      ],
    });
    try {
      const res = await safeFetch(`${window.location.origin}/api/generate-pdf`, {
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
      setIsDownloading(false);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2000);
    } catch (e) {
      console.error(e);
      setIsDownloading(false);
      alert(e?.message || "Download failed.");
    }
  }, [fullLetterDisplay, resumeForApi, clFullName, clCurrentJobTitle, clTargetRole, clCompanyName]);

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
        const mammoth = (await import(/* webpackChunkName: "mammoth" */ "mammoth")).default;
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

    const attemptGeneration = async (attempt = 0) => {
      setPhase("loading");
      if (attempt === 0) {
        setLetterBody("");
        setClFreePreview(false);
        setClTemplateVariant(null);
      }
      const minWait = new Promise((r) => setTimeout(r, 5000));
      const apiCall = safeFetch("/api/ai?action=cover_letter", {
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
        setRetryCount(0);
      } catch (err) {
        console.error(err);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
          return attemptGeneration(attempt + 1);
        }
        setGenError(err.message || "Generation failed.");
        setPhase("error");
      } finally {
        userTriggeredRef.current = false;
      }
    };
    attemptGeneration(0);
  };

  const handleUnlockFullCoverLetter = async () => {
    if (!hasFeatureAccess(profile, 'coverLetter')) {
      const url = await getPaymentLink('coverLetter');
      if (url) window.location.href = url;
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
      const response = await safeFetch("/api/ai?action=cover_letter", {
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
        <div style={isDesktopCL ? { display: "grid", gridTemplateColumns: "40% 60%", gap: 32, marginTop: 8, maxWidth: 1120 } : {}}>
          <div>
          <h1 style={{ fontSize: isDesktopCL ? 32 : 22, fontWeight: isDesktopCL ? 800 : 700, marginTop: 8, marginBottom: 4, letterSpacing: isDesktopCL ? "-0.02em" : undefined }}>Cover Letter</h1>
          <p style={{ fontSize: isDesktopCL ? 14 : 15, color: isDesktopCL ? "#444" : "#A0A0A0", marginTop: 0, marginBottom: isDesktopCL ? 32 : 20 }}>How would you like to start?</p>
          {genError ? (
            <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{genError}</div>
          ) : null}

          <div style={{ display: "grid", gap: isDesktopCL ? 10 : 12 }}>
            {[
              {
                id: "saved",
                title: "Use my CVPassport CV",
                sub: "Pull from your saved profile",
                iconBg: "rgba(29,158,117,0.15)",
                iconColor: "#1D9E75",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                ),
              },
              {
                id: "upload",
                title: "Upload existing CV",
                sub: "PDF or Word \u2014 we\u2019ll read it for you",
                iconBg: "rgba(55,138,221,0.15)",
                iconColor: "#378ADD",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
                iconBg: "rgba(217,119,6,0.15)",
                iconColor: "#D97706",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ),
              },
            ].map((opt) => {
              const isActive = selectedOption === opt.id;
              const activeBorder = isDesktopCL ? opt.iconColor : CL_GREEN;
              return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id)}
                style={{
                  display: "flex",
                  alignItems: isDesktopCL ? "center" : "flex-start",
                  gap: 14,
                  textAlign: "left",
                  padding: isDesktopCL ? "16px 20px" : 16,
                  borderRadius: 14,
                  border: isActive ? ("1px solid " + activeBorder) : ("1px solid " + (isDesktopCL ? "#1a1a1a" : "#2A2A2A")),
                  background: isActive && isDesktopCL ? (opt.iconColor + "0D") : (isDesktopCL ? "#0e0e0e" : "#141414"),
                  color: "#FFF",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  transition: "border-color 150ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1)",
                }}
                onMouseEnter={(e) => { if (isDesktopCL && !isActive) { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                onMouseLeave={(e) => { if (isDesktopCL && !isActive) { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.transform = "translateY(0)"; } }}
              >
                {isDesktopCL ? (
                  <span style={{ width: 36, height: 36, borderRadius: "50%", background: opt.iconBg, color: opt.iconColor, display: "grid", placeItems: "center", flexShrink: 0 }}>{opt.icon}</span>
                ) : (
                  <span style={{ color: CL_GREEN, flexShrink: 0, marginTop: 2 }}>{opt.icon}</span>
                )}
                <span>
                  <span style={{ display: "block", fontSize: isDesktopCL ? 13 : 15, fontWeight: 600 }}>{opt.title}</span>
                  <span style={{ display: "block", fontSize: isDesktopCL ? 11 : 13, color: "#444", marginTop: 2 }}>{opt.sub}</span>
                </span>
              </button>
              );
            })}
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
              marginTop: isDesktopCL ? 16 : 24,
              padding: isDesktopCL ? 14 : "14px 18px",
              borderRadius: isDesktopCL ? 10 : 12,
              border: "none",
              background: sourceReady ? (isDesktopCL ? "#fff" : CL_GREEN) : "#141414",
              color: sourceReady ? "#000000" : (isDesktopCL ? "#333" : "#A0A0A0"),
              fontSize: 14,
              fontWeight: 700,
              cursor: sourceReady ? "pointer" : "default",
              boxShadow: sourceReady && !isDesktopCL ? "0 0 16px rgba(110,231,183,0.3)" : "none",
            }}
          >
            Generate My Cover Letter
          </button>
          </div>
          {isDesktopCL && (
            <div style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 16, padding: 28, minHeight: 400, display: "flex", flexDirection: "column" }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: 24, flex: 1, position: "relative", overflow: "hidden", color: "#222", fontSize: 13, lineHeight: 1.7, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111", marginBottom: 4 }}>[Name] | email@example.com | Phone | Dubai, UAE</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>{getTodayDateLabelCL()}</div>
                <div style={{ fontSize: 13, color: "#333", marginBottom: 16 }}>Dear Hiring Manager,</div>
                {[85, 100, 70].map((w, i) => (
                  <div key={"a" + i} style={{ height: 10, borderRadius: 4, background: "#e5e5e5", marginBottom: 8, width: w + "%" }} />
                ))}
                <div style={{ height: 16 }} />
                {[100, 90, 95, 80].map((w, i) => (
                  <div key={"b" + i} style={{ height: 10, borderRadius: 4, background: "#e5e5e5", marginBottom: 8, width: w + "%" }} />
                ))}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", background: "linear-gradient(to bottom, transparent, #0e0e0e)", pointerEvents: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#D97706" }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden><rect x="2" y="5" width="7" height="5" rx="1" fill="none" stroke="#D97706" strokeWidth="1.2" /><path d="M3.5 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="#D97706" strokeWidth="1.2" /></svg>
                  {getCoverLetterPricingMarket() === "India" ? "Unlock full letter \u2014 \u20B949" : "Unlock full letter \u2014 AED 10"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>One-time payment. No subscription.</div>
            </div>
          )}
        </div>
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

      {phase === "error" && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "40px 24px",
          textAlign: "center",
        }}>
          {/* Countdown ring */}
          <div style={{ position: "relative", width: 130, height: 130, marginBottom: 32 }}>
            <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="65" cy="65" r="50" fill="none" stroke="#1C1C1C" strokeWidth="4" />
              <circle
                cx="65" cy="65" r="50" fill="none"
                stroke={countdown <= 10 ? "#22C55E" : "#D97706"}
                strokeWidth="4"
                strokeDasharray="314"
                strokeDashoffset={314 * (countdown / 30)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
                {countdown > 0 ? countdown : "\u2713"}
              </span>
              <span style={{ color: "#555", fontSize: 10, letterSpacing: 1, marginTop: 2 }}>
                {countdown > 0 ? "seconds" : ""}
              </span>
            </div>
          </div>

          {/* Status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, background: "#D97706", borderRadius: "50%" }} />
            <span style={{ color: "#D97706", fontSize: 11, letterSpacing: "1.5px", fontWeight: 500 }}>HIGH DEMAND</span>
            <div style={{ width: 6, height: 6, background: "#D97706", borderRadius: "50%" }} />
          </div>

          {/* Message */}
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.4, maxWidth: 340 }}>
            {countdown > 0
              ? "Anthropic AI is crafting thousands of cover letters right now"
              : "Retrying now..."}
          </h2>
          <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7, margin: "0 0 8px", maxWidth: 340 }}>
            {countdown > 0
              ? `Due to peak US timezone demand, our AI queue is full. Your details are saved \u2014 auto-retrying in ${countdown} seconds.`
              : "Connecting to Claude AI \u2014 your letter is being generated."}
          </p>
          <p style={{ color: "#333", fontSize: 12, margin: "0 0 28px" }}>
            No action needed. Just wait here.
          </p>

          {/* Auto retry info card */}
          <div style={{
            background: "#141414", border: "1px solid #2A2A2A",
            borderRadius: 12, padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 24, maxWidth: 320, width: "100%",
          }}>
            <div style={{ width: 8, height: 8, background: "#D97706", borderRadius: "50%", flexShrink: 0 }} />
            <span style={{ color: "#666", fontSize: 12, textAlign: "left" }}>
              Auto-retrying when timer ends. You don{"'"}t need to do anything.
            </span>
          </div>

          {/* Back button */}
          <button
            type="button"
            onClick={() => { setPhase("entry"); setGenError(""); }}
            style={{
              background: "transparent", color: "#555",
              border: "none", fontSize: 13, cursor: "pointer",
              padding: "8px 0",
            }}
          >
            {"\u2190"} Go back and edit details
          </button>

          <p style={{ color: "#2A2A2A", fontSize: 11, letterSpacing: "0.5px", marginTop: 24 }}>
            Powered by Anthropic Claude 4.5
          </p>
        </div>
      )}

      {phase === "result" && (
        <div style={{ marginTop: 8 }}>
          {clFreePreview ? (
            <>
              {/* --- FREE PREVIEW: blurred letter + paywall (untouched) --- */}
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
                    background: "#2A2A2A",
                    color: "#A0A0A0",
                  }}
                >
                  Preview
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
                ) : null}
              </div>
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
              <div style={{ position: "relative", borderRadius: 16 }}>
                <div aria-hidden style={{
                  position: "absolute", inset: 0, borderRadius: 16, padding: 1,
                  background: "conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.5) 80%, transparent 100%)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  pointerEvents: "none",
                  animation: "ats-spin-border 3s linear infinite",
                }} />
                <div style={{ background: "#0A0A0A", borderRadius: 16, padding: 16, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "#0A0A0A",
                        border: "1px solid rgba(255,255,255,0.12)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>Unlock full AI cover letter</div>
                      <div style={{ fontSize: 12, color: "#444", marginTop: 4, lineHeight: 1.4 }}>
                        Reveal the rest with a personalised Anthropic-powered letter for this role
                      </div>
                    </div>
                  </div>
                  <div style={{ position: "relative", borderRadius: 12 }}>
                    <div aria-hidden style={{
                      position: "absolute", inset: 0, borderRadius: 12, padding: 1.5,
                      background: "conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.6) 80%, transparent 100%)",
                      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      pointerEvents: "none",
                      animation: "ats-spin-border 2s linear infinite",
                    }} />
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
                        background: "#0A0A0A",
                        color: "#fff",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: clUnlocking ? "wait" : "pointer",
                        opacity: clUnlocking ? 0.75 : 1,
                        position: "relative",
                      }}
                    >
                      {clUnlocking
                        ? "Unlocking…"
                        : getCoverLetterPricingMarket() === "India"
                          ? "Unlock full letter — ₹49"
                          : "Unlock full letter — AED 10"}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "#444", textAlign: "center", margin: "10px 0 0" }}>One-time payment. No subscription.</p>
                </div>
              </div>
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
                  marginTop: 12,
                  width: "100%",
                  padding: 12,
                  border: "none",
                  background: "transparent",
                  color: "#505050",
                  fontSize: 12,
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#505050"; }}
              >
                Start over
              </button>
            </>
          ) : (
            <>
              {/* --- STUDIO VIEW: paid/generated letter --- */}
              {/* Animated background paths */}
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 0 }}>
                <svg
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
                  viewBox="0 0 600 800"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M0 200 Q150 100 300 250 T600 200" fill="none" stroke="#1D9E75" strokeWidth="1" strokeDasharray="1000" style={{ animation: "cvpPathFlow 8s linear infinite" }} />
                  <path d="M0 400 Q200 300 400 450 T600 400" fill="none" stroke="#D97706" strokeWidth="1" strokeDasharray="1000" style={{ animation: "cvpPathFlow 10s linear infinite 2s" }} />
                  <path d="M0 600 Q250 500 350 650 T600 550" fill="none" stroke="#378ADD" strokeWidth="1" strokeDasharray="1000" style={{ animation: "cvpPathFlow 12s linear infinite 4s" }} />
                </svg>

                {/* Sticky action bar */}
                <div style={{
                  position: "sticky",
                  top: 56,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  background: "rgba(10,10,10,0.85)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderBottom: "1px solid #2A2A2A",
                  borderRadius: "12px 12px 0 0",
                  flexWrap: "wrap",
                  gap: 8,
                }}>
                  {/* Left: Edit Details */}
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
                      background: "transparent",
                      border: "1px solid #2A2A2A",
                      borderRadius: 8,
                      color: "#A0A0A0",
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "6px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{"\u2190"}</span> Edit Details
                  </button>
                  {/* Center: status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#D97706",
                      display: "inline-block",
                      animation: "cvpPulseDot 2s ease-in-out infinite",
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#A0A0A0", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Cover Letter Ready
                    </span>
                  </div>
                  {/* Right: Download pill */}
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={handleCoverLetterPdfDownload}
                    style={{
                      background: downloadDone ? "#141414" : "#FFFFFF",
                      border: downloadDone ? "1px solid rgba(34,197,94,0.3)" : "none",
                      borderRadius: 999,
                      color: downloadDone ? "#4ADE80" : "#000000",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "8px 16px",
                      cursor: isDownloading ? "wait" : "pointer",
                      opacity: isDownloading ? 0.75 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isDownloading ? (
                      <>
                        <div style={{ width: 16, height: 16, border: "2px solid #999", borderTop: "2px solid transparent", borderRadius: "50%", animation: "cvpClSpin 0.7s linear infinite" }} />
                        Generating PDF...
                      </>
                    ) : downloadDone ? (
                      <>{"\u2713"} Downloaded!</>
                    ) : (
                      <><span style={{ fontSize: 14 }}>{"\u2193"}</span> Download Your Professional Letter</>
                    )}
                  </button>
                </div>

                {/* Green success pill */}
                <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 8px", position: "relative", zIndex: 1 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 14px",
                    borderRadius: 999,
                    background: "#0D2B1F",
                    color: CL_GREEN,
                    border: "1px solid #1a4a30",
                  }}>
                    AI Generated
                  </span>
                </div>

                {/* Three-column layout: left panel + center content + right panel */}
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 32,
                  padding: "16px 0 40px",
                  position: "relative",
                  zIndex: 1,
                }}>
                  {/* Left Panel */}
                  <div className="cvp-cl-side-panel" style={{ width: 200, opacity: 0.85, paddingTop: 8, flexShrink: 0 }}>
                    <div style={{ color: "#555", fontSize: 10, letterSpacing: 1, marginBottom: 16, fontWeight: 600 }}>PREMIUM FEATURES ACTIVE</div>
                    {[
                      { label: "ATS-Ready", desc: "Invisible GhostChips injected for role-matching" },
                      { label: "Gulf-Standard", desc: "Tone optimized for Dubai & Riyadh recruiters" },
                      { label: "A4 Optimized", desc: "Precision mm-spacing for professional printing" },
                      { label: "Anthropic Powered", desc: "Built on Haiku 4.5, Anthropic\u2019s latest architecture" },
                    ].map((item) => (
                      <div key={item.label} style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <div style={{ color: "#ccc", fontSize: 12, fontWeight: 500 }}>{item.label}</div>
                          <div style={{ color: "#555", fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Center: A4 card */}
                  <div style={{
                    transform: "scale(0.75)",
                    transformOrigin: "top center",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  }}>
                    <CoverLetterTemplate
                      clFullName={clFullName}
                      clCurrentJobTitle={clCurrentJobTitle}
                      clTargetRole={clTargetRole}
                      clCompanyName={clCompanyName.trim() || "your company"}
                      fullLetterDisplay={fullLetterDisplay}
                      resumeForApi={resumeForApi}
                      clTemplateVariant={clTemplateVariant}
                    />
                  </div>

                  {/* Right Panel */}
                  <div className="cvp-cl-side-panel" style={{ width: 200, opacity: 0.85, paddingTop: 8, flexShrink: 0 }}>
                    <div style={{ color: "#555", fontSize: 10, letterSpacing: 1, marginBottom: 16, fontWeight: 600 }}>{"WHAT\u2019S NEXT?"}</div>
                    <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 16 }}>
                      <div style={{ color: "#ccc", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Build a matching CV</div>
                      <div style={{ color: "#555", fontSize: 11, lineHeight: 1.4, marginBottom: 10 }}>Use the same professional style for your full application package.</div>
                      <button
                        type="button"
                        onClick={() => { window.location.href = "/builder"; }}
                        style={{ background: "transparent", border: "1px solid #2A2A2A", borderRadius: 8, color: "#A0A0A0", fontSize: 11, fontWeight: 500, padding: "6px 12px", cursor: "pointer", width: "100%" }}
                      >
                        {"Go to CV Builder \u2192"}
                      </button>
                    </div>
                    <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 16, marginTop: 12 }}>
                      <div style={{ color: "#ccc", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Check ATS Score</div>
                      <div style={{ color: "#555", fontSize: 11, lineHeight: 1.4, marginBottom: 10 }}>See how your CV ranks against this job description.</div>
                      <button
                        type="button"
                        onClick={() => { window.location.href = "/builder?tab=ats"; }}
                        style={{ background: "transparent", border: "1px solid #2A2A2A", borderRadius: 8, color: "#A0A0A0", fontSize: 11, fontWeight: 500, padding: "6px 12px", cursor: "pointer", width: "100%" }}
                      >
                        {"Run ATS Check \u2192"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit My Details ghost pill */}
                <div style={{ display: "flex", justifyContent: "center", paddingBottom: 24, position: "relative", zIndex: 1 }}>
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
                      background: "transparent",
                      border: "1px solid #2A2A2A",
                      borderRadius: 999,
                      color: "#A0A0A0",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "10px 24px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#505050"; e.currentTarget.style.color = "#FFF"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#A0A0A0"; }}
                  >
                    Edit My Details
                  </button>
                </div>

                {/* AI Trust Statement */}
                <div style={{ display: "flex", justifyContent: "center", paddingBottom: 32, position: "relative", zIndex: 1 }}>
                  <p style={{
                    color: "#666",
                    fontSize: "11px",
                    textAlign: "center",
                    marginTop: "40px",
                    maxWidth: "400px",
                    lineHeight: 1.5,
                    letterSpacing: "0.03em",
                  }}>
                    Engineered by Claude 4.5 (Anthropic). Optimized for the Gulf{"'"}s competitive recruitment landscape.
                  </p>
                </div>
              </div>
            </>
          )}
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
