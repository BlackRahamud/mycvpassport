import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./postJob.css";
import PostJobShell from "./PostJobShell";
import PostJobPreview from "./PostJobPreview";
import StartStep from "./steps/StartStep";
import NewJobStep from "./steps/NewJobStep";
import QualificationsStep from "./steps/QualificationsStep";
import ScreeningCategoryModal from "./screening/ScreeningCategoryModal";
import ScreeningDrawer from "./screening/ScreeningDrawer";

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
  // Step 3 — Qualifications
  yearsExperience: { min: 18, max: 25 },
  yearsExperiencePolicy: "required",
  workAuthPolicy: "required",
  screeningQuestionGroups: [],
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
  const [screeningView, setScreeningView] = useState(null);
  const [drawerCategory, setDrawerCategory] = useState(null);

  const idx = STEP_ORDER.indexOf(step);
  const goNext = () => { if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]); };
  const goPrev = () => { if (idx > 0) setStep(STEP_ORDER[idx - 1]); };

  const openCategoryPicker = () => setScreeningView("categories");
  const pickCategory = (key) => { setDrawerCategory(key); setScreeningView("drawer"); };
  const closeScreening = () => { setScreeningView(null); setDrawerCategory(null); };
  const saveScreeningGroup = (group) => {
    setJob((j) => {
      const others = (j.screeningQuestionGroups || []).filter((g) => g.categoryKey !== group.categoryKey);
      return { ...j, screeningQuestionGroups: [...others, group] };
    });
    closeScreening();
  };

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
      {step === "qualifications" && (
        <motion.div key="qualifications" {...stepMotion} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <QualificationsStep
            value={job}
            onChange={setJob}
            onContinue={goNext}
            onBack={goPrev}
            onAddScreeningQuestion={(catKey) => { if (catKey) pickCategory(catKey); else openCategoryPicker(); }}
            onViewQuestionGroup={(catKey) => pickCategory(catKey)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <PostJobShell currentStep={step} leftSlot={left} rightSlot={<PostJobPreview step={step} job={job} />} />
      <AnimatePresence>
        {screeningView === "categories" && (
          <ScreeningCategoryModal key="cat-modal" open onClose={closeScreening} onPickCategory={pickCategory} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {screeningView === "drawer" && (
          <ScreeningDrawer key="screen-drawer" open categoryKey={drawerCategory} onClose={closeScreening} onSave={saveScreeningGroup} />
        )}
      </AnimatePresence>
    </>
  );
}
