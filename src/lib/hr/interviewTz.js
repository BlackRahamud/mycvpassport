/**
 * Interview timezones — the India to Gulf corridor, in words.
 *
 * The schedule modal shows a dual readout the moment date and time are both
 * set ("3:00 PM Dubai, 4:30 PM India"), never a raw offset. The candidate
 * zone is inferred from the CV location first, the job market second, and
 * she can override it from a short list (the seven corridor zones below).
 *
 * Everything here is pure; the modal only renders.
 */

const asText = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * The corridor. `label` is the override list copy, `word` is the word used
 * in the time line ("3:00 PM Dubai"), `hints` match free-text CV locations.
 */
export const CORRIDOR_ZONES = [
  {
    key: "india", label: "India", word: "India", tz: "Asia/Kolkata",
    // Browsers on Indian machines commonly report the legacy alias.
    tzAliases: ["Asia/Calcutta"],
    hints: [
      "india", "mumbai", "delhi", "new delhi", "bangalore", "bengaluru",
      "pune", "hyderabad", "chennai", "kolkata", "kochi", "cochin",
      "ahmedabad", "surat", "jaipur", "lucknow", "noida", "gurgaon",
      "gurugram", "kerala", "gujarat", "punjab", "tamil nadu", "maharashtra",
      "thiruvananthapuram", "trivandrum", "calicut", "kozhikode", "nagpur",
      "indore", "chandigarh", "coimbatore", "vadodara", "mangalore",
    ],
  },
  {
    key: "uae", label: "UAE", word: "Dubai", tz: "Asia/Dubai",
    hints: [
      "uae", "united arab emirates", "dubai", "abu dhabi", "sharjah",
      "ajman", "fujairah", "ras al khaimah", "umm al quwain", "al ain",
      "deira", "emirates",
    ],
  },
  {
    key: "ksa", label: "KSA", word: "Saudi Arabia", tz: "Asia/Riyadh",
    hints: ["saudi", "ksa", "riyadh", "jeddah", "dammam", "khobar", "mecca", "makkah", "medina", "madinah"],
  },
  { key: "qatar", label: "Qatar", word: "Qatar", tz: "Asia/Qatar", hints: ["qatar", "doha"] },
  { key: "oman", label: "Oman", word: "Oman", tz: "Asia/Muscat", hints: ["oman", "muscat", "salalah", "sohar"] },
  { key: "bahrain", label: "Bahrain", word: "Bahrain", tz: "Asia/Bahrain", hints: ["bahrain", "manama"] },
  { key: "kuwait", label: "Kuwait", word: "Kuwait", tz: "Asia/Kuwait", hints: ["kuwait"] },
];

export function zoneByKey(key) {
  return CORRIDOR_ZONES.find((z) => z.key === key) || null;
}

export function zoneByTz(tz) {
  return CORRIDOR_ZONES.find((z) => z.tz === tz || (z.tzAliases || []).includes(tz)) || null;
}

/** Free-text location ("Andheri, Mumbai", "Deira, Dubai") → corridor zone or null. */
export function zoneForLocation(locationText) {
  const s = asText(locationText).toLowerCase();
  if (!s) return null;
  for (const zone of CORRIDOR_ZONES) {
    if (zone.hints.some((h) => s.includes(h))) return zone;
  }
  return null;
}

/**
 * Candidate zone inference: CV location first, job market second.
 * Returns { zone, source: 'cv' | 'job' | null }; zone null when neither reads.
 */
export function inferCandidateZone({ cvLocation, jobLocation } = {}) {
  const fromCv = zoneForLocation(cvLocation);
  if (fromCv) return { zone: fromCv, source: "cv" };
  const fromJob = zoneForLocation(jobLocation);
  if (fromJob) return { zone: fromJob, source: "job" };
  return { zone: null, source: null };
}

/** The HR's own IANA timezone from the browser. */
export function hrTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dubai";
  } catch {
    return "Asia/Dubai";
  }
}

/** "3:00 PM" in the given IANA timezone. */
export function formatTimeIn(date, tz) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", timeZone: tz,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  }
}

/** "Tue 14 Jul" in the given IANA timezone. */
export function formatDayIn(date, tz) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "short", timeZone: tz,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(date);
  }
}

/** The word for an arbitrary IANA tz: corridor word, else the city segment. */
export function wordForTz(tz) {
  const zone = zoneByTz(tz);
  if (zone) return zone.word;
  const city = asText(tz).split("/").pop() || "";
  return city.replace(/_/g, " ") || "your time";
}

/**
 * The dual readout parts for one instant.
 * → { hrTime, hrWord, hrDay, candTime, candWord, candDay, same, dayDiffers }
 * `same` when both zones show the identical wall clock (compose
 * "3:00 PM Dubai, same time for Rohan"); otherwise compose
 * "3:00 PM Dubai, 4:30 PM India". `dayDiffers` flags a date flip so the
 * candidate line can carry its own day.
 */
export function dualTimeParts({ when, hrTz, candidateTz }) {
  const hTz = hrTz || hrTimeZone();
  const cTz = candidateTz || hTz;
  const hrTime = formatTimeIn(when, hTz);
  const candTime = formatTimeIn(when, cTz);
  const hrDay = formatDayIn(when, hTz);
  const candDay = formatDayIn(when, cTz);
  return {
    hrTime,
    hrWord: wordForTz(hTz),
    hrDay,
    candTime,
    candWord: wordForTz(cTz),
    candDay,
    same: hrTime === candTime && hrDay === candDay,
    dayDiffers: hrDay !== candDay,
  };
}

/**
 * The one line the modal, the confirmation, the email, and WhatsApp all
 * share: "3:00 PM Dubai, 4:30 PM India", or with a first name,
 * "3:00 PM Dubai, same time for Rohan" when the zones agree.
 */
export function dualTimeLine({ when, hrTz, candidateTz, firstName }) {
  const p = dualTimeParts({ when, hrTz, candidateTz });
  if (p.same) {
    return firstName ? `${p.hrTime} ${p.hrWord}, same time for ${firstName}` : `${p.hrTime} ${p.hrWord}`;
  }
  const candSide = p.dayDiffers ? `${p.candTime} ${p.candWord} on ${p.candDay}` : `${p.candTime} ${p.candWord}`;
  return `${p.hrTime} ${p.hrWord}, ${candSide}`;
}
