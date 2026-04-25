/* ═══════════════════════════════════════════════════════════════════════════
   src/lib/gulfData.js
   Gulf Career Intelligence — data layer + compute function.

   All values flagged with REPLACE: are placeholder benchmarks. Swap for real
   API / Supabase-driven figures once the data pipeline exists. The compute
   function shape stays the same — only the source of numbers changes.
   ═══════════════════════════════════════════════════════════════════════════ */

// REPLACE: empirical benchmarks per industry (live UAE/GCC data)
export const INDUSTRIES = [
  { id: "tech",     icon: "◆", name: "Technology / Software",      base: 18000, peak: 32000, demand: 0.92 },
  { id: "finance",  icon: "₣", name: "Finance / Banking",          base: 16000, peak: 35000, demand: 0.95 },
  { id: "construct",icon: "▲", name: "Construction / Engineering", base: 14000, peak: 28000, demand: 0.88 },
  { id: "health",   icon: "✚", name: "Healthcare / Medical",       base: 13000, peak: 30000, demand: 0.90 },
  { id: "supply",   icon: "↔", name: "Supply Chain / Logistics",   base: 11000, peak: 22000, demand: 0.84 },
  { id: "hr",       icon: "◉", name: "HR / Operations",            base: 10000, peak: 24000, demand: 0.78 },
  { id: "sales",    icon: "↗", name: "Sales / Business Dev",       base: 12000, peak: 30000, demand: 0.86 },
  { id: "market",   icon: "✦", name: "Marketing / Comms",          base: 11000, peak: 25000, demand: 0.80 },
  { id: "hospital", icon: "✶", name: "Hospitality / Aviation",     base: 9000,  peak: 20000, demand: 0.75 },
  { id: "legal",    icon: "§", name: "Legal / Compliance",         base: 14000, peak: 32000, demand: 0.82 },
];

// REPLACE: real cost-of-living indices per city
export const CITIES = {
  dubai_marina: { label: "Dubai Marina",       rent: 9500, transport: 800,  utilities: 700, schooling: 4500, multiplier: 1.00, vibe: "Premium expat hub" },
  sharjah:      { label: "Sharjah",            rent: 4200, transport: 1100, utilities: 550, schooling: 2800, multiplier: 0.86, vibe: "Best net-savings play" },
  abudhabi:     { label: "Abu Dhabi",          rent: 7800, transport: 700,  utilities: 750, schooling: 4200, multiplier: 1.05, vibe: "Government & energy" },
  deira:        { label: "Deira / Bur Dubai",  rent: 5500, transport: 600,  utilities: 600, schooling: 3500, multiplier: 0.92, vibe: "Old Dubai, central" },
};

// Gulf keywords by industry
export const KEYWORDS = {
  tech:     ["AWS", "Azure", "Kubernetes", "Terraform", "CISSP", "GenAI", "Python"],
  finance:  ["ACCA", "CFA", "IFRS", "Corporate Tax", "ACAMS", "SAP FICO", "UAE VAT"],
  construct:["PMP", "FIDIC", "NEBOSH IGC", "BIM", "Revit", "LEED", "Estidama"],
  health:   ["DHA License", "DOH License", "MOH License", "BLS", "ACLS", "HL7", "FHIR"],
  supply:   ["CIPS", "Six Sigma", "SAP MM", "Incoterms", "JAFZA", "Lean"],
  hr:       ["CIPD L7", "SHRM-SCP", "UAE Labour Law", "WPS", "Emiratisation", "Nafis"],
  sales:    ["Salesforce", "HubSpot", "MEDDIC", "GCC Network", "Channel Sales", "Account Mgmt"],
  market:   ["Performance Marketing", "GA4", "SEO", "Arabic Copy", "TikTok Ads", "GCC Insights"],
  hospital: ["Opera PMS", "Micros", "GDS", "DTCM", "Halal Cert", "Multilingual"],
  legal:    ["DIFC", "ADGM", "UAE Commercial Code", "Compliance", "Contract Law"],
};

export const TIERS = [
  { id: "smb", label: "SME / Startup",         floor: 0,    range: "AED 8–14k",  color: "#A0A0A0" },
  { id: "t2",  label: "Tier 2 Regional Giant", floor: 0.55, range: "AED 14–22k", color: "#378ADD" },
  { id: "t1",  label: "Tier 1 Multinational",  floor: 0.78, range: "AED 22–45k", color: "#D97706" },
];

// REPLACE: empirical certification lift figures
const CERT_WEIGHTS = {
  pmp: 0.18, aws: 0.16, cipd: 0.14, acca: 0.20, cfa: 0.22,
  nebosh: 0.12, dha: 0.30, cips: 0.13, cissp: 0.20,
};

// AED ↔ INR conversion (snapshot)
const AED_TO_INR = 22.99;

export function compute(state) {
  const ind = INDUSTRIES.find((i) => i.id === state.industry) || INDUSTRIES[0];
  const city = CITIES[state.city] || CITIES.dubai_marina;
  const yrs = Number(state.experience) || 3;
  const yrsCurve = Math.min(1, yrs / 12);

  const projectedBase = ind.base + (ind.peak - ind.base) * yrsCurve;
  const projected = Math.round(projectedBase * city.multiplier);

  let currentAED = Number(state.currentSalary) || 0;
  if (state.currency === "inr") currentAED = Math.round(currentAED / AED_TO_INR);

  let match = 60;
  match += Math.round(ind.demand * 20);
  if (state.cvFresh === "0_3m") match += 8;
  else if (state.cvFresh === "3_12m") match += 2;
  else if (state.cvFresh === "1y_plus") match -= 6;
  if (state.notice === "immediate") match += 6;
  else if (state.notice === "30") match += 2;
  else if (state.notice === "90") match -= 4;
  if (state.status === "in_gulf") match += 4;

  const certs = state.certs || {};
  let certLift = 0;
  Object.keys(certs).forEach((k) => { if (certs[k]) certLift += (CERT_WEIGHTS[k] || 0); });
  match += Math.round(certLift * 15);
  match = Math.max(28, Math.min(98, match));

  const lift = 1 + certLift * 0.7;
  const lowAED = Math.round((projected * 0.82 * lift) / 500) * 500;
  const highAED = Math.round((projected * 1.18 * lift) / 500) * 500;
  const midAED = Math.round((lowAED + highAED) / 2 / 500) * 500;

  let tier = TIERS[0];
  const tierScore = (match / 100) * 0.5 + certLift * 0.5;
  for (const t of TIERS) { if (tierScore >= t.floor) tier = t; }

  const indKeywords = KEYWORDS[ind.id] || [];
  const userKw = (state.topSkill || "").toLowerCase();
  const missingKw = indKeywords.filter((k) => !userKw.includes(k.toLowerCase().split(" ")[0]));
  const friction = {
    notice: state.notice === "90" ? 80 : state.notice === "30" ? 40 : 15,
    cvFormat: state.cvFresh === "1y_plus" ? 75 : state.cvFresh === "3_12m" ? 40 : 18,
    keywords: Math.min(95, Math.round((missingKw.length / Math.max(1, indKeywords.length)) * 100)),
    keywordsList: missingKw.slice(0, 6),
  };
  friction.overall = Math.round((friction.notice + friction.cvFormat + friction.keywords) / 3);

  const costs = { rent: city.rent, transport: city.transport, utilities: city.utilities, food: 1800 };
  if (state.family === "family") costs.schooling = city.schooling;
  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);
  const netSavings = Math.max(0, midAED - totalCost);

  // Deterministic percentile (seed off match so identical input → identical output)
  const percentile = Math.min(99, Math.round(match * 0.95 + (state.industry?.charCodeAt?.(0) || 0) % 4));

  const gap = Math.max(0, midAED - currentAED);
  const annualGap = gap * 12;

  return {
    industry: ind, city,
    match, lowAED, midAED, highAED,
    currentAED, gap, annualGap,
    tier, tierScore,
    friction,
    costs, totalCost, netSavings,
    percentile,
    indKeywords, missingKw,
  };
}

export function fmtAED(n) { return "AED " + new Intl.NumberFormat("en-US").format(Math.round(n)); }
export function fmtINR(n) { return "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n)); }
export function fmtK(n)   { return n >= 1000 ? (n / 1000).toFixed(n < 10000 ? 1 : 0) + "k" : String(Math.round(n)); }

export function genReportId() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 7; i += 1) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
