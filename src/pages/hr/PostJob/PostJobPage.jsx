import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import { getGatekeeperData } from "../../../services/gatekeeper";
import { submitJob } from "../../../services/postJob";
import { trackHr } from "../../../lib/analytics/hrEvents";
import { freeTierStatus } from "../../../utils/freeTier";
import FreeTierBanner from "../../../components/FreeTierBanner/FreeTierBanner";
import "./postJob.css";
import PostJobShell from "./PostJobShell";
import PostJobPreview from "./PostJobPreview";
import PostJobExpiredPaywall from "./PostJobExpiredPaywall";
import StartStep from "./steps/StartStep";
import NewJobStep, { DEFAULT_SALARY_PERIOD } from "./steps/NewJobStep";
import { marketFromCurrency } from "./market";
import QualificationsStep from "./steps/QualificationsStep";
import JobDescriptionStep from "./steps/JobDescriptionStep";
import HireStep from "./steps/HireStep";
import PostJobSuccess from "./PostJobSuccess";
import ScreeningCategoryModal from "./screening/ScreeningCategoryModal";
import ScreeningDrawer from "./screening/ScreeningDrawer";

// Realistic starting salary band per currency (walkthrough blocker: the
// old 50 to 1000 default read as absurd and was leaking into live jobs,
// e.g. "AED 50 to 4,000"). Only the STARTING value changes — jobs already
// posted keep whatever the HR saved.
const DEFAULT_SALARY_BAND = {
  AED: { min: 3000, max: 8000 },
  INR: { min: 25000, max: 60000 },
  USD: { min: 1000, max: 2500 },
};

const INITIAL_JOB = {
  // Step 1 — Start
  jobTitle: "",
  location: "",
  position: "onsite",
  jobType: "full-time",
  // Step 2 — Skills & Salary
  educationLevel: "",
  currency: "AED",
  salaryUnit: "per month",
  salaryMin: DEFAULT_SALARY_BAND.AED.min,
  salaryMax: DEFAULT_SALARY_BAND.AED.max,
  relevantSkills: [],
  tools: [],
  // Step 3 — Qualifications
  // Walkthrough blocker: 18 to 25 read as a senior-only demand out of the
  // box. 1 to 3 is a sane opener for the corridor's typical roles.
  yearsExperience: { min: 1, max: 3 },
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

  // She reached the post-a-job flow — the top of the "does she post at all"
  // funnel. hr_job_posted (below) is the completion.
  useEffect(() => { trackHr("hr_job_post_started"); }, []);

  // Salary period follows Job Type. When the type changes, snap the period
  // back to that type's default ("per month" for every type) so a Full-time
  // role can never carry a stale "per hour". Lives here so it survives step
  // navigation — the page never unmounts.
  useEffect(() => {
    setJob((j) => (j.salaryUnit === DEFAULT_SALARY_PERIOD ? j : { ...j, salaryUnit: DEFAULT_SALARY_PERIOD }));
  }, [job.jobType]);

  // Salary band follows the currency, but ONLY while untouched: if the
  // values still equal one of the default bands, a currency switch snaps
  // to that currency's band (so an INR job never opens at the AED numbers).
  // The moment the HR edits the band it is theirs and never overwritten.
  useEffect(() => {
    setJob((j) => {
      const band = DEFAULT_SALARY_BAND[j.currency];
      if (!band) return j;
      const untouched = Object.values(DEFAULT_SALARY_BAND).some(
        (b) => b.min === Number(j.salaryMin) && b.max === Number(j.salaryMax)
      );
      if (!untouched) return j;
      if (Number(j.salaryMin) === band.min && Number(j.salaryMax) === band.max) return j;
      return { ...j, salaryMin: band.min, salaryMax: band.max };
    });
  }, [job.currency]);

  const tier = user ? freeTierStatus(user) : null;
  const isFreeTier = gate ? !gate.isPaidUser : false;
  const showPaywall = isFreeTier && tier?.isExpired;
  const showBanner  = isFreeTier && tier?.showBanner && !tier?.isExpired;

  // Every step change opens at the top of the page — the walkthrough kept
  // landing mid-step and had to scroll up to find the heading.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

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
      // Post-a-job always creates a live job (never a pool — pools are made
      // from the Candidates page). kind normalised to the event enum.
      trackHr("hr_job_posted", { job_id: inserted?.id, kind: inserted?.kind === "pool" ? "pool" : "job" });
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
    // /employer/jobs is the HR job list; bare /jobs is the PUBLIC board and
    // dropped recruiters outside their portal.
    return <PostJobSuccess onGoToJobList={() => navigate("/employer/jobs")} postedJobId={postedJobId} />;
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
          <ScreeningCategoryModal key="cat-modal" open onClose={closeScreening} onPickCategory={pickCategory} market={marketFromCurrency(job.currency)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {screeningView === "drawer" && (
          <ScreeningDrawer key="screen-drawer" open categoryKey={drawerCategory} onClose={closeScreening} onSave={saveScreeningGroup} market={marketFromCurrency(job.currency)} />
        )}
      </AnimatePresence>
    </>
  );
}
