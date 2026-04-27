// Gulf identity-document format validators.
//
// Originally specified as gulf_ids.ts in the seed-data pack. Ported to
// .js because this CRA project doesn't have TypeScript bootstrapped
// yet. Promote to .ts in a future PR if TypeScript adoption is desired.
//
// Format references:
//   Emirates ID — UAE ICA, Microsoft Purview, regex101 community
//   Iqama / Saudi National ID — SAP support 2384001, Oracle Fusion docs
//   QID — Qatar Ministry of Interior public guidance
//   CPR — Bahrain iGA
//   Civil ID — Kuwait PACI
//   Resident Card — Oman ROP

/**
 * Emirates ID — UAE
 * Format: 784-YYYY-NNNNNNN-N (15 digits total)
 * Note: check-digit algorithm is NOT plain Luhn. For Phase 1, accept
 * format match. Add full checksum later by reverse-engineering against
 * a fixture set of known-valid IDs.
 */
export const EMIRATES_ID = {
  regex: /^784-?\d{4}-?\d{7}-?\d{1}$/,
  digits_only: /^784\d{12}$/,
  parts: {
    country_code: { offset: 0, length: 3, expected: "784" },
    year_or_random: { offset: 3, length: 4 },
    unique: { offset: 7, length: 7 },
    check_digit: { offset: 14, length: 1 },
  },
  /**
   * @param {string} input
   * @returns {boolean}
   */
  validate: (input) => {
    const cleaned = String(input).replace(/-/g, "");
    return /^784\d{12}$/.test(cleaned);
  },
};

/**
 * Iqama — Saudi Arabia
 * Format: 10 digits, starts with 2 (1 = Saudi citizen national ID)
 */
export const IQAMA = {
  regex: /^2\d{9}$/,
  /**
   * @param {string} input
   * @returns {boolean}
   */
  validate: (input) => {
    const cleaned = String(input).replace(/[\s-]/g, "");
    return /^2\d{9}$/.test(cleaned);
  },
  // Saudi National ID (citizen) starts with 1
  national_id_regex: /^1\d{9}$/,
};

/**
 * QID — Qatar (Qatari ID Card)
 * Format: 11 digits, century-encoded first digit
 */
export const QID = {
  regex: /^[23]\d{10}$/,
  /**
   * @param {string} input
   * @returns {boolean}
   */
  validate: (input) => {
    const cleaned = String(input).replace(/[\s-]/g, "");
    return /^[23]\d{10}$/.test(cleaned);
  },
};

/**
 * CPR — Bahrain
 */
export const CPR_BAHRAIN = {
  regex: /^\d{9}$/,
};

/**
 * Civil ID — Kuwait
 */
export const CIVIL_ID_KUWAIT = {
  regex: /^[23]\d{11}$/,
};

/**
 * Resident Card — Oman
 */
export const RESIDENT_CARD_OMAN = {
  regex: /^\d{8,10}$/,
};
