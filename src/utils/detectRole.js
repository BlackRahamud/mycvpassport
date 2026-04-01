import skillSuggestions from "../data/skillSuggestions";

export function detectRole(jobTitle) {
  if (!jobTitle) return null;
  const t = jobTitle.toLowerCase();
  if (t.match(/it support|help desk|helpdesk|technical support|desktop support/)) return "it_support";
  if (t.match(/bank|finance|financial|relationship officer|personal banking|teller/)) return "banking_finance";
  if (t.match(/hotel|hospitality|guest|front desk|concierge|f&b|food|beverage|receptionist/)) return "hospitality";
  if (t.match(/sales|real estate|property|broker|business development|account manager/)) return "sales_real_estate";
  if (t.match(/hr|human resource|recruitment|talent|people|payroll/)) return "hr_recruitment";
  if (t.match(/account|audit|tax|finance|bookkeep|vat|gst|tally/)) return "accounting_finance";
  return null;
}

export function getRoleSuggestions(jobTitle) {
  const role = detectRole(jobTitle);
  if (!role) return null;
  return { role, ...skillSuggestions[role] };
}

/**
 * Scan first lines of raw CV text for a job-title-shaped string that matches a known role.
 */
export function guessRoleFromResumeRaw(rawText, detectRoleFn = detectRole) {
  if (!rawText || typeof detectRoleFn !== "function") return null;
  const lines = String(rawText)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = 0; i < Math.min(12, lines.length); i++) {
    const r = detectRoleFn(lines[i]);
    if (r) return r;
  }
  const blob = lines.slice(0, 4).join(" ");
  return detectRoleFn(blob);
}
