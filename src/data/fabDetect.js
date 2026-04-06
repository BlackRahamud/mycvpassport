export const VAGUE_TITLES = [
  "manager","staff","employee","assistant",
  "consultant","contractor","intern","specialist","professional",
  "freelancer","owner","founder","partner","director","lead",
  "head","coordinator"
];

export const SOFT_SKILLS = [
  "team player","hardworking","punctual","leadership","communication",
  "motivated","flexible","reliable","organized","creative",
  "detail-oriented","problem solver","time management","adaptable",
  "honest","dedicated","enthusiastic","professional","friendly",
  "patient","focused","loyal","sincere","disciplined","multi-tasking",
  "people person","strategic thinker","self-starter","collaborative","empathetic"
];

export const HELPLESS_PHRASES = [
  "i don't know",
  "idk",
  "dont know",
  "don't know",
  "write for me",
  "skip",
  "not sure",
  "no idea",
  "i have no idea",
  "n/a",
];

export const DATE_REGEX = {
  yearOnly: /\b(19|20)\d{2}\b/g,
  yearRange: /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/,
  relative: /\b(last|since|for)\s+\d+\s+years?\b/i,
  sinceYear: /\bsince\s+(19|20)\d{2}\b/i,
  ddmmyyyy: /\d{1,2}\/\d{1,2}\/\d{4}/,
};

export const isHelpless = (str) => {
  const lower = str.trim().toLowerCase();
  return HELPLESS_PHRASES.some((p) => {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}$|\\b${escaped}\\b`, "i").test(lower);
  });
};

export const isCommaMissing = (str) => {
  if (str.includes(",")) return false;
  return /\s+and\s+|\s+&\s+|\/|(?:\s{2,})/i.test(str);
};

export const hasNoMetrics = (str) =>
  !/\d|%|x\d|doubled|tripled|increased|reduced|grew/i.test(str);

export const isNameIncomplete = (str) =>
  str.trim().length < 2 ||
  /^(Mr|Ms|Dr|Mrs)\.?\s/i.test(str);

export const isAllSoftSkills = (skillsArray) => {
  const lower = skillsArray.map((s) => s.toLowerCase());
  return lower.every((s) =>
    SOFT_SKILLS.some((soft) => s.includes(soft))
  );
};

export const isExperienceDump = (str) =>
  str.split(/\s+/).length > 5 &&
  /(19|20)\d{2}/.test(str) &&
  VAGUE_TITLES.some((t) => str.toLowerCase().includes(t));

export const isTooShort = (str, min = 3) =>
  str.trim().length < min;

export const isVagueTitle = (str) =>
  VAGUE_TITLES.includes(str.trim().toLowerCase());
