import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./postJob.css";
import PostJobShell from "./PostJobShell";
import PostJobPreview from "./PostJobPreview";
import StartStep from "./steps/StartStep";
import NewJobStep from "./steps/NewJobStep";

const INITIAL_JOB = {
  // Step 1 — Start
  jobTitle: "",
  position: "remote",
  jobType: "full-time",
  // Step 2 — Skills & Salary
  educationLevel: "",
  salaryUnit: "per Hour",
  salaryMin: 50,
  salaryMax: 1000,
  relevantSkills: ["react-native"],
  tools: ["Java"],
};

const STEP_ORDER = ["start", "new-job", "qualifications", "job-description", "hire"];

const stepMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
};

export default function PostJobPage() {
  const [step, setStep] = useState("start");
  const [job, setJob] = useState(INITIAL_JOB);

  const idx = STEP_ORDER.indexOf(step);
  const goNext = () => { if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]); };
  const goPrev = () => { if (idx > 0) setStep(STEP_ORDER[idx - 1]); };

  const left = (
    <AnimatePresence mode="wait">
      {step === "start" && (
        <motion.div key="start" {...stepMotion} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <StartStep value={job} onChange={setJob} onContinue={goNext} />
        </motion.div>
      )}
      {step === "new-job" && (
        <motion.div key="new-job" {...stepMotion} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <NewJobStep value={job} onChange={setJob} onContinue={goNext} onBack={goPrev} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return <PostJobShell currentStep={step} leftSlot={left} rightSlot={<PostJobPreview step={step} job={job} />} />;
}
