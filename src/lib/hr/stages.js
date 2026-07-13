/**
 * Pipeline stage config — single source of truth, shared by the stage
 * list, the kanban board, the analytics strip and their tests. Extracted
 * from JobPipelinePage so views can never drift apart.
 *
 * Order matters: it determines tab/column order, the "next stage"
 * advance target, and how DB statuses map onto a stage.
 */
export const STAGES = [
  // Entry stage (migration 037): applies AND imports land here. Existing
  // shortlist-column rows were moved to 'shortlisted' once by 037, so this
  // column starts empty for pre-migration candidates.
  { key: "new",         label: "New",         dbValues: ["new", "submitted", "viewed"],
    actionLabel: "Shortlist",   advanceTo: "shortlisted",
    statusLine: (date) => `Applied   ${date}`,
    nextLine: "Review the application, then Shortlist to keep them moving or Pass to archive." },
  // actionLabel is a VERB on a button, not a state readout — "Interviewed"
  // on the advance button read as the candidate's current stage in testing.
  { key: "shortlist",   label: "Shortlist",   dbValues: ["shortlisted"],
    actionLabel: "Mark interviewed", advanceTo: "interviewed",
    statusLine: (date) => `Shortlisted   ${date}`,
    nextLine: "Click Interviewed to request a screening call, or Pass to remove from Shortlist." },
  // Renamed from "Ready" (evaluation redesign): the DB status string stays
  // 'ready', only the label changed.
  { key: "ready",       label: "To interview", dbValues: ["ready"],
    actionLabel: "Mark interviewed", advanceTo: "interviewed",
    statusLine: (date) => `To interview   ${date}`,
    nextLine: "Schedule the interview and confirm when it has been completed." },
  { key: "interviewed", label: "Interviewed", dbValues: ["interviewed", "interviewing"],
    actionLabel: "Give offer",  advanceTo: "offered",
    statusLine: (date) => `Interviewed   ${date}`,
    nextLine: "If you want to hire, extend an offer via email soon and cc your Account Manager so you don't lose the candidate." },
  { key: "offer",       label: "Offer",       dbValues: ["offered"],
    actionLabel: "Mark hired",  advanceTo: "hired",
    statusLine: (date) => `Offer extended   ${date}`,
    nextLine: "Let us know if the candidate accepted your offer, so we can congratulate you." },
  { key: "hired",       label: "Hired",       dbValues: ["hired"],
    actionLabel: null,           advanceTo: null,
    statusLine: (date) => `Hired   ${date}`,
    nextLine: "Onboarding tracker is in your Account Manager's hands. You'll get a follow up note shortly." },
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
  new: "new",
  shortlist: "shortlisted",
  ready: "ready",
  interviewed: "interviewed",
  offer: "offered",
  hired: "hired",
};
