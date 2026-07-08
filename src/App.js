import { useEffect, useState, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import ReactGA from "react-ga4";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { deleteResume } from "./resumeDb";
import { useCvpAuth } from "./useCvpAuth";
import NavigateToAuth from "./lib/auth/navigateToAuth";
import { setLastPortal } from "./lib/employer/portalMemory";
import LandingPage from "./LandingPage";
import { C } from "./builderStyles";
import { EMPTY_RESUME, TEMPLATES } from "./cvShared";

// Route-level code splitting. Every page below the homepage is loaded
// on-demand so visitors who only see the landing page never download
// the builder, dashboard, admin, scout, transform, blog etc.
const PricingPage          = lazy(() => import(/* webpackChunkName: "pricing" */     "./pages/PricingPage"));
const AdminPanelV2         = lazy(() => import(/* webpackChunkName: "admin" */       "./AdminPanelV2"));
const AuthPage             = lazy(() => import(/* webpackChunkName: "auth" */        "./pages/AuthPage"));
const AuthCallback         = lazy(() => import(/* webpackChunkName: "auth" */        "./pages/AuthCallback"));
const CoverLetterPage      = lazy(() => import(/* webpackChunkName: "cover-letter" */ "./pages/CoverLetterPage"));
const BuilderPage          = lazy(() => import(/* webpackChunkName: "builder" */     "./pages/BuilderPage"));
const DashboardPage        = lazy(() => import(/* webpackChunkName: "dashboard" */   "./pages/DashboardPage"));
const ATSPage              = lazy(() => import(/* webpackChunkName: "ats" */         "./pages/ATSPage"));
const WalkInPage           = lazy(() => import(/* webpackChunkName: "walk-in" */     "./pages/WalkInPage"));
const AccountPage          = lazy(() => import(/* webpackChunkName: "account" */     "./pages/AccountPage"));
const InvoicesList         = lazy(() => import(/* webpackChunkName: "account" */     "./pages/account/InvoicesList"));
const InvoiceDetail        = lazy(() => import(/* webpackChunkName: "account" */     "./pages/account/InvoiceDetail"));
const TemplatesPage        = lazy(() => import(/* webpackChunkName: "templates" */   "./pages/TemplatesPage"));
const TermsPage            = lazy(() => import(/* webpackChunkName: "legal" */       "./pages/TermsPage"));
const PrivacyPage          = lazy(() => import(/* webpackChunkName: "legal" */       "./pages/PrivacyPage"));
const RefundPage           = lazy(() => import(/* webpackChunkName: "legal" */       "./pages/RefundPage"));
const PaymentSuccess       = lazy(() => import(/* webpackChunkName: "payment" */     "./pages/PaymentSuccess"));
const ResetPassword        = lazy(() => import(/* webpackChunkName: "auth" */        "./pages/ResetPassword"));
// /hr is now an alias for /hr/jobs — the legacy HRPortal page (a
// parallel candidate-pipeline UI) was deleted on 2026-05-05 in favour
// of the unified /hr/jobs + /hr/jobs/:id stack. The shared ScoreRing
// and scoreBand it once owned moved to src/components/hr/ +
// src/lib/ats/ before the deletion.
const HrShell              = lazy(() => import(/* webpackChunkName: "hr-shell" */    "./components/hr/HrShell"));
const RequireRecruiter     = lazy(() => import(/* webpackChunkName: "hr-shell" */    "./components/hr/RequireRecruiter"));
const PostJobPage          = lazy(() => import(/* webpackChunkName: "hr-post" */     "./pages/hr/PostJob/PostJobPage"));
const HRJobsListPage       = lazy(() => import(/* webpackChunkName: "hr-jobs" */     "./pages/hr/Jobs/JobsListPage"));
const JobPipelinePage      = lazy(() => import(/* webpackChunkName: "hr-pipeline" */ "./pages/hr/Jobs/JobPipelinePage"));
const CandidatesPage       = lazy(() => import(/* webpackChunkName: "hr-candidates" */ "./pages/hr/Candidates/CandidatesPage"));
const HrPricing            = lazy(() => import(/* webpackChunkName: "hr-pricing" */    "./pages/hr/Pricing/HrPricing"));
const JobPage              = lazy(() => import(/* webpackChunkName: "jobs" */        "./pages/JobPage"));
const EmployerLandingPage  = lazy(() => import(/* webpackChunkName: "employer" */    "./pages/employer/EmployerLandingPage"));
const EmployerOnboardingPage = lazy(() => import(/* webpackChunkName: "employer" */  "./pages/employer/EmployerOnboardingPage"));
const SharedCandidatePage  = lazy(() => import(/* webpackChunkName: "shared-candidate" */ "./pages/SharedCandidatePage"));
// JobsListPage (dark-theme corridor list) replaced by JobBoardPage on 2026-05-05.
// Kept the file in-place for one-PR cleanup; remove import after follow-up sweep.
const JobBoardPage         = lazy(() => import(/* webpackChunkName: "jobs-board" */  "./pages/jobs/JobBoardPage"));
const ApplicationsPage     = lazy(() => import(/* webpackChunkName: "applications" */ "./pages/ApplicationsPage"));
const LinkedInOptimizer    = lazy(() => import(/* webpackChunkName: "linkedin" */    "./pages/LinkedInOptimizer"));
const SalarySwitcher       = lazy(() => import(/* webpackChunkName: "salary" */      "./pages/SalarySwitcher"));
const ScoutDashboard       = lazy(() => import(/* webpackChunkName: "scout" */       "./pages/ScoutDashboard"));
const TransformPage        = lazy(() => import(/* webpackChunkName: "transform" */   "./pages/TransformPage"));
const TransformSuccessPage = lazy(() => import(/* webpackChunkName: "transform" */   "./pages/TransformSuccessPage"));
const ToolsPage            = lazy(() => import(/* webpackChunkName: "tools" */       "./pages/ToolsPage"));
const BlogPage             = lazy(() => import(/* webpackChunkName: "blog" */        "./pages/BlogPage"));
const BlogPostPage         = lazy(() => import(/* webpackChunkName: "blog" */        "./pages/BlogPostPage"));
const AboutPage            = lazy(() => import(/* webpackChunkName: "about" */       "./pages/AboutPage"));
const IndiaToUaePage       = lazy(() => import(/* webpackChunkName: "india-to-uae" */ "./pages/IndiaToUaePage"));
const AttestationPage      = lazy(() => import(/* webpackChunkName: "attestation" */ "./pages/AttestationPage"));
const AdminCostPage        = lazy(() => import(/* webpackChunkName: "admin" */       "./pages/AdminCostPage"));
const AdminProspectsPage   = lazy(() => import(/* webpackChunkName: "admin" */       "./pages/AdminProspectsPage"));
const GulfCareerPage       = lazy(() => import(/* webpackChunkName: "gulf-career" */ "./pages/GulfCareerPage"));
const GulfSalaryPage       = lazy(() => import(/* webpackChunkName: "gulf-salary" */ "./pages/GulfSalaryPage"));

const S = {
  app: { minHeight: "100vh", width: "100%", overflowX: "hidden", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
};

/** /hr/jobs/123 → /employer/jobs/123 — old portal bookmarks survive the rename. */
function HrLegacyRedirect() {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/hr/, "");
  return <Navigate to={`/employer${rest}${location.search}`} replace />;
}

function TemplatesBrowseLayout({ user }) {
  const navigate = useNavigate();
  const [resume] = useState(() => ({ ...EMPTY_RESUME }));
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [pending, setPending] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div style={{ ...S.app, display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, padding: "12px 16px 0" }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            border: "none",
            color: C.text,
            fontSize: 14,
            cursor: "pointer",
            padding: "8px 0",
            fontFamily: "inherit",
          }}
        >
          ← Back
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <TemplatesPage
          resume={resume}
          selectedTemplate={selectedTemplate}
          onApplyTemplate={setSelectedTemplate}
          onApplyTemplateAndGoToContent={(tpl) => {
            setSelectedTemplate(tpl);
            navigate("/builder", { state: { cvpInitialTemplateId: tpl.id } });
          }}
          pendingTemplate={pending}
          confirmOpen={confirmOpen}
          onPendingTemplateChange={setPending}
          onConfirmOpenChange={setConfirmOpen}
          source="templates_page"
          user={user}
        />
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const {
    navigate,
    authMode,
    setAuthMode,
    setAuthError,
    setPendingVerificationEmail,
    user,
    isPro,
    profile,
    refreshProfile,
    authReady,
    authPageSharedProps,
    resumeList,
    setResumeList,
    setResume,
    setSelectedTemplate,
    editingResume,
    handleLogout,
    handleEditResume,
    handleNewResume,
    postAuthIntermission,
  } = useCvpAuth();

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location.pathname, location.search]);

  // Remember which portal the user actually works in — read at login time
  // to land dual-role accounts on the right side. Portal app routes only:
  // /employer exact is the marketing landing, auth/onboarding don't count.
  useEffect(() => {
    const p = location.pathname;
    if (
      p.startsWith("/employer/")
      && !["/employer/login", "/employer/signup", "/employer/onboarding"].includes(p)
    ) {
      setLastPortal("employer");
    } else if (p === "/dashboard" || p.startsWith("/dashboard/")) {
      setLastPortal("candidate");
    }
  }, [location.pathname]);

  const searchParams = new URLSearchParams(location.search);
  const newSessionId = searchParams.get("new");
  // ?as=employer on /auth or /register presets the Employer toggle —
  // the employer landing page links through with this intent.
  const employerIntent = searchParams.get("as") === "employer";
  const builderKey = editingResume?.id
    ? `edit-${editingResume.id}`
    : (newSessionId ? `new-${newSessionId}` : "new-default");

  return (
    <>
      <PostAuthIntermission active={postAuthIntermission} />
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/pricing" element={<PricingPage refreshProfile={refreshProfile} />} />
      <Route path="/payment-success" element={<PaymentSuccess refreshProfile={refreshProfile} />} />
      {/* Employer portal — canonical URLs live under /employer/* (the
          LinkedIn/Indeed two-front-doors pattern). RequireRecruiter keeps
          the UX honest (RLS already keeps the data safe): logged-out →
          /employer/login, candidates → an explicit set-up-a-company
          screen, recruiters → the shell. Pathless parent so /employer
          exact stays the marketing landing page below. */}
      <Route element={<RequireRecruiter><HrShell /></RequireRecruiter>}>
        <Route path="/employer/post" element={<PostJobPage />} />
        <Route path="/employer/jobs" element={<HRJobsListPage />} />
        <Route path="/employer/jobs/:id" element={<JobPipelinePage />} />
        <Route path="/employer/candidates" element={<CandidatesPage />} />
        <Route path="/employer/pricing" element={<HrPricing />} />
      </Route>
      {/* Legacy /hr/* bookmarks keep working. */}
      <Route path="/hr" element={<Navigate to="/employer/jobs" replace />} />
      <Route path="/hr/*" element={<HrLegacyRedirect />} />
      {/* Employer front door — light theme, so it lives OUTSIDE the dark
          S.app wrapper below (same placement rationale as /hr). */}
      <Route path="/employer" element={<EmployerLandingPage />} />
      <Route path="/employer/onboarding" element={<EmployerOnboardingPage />} />
      <Route path="/jobs" element={<JobBoardPage />} />
      <Route path="/jobs/:jobId" element={<JobPage />} />
      {/* Public, unauthenticated read-only candidate share link (Phase A) */}
      <Route path="/shared/candidate/:token" element={<SharedCandidatePage />} />
      <Route
        path="*"
        element={
          /* data-theme="dark" pins the token cascade for every unmigrated
             dark page in this shell (builder, ATS, pricing, scout, …) so the
             global light default can't half-break them. Migrated surfaces
             inside (LandingPage, auth) re-stamp data-theme themselves. */
          <div style={S.app} data-theme="dark">
            <Routes>
              <Route
                path="/"
                element={
                  <LandingPage
                    user={user}
                    isPro={isPro}
                    onSignOut={handleLogout}
                    onLogin={() => {
                      setAuthMode("login");
                      navigate("/auth");
                    }}
                    onSignup={() => {
                      setAuthMode("signup");
                      navigate("/auth");
                    }}
                    onWalkIn={() => navigate("/walk-in")}
                  />
                }
              />
              <Route
                path="/walk-in"
                element={
                  <WalkInPage
                    onBack={() => navigate("/")}
                    onComplete={() => navigate("/builder")}
                    setResume={setResume}
                    setSelectedTemplate={setSelectedTemplate}
                  />
                }
              />
              <Route
                path="/auth"
                element={
                  <AuthPage
                    mode={authMode}
                    role={employerIntent ? "employer" : undefined}
                    {...authPageSharedProps}
                    onToggle={() => {
                      setPendingVerificationEmail(null);
                      setAuthMode((m) => (m === "login" ? "signup" : "login"));
                      setAuthError(null);
                    }}
                    onCrossOver={() => {
                      setPendingVerificationEmail(null);
                      setAuthError(null);
                      // ?as=employer → drop the query (candidate side);
                      // plain /auth → the employer entry for this mode.
                      if (employerIntent) navigate("/auth", { replace: true });
                      else navigate(authMode === "login" ? "/employer/login" : "/employer/signup");
                    }}
                  />
                }
              />
              <Route
                path="/register"
                element={
                  <AuthPage
                    mode="signup"
                    role={employerIntent ? "employer" : undefined}
                    {...authPageSharedProps}
                    onToggle={() => {
                      setPendingVerificationEmail(null);
                      setAuthMode("login");
                      setAuthError(null);
                      navigate("/auth");
                    }}
                    onCrossOver={() => {
                      setPendingVerificationEmail(null);
                      setAuthError(null);
                      if (employerIntent) navigate("/register", { replace: true });
                      else navigate("/employer/signup");
                    }}
                  />
                }
              />
              {/* Employer auth entries — same AuthPage, employer intent
                  preset. Login without the recruiter role routes to
                  /employer/onboarding (role granted there, no re-login). */}
              <Route
                path="/employer/login"
                element={
                  <AuthPage
                    mode="login"
                    role="employer"
                    {...authPageSharedProps}
                    onToggle={() => {
                      setPendingVerificationEmail(null);
                      setAuthMode("signup");
                      setAuthError(null);
                      navigate("/employer/signup");
                    }}
                    onCrossOver={() => {
                      setPendingVerificationEmail(null);
                      setAuthError(null);
                      setAuthMode("login");
                      navigate("/auth");
                    }}
                  />
                }
              />
              <Route
                path="/employer/signup"
                element={
                  <AuthPage
                    mode="signup"
                    role="employer"
                    {...authPageSharedProps}
                    onToggle={() => {
                      setPendingVerificationEmail(null);
                      setAuthMode("login");
                      setAuthError(null);
                      navigate("/employer/login");
                    }}
                    onCrossOver={() => {
                      setPendingVerificationEmail(null);
                      setAuthError(null);
                      navigate("/register");
                    }}
                  />
                }
              />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/signin" element={<Navigate to="/auth" replace />} />
              <Route path="/walk-in-cv" element={<Navigate to="/walk-in" replace />} />
              <Route path="/ats-checker" element={<Navigate to="/ats" replace />} />
              <Route path="/indian-cv-uae" element={<Navigate to="/india-to-uae" replace />} />
              <Route path="/admin" element={!authReady ? null : user?.email === "connectingjunaidkhan@gmail.com" ? <AdminPanelV2 /> : <Navigate to="/" replace />} />
              <Route path="/admin/cost" element={!authReady ? null : user?.email === "connectingjunaidkhan@gmail.com" ? <AdminCostPage /> : <Navigate to="/" replace />} />
              <Route path="/admin/prospects" element={!authReady ? null : user?.email === "connectingjunaidkhan@gmail.com" ? <AdminProspectsPage /> : <Navigate to="/" replace />} />
              <Route
                path="/dashboard"
                element={
                  user ? (
                    <DashboardPage
                      user={user}
                      isPro={isPro}
                      profile={profile}
                      resumeList={resumeList}
                      onBuildResume={handleNewResume}
                      onEditResume={handleEditResume}
                      onDelete={async (resumeId) => {
                        try {
                          await deleteResume(resumeId, user.id);
                          setResumeList((prev) => prev.filter((r) => r.id !== resumeId));
                        } catch (e) {
                          alert("Error deleting resume");
                        }
                      }}
                      onRunATS={() => navigate("/ats")}
                      onWalkIn={() => navigate("/walk-in")}
                      onTemplates={() => navigate("/templates")}
                    />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="/account" element={user ? <AccountPage /> : <Navigate to="/" replace />} />
              <Route path="/account/invoices" element={user ? <InvoicesList /> : <Navigate to="/" replace />} />
              <Route path="/account/invoices/:id" element={user ? <InvoiceDetail /> : <Navigate to="/" replace />} />
              <Route
                path="/builder"
                element={
                  <BuilderPage
                    key={builderKey}
                    user={user}
                    isPro={isPro}
                    profile={profile}
                    refreshProfile={refreshProfile}
                    onBack={() => navigate(user ? "/dashboard" : "/")}
                    initialResume={editingResume?.cv_data || null}
                    initialResumeId={editingResume?.id || null}
                    initialTemplateId={editingResume?.template_id || null}
                  />
                }
              />
              <Route path="/ats" element={<ATSPage onBack={() => navigate(user ? "/dashboard" : "/")} />} />
              <Route path="/linkedin-optimizer" element={<LinkedInOptimizer />} />
              <Route path="/salary-switcher" element={<SalarySwitcher />} />
              <Route path="/scout" element={!authReady ? null : user ? <ScoutDashboard user={user} isPro={isPro} /> : <NavigateToAuth />} />
              <Route path="/transform" element={!authReady ? null : <TransformPage user={user} isPro={isPro} />} />
              <Route path="/transform/success" element={!authReady ? null : <TransformSuccessPage user={user} isPro={isPro} />} />
              <Route path="/gulf-career" element={<GulfCareerPage />} />
              <Route path="/gulf/:reportId" element={<GulfCareerPage />} />
              <Route path="/gulf-salary" element={<GulfSalaryPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/cover-letter" element={user ? <CoverLetterPage user={user} profile={profile} onBack={() => navigate("/dashboard")} /> : <Navigate to="/" replace />} />
              <Route path="/templates" element={<TemplatesBrowseLayout user={user} />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/india-to-uae" element={<IndiaToUaePage />} />
              <Route path="/attestation" element={<AttestationPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/refund" element={<RefundPage />} />
              <Route path="/dashboard/applications" element={!authReady ? null : user ? <ApplicationsPage /> : <NavigateToAuth />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Analytics />
          </div>
        }
      />
    </Routes>
    </Suspense>
    </>
  );
}

/**
 * Suspense fallback for route-level code splitting. Follows the active
 * theme (var(--bg) resolves from <html data-theme>) so chunk loads don't
 * flash the wrong background. Intentionally minimal — most chunks are
 * <100KB gzipped and load in well under 200ms on 4G.
 */
function RouteFallback() {
  return (
    <div
      aria-hidden
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "var(--bg)",
      }}
    />
  );
}

/**
 * OLED breathing-room overlay shown for ~1.5s after any auth-triggered
 * navigate. Lets Supabase settle, storage reads complete, and the
 * destination's mount effects fire before the user sees the final UI.
 * Reuses the @property --ats-angle + conic-gradient pattern already live
 * in ATSChecker / PaymentSuccess — no new CSS introduced.
 */
function PostAuthIntermission({ active }) {
  if (!active) return null;
  return (
    <>
      <style>{`
        @property --ats-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes ats-spin-border { to { --ats-angle: 360deg; } }
        @keyframes cvp-intermission-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "rgba(10,10,10,0.94)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          animation: "cvp-intermission-fade 260ms cubic-bezier(0.4,0,0.2,1) both",
        }}
      >
        <div style={{ position: "relative", width: 96, height: 96, filter: "drop-shadow(0 0 18px rgba(255,255,255,0.18))" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              padding: 2,
              background: "conic-gradient(from var(--ats-angle, 0deg), transparent 55%, rgba(255,255,255,0.75) 82%, transparent 100%)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
              animation: "ats-spin-border 1.4s linear infinite",
              willChange: "transform",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 10,
              borderRadius: "50%",
              background: "#0A0A0A",
              border: "1px solid #2A2A2A",
            }}
          />
        </div>
        <div
          style={{
            color: "#A0A0A0",
            fontFamily: "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Setting up your session…
        </div>
      </div>
    </>
  );
}
