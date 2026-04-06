const MONTH_MAP = {
  "1":"Jan","01":"Jan","jan":"Jan","january":"Jan",
  "2":"Feb","02":"Feb","feb":"Feb","february":"Feb",
  "3":"Mar","03":"Mar","mar":"Mar","march":"Mar",
  "4":"Apr","04":"Apr","apr":"Apr","april":"Apr",
  "5":"May","05":"May","may":"May",
  "6":"Jun","06":"Jun","jun":"Jun","june":"Jun",
  "7":"Jul","07":"Jul","jul":"Jul","july":"Jul",
  "8":"Aug","08":"Aug","aug":"Aug","august":"Aug",
  "9":"Sep","09":"Sep","sep":"Sep","september":"Sep",
  "10":"Oct","oct":"Oct","october":"Oct",
  "11":"Nov","nov":"Nov","november":"Nov",
  "12":"Dec","dec":"Dec","december":"Dec",
};

const PRESENT_WORDS = ["current","now","present","till date","today","ongoing"];

export const parseSkills = (str) =>
  str
    .split(/,|\s+and\s+|\s+&\s+|\/|\s{2,}/i)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 2 &&
        !["with","using","expert","in","at","the","and"].includes(
          s.toLowerCase()
        )
    );

export const normalizeDate = (str) => {
  const s = str.toLowerCase().trim();
  if (PRESENT_WORDS.some((w) => s.includes(w))) return "Present";
  const ddmm = s.match(/(\d{1,2})\/(\d{1,2})\/((19|20)\d{2})/);
  if (ddmm) {
    const month = MONTH_MAP[ddmm[2]] || "Jan";
    return `${month} ${ddmm[3]}`;
  }
  const yearMatch = s.match(/(19|20)\d{2}/);
  const monthMatch = s.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-1]?\d)/i
  );
  const year = yearMatch ? yearMatch[0] : "";
  const month = monthMatch
    ? MONTH_MAP[monthMatch[0].toLowerCase()] || "Jan"
    : "";
  if (year && month) return `${month} ${year}`;
  if (year) return year;
  return str;
};

export const parseDateRange = (str) => {
  const parts = str
    .split(/[\u2013\u2014\u2012-]+|\s+to\s+/i)
    .map((s) => s.trim());
  if (parts.length >= 2) {
    return {
      startDate: normalizeDate(parts[0]),
      endDate: normalizeDate(parts[1]),
      present: PRESENT_WORDS.some((w) =>
        parts[1].toLowerCase().includes(w)
      ),
    };
  }
  return {
    startDate: normalizeDate(str),
    endDate: "Present",
    present: true,
  };
};

export const parseSkillsString = (str) =>
  parseSkills(str).join(", ");

export const parseAchievements = (str) => {
  const numberedSplit = str.split(/\d[.)]\s+/).filter(Boolean);
  if (numberedSplit.length > 1) return numberedSplit.map((s) => s.trim());
  const sentenceSplit = str
    .split(/\.\s+|;\s+|\s+and\s+|\s+also\s+|\s+as well as\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  return sentenceSplit.length > 1 ? sentenceSplit : [str.trim()];
};

export const reframeAchievement = (str) =>
  str
    .replace(/^(I was )?responsible for /i, "Spearheaded ")
    .replace(/^(I )?managed /i, "Orchestrated ")
    .replace(/^(I )?handled /i, "Optimized ")
    .replace(/^(I )?assisted /i, "Supported ")
    .replace(/^(I )?helped /i, "Contributed to ")
    .replace(/^(I )?worked on /i, "Delivered ")
    .trim();

export const normalizeAllCaps = (str) =>
  str === str.toUpperCase() && str.length > 3
    ? str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
    : str;

export const parseExperienceDump = (str) => {
  const yearMatches = [...str.matchAll(/(19|20)\d{2}/g)];
  const years = yearMatches.map((m) => m[0]);
  const presentMatch = /current|present|now/i.test(str);
  return {
    startDate: years[0] || "",
    endDate: presentMatch ? "Present" : years[1] || "",
    present: presentMatch,
    rawDump: str,
  };
};
