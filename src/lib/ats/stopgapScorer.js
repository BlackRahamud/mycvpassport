/**
 * stopgapScorer — pre-Phase-1 keyword-overlap ATS score.
 *
 * Pure function. Takes a job's requirements bullet list + a
 * CVPassport CV (the same shape stored in `cvs.cv_data`), tokenises
 * both, and returns a 0–100 match score with the matched + missing
 * requirement bullets.
 *
 * Tagged with score_source='stopgap_keyword' so the Phase 1 parser+
 * scorer can later overwrite these rows cleanly (it only touches
 * rows whose score_source is 'stopgap_keyword' or NULL).
 *
 * Algorithm: each requirement bullet is split into meaningful
 * tokens. A bullet is "matched" if at least one of its tokens
 * appears anywhere in the candidate's skill/experience/education
 * surface. Score = matched / total bullets × 100. Stopwords + filler
 * are removed before matching, so bullets like "5+ years experience"
 * keep '5+' and 'years' but the scorer ignores them.
 *
 * Limits / known weaknesses (intentional — Phase 1 fixes):
 *  - No semantic similarity: "machine learning" vs "ML" doesn't
 *    match. Bigrams are not generated.
 *  - No weight per requirement.
 *  - Doesn't read the uploaded PDF — only the structured CV blob.
 *  - Doesn't penalise keyword stuffing.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "with", "for", "to", "on", "at",
  "by", "is", "be", "as", "are", "was", "were", "this", "that", "it", "you",
  "we", "our", "your", "their", "they", "them", "if", "then", "else", "but",
  "not", "no", "do", "does", "done", "who", "which", "what", "when", "where",
  "how", "why", "using", "use", "used", "any", "all", "some", "more", "most",
  "over", "under", "up", "down", "out", "into", "than", "such", "also",
  "work", "working", "experience", "experiences", "year", "years", "etc",
  "via", "across", "plus", "minimum", "min", "preferred", "ability", "able",
  "must", "should", "have", "has", "had", "willing", "willingness", "team",
  "teams", "knowledge", "skills", "skill", "proficient", "strong", "good",
  "excellent", "great", "deep", "solid", "proven", "track", "record",
  "responsibilities", "responsibility", "responsible", "duties", "role", "roles",
]);

/* Tokenise. Keeps + # . - / inside tokens so technical terms like
   c++, c#, .net, react.js, full-stack, ci/cd survive the split. */
export function tokenize(text) {
  if (text == null) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9+#./\- ]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/* Walk the structured CV and produce a Set of every token that
   could plausibly satisfy a requirement. Pulls from skills,
   experience (title/company/description/bullets), education,
   summary, headline, certifications, and projects. */
export function tokenSetFromCv(cv) {
  const out = new Set();
  if (!cv || typeof cv !== "object") return out;

  const push = (text) => tokenize(text).forEach((t) => out.add(t));

  // Skills: array of strings or objects with .name / .label.
  const skills = cv.skills || cv.skill_list || cv.tools || [];
  if (Array.isArray(skills)) {
    skills.forEach((s) => push(typeof s === "string" ? s : (s?.name || s?.label || "")));
  }

  // Experience: title + company + description + bullet points.
  const exp = Array.isArray(cv.experience) ? cv.experience : [];
  exp.forEach((e) => {
    push(e.title || e.role);
    push(e.company || e.employer);
    push(e.description || e.summary);
    const bullets = Array.isArray(e.points) ? e.points
                  : Array.isArray(e.bullets) ? e.bullets
                  : Array.isArray(e.achievements) ? e.achievements
                  : [];
    bullets.forEach((b) => push(typeof b === "string" ? b : (b?.text || "")));
  });

  // Education.
  const edu = Array.isArray(cv.education) ? cv.education : [];
  edu.forEach((e) => {
    push(e.school || e.institution);
    push(e.degree);
    push(e.field || e.major);
  });

  // Summaries / headline / personal statement.
  push(cv.summary || cv.profile || cv.objective);
  push(cv.headline || cv.title);
  const personal = cv.personal || cv.basics || {};
  push(personal.headline);
  push(personal.summary);

  // Certifications + projects (defensive — names vary).
  const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
  certs.forEach((c) => push(typeof c === "string" ? c : (c?.name || c?.title || "")));
  const projects = Array.isArray(cv.projects) ? cv.projects : [];
  projects.forEach((p) => {
    if (typeof p === "string") return push(p);
    push(p?.name || p?.title);
    push(p?.description);
  });

  return out;
}

/* Normalise the job's requirements input into a flat string[] of
   bullet-style requirement lines.
   - jsonb array of strings  → return as-is
   - jsonb array of objects  → pull .text / .label / .value
   - newline-delimited text  → split on \n
   - single string           → wrap in [string] */
function normaliseReqs(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((r) => (typeof r === "string" ? r : (r?.text || r?.label || r?.value || "")))
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  return String(input)
    .split(/\r?\n+/)
    .map((s) => s.replace(/^[\s\-•·*]+/, "").trim())
    .filter(Boolean);
}

/**
 * Score an application against a job.
 * @param {Object}   args
 * @param {Array|String} args.jobRequirements
 * @param {Object}   args.candidateCv  Same shape stored in cvs.cv_data.
 * @returns {{ score: number, score_source: 'stopgap_keyword',
 *            match_keywords: string[], missing_keywords: string[],
 *            computed_at: string }}
 */
export function scoreApplicationStopgap({ jobRequirements, candidateCv }) {
  const reqs = normaliseReqs(jobRequirements);
  const candidateTokens = tokenSetFromCv(candidateCv);

  const matched = [];
  const missing = [];
  for (const req of reqs) {
    const reqTokens = Array.from(new Set(tokenize(req)));
    if (!reqTokens.length) continue;
    const hit = reqTokens.find((t) => candidateTokens.has(t));
    if (hit) matched.push(req);
    else      missing.push(req);
  }
  const total = matched.length + missing.length;
  // No requirements supplied → no signal. Don't fake a 50 — a 0 with
  // an empty match list is the honest answer the pipeline can render.
  const score = total === 0 ? 0 : Math.round((matched.length / total) * 100);

  return {
    score,
    score_source: "stopgap_keyword",
    // Truncate so the jsonb columns stay reasonable. The pipeline UI
    // shows up to 8 chips per side; 12 is a comfortable margin.
    match_keywords: matched.slice(0, 12),
    missing_keywords: missing.slice(0, 12),
    computed_at: new Date().toISOString(),
  };
}
