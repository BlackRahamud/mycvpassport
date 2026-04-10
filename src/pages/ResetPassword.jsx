import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../appSupabaseClient";

const AUTH_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const authCardStyle = {
  background: "#141414",
  backgroundColor: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: "16px",
  padding: "24px",
  fontFamily: AUTH_FONT,
};

const authLabelStyle = {
  display: "block",
  fontWeight: 500,
  color: "#A0A0A0",
  fontSize: "14px",
  marginBottom: "6px",
  fontFamily: AUTH_FONT,
};

const authInputStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "#1C1C1C",
  border: "1px solid #2A2A2A",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: AUTH_FONT,
};

const authPrimaryBtn = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#FFFFFF",
  color: "#000000",
  fontWeight: 600,
  fontSize: "16px",
  cursor: "pointer",
  fontFamily: AUTH_FONT,
  transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1)",
};

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

function parseRecoveryFromHash() {
  const raw = typeof window !== "undefined" ? window.location.hash?.replace(/^#/, "") ?? "" : "";
  const params = new URLSearchParams(raw);
  const accessToken = params.get("access_token");
  const type = params.get("type");
  return {
    ok: Boolean(accessToken && type?.toLowerCase() === "recovery"),
  };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [linkValid, setLinkValid] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLinkValid(parseRecoveryFromHash().ok);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Something went wrong. Please try again.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message || "Something went wrong. Please try again.");
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/signin"), 2000);
  };

  if (linkValid === false) {
    return (
      <div className="cvp-auth-page" style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
        <div style={authCardStyle}>
          <p style={{ color: "#A0A0A0", fontSize: "14px", fontFamily: AUTH_FONT, margin: 0, textAlign: "center" }}>
            Invalid or expired reset link.
          </p>
        </div>
      </div>
    );
  }

  if (linkValid === null) {
    return (
      <div className="cvp-auth-page" style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
        <div style={authCardStyle}>
          <p style={{ color: "#A0A0A0", fontSize: "14px", fontFamily: AUTH_FONT, margin: 0, textAlign: "center" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="cvp-auth-page" style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
        <div style={authCardStyle}>
          <p style={{ color: "#86EFAC", fontSize: "15px", fontFamily: AUTH_FONT, margin: 0, textAlign: "center" }}>
            Password updated! Redirecting...
          </p>
        </div>
      </div>
    );
  }

  const submitBtnStyle = loading ? { ...authPrimaryBtn, background: "#2A2A2A", color: "#FFFFFF", cursor: "not-allowed" } : authPrimaryBtn;

  return (
    <div className="cvp-auth-page" style={{ maxWidth: "420px", margin: "60px auto", padding: "0 20px" }}>
      <div style={authCardStyle}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "6px", color: "#FFFFFF", fontFamily: AUTH_FONT }}>Set new password</h2>
        <p style={{ color: "#A0A0A0", marginBottom: "24px", fontSize: "14px", fontFamily: AUTH_FONT }}>Choose a strong password for your account.</p>

        {error ? (
          <div role="alert" style={AUTH_ERR_BOX}>
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
        >
          <div style={{ marginBottom: "16px" }}>
            <label style={authLabelStyle} htmlFor="cvp-reset-password">
              New password
            </label>
            <input
              id="cvp-reset-password"
              style={authInputStyle}
              type="password"
              name="password"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={authLabelStyle} htmlFor="cvp-reset-password-confirm">
              Confirm password
            </label>
            <input
              id="cvp-reset-password-confirm"
              style={authInputStyle}
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Confirm your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <p
            style={{
              fontSize: "12px",
              color: password.length >= 8 ? "#22C55E" : "#A0A0A0",
              marginTop: "-8px",
              marginBottom: "16px",
              fontFamily: AUTH_FONT,
            }}
          >
            At least 8 characters
          </p>
          <button type="submit" style={submitBtnStyle} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
