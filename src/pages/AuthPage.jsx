import { useState, useEffect, useRef, Fragment } from "react";
import CVPassportLogo from "../components/CVPassportLogo";

const AUTH_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const pageWrapStyle = {
  background: "#0A0A0A",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
  fontFamily: AUTH_FONT,
  position: "relative",
  overflow: "hidden",
};

const logoBlockStyle = {
  textAlign: "center",
  marginBottom: "28px",
};

const taglineStyle = {
  color: "#444",
  fontSize: "12px",
  marginTop: "5px",
  letterSpacing: "0.03em",
};

const authLabelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#3A3A3A",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: "8px",
  fontFamily: AUTH_FONT,
};

const authInputStyle = {
  width: "100%",
  padding: "12px 14px",
  background: "#0A0A0A",
  border: "1px solid #2A2A2A",
  borderRadius: "10px",
  color: "#FFFFFF",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: AUTH_FONT,
};

const cardInnerStyle = {
  position: "relative",
  zIndex: 1,
  background: "#141414",
  borderRadius: "20px",
  border: "1px solid #1E1E1E",
  padding: "36px 32px",
};

// ─── AUTH PAGE ────────────────────────────────────────────────────
const AUTH_ERR_BOX = {
  background: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: "8px",
  padding: "12px 16px",
  fontSize: "13px",
  color: "#FCA5A5",
  marginBottom: "16px",
  fontFamily: AUTH_FONT,
  lineHeight: 1.45,
};

function AuthFooter() {
  const items = ["Free to start", "No credit card", "2,400+ CVs built"];
  return (
    <div
      style={{
        marginTop: "24px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        flexWrap: "wrap",
      }}
    >
      {items.map((label, i) => (
        <Fragment key={label}>
          {i > 0 ? (
            <span
              style={{
                width: "2px",
                height: "2px",
                background: "#2A2A2A",
                borderRadius: "50%",
                flexShrink: 0,
              }}
              aria-hidden
            />
          ) : null}
          <span style={{ fontSize: "11px", color: "#2A2A2A" }}>{label}</span>
        </Fragment>
      ))}
    </div>
  );
}

function AuthCardShell({ children }) {
  return (
    <div style={{ width: "100%", maxWidth: "380px", position: "relative" }}>
      <div className="cvp-auth-beam-wrap" aria-hidden>
        <div className="cvp-auth-beam--top" />
        <div className="cvp-auth-beam--right" />
        <div className="cvp-auth-beam--bottom" />
        <div className="cvp-auth-beam--left" />
      </div>
      <div style={cardInnerStyle}>{children}</div>
    </div>
  );
}

function AuthLogoBlock() {
  return (
    <div style={logoBlockStyle}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CVPassportLogo height={32} />
      </div>
      <p style={taglineStyle}>Your Gulf career starts here</p>
    </div>
  );
}

function AuthPage({
  mode,
  onAuth,
  onToggle,
  loading,
  error,
  pendingVerificationEmail,
  onClearAuthError,
  onDelayedLoginNavigate,
  onResendVerification,
  onForgotPassword,
  onGoToSignUp,
  onBackToSignIn,
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState("candidate");
  const [workEmail, setWorkEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loginUiSuccess, setLoginUiSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verifyResendLoading, setVerifyResendLoading] = useState(false);
  const [verifyResendSuccess, setVerifyResendSuccess] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(null);
  const [forgotPanel, setForgotPanel] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const set = (k, v) => {
    onClearAuthError?.();
    setForm((f) => ({ ...f, [k]: v }));
  };

  const clearFormError = () => {
    onClearAuthError?.();
    setForgotMessage(null);
  };

  const resolveErrorText = () => {
    if (!error) return null;
    if (error === "email_not_verified") {
      return "Please verify your email first. Check your inbox for a verification link from CVPassport.";
    }
    if (error === "wrong_credentials") {
      return "Incorrect password. Please try again.";
    }
    if (error === "no_account") {
      return "No account found with this email. Want to create one?";
    }
    if (error === "rate_limited") {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (error === "generic") {
      return "Something went wrong. Please try again.";
    }
    if (error === "validation_missing") {
      return "Please enter your email and password.";
    }
    if (error === "validation_password_short") {
      return "Password must be at least 8 characters.";
    }
    return error;
  };

  const doSubmit = async () => {
    if (loading || loginUiSuccess) return;
    const email = emailRef.current?.value ?? form.email;
    const password = passwordRef.current?.value ?? form.password;
    const name = (nameRef.current?.value ?? form.name).trim();
    const result = await onAuth(
      {
        name: name || (email || "").split("@")[0] || "",
        email,
        password,
        userType: mode === "signup" ? userType : undefined,
        workEmail: mode === "signup" && userType === "recruiter" ? workEmail : undefined,
        companyName: mode === "signup" && userType === "recruiter" ? companyName : undefined,
      },
      mode,
    );
    if (result?.loginShowSuccess && mode === "login") {
      setLoginUiSuccess(true);
      setTimeout(() => {
        onDelayedLoginNavigate?.();
      }, 800);
    }
  };

  const sendForgotReset = async () => {
    if (forgotSending) return;
    setForgotSending(true);
    clearFormError();
    const email = emailRef.current?.value ?? form.email;
    const { ok, reason } = (await onForgotPassword?.(email)) ?? { ok: false };
    setForgotSending(false);
    if (reason === "empty") setForgotMessage("Enter your email address first.");
    else if (ok) setForgotMessage("Reset link sent to your email.");
    else setForgotMessage("Something went wrong. Please try again.");
  };

  useEffect(() => {
    setLoginUiSuccess(false);
    setResendSuccess(false);
    setVerifyResendSuccess(false);
    setForgotMessage(null);
    setForgotPanel(false);
  }, [mode]);

  const errText = resolveErrorText();
  const pwInputType = showPassword ? "text" : "password";

  const amberBtnBase = {
    width: "100%",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: 700,
    color: "#000",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: AUTH_FONT,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1)",
  };

  const submitBtnStyle =
    loginUiSuccess
      ? { ...amberBtnBase, background: "#22C55E", color: "#FFFFFF", cursor: "default" }
      : loading
        ? { ...amberBtnBase, background: "#F59E0B", opacity: 0.75, cursor: "not-allowed" }
        : { ...amberBtnBase, background: "#F59E0B" };

  if (pendingVerificationEmail) {
    const handleVerifyResend = async () => {
      setVerifyResendLoading(true);
      setVerifyResendSuccess(false);
      const { ok } = (await onResendVerification?.(pendingVerificationEmail)) ?? { ok: false };
      setVerifyResendLoading(false);
      if (ok) setVerifyResendSuccess(true);
    };
    return (
      <div className="cvp-auth-page" style={pageWrapStyle}>
        <AuthLogoBlock />
        <AuthCardShell>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }} aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
          </div>
          <h2
            style={{
              fontSize: "21px",
              fontWeight: 700,
              marginBottom: "6px",
              color: "#FFFFFF",
              fontFamily: AUTH_FONT,
              textAlign: "center",
            }}
          >
            Check your email
          </h2>
          <p
            style={{
              color: "#555",
              marginBottom: "16px",
              fontSize: "13px",
              fontFamily: AUTH_FONT,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            We sent a verification link to <span style={{ color: "#FFF" }}>{pendingVerificationEmail}</span>. Click it to activate your account — then come back here to sign in.
          </p>
          <p style={{ color: "#555", marginBottom: "20px", fontSize: "12px", fontFamily: AUTH_FONT, textAlign: "center" }}>
            Didn&apos;t get it? Check your spam folder.
          </p>
          <button
            type="button"
            disabled={verifyResendLoading}
            onClick={handleVerifyResend}
            style={{
              width: "100%",
              border: "1px solid #2A2A2A",
              background: "transparent",
              color: "#FFF",
              fontSize: "13px",
              padding: "8px 16px",
              borderRadius: "10px",
              cursor: verifyResendLoading ? "not-allowed" : "pointer",
              fontFamily: AUTH_FONT,
              marginBottom: "8px",
              opacity: verifyResendLoading ? 0.7 : 1,
            }}
          >
            {verifyResendLoading ? "Sending…" : "Resend email"}
          </button>
          {verifyResendSuccess ? (
            <p style={{ color: "#22C55E", fontSize: "12px", textAlign: "center", marginBottom: "16px", fontFamily: AUTH_FONT }}>
              Verification email sent! Check your inbox.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onBackToSignIn}
            style={{
              width: "100%",
              border: "none",
              background: "none",
              color: "#F59E0B",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: AUTH_FONT,
              padding: "8px 0",
            }}
          >
            ← Back to sign in
          </button>
        </AuthCardShell>
        <AuthFooter />
      </div>
    );
  }

  const showForgot = forgotPanel && mode === "login";

  return (
    <div className="cvp-auth-page" style={pageWrapStyle}>
      <AuthLogoBlock />
      <AuthCardShell>
        {showForgot ? (
          <>
            <h2
              style={{
                fontSize: "21px",
                fontWeight: 700,
                marginBottom: "6px",
                color: "#fff",
                fontFamily: AUTH_FONT,
              }}
            >
              Reset your password
            </h2>
            <p style={{ color: "#555", marginBottom: "24px", fontSize: "13px", fontFamily: AUTH_FONT }}>
              Enter your email and we&apos;ll send you a reset link
            </p>
            {forgotMessage ? (
              <div
                role="status"
                style={{
                  ...AUTH_ERR_BOX,
                  background: forgotMessage.includes("Reset") ? "rgba(34, 197, 94, 0.1)" : AUTH_ERR_BOX.background,
                  borderColor: forgotMessage.includes("Reset") ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.3)",
                  color: forgotMessage.includes("Reset") ? "#86EFAC" : "#FCA5A5",
                  marginBottom: "16px",
                }}
              >
                {forgotMessage}
              </div>
            ) : null}
            <form
              className="cvp-auth-form-anim"
              onSubmit={(e) => {
                e.preventDefault();
                void sendForgotReset();
              }}
              noValidate
            >
              <div style={{ marginBottom: "16px" }}>
                <label style={authLabelStyle} htmlFor="cvp-auth-email-forgot">
                  Email
                </label>
                <input
                  id="cvp-auth-email-forgot"
                  ref={emailRef}
                  className="cvp-auth-field"
                  style={authInputStyle}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onFocus={clearFormError}
                />
              </div>
              <button
                type="submit"
                className="cvp-auth-btn--amber"
                style={{
                  ...amberBtnBase,
                  background: "#F59E0B",
                  opacity: forgotSending ? 0.75 : 1,
                  cursor: forgotSending ? "not-allowed" : "pointer",
                  marginTop: "4px",
                }}
                disabled={forgotSending}
              >
                <span style={{ position: "relative", zIndex: 1 }}>
                  {forgotSending ? (
                    <>
                      <span className="cvp-auth-spinner" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send reset link →"
                  )}
                </span>
                {!forgotSending ? <span className="cvp-auth-btn-shimmer" aria-hidden /> : null}
              </button>
            </form>
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "20px", marginTop: "20px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setForgotPanel(false);
                  clearFormError();
                }}
                style={{
                  border: "none",
                  background: "none",
                  color: "#F59E0B",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: AUTH_FONT,
                }}
              >
                ← Back to sign in
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              style={{
                fontSize: "21px",
                fontWeight: 700,
                marginBottom: "6px",
                color: "#fff",
                fontFamily: AUTH_FONT,
              }}
            >
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p style={{ color: "#555", marginBottom: "24px", fontSize: "13px", fontFamily: AUTH_FONT }}>
              {mode === "login" ? "Sign in to your CVPassport account" : "Free to start — no credit card needed"}
            </p>

            {errText ? (
              <div role="alert" style={AUTH_ERR_BOX}>
                {errText}
                {error === "email_not_verified" ? (
                  <div style={{ marginTop: "10px" }}>
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={async () => {
                        setResendLoading(true);
                        setResendSuccess(false);
                        const email = emailRef.current?.value ?? form.email;
                        const { ok } = (await onResendVerification?.(email)) ?? { ok: false };
                        setResendLoading(false);
                        if (ok) setResendSuccess(true);
                      }}
                      style={{
                        border: "1px solid #2A2A2A",
                        background: "transparent",
                        color: "#FFF",
                        fontSize: "13px",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        cursor: resendLoading ? "not-allowed" : "pointer",
                        fontFamily: AUTH_FONT,
                        marginTop: "8px",
                      }}
                    >
                      {resendLoading ? "Sending…" : "Resend verification email"}
                    </button>
                    {resendSuccess ? (
                      <p style={{ color: "#22C55E", fontSize: "12px", marginTop: "8px", marginBottom: 0, fontFamily: AUTH_FONT }}>
                        Verification email sent! Check your inbox.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {error === "wrong_credentials" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPanel(true);
                      clearFormError();
                    }}
                    style={{
                      marginTop: "10px",
                      border: "none",
                      background: "none",
                      color: "#F59E0B",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: AUTH_FONT,
                      textDecoration: "underline",
                      padding: 0,
                      display: "block",
                      fontWeight: 600,
                    }}
                  >
                    Forgot password?
                  </button>
                ) : null}
                {error === "no_account" ? (
                  <button
                    type="button"
                    onClick={() => onGoToSignUp?.()}
                    style={{
                      marginTop: "10px",
                      border: "none",
                      background: "none",
                      color: "#F59E0B",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: AUTH_FONT,
                      textDecoration: "underline",
                      padding: 0,
                      display: "block",
                      fontWeight: 600,
                    }}
                  >
                    Sign up free
                  </button>
                ) : null}
              </div>
            ) : null}

            {forgotMessage && mode === "login" && !showForgot ? (
              <div
                role="status"
                style={{
                  ...AUTH_ERR_BOX,
                  background: forgotMessage.includes("Reset") ? "rgba(34, 197, 94, 0.1)" : AUTH_ERR_BOX.background,
                  borderColor: forgotMessage.includes("Reset") ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.3)",
                  color: forgotMessage.includes("Reset") ? "#86EFAC" : "#FCA5A5",
                  marginBottom: "16px",
                }}
              >
                {forgotMessage}
              </div>
            ) : null}

            <form
              className="cvp-auth-form-anim"
              key={mode}
              autoComplete="on"
              onSubmit={(e) => {
                e.preventDefault();
                setTimeout(() => void doSubmit(), 50);
              }}
              noValidate
            >
              {mode === "signup" ? (
                <div style={{ marginBottom: "16px" }}>
                  <label style={authLabelStyle} htmlFor="cvp-auth-name">
                    Full name
                  </label>
                  <input
                    id="cvp-auth-name"
                    ref={nameRef}
                    className="cvp-auth-field"
                    style={authInputStyle}
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    onFocus={clearFormError}
                  />
                </div>
              ) : null}
              <div style={{ marginBottom: "16px" }}>
                <label style={authLabelStyle} htmlFor="cvp-auth-email">
                  Email
                </label>
                <input
                  id="cvp-auth-email"
                  ref={emailRef}
                  className="cvp-auth-field"
                  style={authInputStyle}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onFocus={clearFormError}
                />
              </div>
              <div style={{ marginBottom: mode === "login" ? "0" : "8px" }}>
                <label style={authLabelStyle} htmlFor="cvp-auth-password">
                  Password
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    id="cvp-auth-password"
                    ref={passwordRef}
                    className="cvp-auth-field"
                    style={{ ...authInputStyle, paddingRight: "44px" }}
                    type={pwInputType}
                    name="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={mode === "login" ? "Your password" : "Create a password (min 8 characters)"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    onFocus={clearFormError}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "none",
                      padding: 4,
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {mode === "signup" ? (
                  <>
                    <p
                      style={{
                        fontSize: "12px",
                        color: form.password.length >= 8 ? "#22C55E" : "#A0A0A0",
                        marginTop: "6px",
                        marginBottom: 0,
                        fontFamily: AUTH_FONT,
                      }}
                    >
                      At least 8 characters
                    </p>
                    {/* Role selector */}
                    <div style={{ marginTop: "16px" }}>
                      <label style={authLabelStyle}>I am</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setUserType("candidate")}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            borderRadius: "10px",
                            border: userType === "candidate" ? "2px solid #F59E0B" : "1px solid #2A2A2A",
                            background: userType === "candidate" ? "rgba(245,158,11,0.1)" : "transparent",
                            color: userType === "candidate" ? "#F59E0B" : "#A0A0A0",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: AUTH_FONT,
                            transition: "border-color 150ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1)",
                          }}
                        >
                          I&apos;m looking for my next role
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserType("recruiter")}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            borderRadius: "10px",
                            border: userType === "recruiter" ? "2px solid #F59E0B" : "1px solid #2A2A2A",
                            background: userType === "recruiter" ? "rgba(245,158,11,0.1)" : "transparent",
                            color: userType === "recruiter" ? "#F59E0B" : "#A0A0A0",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: AUTH_FONT,
                            transition: "border-color 150ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1)",
                          }}
                        >
                          I&apos;m hiring &amp; managing talent
                        </button>
                      </div>
                    </div>
                    {/* Recruiter extra fields */}
                    {userType === "recruiter" ? (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={authLabelStyle} htmlFor="cvp-auth-work-email">Work email</label>
                          <input
                            id="cvp-auth-work-email"
                            className="cvp-auth-field"
                            style={authInputStyle}
                            type="email"
                            placeholder="work@company.com"
                            value={workEmail}
                            onChange={(e) => setWorkEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={authLabelStyle} htmlFor="cvp-auth-company">Company name</label>
                          <input
                            id="cvp-auth-company"
                            className="cvp-auth-field"
                            style={authInputStyle}
                            placeholder="Your company"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div style={{ textAlign: "right", marginTop: "8px", marginBottom: "24px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPanel(true);
                        clearFormError();
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#F59E0B",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontFamily: AUTH_FONT,
                        padding: 0,
                        fontWeight: 600,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="cvp-auth-btn--amber"
                style={{
                  ...submitBtnStyle,
                  width: "100%",
                  marginTop: mode === "signup" ? "16px" : "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
                disabled={loading || loginUiSuccess}
              >
                <span style={{ position: "relative", zIndex: 1 }}>
                  {loginUiSuccess ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Welcome back!
                    </>
                  ) : loading ? (
                    <>
                      <span className="cvp-auth-spinner" aria-hidden />
                      {mode === "login" ? "Signing in…" : "Creating account…"}
                    </>
                  ) : mode === "login" ? (
                    "Sign in"
                  ) : (
                    "Create account →"
                  )}
                </span>
                {!loading && !loginUiSuccess ? <span className="cvp-auth-btn-shimmer" aria-hidden /> : null}
              </button>
            </form>
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "20px", marginTop: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#555", fontFamily: AUTH_FONT, margin: 0 }}>
                {mode === "login" ? "New here? " : "Already have an account? "}
                <span
                  role="button"
                  tabIndex={0}
                  style={{ color: "#F59E0B", cursor: "pointer", fontWeight: 600 }}
                  onClick={onToggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onToggle();
                  }}
                >
                  {mode === "login" ? "Create a free account →" : "Sign in →"}
                </span>
              </p>
            </div>
          </>
        )}
      </AuthCardShell>
      <AuthFooter />
    </div>
  );
}
export default AuthPage;
