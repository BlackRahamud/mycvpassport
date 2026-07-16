// =============================================================
// src/lib/jobs/jobFormat.js
//
// Shared, honest formatters for the candidate job board (/jobs) and
// the job detail page (/jobs/:id). One place so the two screens can
// never disagree about a salary, a date, or a status.
//
// House rules baked in here:
//   - One currency per job, from job.currency, shown consistently.
//   - Salaries are MONTHLY. The stored salary_unit/salary_period default
//     to "per Hour" which is a mislabel (the figures are monthly), so we
//     never surface the stored unit and always render "per month".
//   - No dashes anywhere. Ranges read "X to Y". Dates are relative.
// =============================================================

const MONO_COUNT = 6;

export function monogram(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Deterministic monogram tint index (0..5) → .jb-mono--N in jobBoard.css.
// Colours live in CSS so no hex leaks into JSX.
export function monoIndex(name = "") {
  let h = 0;
  const s = String(name);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % MONO_COUNT;
}

export function fmtMoney(n, currency) {
  const locale = currency === "INR" ? "en-IN" : "en-US"; // INR groups in lakhs
  return Number(n).toLocaleString(locale);
}

export function salaryText(job) {
  const cur = job.currency || "AED";
  const lo = job.salary_min;
  const hi = job.salary_max;
  if (lo && hi && lo !== hi) return `${fmtMoney(lo, cur)} to ${fmtMoney(hi, cur)} ${cur} per month`;
  if (lo && hi) return `${fmtMoney(lo, cur)} ${cur} per month`;
  if (lo) return `From ${fmtMoney(lo, cur)} ${cur} per month`;
  if (hi) return `Up to ${fmtMoney(hi, cur)} ${cur} per month`;
  return "";
}

// Experience: prefer a min/max pair when the row has one, else the single
// experience_years, else nothing (absence is a clean drop, never "Any").
function expBounds(job) {
  const mn = job.experience_min;
  const mx = job.experience_max;
  if (mn != null || mx != null) return { min: mn, max: mx };
  if (job.experience_years != null) return { min: job.experience_years, max: job.experience_years };
  return { min: null, max: null };
}

export function experienceBand(job) {
  const { min, max } = expBounds(job);
  if (min == null && max == null) return null;
  const lo = min ?? 0;
  if ((max ?? lo) < 1) return "under1";
  if (lo >= 5) return "5plus";
  if (lo >= 3) return "3to5";
  if (lo >= 1) return "1to2";
  return "under1";
}

export function experienceText(job) {
  const { min, max } = expBounds(job);
  if (min == null && max == null) return "";
  const lo = min ?? 0;
  const hi = max ?? lo;
  if (hi < 1) return "Less than 1 year";
  if (lo === 0) return `Up to ${hi} years`;
  if (lo === hi) return `${lo} years`;
  return `${lo} to ${hi} years`;
}

export const EXP_BANDS = [
  { val: "under1", label: "Under 1 year" },
  { val: "1to2", label: "1 to 2 years" },
  { val: "3to5", label: "3 to 5 years" },
  { val: "5plus", label: "5 years or more" },
];

export function postedText(dateStr) {
  if (!dateStr) return "";
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d <= 0) return "Posted today";
  if (d === 1) return "Posted 1 day ago";
  if (d < 7) return `Posted ${d} days ago`;
  if (d < 14) return "Posted 1 week ago";
  if (d < 28) return `Posted ${Math.floor(d / 7)} weeks ago`;
  return "Posted last month";
}

// Honest status. Never "closing soon" on a stale post: an old listing reads
// as "fewer new applicants", not urgency it has not earned.
export function jobStatus(job) {
  if (job.hiring_status === "closed" || job.status === "closed")
    return { label: "Applications closed", tone: "muted" };
  const posted = job.posted_at || job.created_at;
  const d = posted ? Math.floor((Date.now() - new Date(posted).getTime()) / 86400000) : 999;
  if (d <= 7) return { label: "Actively hiring", tone: "green" };
  if (d <= 21) return { label: "Reviewing applicants", tone: "amber" };
  return { label: "Open, fewer new applicants", tone: "muted" };
}

// The five types the jobs.job_type CHECK constraint permits (widened in
// migration 042). Kept in lockstep with the wizard StartStep radios and
// PostJobPreview — a filter option here must be one a job can actually carry.
const JOB_TYPE_LABEL = {
  "full-time": "Full time",
  "part-time": "Part time",
  contract: "Contract",
  freelance: "Freelance",
  intern: "Intern",
};
export function jobTypeLabel(job) {
  return JOB_TYPE_LABEL[job.job_type] || (job.job_type ? String(job.job_type) : "");
}
export const JOB_TYPE_OPTIONS = [
  { val: "full-time", label: "Full time" },
  { val: "part-time", label: "Part time" },
  { val: "contract", label: "Contract" },
  { val: "freelance", label: "Freelance" },
  { val: "intern", label: "Intern" },
];

// Location filter maps to the real granularity we hold: market (gulf | india).
// The visa clause is Gulf context only.
export const MARKET_OPTIONS = [
  { val: "gulf", label: "Gulf" },
  { val: "india", label: "India" },
];

export const VISA_OPTIONS = ["Need sponsorship", "Own visa or residency", "Visit visa", "Freelance permit"];

// The ATS match chip is shown before he sends — informing, never gating.
// It must not read green at a weak score (a green "20% match" is itself an
// overclaim), so a low score gets a neutral tone. It never blocks Send.
export function matchTone(score) {
  if (score == null) return "soft";
  if (score >= 75) return "good";
  if (score >= 50) return "ok";
  return "soft";
}

// True when the role needs a visa answer at all (Gulf roles do; India does not).
export function roleNeedsVisa(job) {
  return (job.market || "gulf") !== "india";
}
