/**
 * Human-readable Supabase Auth errors for signup (rate limits, verification, etc.)
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

/**
 * Classify sign-in errors for targeted UI (resend verification, forgot password, etc.)
 */
export function classifySignInError(error) {
  if (!error) return "generic";
  const msg = String(error.message || "").toLowerCase();
  const status = error.status;

  if (
    status === 429 ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("over_request_rate")
  ) {
    return "rate_limited";
  }
  if (
    msg.includes("email not confirmed") ||
    msg.includes("not confirmed") ||
    msg.includes("email_not_confirmed")
  ) {
    return "email_not_verified";
  }
  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid_credentials") ||
    msg.includes("wrong password")
  ) {
    return "wrong_credentials";
  }
  if (msg.includes("user not found") || msg.includes("no user")) {
    return "no_account";
  }
  return "generic";
}

export function trimAuthFields({ name, email, password, userType, workEmail, companyName }) {
  return {
    name: (name || "").trim(),
    email: (email || "").trim().toLowerCase(),
    password: (password || "").trim(),
    // Employer-signup fields. These MUST survive trimming — handleAuth keys
    // the recruiter branch (user_type, hr_profiles row) off trimmed.userType,
    // and dropping them here silently turned every employer signup into a
    // plain candidate account.
    userType: (userType || "").trim() || undefined,
    workEmail: (workEmail || "").trim().toLowerCase() || undefined,
    companyName: (companyName || "").trim() || undefined,
  };
}
