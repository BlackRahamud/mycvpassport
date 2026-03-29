import { useState, useMemo, useCallback, useEffect } from "react";
import { FAB } from "./components/FAB";
import { writeFabMemory } from "./components/FAB/FABLogic";

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
  { id: 1, name: "Modern Emerald", tier: "free", color: "#1a1a2e", accent: "#e94560", desc: "", layout: "banner" },
];

function getSkillsForJob(jobLabel) {
  if (!jobLabel) return DEFAULT_SKILLS;
  const k = Object.keys(JOB_SKILLS).find((j) => j.toLowerCase() === jobLabel.trim().toLowerCase());
  if (k) return JOB_SKILLS[k];
  return DEFAULT_SKILLS;
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

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body>
  <div class="cvp-root" style="width:794px;margin:0;padding:0;">${el.outerHTML}</div>
</body>
</html>`;

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
  a.download = `${fileNameBase.replace(/\s+/g, "_")}_WalkIn_CV.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ width: 20, height: 1, background: "#bbb", display: "inline-block", flexShrink: 0 }} />
      <span
        style={{
          fontSize: 8,
          fontWeight: 500,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: "#999",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function WalkInCvPreview({ data }) {
  const displayJob = (data.jobCustom || "").trim() || data.jobField || "Professional";
  const expPhrase = experiencePhrase(data.experience);
  const availPhrase = availabilityPhrase(data.availability);
  const profileText = `Experienced ${displayJob} with ${expPhrase} of hands-on experience in UAE. ${data.visaStatus || ""} Visa holder. ${availPhrase} for new opportunities in ${data.location || "the UAE"}.`;

  const languagesText = useMemo(() => {
    const base = [...(data.languages || [])];
    if (data.languageCustom) {
      data.languageCustom.split(",").forEach((p) => {
        const t = p.trim();
        if (t) base.push(t);
      });
    }
    const unique = [...new Set(base)];
    return unique.length ? unique.join(", ") : "English";
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
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid #E8E8E8",
        display: "flex",
        flexDirection: "column",
        minHeight: 1123,
      }}
    >
      <div style={{ background: "#0d0d0d", color: "#fff", padding: "36px 48px 30px" }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>{data.fullName || "Your name"}</div>
        <div style={{ marginTop: 8, fontSize: 10, color: "#888", letterSpacing: 3, textTransform: "uppercase", fontWeight: 500 }}>
          {displayJob}
        </div>
        <span
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 12px",
            borderRadius: 20,
            border: "1px solid #2d4a2d",
            background: "#1a2e1a",
            fontSize: 9,
            color: "#4ade80",
            fontWeight: 500,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
          Available Immediately · Visa Holder · UAE
        </span>
      </div>

      <div style={{ padding: "26px 48px 0", flex: "1 1 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 32, paddingBottom: 14, borderBottom: "1px solid #ebebeb", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 7.5, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Phone</div>
            <div style={{ fontSize: 10, color: "#222", fontWeight: 600 }}>{data.phone || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 7.5, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 10, color: "#222", fontWeight: 600 }}>{data.email || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 7.5, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Location</div>
            <div style={{ fontSize: 10, color: "#222", fontWeight: 600 }}>{data.location || "UAE"}</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionHeading>Profile</SectionHeading>
          <p style={{ fontSize: 10, color: "#333", lineHeight: 1.8, margin: 0 }}>{profileText}</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionHeading>Experience</SectionHeading>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: "#111" }}>{displayJob}</div>
              <div style={{ fontSize: 9, color: "#999", textAlign: "right" }}>{data.experience || "Current"}</div>
            </div>
            <div style={{ fontSize: 9.5, color: "#777", marginTop: 3 }}>
              Various employers — {data.location || "UAE"}
            </div>
            {lines.slice(0, 2).map((line, idx) => (
              <p key={idx} style={{ fontSize: 10, color: "#444", margin: "8px 0 0", lineHeight: 1.8 }}>
                · {line}
              </p>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionHeading>Skills</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {skillPills.map((s) => (
              <span
                key={s}
                style={{
                  background: "#111",
                  color: "#fff",
                  borderRadius: 20,
                  fontSize: 9,
                  padding: "6px 0",
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionHeading>Key details</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 40, rowGap: 16 }}>
            <div>
              <div style={{ fontSize: 7.5, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Nationality</div>
              <div style={{ fontSize: 10.5, color: "#111", fontWeight: 600 }}>{data.nationality || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 7.5, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Languages</div>
              <div style={{ fontSize: 10.5, color: "#111", fontWeight: 600 }}>{languagesText}</div>
            </div>
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #f0f0f0", height: 0 }} />
            <div>
              <div style={{ fontSize: 7.5, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Visa status</div>
              <div style={{ fontSize: 10.5, color: "#111", fontWeight: 600 }}>{data.visaStatus || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 7.5, color: "#999", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Notice period</div>
              <div style={{ fontSize: 10.5, color: "#111", fontWeight: 600 }}>{data.availability || "Immediate"}</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "auto",
          background: "#fff",
          borderTop: "1px solid #ebebeb",
          padding: "12px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ color: "#555", fontSize: 9, fontWeight: 500 }}>Created with CVPassport</span>
          <span style={{ color: "#555", fontSize: 9, fontWeight: 500 }}>mycvpassport.com</span>
        </div>
        <img
          src="https://chart.googleapis.com/chart?chs=60x60&cht=qr&chl=https://mycvpassport.com"
          alt="QR to mycvpassport.com"
          width={60}
          height={60}
          style={{ display: "block", border: "none" }}
        />
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

  useEffect(() => {
    writeFabMemory({ lastTabVisited: "walkin" });
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
        paddingBottom: 24,
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
    </div>
  );

  const previewSection = (
    <div
      style={{
        position: isMobile ? "relative" : "sticky",
        top: isMobile ? 0 : 24,
        alignSelf: "start",
        paddingTop: isMobile ? 200 : 0,
      }}
    >
      <WalkInCvPreview data={formData} />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: TOKENS.bgPage,
        color: TOKENS.textPrimary,
        fontFamily: FONT,
        padding: isMobile ? "24px 16px" : "48px 24px",
        paddingBottom: isMobile ? 120 : 48,
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
      <FAB tabKey="walkin" />
    </div>
  );
}
