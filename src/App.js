import { Analytics } from "@vercel/analytics/react";
import HowItWorks from "./HowItWorks";
import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { supabase as supabaseImport } from "./supabaseClient";
import { mapAuthError, trimAuthFields } from "./authUtils";
import mammoth from "mammoth";
import ATSChecker from "./ATSChecker";
import JobMatch from "./JobMatch";
import CoverLetterModal from "./CoverLetterModal";
import { generateCoverLetterFromTemplate } from "./coverLetterDataBank.generated";
import UpgradeModal from "./UpgradeModal";
import TiltedCard from './components/TiltedCard';
import { PreviewModernEmerald } from "./Template1ModernEmerald";
import { PreviewTwoCol } from "./Template2DubaiModern";
import { PreviewSidebar } from "./Template3ArabiaPro";
import { PreviewTimeline } from "./Template4ExecutiveGold";
// eslint-disable-next-line no-unused-vars
import {
  // eslint-disable-next-line no-unused-vars
  splitExperiencePointsForPreview,
} from "./experiencePointsPreview";
// eslint-disable-next-line no-unused-vars
import { resumePageRootBoxStyle } from "./resumePageRootBoxStyle";
import { PreviewGulfExecutive } from "./Template5GulfExecutive";
import { PreviewBankingFinance } from "./Template6BankingFinance";
import { PreviewCompactPro } from "./Template7CompactPro";
import { PreviewCreativeSidebar } from "./Template8CreativeSidebar";
import { PreviewHospitality } from "./Template9Hospitality";
import { PreviewATSInternational } from "./Template10ATSInternational";
import { PreviewTechITPro } from "./Template11TechITPro";
import { Template12Split } from "./Template12Split";
import { PreviewFinance } from "./Template13Finance";
import { Template14 } from "./Template14";
import Pricing from "./Pricing";
import LandingPage from './LandingPage';
import WalkInMode from './WalkInMode';
import Dashboard from './Dashboard';
import AdminPanel from "./AdminPanel";
import { FAB } from "./components/FAB";
import { writeFabMemory, ANON_DOWNLOADS_KEY } from "./components/FAB/FABLogic";
// Mobile bottom tab bar icons (used when on ATS / Walk-In so nav is always visible)
function TabIconDoc({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}
function TabIconTarget({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TabIconBolt({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function TabIconUser({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function TabIconCoverLetter({ active }) {
  const stroke = active ? "#FFFFFF" : "#555";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
      <path d="M8 13h4" />
      <path d="M8 17h8" />
    </svg>
  );
}
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

function isCoverLetterPaidUnlock() {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("cvp_cl_full_unlocked") === "1";
  } catch {
    return false;
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

function CoverLetterSpinnerArrow({ size = 48 }) {
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

function CoverLetterPage({ user, onBack }) {
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
  const clRefFullName = useRef(null);
  const clRefCurrentJob = useRef(null);
  const clRefYears = useRef(null);
  const clRefTargetRole = useRef(null);
  const clRefKeyStrength = useRef(null);
  const clRefCompany = useRef(null);

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
    const paid = isCoverLetterPaidUnlock();
    if (phase === "result" && letterBody && !paid && clFreePreview) return "paywall";
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

    const paid = isCoverLetterPaidUnlock();

    if (!paid) {
      setLetterBody(templateBody);
      setClTemplateVariant(market === "India" ? "india" : "uae");
      setClFreePreview(true);
      setPhase("result");
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
    }
  };

  const handleUnlockFullCoverLetter = async () => {
    const payload = lastClPayloadRef.current;
    if (!payload) {
      alert("Generate a letter first.");
      return;
    }
    setClUnlocking(true);
    setGenError("");
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem("cvp_cl_full_unlocked", "1");
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
      if (typeof localStorage !== "undefined") localStorage.removeItem("cvp_cl_full_unlocked");
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
              <label style={{ fontSize: 13, color: "#A0A0A0", display: "block", marginBottom: 8 }}>Your CV</label>
              <select
                value={selectedCvId}
                onChange={(e) => setSelectedCvId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #2A2A2A",
                  background: "#0A0A0A",
                  color: "#FFF",
                  fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {savedList.length === 0 ? (
                  <option value="">No saved CVs yet</option>
                ) : (
                  savedList.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.title || r?.cv_data?.name || "My CV"}
                    </option>
                  ))
                )}
              </select>
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
                <select
                  ref={clRefYears}
                  value={clYearsOfExperience}
                  onChange={(e) => setClYearsOfExperience(e.target.value)}
                  style={{ ...clInputStyle, cursor: "pointer" }}
                >
                  {CL_YEARS_EXPERIENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
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
                onClick={handleUnlockFullCoverLetter}
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
              marginTop: 16,
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #2A2A2A",
              background: "transparent",
              color: "#A0A0A0",
              fontSize: 14,
              cursor: "pointer",
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
function MobileTabBar({ currentPath, onNavigate, user, fabGuideTab }) {
  if (!user) return null;
  const clean = currentPath.replace(/\/$/, "") || "/";
  const show = ["/dashboard", "/ats", "/cover-letter", "/walk-in", "/builder"].includes(clean);
  if (!show) return null;
  const tabs = [
    { id: "/dashboard", label: "My CVs", Icon: TabIconDoc },
    { id: "/ats", label: "ATS", Icon: TabIconTarget },
    { id: "/cover-letter", label: "Cover Letter", Icon: TabIconCoverLetter },
    { id: "/walk-in", label: "Walk-In", Icon: TabIconBolt },
    { id: "/dashboard", label: "Account", Icon: TabIconUser, account: true },
  ];
  return (
    <div
      className="cvp-mobile-tabbar"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 64,
        background: "rgba(10,10,10,0.96)",
        borderTop: "1px solid #1E1E1E",
        display: "none",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        alignItems: "stretch",
        padding: "6px 4px 12px",
        backdropFilter: "blur(10px)",
        zIndex: 50,
        maxWidth: "100vw",
        boxSizing: "border-box",
      }}
    >
      {tabs.map((t, idx) => {
        const active = t.account
          ? clean === "/dashboard" && fabGuideTab === "account"
          : t.label === "My CVs"
            ? (clean === "/dashboard" || clean === "/builder") && fabGuideTab !== "account"
            : clean === t.id;
        return (
          <button
            key={`${t.label}-${idx}`}
            type="button"
            onClick={() => {
              if (t.account) onNavigate("/dashboard", { state: { fabGuideTab: "account" } });
              else if (t.label === "My CVs") onNavigate("/dashboard", { state: {} });
              else onNavigate(t.id);
            }}
            className="cvp-mobile-tabbar-btn"
            style={{
              background: "transparent",
              border: "none",
              color: active ? "#FFFFFF" : "#555",
              display: "grid",
              justifyItems: "center",
              gap: 4,
              cursor: "pointer",
              padding: "4px 2px",
              minHeight: 52,
              alignContent: "center",
            }}
          >
            <t.Icon active={active} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#FFFFFF" : "#555", lineHeight: 1.15, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Skip Supabase usage during react-snap prerender
const isPrerender = typeof navigator !== 'undefined' && navigator.userAgent.includes('ReactSnap');
const supabase = isPrerender ? null : supabaseImport;

// ─── TEMPLATES ───────────────────────────────────────────────────
const TEMPLATES = [
  { id: 1,  name: "Modern Emerald",      tier: "free",    color: "#1a1a2e", accent: "#e94560", desc: "Bold banner header",              layout: "banner"      },
  { id: 2,  name: "Dubai Modern",         tier: "free",    color: "#0f3460", accent: "#00b4d8", desc: "Two-column split",                layout: "twocol"      },
  { id: 3,  name: "Arabia Pro",           tier: "free",    color: "#1a1a2e", accent: "#1B3A6B", desc: "Sidebar with skills column",      layout: "sidebar"     },
  { id: 4,  name: "Executive Gold",       tier: "premium", color: "#1a0a00", accent: "#d4a017", desc: "Timeline experience style",       layout: "timeline"    },
  { id: 5,  name: "Gulf Executive",       tier: "premium", color: "#0D1B2A", accent: "#C9A84C", desc: "Dark navy with gold accents",     layout: "gulf-exec"   },
  { id: 6,  name: "Banking & Finance",    tier: "premium", color: "#000000", accent: "#000000", desc: "Ultra-clean ATS-first serif",     layout: "banking"     },
  { id: 7,  name: "Compact Pro",          tier: "premium", color: "#14213D", accent: "#0D7377", desc: "Dense teal layout, max content",  layout: "compact-pro" },
  { id: 8,  name: "Creative Sidebar",     tier: "premium", color: "#2D2D2D", accent: "#E8533F", desc: "Coral sidebar for Sales/RE",      layout: "creative"    },
  { id: 9,  name: "Hospitality & Service",tier: "premium", color: "#6B4C3B", accent: "#6B4C3B", desc: "Warm tone for hotels & F&B",      layout: "hospitality" },
  { id: 10, name: "ATS International",    tier: "premium", color: "#000000", accent: "#333333", desc: "Pure ATS — zero colour, max score",layout: "ats-intl"   },
  { id: 11, name: "Tech & IT Pro",        tier: "premium", color: "#1E2D45", accent: "#4A90D9", desc: "Dark slate sidebar for tech roles",layout: "tech-it"    },
  { id: 12, name: "Flat Split",           tier: "premium", color: "#F5E6E0", accent: "#000000", desc: "Flat split layout · beige header, grey sidebar", layout: "flat-split" },
  { id: 13, name: "Finance",              tier: "premium", color: "#000000", accent: "#000000", desc: "Dense finance & accounting · UAE banking",    layout: "finance", tags: ["ATS Friendly", "Popular in UAE", "Banking & Finance"] },
  { id: 14, name: "Figma Mirror",         tier: "premium", color: "#1e293b", accent: "#60a5fa", desc: "2-page Figma mirror · 595×842px",           layout: "figma-mirror", tags: ["2 Pages", "Figma Export"] },
];

/** Filter keys → TEMPLATES[].id (numeric ids 1–14 are the canonical template IDs in this app). */
const TEMPLATE_FILTER_IDS = {
  popular: [1, 2, 3, 4, 5],
  simple: [1, 2, 3, 6, 7],
  modern: [4, 5, 8, 9, 10],
  creative: [11, 12, 13, 14],
};

const DUMMY_RESUME = {
  name: "Ahmed Al Mansouri",
  title: "Senior Sales Executive",
  email: "ahmed.mansouri@email.com",
  phone: "+971 50 456 7890",
  location: "Dubai, UAE",
  summary: "Results-driven sales professional with 6 years of experience in UAE retail and banking sectors. Proven track record of exceeding targets.",
  nationality: "UAE National",
  visaStatus: "Citizen",
  dob: "15 March 1990",
  gender: "Male",
  maritalStatus: "Married",
  experience: [
    { company: "Emirates NBD", role: "Relationship Officer", location: "Dubai, UAE", period: "2021 – Present", points: "Managed portfolio of 200+ HNW clients\nAchieved 140% of annual sales target\nOnboarded AED 45M in new deposits" },
    { company: "Mashreq Bank", role: "Personal Banking Advisor", location: "Dubai, UAE", period: "2018 – 2021", points: "Cross-sold investment and insurance products\nRanked top 5% nationally for customer satisfaction\nTrained 8 new joiners on CRM systems" }
  ],
  education: [{ school: "University of Dubai", degree: "Bachelor of Business Administration", year: "2018" }],
  skills: "Sales, Relationship Management, CRM, KYC/AML, Arabic, English, MS Office, Negotiation",
  languages: "Arabic (Native), English (Fluent)",
  certifications: [
    { name: "Certified Banking Professional (CBP)", issuer: "", year: "" },
    { name: "UAE Central Bank AML Certificate", issuer: "", year: "" },
  ],
  availability: "Immediately Available",
  willingToRelocate: "Yes",
  drivingLicense: "UAE Driving License"
};

const EMPTY_EXP = {
  company: "",
  role: "",
  location: "",
  period: "",
  points: "",
  startDate: "",
  endDate: "",
  present: false,
};

const EMPTY_EDU = {
  school: "",
  degree: "",
  year: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  location: "",
};

const EMPTY_CERT = {
  name: "",
  issuer: "",
  year: "",
};

const EMPTY_RESUME = {
  // Personal
  name: "", email: "", phone: "", location: "Dubai, UAE",
  title: "", summary: "",
  // Gulf-specific personal
  nationality: "", visaStatus: "", dob: "", gender: "", maritalStatus: "",
  // Experience (templates use company, role, location, period, points)
  experience: [],
  // Education
  education: [],
  // Skills & extras (skills/languages stay comma strings for T1–T13)
  skills: "", languages: "English, Hindi",
  certifications: [],
  technicalSkills: "",
  projects: "",
  volunteerWork: "",
  publications: "",
  /** Optional accordion sections user chose to show */
  builderExtraSectionIds: [],
  // Additional
  availability: "Immediately Available",
  drivingLicense: "",
  willingToRelocate: "Yes",
  references: "References available upon request",
};

const OPTIONAL_BUILDER_SECTIONS = [
  { id: "certifications", label: "Certifications", field: "certifications", multiline: false },
  { id: "projects", label: "Projects", field: "projects", multiline: true },
  { id: "volunteer", label: "Volunteer Work", field: "volunteerWork", multiline: true },
  { id: "publications", label: "Publications", field: "publications", multiline: true },
];

function normalizeCertificationsArray(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { ...EMPTY_CERT, name: n } : null;
        }
        return {
          ...EMPTY_CERT,
          name: String(c.name || "").trim(),
          issuer: String(c.issuer || "").trim(),
          year: String(c.year || "").trim(),
        };
      })
      .filter((c) => c && c.name);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s) => ({ ...EMPTY_CERT, name: s.trim() })).filter((c) => c.name);
  }
  return [];
}

/** One line per cert for templates that split by comma */
function formatCertificationLine(c) {
  if (!c || !c.name) return "";
  const n = c.name.replace(/,/g, " ");
  let s = n;
  if (c.issuer) s += ` — ${String(c.issuer).replace(/,/g, " ")}`;
  if (c.year) s += ` (${c.year})`;
  return s;
}

function certificationsToCommaString(arr) {
  return normalizeCertificationsArray(arr).map(formatCertificationLine).filter(Boolean).join(", ");
}

function cvWithTemplateCertifications(cv) {
  if (!cv || typeof cv !== "object") return cv;
  return {
    ...cv,
    certifications: certificationsToCommaString(cv.certifications),
  };
}

function normalizeResumeForBuilder(cv) {
  if (!cv || typeof cv !== "object") return { ...EMPTY_RESUME };
  const exp = Array.isArray(cv.experience) ? cv.experience : [];
  const edu = Array.isArray(cv.education) ? cv.education : [];
  return {
    ...EMPTY_RESUME,
    ...cv,
    experience: exp.length ? exp.map((e) => ({ ...EMPTY_EXP, ...e })) : [],
    education: edu.length ? edu.map((e) => ({ ...EMPTY_EDU, ...e })) : [],
    certifications: normalizeCertificationsArray(cv.certifications),
    builderExtraSectionIds: Array.isArray(cv.builderExtraSectionIds) ? cv.builderExtraSectionIds : [],
    projects: cv.projects ?? "",
    volunteerWork: cv.volunteerWork ?? "",
    publications: cv.publications ?? "",
  };
}

function splitCommaItems(str) {
  if (!str || typeof str !== "string") return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildExperiencePeriod(e) {
  if (e.startDate || e.endDate || e.present) {
    const end = e.present ? "Present" : (e.endDate || "").trim();
    const start = (e.startDate || "").trim();
    if (start && end) return `${start} – ${end}`;
    if (start) return e.present ? `${start} – Present` : start;
    if (end) return end;
    if (e.present) return "Present";
  }
  return (e.period || "").trim();
}

function buildEducationYearLine(e) {
  if (e.startDate || e.endDate) {
    const a = (e.startDate || "").trim();
    const b = (e.endDate || "").trim();
    if (a && b) return `${a} – ${b}`;
    return a || b || (e.year || "").trim();
  }
  return (e.year || "").trim();
}

const CB_UI = {
  btn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#FFFFFF",
    color: "#000000",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    color: "#FFFFFF",
    padding: "10px 12px",
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  },
  card: {
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#2A2A2A",
    color: "#FFFFFF",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 13,
  },
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  bg: "#0a0a0f", surface: "#12121a", card: "#1a1a26", border: "#2a2a3a",
  accent: "#FFFFFF", gold: "#f59e0b", text: "#f0f0ff", muted: "#8888aa",
  success: "#10b981", danger: "#ef4444",
};

const S = {
  app: { minHeight: "100vh", width: "100%", overflowX: "hidden", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
    background: "rgba(10,10,15,0.95)", position: "sticky", top: 0, zIndex: 100,
    backdropFilter: "blur(10px)",
  },
  logo: {
    fontSize: "22px", fontWeight: "800", cursor: "pointer",
    color: "#FFFFFF",
  },
  btn: (v = "primary", sz = "md") => ({
    padding: sz === "lg" ? "14px 32px" : sz === "sm" ? "8px 16px" : "10px 22px",
    borderRadius: "10px", cursor: "pointer", fontWeight: "600",
    fontSize: sz === "lg" ? "16px" : sz === "sm" ? "13px" : "14px",
    transition: "background-color 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1), border-color 150ms cubic-bezier(0.4,0,0.2,1)",
    background: v === "primary" ? C.accent
      : v === "gold" ? `linear-gradient(135deg,${C.gold},#f97316)`
      : v === "outline" ? "transparent"
      : v === "danger" ? C.danger
      : v === "success" ? C.success : C.surface,
    color: v === "primary" ? "#000" : v === "outline" ? C.accent : "#fff",
    border: v === "outline" ? `1px solid ${C.accent}` : "none",
    boxShadow: "none",
  }),
  input: {
    width: "100%", padding: "12px 16px", background: C.card,
    border: `1px solid ${C.border}`, borderRadius: "10px",
    color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "12px 16px", background: C.card,
    border: `1px solid ${C.border}`, borderRadius: "10px",
    color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box",
    cursor: "pointer",
  },
  label: { display: "block", fontSize: "13px", color: C.muted, marginBottom: "6px", fontWeight: "500" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" },
  badge: (type = "free") => ({
    display: "inline-block", padding: "3px 10px", borderRadius: "20px",
    fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px",
    background: type === "free" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
    color: type === "free" ? C.success : C.gold,
    border: `1px solid ${type === "free" ? C.success : C.gold}`,
  }),
  sectionHeading: {
    fontSize: "13px", fontWeight: "700", color: C.muted,
    textTransform: "uppercase", letterSpacing: "1px",
    paddingBottom: "10px", borderBottom: `1px solid ${C.border}`,
    marginBottom: "16px", marginTop: "8px",
  },
};

// ─── SUPABASE RESUME OPERATIONS ──────────────────────────────────
async function saveResume(userId, resume, templateId, existingId = null) {
  if (!supabase) return null;
  const payload = {
    user_id: userId,
    title: resume.name ? `${resume.name} — ${resume.title || "Resume"}` : "My Resume",
    template_id: templateId,
    cv_data: resume,
    updated_at: new Date().toISOString(),
  };
  if (existingId) {
    const { data, error } = await supabase.from("cvs").update(payload).eq("id", existingId).eq("user_id", userId).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from("cvs").insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}

async function loadUserResumes(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("cvs").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function deleteResume(resumeId, userId) {
  if (!supabase) return;
  const { error } = await supabase.from("cvs").delete().eq("id", resumeId).eq("user_id", userId);
  if (error) throw error;
}

// ─── SHARED PREVIEW SUB-COMPONENTS ───────────────────────────────
// eslint-disable-next-line no-unused-vars
function Section({ title, accent, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.5px", color: accent, textTransform: "uppercase", fontFamily: "sans-serif" }}>{title}</span>
        <div style={{ flex: 1, height: "1px", background: `${accent}44` }} />
      </div>
      {children}
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function ColLabel({ accent, children }) {
  return <div style={{ fontSize: "9px", fontWeight: "800", color: accent, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "6px", fontFamily: "sans-serif" }}>{children}</div>;
}

// eslint-disable-next-line no-unused-vars
function ColItem({ children }) {
  return <div style={{ fontSize: "10px", color: "#ccc", marginBottom: "5px", wordBreak: "break-all", lineHeight: "1.4" }}>{children}</div>;
}

// eslint-disable-next-line no-unused-vars
function RightLabel({ accent, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.5px", color: accent, textTransform: "uppercase", fontFamily: "sans-serif" }}>{children}</span>
      <div style={{ flex: 1, height: "1px", background: `${accent}33` }} />
    </div>
  );
}

// ─── PREVIEW: TWO-COLUMN LAYOUT ───────────────────────────────────
// (moved to src/Template2DubaiModern.js)

// ─── PREVIEW: SIDEBAR LAYOUT ──────────────────────────────────────
// (moved to src/Template3ArabiaPro.js)

// ─── PREVIEW: TIMELINE LAYOUT ─────────────────────────────────────
// (moved to src/Template4ExecutiveGold.js)

function ResumePreview({ cv, template, mobileMode = false }) {
  const t = template || TEMPLATES[0];
  const cvT = cvWithTemplateCertifications(cv);
  if (t.layout === "twocol")      return <PreviewTwoCol          cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "sidebar")     return <PreviewSidebar         cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "timeline")    return <PreviewTimeline        cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "gulf-exec")   return <PreviewGulfExecutive   cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "banking")     return <PreviewBankingFinance  cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "compact-pro") return <PreviewCompactPro      cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "creative")    return <PreviewCreativeSidebar cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "hospitality") return <PreviewHospitality     cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "ats-intl")    return <PreviewATSInternational cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "tech-it")     return <PreviewTechITPro       cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "flat-split")  return <Template12Split        cv={cvT} mobileMode={mobileMode} />;
  if (t.layout === "finance")     return <PreviewFinance         cv={cvT} />;
  if (t.layout === "figma-mirror")return <Template14             cv={cvT} mobileMode={mobileMode} />;
  return <PreviewModernEmerald cv={cvT} mobileMode={mobileMode} />;
}

/** A4 page at 96dpi — matches dynamic scale math (containerWidth / 794) */
const A4_PREVIEW_WIDTH_PX = 794;
const A4_PREVIEW_HEIGHT_PX = 1123;

function BuilderA4PreviewScaled({ cv, template, scale, fitRef, padded, previewCardRef }) {
  return (
    <div
      ref={fitRef}
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
        minWidth: 0,
        ...(padded ? { padding: "0 16px" } : {}),
      }}
    >
      <div
        style={{
          width: A4_PREVIEW_WIDTH_PX,
          transformOrigin: "top center",
          transform: `scale(${scale})`,
          willChange: "transform",
          transition: "none",
          marginBottom: `${(scale - 1) * A4_PREVIEW_HEIGHT_PX}px`,
        }}
      >
        <div className="cvp-builder-a4-fit" ref={previewCardRef}>
          <ResumePreview cv={cv} template={template} />
        </div>
      </div>
    </div>
  );
}

const BuilderTemplateGridCard = memo(function BuilderTemplateGridCard({ template: t, isSelected, sheetHighlight, resume, onPick, cardRef }) {
  const isFree = t.tier === "free";
  const borderStyle = sheetHighlight ? "2px solid rgba(255,255,255,0.8)" : isSelected ? "1px solid #FFFFFF" : "0.5px solid #2A2A2A";
  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onPick(t)}
      style={{
        position: "relative",
        width: "100%",
        padding: 0,
        margin: 0,
        border: borderStyle,
        borderRadius: 10,
        background: "#141414",
        cursor: "pointer",
        overflow: "hidden",
        display: "block",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: 160,
          width: "100%",
          overflow: "hidden",
          position: "relative",
          background: "#1C1C1C",
        }}
      >
        <div
          style={{
            width: A4_PREVIEW_WIDTH_PX,
            transform: "scale(0.18)",
            transformOrigin: "top left",
            willChange: "transform",
            transition: "none",
            pointerEvents: "none",
          }}
        >
          <ResumePreview cv={resume} template={t} />
        </div>
      </div>
      <div style={{ padding: "6px 8px 8px" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
      </div>
      <span
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          fontSize: 6.5,
          padding: "2px 5px",
          borderRadius: 5,
          fontWeight: 600,
          background: isFree ? "#1D9E75" : "#EF9F27",
          color: isFree ? "#fff" : "#412402",
        }}
      >
        {isFree ? "Free" : "⭐ Pro"}
      </span>
    </button>
  );
});

function builderAtsScore(resume) {
  let s = 0;
  if (resume.name) s += 8;
  if (resume.email) s += 8;
  if (resume.phone) s += 8;
  if (resume.title) s += 10;
  if (resume.nationality) s += 5;
  if (resume.visaStatus) s += 5;
  if (resume.summary?.length > 50) s += 16;
  if (resume.experience?.some((e) => e?.company)) s += 16;
  if (resume.skills?.length > 20) s += 12;
  if (normalizeCertificationsArray(resume.certifications).length > 0) s += 6;
  if (resume.languages) s += 6;
  return s;
}

function builderAtsBreakdown(resume) {
  const certs = normalizeCertificationsArray(resume.certifications);
  return [
    { pass: Boolean(String(resume.name || "").trim()), text: "Full name filled in" },
    { pass: Boolean(String(resume.email || "").trim()), text: "Email address present" },
    { pass: Boolean(String(resume.phone || "").trim()), text: "Phone number present" },
    { pass: Boolean(String(resume.title || "").trim()), text: "Professional title set" },
    { pass: Boolean(String(resume.nationality || "").trim()), text: "Nationality included" },
    { pass: Boolean(String(resume.visaStatus || "").trim()), text: "Visa status included" },
    { pass: Boolean(resume.summary && resume.summary.length > 50), text: "Professional summary (50+ characters)" },
    { pass: Boolean(resume.experience?.some((e) => e?.company)), text: "At least one work experience entry" },
    { pass: Boolean(resume.skills && resume.skills.length > 20), text: "Core skills list filled out" },
    { pass: certs.length > 0, text: "Certifications added" },
    { pass: Boolean(String(resume.languages || "").trim()), text: "Languages listed" },
  ];
}

function isCvDataEmptyForTemplateApply(cv) {
  const r = normalizeResumeForBuilder(cv);
  const hasIdentity = String(r.name || "").trim().length > 0 || String(r.email || "").trim().length > 0;
  const hasExp =
    Array.isArray(r.experience) &&
    r.experience.some((e) => String(e?.company || "").trim().length > 0 || String(e?.role || "").trim().length > 0);
  const hasSum = String(r.summary || "").trim().length > 30;
  const hasSkills = String(r.skills || "").trim().length > 10;
  return !hasIdentity && !hasExp && !hasSum && !hasSkills;
}

function BuilderTemplatesTab({
  resume,
  selectedTemplate,
  onApplyTemplate,
  onApplyTemplateAndGoToContent,
  pendingTemplate,
  confirmOpen,
  onPendingTemplateChange,
  onConfirmOpenChange,
  onTemplatesFabInteract,
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("popular");
  const prevFilterRef = useRef(null);
  const cardRefs = useRef(new Map());
  const ids = TEMPLATE_FILTER_IDS[filter] || TEMPLATE_FILTER_IDS.popular;
  const list = TEMPLATES.filter((t) => ids.includes(t.id));

  useEffect(() => {
    const prev = prevFilterRef.current;
    prevFilterRef.current = filter;
    if (prev === null) return;
    if (prev === filter) return;
    const activeIds = TEMPLATE_FILTER_IDS[filter] || TEMPLATE_FILTER_IDS.popular;
    const sid = selectedTemplate?.id;
    if (sid == null || !activeIds.includes(sid)) return;
    const el = cardRefs.current.get(sid);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      });
    }
  }, [filter, selectedTemplate?.id]);
  const pills = [
    { id: "popular", label: "Popular" },
    { id: "simple", label: "Simple" },
    { id: "modern", label: "Modern" },
    { id: "creative", label: "Creative" },
  ];

  return (
    <div
      className="cvp-builder-templates-tab-root"
      style={{ width: "100%", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div
        className="cvp-templates-pills"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "0 12px 12px",
          margin: 0,
          flexWrap: "nowrap",
          maxWidth: "100%",
          flexShrink: 0,
        }}
      >
        {pills.map((p) => {
          const on = filter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onTemplatesFabInteract?.();
                setFilter(p.id);
              }}
              style={{
                flex: "0 0 auto",
                background: on ? "#fff" : "#1C1C1C",
                color: on ? "#000" : "#666",
                fontSize: 8,
                padding: "4px 9px",
                borderRadius: 12,
                border: on ? "0.5px solid #fff" : "0.5px solid #2A2A2A",
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 28,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "0 12px",
          boxSizing: "border-box",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          alignContent: "start",
        }}
      >
        {list.map((t) => (
          <BuilderTemplateGridCard
            key={t.id}
            template={t}
            isSelected={selectedTemplate?.id === t.id}
            sheetHighlight={confirmOpen && pendingTemplate?.id === t.id}
            resume={resume}
            onPick={(tpl) => {
              onTemplatesFabInteract?.();
              if (isCvDataEmptyForTemplateApply(resume)) {
                onApplyTemplateAndGoToContent(tpl);
                return;
              }
              onPendingTemplateChange(tpl);
              onConfirmOpenChange(true);
            }}
            cardRef={(el) => {
              if (el) cardRefs.current.set(t.id, el);
              else cardRefs.current.delete(t.id);
            }}
          />
        ))}
      </div>
      {confirmOpen && pendingTemplate ? (
        <>
          <div
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 120,
            }}
            onClick={() => {
              onConfirmOpenChange(false);
              onPendingTemplateChange(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#141414",
              borderRadius: "24px 24px 0 0",
              paddingTop: 24,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
              zIndex: 121,
              boxSizing: "border-box",
              maxWidth: "100vw",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "#333",
                borderRadius: 2,
                margin: "0 auto 20px",
              }}
            />
            <p style={{ color: "#fff", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Do you want to replace your current design with this template?
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  onConfirmOpenChange(false);
                  onPendingTemplateChange(null);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  background: "#1C1C1C",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyTemplateAndGoToContent(pendingTemplate);
                  onConfirmOpenChange(false);
                  onPendingTemplateChange(null);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Apply Template
              </button>
            </div>
          </div>
        </>
      ) : null}
      <div style={{ padding: "16px 10px 8px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            fontSize: 10,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Remove watermark — upgrade to Pro
        </button>
      </div>
    </div>
  );
}

function BuilderAtsPassFailIcon({ pass }) {
  const fill = pass ? "#22C55E" : "#EF4444";
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx={11} cy={11} r={11} fill={fill} />
      {pass ? (
        <path d="M5 11 L9 15 L17 7" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M6 6 L16 16" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
          <path d="M16 6 L6 16" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function BuilderAtsTabContent({ resume }) {
  const score = builderAtsScore(resume);
  const breakdown = builderAtsBreakdown(resume);
  const pct = Math.max(0, Math.min(100, score));
  const r = 40.5;
  const c = 2 * Math.PI * r;
  const arcLen = (pct / 100) * c;
  const dashActive = `${arcLen} ${c}`;
  let singleStroke = "#E24B4A";
  if (pct >= 41 && pct < 71) singleStroke = "#EF9F27";
  if (pct >= 71) singleStroke = "#1D9E75";
  return (
    <div style={{ padding: "0 12px 16px", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box" }}>
      <style>{`
        @keyframes cvpAtsFlicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16 }}>
        <div style={{ position: "relative", width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
            <circle cx="44" cy="44" r={r} fill="none" stroke="#1C1C1C" strokeWidth="7" />
            {pct >= 71 ? (
              <>
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke="#1D9E75"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={dashActive}
                  transform="rotate(-90 44 44)"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke="#EF9F27"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={dashActive}
                  transform="rotate(-90 44 44)"
                  style={{ animation: "cvpAtsFlicker 0.9s ease-in-out infinite" }}
                />
              </>
            ) : (
              <circle
                cx="44"
                cy="44"
                r={r}
                fill="none"
                stroke={singleStroke}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={dashActive}
                transform="rotate(-90 44 44)"
              />
            )}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 500, color: "#fff", lineHeight: 1 }}>{pct}</span>
            <span style={{ fontSize: 7, color: "#666", marginTop: 2 }}>ATS Score</span>
          </div>
        </div>
        <div style={{ color: "#666", fontSize: 8.5, marginTop: 5, textAlign: "center" }}>ATS Readiness Score</div>
      </div>
      <div style={{ marginTop: 12 }}>
        {breakdown.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 0",
              borderBottom: "0.5px solid #1A1A1A",
            }}
          >
            <BuilderAtsPassFailIcon pass={row.pass} />
            <span style={{ color: "#aaa", fontSize: 8, lineHeight: 1.35 }}>{row.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full HTML document for iLovePDF (fonts + A4 preview shell; mirrors index.css .cvp-builder-a4-fit desktop rules). */
function buildCvPdfHtmlDocument(cvFragmentHtml) {
  const style = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #ffffff; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .cvp-builder-a4-fit {
      background: #ffffff;
      width: 794px;
      min-height: unset;
      height: auto;
      padding: 32px;
      border-radius: 8px;
      box-shadow: none;
      box-sizing: border-box;
    }
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"/>
<style>${style}</style>
</head>
<body>
${cvFragmentHtml}
</body>
</html>`;
}

// ─── PDF DOWNLOAD — iLovePDF API (A4) from live preview HTML ───────────────────
async function downloadResumeFromPreview(cvInput, captureElement) {
  const cv = cvWithTemplateCertifications(cvInput);
  if (!captureElement) throw new Error("Preview not ready");

  const cvElement = captureElement.classList.contains("cvp-builder-a4-fit")
    ? captureElement
    : captureElement.querySelector(".cvp-builder-a4-fit");
  if (!cvElement) throw new Error("Preview not ready");

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const html = buildCvPdfHtmlDocument(cvElement.outerHTML);
  const baseName = `${(cv.name || "Resume").replace(/\s+/g, "_")}_CVPassport`;

  const res = await fetch(`${window.location.origin}/api/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: baseName }),
  });
  if (!res.ok) {
    let msg = `Server error ${res.status}`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('downloads')
        .insert([{ user_id: user.id }]);
      if (error) console.error('Error tracking download:', error);
    } else {
      try {
        if (typeof localStorage !== "undefined") {
          const cur = parseInt(localStorage.getItem(ANON_DOWNLOADS_KEY) || "0", 10) || 0;
          localStorage.setItem(ANON_DOWNLOADS_KEY, String(cur + 1));
        }
      } catch {
        /* ignore */
      }
    }
  }
}

// ─── PREVIEW: TEMPLATE THUMB WRAPPER ──────────────────────────────
const TemplateThumb = ({ children }) => (
  <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#fff", borderRadius: "12px" }}>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "794px",
        transformOrigin: "top left",
        transform: "scale(0.18)",
        willChange: "transform",
        transition: "none",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  </div>
);

// ─── INLINE PREVIEW: T1 (MODERN EMERALD) ──────────────────────────
const T1Preview = ({ cv, t }) => (
  <TemplateThumb>
    <PreviewModernEmerald cv={cv} />
  </TemplateThumb>
);

// ─── INLINE PREVIEW: T2 (TWO-COLUMN LAYOUT) ───────────────────────
const T2Preview = ({ cv, t }) => (
  <TemplateThumb>
    <PreviewTwoCol cv={cv} t={t} />
  </TemplateThumb>
);

// ─── INLINE PREVIEW: T3 (SIDEBAR LAYOUT) ──────────────────────────
const T3Preview = ({ cv, t }) => (
  <TemplateThumb>
    <PreviewSidebar cv={cv} t={t} />
  </TemplateThumb>
);

// —— LANDING PAGE (legacy, kept for reference) ───────────────────
// eslint-disable-next-line no-unused-vars
function LandingPageLegacy({ onLogin, onSignup, setView, setResume, setSelectedTemplate }) {

  return (
    <div>
      <div style={{ textAlign: "center", padding: "80px 40px 60px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ ...S.badge("free"), marginBottom: "20px", fontSize: "13px" }}>🇦🇪 Built for Gulf Job Seekers</div>
        <h1 style={{ fontSize: "clamp(36px,6vw,64px)", fontWeight: "900", lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-2px" }}>
          Your Resume is your{" "}
          <span style={{ background: `linear-gradient(135deg,${C.accent},${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>passport</span>
          {" "}to the Gulf
        </h1>
        <p style={{ fontSize: "18px", color: C.muted, marginBottom: "36px", lineHeight: "1.7" }}>ATS-optimised resumes built for UAE, Saudi & GCC job markets. Free to build. Free to download.</p>
        <HowItWorks />
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button style={S.btn("primary","lg")} onClick={onSignup}>Build My Resume Free →</button>
          <button style={S.btn("outline","lg")} onClick={onLogin}>Sign In</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "20px", padding: "0 40px 60px", maxWidth: "1000px", margin: "0 auto" }}>
        {[
          { icon: "🎯", title: "ATS Optimised",    desc: "Beat applicant tracking systems used by UAE banks" },
          { icon: "📐", title: "Gulf CV Sections",  desc: "Nationality, Visa, DOB, Marital Status & more" },
          { icon: "💾", title: "Auto-Saved",         desc: "Your resume saves automatically — never lose your work" },
          { icon: "🔒", title: "Free Download",      desc: "Build & download free. No tricks" },
        ].map((f, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
            <div style={{ fontWeight: "700", marginBottom: "8px" }}>{f.title}</div>
            <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.6" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 40px 80px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: "800", marginBottom: "32px" }}>Professional Templates Built for Gulf Jobs</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", maxWidth: "1100px", margin: "0 auto 40px", "@media (max-width: 768px)": { gridTemplateColumns: "repeat(2, 1fr)" }, "@media (max-width: 480px)": { gridTemplateColumns: "1fr" } }}>
          {/* T1 - Modern Emerald */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Modern Emerald</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600 }}>Free</span>
              </div>
            }
          >
            <T1Preview cv={DUMMY_RESUME} t={TEMPLATES[0]} />
          </TiltedCard>

          {/* T2 - Dubai Modern */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Dubai Modern</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600 }}>Free</span>
              </div>
            }
          >
            <T2Preview cv={DUMMY_RESUME} t={TEMPLATES[1]} />
          </TiltedCard>

          {/* T3 - Arabia Pro */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Arabia Pro</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600 }}>Free</span>
              </div>
            }
          >
            <T3Preview cv={DUMMY_RESUME} t={TEMPLATES[2]} />
          </TiltedCard>

          {/* T4 - Executive Gold (Timeline) */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Executive Gold</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewTimeline cv={DUMMY_RESUME} t={TEMPLATES[3]} />
            </TemplateThumb>
          </TiltedCard>

          {/* T5 - Gulf Executive */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Gulf Executive</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewGulfExecutive cv={DUMMY_RESUME} t={TEMPLATES[4]} />
            </TemplateThumb>
          </TiltedCard>

          {/* T6 - Banking & Finance */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Banking & Finance</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewBankingFinance cv={DUMMY_RESUME} t={TEMPLATES[5]} />
            </TemplateThumb>
          </TiltedCard>

          {/* T13 - Finance */}
          <TiltedCard
            containerHeight="380px"
            rotateAmplitude={8}
            scaleOnHover={1.04}
            displayOverlayContent={true}
            overlayContent={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Finance</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "rgba(201,168,76,0.25)", color: "#C9A84C", fontWeight: 600 }}>Pro</span>
              </div>
            }
          >
            <TemplateThumb>
              <PreviewFinance cv={DUMMY_RESUME} />
            </TemplateThumb>
          </TiltedCard>
        </div>

        <button 
          onClick={() => { setResume({...EMPTY_RESUME, name: ""}); setSelectedTemplate(TEMPLATES[0]); setView('builder'); }}
          style={{ marginTop: "40px", display: "block", margin: "40px auto 0", padding: "12px 32px", background: "transparent", border: "1px solid #444", color: "#fff", borderRadius: "8px", fontSize: "14px", cursor: "pointer", letterSpacing: "0.5px" }}
        >
          Explore All 14 Templates →
        </button>
      </div>
    </div>
  );
}

const AUTH_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const authCardStyle = {
  background: "#141414",
  backgroundColor: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: "16px",
  padding: "24px",
  fontFamily: AUTH_FONT,
};

const authLabelStyle = {
  display: "block",
  fontWeight: 500,
  color: "#A0A0A0",
  fontSize: "14px",
  marginBottom: "6px",
  fontFamily: AUTH_FONT,
};

const authInputStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "#1C1C1C",
  border: "1px solid #2A2A2A",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: AUTH_FONT,
};

const authPrimaryBtn = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#FFFFFF",
  color: "#000000",
  fontWeight: 600,
  fontSize: "16px",
  cursor: "pointer",
  fontFamily: AUTH_FONT,
  transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1)",
};

// ─── AUTH PAGE ────────────────────────────────────────────────────
function AuthPage({ mode, onAuth, onToggle, loading, error, success }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    if (loading) return;
    onAuth({ ...form, name: form.name || form.email.split("@")[0] }, mode);
  };
  return (
    <div className="cvp-auth-page" style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
      <div style={authCardStyle}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "6px", color: "#FFFFFF", fontFamily: AUTH_FONT }}>{mode === "login" ? "Welcome back" : "Create account"}</h2>
        <p style={{ color: "#A0A0A0", marginBottom: "28px", fontSize: "14px", fontFamily: AUTH_FONT }}>{mode === "login" ? "Sign in to your CVPassport account" : "Start building your Gulf resume today"}</p>
        {success && (
          <div
            role="status"
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.45)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
              fontSize: "13px",
              color: "#86EFAC",
              fontFamily: AUTH_FONT,
              lineHeight: 1.45,
            }}
          >
            {success}
          </div>
        )}
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${C.danger}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: C.danger, fontFamily: AUTH_FONT }}>{error}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          {mode === "signup" && <div style={{ marginBottom: "16px" }}><label style={authLabelStyle}>Full Name</label><input style={authInputStyle} name="name" autoComplete="name" placeholder="Your Name" value={form.name} onChange={e=>set("name",e.target.value)}/></div>}
          <div style={{ marginBottom: "16px" }}><label style={authLabelStyle}>Email</label><input style={authInputStyle} type="email" name="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={e=>set("email",e.target.value)}/></div>
          <div style={{ marginBottom: "24px" }}><label style={authLabelStyle}>Password</label><input style={authInputStyle} type="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" value={form.password} onChange={e=>set("password",e.target.value)}/></div>
          <button type="submit" style={{ ...authPrimaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Free Account →"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#A0A0A0", fontFamily: AUTH_FONT }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span role="button" tabIndex={0} style={{ color: "#FFFFFF", cursor: "pointer", fontWeight: 600 }} onClick={onToggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(); }}>{mode === "login" ? "Sign up free" : "Sign in"}</span>
        </p>
      </div>
    </div>
  );
}

// ─── CERTIFICATIONS (optional section — multi-entry) ──────────────
function CertificationsBuilderSection({ resume, setResume, certificationEditor, setCertificationEditor, onRemoveSection }) {
  const list = normalizeCertificationsArray(resume.certifications);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {list.length === 0 && !certificationEditor && (
        <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No certifications yet. Add one below.</p>
      )}
      {list.map((c, i) => (
        <div
          key={i}
          style={{
            background: "#1C1C1C",
            border: "1px solid #2A2A2A",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setCertificationEditor({ mode: "edit", index: i, draft: { ...EMPTY_CERT, ...c } })}
            style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#FFFFFF" }}>{c.name || "Certification"}</div>
                {c.issuer ? <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2 }}>{c.issuer}</div> : null}
              </div>
              {c.year ? (
                <span style={{ fontSize: 12, color: "#A0A0A0", flexShrink: 0, textAlign: "right" }}>{c.year}</span>
              ) : (
                <span style={{ width: 0, flexShrink: 0 }} />
              )}
            </div>
          </button>
          <button
            type="button"
            aria-label="Delete certification"
            onClick={(e) => {
              e.stopPropagation();
              setResume((r) => ({
                ...r,
                certifications: normalizeCertificationsArray(r.certifications).filter((_, j) => j !== i),
              }));
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
          </button>
        </div>
      ))}
      {certificationEditor && (
        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 8, padding: 16, display: "grid", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Name</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Certification name"
              value={certificationEditor.draft.name}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, name: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Issuer</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Issuing organisation (optional)"
              value={certificationEditor.draft.issuer}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, issuer: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Year</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Year (optional)"
              value={certificationEditor.draft.year}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, year: e.target.value } } : null))}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setCertificationEditor(null)}>Cancel</button>
            <button
              type="button"
              style={CB_UI.btn}
              onClick={() => {
                const { mode, index, draft } = certificationEditor;
                const next = { ...EMPTY_CERT, name: draft.name.trim(), issuer: draft.issuer.trim(), year: draft.year.trim() };
                if (!next.name) return;
                setResume((r) => {
                  const cur = normalizeCertificationsArray(r.certifications);
                  if (mode === "add") return { ...r, certifications: [...cur, next] };
                  const u = [...cur];
                  u[index] = next;
                  return { ...r, certifications: u };
                });
                setCertificationEditor(null);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="cvp-builder-add-entry-btn"
        style={{ ...CB_UI.btn, width: "100%", display: "block", marginBottom: 8 }}
        onClick={() => setCertificationEditor({ mode: "add", index: -1, draft: { ...EMPTY_CERT } })}
      >
        + Add Certification
      </button>
      <button
        type="button"
        style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }}
        onClick={onRemoveSection}
      >
        Remove section
      </button>
    </div>
  );
}

// ─── RESUME BUILDER ───────────────────────────────────────────────
const EASE = "cubic-bezier(0.4,0,0.2,1)";
function ResumeBuilder({ user, onBack, initialResume, initialResumeId, initialTemplateId, isPro = false }) {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES.find(t => t.id === initialTemplateId) || TEMPLATES[0]);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [resumeId, setResumeId] = useState(initialResumeId || null);
  const [resume, setResume] = useState(() =>
    normalizeResumeForBuilder(initialResume || { ...EMPTY_RESUME, name: user?.name || "", email: user?.email || "" })
  );
  const [builderTab, setBuilderTab] = useState("content");
  const [openSection, setOpenSection] = useState(null);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [fabSheet, setFabSheet] = useState(null);
  const [previewFadeOut, setPreviewFadeOut] = useState(false);
  const [, setJobHasJd] = useState(false);
  const [experienceEditor, setExperienceEditor] = useState(null);
  const [educationEditor, setEducationEditor] = useState(null);
  const [certificationEditor, setCertificationEditor] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [addSectionPickerOpen, setAddSectionPickerOpen] = useState(false);
  const previewScrollRef = useRef(null);
  const mobilePreviewScrollRef = useRef(null);
  const desktopPreviewFitRef = useRef(null);
  const mobilePreviewFitRef = useRef(null);
  const desktopCvPreviewRef = useRef(null);
  const mobileCvPreviewRef = useRef(null);
  const [desktopPreviewContainerWidth, setDesktopPreviewContainerWidth] = useState(0);
  const [mobilePreviewContainerWidth, setMobilePreviewContainerWidth] = useState(0);

  const desktopPreviewScale = useMemo(() => {
    if (!desktopPreviewContainerWidth) return 1;
    return desktopPreviewContainerWidth / A4_PREVIEW_WIDTH_PX;
  }, [desktopPreviewContainerWidth]);

  const mobilePreviewScale = useMemo(() => {
    if (!mobilePreviewContainerWidth) return 1;
    return mobilePreviewContainerWidth / A4_PREVIEW_WIDTH_PX;
  }, [mobilePreviewContainerWidth]);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [templatePickPending, setTemplatePickPending] = useState(null);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [previewTemplateOverride, setPreviewTemplateOverride] = useState(null);
  const [templatesInteractKey, setTemplatesInteractKey] = useState(0);
  const [templateSessionApplyCount, setTemplateSessionApplyCount] = useState(0);
  const fabRef = useRef(null);
  const prevBuilderTabRef = useRef(null);

  useEffect(() => {
    const prev = prevBuilderTabRef.current;
    prevBuilderTabRef.current = builderTab;
    if (builderTab === "templates" && prev != null && prev !== "templates") {
      setTemplateSessionApplyCount(0);
    }
  }, [builderTab]);

  useEffect(() => {
    const el = desktopPreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width == null || width < 1) return;
      setDesktopPreviewContainerWidth((prev) => {
        if (Math.abs(prev - width) < 1) return prev;
        return width;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (fabSheet !== "preview") return;
    const el = mobilePreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width == null || width < 1) return;
      setMobilePreviewContainerWidth((prev) => (Math.abs(prev - width) < 1 ? prev : width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fabSheet]);

  useEffect(() => {
    previewScrollRef.current?.scrollTo(0, 0);
    mobilePreviewScrollRef.current?.scrollTo(0, 0);
  }, [selectedTemplate?.id]);

  useEffect(() => {
    writeFabMemory({ lastTabVisited: builderTab });
  }, [builderTab]);

  useEffect(() => {
    const full = fabSheet === "preview" || previewFadeOut;
    if (full) document.body.classList.add("cvp-builder-full-preview");
    else document.body.classList.remove("cvp-builder-full-preview");
    return () => document.body.classList.remove("cvp-builder-full-preview");
  }, [fabSheet, previewFadeOut]);

  const set = (k, v) => setResume(r => ({ ...r, [k]: v }));

  const score = builderAtsScore(resume);

  const templateFabRecommendNames = useMemo(() => {
    if (score >= 70) return TEMPLATES.filter((t) => t.tier === "premium").slice(0, 2).map((t) => t.name);
    return TEMPLATES.filter((t) => t.tier === "free").slice(0, 2).map((t) => t.name);
  }, [score]);

  const templatesPanel = (
    <BuilderTemplatesTab
      resume={resume}
      selectedTemplate={selectedTemplate}
      onApplyTemplate={setSelectedTemplate}
      onApplyTemplateAndGoToContent={(tpl) => {
        setSelectedTemplate(tpl);
        setBuilderTab("content");
        setTemplatePickPending(null);
        setTemplateConfirmOpen(false);
        setTemplateSessionApplyCount((c) => c + 1);
      }}
      pendingTemplate={templatePickPending}
      confirmOpen={templateConfirmOpen}
      onPendingTemplateChange={setTemplatePickPending}
      onConfirmOpenChange={setTemplateConfirmOpen}
      onTemplatesFabInteract={() => setTemplatesInteractKey((k) => k + 1)}
    />
  );

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const saved = await saveResume(user.id, resume, selectedTemplate.id, resumeId);
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('cvs')
            .insert([{ user_id: user.id }]);
          if (error) console.error('Error tracking CV creation:', error);
        }
      }
      setResumeId(saved.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
      // TODO: wire cv_edited on section save — writeFabMemory({ lastAction: "cv_edited", lastActionAt: new Date().toISOString() })
    } catch(e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, resume, selectedTemplate, resumeId]);

  const handleDownload = async () => {
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    if (isMobileViewport && builderTab === "ats" && fabRef.current?.runAtsDownloadGatekeeper) {
      const gate = await fabRef.current.runAtsDownloadGatekeeper();
      if (!gate?.canDownload) return;
    }
    setDownloading(true);
    const spinMs = 2000 + Math.floor(Math.random() * 1001);
    try {
      await new Promise((r) => setTimeout(r, spinMs));
      if (user?.id) await handleSave();
      await new Promise((r) => setTimeout(r, 500));
      const el = isMobileViewport ? mobileCvPreviewRef.current : desktopCvPreviewRef.current;
      if (!el) throw new Error("Preview not ready");
      await downloadResumeFromPreview(resume, el);
      writeFabMemory({
        lastAction: "downloaded",
        lastActionAt: new Date().toISOString(),
        lastTemplateId: selectedTemplate?.id != null ? `T${selectedTemplate.id}` : null,
      });
    } catch (e) {
      alert("PDF error: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const navigateToProAtsPage = useCallback(() => {
    navigate("/ats");
    setFabSheet(null);
  }, [navigate]);

  const closePreview = useCallback(() => {
    setPreviewFadeOut(true);
    setTimeout(() => {
      setFabSheet(null);
      setPreviewFadeOut(false);
      setPreviewTemplateOverride(null);
    }, 300);
  }, []);

  const handleOpenCoverLetter = () => {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setCoverLetterOpen(true);
  };

  const isOpen = (id) => openSection === id;
  const toggleSection = (id) => setOpenSection(s => s === id ? null : id);

  const builderExtraSectionIds = resume.builderExtraSectionIds || [];
  const availableOptionalSections = OPTIONAL_BUILDER_SECTIONS.filter((s) => !builderExtraSectionIds.includes(s.id));
  const allOptionalSectionsAdded = OPTIONAL_BUILDER_SECTIONS.every((s) => builderExtraSectionIds.includes(s.id));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "'DM Sans',sans-serif" }}>
      {/* Top nav bar — 56px, Download = only primary */}
      <header
        className="cvp-builder-topbar"
        style={{
          flexShrink: 0,
          height: 56,
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#0A0A0A",
          borderBottom: "1px solid #2A2A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 0 }}>
          <button type="button" onClick={onBack} aria-label="Back" className="cvp-builder-back" style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0, borderRadius: 8, border: "none", background: "transparent", color: "#A0A0A0", cursor: "pointer", display: "grid", placeItems: "center", transition: `color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="cvp-builder-tab-scroll" style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {["content", "templates", "ats", "jobmatch"].map((tab) => (
              <button
                key={tab}
                type="button"
                className="cvp-builder-tabchip"
                onClick={() => setBuilderTab(tab)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: builderTab === tab ? "#1C1C1C" : "transparent",
                  color: builderTab === tab ? "#FFFFFF" : "#A0A0A0",
                  fontWeight: builderTab === tab ? 600 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flex: "0 0 auto",
                  transition: `background-color 150ms ${EASE}, color 150ms ${EASE}`,
                }}
              >
                {tab === "content" ? "Content" : tab === "templates" ? "Templates" : tab === "ats" ? "ATS Check" : "Job Match"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="cvp-builder-menu-btn"
            aria-label="Open menu"
            onClick={() => setMenuDrawerOpen(true)}
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "#A0A0A0",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select value={selectedTemplate?.id} onChange={e => setSelectedTemplate(TEMPLATES.find(t => t.id === Number(e.target.value)) || TEMPLATES[0])} className="cvp-builder-topbar-template" style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2A2A2A", background: "#141414", color: "#FFFFFF", fontSize: 13, cursor: "pointer", minWidth: 140 }}>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" onClick={handleSave} disabled={saving} className="cvp-builder-topbar-save" style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #2A2A2A", background: "transparent", color: "#A0A0A0", fontSize: 14, cursor: saving ? "not-allowed" : "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; } }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#A0A0A0"; }}>
            {saving ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={handleDownload} disabled={downloading} className="cvp-builder-topbar-download" style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#FFFFFF", color: "#000000", fontSize: 14, fontWeight: 600, cursor: downloading ? "not-allowed" : "pointer", transition: `opacity 150ms ${EASE}`, display: "inline-flex", alignItems: "center", gap: 8 }} onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.opacity = "0.9"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            {downloading ? (
              <>
                <span style={{ display: "inline-flex", transform: "scale(0.42)", transformOrigin: "center" }}>
                  <CoverLetterSpinnerArrow size={44} />
                </span>
                Preparing...
              </>
            ) : (
              "Download"
            )}
          </button>
        </div>
      </header>

      {/* Desktop: split 380px | 1fr — layout in index.css */}
      <div className="cvp-builder-desktop">
        {/* Left panel — Editor */}
        <aside className="cvp-builder-left">
          {builderTab === "content" && (
            <>
              {/* Personal info card — always visible */}
              <div className="cvp-builder-personal-card" style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
                <button type="button" aria-label="Edit" style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 999, border: "1px solid #2A2A2A", background: "#1C1C1C", color: "#A0A0A0", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <div style={{ display: "grid", gap: 10 }}>
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Full name" value={resume.name} onChange={e=>set("name",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Job title" value={resume.title} onChange={e=>set("title",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Email" value={resume.email} onChange={e=>set("email",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Phone" value={resume.phone} onChange={e=>set("phone",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Location" value={resume.location} onChange={e=>set("location",e.target.value)} />
                </div>
              </div>

              <div className="cvp-sections-list">
              <AccordionSection id="summary" title="Professional Summary" isOpen={isOpen("summary")} onToggle={() => toggleSection("summary")} icon="summary">
                <div>
                  <textarea style={{ ...CB_UI.input, height: 100, resize: "vertical" }} placeholder="2–3 lines summary..." value={resume.summary} onChange={e=>set("summary",e.target.value)} />
                </div>
              </AccordionSection>

              <AccordionSection id="experience" title="Professional Experience" isOpen={isOpen("experience")} onToggle={() => toggleSection("experience")} icon="experience">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{exp.role || "Job title"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{exp.company || "Company"}{exp.location ? ` · ${exp.location}` : ""}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildExperiencePeriod(exp) || exp.period || "Dates"}</div>
                      </button>
                      <button type="button" aria-label="Delete experience" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
                </div>
              </AccordionSection>

              <AccordionSection id="education" title="Education" isOpen={isOpen("education")} onToggle={() => toggleSection("education")} icon="education">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
                  )}
                  {resume.education.map((edu, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{edu.degree || "Degree"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{edu.school || "Institution"}</div>
                        {edu.fieldOfStudy ? <div style={{ fontSize: 12, color: "#888" }}>{edu.fieldOfStudy}</div> : null}
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildEducationYearLine(edu) || edu.year || ""}</div>
                      </button>
                      <button type="button" aria-label="Delete education" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
                </div>
              </AccordionSection>

              <AccordionSection id="skills" title="Core Competencies" isOpen={isOpen("skills")} onToggle={() => toggleSection("skills")} icon="skills">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.skills).map((sk, si) => (
                      <span key={`${sk}-${si}`} style={CB_UI.chip}>
                        {sk}
                        <button type="button" aria-label={`Remove ${sk}`} onClick={() => setResume(r => ({ ...r, skills: splitCommaItems(r.skills).filter((x) => x !== sk).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={{ ...CB_UI.input }} placeholder="Add a skill" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); } }} />
                    <button type="button" className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }} onClick={() => { const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); }}>+ Add</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Technical skills</label>
                    <input style={CB_UI.input} placeholder="e.g. Python, SQL" value={resume.technicalSkills} onChange={e=>set("technicalSkills",e.target.value)} />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection id="languages" title="Languages" isOpen={isOpen("languages")} onToggle={() => toggleSection("languages")} icon="languages">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 120 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              {OPTIONAL_BUILDER_SECTIONS.filter((opt) => resume.builderExtraSectionIds?.includes(opt.id)).map((opt) => (
                <AccordionSection key={opt.id} id={opt.id} title={opt.label} isOpen={isOpen(opt.id)} onToggle={() => toggleSection(opt.id)} icon={opt.id}>
                  {opt.id === "certifications" ? (
                    <CertificationsBuilderSection
                      resume={resume}
                      setResume={setResume}
                      certificationEditor={certificationEditor}
                      setCertificationEditor={setCertificationEditor}
                      onRemoveSection={() => {
                        setCertificationEditor(null);
                        setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }));
                      }}
                    />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opt.multiline ? (
                        <textarea style={{ ...CB_UI.input, minHeight: 100, resize: "vertical" }} placeholder={opt.label} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      ) : (
                        <input style={CB_UI.input} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      )}
                      <button type="button" style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }))}>Remove section</button>
                    </div>
                  )}
                </AccordionSection>
              ))}
              </div>

              {builderTab === "content" && (
                <button type="button" onClick={() => setAddSectionPickerOpen(true)} className="cvp-builder-add-section" style={{ width: "100%", height: 44, padding: 0, borderRadius: 12, border: "1px dashed #333333", background: "transparent", color: "#A0A0A0", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#A0A0A0"; }}>+ Add section</button>
              )}
            </>
          )}
          {builderTab === "templates" ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
              {templatesPanel}
            </div>
          ) : null}
          {builderTab === "ats" && <BuilderAtsTabContent resume={resume} />}
          {builderTab === "jobmatch" && (
            <div style={{ display: "grid", gap: 12 }}>
              <button
                type="button"
                onClick={handleOpenCoverLetter}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #2A2A2A",
                  background: "transparent",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: `border-color 150ms ${EASE}`,
                  justifySelf: "start",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; }}
              >
                Get Cover Letter
              </button>
              <JobMatch resume={resume} selectedTemplate={selectedTemplate} isPro={isPro} onJobDescriptionChange={setJobHasJd} />
            </div>
          )}
        </aside>

        {/* Right panel — Live Preview; scale-to-fit (794px A4) */}
        <div className="cvp-builder-preview" ref={previewScrollRef}>
          <BuilderA4PreviewScaled
            cv={resume}
            template={selectedTemplate}
            scale={desktopPreviewScale}
            fitRef={desktopPreviewFitRef}
            padded={false}
            previewCardRef={desktopCvPreviewRef}
          />
        </div>
      </div>

      {/* Mobile: single column */}
      <div className="cvp-builder-mobile" style={{ display: "none", flexDirection: "column", flex: 1, minHeight: 0, position: "relative", maxWidth: "100vw", overflowX: "hidden", overflowY: "visible" }}>
          <div className={`cvp-builder-mobile-form${builderTab === "templates" ? " cvp-builder-mobile-form--templates" : ""}`}>
            {builderTab === "content" && (
              <>
                <div className="cvp-builder-personal-card" style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Full name" value={resume.name} onChange={e=>set("name",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Job title" value={resume.title} onChange={e=>set("title",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Email" value={resume.email} onChange={e=>set("email",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Phone" value={resume.phone} onChange={e=>set("phone",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Location" value={resume.location} onChange={e=>set("location",e.target.value)} />
                  </div>
                </div>
                <div className="cvp-mobile-section-rows" style={{ display: "flex", flexDirection: "column", maxWidth: "100%" }}>
              <AccordionSection variant="mobileRow" id="summary" title="Professional Summary" isOpen={isOpen("summary")} onToggle={() => toggleSection("summary")} icon="summary">
                <div>
                  <textarea style={{ ...CB_UI.input, height: 100, resize: "vertical" }} placeholder="2–3 lines summary..." value={resume.summary} onChange={e=>set("summary",e.target.value)} />
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="experience" title="Professional Experience" isOpen={isOpen("experience")} onToggle={() => toggleSection("experience")} icon="experience">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{exp.role || "Job title"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{exp.company || "Company"}{exp.location ? ` · ${exp.location}` : ""}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildExperiencePeriod(exp) || exp.period || "Dates"}</div>
                      </button>
                      <button type="button" aria-label="Delete experience" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="education" title="Education" isOpen={isOpen("education")} onToggle={() => toggleSection("education")} icon="education">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
                  )}
                  {resume.education.map((edu, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{edu.degree || "Degree"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{edu.school || "Institution"}</div>
                        {edu.fieldOfStudy ? <div style={{ fontSize: 12, color: "#888" }}>{edu.fieldOfStudy}</div> : null}
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildEducationYearLine(edu) || edu.year || ""}</div>
                      </button>
                      <button type="button" aria-label="Delete education" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="skills" title="Core Competencies" isOpen={isOpen("skills")} onToggle={() => toggleSection("skills")} icon="skills">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.skills).map((sk, si) => (
                      <span key={`${sk}-${si}`} style={CB_UI.chip}>
                        {sk}
                        <button type="button" aria-label={`Remove ${sk}`} onClick={() => setResume(r => ({ ...r, skills: splitCommaItems(r.skills).filter((x) => x !== sk).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={{ ...CB_UI.input }} placeholder="Add a skill" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); } }} />
                    <button type="button" className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }} onClick={() => { const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); }}>+ Add</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Technical skills</label>
                    <input style={CB_UI.input} placeholder="e.g. Python, SQL" value={resume.technicalSkills} onChange={e=>set("technicalSkills",e.target.value)} />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="languages" title="Languages" isOpen={isOpen("languages")} onToggle={() => toggleSection("languages")} icon="languages">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 120 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              {OPTIONAL_BUILDER_SECTIONS.filter((opt) => resume.builderExtraSectionIds?.includes(opt.id)).map((opt) => (
                <AccordionSection key={opt.id} variant="mobileRow" id={opt.id} title={opt.label} isOpen={isOpen(opt.id)} onToggle={() => toggleSection(opt.id)} icon={opt.id}>
                  {opt.id === "certifications" ? (
                    <CertificationsBuilderSection
                      resume={resume}
                      setResume={setResume}
                      certificationEditor={certificationEditor}
                      setCertificationEditor={setCertificationEditor}
                      onRemoveSection={() => {
                        setCertificationEditor(null);
                        setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }));
                      }}
                    />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opt.multiline ? (
                        <textarea style={{ ...CB_UI.input, minHeight: 100, resize: "vertical" }} placeholder={opt.label} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      ) : (
                        <input style={CB_UI.input} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      )}
                      <button type="button" style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }))}>Remove section</button>
                    </div>
                  )}
                </AccordionSection>
              ))}
                </div>
                {builderTab === "content" && (
                  <button type="button" onClick={() => setAddSectionPickerOpen(true)} className="cvp-builder-add-section" style={{ width: "100%", height: 44, padding: 0, borderRadius: 12, border: "1px dashed #333333", background: "transparent", color: "#A0A0A0", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#A0A0A0"; }}>+ Add section</button>
                )}
              </>
            )}
            {builderTab === "templates" ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
              {templatesPanel}
            </div>
          ) : null}
            {builderTab === "ats" && <BuilderAtsTabContent resume={resume} />}
            {builderTab === "jobmatch" && (
              <div style={{ display: "grid", gap: 12, padding: "0 12px 12px" }}>
                <button
                  type="button"
                  onClick={handleOpenCoverLetter}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid #2A2A2A",
                    background: "transparent",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: `border-color 150ms ${EASE}`,
                    justifySelf: "start",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; }}
                >
                  Get Cover Letter
                </button>
                <JobMatch resume={resume} selectedTemplate={selectedTemplate} isPro={isPro} onJobDescriptionChange={setJobHasJd} />
              </div>
            )}
            <div className="cvp-builder-mobile-download-row" style={{ padding: "12px 10px 88px", marginTop: "auto" }}>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  width: "calc(100% - 20px)",
                  margin: "0 10px",
                  boxSizing: "border-box",
                  minHeight: 44,
                  padding: "10px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: "#FFFFFF",
                  color: "#000000",
                  fontSize: 8.5,
                  fontWeight: 600,
                  cursor: downloading ? "not-allowed" : "pointer",
                  opacity: downloading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {downloading ? "Preparing…" : "Download CV"}
              </button>
            </div>
            {fabSheet !== "preview" ? (
              <FAB
                ref={fabRef}
                variant="builder"
                tabKey={builderTab}
                atsScore={score}
                selectedTemplateId={selectedTemplate?.id}
                resume={resume}
                templatePickPending={templatePickPending}
                templatesInteractKey={templatesInteractKey}
                templateSessionApplyCount={templateSessionApplyCount}
                templateRecommendNames={templateFabRecommendNames}
                onPreviewTemplateDraft={(tpl) => {
                  setPreviewTemplateOverride(tpl);
                  setFabSheet("preview");
                }}
                onApplyTemplateDraft={(tpl) => {
                  setSelectedTemplate(tpl);
                  setBuilderTab("content");
                  setTemplatePickPending(null);
                  setTemplateConfirmOpen(false);
                  setTemplateSessionApplyCount((c) => c + 1);
                }}
                onClearTemplatePick={() => {
                  setTemplatePickPending(null);
                  setTemplateConfirmOpen(false);
                }}
                onNavigateToCvSection={(navKey) => {
                  setBuilderTab("content");
                  if (navKey === "personal") {
                    requestAnimationFrame(() => {
                      document.querySelector(".cvp-builder-personal-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  } else {
                    setOpenSection(navKey);
                  }
                }}
                sheetZOverlay={299}
                sheetZSheet={300}
                onOpenCvPreview={() => {
                  setPreviewTemplateOverride(null);
                  setFabSheet("preview");
                }}
                onOpenTemplatePreview={() => {
                  setPreviewTemplateOverride(null);
                  setFabSheet("preview");
                }}
                onNavigateToProAts={navigateToProAtsPage}
                onNavigateToCoverLetter={() => {
                  writeFabMemory({ hasVisitedCoverLetter: true });
                  navigate("/cover-letter");
                }}
              />
            ) : null}
          </div>

        <div className="cvp-builder-mobile-hidden-capture" aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 794, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none", zIndex: -1 }}>
          <div ref={mobileCvPreviewRef} className="cvp-builder-a4-fit" style={{ width: 794 }}>
            <ResumePreview cv={resume} template={selectedTemplate} mobileMode />
          </div>
        </div>

        {fabSheet === "preview" ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              width: "100%",
              height: "100dvh",
              maxHeight: "100dvh",
              background: "#111111",
              opacity: previewFadeOut ? 0 : 1,
              transition: "opacity 0.3s ease",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={closePreview}
              aria-label="Close preview"
              style={{
                position: "fixed",
                top: 16,
                right: 16,
                background: "#141414",
                border: "1px solid #333",
                borderRadius: "50%",
                width: 40,
                height: 40,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                zIndex: 101,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ✕
            </button>
            <div
              ref={mobilePreviewScrollRef}
              style={{
                flex: 1,
                width: "100%",
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                paddingTop: 56,
                paddingLeft: 0,
                paddingRight: 0,
                paddingBottom: 16,
                WebkitOverflowScrolling: "touch",
                boxSizing: "border-box",
              }}
            >
              <BuilderA4PreviewScaled
                cv={resume}
                template={previewTemplateOverride ?? selectedTemplate}
                scale={mobilePreviewScale}
                fitRef={mobilePreviewFitRef}
                padded={false}
              />
            </div>
          </div>
        ) : null}

      </div>

      <CoverLetterModal
        isOpen={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
        resume={resume}
      />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      {menuDrawerOpen ? (
        <div className="cvp-builder-drawer-root" style={{ position: "fixed", inset: 0, zIndex: 360 }}>
          <div role="presentation" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setMenuDrawerOpen(false)} />
          <aside
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "78%",
              height: "100%",
              maxWidth: "100%",
              background: "#141414",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              padding: "10px 10px 12px",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.35)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setMenuDrawerOpen(false);
                  navigate(user ? "/dashboard" : "/");
                }}
                style={{
                  border: "none",
                  background: "none",
                  color: "#fff",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ← Dashboard
              </button>
              <button type="button" aria-label="Close" onClick={() => setMenuDrawerOpen(false)} style={{ width: 44, height: 44, border: "none", background: "transparent", color: "#fff", fontSize: 20, cursor: "pointer" }}>
                ✕
              </button>
            </div>
            {[
              { id: "content", label: "Content" },
              { id: "templates", label: "Templates" },
              { id: "ats", label: "ATS Check" },
              { id: "jobmatch", label: "Job Match" },
            ].map((row) => {
              const act = builderTab === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setBuilderTab(row.id);
                    setMenuDrawerOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    minHeight: 44,
                    marginBottom: 6,
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "none",
                    background: "#1C1C1C",
                    color: act ? "#fff" : "#A0A0A0",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={act ? "#fff" : "#555"} strokeWidth="2" aria-hidden>
                    {row.id === "content" ? (
                      <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </>
                    ) : row.id === "templates" ? (
                      <path d="M4 4h16v16H4z M9 4v16 M4 9h16" />
                    ) : row.id === "ats" ? (
                      <>
                        <circle cx="12" cy="12" r="8" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ) : (
                      <>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </>
                    )}
                  </svg>
                  {row.label}
                </button>
              );
            })}
            <div style={{ height: 1, background: "#2A2A2A", margin: "10px 0 12px" }} />
            <button
              type="button"
              onClick={() => {
                setMenuDrawerOpen(false);
                setFabSheet("preview");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                minHeight: 44,
                marginBottom: 8,
                padding: "10px 9px",
                borderRadius: 8,
                border: "0.5px solid #2A2A2A",
                background: "#1C1C1C",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview CV
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuDrawerOpen(false);
                handleDownload();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                minHeight: 44,
                marginBottom: 8,
                padding: "10px 9px",
                borderRadius: 8,
                border: "none",
                background: "#fff",
                color: "#000",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download CV
            </button>
            <div style={{ flex: 1, minHeight: 8 }} aria-hidden />
            <div style={{ paddingTop: 4 }}>
              <div style={{ background: "#1C1C1C", border: "0.5px solid #333", borderRadius: 8, padding: 8 }}>
                <div style={{ color: "#ccc", fontSize: 8, fontWeight: 500, marginBottom: 4 }}>Remove watermark</div>
                <div style={{ color: "#555", fontSize: 7, marginBottom: 8, lineHeight: 1.35 }}>Download HD PDF — upgrade to Pro</div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDrawerOpen(false);
                    navigate("/pricing");
                  }}
                  style={{
                    width: "100%",
                    minHeight: 36,
                    background: "#fff",
                    color: "#000",
                    fontSize: 7.5,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Upgrade →
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {experienceEditor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setExperienceEditor(null)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>{experienceEditor.mode === "add" ? "Add experience" : "Edit experience"}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Company name</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.company} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, company: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Job title</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.role} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, role: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Start (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} placeholder="01/2020" value={experienceEditor.draft.startDate} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: e.target.value } } : null))} /></div>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>End (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} placeholder="12/2023" disabled={experienceEditor.draft.present} value={experienceEditor.draft.endDate} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: e.target.value } } : null))} /></div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#FFF", cursor: "pointer" }}>
                <input type="checkbox" checked={experienceEditor.draft.present} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, present: e.target.checked, endDate: e.target.checked ? "" : ev.draft.endDate } } : null))} />
                Present (current role)
              </label>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Location (City, Country)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.location} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Description (bullet points, one per line)</label><textarea style={{ ...CB_UI.input, marginTop: 4, minHeight: 100, resize: "vertical" }} value={experienceEditor.draft.points} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: e.target.value } } : null))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setExperienceEditor(null)}>Cancel</button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const { mode, index, draft } = experienceEditor;
                  const next = { ...draft, period: buildExperiencePeriod({ ...draft, present: draft.present }) };
                  setResume((r) => {
                    if (mode === "add") return { ...r, experience: [...r.experience, next] };
                    const u = [...r.experience];
                    u[index] = next;
                    return { ...r, experience: u };
                  });
                  setExperienceEditor(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {educationEditor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setEducationEditor(null)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>{educationEditor.mode === "add" ? "Add education" : "Edit education"}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Institution name</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.school} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, school: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Degree / qualification</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.degree} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, degree: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Field of study</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.fieldOfStudy || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, fieldOfStudy: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Start (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.startDate || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: e.target.value } } : null))} /></div>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>End (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.endDate || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: e.target.value } } : null))} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Location (optional)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.location || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setEducationEditor(null)}>Cancel</button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const { mode, index, draft } = educationEditor;
                  const next = { ...draft, year: buildEducationYearLine(draft) };
                  setResume((r) => {
                    if (mode === "add") return { ...r, education: [...r.education, next] };
                    const u = [...r.education];
                    u[index] = next;
                    return { ...r, education: u };
                  });
                  setEducationEditor(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {addSectionPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setAddSectionPickerOpen(false)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 400, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>Add optional section</h3>
            <p style={{ fontSize: 13, color: "#A0A0A0", margin: "0 0 16px" }}>Choose a section to add to your CV.</p>
            <div style={{ display: "grid", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
              {availableOptionalSections.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={{ ...CB_UI.btn, width: "100%", textAlign: "left" }}
                  onClick={() => {
                    setResume((r) => ({
                      ...r,
                      builderExtraSectionIds: [...new Set([...(r.builderExtraSectionIds || []), opt.id])],
                    }));
                    setOpenSection(opt.id);
                  }}
                >
                  + {opt.label}
                </button>
              ))}
              {availableOptionalSections.length === 0 && (
                <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>
                  {allOptionalSectionsAdded ? "All optional sections have been added." : "No sections available."}
                </p>
              )}
            </div>
            <button type="button" style={{ ...CB_UI.btn, marginTop: 16, width: "100%", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setAddSectionPickerOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccordionSectionIcon({ icon, size = 16, stroke = "currentColor" }) {
  const sw = size >= 14 ? 2 : 1.5;
  const s = size;
  return (
    <span style={{ width: s, height: s, display: "grid", placeItems: "center", flexShrink: 0 }}>
      {icon === "summary" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>}
      {icon === "experience" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
      {icon === "education" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>}
      {icon === "skills" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
      {icon === "languages" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
      {icon === "certifications" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M12 15l-2 2 2 2 2-2-2-2z" /><path d="M4 4h16v16H4z" /></svg>}
      {icon === "projects" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>}
      {icon === "volunteer" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
      {icon === "publications" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
    </span>
  );
}

// Accordion row inside .cvp-sections-list — unified list style
function AccordionSection({ id, title, isOpen, onToggle, icon, children, variant = "default" }) {
  const ease = "cubic-bezier(0.4,0,0.2,1)";
  if (variant === "mobileRow") {
    return (
      <div style={{ marginBottom: 5, maxWidth: "100%" }}>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#141414",
            border: "0.5px solid #2A2A2A",
            borderRadius: 9,
            padding: "8px 10px",
            cursor: "pointer",
            minHeight: 44,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: 22, height: 22, background: "#1C1C1C", borderRadius: 6, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <AccordionSectionIcon icon={icon} size={12} stroke="#888" />
          </div>
          <span style={{ flex: 1, color: "#fff", fontSize: 10, fontWeight: 500, textAlign: "left", minWidth: 0 }}>{title}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              background: "#1C1C1C",
              color: "#777",
              fontSize: 7,
              padding: "3px 6px",
              border: "0.5px solid #2A2A2A",
              borderRadius: 5,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Edit
          </button>
          <span style={{ color: "#444", fontSize: 14, flexShrink: 0, lineHeight: 1 }} aria-hidden>›</span>
        </div>
        <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: `grid-template-rows 300ms ${ease}` }}>
          <div style={{ overflow: isOpen ? "visible" : "hidden" }}>
            <div
              style={{
                opacity: isOpen ? 1 : 0,
                transition: `opacity 300ms ${ease}`,
                padding: 12,
                background: "#0A0A0A",
                border: "0.5px solid #2A2A2A",
                borderTop: "none",
                borderRadius: "0 0 9px 9px",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`cvp-section-row${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="cvp-section-row-header"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 16,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          borderLeft: isOpen ? "2px solid #FFFFFF" : "2px solid transparent",
          transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ width: 16, height: 16, display: "grid", placeItems: "center", color: "#A0A0A0", flexShrink: 0 }}>
            <AccordionSectionIcon icon={icon} size={16} stroke="currentColor" />
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", letterSpacing: "0.02em" }}>{title}</span>
        </div>
        <span style={{ color: "#A0A0A0", display: "grid", placeItems: "center", transition: `transform 300ms ${ease}`, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: `grid-template-rows 300ms ${ease}`,
        }}
      >
        <div style={{ overflow: isOpen ? "visible" : "hidden" }}>
          <div
            className="cvp-section-row-content"
            style={{
              opacity: isOpen ? 1 : 0,
              transition: `opacity 300ms ${ease}`,
              padding: 16,
              background: "#141414",
              borderTop: "1px solid #2A2A2A",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Resume strength: count filled fields and return 0–100
function getStrength(cv) {
  if (!cv || typeof cv !== "object") return 0;
  const fields = [
    cv.name, cv.title, cv.email, cv.phone, cv.location, cv.summary,
    cv.skills, cv.languages, cv.nationality, cv.visaStatus,
    Array.isArray(cv.experience) && cv.experience.some(e => e?.company || e?.role),
    Array.isArray(cv.education) && cv.education.some(e => e?.school || e?.degree),
  ];
  const filled = fields.filter(Boolean).length;
  return Math.min(100, Math.round((filled / 12) * 100));
}

// ─── MAIN APP ─────────────────────────────────────────────────────
const extractName = u => u.user_metadata?.name || u.user_metadata?.full_name || u.email.split("@")[0];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode]     = useState("signup");
  const [user, setUser]             = useState(null);
  const [isPro, setIsPro]           = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError]   = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [editingResume, setEditingResume] = useState(null);
  const [resumeList, setResumeList] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [resume, setResume] = useState(EMPTY_RESUME);
  // eslint-disable-next-line no-unused-vars
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);

  const ensureProfileRow = async (authUser) => {
    if (!supabase || !authUser?.id) return;
    await supabase.from("profiles").upsert(
      {
        id: authUser.id,
        email: authUser.email || "",
        plan: "FREE",
        flagged: false,
        features: {},
      },
      { onConflict: "id" },
    );
  };

  useEffect(() => {
    if (!user?.id) return;
    loadUserResumes(user.id)
      .then(data => setResumeList(data || []))
      .catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const fetchProStatus = async (userId) => {
      try {
        const { data: profile } = await supabase.from("profiles").select("is_pro").eq("id", userId).single();
        if (!cancelled) setIsPro(!!profile?.is_pro);
      } catch {
        if (!cancelled) setIsPro(false);
      }
    };
    const applySession = (session) => {
      if (cancelled) return;
      if (session?.user) {
        ensureProfileRow(session.user).catch((e) => console.error("ensureProfileRow:", e));
        setUser({ name: extractName(session.user), email: session.user.email, id: session.user.id });
        fetchProStatus(session.user.id);
      } else {
        setUser(null);
        setIsPro(false);
      }
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data: { session } }) => applySession(session)).catch((e) => {
      console.error("getSession:", e);
      if (!cancelled) setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const clean = location.pathname.replace(/\/$/, "") || "/";
    if (clean === "/auth" || clean === "/register") {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!["/", "/pricing", "/walk-in", "/builder", "/ats", "/cover-letter", "/dashboard", "/admin"].includes(clean)) {
      navigate("/dashboard", { replace: true });
    }
  }, [authReady, user, location.pathname, navigate]);

  const handleAuth = async (userData, modeOverride) => {
    if (!supabase) return;
    const isSignup = (modeOverride ?? authMode) === "signup";
    const trimmed = trimAuthFields(userData);
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);
    try {
      if (!trimmed.email || !trimmed.password) {
        setAuthError("Please enter your email and password.");
        return;
      }
      if (isSignup && trimmed.password.length < 6) {
        setAuthError("Password must be at least 6 characters.");
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = origin ? `${origin}/auth` : undefined;

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmed.email,
          password: trimmed.password,
          options: {
            emailRedirectTo,
            data: { name: trimmed.name || trimmed.email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          await ensureProfileRow(data.user);
          setUser({ name: trimmed.name || extractName(data.user), email: data.user.email, id: data.user.id });
          setIsPro(false);
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data.user && !data.session) {
          setAuthSuccess(
            "Account created successfully. Check your email for a verification link, then sign in here.",
          );
          return;
        }
        setAuthError("Signup could not be completed. Try again or use a different email.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed.email,
          password: trimmed.password,
        });
        if (error) throw error;
        if (!data.user) {
          setAuthError("Sign in failed. Please try again.");
          return;
        }
        await ensureProfileRow(data.user);
        setUser({ name: extractName(data.user), email: data.user.email, id: data.user.id });
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("handleAuth:", err);
      setAuthError(mapAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setIsPro(false); navigate("/"); };

  const handleEditResume  = (record) => { setEditingResume(record); navigate("/builder"); };
  const handleNewResume   = ()       => { setEditingResume(null);   navigate("/builder"); };
  const currentPath = location.pathname.replace(/\/$/, "") || "/";

  return (
    <Routes>
      <Route path="/pricing" element={<Pricing isLight={document.documentElement.classList.contains("light")} />} />
      <Route
        path="*"
        element={
          <div style={S.app}>
            <Routes>
              <Route
                path="/"
                element={
                  <LandingPage
                    user={user}
                    onSignOut={handleLogout}
                    onLogin={() => { setAuthMode("login"); navigate("/auth"); }}
                    onSignup={() => { setAuthMode("signup"); navigate("/register"); }}
                    onWalkIn={() => navigate("/walk-in")}
                  />
                }
              />
              <Route path="/walk-in" element={<WalkInMode onBack={() => navigate("/")} onComplete={() => navigate("/builder")} setResume={setResume} setSelectedTemplate={setSelectedTemplate} />} />
              <Route
                path="/auth"
                element={
                  <AuthPage
                    mode={authMode}
                    onAuth={handleAuth}
                    onToggle={() => {
                      setAuthMode((m) => (m === "login" ? "signup" : "login"));
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    loading={authLoading}
                    error={authError}
                    success={authSuccess}
                  />
                }
              />
              <Route
                path="/register"
                element={
                  <AuthPage
                    mode="signup"
                    onAuth={handleAuth}
                    onToggle={() => {
                      setAuthMode("login");
                      setAuthError(null);
                      setAuthSuccess(null);
                      navigate("/auth");
                    }}
                    loading={authLoading}
                    error={authError}
                    success={authSuccess}
                  />
                }
              />
              <Route path="/admin" element={!authReady ? null : (user?.email === "connectingjunaidkhan@gmail.com" ? <AdminPanel /> : <Navigate to="/" replace />)} />
              <Route path="/dashboard" element={user ? (
              <Dashboard
                theme={document.documentElement.classList.contains("light") ? "light" : "dark"}
                user={user}
                resumeList={resumeList}
                getStrength={(r) => getStrength(r?.cv_data || r)}
                renderThumb={(r) => (
                  <div className="cvp-thumb-inner">
                    <ResumePreview cv={r?.cv_data || EMPTY_RESUME} template={TEMPLATES.find(t => t.id === r?.template_id) || TEMPLATES[0]} />
                  </div>
                )}
                onBuildResume={handleNewResume}
                onEditResume={handleEditResume}
                onDelete={async (resumeId) => {
                  try {
                    await deleteResume(resumeId, user.id);
                    setResumeList(prev => prev.filter(r => r.id !== resumeId));
                  } catch (e) {
                    alert("Error deleting resume");
                  }
                }}
                onRunATS={() => navigate("/ats")}
                onWalkIn={() => navigate("/walk-in")}
                onTemplates={() => {}}
              />
              ) : <Navigate to="/" replace />} />
              <Route path="/builder" element={(
              <ResumeBuilder
                user={user}
                isPro={isPro}
                onBack={() => navigate(user ? "/dashboard" : "/")}
                initialResume={editingResume?.cv_data || null}
                initialResumeId={editingResume?.id || null}
                initialTemplateId={editingResume?.template_id || null}
              />
              )} />
              <Route path="/ats" element={<ATSChecker onBack={() => navigate(user ? "/dashboard" : "/")} />} />
              <Route
                path="/cover-letter"
                element={
                  user ? (
                    <CoverLetterPage user={user} onBack={() => navigate("/dashboard")} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <MobileTabBar currentPath={currentPath} onNavigate={navigate} user={user} fabGuideTab={location.state?.fabGuideTab} />
            <Analytics />
          </div>
        }
      />
    </Routes>
  );
}