/**
 * Pipeline stage config — single source of truth, shared by the stage
 * list, the kanban board, the analytics strip and their tests. Extracted
 * from JobPipelinePage so views can never drift apart.
 *
 * Order matters: it determines tab/column order, the "next stage"
 * advance target, and how DB statuses map onto a stage.
 */
export const STAGES = [
  { key: "shortlist",   label: "Shortlist",   dbValues: ["new", "submitted", "viewed", "shortlisted"],
    actionLabel: "Interviewed", advanceTo: "interviewed",
    statusLine: (date) => `Shortlisted   ${date}`,
    nextLine: "Click Interviewed to request a screening call, or Pass to remove from Shortlist." },
  { key: "ready",       label: "Ready",       dbValues: ["ready"],
    actionLabel: "Interviewed", advanceTo: "interviewed",
    statusLine: (date) => `Ready to interview   ${date}`,
    nextLine: "Schedule the interview and confirm when it has been completed." },
  { key: "interviewed", label: "Interviewed", dbValues: ["interviewed", "interviewing"],
    actionLabel: "Give offer",  advanceTo: "offered",
    statusLine: (date) => `Interviewed   ${date}`,
    nextLine: "If you want to hire, extend an offer via email soon and cc your Account Manager so you don't lose the candidate." },
  { key: "offer",       label: "Offer",       dbValues: ["offered"],
    actionLabel: "Hired",       advanceTo: "hired",
    statusLine: (date) => `Offer extended   ${date}`,
    nextLine: "Let us know if the candidate accepted your offer, so we can congratulate you." },
  { key: "hired",       label: "Hired",       dbValues: ["hired"],
    actionLabel: null,           advanceTo: null,
    statusLine: (date) => `Hired   ${date}`,
    nextLine: "Onboarding tracker is in your Account Manager's hands — you'll get a follow-up note shortly." },
];

export const STAGE_BY_DB = STAGES.reduce((m, s) => {
  s.dbValues.forEach((v) => { m[v] = s.key; });
  return m;
}, {});

export const NEW_STATUSES = new Set(["new", "submitted", "viewed"]);

/**
 * Stage key → canonical DB status written when a candidate is MOVED INTO
 * that stage (kanban drop or move-to-stage menu). Matches the statuses
 * the list's advance/jump actions already write.
 */
export const STAGE_DROP_STATUS = {
  shortlist: "shortlisted",
  ready: "ready",
  interviewed: "interviewed",
  offer: "offered",
  hired: "hired",
};
