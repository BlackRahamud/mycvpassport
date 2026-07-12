/**
 * Reject reason codes — shared by the review mode's reject modal and the
 * pipeline list's bulk reject. Codes mirror the CHECK constraint added by
 * migration 037 (applications.reject_reason); labels are the interface
 * copy. Change both together.
 */
export const REJECT_REASONS = [
  { code: "salary_mismatch", label: "Salary mismatch" },
  { code: "notice_period_too_long", label: "Notice period too long" },
  { code: "visa_not_viable", label: "Visa not viable" },
  { code: "overqualified", label: "Overqualified" },
  { code: "no_gulf_experience", label: "No Gulf experience" },
  { code: "failed_screening_requirement", label: "Failed screening requirement" },
  { code: "other", label: "Other" },
];

export function rejectReasonLabel(code) {
  return REJECT_REASONS.find((r) => r.code === code)?.label || null;
}
