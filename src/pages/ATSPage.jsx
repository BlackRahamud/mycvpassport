import ATSChecker from "../ATSChecker";

/** ATS score bottom sheet UI lives in `components/FAB/FABSheet.jsx` (`AtsFabScoreSheetBlock`, `dedicatedRoute === "ats"`), not on this page. */
export default function ATSPage({ onBack }) {
  return <ATSChecker onBack={onBack} />;
}
