/**
 * Deployment readiness — pure extraction + flag rules for the evaluation
 * view's readiness block (candidate evaluation redesign, frames 1a/1b/1c).
 *
 * Honesty rules (portal standing rules):
 *  - Surface only what the CV / application actually states. A field we
 *    cannot read degrades to tone "missing" and renders as "Not stated"
 *    with a Request details action — never a guess, never a broken row.
 *  - A flag always carries a one line reason ("Above the AED 7,000
 *    ceiling", "Needs emigration clearance") so red is explainable.
 *  - Hard knockouts are only claimed when they are actually computable:
 *    salary above the job's stated ceiling, and a failed must-have
 *    screening question. Visa and notice period FLAG but never knock out
 *    on their own (many Gulf employers sponsor; timing is negotiable).
 *
 * Everything here is pure and unit-tested; the page only renders.
 */

const GCC_HINTS = [
  "uae", "united arab emirates", "dubai", "abu dhabi", "sharjah", "ajman",
  "fujairah", "ras al khaimah", "umm al quwain", "al ain",
  "saudi", "riyadh", "jeddah", "dammam", "khobar",
  "qatar", "doha", "kuwait", "bahrain", "manama", "oman", "muscat", "gcc",
];

const asText = (v) => (typeof v === "string" ? v.trim() : "");

function cvPersonal(cv) {
  return (cv && (cv.personal || cv.basics)) || {};
}

/* "AED 9,500", "9.5k", "9500 aed plus benefits" → 9500 (number) or null. */
export function parseMoney(raw) {
  const s = asText(raw).toLowerCase().replace(/,/g, "");
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*k\b/) || s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  if (/\d\s*k\b/.test(s) || (m[0].includes("k") && n < 1000)) n *= 1000;
  return Math.round(n);
}

/* "60 days", "2 months", "immediate", "1 month" → days (number) or null. */
export function parseNoticeDays(raw) {
  const s = asText(raw).toLowerCase();
  if (!s) return null;
  if (/immediate|right away|asap|available now/.test(s)) return 0;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(day|week|month)/);
  if (m) {
    const n = parseFloat(m[1]);
    const unit = m[2];
    if (unit === "day") return Math.round(n);
    if (unit === "week") return Math.round(n * 7);
    return Math.round(n * 30);
  }
  const bare = s.match(/^(\d+)$/);
  return bare ? Number(bare[1]) : null;
}

function isInGcc(location) {
  const s = asText(location).toLowerCase();
  if (!s) return null;
  return GCC_HINTS.some((h) => s.includes(h));
}

/* Scan every string the CV carries for ECR / ECNR passport mentions. */
function passportKind(cv) {
  const hay = JSON.stringify(cv || {}).toLowerCase();
  if (/\becnr\b/.test(hay)) return "ecnr";
  if (/\becr\b/.test(hay)) return "ecr";
  return null;
}

const row = (key, label, value, tone, note) => ({ key, label, value, tone, note: note || null });
const missingRow = (key, label) => row(key, label, "Not stated", "missing", "Confirm with the candidate");

/**
 * buildReadiness({ cv, application, job }) →
 * { rows, flagCount, missingCount, knockouts, hasMissing }
 * rows: [{ key, label, value, tone: 'ok'|'flag'|'missing', note }]
 * knockouts: subset of ['salary'] — computable hard readiness knockouts.
 */
export function buildReadiness({ cv = {}, application = {}, job = {} } = {}) {
  const personal = cvPersonal(cv);
  const rows = [];
  const knockouts = [];

  /* 1. Current location */
  const location = asText(cv.location) || asText(personal.location);
  if (!location) {
    rows.push(missingRow("location", "Current location"));
  } else {
    const inGcc = isInGcc(location);
    const jobIsGulf = (job.market || "gulf") === "gulf";
    if (jobIsGulf && inGcc === false) {
      rows.push(row("location", "Current location", location, "flag", "Offshore, relocation required"));
    } else {
      rows.push(row("location", "Current location", location, "ok"));
    }
  }

  /* 2. Nationality, passport */
  const nationality = asText(cv.nationality) || asText(personal.nationality);
  const passport = passportKind(cv);
  if (!nationality && !passport) {
    rows.push(missingRow("passport", "Nationality, passport"));
  } else if (passport === "ecr") {
    rows.push(row("passport", "Nationality, passport",
      [nationality, "ECR passport"].filter(Boolean).join(", "),
      "flag", "Needs emigration clearance"));
  } else if (passport === "ecnr") {
    rows.push(row("passport", "Nationality, passport",
      [nationality, "ECNR passport"].filter(Boolean).join(", "),
      "ok", "No emigration clearance needed"));
  } else {
    rows.push(row("passport", "Nationality, passport", nationality, "ok"));
  }

  /* 3. Visa status */
  const visa = asText(application.visa_status) || asText(cv.visa_status) || asText(personal.visa_status);
  if (!visa) {
    rows.push(missingRow("visa", "Visa status"));
  } else if (/sponsor|no visa|needs? (a )?visa|visa required/i.test(visa)) {
    rows.push(row("visa", "Visa status", visa, "flag", "Needs sponsorship before start"));
  } else {
    rows.push(row("visa", "Visa status", visa, "ok"));
  }

  /* 4. Notice period */
  const notice = asText(cv.notice_period) || asText(cv.availability) || asText(personal.notice_period) || asText(personal.availability);
  if (!notice) {
    rows.push(missingRow("notice", "Notice period"));
  } else {
    const days = parseNoticeDays(notice);
    if (days != null && days > 45) {
      rows.push(row("notice", "Notice period", notice, "flag", "Long runway before they can start"));
    } else {
      rows.push(row("notice", "Notice period", notice, "ok"));
    }
  }

  /* 5. Salary expectation vs the job's stated ceiling */
  const salaryRaw = asText(cv.salary_expectation) || asText(cv.expected_salary)
    || asText(personal.salary_expectation) || asText(personal.expected_salary)
    || asText(personal.compensation);
  const ceiling = Number(job.salary_max) || null;
  const currency = job.currency || "AED";
  if (!salaryRaw) {
    rows.push(missingRow("salary", "Salary expectation"));
  } else {
    const ask = parseMoney(salaryRaw);
    if (ask != null && ceiling != null && ask > ceiling) {
      rows.push(row("salary", "Salary expectation", salaryRaw, "flag",
        `Above the ${currency} ${ceiling.toLocaleString()} ceiling`));
      knockouts.push("salary");
    } else if (ask != null && ceiling != null) {
      rows.push(row("salary", "Salary expectation", salaryRaw, "ok", "Within budget"));
    } else {
      rows.push(row("salary", "Salary expectation", salaryRaw, "ok"));
    }
  }

  const flagCount = rows.filter((r) => r.tone === "flag").length;
  const missingCount = rows.filter((r) => r.tone === "missing").length;
  return { rows, flagCount, missingCount, knockouts, hasMissing: missingCount > 0 };
}

/* Plain-language phrase per readiness field, for the one gap line and the
   WhatsApp ask. A row label like "Nationality, passport" reads badly in a
   comma list, so the gap phrasing is separate from the row label. */
export const GAP_PHRASES = {
  location: "current location",
  passport: "nationality",
  visa: "visa status",
  notice: "notice period",
  salary: "salary expectation",
};

/* The fields the CV does not mention, in row order, as plain phrases.
   Absence earns one line however many are absent — this feeds it. */
export function missingGaps(readiness) {
  const rows = (readiness && readiness.rows) || [];
  return rows
    .filter((r) => r.tone === "missing")
    .map((r) => GAP_PHRASES[r.key] || String(r.label || "").toLowerCase());
}

/* "a" · "a and b" · "a, b and c". No Oxford comma, no dashes. Handles the
   singular case so one field never reads as a list. */
export function humanJoin(items) {
  const list = (items || []).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * evaluateScreening(questions, answers) — pair the job's screening
 * questions (jobs.screening_questions, flat or grouped) with the
 * application's answers. Returns
 * { items: [{ question, answer, status, mustHave, note }], failedMustHave }.
 * status: stored answer status wins; else yes/no questions are judged
 * against idealAnswer; anything unjudgeable is 'neutral'.
 */
export function flattenScreeningQuestions(screeningQuestions) {
  const src = Array.isArray(screeningQuestions) ? screeningQuestions : [];
  const flat = [];
  src.forEach((entry) => {
    if (entry && Array.isArray(entry.questions)) {
      entry.questions.forEach((q) => flat.push(q));
    } else if (entry) {
      flat.push(entry);
    }
  });
  return flat;
}

export function evaluateScreening(screeningQuestions, screeningAnswers) {
  const questions = flattenScreeningQuestions(screeningQuestions);
  const answers = Array.isArray(screeningAnswers) ? screeningAnswers : [];
  const items = questions.map((q, i) => {
    const raw = answers[i];
    const answer = typeof raw === "object" && raw !== null ? asText(raw.answer) : asText(raw);
    const stored = typeof raw === "object" && raw !== null ? raw.status : null;
    const questionText = asText(q?.text) || asText(q?.label) || asText(q?.question) || `Question ${i + 1}`;
    const mustHave = Boolean(q?.mustHave);

    let status = stored && ["pass", "fail", "neutral"].includes(stored) ? stored : null;
    if (!status) {
      if (!answer) status = "unanswered";
      else if ((q?.responseType === "yes-no" || /^(yes|no)\b/i.test(answer)) && q?.idealAnswer) {
        const said = /^\s*yes\b/i.test(answer) ? "yes" : (/^\s*no\b/i.test(answer) ? "no" : null);
        status = said == null ? "neutral" : (said === q.idealAnswer ? "pass" : "fail");
      } else {
        status = "neutral";
      }
    }
    const note = status === "fail"
      ? (mustHave ? `Fails a stated requirement: ${questionText}` : "Does not match the ideal answer")
      : (status === "neutral" && !mustHave ? null : null);
    return { question: questionText, answer, status, mustHave, note };
  });

  const failedMustHave = items.find((it) => it.status === "fail" && it.mustHave) || null;
  return { items, failedMustHave };
}

/**
 * knockoutSynthesis — one line for the verdict card when the headline is
 * overridden ("Skills fit, not deployable"). Parts come from readiness
 * knockouts + a failed must-have screening question.
 */
export function knockoutSynthesis({ readiness, screening } = {}) {
  const parts = [];
  if (readiness?.knockouts?.includes("salary")) parts.push("salary");
  if (screening?.failedMustHave) parts.push("a screening requirement");
  if (parts.length === 0) return null;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  const verb = parts.length === 1 ? "is a knockout" : "are knockouts";
  return `Strong on skills, but ${list} ${verb}.`;
}
