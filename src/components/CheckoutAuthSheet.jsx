import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { getPaymentLink } from "../utils/paywall";
import { TIERS, UI_SLUG_TO_TIER, TIER_TO_ZIINA_FEATURE } from "../config/tierConfig";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";

// UI short slug ('express') -> { displayName, ziina feature key }. Derived
// from tierConfig so new tiers don't need a parallel map here.
const PLAN_DISPLAY = Object.entries(UI_SLUG_TO_TIER).reduce((acc, [uiSlug, tierSlug]) => {
  const t = TIERS[tierSlug];
  if (t) acc[uiSlug] = t.displayName;
  return acc;
}, {});

const FEATURE_MAP = Object.entries(UI_SLUG_TO_TIER).reduce((acc, [uiSlug, tierSlug]) => {
  const feature = TIER_TO_ZIINA_FEATURE[tierSlug];
  if (feature) acc[uiSlug] = feature;
  return acc;
}, {});

const EASE_SHEET = "cubic-bezier(0.32, 0.72, 0, 1)";
const EASE_UI = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function CheckoutAuthSheet({ open, onClose, planId, priceLabel, isMobile, currency = "AED", onRazorpayCheckout }) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [postAuthBusy, setPostAuthBusy] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    const focusT = setTimeout(() => emailRef.current?.focus?.(), 380);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(focusT);
    };
  }, [open]);

  useEffect(() => {
    if (open) return undefined;
    const t = setTimeout(() => {
      setNotice(null);
      setEmail("");
      setPassword("");
      setShowPw(false);
      setMode("signin");
      setLoading(false);
      setPostAuthBusy(false);
    }, 320);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading && !postAuthBusy) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, loading, postAuthBusy]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const startCheckout = useCallback(async () => {
    setPostAuthBusy(true);
    setNotice(null);
    if (currency === "INR" && onRazorpayCheckout) {
      onRazorpayCheckout(planId);
      setPostAuthBusy(false);
      return;
    }
    const feature = FEATURE_MAP[planId];
    if (!feature) {
      setNotice({ kind: "error", text: "Couldn't resolve plan. Please try again." });
      setPostAuthBusy(false);
      return;
    }
    const url = await getPaymentLink(feature);
    if (url) {
      window.location.href = url;
      return;
    }
    setNotice({ kind: "error", text: "Couldn't start checkout. Please try again in a moment." });
    setPostAuthBusy(false);
  }, [planId, currency, onRazorpayCheckout]);

  const handleGoogle = async () => {
    if (loading) return;
    setNotice(null);
    setLoading(true);
    try {
      localStorage.setItem("postAuthRedirect", `/pricing?resume=${planId}`);
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (oauthErr) {
        localStorage.removeItem("postAuthRedirect");
        setNotice({ kind: "error", text: "Google sign-in isn't available right now. Use email below." });
        setLoading(false);
      }
    } catch {
      localStorage.removeItem("postAuthRedirect");
      setNotice({ kind: "error", text: "Google sign-in isn't available right now. Use email below." });
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setNotice({ kind: "error", text: "Please enter your email and password." });
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setNotice({ kind: "error", text: "Password must be at least 8 characters." });
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { name: cleanEmail.split("@")[0] },
          },
        });
        if (err) {
          const m = (err.message || "").toLowerCase();
          if (m.includes("already") || m.includes("registered")) {
            setNotice({ kind: "info", text: "You already have an account. Sign in to continue." });
            setMode("signin");
          } else {
            setNotice({ kind: "error", text: err.message || "Couldn't create account." });
          }
          setLoading(false);
          return;
        }
        if (!data.session) {
          setNotice({
            kind: "info",
            text: "Check your email to verify your account, then come back and sign in to finish checkout.",
          });
          setLoading(false);
          return;
        }
        try {
          await supabase.from("profiles").upsert(
            {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              plan: "FREE",
              flagged: false,
              features: {},
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
        } catch {
          /* non-fatal — continue to checkout */
        }
        await startCheckout();
        return;
      }

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (err) {
        const m = (err.message || "").toLowerCase();
        if (m.includes("invalid")) {
          setNotice({ kind: "error", text: "Incorrect email or password." });
        } else if (m.includes("confirm") || m.includes("verified")) {
          setNotice({ kind: "error", text: "Please verify your email first — check your inbox." });
        } else {
          setNotice({ kind: "error", text: err.message || "Couldn't sign in." });
        }
        setLoading(false);
        return;
      }
      if (!data?.user) {
        setNotice({ kind: "error", text: "Couldn't sign in. Please try again." });
        setLoading(false);
        return;
      }
      await startCheckout();
    } catch (err) {
      setNotice({ kind: "error", text: err?.message || "Something went wrong." });
      setLoading(false);
    }
  };

  if (!open) return null;

  const planName = PLAN_DISPLAY[planId] || "Plan";

  const backdropStyle = {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.68)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    opacity: visible ? 1 : 0,
    transition: `opacity 260ms ${EASE_UI}`,
  };

  const sheetBase = {
    position: "absolute",
    background: "linear-gradient(160deg, #151515 0%, #0D0D0D 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 -24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
    color: "#FFFFFF",
    boxSizing: "border-box",
    overflowY: "auto",
  };

  const sheetStyle = isMobile
    ? {
        ...sheetBase,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxHeight: "92vh",
        padding: "10px 22px 28px",
        borderRadius: "24px 24px 0 0",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: `transform 420ms ${EASE_SHEET}`,
      }
    : {
        ...sheetBase,
        left: "50%",
        top: "50%",
        width: "440px",
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "min(92vh, 720px)",
        padding: "28px 32px 26px",
        borderRadius: "22px",
        transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.97})`,
        opacity: visible ? 1 : 0,
        transition: `transform 320ms ${EASE_UI}, opacity 260ms ${EASE_UI}`,
      };

  const inputWrap = {
    width: "100%",
    background: "#1A1A1A",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 12,
    transition: `border-color 150ms ${EASE_UI}, background-color 150ms ${EASE_UI}`,
    boxSizing: "border-box",
  };

  const inputEl = {
    width: "100%",
    padding: "13px 14px",
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONT,
    boxSizing: "border-box",
  };

  const ctaDisabled = loading || postAuthBusy;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sign in to activate ${planName}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        fontFamily: FONT,
      }}
    >
      <div
        aria-hidden="true"
        onClick={ctaDisabled ? undefined : onClose}
        style={backdropStyle}
      />

      <div style={sheetStyle}>
        {isMobile ? (
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.18)",
              margin: "4px auto 14px",
            }}
          />
        ) : null}

        <button
          type="button"
          onClick={onClose}
          disabled={ctaDisabled}
          aria-label="Close"
          style={{
            position: "absolute",
            top: isMobile ? 14 : 16,
            right: isMobile ? 14 : 16,
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.06)",
            color: "#A0A0A0",
            fontSize: 16,
            lineHeight: 1,
            cursor: ctaDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ctaDisabled ? 0.5 : 1,
            transition: `background-color 150ms ${EASE_UI}, color 150ms ${EASE_UI}, opacity 150ms ${EASE_UI}`,
          }}
        >
          ×
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            marginBottom: 18,
            background: "rgba(217,119,6,0.08)",
            border: "1px solid rgba(217,119,6,0.28)",
            borderRadius: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "#D97706",
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              Activating
            </div>
            <div style={{ fontSize: 15, color: "#FFFFFF", fontWeight: 600 }}>{planName}</div>
          </div>
          <div style={{ fontSize: 15, color: "#FFFFFF", fontWeight: 700, whiteSpace: "nowrap" }}>
            {priceLabel || ""}
          </div>
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: "0 0 6px",
            color: "#FFFFFF",
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
          }}
        >
          One quick step — then your plan is live
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#A0A0A0",
            margin: "0 0 18px",
            lineHeight: 1.5,
          }}
        >
          We'll activate {planName} the moment your payment clears.
        </p>

        {notice ? (
          <div
            style={{
              background:
                notice.kind === "error"
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(59,130,246,0.1)",
              border:
                notice.kind === "error"
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid rgba(59,130,246,0.3)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 12.5,
              color: notice.kind === "error" ? "#FCA5A5" : "#BFDBFE",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            {notice.text}
          </div>
        ) : null}

        {postAuthBusy ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "20px 0 14px",
              color: "#A0A0A0",
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.18)",
                borderTopColor: "#D97706",
                animation: "cvp-sheet-spin 700ms linear infinite",
              }}
            />
            Starting secure checkout…
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                background: "#FFFFFF",
                color: "#1F1F1F",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: loading ? 0.7 : 1,
                fontFamily: FONT,
                transition: `opacity 150ms ${EASE_UI}, background-color 150ms ${EASE_UI}, box-shadow 150ms ${EASE_UI}`,
                marginBottom: 14,
              }}
            >
              <GoogleG />
              Continue with Google
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "6px 0 14px",
                fontSize: 10.5,
                color: "#666",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              <span>or email</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            </div>

            <form onSubmit={handleEmailSubmit} noValidate>
              <div style={inputWrap}>
                <input
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (notice) setNotice(null);
                  }}
                  placeholder="Email"
                  style={inputEl}
                />
              </div>

              <div style={{ ...inputWrap, marginTop: 10, display: "flex", alignItems: "center" }}>
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (notice) setNotice(null);
                  }}
                  placeholder="Password"
                  style={{ ...inputEl, paddingRight: 4 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#A0A0A0",
                    padding: "0 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  background: loading
                    ? "rgba(255,211,61,0.55)"
                    : "linear-gradient(180deg, #FFD33D 0%, #FBBC05 100%)",
                  color: "#1A0F00",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: 14,
                  boxShadow: loading
                    ? "none"
                    : "inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 16px rgba(251,188,5,0.24)",
                  fontFamily: FONT,
                  transition: `opacity 150ms ${EASE_UI}, box-shadow 150ms ${EASE_UI}, background-color 150ms ${EASE_UI}`,
                }}
              >
                {loading
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in & continue"
                    : "Create account & continue"}
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                fontSize: 12.5,
                color: "#A0A0A0",
                marginTop: 16,
              }}
            >
              {mode === "signin" ? (
                <>
                  New to CVPassport?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setNotice(null);
                    }}
                    style={linkBtnStyle}
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setNotice(null);
                    }}
                    style={linkBtnStyle}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 11,
            color: "#666",
          }}
        >
          <LockIcon />
          Secure checkout by {currency === "INR" ? "Razorpay" : "Ziina"}
        </div>
      </div>

      <style>{`
        @keyframes cvp-sheet-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const linkBtnStyle = {
  background: "none",
  border: "none",
  color: "#F59E0B",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  fontFamily: FONT,
};

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.6154z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8604-3.0477.8604-2.344 0-4.3282-1.5831-5.0359-3.7104H.9574v2.3318C2.4382 15.9831 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.9641 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9574C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9574 4.0418L3.9641 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5814-2.5814C13.4636.8918 11.4263 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.9641 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
