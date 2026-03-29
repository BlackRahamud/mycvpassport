import WalkInMode from "../WalkInMode";

/**
 * Post-generation progress ladder renders when CV is ready.
 * Steps: CV built (done) → ATS scan (upgrade) → Full builder (upgrade).
 * CTAs navigate to ATS tab and builder. Download button below.
 */
export default function WalkInPage({ onBack, onComplete, setResume, setSelectedTemplate }) {
  return <WalkInMode onBack={onBack} onComplete={onComplete} setResume={setResume} setSelectedTemplate={setSelectedTemplate} />;
}
