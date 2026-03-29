import WalkInMode from "../WalkInMode";

export default function WalkInPage({ onBack, onComplete, setResume, setSelectedTemplate }) {
  return <WalkInMode onBack={onBack} onComplete={onComplete} setResume={setResume} setSelectedTemplate={setSelectedTemplate} />;
}
