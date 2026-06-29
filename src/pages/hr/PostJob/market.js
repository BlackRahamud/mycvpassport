/**
 * Market awareness for the Post-a-Job wizard.
 *
 * The hiring market is derived from the selected salary currency:
 *   INR        => "india"  (domestic Indian hiring)
 *   AED | USD  => "gulf"   (UAE / GCC expat corridor)
 *
 * Drives which Qualifications fields and screening-question categories are
 * relevant, so an Indian domestic listing never shows UAE visa types / US
 * work-authorization, and a Gulf listing never shows GPA / drug tests.
 */
export const marketFromCurrency = (currency) => (currency === "INR" ? "india" : "gulf");

/** Short labels (used by the drawer select, saved-group rows, headers). */
export const CATEGORY_LABEL = {
  "background-check":   "Background Check",
  "certifications":     "Certifications",
  "drivers-license":    "Driver's License",
  "gpa":                "GPA",
  "work-authorization": "Work Authorization",
  "drug-test":          "Drug Test",
  "education":          "Education",
  "expertise-tools":    "Expertise with Tools",
  "hybrid-work":        "Hybrid Work",
  "industry-experience":"Industry Experience",
  "language":           "Language",
  "location":           "Location",
  "notice-period":      "Notice Period",
  "onsite-work":        "Onsite Work",
  "remote-work":        "Remote Work",
  "urgent-hiring":      "Urgent Hiring Needed",
  "visa-status":        "Visa Status",
  "work-experience":    "Work Experience",
  "custom":             "Custom",
};

/** Full ordered category list for the "Add Screening Questions" grid. */
export const ALL_CATEGORIES = [
  { key: "background-check",   label: "Background Check" },
  { key: "certifications",     label: "Certifications" },
  { key: "drivers-license",    label: "Driver's License" },
  { key: "gpa",                label: "GPA" },
  { key: "work-authorization", label: "Work Authorization" },
  { key: "drug-test",          label: "Drug Test" },
  { key: "education",          label: "Education" },
  { key: "expertise-tools",    label: "Expertise with Tools" },
  { key: "hybrid-work",        label: "Hybrid Work" },
  { key: "industry-experience",label: "Industry Experience" },
  { key: "language",           label: "Language" },
  { key: "location",           label: "Location" },
  { key: "notice-period",      label: "Notice Period" },
  { key: "onsite-work",        label: "Onsite Work" },
  { key: "remote-work",        label: "Remote Work" },
  { key: "urgent-hiring",      label: "Urgent Hiring Needed" },
  { key: "visa-status",        label: "Visa Status" },
  { key: "work-experience",    label: "Work Experience" },
  { key: "custom",             label: "Custom question", badge: "New" },
];

// India: domestic hiring — no GPA, no drug test, no US work-authorization,
// no UAE visa types, no background-check/driver's-license framing.
const INDIA_KEYS = new Set([
  "education", "certifications", "language", "location", "notice-period",
  "industry-experience", "work-experience", "expertise-tools",
  "onsite-work", "hybrid-work", "remote-work", "urgent-hiring", "custom",
]);

// Gulf: keep visa status + work authorization; drop GPA + drug test
// (not standard in Gulf hiring).
const GULF_DROP = new Set(["gpa", "drug-test"]);

/** Screening categories appropriate to a market. */
export function categoriesForMarket(market) {
  if (market === "india") return ALL_CATEGORIES.filter((c) => INDIA_KEYS.has(c.key));
  return ALL_CATEGORIES.filter((c) => !GULF_DROP.has(c.key));
}
