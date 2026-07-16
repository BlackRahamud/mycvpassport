// =============================================================
// src/lib/jobs/cvSnapshot.js
//
// builderCvToSnapshot — the apply-time shim.
//
// The builder saves camelCase `cv_data` (EMPTY_RESUME shape: visaStatus,
// skills as a comma STRING, experience[].points, education[].fieldOfStudy).
// Every HR reader — the Sonnet verdict (summariseCvForVerdict), readiness.js,
// and the stopgap scorer — was written against the import_structure snapshot
// contract (snake_case, skills as an ARRAY, experience[].bullets). applyToJob
// used to pour cv_data into applications.cv_snapshot verbatim, so a candidate
// who applied through our own board was scored near-blind: their skills,
// experience detail, target role and visa all read as empty.
//
// This is the ONE place that reconciles the two shapes. Fix the writer, not
// the readers: a single mapper here keeps every reader on one contract, so
// the next reader added can trust the shape without re-learning this bug.
//
// The output is a SUPERSET — it spreads the original cv_data (so nothing a
// display might show, e.g. linkedin / languages / certifications, is lost)
// and overlays the contract fields with the correct names and shapes.
// Idempotent: an object already in the contract shape maps to itself.
// =============================================================

const str = (v) => {
  const t = v == null ? "" : String(v).trim();
  return t ? t.slice(0, 2000) : null;
};

// A comma / newline / semicolon list (builder skills string) OR an array of
// strings/objects → a clean string[].
const toList = (v) => {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : x?.name || x?.label || ""))
      .map((x) => String(x).trim())
      .filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
};

// A newline-delimited bullet string (builder points) OR an array of
// strings/objects → a clean string[], stripping leading bullet glyphs.
const toBullets = (v) => {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : x?.text || ""))
      .map((x) => String(x).replace(/^[\s\-•·*]+/, "").trim())
      .filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(/\r?\n+/).map((x) => x.replace(/^[\s\-•·*]+/, "").trim()).filter(Boolean);
  }
  return [];
};

// Builder Personal Details lives in customFields[{ id, name, value }].
const customVal = (customFields, id) => {
  const arr = Array.isArray(customFields) ? customFields : [];
  const hit = arr.find((e) => e && (e.id === id || String(e.name || "").toLowerCase() === id.replace(/_/g, " ")));
  return hit ? str(hit.value) : null;
};

/**
 * Map a builder-shape `cv_data` (or an already-contract snapshot) onto the
 * cv_snapshot contract the HR readers consume. Pure. Never invents a value:
 * a field with no source in the builder (salary_expectation, passport_status)
 * stays null.
 */
export function builderCvToSnapshot(cv) {
  if (!cv || typeof cv !== "object" || Array.isArray(cv)) return cv;

  const cf = cv.customFields;
  const location = str(cv.location) || str(cv.personal?.location);
  const desired_job = str(cv.desired_job) || str(cv.title) || str(cv.headline) || str(cv.personal?.headline);

  const experience = Array.isArray(cv.experience)
    ? cv.experience.map((e) => {
        const start = str(e?.start_date) || str(e?.startDate) || str(e?.period);
        const end = e?.present ? "Present" : (str(e?.end_date) || str(e?.endDate));
        return {
          ...e,
          title: str(e?.title) || str(e?.role),
          company: str(e?.company) || str(e?.employer),
          location: str(e?.location),
          start_date: start,
          end_date: end,
          // contract wants `bullets[]`; builder gives `points` (a string).
          bullets: toBullets(
            Array.isArray(e?.bullets) && e.bullets.length ? e.bullets : (e?.points ?? e?.description),
          ),
        };
      })
    : [];

  const education = Array.isArray(cv.education)
    ? cv.education.map((e) => ({
        ...e,
        degree: str(e?.degree),
        field: str(e?.field) || str(e?.fieldOfStudy) || str(e?.major),
        school: str(e?.school) || str(e?.institution),
        location: str(e?.location),
        start_date: str(e?.start_date) || str(e?.startDate),
        end_date: str(e?.end_date) || str(e?.endDate) || str(e?.year),
      }))
    : [];

  return {
    ...cv, // preserve display-only extras (linkedin, languages, certifications, dob, ...)
    name: str(cv.name),
    email: str(cv.email),
    phone: str(cv.phone),
    location,
    nationality: str(cv.nationality) || str(cv.personal?.nationality),
    desired_job,
    summary: str(cv.summary),
    // casing bridge: builder writes visaStatus / availability.
    visa_status: str(cv.visa_status) || str(cv.visaStatus) || customVal(cf, "visa_status"),
    notice_period: str(cv.notice_period) || str(cv.availability) || customVal(cf, "notice_period"),
    // No builder field exists for these — cannot map, honest null (never guessed).
    salary_expectation: str(cv.salary_expectation) || str(cv.expected_salary) || null,
    passport_status: str(cv.passport_status) || null,
    // contract wants an ARRAY; builder gives a comma string.
    skills: toList(cv.skills),
    experience,
    education,
    personal: {
      ...(cv.personal || {}),
      location,
      headline: desired_job,
      job_type: str(cv.personal?.job_type),
    },
  };
}
