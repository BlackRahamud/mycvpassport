import { useState, useMemo, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { trimCanvasBottomWhitespace } from "./experiencePointsPreview";

/**
 * @typedef {Object} CVData
 * @property {string} fullName
 * @property {string} phone
 * @property {string} email
 * @property {string} location
 * @property {string} nationality
 * @property {string} jobField
 * @property {string} jobCustom
 * @property {string} experience
 * @property {string} visaStatus
 * @property {string} drivingLicence
 * @property {string} availability
 * @property {string[]} topSkills
 * @property {string[]} languages
 * @property {string} languageCustom
 * @property {string} references
 */

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

const TOKENS = {
  bgPage: "#0A0A0A",
  bgSurface: "#141414",
  bgElevated: "#1C1C1C",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A0",
  borderDefault: "#2A2A2A",
  accentPrimary: "#FFFFFF",
  accentText: "#000000",
  chipUnselectedBg: "#0D0D0D",
  chipUnselectedBorder: "#1C1C1C",
  chipUnselectedText: "#3A3A3A",
  inputBg: "#111111",
  inputBorder: "#1C1C1C",
  greenBadge: "#6EE7B7",
  whatsapp: "#25D366",
};

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

const JOBS_DEFAULT = ["Driver", "Construction Worker", "Waiter"];

const JOBS_EXPANDED = [
  "Plumber",
  "Mechanic",
  "AC Technician",
  "Welder",
  "Painter",
  "Carpenter",
  "Mason",
  "Scaffolder",
  "Delivery Rider",
  "Barista",
  "Cashier",
  "Cleaner",
  "Storekeeper",
  "Receptionist",
  "Security Guard",
  "Housekeeping",
];

const ALL_JOBS = [...JOBS_DEFAULT, ...JOBS_EXPANDED];

const JOB_SKILLS = {
  Driver: ["Driving (Heavy)", "Route Planning", "Vehicle Maintenance", "Forklift", "Safety Certified"],
  "Construction Worker": ["Site Safety", "Manual Labor", "Tool Operation", "Scaffolding", "Team Work"],
  Waiter: ["Customer Service", "Food Handling", "Communication", "POS Systems", "Multi-tasking"],
  Plumber: ["Pipe Fitting", "Leak Detection", "Plumbing Systems", "Hand Tools", "Safety"],
  Mechanic: ["Engine Repair", "Diagnostics", "Vehicle Maintenance", "Tools", "Electrical"],
  "AC Technician": ["AC Repair", "Installation", "Refrigeration", "Electrical Wiring", "Safety"],
  Welder: ["Arc Welding", "MIG Welding", "Metal Cutting", "Safety", "Blueprint Reading"],
  "Security Guard": ["Surveillance", "Access Control", "Emergency Response", "Reporting", "First Aid"],
  Housekeeping: ["Cleaning", "Laundry", "Room Service", "Attention to Detail", "Time Management"],
  "Delivery Rider": ["Route Planning", "Driving", "Customer Service", "Navigation", "Time Management"],
  Cleaner: ["Cleaning", "Sanitisation", "Equipment Use", "Time Management", "Attention to Detail"],
};

const DEFAULT_SKILLS = ["Communication", "Teamwork", "Time Management", "Problem Solving", "MS Office"];

const EXPERIENCE_OPTIONS = ["Fresher", "1–3 yrs", "3–5 yrs", "5+ yrs"];
const VISA_OPTIONS = ["Employment", "Visit", "Own", "Cancelled"];
const LICENCE_OPTIONS = ["UAE Licence", "Home Country", "None"];
const AVAILABILITY_OPTIONS = ["Immediate", "1 month", "3 months"];
const LANGUAGE_PRESETS = ["English", "Hindi", "Arabic", "Urdu"];

const EMPTY_RESUME = {
  name: "",
  email: "",
  phone: "",
  location: "Dubai, UAE",
  title: "",
  summary: "",
  nationality: "",
  visaStatus: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  experience: [{ company: "", role: "", location: "", period: "", points: "" }],
  education: [{ school: "", degree: "", year: "" }],
  skills: "",
  languages: "English, Hindi",
  certifications: "",
  technicalSkills: "",
  availability: "Immediately Available",
  drivingLicense: "",
  willingToRelocate: "Yes",
  references: "References available upon request",
};

const TEMPLATES = [
  { id: 1, name: "Gulf Classic", tier: "free", color: "#1a1a2e", accent: "#e94560", desc: "", layout: "banner" },
];

function getSkillsForJob(jobLabel) {
  if (!jobLabel) return DEFAULT_SKILLS;
  const k = Object.keys(JOB_SKILLS).find((j) => j.toLowerCase() === jobLabel.trim().toLowerCase());
  if (k) return JOB_SKILLS[k];
  return DEFAULT_SKILLS;
}

function languageBarPercent(name) {
  const n = (name || "").trim().toLowerCase();
  if (n === "english") return 80;
  if (n === "arabic") return 40;
  if (["hindi", "urdu", "tamil", "malayalam", "tagalog"].includes(n)) return 100;
  if (n === "bengali") return 95;
  return 90;
}

function experiencePhrase(exp) {
  switch (exp) {
    case "Fresher":
      return "0 years";
    case "1–3 yrs":
      return "1–3 years";
    case "3–5 yrs":
      return "3–5 years";
    case "5+ yrs":
      return "5+ years";
    default:
      return exp || "several years";
  }
}

function availabilityPhrase(av) {
  if (av === "Immediate") return "Immediately available";
  if (av === "1 month") return "Available in 1 month";
  if (av === "3 months") return "Available in 3 months";
  return av || "Open";
}

function genericJobLines(jobLabel) {
  const j = (jobLabel || "professional").toLowerCase();
  return [
    `Delivered reliable performance as a ${j} in fast-paced UAE work environments.`,
    `Maintained safety standards, teamwork, and clear communication with supervisors and clients.`,
  ];
}

async function captureWalkInPdf(captureElement, fileNameBase) {
  const el = captureElement;
  if (!el) return;
  const parentEl = el.parentElement;
  const prevParentTransform = parentEl ? parentEl.style.transform : null;
  const prevParentTransformOrigin = parentEl ? parentEl.style.transformOrigin : null;
  const prevWidth = el.style.width;
  const prevMaxWidth = el.style.maxWidth;
  const prevMinWidth = el.style.minWidth;
  el.style.width = "794px";
  el.style.maxWidth = "794px";
  el.style.minWidth = "794px";
  el.style.minHeight = "0";
  el.style.height = "auto";
  if (parentEl) {
    parentEl.style.transform = "none";
    parentEl.style.transformOrigin = "top center";
  }
  await new Promise((r) => setTimeout(r, 400));
  const fullHeight = el.scrollHeight;
  el.style.height = `${fullHeight}px`;
  el.style.overflow = "visible";

  let canvas;
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }
    canvas = await html2canvas(el, {
      scale: window.devicePixelRatio > 1.5 ? 1.5 : 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      imageTimeout: 0,
      logging: false,
    });
  } finally {
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
    el.style.minWidth = prevMinWidth;
    el.style.minHeight = "";
    el.style.height = "";
    el.style.overflow = "";
    if (parentEl && prevParentTransform !== null) {
      parentEl.style.transform = prevParentTransform;
      parentEl.style.transformOrigin = prevParentTransformOrigin;
    }
  }

  canvas = trimCanvasBottomWhitespace(canvas);
  const pageWidth = 210;
  const pageHeight = 297;
  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const canvasAspect = canvas.width / canvas.height;
  const imgHeight = pageWidth / canvasAspect;
  const PAGE_SLICE_OVERLAP_PX = 48;

  if (imgHeight <= pageHeight) {
    doc.addImage(imgData, "JPEG", 0, 0, pageWidth, imgHeight);
  } else {
    const pxPerMm = canvas.width / 210;
    const pageHeightPx = Math.floor(297 * pxPerMm);
    let yOffset = 0;
    let pageNum = 0;
    while (yOffset < canvas.height) {
      const remaining = canvas.height - yOffset;
      const sliceHeight = Math.min(pageHeightPx, remaining);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = pageHeightPx;
      const ctx = sliceCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      const sliceData = sliceCanvas.toDataURL("image/jpeg", 1.0);
      if (pageNum > 0) doc.addPage();
      doc.addImage(sliceData, "JPEG", 0, 0, 210, 297);
      yOffset += sliceHeight;
      if (yOffset < canvas.height) yOffset -= PAGE_SLICE_OVERLAP_PX;
      pageNum++;
    }
  }
  doc.save(`${fileNameBase.replace(/\s+/g, "_")}_WalkIn_CV.pdf`);
}

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        border: selected ? `1px solid ${TOKENS.accentPrimary}` : `1px solid ${TOKENS.chipUnselectedBorder}`,
        background: selected ? "#FFF" : TOKENS.chipUnselectedBg,
        color: selected ? TOKENS.accentText : TOKENS.chipUnselectedText,
        fontFamily: FONT,
        transition: `background 150ms ${EASE}, color 150ms ${EASE}, border-color 150ms ${EASE}`,
      }}
    >
      {label}
    </button>
  );
}

function SectionHeading({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ width: 16, height: 1.5, background: "#1A2A1A", display: "inline-block", flexShrink: 0 }} />
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#AAA",
          fontFamily: FONT,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <circle cx="12" cy="12" r="11" fill="#111" />
      <path
        d="M7 12l3 3 7-7"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WalkInCvPreview({ data }) {
  const displayJob = (data.jobCustom || "").trim() || data.jobField || "Professional";
  const expPhrase = experiencePhrase(data.experience);
  const availPhrase = availabilityPhrase(data.availability);
  const profileText = `Experienced ${displayJob} with ${expPhrase} of hands-on experience in UAE. ${data.visaStatus || ""} Visa holder. ${availPhrase} for new opportunities in ${data.location || "the UAE"}.`;

  const langs = useMemo(() => {
    const base = [...(data.languages || [])];
    if (data.languageCustom) {
      data.languageCustom.split(",").forEach((p) => {
        const t = p.trim();
        if (t) base.push(t);
      });
    }
    return [...new Set(base)];
  }, [data.languages, data.languageCustom]);

  const skillPills = useMemo(() => {
    const sug = getSkillsForJob(displayJob);
    const picked = (data.topSkills || []).length ? data.topSkills : sug.slice(0, 5);
    return picked;
  }, [data.topSkills, displayJob]);

  const lines = genericJobLines(displayJob);

  return (
    <div
      id="cv-preview"
      style={{
        width: "100%",
        maxWidth: 794,
        margin: "0 auto",
        background: "#fff",
        color: "#111",
        fontFamily: FONT,
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid #E8E8E8",
      }}
    >
      {/* Header */}
      <div style={{ position: "relative", background: "#0D1117", color: "#fff", padding: "16px 16px 12px 20px" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: TOKENS.greenBadge,
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingLeft: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, color: "#fff" }}>
              {data.fullName || "Your name"}
            </div>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#888", marginTop: 4 }}>
              {displayJob}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 9, color: "#444", lineHeight: 1.6 }}>
            <div>{data.phone || "—"}</div>
            <div>{data.email || "—"}</div>
            <div>{data.location || "—"}</div>
            <div>{data.nationality || "—"}</div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1A2A1A", marginTop: 12, paddingTop: 10 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#052E16",
              color: TOKENS.greenBadge,
              border: "1px solid #166834",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 9,
              fontWeight: 500,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: TOKENS.greenBadge }} />
            {data.availability || "Availability"}
          </span>
          {[data.visaStatus, data.drivingLicence, data.experience].map(
            (t, i) =>
              t && (
                <span
                  key={i}
                  style={{
                    background: "#161616",
                    color: "#888",
                    border: "1px solid #222",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 9,
                    fontWeight: 500,
                  }}
                >
                  {i === 0 ? `Visa: ${t}` : i === 1 ? `Licence: ${t}` : `Experience: ${t}`}
                </span>
              ),
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", minHeight: 280 }}>
        <div style={{ padding: "14px 16px 14px 20px" }}>
          <SectionHeading>Profile</SectionHeading>
          <p style={{ fontSize: 9.5, color: "#555", lineHeight: 1.65, margin: "0 0 14px" }}>{profileText}</p>

          <SectionHeading>Experience</SectionHeading>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 9.5, color: "#111" }}>{displayJob}</div>
            <div style={{ fontSize: 8.5, color: "#AAA" }}>
              {data.location || "UAE"} · {data.experience || "—"}
            </div>
            {lines.map((line, idx) => (
              <p key={idx} style={{ fontSize: 9.5, color: "#555", margin: "6px 0 0", lineHeight: 1.5 }}>
                {line}
              </p>
            ))}
          </div>

          <SectionHeading>Skills</SectionHeading>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {skillPills.map((s) => (
              <span
                key={s}
                style={{
                  background: "#0D1117",
                  color: "#fff",
                  borderRadius: 20,
                  fontSize: 8.5,
                  padding: "2px 9px",
                  fontWeight: 500,
                }}
              >
                {s}
              </span>
            ))}
          </div>

          {data.references ? (
            <>
              <SectionHeading>References</SectionHeading>
              <p style={{ fontSize: 9, color: "#555", fontStyle: "italic", margin: 0 }}>{data.references}</p>
            </>
          ) : null}
        </div>

        <div
          style={{
            background: "#FAFAFA",
            borderLeft: "0.5px solid #F0F0F0",
            padding: "14px 12px",
            fontSize: 8.5,
            color: "#555",
          }}
        >
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: "#888", marginBottom: 8 }}>Languages</div>
          {langs.length === 0 ? (
            <div style={{ color: "#AAA" }}>—</div>
          ) : (
            langs.map((lang) => (
              <div key={lang} style={{ marginBottom: 10 }}>
                <div style={{ marginBottom: 4 }}>{lang}</div>
                <div style={{ height: 2.5, background: "#EBEBEB", borderRadius: 2, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${languageBarPercent(lang)}%`,
                      background: "#1A2A1A",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))
          )}
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: "#888", margin: "16px 0 8px" }}>
            Key details
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[data.drivingLicence, data.visaStatus, data.nationality, data.availability].map(
              (item, idx) =>
                item && (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <CheckIcon />
                    <span>{item}</span>
                  </div>
                ),
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#F5F5F3",
          borderTop: "0.5px solid #EBEBEB",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 7.5,
        }}
      >
        <span style={{ color: "#BBB" }}>Walk-In Express · mycvpassport.com</span>
        <span style={{ color: "#CCC", textTransform: "uppercase", letterSpacing: 0.5 }}>CVPassport</span>
      </div>
    </div>
  );
}

export default function WalkInMode({ onBack, onComplete, setResume, setSelectedTemplate }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  /** @type {[CVData, function]} */
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    location: "",
    nationality: "",
    jobField: "",
    jobCustom: "",
    experience: "",
    visaStatus: "",
    drivingLicence: "",
    availability: "",
    topSkills: [],
    languages: [],
    languageCustom: "",
    references: "",
  });

  const [jobsExpanded, setJobsExpanded] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const displayJob = useMemo(
    () => (formData.jobCustom || "").trim() || formData.jobField,
    [formData.jobCustom, formData.jobField],
  );

  const suggestedSkills = useMemo(() => getSkillsForJob(displayJob), [displayJob]);

  const toggleJob = (label) => {
    setFormData((prev) => ({
      ...prev,
      jobField: prev.jobField === label ? "" : label,
      jobCustom: "",
    }));
  };

  const toggleSkill = (s) => {
    setFormData((prev) => {
      const set = new Set(prev.topSkills);
      if (set.has(s)) set.delete(s);
      else set.add(s);
      return { ...prev, topSkills: [...set] };
    });
  };

  const toggleLanguage = (lang) => {
    setFormData((prev) => {
      const set = new Set(prev.languages);
      if (set.has(lang)) set.delete(lang);
      else set.add(lang);
      return { ...prev, languages: [...set] };
    });
  };

  const addCustomSkill = useCallback(() => {
    const t = customSkillInput.trim();
    if (!t) return;
    setFormData((prev) => ({ ...prev, topSkills: [...new Set([...prev.topSkills, t])] }));
    setCustomSkillInput("");
  }, [customSkillInput]);

  const buildResumePayload = useCallback(() => {
    const jobTitle = displayJob || "Professional";
    const skillsStr = (formData.topSkills.length ? formData.topSkills : suggestedSkills).join(", ");
    const langStr = [
      ...formData.languages,
      ...(formData.languageCustom ? formData.languageCustom.split(",").map((x) => x.trim()).filter(Boolean) : []),
    ].join(", ");

    const summary = `Experienced ${jobTitle} with ${experiencePhrase(formData.experience)} of hands-on experience in UAE. ${formData.visaStatus || ""} visa. ${availabilityPhrase(formData.availability)} for opportunities in ${formData.location || "UAE"}.`;

    return {
      ...EMPTY_RESUME,
      name: formData.fullName,
      title: jobTitle,
      phone: formData.phone,
      email: formData.email,
      location: formData.location || "UAE",
      nationality: formData.nationality,
      visaStatus: formData.visaStatus,
      drivingLicense: formData.drivingLicence,
      availability: formData.availability,
      skills: skillsStr,
      languages: langStr || "English",
      references: formData.references || EMPTY_RESUME.references,
      summary,
      experience: [
        {
          company: "Various employers — UAE",
          role: jobTitle,
          location: formData.location || "UAE",
          period: formData.experience || "",
          points: genericJobLines(jobTitle).join("\n"),
        },
      ],
    };
  }, [formData, displayJob, suggestedSkills]);

  const handleGoBuilder = () => {
    const prefilled = buildResumePayload();
    sessionStorage.setItem("walkInResume", JSON.stringify(prefilled));
    setResume(prefilled);
    setSelectedTemplate(TEMPLATES[0]);
    onComplete();
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById("cv-preview");
    if (!el) return;
    setPdfBusy(true);
    try {
      await captureWalkInPdf(el, formData.fullName || "Resume");
    } finally {
      setPdfBusy(false);
    }
  };

  const handleWhatsApp = () => {
    const job = displayJob || "selected";
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `Hi, please find my CV for the ${job} role.\n\n` +
          `Name: ${formData.fullName}\n` +
          `Phone: ${formData.phone}\n` +
          `Email: ${formData.email}\n` +
          `Location: ${formData.location}\n` +
          `Visa: ${formData.visaStatus}\n` +
          `Licence: ${formData.drivingLicence}\n` +
          `Available: ${formData.availability}\n\n` +
          `CV created with CVPassport — mycvpassport.com/walk-in`,
      )}`,
      "_blank",
    );
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    background: TOKENS.inputBg,
    border: `1px solid ${TOKENS.inputBorder}`,
    borderRadius: 10,
    color: TOKENS.textPrimary,
    fontSize: 11,
    outline: "none",
    fontFamily: FONT,
    boxSizing: "border-box",
  };

  const labelStyle = { display: "block", fontSize: 11, fontWeight: 500, color: TOKENS.textSecondary, marginBottom: 6 };

  const visibleJobs = jobsExpanded ? ALL_JOBS : JOBS_DEFAULT;

  const formSection = (
    <div
      style={{
        background: TOKENS.bgSurface,
        border: `1px solid ${TOKENS.borderDefault}`,
        borderRadius: 16,
        padding: isMobile ? 16 : 24,
        paddingBottom: isMobile ? 200 : 24,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "transparent",
          border: "none",
          color: TOKENS.textSecondary,
          fontSize: 11,
          cursor: "pointer",
          marginBottom: 20,
          fontFamily: FONT,
        }}
      >
        ← Back
      </button>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: TOKENS.textPrimary, margin: "0 0 8px", letterSpacing: -0.5 }}>
        Walk-In CV Builder
      </h1>
      <p style={{ fontSize: 11, color: TOKENS.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
        Quick Gulf-ready CV for walk-in interviews. Fill the form — preview updates live.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>Full name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Ahmed Mohammed"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Phone (WhatsApp)</label>
          <input
            style={inputStyle}
            type="tel"
            placeholder="+971 50 123 4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            placeholder="e.g. ahmed@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input
            style={inputStyle}
            placeholder="e.g. Dubai"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Nationality</label>
          <input
            style={inputStyle}
            placeholder="e.g. Indian"
            value={formData.nationality}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
          />
        </div>

        <div>
          <label style={labelStyle}>Job field</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {visibleJobs.map((j) => (
              <Chip key={j} label={j} selected={formData.jobField === j && !formData.jobCustom} onClick={() => toggleJob(j)} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setJobsExpanded(!jobsExpanded)}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              color: TOKENS.accentPrimary,
              fontSize: 11,
              cursor: "pointer",
              padding: 0,
              fontFamily: FONT,
            }}
          >
            {jobsExpanded ? "see less ↑" : "+ see more jobs"}
          </button>
          <input
            style={{ ...inputStyle, marginTop: 12, borderStyle: "dashed" }}
            placeholder="Or type your job"
            value={formData.jobCustom}
            onChange={(e) => setFormData({ ...formData, jobCustom: e.target.value, jobField: "" })}
          />
        </div>

        <div>
          <label style={labelStyle}>Experience</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXPERIENCE_OPTIONS.map((x) => (
              <Chip
                key={x}
                label={x}
                selected={formData.experience === x}
                onClick={() => setFormData({ ...formData, experience: formData.experience === x ? "" : x })}
              />
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Visa status</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {VISA_OPTIONS.map((x) => (
              <Chip
                key={x}
                label={x}
                selected={formData.visaStatus === x}
                onClick={() => setFormData({ ...formData, visaStatus: formData.visaStatus === x ? "" : x })}
              />
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Driving licence</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LICENCE_OPTIONS.map((x) => (
              <Chip
                key={x}
                label={x}
                selected={formData.drivingLicence === x}
                onClick={() => setFormData({ ...formData, drivingLicence: formData.drivingLicence === x ? "" : x })}
              />
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Availability</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {AVAILABILITY_OPTIONS.map((x) => (
              <Chip
                key={x}
                label={x}
                selected={formData.availability === x}
                onClick={() => setFormData({ ...formData, availability: formData.availability === x ? "" : x })}
              />
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Top skills</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestedSkills.map((s) => (
              <Chip key={s} label={s} selected={formData.topSkills.includes(s)} onClick={() => toggleSkill(s)} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Add your own skill"
              value={customSkillInput}
              onChange={(e) => setCustomSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
            />
            <button
              type="button"
              onClick={addCustomSkill}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: `1px solid ${TOKENS.borderDefault}`,
                background: TOKENS.bgElevated,
                color: TOKENS.textPrimary,
                fontWeight: 500,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Languages</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LANGUAGE_PRESETS.map((lang) => (
              <Chip
                key={lang}
                label={lang}
                selected={formData.languages.includes(lang)}
                onClick={() => toggleLanguage(lang)}
              />
            ))}
          </div>
          <input
            style={{ ...inputStyle, marginTop: 10 }}
            placeholder="Add other languages (comma separated)"
            value={formData.languageCustom}
            onChange={(e) => setFormData({ ...formData, languageCustom: e.target.value })}
          />
        </div>

        <div>
          <label style={labelStyle}>References</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            placeholder="Optional reference note"
            value={formData.references}
            onChange={(e) => setFormData({ ...formData, references: e.target.value })}
          />
        </div>
      </div>

      {!isMobile && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            disabled={pdfBusy}
            onClick={handleDownloadPdf}
            style={{
              background: "#FFFFFF",
              color: "#000000",
              border: "none",
              borderRadius: 12,
              padding: 14,
              fontWeight: 700,
              fontSize: 11,
              cursor: pdfBusy ? "wait" : "pointer",
              boxShadow: "0 0 20px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.05)",
              transition: "box-shadow 300ms ease, opacity 300ms ease",
              fontFamily: FONT,
            }}
          >
            {pdfBusy ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            style={{
              background: TOKENS.whatsapp,
              color: "#ffffff",
              border: "none",
              borderRadius: 12,
              padding: 14,
              fontWeight: 700,
              fontSize: 11,
            cursor: "pointer",
              boxShadow: "0 0 20px rgba(37,211,102,0.3), 0 0 40px rgba(37,211,102,0.1)",
              transition: "box-shadow 300ms ease, opacity 300ms ease",
              fontFamily: FONT,
            }}
          >
            Share via WhatsApp
          </button>
          <button
            type="button"
            onClick={handleGoBuilder}
            style={{
              background: "transparent",
              border: "none",
              color: "#2A2A2A",
              fontSize: 12,
              textAlign: "center",
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Want a full CV? Build it here →
          </button>
        </div>
      )}
    </div>
  );

  const previewSection = (
    <div style={{ position: isMobile ? "relative" : "sticky", top: isMobile ? 0 : 24, alignSelf: "start" }}>
      <WalkInCvPreview data={formData} />
    </div>
  );

  const fixedMobileActions = isMobile ? (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "rgba(10,10,10,0.96)",
        borderTop: `1px solid ${TOKENS.borderDefault}`,
        padding: "12px 16px 16px",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          disabled={pdfBusy}
          onClick={handleDownloadPdf}
          style={{
            background: "#FFFFFF",
            color: "#000000",
            border: "none",
            borderRadius: 12,
            padding: 14,
            fontWeight: 700,
            fontSize: 11,
            cursor: pdfBusy ? "wait" : "pointer",
            boxShadow: "0 0 20px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.05)",
            fontFamily: FONT,
          }}
        >
          {pdfBusy ? "Preparing PDF…" : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          style={{
            background: TOKENS.whatsapp,
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            padding: 14,
            fontWeight: 700,
            fontSize: 11,
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(37,211,102,0.3), 0 0 40px rgba(37,211,102,0.1)",
            fontFamily: FONT,
          }}
        >
          Share via WhatsApp
        </button>
        <button
          type="button"
          onClick={handleGoBuilder}
          style={{
            background: "transparent",
            border: "none",
            color: "#A0A0A0",
            fontSize: 12,
            textAlign: "center",
            cursor: "pointer",
            paddingBottom: 4,
            fontFamily: FONT,
          }}
        >
          Want a full CV? Build it here →
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: TOKENS.bgPage,
        color: TOKENS.textPrimary,
        fontFamily: FONT,
        padding: isMobile ? "24px 16px" : "48px 24px",
        paddingBottom: isMobile ? 32 : 48,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(320px, 1fr)",
          gap: isMobile ? 24 : 40,
          alignItems: "start",
        }}
      >
        {formSection}
        {previewSection}
      </div>
      {fixedMobileActions}
    </div>
  );
}
