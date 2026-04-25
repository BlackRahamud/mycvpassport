import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import ReactGA from "react-ga4";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { deleteResume } from "./resumeDb";
import { useCvpAuth } from "./useCvpAuth";
import PricingPage from "./pages/PricingPage";
import LandingPage from "./LandingPage";
import AdminPanelV2 from "./AdminPanelV2";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import CoverLetterPage from "./pages/CoverLetterPage";
import BuilderPage from "./pages/BuilderPage";
import DashboardPage from "./pages/DashboardPage";
import ATSPage from "./pages/ATSPage";
import WalkInPage from "./pages/WalkInPage";
import AccountPage from "./pages/AccountPage";
import TemplatesPage from "./pages/TemplatesPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import RefundPage from "./pages/RefundPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import ResetPassword from "./pages/ResetPassword";
import HRPortal from "./pages/HRPortal";
import JobPage from "./pages/JobPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import LinkedInOptimizer from "./pages/LinkedInOptimizer";
import SalarySwitcher from "./pages/SalarySwitcher";
import ToolsPage from "./pages/ToolsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import AboutPage from "./pages/AboutPage";
import IndiaToUaePage from "./pages/IndiaToUaePage";
import GulfCareerPage from "./pages/GulfCareerPage";
import { C } from "./builderStyles";
import { EMPTY_RESUME, TEMPLATES } from "./cvShared";

const S = {
  app: { minHeight: "100vh", width: "100%", overflowX: "hidden", background: C.bg, color: C.text, fontFamily: "'Outfit','Segoe UI',sans-serif" },
};

function TemplatesBrowseLayout() {
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
    <Routes>
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/hr" element={<HRPortal />} />
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
              <Route path="/gulf-career" element={<GulfCareerPage />} />
              <Route path="/gulf/:reportId" element={<GulfCareerPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/cover-letter" element={user ? <CoverLetterPage user={user} profile={profile} onBack={() => navigate("/dashboard")} /> : <Navigate to="/" replace />} />
              <Route path="/templates" element={<TemplatesBrowseLayout />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/india-to-uae" element={<IndiaToUaePage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/refund" element={<RefundPage />} />
              <Route path="/dashboard/applications" element={user ? <ApplicationsPage /> : <Navigate to="/auth" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Analytics />
          </div>
        }
      />
    </Routes>
    </>
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
