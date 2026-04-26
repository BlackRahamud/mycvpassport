import { useState, useEffect, useRef, memo, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { TEMPLATES, isCvDataEmptyForTemplateApply, EMPTY_RESUME, EMPTY_EXP } from "../cvShared";
import { ResumePreview, A4_PREVIEW_WIDTH_PX } from "../ResumePreview";
import { logEvent } from "../lib/analytics/logEvent";

/*──────────────────────────────────────────────────────────────────────────────
 * Per-template dummy profiles — each person's data density is tuned to fill
 * that template's page 1 with zero black void at the bottom.
 *──────────────────────────────────────────────────────────────────────────────*/

/** Ahmed Al Mansouri — Customer Service Officer, Dubai UAE
 *  Assigned to: T1 Modern Emerald, T2 Dubai Modern, T6 Banking & Finance
 *  Body 10–10.5pt / 1.5–1.6 lh / 15mm pad → 3 roles × 4 bullets fills A4 */
const DUMMY_AHMED = {
  ...EMPTY_RESUME,
  name: "Ahmed Al Mansouri",
  title: "Customer Service Officer",
  email: "ahmed.almansouri@email.com",
  phone: "+971 50 234 5678",
  location: "Dubai, UAE",
  nationality: "Emirati",
  availability: "Immediately Available",
  languages: "Arabic (Native) · English (Fluent) · Hindi (Conversational)",
  summary:
    "Customer-focused professional with 7 years of experience delivering exceptional service across UAE banking, telecoms, and hospitality sectors. Proven track record managing high-volume client interactions, resolving escalations within SLA, and cross-selling financial products. Bilingual in Arabic and English with strong knowledge of UAE compliance standards including KYC/AML regulations.",
  experience: [
    {
      ...EMPTY_EXP,
      company: "Emirates NBD",
      role: "Customer Service Officer",
      location: "Dubai",
      period: "Jan 2021 – Present",
      points:
        "Managed daily interactions with 80+ customers across teller and service desk functions\nAchieved 96% customer satisfaction score for 3 consecutive quarters\nProcessed account openings, loan applications, and KYC documentation in line with UAE Central Bank regulations\nTrained 4 new joiners on CRM systems, service protocols, and compliance workflows",
    },
    {
      ...EMPTY_EXP,
      company: "Marriott Hotels",
      role: "Customer Relations Executive",
      location: "Abu Dhabi",
      period: "Mar 2018 – Dec 2020",
      points:
        "Handled VIP guest relations and resolved escalated complaints within 24-hour SLA\nCoordinated with 6 departments to deliver seamless guest experiences for 400+ room property\nRecognised as Employee of the Month twice in 2019 for exceeding guest satisfaction targets\nManaged guest feedback database and implemented service recovery protocols reducing repeat complaints by 30%",
    },
    {
      ...EMPTY_EXP,
      company: "Etisalat",
      role: "Customer Service Representative",
      location: "Dubai",
      period: "Jun 2016 – Feb 2018",
      points:
        "Resolved 50+ daily inbound queries via phone, email, and walk-in channels\nUpsold service packages achieving 118% of quarterly sales target\nMaintained 98% first-call resolution rate across consumer and enterprise accounts",
    },
  ],
  education: [
    {
      school: "American University of Sharjah",
      degree: "Bachelor of Business Administration",
      year: "2016",
      fieldOfStudy: "Business Administration",
      startDate: "2012",
      endDate: "2016",
      location: "Sharjah, UAE",
    },
  ],
  certifications: [
    { name: "Certified Customer Experience Professional (CCXP)", issuer: "CXPA", year: "2022" },
    { name: "AML Awareness Certificate", issuer: "UAE Central Bank", year: "2021" },
    { name: "Customer Relationship Management Specialist", issuer: "Emirates Institute of Banking", year: "2020" },
  ],
  skills: "Customer Service · CRM (Salesforce) · MS Office Suite · Stakeholder Communication · KYC/AML Compliance · Complaint Resolution · Cross-selling · Team Training · Arabic · English",
};

/** Sara Al Hashemi — HR Manager, Abu Dhabi UAE
 *  Assigned to: T3 Arabia Pro, T4 Executive Gold, T5 Gulf Executive
 *  Body 10pt / 1.4–1.6 lh / 15–20mm pad → 3 roles × 4 bullets + dense skills */
const DUMMY_SARA = {
  ...EMPTY_RESUME,
  name: "Sara Al Hashemi",
  title: "Human Resources Manager",
  email: "sara.alhashemi@email.com",
  phone: "+971 50 876 5432",
  location: "Abu Dhabi, UAE",
  nationality: "Emirati",
  availability: "Immediately Available",
  languages: "Arabic (Native) · English (Fluent) · French (Intermediate)",
  summary:
    "Strategic HR professional with 10 years of progressive experience in talent acquisition, learning & development, and HR operations across oil & gas, aviation, and retail conglomerates in the UAE. Certified in SHRM-SCP and SAP SuccessFactors with a track record of reducing time-to-hire by 35% and driving Emiratisation compliance across large-scale organisations.",
  experience: [
    {
      ...EMPTY_EXP,
      company: "ADNOC",
      role: "HR Manager — Talent Acquisition & L&D",
      location: "Abu Dhabi",
      period: "Apr 2020 – Present",
      points:
        "Led end-to-end recruitment for 200+ positions annually across technical and corporate functions\nDesigned and launched a graduate development programme placing 45 Emirati nationals in engineering roles\nImplemented SAP SuccessFactors across 3 business units reducing onboarding time by 40%\nManaged annual L&D budget of AED 2.5M, delivering 120+ training programmes with 92% satisfaction",
    },
    {
      ...EMPTY_EXP,
      company: "Etihad Airways",
      role: "Senior HR Business Partner",
      location: "Abu Dhabi",
      period: "Jan 2017 – Mar 2020",
      points:
        "Partnered with 4 department heads to align workforce planning with business strategy\nReduced employee turnover by 18% through engagement surveys and targeted retention initiatives\nLed restructuring project affecting 300+ roles, ensuring compliance with UAE Labour Law\nDelivered diversity & inclusion programme recognised at Gulf HR Excellence Awards 2019",
    },
    {
      ...EMPTY_EXP,
      company: "Al Futtaim Group",
      role: "HR Coordinator",
      location: "Dubai",
      period: "Jun 2014 – Dec 2016",
      points:
        "Coordinated recruitment for retail and automotive divisions handling 150+ vacancies per quarter\nAdministered employee benefits, visa processing, and WPS payroll for 800+ staff\nStreamlined exit interview process improving data capture and actionable insights by 60%\nSupported annual performance review cycle for 1,200 employees across 5 business units",
    },
  ],
  education: [
    {
      school: "United Arab Emirates University",
      degree: "Master of Business Administration",
      year: "2017",
      fieldOfStudy: "Human Resource Management",
      startDate: "2015",
      endDate: "2017",
      location: "Al Ain, UAE",
    },
    {
      school: "Zayed University",
      degree: "Bachelor of Science in Business",
      year: "2014",
      fieldOfStudy: "Management",
      startDate: "2010",
      endDate: "2014",
      location: "Abu Dhabi, UAE",
    },
  ],
  certifications: [
    { name: "SHRM Senior Certified Professional (SHRM-SCP)", issuer: "SHRM", year: "2021" },
    { name: "SAP SuccessFactors Certified Consultant", issuer: "SAP", year: "2020" },
    { name: "Emirates HR Network — Certified HR Practitioner", issuer: "Emirates HR Network", year: "2019" },
  ],
  skills: "Talent Acquisition · Learning & Development · HRIS (SAP SuccessFactors) · UAE Labour Law · Emiratisation · Workforce Planning · Employee Engagement · Performance Management · WPS Payroll · Arabic · English",
};

/** Rohan Mehta — IT Support Engineer, Dubai UAE
 *  Assigned to: T11 Tech & IT Pro, T10 ATS International, T7 Compact Pro
 *  Body 10pt / 1.4–1.5 lh / 15mm pad → dense tech skills + 3 roles × 4 bullets + certs */
const DUMMY_ROHAN = {
  ...EMPTY_RESUME,
  name: "Rohan Mehta",
  title: "IT Support Engineer",
  email: "rohan.mehta@email.com",
  phone: "+971 55 412 7890",
  location: "Dubai, UAE",
  nationality: "Indian",
  availability: "Immediately Available",
  languages: "English (Fluent) · Hindi (Native) · Marathi (Native)",
  summary:
    "Detail-oriented IT Support Engineer with 7+ years of experience in infrastructure management, helpdesk operations, and network administration across e-commerce, mobility, and enterprise IT environments. CompTIA A+, ITIL v4, and Azure certified with proven ability to reduce incident resolution time by 45% and maintain 99.8% uptime across hybrid cloud and on-premise environments.",
  technicalSkills: "Windows Server · Active Directory · Azure AD · O365 Administration · VMware · Cisco Networking · TCP/IP · DNS/DHCP · ITIL v4 · ServiceNow · Jira · PowerShell · Python Scripting · Linux (Ubuntu/CentOS)",
  experience: [
    {
      ...EMPTY_EXP,
      company: "Noon.com",
      role: "IT Support Engineer",
      location: "Dubai",
      period: "Mar 2022 – Present",
      points:
        "Managed IT infrastructure for 500+ users across Dubai and Riyadh offices including Azure AD and O365\nReduced average ticket resolution time from 4 hours to 2.2 hours through automation and knowledge base\nDeployed and maintained 200+ endpoints using SCCM and Intune MDM across Windows and macOS\nLed migration of on-premise file servers to SharePoint Online serving 12 departments",
    },
    {
      ...EMPTY_EXP,
      company: "Careem",
      role: "IT Helpdesk Analyst",
      location: "Dubai",
      period: "Aug 2019 – Feb 2022",
      points:
        "Provided Level 2 support for 350+ employees across 5 regional offices via ServiceNow\nConfigured and maintained Cisco switches, access points, and VPN infrastructure\nCreated automated provisioning scripts in PowerShell reducing onboarding setup from 3 hours to 45 minutes\nAchieved 98.5% SLA compliance for P1/P2 incidents across 24/7 support rotation",
    },
    {
      ...EMPTY_EXP,
      company: "Infosys",
      role: "Systems Administrator",
      location: "Pune, India",
      period: "Jul 2016 – Jul 2019",
      points:
        "Administered Windows Server 2016/2019 environment for 1,200-seat enterprise client\nManaged Active Directory, Group Policy, and WSUS patch management across 4 domains\nDeployed VMware vSphere cluster hosting 80+ virtual machines with 99.9% uptime\nDocumented 150+ SOPs and trained 6 junior engineers on incident management workflows",
    },
  ],
  education: [
    {
      school: "Savitribai Phule Pune University",
      degree: "Bachelor of Engineering",
      year: "2016",
      fieldOfStudy: "Computer Engineering",
      startDate: "2012",
      endDate: "2016",
      location: "Pune, India",
    },
  ],
  certifications: [
    { name: "CompTIA A+ Certified Technician", issuer: "CompTIA", year: "2020" },
    { name: "ITIL v4 Foundation", issuer: "Axelos", year: "2021" },
    { name: "Microsoft Certified: Azure Administrator Associate", issuer: "Microsoft", year: "2023" },
    { name: "Cisco Certified Network Associate (CCNA)", issuer: "Cisco", year: "2019" },
  ],
  skills: "Windows Server · Active Directory · Azure AD · O365 · VMware · Cisco Networking · ServiceNow · ITIL v4 · PowerShell · Python · SCCM/Intune · Linux · TCP/IP · DNS/DHCP",
};

/** Fatima Al Zaabi — Guest Relations Manager, Dubai UAE
 *  Assigned to: T9 Hospitality & Service, T12 Flat Split, T8 Creative Sidebar
 *  Body 10–10.5pt / 1.6–1.8 lh / 15mm pad → 2 roles × 4 bullets + languages + concise achievements */
const DUMMY_FATIMA = {
  ...EMPTY_RESUME,
  name: "Fatima Al Zaabi",
  title: "Guest Relations Manager",
  email: "fatima.alzaabi@email.com",
  phone: "+971 56 789 0123",
  location: "Dubai, UAE",
  nationality: "Emirati",
  availability: "Immediately Available",
  languages: "Arabic (Native) · English (Fluent) · French (Conversational) · Urdu (Basic)",
  summary:
    "Hospitality professional with 8 years of experience in luxury guest relations, VIP services, and front office operations across 5-star properties in Dubai. Skilled in managing guest experience programmes, training multicultural teams, and driving TripAdvisor and Google review scores. Passionate about creating memorable stays that translate into repeat bookings and brand loyalty.",
  experience: [
    {
      ...EMPTY_EXP,
      company: "Burj Al Arab Jumeirah",
      role: "Guest Relations Manager",
      location: "Dubai",
      period: "Sep 2021 – Present",
      points:
        "Managed VIP guest experience programme for 200+ suite guests monthly including royalty and celebrity clients\nAchieved 97% guest satisfaction score and increased TripAdvisor rating from 4.6 to 4.9 in 18 months\nLed a team of 12 guest relations officers across lobby, concierge, and butler service divisions\nDesigned and implemented personalised pre-arrival preference system reducing check-in time by 50%",
    },
    {
      ...EMPTY_EXP,
      company: "Atlantis, The Palm",
      role: "Senior Guest Relations Officer",
      location: "Dubai",
      period: "Mar 2018 – Aug 2021",
      points:
        "Handled 100+ daily guest interactions across lobby, pool, and dining touchpoints in 1,500-room resort\nResolved guest complaints within 2-hour SLA maintaining 94% first-contact resolution rate\nCoordinated with 8 departments for VIP arrivals, events, and bespoke dining experiences\nTrained 20+ new team members on Forbes 5-Star service standards and cultural sensitivity protocols",
    },
    {
      ...EMPTY_EXP,
      company: "Jumeirah Beach Hotel",
      role: "Front Desk Agent",
      location: "Dubai",
      period: "Jun 2016 – Feb 2018",
      points:
        "Processed 80+ check-ins and check-outs daily using Opera PMS across 600-room beachfront property\nUpsold room upgrades and packages generating AED 45K additional revenue per quarter\nManaged group bookings and conference delegate registrations for events up to 500 attendees",
    },
  ],
  education: [
    {
      school: "Emirates Academy of Hospitality Management",
      degree: "Bachelor of Business Administration",
      year: "2016",
      fieldOfStudy: "Hospitality Management",
      startDate: "2013",
      endDate: "2016",
      location: "Dubai, UAE",
    },
  ],
  certifications: [
    { name: "Certified Hospitality Supervisor (CHS)", issuer: "AHLEI", year: "2021" },
    { name: "Forbes Travel Guide Service Training", issuer: "Forbes Travel Guide", year: "2020" },
    { name: "First Aid & Emergency Response", issuer: "Dubai Health Authority", year: "2022" },
  ],
  skills: "Guest Relations · VIP Services · Opera PMS · Front Office Management · Team Leadership · Complaint Resolution · Upselling · Event Coordination · Cultural Sensitivity · Arabic · English · French",
};

/** James Okafor — Business Development Manager, Dubai UAE
 *  Assigned to: T13 Finance, T14 Figma Mirror + remaining templates
 *  Body 10–12.5px / 1.5–1.6 lh / 32–50px pad → achievement-heavy with revenue numbers */
const DUMMY_JAMES = {
  ...EMPTY_RESUME,
  name: "James Okafor",
  title: "Business Development Manager",
  email: "james.okafor@email.com",
  phone: "+971 52 345 6789",
  location: "Dubai, UAE",
  nationality: "Nigerian",
  availability: "Immediately Available",
  languages: "English (Native) · Arabic (Intermediate) · Yoruba (Native)",
  summary:
    "Results-driven Business Development Manager with 10+ years of experience scaling revenue across real estate, proptech, and professional services in the UAE and MENA region. Closed AED 180M+ in cumulative deal value with expertise in enterprise sales, strategic partnerships, and market expansion. Proven ability to build high-performing sales teams and penetrate new verticals in competitive GCC markets.",
  experience: [
    {
      ...EMPTY_EXP,
      company: "Property Finder",
      role: "Business Development Manager — Enterprise",
      location: "Dubai",
      period: "Jan 2020 – Present",
      points:
        "Grew enterprise client portfolio from 35 to 120 accounts generating AED 28M annual recurring revenue\nNegotiated and closed 15 strategic partnerships with major developers including Emaar, DAMAC, and Aldar\nExpanded into Saudi Arabia market achieving AED 8M revenue in first 12 months of launch\nBuilt and managed a team of 6 BDRs, achieving 140% of quarterly pipeline targets consistently",
    },
    {
      ...EMPTY_EXP,
      company: "Bayut",
      role: "Senior Sales Executive",
      location: "Dubai",
      period: "Mar 2017 – Dec 2019",
      points:
        "Exceeded annual sales targets by average 125% over 3 consecutive years totalling AED 42M in bookings\nDeveloped new business verticals in commercial real estate adding AED 6M in first-year revenue\nManaged key accounts including Knight Frank, CBRE, and Betterhomes with 95% renewal rate\nCreated sales playbook and objection-handling framework adopted company-wide across 40+ reps",
    },
    {
      ...EMPTY_EXP,
      company: "Savills Middle East",
      role: "Business Development Executive",
      location: "Dubai",
      period: "Aug 2014 – Feb 2017",
      points:
        "Sourced and qualified 200+ leads monthly through cold outreach, networking events, and referral programmes\nClosed AED 15M in residential and commercial property advisory deals in first 18 months\nOrganised quarterly investor roadshows attracting 50+ HNW individuals per event\nCollaborated with marketing team to launch digital lead generation funnel increasing qualified leads by 70%",
    },
  ],
  education: [
    {
      school: "University of Lagos",
      degree: "Bachelor of Science in Economics",
      year: "2013",
      fieldOfStudy: "Economics",
      startDate: "2009",
      endDate: "2013",
      location: "Lagos, Nigeria",
    },
  ],
  certifications: [
    { name: "Certified Sales Leadership Professional (CSLP)", issuer: "Sales Management Association", year: "2022" },
    { name: "Dubai Real Estate Regulatory Agency (RERA) Licensed Broker", issuer: "RERA Dubai", year: "2020" },
    { name: "HubSpot Inbound Sales Certification", issuer: "HubSpot", year: "2021" },
  ],
  skills: "Enterprise Sales · Strategic Partnerships · Revenue Growth · Pipeline Management · Key Account Management · CRM (HubSpot/Salesforce) · Market Expansion · Team Leadership · Contract Negotiation · Arabic · English",
};

/** Template ID → dummy profile mapping.
 *  Each template gets a person whose data density fills its specific A4 layout. */
const TEMPLATE_DUMMY_MAP = {
  1: DUMMY_AHMED,    // Modern Emerald — 10.5pt body, banner layout
  2: DUMMY_AHMED,    // Dubai Modern — 10pt body, two-column
  6: DUMMY_AHMED,    // Banking & Finance — 12.5px body, ultra-clean serif
  3: DUMMY_SARA,     // Arabia Pro — 10pt body, sidebar
  4: DUMMY_SARA,     // Executive Gold — 10pt body, timeline
  5: DUMMY_SARA,     // Gulf Executive — 10pt body, dark navy + gold
  11: DUMMY_ROHAN,   // Tech & IT Pro — 10pt body, dark slate sidebar
  10: DUMMY_ROHAN,   // ATS International — 10pt body, pure ATS
  7: DUMMY_ROHAN,    // Compact Pro — 10pt body, dense teal
  9: DUMMY_FATIMA,   // Hospitality & Service — 10.5pt body, warm tone
  12: DUMMY_FATIMA,  // Flat Split — 10pt body, beige header + grey sidebar
  8: DUMMY_FATIMA,   // Creative Sidebar — 10pt body, coral sidebar
  13: DUMMY_JAMES,   // Finance — 12.5px body, dense finance
  14: DUMMY_JAMES,   // Figma Mirror — 10.5pt body, 2-page
  15: DUMMY_SARA,    // Slate Carbon — 10pt body, dark slate header
  16: DUMMY_JAMES,   // Crimson Edge — 10pt body, red accent bar
  17: DUMMY_FATIMA,  // Forest Pro — 10pt body, green header
  18: DUMMY_AHMED,   // Midnight Gold — 10pt body, amber gold accent
};

/** Get the right dummy profile for a given template, falling back to James Okafor. */
function getDummyForTemplate(templateId) {
  return TEMPLATE_DUMMY_MAP[templateId] || DUMMY_JAMES;
}

function templateTierMarketingLabel(t) {
  if (t.tier === "free") return "FREE";
  if (t.id === 4 || t.id === 5) return "POPULAR";
  return "PREMIUM";
}

function templateTierPillColors(label) {
  if (label === "FREE") return { background: "#1D9E75", color: "#fff" };
  if (label === "POPULAR") return { background: "#EF9F27", color: "#412402" };
  return { background: "#2A2A2A", color: "#FFFFFF" };
}

function templateAtsBadgeText(t) {
  if (t.id >= 1 && t.id <= 3) return "ATS 70+";
  return "ATS 85+";
}

/** IDs of POPULAR templates that get the amber glow border treatment. */
const AMBER_GLOW_IDS = new Set([3, 4, 5]);

/** Scroll sections — each template appears exactly once, no duplicates. */
const SCROLL_SECTIONS = [
  { key: "popular",  label: "POPULAR",  desc: "Engineered for GCC shortlists. ATS-optimised, recruiter-tested.",         ids: [1, 2, 3, 4, 5] },
  { key: "simple",   label: "SIMPLE",   desc: "Clean, minimal layouts that let your experience speak.",                   ids: [6, 7, 15] },
  { key: "modern",   label: "MODERN",   desc: "Contemporary designs for competitive, fast-moving industries.",            ids: [8, 9, 10, 17] },
  { key: "creative", label: "CREATIVE", desc: "Bold formats for roles where presentation signals capability.",            ids: [11, 12, 13, 14, 16, 18] },
];

/**
 * CvTemplateThumb — shared scaled CV preview.
 *
 * Measures its own container width via ResizeObserver, computes scale to fill
 * that width at full A4 height (794 × 1123px), and exposes the exact height
 * via an inline style so the parent card height tracks the content naturally.
 *
 * Surfaces: Builder Templates tab · /templates page · FAB Step 7 · Landing carousel.
 * One fix propagates everywhere automatically.
 */
export const CvTemplateThumb = memo(function CvTemplateThumb({ resume, template }) {
  const scaleOuterRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scaleOuterRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w == null || w < 1) return;
      setContainerWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* scale = cardWidth / A4_WIDTH — scales the 794px A4 down to the card width.
     Height is handled by CSS: parent .cvp-templates-card-thumb has aspect-ratio: 794/1123,
     and this element fills it via position:absolute;inset:0. No JS height needed. */
  const scale = useMemo(() => {
    if (containerWidth <= 0) return 0;
    return containerWidth / A4_PREVIEW_WIDTH_PX;
  }, [containerWidth]);

  return (
    <div
      ref={scaleOuterRef}
      className="cvp-templates-card-thumb-scale-outer"
    >
      {scale > 0 && (
        <div
          className="cvp-templates-card-thumb-scale-inner"
          style={{ transform: `scale(${scale})` }}
        >
          <ResumePreview cv={resume} template={template} />
        </div>
      )}
    </div>
  );
});

const BuilderTemplateGridCard = memo(function BuilderTemplateGridCard({ template: t, isSelected, sheetHighlight, resume, onPick, cardRef }) {
  const tierLabel = templateTierMarketingLabel(t);
  const tierPill = templateTierPillColors(tierLabel);
  const atsBadge = templateAtsBadgeText(t);
  const borderStyle = sheetHighlight ? "2px solid rgba(255,255,255,0.8)" : isSelected ? "1px solid #FFFFFF" : "0.5px solid #2A2A2A";
  const amberGlow = AMBER_GLOW_IDS.has(t.id);

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onPick(t)}
      className="cvp-templates-card"
      style={{
        position: "relative",
        width: "100%",
        height: "auto",
        padding: 0,
        margin: 0,
        border: borderStyle,
        borderRadius: 12,
        background: "#141414",
        cursor: "pointer",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        boxSizing: "border-box",
        transition: "transform 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms cubic-bezier(0.4,0,0.2,1)",
        ...(amberGlow ? { boxShadow: "0 0 0 1.5px #D97706, 0 0 16px rgba(217,119,6,0.45)" } : {}),
      }}
    >
      <div className="cvp-templates-card-thumb">
        <CvTemplateThumb resume={resume} template={t} />
      </div>
      {/* Card footer: name + tier pill + ATS badge */}
      <div className="cvp-templates-card-footer">
        <div className="cvp-templates-card-footer-row">
          <span className="cvp-templates-card-name">{t.name}</span>
          <span
            style={{
              fontSize: 8,
              padding: "2px 6px",
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: "0.05em",
              flexShrink: 0,
              textTransform: "uppercase",
              ...tierPill,
            }}
          >
            {tierLabel}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "transparent",
            color: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.3px",
            alignSelf: "flex-start",
          }}
        >
          {atsBadge}
        </span>
      </div>
    </button>
  );
});

function BuilderTemplatesTab({
  resume,
  selectedTemplate,
  onApplyTemplate: _onApplyTemplate,
  onApplyTemplateAndGoToContent,
  pendingTemplate,
  confirmOpen,
  onPendingTemplateChange,
  onConfirmOpenChange,
  onTemplatesFabInteract,
  showAtsJourneyPrompt = false,
  onAtsJourneyNavigate,
  onAtsJourneySkipDownload,
  source = "builder_tab",
  user,
}) {
  const navigate = useNavigate();
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [previewBounceKey, setPreviewBounceKey] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const open = confirmOpen && pendingTemplate != null;
    if (open) {
      document.body.classList.add("cvp-templates-preview-modal-open");
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.classList.remove("cvp-templates-preview-modal-open");
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.classList.remove("cvp-templates-preview-modal-open");
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [confirmOpen, pendingTemplate]);

  useEffect(() => {
    if (confirmOpen && pendingTemplate != null) setPreviewBounceKey((k) => k + 1);
  }, [confirmOpen, pendingTemplate]);

  const closePreviewModal = () => {
    onConfirmOpenChange(false);
    onPendingTemplateChange(null);
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  };

  const userCvEmpty = isCvDataEmptyForTemplateApply(resume);

  return (
    <div
      className="cvp-builder-templates-tab-root"
      style={{ width: "100%", maxWidth: "100%", overflow: "visible", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {/* ATS Banner — always visible at top */}
      <div className="cvp-templates-ats-banner">
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          className="cvp-templates-ats-banner-shield"
        >
          <path
            d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
            stroke="#14B8A6"
            strokeWidth={1.8}
          />
          <path d="M9 12l2 2 4-4" stroke="#14B8A6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="cvp-templates-ats-banner-text">
          <p className="cvp-templates-ats-banner-headline">Engineered for the Shortlist.</p>
          <div
            className={
              bannerExpanded
                ? "cvp-templates-ats-banner-expand-wrap cvp-templates-ats-banner-expand-wrap--expanded"
                : "cvp-templates-ats-banner-expand-wrap cvp-templates-ats-banner-expand-wrap--collapsed"
            }
          >
            <div className="cvp-templates-ats-banner-body-clip">
              <p className="cvp-templates-ats-banner-body">
                A great-looking CV means nothing if a recruiter&apos;s system can&apos;t read it. Every template is precision-coded for maximum ATS
                readability — recruiter-approved layouts that clear filters with zero errors. That&apos;s the format sorted. Next, run your CV through our{" "}
                <span
                  role="button"
                  tabIndex={0}
                  className="cvp-templates-ats-banner-link"
                  onClick={() => navigate("/ats")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("/ats");
                    }
                  }}
                >
                  ATS Checker
                </span>{" "}
                — it scores your content against the actual job description, flags what&apos;s missing, and tells you exactly what to fix before you apply.
                {bannerExpanded ? (
                  <>
                    {" "}
                    <span
                      role="button"
                      tabIndex={0}
                      className="cvp-templates-ats-banner-read-inline"
                      onClick={() => setBannerExpanded(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setBannerExpanded(false);
                        }
                      }}
                    >
                      Show less ↑
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            {!bannerExpanded ? (
              <span
                role="button"
                tabIndex={0}
                className="cvp-templates-ats-banner-read-inline"
                onClick={() => setBannerExpanded(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setBannerExpanded(true);
                  }
                }}
              >
                Read more →
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Single scrollable area — all sections stacked vertically */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {SCROLL_SECTIONS.map((section) => {
          const sectionTemplates = TEMPLATES.filter((t) => section.ids.includes(t.id));
          return (
            <Fragment key={section.key}>
              {/* Section divider heading + descriptor */}
              <div style={{ padding: "24px 12px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {section.label}
                  </span>
                  <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
                </div>
                {section.desc ? (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 11,
                      fontWeight: 400,
                      color: "rgba(255,255,255,0.38)",
                      textAlign: "center",
                      letterSpacing: "0.01em",
                      lineHeight: 1.45,
                    }}
                  >
                    {section.desc}
                  </p>
                ) : null}
              </div>
              {/* 2-column grid — overflow visible so cards aren't clipped within scroll */}
              <div className="cvp-templates-grid" style={{ overflowY: "visible", flex: "none" }}>
                {sectionTemplates.map((t) => (
                  <BuilderTemplateGridCard
                    key={t.id}
                    template={t}
                    isSelected={selectedTemplate?.id === t.id}
                    sheetHighlight={confirmOpen && pendingTemplate?.id === t.id}
                    resume={userCvEmpty ? getDummyForTemplate(t.id) : resume}
                    onPick={(tpl) => {
                      logEvent("template_card_clicked", {
                        template_id: tpl.id,
                        template_name: tpl.name,
                        template_tier: tpl.tier,
                        source,
                        is_authenticated: !!user?.id,
                      });
                      onTemplatesFabInteract?.();
                      onPendingTemplateChange(tpl);
                      onConfirmOpenChange(true);
                    }}
                  />
                ))}
              </div>
            </Fragment>
          );
        })}

        {showAtsJourneyPrompt ? (
          <div
            style={{
              marginTop: 12,
              marginLeft: 10,
              marginRight: 10,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #2A2A2A",
              background: "#141414",
              display: "grid",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#E5E5E5", lineHeight: 1.4 }}>Template locked. Now check your ATS score.</p>
            <button
              type="button"
              onClick={() => onAtsJourneyNavigate?.()}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={(ev) => { ev.currentTarget.style.opacity = "0.92"; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.opacity = "1"; }}
            >
              Check ATS Score →
            </button>
            <button
              type="button"
              onClick={() => onAtsJourneySkipDownload?.()}
              style={{
                background: "none",
                border: "none",
                color: "#666666",
                fontSize: 11,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
                justifySelf: "center",
              }}
            >
              Skip to download
            </button>
          </div>
        ) : null}

        <div style={{ padding: "16px 10px 24px", textAlign: "center" }}>
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

      {/* Preview modal portal */}
      {confirmOpen && pendingTemplate && typeof document !== "undefined"
        ? createPortal(
            <Fragment key={pendingTemplate?.id}>
              <div role="presentation" className="cvp-templates-preview-backdrop" onClick={closePreviewModal} />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cvp-templates-preview-title"
                className="cvp-templates-preview-root"
              >
                <div className="cvp-templates-preview-header">
                  <h2 id="cvp-templates-preview-title" className="cvp-templates-preview-title">
                    {pendingTemplate.name}
                  </h2>
                  <button type="button" className="cvp-templates-preview-close" onClick={closePreviewModal} aria-label="Close">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" stroke="#FFF" strokeWidth={2} strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div
                  className="cvp-templates-preview-scroll"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) closePreviewModal();
                  }}
                >
                  <div className="cvp-templates-preview-cv-wrap" onClick={(e) => e.stopPropagation()}>
                    <ResumePreview cv={userCvEmpty ? getDummyForTemplate(pendingTemplate?.id) : resume} template={pendingTemplate} />
                  </div>
                </div>
                <div className="cvp-templates-preview-cta">
                  <button
                    type="button"
                    key={previewBounceKey}
                    className="cvp-templates-preview-use-btn"
                    onClick={() => {
                      if (pendingTemplate) {
                        logEvent("template_applied", {
                          template_id: pendingTemplate.id,
                          template_tier: pendingTemplate.tier,
                          source,
                          is_authenticated: !!user?.id,
                        });
                      }
                      onApplyTemplateAndGoToContent(pendingTemplate);
                      closePreviewModal();
                    }}
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </Fragment>,
            document.body,
          )
        : null}
    </div>
  );
}
export { BuilderTemplatesTab };
export default function TemplatesPage(props) {
  return (
    <>
      <Helmet>
        <title>Free ATS CV Templates for UAE &amp; GCC Jobs — CVPassport</title>
        <meta name="description" content="18 ATS-optimised CV templates built for Dubai, UAE & GCC jobs. Free to start. Download your Gulf-ready CV instantly." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://mycvpassport.com/templates" />
        <meta property="og:title" content="Free ATS CV Templates for UAE &amp; GCC Jobs — CVPassport" />
        <meta property="og:description" content="18 ATS-optimised CV templates built for Dubai, UAE & GCC jobs. Free to start. Download your Gulf-ready CV instantly." />
        <meta property="og:url" content="https://mycvpassport.com/templates" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
      </Helmet>
      <BuilderTemplatesTab {...props} />
    </>
  );
}
