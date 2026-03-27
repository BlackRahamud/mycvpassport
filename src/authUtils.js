/**
 * Human-readable Supabase Auth errors for signup/login (rate limits, verification, etc.)
 */
export function mapAuthError(error) {
  if (!error) return "Something went wrong. Please try again.";
  const raw = String(error.message || "");
  const msg = raw.toLowerCase();
  const status = error.status;

  if (
    status === 429 ||
    msg.includes("too many") ||
    msg.includes("rate limit") ||
    msg.includes("over_email_send_rate_limit") ||
    msg.includes("over_request_rate")
  ) {
    return "Too many attempts. Please wait several minutes before trying again.";
  }
  if (msg.includes("already registered") || msg.includes("user already registered")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Invalid email or password.";
  }
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return "Please verify your email first. Check your inbox for the confirmation link.";
  }
  return raw || "Something went wrong. Please try again.";
}

export function trimAuthFields({ name, email, password }) {
  return {
    name: (name || "").trim(),
    email: (email || "").trim(),
    password: password || "",
  };
}
