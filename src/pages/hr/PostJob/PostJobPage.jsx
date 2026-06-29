import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import { getGatekeeperData } from "../../../services/gatekeeper";
import { submitJob } from "../../../services/postJob";
import { freeTierStatus } from "../../../utils/freeTier";
import FreeTierBanner from "../../../components/FreeTierBanner/FreeTierBanner";
import "./postJob.css";
import PostJobShell from "./PostJobShell";
import PostJobPreview from "./PostJobPreview";
import PostJobExpiredPaywall from "./PostJobExpiredPaywall";
import StartStep from "./steps/StartStep";
import NewJobStep from "./steps/NewJobStep";
import QualificationsStep from "./steps/QualificationsStep";
import JobDescriptionStep from "./steps/JobDescriptionStep";
import HireStep from "./steps/HireStep";
import PostJobSuccess from "./PostJobSuccess";
import ScreeningCategoryModal from "./screening/ScreeningCategoryModal";
import ScreeningDrawer from "./screening/ScreeningDrawer";

const INITIAL_JOB = {
  // Step 1 — Start
  jobTitle: "",
  location: "",
  position: "onsite",
  jobType: "full-time",
  // Step 2 — Skills & Salary
  educationLevel: "",
  currency: "AED",
  salaryUnit: "per Hour",
  salaryMin: 50,
  salaryMax: 1000,
  relevantSkills: [],
  tools: [],
  // Step 3 — Qualifications
  yearsExperience: { min: 18, max: 25 },
  yearsExperiencePolicy: "required",
  workAuthPolicy: "required",
  visaStatus: [],
  uaeDrivingLicense: false,
  originDrivingLicense: false,
  screeningQuestionGroups: [],
  // Step 4 — Job Description
  jobDescription: "",
  // Step 5 — Hire
  hrPhoneCountryCode: "+971",
  hrPhone: "",
  consentSubscription: false,
  consentTerms: false,
};

const STEP_ORDER = ["start", "new-job", "qualifications", "job-description", "hire"];

const stepMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
};

export default function PostJobPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("start");
  const [job, setJob] = useState(INITIAL_JOB);
  const [screeningView, setScreeningView] = useState(null);
  const [drawerCategory, setDrawerCategory] = useState(null);
  const [user, setUser] = useState(null);
  const [gate, setGate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [postedJobId, setPostedJobId] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([supabase.auth.getUser(), getGatekeeperData()])
      .then(([{ data }, g]) => { if (!live) return; setUser(data?.user || null); setGate(g); })
      .catch(() => { if (!live) return; setGate({ isPaidUser: false }); });
    return () => { live = false; };
  }, []);

  const tier = user ? freeTierStatus(user) : null;
  const isFreeTier = gate ? !gate.isPaidUser : false;
  const showPaywall = isFreeTier && tier?.isExpired;
  const showBanner  = isFreeTier && tier?.showBanner && !tier?.isExpired;

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

  const handleHire = async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const inserted = await submitJob({ user, job });
      setPostedJobId(inserted?.id || null);
      setStep("success");
    } catch (err) {
      const msg = err?.code === "unauthenticated"
        ? "Sign in to post a job. We'll bring you back here."
        : err?.message || "Couldn't post the job. Try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
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
            value={job} onChange={setJob} onContinue={goNext} onBack={goPrev}
            onAddScreeningQuestion={(catKey) => { if (catKey) pickCategory(catKey); else openCategoryPicker(); }}
            onViewQuestionGroup={(catKey) => pickCategory(catKey)}
          />
        </motion.div>
      )}
      {step === "job-description" && (
        <motion.div key="job-description" {...stepMotion} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <JobDescriptionStep value={job} onChange={setJob} onContinue={goNext} onBack={goPrev} />
        </motion.div>
      )}
      {step === "hire" && (
        <motion.div key="hire" {...stepMotion} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <HireStep
            value={job}
            onChange={setJob}
            onHire={handleHire}
            onBack={goPrev}
            submitting={submitting}
            errorMessage={submitError}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (step === "success") {
    return <PostJobSuccess onGoToJobList={() => navigate("/jobs")} postedJobId={postedJobId} />;
  }

  if (showPaywall) {
    return <PostJobExpiredPaywall daysSinceSignup={tier?.daysSinceSignup} />;
  }

  return (
    <>
      <Helmet><title>Post a Job · CVPassport</title></Helmet>
      <PostJobShell
        currentStep={step}
        topSlot={showBanner ? <FreeTierBanner daysRemaining={tier.daysRemaining} /> : null}
        leftSlot={left}
        rightSlot={<PostJobPreview step={step} job={job} />}
      />
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
