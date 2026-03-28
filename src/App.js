import { Analytics } from "@vercel/analytics/react";
import HowItWorks from "./HowItWorks";
import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, memo } from "react";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { supabase as supabaseImport } from "./supabaseClient";
import { mapAuthError, trimAuthFields } from "./authUtils";
import mammoth from "mammoth";
import ATSChecker from "./ATSChecker";
import JobMatch from "./JobMatch";
import CoverLetterModal from "./CoverLetterModal";
import { transformRawInput } from "./coverLetterDataBank.generated";
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
// Mobile bottom tab bar icons (used when on ATS / Walk-In so nav is always visible)
function TabIconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}
function TabIconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TabIconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function TabIconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function TabIconCoverLetter() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
      <path d="M8 13h4" />
      <path d="M8 17h8" />
    </svg>
  );
}
const CL_GREEN = "#6EE7B7";

function toExperienceBulletsForCL(resume) {
  const list = Array.isArray(resume?.experience) ? resume.experience : [];
  return list
    .slice(0, 3)
    .map((e) => {
      const role = e?.role ? `${e.role}` : "Role";
      const company = e?.company ? ` at ${e.company}` : "";
      const points = String(e?.points || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const topPoint = points[0] ? ` — ${points[0]}` : "";
      return `${role}${company}${topPoint}`;
    })
    .filter(Boolean);
}

function buildImportedSummaryForCL(resume) {
  if (!resume || typeof resume !== "object") {
    return { name: "", role: "", summary: "", skills: "", exp: [] };
  }
  const skills = String(resume.skills || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
  const exp = toExperienceBulletsForCL(resume);
  return {
    name: resume.name || "",
    role: resume.title || "",
    summary: resume.summary || "",
    skills,
    exp,
  };
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

const CL_JOB_KEYWORDS = [
  "customer service",
  "communication",
  "leadership",
  "sales",
  "banking",
  "finance",
  "operations",
  "compliance",
  "kyc",
  "aml",
  "teamwork",
  "management",
  "excel",
  "reporting",
  "analysis",
  "relationship",
  "client",
  "target",
  "revenue",
  "retail",
  "branch",
  "onboarding",
  "support",
  "processing",
  "coordination",
  "planning",
  "digital",
  "mobile",
  "data",
  "service",
];

function extractRole(jobDescription) {
  const text = String(jobDescription || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "this position";
  const lower = text.toLowerCase();
  const needles = ["for a ", "for the ", "position of ", "role of "];
  let start = -1;
  for (const n of needles) {
    const i = lower.indexOf(n);
    if (i !== -1) {
      start = i + n.length;
      break;
    }
  }
  if (start === -1) return "this position";
  const after = text.slice(start).trim();
  const words = after.split(/\s+/).filter(Boolean).slice(0, 3);
  if (!words.length) return "this position";
  return words.join(" ");
}

function extractKeywords(jobDescription) {
  const jd = String(jobDescription || "").toLowerCase();
  const hits = [];
  for (const raw of CL_JOB_KEYWORDS) {
    const phrase = raw.toLowerCase();
    const idx = jd.indexOf(phrase);
    if (idx !== -1) hits.push({ raw, idx });
  }
  hits.sort((a, b) => a.idx - b.idx);
  const out = [];
  const seen = new Set();
  for (const { raw } of hits) {
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

function prettifyKeywordPhrase(phrase) {
  const upper = { kyc: "KYC", aml: "AML", excel: "Excel" };
  return String(phrase || "")
    .split(/\s+/)
    .map((w) => {
      const key = w.toLowerCase();
      if (upper[key]) return upper[key];
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function experiencePhraseForCL(summary) {
  if (summary?.exp?.length) {
    const first = String(summary.exp[0] || "").trim();
    if (first) return first.length > 120 ? `${first.slice(0, 117)}…` : first;
  }
  if (summary?.summary) {
    const s = String(summary.summary).trim();
    const sentence = s.split(/[.!?]/)[0]?.trim() || s;
    return sentence.length > 120 ? `${sentence.slice(0, 117)}…` : sentence;
  }
  return "strong professional experience";
}

function industryKeywordsPhrase(keywordsOrdered, jobDescription) {
  const rest = keywordsOrdered.slice(2, 6).map(prettifyKeywordPhrase).filter(Boolean);
  if (rest.length) return rest.join(", ");
  const more = keywordsOrdered.slice(0, 4).map(prettifyKeywordPhrase).filter(Boolean);
  if (more.length) return more.join(", ");
  const jd = String(jobDescription || "").trim();
  if (jd.length > 20) return jd.split(/\s+/).slice(0, 8).join(" ");
  return "demanding professional environments";
}

function extractCityForIndiaTemplate(location) {
  const part = String(location || "")
    .split(",")[0]
    .trim();
  if (!part || /^uae|u\.a\.e\.|india$/i.test(part)) return "";
  return part;
}

function buildCoverLetterTemplateBodyUAE({ jobDescription, summary, resume, aboutYou }) {
  const roleFromJd = extractRole(jobDescription);
  const jobTitle = (summary?.role || resume?.title || "professional").trim() || "professional";
  const experiencePhrase = experiencePhraseForCL(summary);
  const kw = extractKeywords(jobDescription);
  const k1 = prettifyKeywordPhrase(kw[0] || "professional excellence");
  const k2 = prettifyKeywordPhrase(kw[1] || "measurable results");
  const industryPhrase = industryKeywordsPhrase(kw, jobDescription);
  const p1 = `I am writing to express my strong interest in the ${roleFromJd} position. With my background as a ${jobTitle} and ${experiencePhrase} in the UAE market, I bring a proven track record of ${k1} and ${k2}.`;
  const p2 = aboutYou
    ? transformRawInput(aboutYou, roleFromJd)
    : `Having worked in ${industryPhrase}, I understand the expectations of Gulf-based employers and consistently deliver results that align with organisational goals.`;
  const p3 = `I would welcome the opportunity to discuss how my experience can contribute to your team. Thank you for your consideration.`;
  return `${p1}\n\n${p2}\n\n${p3}`;
}

function buildCoverLetterTemplateBodyIndia({ jobDescription, summary, resume, aboutYou }) {
  const roleFromJd = extractRole(jobDescription);
  const experiencePhrase = experiencePhraseForCL(summary);
  const kw = extractKeywords(jobDescription);
  const k1 = prettifyKeywordPhrase(kw[0] || "professional excellence");
  const k2 = prettifyKeywordPhrase(kw[1] || "team collaboration");
  const industryPhrase = industryKeywordsPhrase(kw, jobDescription);
  const city = extractCityForIndiaTemplate(resume?.location || "") || "your organisation";
  const p1 = `I would like to apply for the ${roleFromJd} position at your esteemed organisation. With ${experiencePhrase}, I have developed strong expertise in ${k1} and ${k2}.`;
  const p2 = aboutYou
    ? transformRawInput(aboutYou, roleFromJd)
    : `My background in ${industryPhrase} has equipped me with the skills to contribute effectively to your team in ${city}.`;
  const p3 = `I am eager to bring my dedication and skills to this role and would appreciate the opportunity to discuss my application further.`;
  return `${p1}\n\n${p2}\n\n${p3}`;
}

function defaultLetterTemplateForCL({ resume, generatedBody, companyName, jobTitle, salutationLine, closingBlock }) {
  const fullName = resume?.name || "Candidate Name";
  const email = resume?.email || "email@example.com";
  const phone = resume?.phone || "Phone";
  const location = resume?.location || "Location";
  const companyLine = (companyName || "").trim() || "Company Name";
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
 * Upload flow uses the file name + pasted job description for /api/cover-letter.
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
  const [jobDescription, setJobDescription] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [activeResume, setActiveResume] = useState(null);
  const [genError, setGenError] = useState("");
  const [showDescribeSheet, setShowDescribeSheet] = useState(false);
  const [describeReady, setDescribeReady] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [clFreePreview, setClFreePreview] = useState(false);
  const [clTemplateVariant, setClTemplateVariant] = useState(null);
  const [clUnlocking, setClUnlocking] = useState(false);
  const uploadInputRef = useRef(null);
  const lastClPayloadRef = useRef(null);

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
    if (selectedOption !== "describe") {
      setDescribeReady(false);
      setAboutYou("");
      setShowDescribeSheet(false);
    }
  }, [selectedOption]);

  const resumeForApi = useMemo(() => {
    if (selectedOption === "describe") {
      const displayName =
        (user?.user_metadata?.name || user?.email?.split("@")[0] || "Candidate").trim();
      return {
        name: displayName,
        title: "",
        email: user?.email || "",
        phone: "",
        location: "",
        summary: aboutYou.trim(),
        experience: [],
        skills: "",
        languages: "",
        technicalSkills: "",
      };
    }
    return activeResume;
  }, [selectedOption, aboutYou, user, activeResume]);

  const canGenerate =
    selectedOption !== null &&
    ((selectedOption === "saved" &&
      selectedCvId &&
      savedList.some((r) => String(r.id) === String(selectedCvId) && r.cv_data) &&
      jobDescription.trim()) ||
      (selectedOption === "upload" && uploadResume && jobDescription.trim()) ||
      (selectedOption === "describe" && describeReady && aboutYou.trim() && jobDescription.trim()));

  const fullLetterDisplay = useMemo(() => {
    if (!letterBody || !resumeForApi) return "";
    const jt = jobDescription.split("\n")[0]?.slice(0, 120) || "Position";
    const fullName = resumeForApi?.name || "Candidate Name";
    let salutationLine;
    let closingBlock;
    if (clTemplateVariant === "uae") {
      salutationLine = "Dear Hiring Manager,";
      closingBlock = `Sincerely,\n${fullName}`;
    } else if (clTemplateVariant === "india") {
      salutationLine = "Dear Sir/Madam,";
      closingBlock = `Yours sincerely,\n${fullName}`;
    }
    return defaultLetterTemplateForCL({
      resume: resumeForApi,
      generatedBody: letterBody,
      companyName: "",
      jobTitle: jt,
      salutationLine,
      closingBlock,
    });
  }, [letterBody, resumeForApi, jobDescription, clTemplateVariant]);

  const clPreviewParts = useMemo(() => {
    if (!clFreePreview || !letterBody || !resumeForApi) return null;
    const fullName = resumeForApi?.name || "Candidate Name";
    const email = resumeForApi?.email || "email@example.com";
    const phone = resumeForApi?.phone || "Phone";
    const location = resumeForApi?.location || "Location";
    const dateLine = getTodayDateLabelCL();
    const header = `${fullName} | ${email} | ${phone} | ${location}\n${dateLine}\n\nCompany Name`;
    const salutation = clTemplateVariant === "india" ? "Dear Sir/Madam," : "Dear Hiring Manager,";
    const closing = clTemplateVariant === "india" ? `Yours sincerely,\n${fullName}` : `Sincerely,\n${fullName}`;
    const bodyParts = letterBody.split(/\n\n+/).filter(Boolean);
    const firstPara = bodyParts[0] || "";
    const restBody = bodyParts.slice(1).join("\n\n");
    return { header, salutation, firstPara, restBody, closing };
  }, [clFreePreview, letterBody, resumeForApi, clTemplateVariant]);

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
    if (!canGenerate) return;
    setGenError("");
    setPhase("loading");
    setLetterBody("");
    setClFreePreview(false);
    setClTemplateVariant(null);
    const minWait = new Promise((r) => setTimeout(r, 5000));
    const summary = buildImportedSummaryForCL(resumeForApi);
    const jobTitleGuess = jobDescription.split("\n")[0]?.slice(0, 120) || "Role";
    const requestPayload = {
      cvData: {
        name: summary.name,
        role: summary.role,
        summary: summary.summary,
        skills: summary.skills,
        experience: summary.exp,
        email: resumeForApi?.email || "",
        phone: resumeForApi?.phone || "",
        location: resumeForApi?.location || "",
      },
      jobTitle: jobTitleGuess,
      companyName: "",
      jobDescription: jobDescription.trim(),
      date: getTodayDateLabelCL(),
    };
    lastClPayloadRef.current = requestPayload;

    const paid = isCoverLetterPaidUnlock();

    if (!paid) {
      try {
        await minWait;
        const market = getCoverLetterPricingMarket();
        const templateBody =
          market === "India"
            ? buildCoverLetterTemplateBodyIndia({
                jobDescription: jobDescription.trim(),
                summary,
                resume: resumeForApi,
                aboutYou: aboutYou.trim(),
              })
            : buildCoverLetterTemplateBodyUAE({
                jobDescription: jobDescription.trim(),
                summary,
                resume: resumeForApi,
                aboutYou: aboutYou.trim(),
              });
        setLetterBody(templateBody);
        setClTemplateVariant(market === "India" ? "india" : "uae");
        setClFreePreview(true);
        setPhase("result");
      } catch (err) {
        console.error(err);
        setGenError(err.message || "Generation failed.");
        setPhase("entry");
      }
      return;
    }

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
      alert(e.message || "Could not unlock the full letter. Try again.");
    } finally {
      setClUnlocking(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#FFFFFF", fontFamily: "'DM Sans',sans-serif", padding: "16px 16px 96px", boxSizing: "border-box" }}>
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
                onClick={() => {
                  setSelectedOption(opt.id);
                  if (opt.id === "describe" && !describeReady) setShowDescribeSheet(true);
                }}
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

          {selectedOption === "describe" && describeReady && (
            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: 13, color: "#A0A0A0", display: "block", marginBottom: 8 }}>About you</label>
                <textarea
                  value={aboutYou}
                  onChange={(e) => setAboutYou(e.target.value)}
                  placeholder="Your background, strengths, and what you're looking for…"
                  style={{
                    width: "100%",
                    minHeight: 120,
                    padding: "12px 12px 28px",
                    borderRadius: 12,
                    border: "1px solid #2A2A2A",
                    background: "#141414",
                    color: "#FFF",
                    fontSize: 15,
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: 10,
                    fontSize: 12,
                    color: aboutYou.trim().length > 50 ? CL_GREEN : "#A0A0A0",
                  }}
                >
                  More detail = better letter
                </span>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#A0A0A0", display: "block", marginBottom: 8 }}>Job description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste or summarise the role you're applying for…"
                  style={{
                    width: "100%",
                    minHeight: 120,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #2A2A2A",
                    background: "#141414",
                    color: "#FFF",
                    fontSize: 15,
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}
                />
              </div>
            </div>
          )}

          {selectedOption && selectedOption !== "describe" && (
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 13, color: "#A0A0A0", display: "block", marginBottom: 8 }}>Job description</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste or summarise the role you're applying for…"
                style={{
                  width: "100%",
                  minHeight: 140,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #2A2A2A",
                  background: "#141414",
                  color: "#FFF",
                  fontSize: 15,
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              width: "100%",
              marginTop: 24,
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background: canGenerate ? CL_GREEN : "#1C1C1C",
              color: canGenerate ? "#000000" : "#A0A0A0",
              fontSize: 15,
              fontWeight: 700,
              cursor: canGenerate ? "pointer" : "not-allowed",
              boxShadow: canGenerate ? "0 0 16px rgba(110,231,183,0.3)" : "none",
            }}
          >
            Generate My Cover Letter
          </button>

          {showDescribeSheet ? (
            <div
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
              onClick={() => setShowDescribeSheet(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cl-describe-sheet-title"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 520,
                  maxHeight: "85vh",
                  overflow: "auto",
                  background: "#141414",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  border: "1px solid #2A2A2A",
                  borderBottom: "none",
                  padding: "12px 20px 28px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "#3A3A3A", margin: "0 auto 16px" }} />
                <h2 id="cl-describe-sheet-title" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: "#FFF" }}>
                  How to describe yourself
                </h2>
                <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
                  {[
                    { n: 1, t: "Your current or last job title", e: 'e.g. "Customer Service Officer"' },
                    { n: 2, t: "One line of experience", e: 'e.g. "3 years in retail banking, Dubai"' },
                    { n: 3, t: "Don't overthink it", e: "We personalise the rest using AI" },
                  ].map((row) => (
                    <div
                      key={row.n}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid #2A2A2A",
                        background: "#0A0A0A",
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: CL_GREEN,
                          color: "#000",
                          fontSize: 14,
                          fontWeight: 700,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {row.n}
                      </span>
                      <span>
                        <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "#FFF" }}>{row.t}</span>
                        <span style={{ display: "block", fontSize: 13, color: "#A0A0A0", marginTop: 4 }}>{row.e}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDescribeReady(true);
                    setShowDescribeSheet(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "none",
                    background: CL_GREEN,
                    color: "#000000",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Got it, let&apos;s go
                </button>
              </div>
            </div>
          ) : null}
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
                    ? "Unlock full letter — from ₹199"
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
    </div>
  );
}
function MobileTabBar({ currentPath, onNavigate, user }) {
  if (!user) return null;
  const show = ["/dashboard", "/ats", "/cover-letter", "/walk-in"].includes(currentPath);
  if (!show) return null;
  const tabs = [
    { id: "/dashboard", label: "My CVs", icon: <TabIconDoc /> },
    { id: "/ats", label: "ATS", icon: <TabIconTarget /> },
    { id: "/cover-letter", label: "Cover Letter", icon: <TabIconCoverLetter /> },
    { id: "/walk-in", label: "Walk-In", icon: <TabIconBolt /> },
    { id: "/dashboard", label: "Account", icon: <TabIconUser /> },
  ];
  return (
    <div
      className="cvp-mobile-tabbar"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: 64,
        background: "rgba(10,10,10,0.96)",
        borderTop: "1px solid #1E1E1E",
        display: "none",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        alignItems: "center",
        padding: "6px 6px 10px",
        backdropFilter: "blur(10px)",
        zIndex: 50,
      }}
    >
      {tabs.map((t) => (
        <button
          key={`${t.label}-${t.id}`}
          type="button"
          onClick={() => onNavigate(t.id)}
          style={{
            background: "transparent",
            border: "none",
            color: currentPath === t.id ? "#FFFFFF" : "#555",
            display: "grid",
            justifyItems: "center",
            gap: 4,
            cursor: "pointer",
            padding: 6,
          }}
        >
          {t.icon}
          <span style={{ fontSize: 11, fontWeight: 600, color: currentPath === t.id ? "#FFFFFF" : "#555" }}>
            {t.label}
          </span>
        </button>
      ))}
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
        overflowX: "hidden",
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

/** Customise tab: template row with scaled live preview thumbnail */
const BuilderTemplateCard = memo(function BuilderTemplateCard({ template: t, isSelected, resume, onSelect }) {
  const isFree = t.tier === "free";
  return (
    <button
      type="button"
      onClick={() => onSelect(t)}
      style={{
        width: "100%",
        height: 120,
        padding: 0,
        borderRadius: 8,
        border: isSelected ? "1px solid #FFFFFF" : "1px solid #2A2A2A",
        background: isSelected ? "#1C1C1C" : "#141414",
        cursor: "pointer",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: 90,
          overflow: "hidden",
          background: "#1C1C1C",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        <div
          style={{
            width: A4_PREVIEW_WIDTH_PX,
            transform: "scale(0.2)",
            transformOrigin: "top center",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        >
          <ResumePreview cv={resume} template={t} />
        </div>
      </div>
      <div
        style={{
          height: 30,
          minHeight: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 10px",
          boxSizing: "border-box",
          borderTop: "1px solid #2A2A2A",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#FFFFFF",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {t.name}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
            flexShrink: 0,
            background: isFree ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
            color: isFree ? "#10b981" : "#f59e0b",
          }}
        >
          {isFree ? "Free" : "Pro"}
        </span>
      </div>
    </button>
  );
});

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
    }
  }
}

// ─── PREVIEW: TEMPLATE THUMB WRAPPER ──────────────────────────────
const TemplateThumb = ({ children }) => (
  <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#fff", borderRadius: "12px" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: "794px", transformOrigin: "top left", transform: "scale(0.27)", pointerEvents: "none" }}>
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
  const [mobileView, setMobileView] = useState("edit");
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
  const [desktopPreviewScale, setDesktopPreviewScale] = useState(1);
  const [mobilePreviewScale, setMobilePreviewScale] = useState(1);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const measureFitWidth = (el) => {
    const w = el.getBoundingClientRect().width;
    if (w < 1) return null;
    return Math.min(1, w / A4_PREVIEW_WIDTH_PX);
  };

  useLayoutEffect(() => {
    const el = desktopPreviewFitRef.current;
    if (!el) return;
    const s = measureFitWidth(el);
    if (s != null) setDesktopPreviewScale(s);
  }, []);

  useLayoutEffect(() => {
    if (mobileView !== "preview") return;
    const el = mobilePreviewFitRef.current;
    if (!el) return;
    const s = measureFitWidth(el);
    if (s != null) setMobilePreviewScale(s);
  }, [mobileView]);

  useEffect(() => {
    const el = desktopPreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w < 1) continue;
        setDesktopPreviewScale(Math.min(1, w / A4_PREVIEW_WIDTH_PX));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (mobileView !== "preview") return;
    const el = mobilePreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w < 1) continue;
        setMobilePreviewScale(Math.min(1, w / A4_PREVIEW_WIDTH_PX));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mobileView]);

  useEffect(() => {
    previewScrollRef.current?.scrollTo(0, 0);
    mobilePreviewScrollRef.current?.scrollTo(0, 0);
  }, [selectedTemplate?.id]);

  const set = (k, v) => setResume(r => ({ ...r, [k]: v }));

  const score = (() => {
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
  })();
  const scoreColor = score >= 80 ? C.success : score >= 50 ? C.gold : C.danger;

  const customizePanel = (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Template</div>
      <div style={{ display: "grid", gap: 8 }}>
        {TEMPLATES.map((t) => (
          <BuilderTemplateCard
            key={t.id}
            template={t}
            isSelected={selectedTemplate?.id === t.id}
            resume={resume}
            onSelect={setSelectedTemplate}
          />
        ))}
      </div>
    </div>
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
    } catch(e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, resume, selectedTemplate, resumeId]);

  const handleDownload = async () => {
    setDownloading(true);
    const spinMs = 2000 + Math.floor(Math.random() * 1001);
    try {
      await new Promise((r) => setTimeout(r, spinMs));
      if (user?.id) await handleSave();
      const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
      const wasMobileEdit = isMobileViewport && mobileView === "edit";
      if (wasMobileEdit) setMobileView("preview");
      if (isMobileViewport) setMobilePreviewScale(1);
      await new Promise((r) => setTimeout(r, 500));

      const el = isMobileViewport ? mobileCvPreviewRef.current : desktopCvPreviewRef.current;
      if (!el) throw new Error("Preview not ready");
      await downloadResumeFromPreview(resume, el);

      if (wasMobileEdit) setMobileView("edit");
      if (isMobileViewport) setMobilePreviewScale(Math.min(1, window.innerWidth / 794));
    } catch (e) {
      alert("PDF error: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: 16, overflowX: "auto", flex: "1 1 auto", minWidth: 0 }}>
          <button type="button" onClick={onBack} aria-label="Back" className="cvp-builder-back" style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0, borderRadius: 8, border: "none", background: "transparent", color: "#A0A0A0", cursor: "pointer", display: "grid", placeItems: "center", transition: `color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {["content", "customize", "ats", "jobmatch"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setBuilderTab(tab); setMobileView("edit"); }}
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
                  transition: `background-color 150ms ${EASE}, color 150ms ${EASE}`,
                }}
              >
                {tab === "content" ? "Content" : tab === "customize" ? "Customise" : tab === "ats" ? "ATS Check" : "Job Match"}
              </button>
            ))}
          </div>
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
              <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
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
          {builderTab === "customize" && customizePanel}
          {builderTab === "ats" && (
            <div style={{ padding: 12, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor, marginBottom: 8 }}>{score}%</div>
              <div style={{ fontSize: 13, color: "#A0A0A0" }}>ATS readiness score. Add more sections and keywords to improve.</div>
            </div>
          )}
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
              <JobMatch resume={resume} selectedTemplate={selectedTemplate} isPro={isPro} />
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

      {/* Mobile: single column + Edit | Preview pill */}
      <div className="cvp-builder-mobile" style={{ display: "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {mobileView === "edit" ? (
          <div className="cvp-builder-mobile-form">
            {builderTab === "content" && (
              <>
                <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
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
            {builderTab === "customize" && customizePanel}
            {builderTab === "ats" && (
              <div style={{ padding: 12, display: "grid", gap: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor, marginBottom: 8 }}>{score}%</div>
                <div style={{ fontSize: 13, color: "#A0A0A0" }}>ATS readiness score.</div>
              </div>
            )}
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
                <JobMatch resume={resume} selectedTemplate={selectedTemplate} isPro={isPro} />
              </div>
            )}
          </div>
        ) : (
          ["banner", "twocol", "sidebar", "timeline", "gulf-exec", "banking", "compact-pro", "creative", "hospitality", "ats-intl", "tech-it"].includes(selectedTemplate?.layout) ? (
            <div
              ref={mobilePreviewScrollRef}
              style={{
                flex: 1,
                width: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                background: "#111111",
                padding: "16px 16px 160px",
                boxSizing: "border-box",
              }}
            >
              <div ref={mobileCvPreviewRef} className="cvp-builder-a4-fit" style={{ width: "100%" }}>
                <ResumePreview cv={resume} template={selectedTemplate} mobileMode />
              </div>
            </div>
          ) : (
            <div
              ref={mobilePreviewScrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                background: "#111111",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "16px 0",
              }}
            >
              <BuilderA4PreviewScaled
                cv={resume}
                template={selectedTemplate}
                scale={mobilePreviewScale}
                fitRef={mobilePreviewFitRef}
                padded
                previewCardRef={mobileCvPreviewRef}
              />
            </div>
          )
        )}
        {builderTab === "content" && (
          <div className="cvp-builder-bottom-bar">
            <div className="cvp-builder-toggle-pill">
              <button type="button" onClick={() => setMobileView("edit")} className={mobileView === "edit" ? "cvp-toggle-active" : "cvp-toggle-inactive"}>Edit</button>
              <button type="button" onClick={() => setMobileView("preview")} className={mobileView === "preview" ? "cvp-toggle-active" : "cvp-toggle-inactive"}>Preview</button>
            </div>
            <div className="cvp-builder-mobile-download">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: "#FFFFFF",
                  color: "#000000",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: downloading ? "not-allowed" : "pointer",
                  transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                {downloading ? (
                  <>
                    <span style={{ display: "inline-flex", transform: "scale(0.42)", transformOrigin: "center" }}>
                      <CoverLetterSpinnerArrow size={44} />
                    </span>
                    Preparing...
                  </>
                ) : (
                  "Download CV"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <CoverLetterModal
        isOpen={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
        resume={resume}
      />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

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

// Accordion row inside .cvp-sections-list — unified list style
function AccordionSection({ id, title, isOpen, onToggle, icon, children }) {
  const ease = "cubic-bezier(0.4,0,0.2,1)";
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
            {icon === "summary" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>}
            {icon === "experience" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
            {icon === "education" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>}
            {icon === "skills" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
            {icon === "languages" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
            {icon === "certifications" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15l-2 2 2 2 2-2-2-2z" /><path d="M4 4h16v16H4z" /></svg>}
            {icon === "projects" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>}
            {icon === "volunteer" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
            {icon === "publications" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
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
            <MobileTabBar currentPath={currentPath} onNavigate={navigate} user={user} />
            <Analytics />
          </div>
        }
      />
    </Routes>
  );
}