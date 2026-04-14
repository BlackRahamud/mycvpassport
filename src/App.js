import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { deleteResume } from "./resumeDb";
import { useCvpAuth } from "./useCvpAuth";
import PricingPage from "./pages/PricingPage";
import LandingPage from "./LandingPage";
import AdminPanel from "./AdminPanel";
import AuthPage from "./pages/AuthPage";
import CoverLetterPage from "./pages/CoverLetterPage";
import BuilderPage from "./pages/BuilderPage";
import DashboardPage from "./pages/DashboardPage";
import ATSPage from "./pages/ATSPage";
import WalkInPage from "./pages/WalkInPage";
import AccountPage from "./pages/AccountPage";
import TemplatesPage from "./pages/TemplatesPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import ResetPassword from "./pages/ResetPassword";
import HRPortal from "./pages/HRPortal";
import JobPage from "./pages/JobPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import MobileTabBar from "./components/MobileTabBar";
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
    currentPath,
  } = useCvpAuth();

  const searchParams = new URLSearchParams(location.search);
  const newSessionId = searchParams.get("new");
  const builderKey = editingResume?.id
    ? `edit-${editingResume.id}`
    : (newSessionId ? `new-${newSessionId}` : "new-default");

  return (
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
              <Route path="/signin" element={<Navigate to="/auth" replace />} />
              <Route path="/admin" element={!authReady ? null : user?.email === "connectingjunaidkhan@gmail.com" ? <AdminPanel /> : <Navigate to="/" replace />} />
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
              <Route path="/cover-letter" element={user ? <CoverLetterPage user={user} profile={profile} onBack={() => navigate("/dashboard")} /> : <Navigate to="/" replace />} />
              <Route path="/templates" element={<TemplatesBrowseLayout />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/dashboard/applications" element={user ? <ApplicationsPage /> : <Navigate to="/auth" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <MobileTabBar currentPath={currentPath} onNavigate={navigate} user={user} fabGuideTab={location.state?.fabGuideTab} />
            <Analytics />
          </div>
        }
      />
    </Routes>
  );
}
