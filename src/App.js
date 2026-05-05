import { useEffect, useState, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import ReactGA from "react-ga4";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { deleteResume } from "./resumeDb";
import { useCvpAuth } from "./useCvpAuth";
import NavigateToAuth from "./lib/auth/navigateToAuth";
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
const TemplatesPage        = lazy(() => import(/* webpackChunkName: "templates" */   "./pages/TemplatesPage"));
const TermsPage            = lazy(() => import(/* webpackChunkName: "legal" */       "./pages/TermsPage"));
const PrivacyPage          = lazy(() => import(/* webpackChunkName: "legal" */       "./pages/PrivacyPage"));
const RefundPage           = lazy(() => import(/* webpackChunkName: "legal" */       "./pages/RefundPage"));
const PaymentSuccess       = lazy(() => import(/* webpackChunkName: "payment" */     "./pages/PaymentSuccess"));
const ResetPassword        = lazy(() => import(/* webpackChunkName: "auth" */        "./pages/ResetPassword"));
const HRPortal             = lazy(() => import(/* webpackChunkName: "hr" */          "./pages/HRPortal"));
const PostJobPage          = lazy(() => import(/* webpackChunkName: "hr-post" */     "./pages/hr/PostJob/PostJobPage"));
const JobPage              = lazy(() => import(/* webpackChunkName: "jobs" */        "./pages/JobPage"));
const JobsListPage         = lazy(() => import(/* webpackChunkName: "jobs" */        "./pages/JobsListPage"));
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
const GulfCareerPage       = lazy(() => import(/* webpackChunkName: "gulf-career" */ "./pages/GulfCareerPage"));
const GulfSalaryPage       = lazy(() => import(/* webpackChunkName: "gulf-salary" */ "./pages/GulfSalaryPage"));

const S = {
  app: { minHeight: "100vh", width: "100%", overflowX: "hidden", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
};

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

  const searchParams = new URLSearchParams(location.search);
  const newSessionId = searchParams.get("new");
  const builderKey = editingResume?.id
    ? `edit-${editingResume.id}`
    : (newSessionId ? `new-${newSessionId}` : "new-default");

  return (
    <>
      <PostAuthIntermission active={postAuthIntermission} />
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/hr" element={<HRPortal />} />
      <Route path="/hr/post" element={<PostJobPage />} />
      <Route path="/jobs" element={<JobsListPage />} />
      <Route path="/jobs/:jobId" element={<JobPage />} />
      <Route
        path="*"
        element={
          <div style={S.app}>
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
                    {...authPageSharedProps}
                    onToggle={() => {
                      setPendingVerificationEmail(null);
                      setAuthMode((m) => (m === "login" ? "signup" : "login"));
                      setAuthError(null);
                    }}
                  />
                }
              />
              <Route
                path="/register"
                element={
                  <AuthPage
                    mode="signup"
                    {...authPageSharedProps}
                    onToggle={() => {
                      setPendingVerificationEmail(null);
                      setAuthMode("login");
                      setAuthError(null);
                      navigate("/auth");
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
 * Suspense fallback for route-level code splitting. Matches the dark
 * background so chunk loads don't flash white. Intentionally minimal —
 * most chunks are <100KB gzipped and load in well under 200ms on 4G.
 */
function RouteFallback() {
  return (
    <div
      aria-hidden
      style={{
        minHeight: "100vh",
        width: "100%",
        background: C.bg,
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
