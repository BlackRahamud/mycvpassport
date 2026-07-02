import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./appSupabaseClient";
import { mapAuthError, trimAuthFields, classifySignInError } from "./authUtils";
import { loadUserResumes } from "./resumeDb";
import { EMPTY_RESUME, TEMPLATES } from "./cvShared";
import { identifyClarity } from "./lib/analytics/clarity";
import { identifyPostHog, resetPostHog } from "./lib/analytics/posthog";
import { setCurrentAuthUserId } from "./lib/analytics/authState";
import { hasProAccess } from "./config/access";
import { isFounder } from "./utils/founder";
import { getLastPortal } from "./lib/employer/portalMemory";
import { resolveLoginRoute } from "./lib/auth/loginRoute";

// ── Auth trace logging ──────────────────────────────────────────────────────
// The postAuth redirect logic is noisy by design while debugging. These traces
// must never reach a production console: they're gated behind a debug flag that
// is off unless explicitly enabled in dev via
//   localStorage.setItem('cvp-auth-trace', '1')
// Production builds short-circuit to a no-op (process.env.NODE_ENV === 'production').
const AUTH_TRACE = (() => {
  if (process.env.NODE_ENV === "production") return false;
  try { return typeof window !== "undefined" && window.localStorage?.getItem("cvp-auth-trace") === "1"; }
  catch { return false; }
})();
const trace = (...args) => { if (AUTH_TRACE) console.log(...args); };

const extractName = (u) => u.user_metadata?.name || u.user_metadata?.full_name || u.email.split("@")[0];

// ── Post-auth redirect pickup ───────────────────────────────────────────────
// Landing-page CTAs (e.g. ATSPreview) may stash an intended destination
// under `postAuthRedirect` before sending the user to /register. After a
// successful signup/login we consume that value once and route there.
const POST_AUTH_REDIRECT_KEY = "postAuthRedirect";
function consumePostAuthRedirect() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const v = window.localStorage.getItem(POST_AUTH_REDIRECT_KEY);
    if (v) window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return v || null;
  } catch {
    return null;
  }
}

// Set by NavigateToAuth when a logged-out user hits a protected route
// (e.g. /scout). Read here once after auth completes so the user lands
// back on the page they wanted instead of the generic /dashboard.
// Reject "/auth" and "/" defensively in case something writes a useless
// destination — those shouldn't trigger a return navigation.
const RETURN_PATH_KEY = "cvp_return_path";
function consumeReturnPath() {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const v = window.sessionStorage.getItem(RETURN_PATH_KEY);
    if (v) window.sessionStorage.removeItem(RETURN_PATH_KEY);
    if (!v || v === "/auth" || v === "/") return null;
    return v;
  } catch {
    return null;
  }
}

export function useCvpAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode] = useState(() => {
    if (typeof window === "undefined") return "signup";
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "signin") return "login";
      if (window.localStorage?.getItem("cvp_returning_user") === "true") return "login";
    } catch { /* fall through to default */ }
    return "signup";
  });
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [profile, setProfile] = useState({
    is_pro: false,
    plan: "FREE",
    features: {},
    pro_access_expires_at: null,
    download_credits: 0,
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const authLoginSuccessHoldRef = useRef(false);
  // Set when onAuthStateChange fires SIGNED_IN outside of the email
  // login/signup path (i.e. OAuth callbacks). Lets the post-auth useEffect
  // route the user even if Supabase drops them at "/" instead of /auth.
  const justSignedInRef = useRef(false);
  // Previous session user id. Supabase fires SIGNED_IN on browser tab
  // focus / token refresh for already-authenticated sessions; we gate
  // justSignedInRef on a real null → user transition so those spurious
  // events never trigger the post-auth redirect branch.
  const prevSessionUserIdRef = useRef(null);
  // Last user id we've called identifyClarity / identifyPostHog for.
  // Guards against re-identifying on every tab-focus SIGNED_IN.
  const lastIdentifiedIdRef = useRef(null);
  // Last user id we've synced a metadata-recruiter's hr_profiles row for.
  // Keeps ensureProfileRow from re-upserting on every tab-focus SIGNED_IN.
  const recruiterSyncedIdRef = useRef(null);
  const [postAuthIntermission, setPostAuthIntermission] = useState(false);
  const [editingResume, setEditingResume] = useState(null);
  const [resumeList, setResumeList] = useState([]);
  const [, setResume] = useState(EMPTY_RESUME);
  const [, setSelectedTemplate] = useState(TEMPLATES[0]);

  // Breathing room after any auth-triggered navigate — gives Supabase session,
  // storage reads, and the destination's on-mount effects time to settle so
  // the user never sees a half-populated page flash. 1500ms matches the
  // FAB tab-switch breathing pattern (spinner then destination).
  const INTERMISSION_MS = 1500;
  const runPostAuthNavigate = useCallback((dest, opts = { replace: true }) => {
    setPostAuthIntermission(true);
    setTimeout(() => {
      navigate(dest, opts);
      // Let the destination paint once before tearing down the overlay.
      setTimeout(() => setPostAuthIntermission(false), 320);
    }, INTERMISSION_MS);
  }, [navigate]);

  const ensureProfileRow = async (authUser) => {
    if (!supabase || !authUser?.id) return;
    // Employer signups stash recruiter intent in signUp metadata so it
    // survives the email-verification detour: with confirmation required
    // there is no session at signup time, so handleAuth's explicit profile
    // update never runs. First real session lands here instead.
    const meta = authUser.user_metadata || {};
    const isMetaRecruiter = meta.user_type === "recruiter";
    // Insert only if new user; never overwrite existing row.
    // Email sync (Step 2) removed — the .or() chaining after .eq() on .update()
    // triggers 403 on Supabase JS v2 RLS policies.
    await supabase.from("profiles").upsert(
      {
        id: authUser.id,
        email: authUser.email || "",
        plan: "FREE",
        flagged: false,
        features: {},
        ...(isMetaRecruiter
          ? {
              user_type: "recruiter",
              company_name: meta.company_name || null,
              work_email: meta.work_email || null,
            }
          : {}),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    // hr_profiles row for metadata recruiters (company_name is NOT NULL, so
    // only when one was captured). Once per user per page load — applySession
    // re-invokes this on every tab-focus SIGNED_IN.
    if (isMetaRecruiter && meta.company_name && recruiterSyncedIdRef.current !== authUser.id) {
      recruiterSyncedIdRef.current = authUser.id;
      await supabase.from("hr_profiles").upsert(
        {
          user_id: authUser.id,
          company_name: meta.company_name,
          work_email: meta.work_email || "",
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadUserResumes(user.id)
      .then((data) => setResumeList(data || []))
      .catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const fetchProStatus = async (userId, traits = {}, founder = false) => {
      try {
        const { data: row } = await supabase
          .from("profiles")
          .select("is_pro, plan, features, pro_access_expires_at, download_credits")
          .eq("id", userId)
          .single();
        if (!cancelled) {
          // Founder unlock (client-side convenience): treat as pro so every
          // isPro / hasFeatureAccess gate opens. Keyed off the authenticated
          // session email only; does not touch RLS or server checks.
          const derivedIsPro = hasProAccess(row) || founder;
          setIsPro(derivedIsPro);
          setProfile({
            is_pro: derivedIsPro,
            plan: row?.plan || "FREE",
            features: row?.features || {},
            pro_access_expires_at: row?.pro_access_expires_at || null,
            download_credits: row?.download_credits || 0,
          });
          // Re-identify with plan trait now that we know it.
          const planTrait = derivedIsPro ? "pro" : "free";
          identifyClarity(userId, { ...traits, plan: planTrait });
          identifyPostHog(userId, { ...traits, plan: planTrait });
        }
      } catch {
        if (!cancelled) {
          setIsPro(founder);
          setProfile({
            is_pro: founder,
            plan: "FREE",
            features: {},
            pro_access_expires_at: null,
            download_credits: 0,
          });
        }
      }
    };
    const applySession = (session) => {
      if (cancelled) return;
      if (session?.user) {
        ensureProfileRow(session.user).catch((e) => console.error("ensureProfileRow:", e));
        const nextName = extractName(session.user);
        const nextEmail = session.user.email;
        const nextId = session.user.id;
        // Preserve reference when identity is unchanged so downstream
        // effects keyed on `user` don't re-fire on tab-focus SIGNED_IN.
        setUser((prev) => {
          if (prev && prev.id === nextId && prev.email === nextEmail && prev.name === nextName) return prev;
          return { name: nextName, email: nextEmail, id: nextId };
        });
        if (lastIdentifiedIdRef.current !== nextId) {
          identifyClarity(nextId, { email: nextEmail });
          identifyPostHog(nextId, { email: nextEmail });
          setCurrentAuthUserId(nextId);
          lastIdentifiedIdRef.current = nextId;
          // Mark this browser as a returning user. Drives the /auth default
          // mode (signup for first-timers, signin for returners). Set on
          // every auth observation so users with active sessions on first
          // deploy get flagged on their next page load.
          try { window.localStorage?.setItem("cvp_returning_user", "true"); } catch { /* private mode */ }
        }
        fetchProStatus(session.user.id, { email: nextEmail }, isFounder(session.user));
      } else {
        setUser((prev) => (prev === null ? prev : null));
        setIsPro((prev) => (prev === false ? prev : false));
        setProfile((prev) => {
          if (
            prev
            && prev.is_pro === false
            && prev.plan === "FREE"
            && Object.keys(prev.features || {}).length === 0
            && prev.pro_access_expires_at == null
            && (prev.download_credits || 0) === 0
          ) return prev;
          return {
            is_pro: false,
            plan: "FREE",
            features: {},
            pro_access_expires_at: null,
            download_credits: 0,
          };
        });
        if (lastIdentifiedIdRef.current != null) {
          resetPostHog();
          setCurrentAuthUserId(null);
          lastIdentifiedIdRef.current = null;
        }
      }
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      prevSessionUserIdRef.current = session?.user?.id || null;
      applySession(session);
    }).catch((e) => {
      console.error("getSession:", e);
      if (!cancelled) setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const prevId = prevSessionUserIdRef.current;
      const nextId = session?.user?.id || null;
      prevSessionUserIdRef.current = nextId;
      // OAuth callbacks land back on our origin with either ?code=...
      // (PKCE/auth-code flow) or #access_token=... (implicit flow). The
      // null → user transition alone is NOT enough: onAuthStateChange
      // fires before getSession().then() has populated prevSessionUserIdRef,
      // so prevId === null on every page load with an existing session and
      // a regular navigation to /scout was getting bounced through the
      // post-auth redirect branch. Gating on the URL markers means the
      // fresh-sign-in flag only flips when this really is an OAuth return.
      const url = typeof window !== "undefined" ? window.location : null;
      const hasOAuthMarker = url
        ? (/[?&]code=/.test(url.search || "") || (url.hash || "").includes("access_token"))
        : false;
      // Don't gate on event === "SIGNED_IN". On an OAuth return, Supabase's
      // detectSessionInUrl exchanges the ?code= -> session BEFORE the first
      // onAuthStateChange fires, so the event we observe is INITIAL_SESSION
      // (or TOKEN_REFRESHED if the token was already in storage). The reliable
      // discriminator is hasOAuthMarker — the URL still has ?code=/#access_token=
      // at this point in the event loop, and a non-null user means the exchange
      // succeeded. prevId === null still guards against tab-focus re-fires.
      const willSetFreshSignIn = !authLoginSuccessHoldRef.current
        && prevId === null
        && !!nextId
        && hasOAuthMarker;
      trace("[cvp-auth-trace] onAuthStateChange", {
        event,
        prevId,
        nextId,
        hold: authLoginSuccessHoldRef.current,
        hasOAuthMarker,
        willSetFreshSignIn,
        path: typeof window !== "undefined" ? window.location.pathname : null,
      });
      applySession(session);
      if (willSetFreshSignIn) {
        justSignedInRef.current = true;
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user?.id) return;
    try {
      const { data: row } = await supabase
        .from("profiles")
        .select("is_pro, plan, features, pro_access_expires_at, download_credits")
        .eq("id", user.id)
        .single();
      const derivedIsPro = hasProAccess(row) || isFounder(user);
      setIsPro(derivedIsPro);
      setProfile({
        is_pro: derivedIsPro,
        plan: row?.plan || "FREE",
        features: row?.features || {},
        pro_access_expires_at: row?.pro_access_expires_at || null,
        download_credits: row?.download_credits || 0,
      });
    } catch {
      /* leave current values on failure */
    }
  }, [user]);

  useEffect(() => {
    trace("[cvp-auth-trace] postAuth useEffect fired", {
      authReady,
      userId: user?.id || null,
      pathname: location.pathname,
      justSignedIn: justSignedInRef.current,
      hold: authLoginSuccessHoldRef.current,
    });
    if (!authReady || !user) {
      trace("[cvp-auth-trace] postAuth bail — not ready or no user");
      return;
    }
    const clean = location.pathname.replace(/\/$/, "") || "/";
    if ((clean === "/auth" || clean === "/register") && authLoginSuccessHoldRef.current) {
      trace("[cvp-auth-trace] postAuth bail — login hold active on", clean);
      return;
    }
    // "Auth return" means the user was actively bounced through one of
    // the auth pages (e.g. NavigateToAuth bumped them off a protected
    // route) and is now waiting to be sent on. Just BEING on /auth is
    // not enough — a logged-in user typing /auth into the address bar,
    // or a hard refresh that briefly flickers through /auth before our
    // route guards settle, must NOT trigger a redirect dance. The
    // discriminator is sessionStorage["cvp_return_path"], which only
    // NavigateToAuth ever sets.
    const onAuthPagePath = clean === "/auth" || clean === "/register" || clean === "/auth/callback";
    const sessionReturnPeek = typeof window !== "undefined" && window.sessionStorage
      ? window.sessionStorage.getItem("cvp_return_path")
      : null;
    const isAuthReturnPath = onAuthPagePath && !!sessionReturnPeek;
    // OAuth providers can drop the user at "/" (Site URL) instead of the
    // requested redirectTo — if we just observed a fresh SIGNED_IN event,
    // treat that as an auth return from wherever we are.
    const isFreshOAuthSignIn = justSignedInRef.current && !authLoginSuccessHoldRef.current;
    trace("[cvp-auth-trace] postAuth decision inputs", {
      clean,
      onAuthPagePath,
      sessionReturnPeek,
      isAuthReturnPath,
      isFreshOAuthSignIn,
    });
    // Authenticated user is already on a content route (e.g. /builder,
    // /dashboard, /account). Never redirect — clear any leftover fresh-
    // sign-in state and bail. Defensive guard against tab-focus
    // SIGNED_IN events bouncing users off the page they were on.
    if (!isAuthReturnPath && clean !== "/") {
      trace("[cvp-auth-trace] postAuth early-return (on content route)", { clean });
      if (isFreshOAuthSignIn) {
        justSignedInRef.current = false;
        consumePostAuthRedirect();
      }
      return;
    }
    if (isAuthReturnPath || isFreshOAuthSignIn) {
      trace("[cvp-auth-trace] postAuth REDIRECT branch entered", {
        isAuthReturnPath,
        isFreshOAuthSignIn,
        queryUserId: user.id,
      });
      justSignedInRef.current = false;
      const stored = consumePostAuthRedirect();
      const sessionReturn = consumeReturnPath();

      // If the caller stashed an explicit destination (CheckoutAuthSheet's
      // Google handler, ATSPreview, NavigateToAuth), honor it and skip the
      // user_type lookup — that query is only needed for the no-intent
      // default-routing case. This makes the resume independent of any
      // profile read succeeding.
      if (stored || sessionReturn) {
        const target = stored || sessionReturn;
        trace("[cvp-auth-trace] postAuth navigating (stored intent)", { target });
        runPostAuthNavigate(target, { replace: true });
        return;
      }

      // No stored intent — fall back to user_type-based default routing.
      // Failure here must not block navigation; default to /dashboard.
      (async () => {
        let dest = "/dashboard";
        try {
          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("user_type")
            .eq("id", user.id)
            .maybeSingle();
          trace("[cvp-auth-trace] postAuth profile query result", {
            userId: user.id,
            prof,
            profErr,
          });
          if (prof?.user_type === "recruiter") dest = "/employer/jobs";
          else if (prof?.user_type === "both" && getLastPortal() === "employer") dest = "/employer/jobs";
        } catch (e) {
          trace("[cvp-auth-trace] postAuth profile query threw", e);
          /* default to /dashboard */
        }
        trace("[cvp-auth-trace] postAuth navigating (default routing)", { dest });
        runPostAuthNavigate(dest, { replace: true });
      })();
      return;
    }
    if (!["/", "/pricing", "/walk-in", "/builder", "/ats", "/cover-letter", "/dashboard", "/admin", "/account", "/templates", "/tools", "/hr", "/dashboard/applications", "/linkedin-optimizer", "/terms", "/privacy", "/refund"].includes(clean) && !clean.startsWith("/jobs/")) {
      trace("[cvp-auth-trace] postAuth allow-list fallback → /dashboard", { clean });
      navigate("/dashboard", { replace: true });
    }
  }, [authReady, user, location.pathname, navigate, runPostAuthNavigate]);

  const handleAuth = async (userData, modeOverride) => {
    if (!supabase) return { ok: false };
    const isSignup = (modeOverride ?? authMode) === "signup";
    const trimmed = trimAuthFields(userData);
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (!trimmed.email || !trimmed.password) {
        setAuthError("validation_missing");
        return { ok: false };
      }
      if (isSignup && trimmed.password.length < 8) {
        setAuthError("validation_password_short");
        return { ok: false };
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = origin ? `${origin}/auth` : undefined;

      if (isSignup) {
        // Claim the post-auth redirect hold BEFORE any awaits so the
        // auth-state-change useEffect doesn't race us and consume the
        // stored postAuthRedirect first (which would leave handleAuth
        // with no redirect target and bounce the user to "/?welcome=true").
        authLoginSuccessHoldRef.current = true;
        const { data, error } = await supabase.auth.signUp({
          email: trimmed.email,
          password: trimmed.password,
          options: {
            emailRedirectTo,
            data: {
              name: trimmed.name || trimmed.email.split("@")[0],
              // Recruiter intent rides in auth metadata so ensureProfileRow
              // can apply it on the first session even when email
              // verification interrupts the signup (no session here → the
              // explicit profile update below never runs in that flow).
              ...(trimmed.userType === "recruiter"
                ? {
                    user_type: "recruiter",
                    company_name: trimmed.companyName || "",
                    work_email: trimmed.workEmail || "",
                  }
                : {}),
            },
          },
        });
        if (error) {
          authLoginSuccessHoldRef.current = false;
          setAuthError(mapAuthError(error));
          return { ok: false };
        }
        if (data.session && data.user) {
          await ensureProfileRow(data.user);
          // Store user_type and company_name for recruiter signups
          if (trimmed.userType) {
            const profileUpdate = { user_type: trimmed.userType };
            if (trimmed.userType === "recruiter") {
              if (trimmed.workEmail) profileUpdate.work_email = trimmed.workEmail;
              if (trimmed.companyName) profileUpdate.company_name = trimmed.companyName;
            }
            await supabase.from("profiles").update(profileUpdate).eq("id", data.user.id);
            // Also create hr_profiles row for recruiters
            if (trimmed.userType === "recruiter" && trimmed.companyName) {
              await supabase.from("hr_profiles").upsert({
                user_id: data.user.id,
                company_name: trimmed.companyName,
                work_email: trimmed.workEmail || "",
              }, { onConflict: "user_id", ignoreDuplicates: true });
            }
          }
          setUser({ name: trimmed.name || extractName(data.user), email: data.user.email, id: data.user.id });
          setIsPro(false);
          setPendingVerificationEmail(null);
          // Read postAuthRedirect, remove it immediately, then navigate.
          // No other redirect logic must fire after this — the hold ref
          // gates the auth-state useEffect, and we release it AFTER the
          // navigate has committed so the next render lands on the
          // destination URL (not /auth or /register) and skips naturally.
          const stored = consumePostAuthRedirect();
          const sessionReturn = consumeReturnPath();
          // Employer signups flow straight into company onboarding (one
          // flow: account → company → first job post), not the candidate
          // landing toast.
          const dest = stored || sessionReturn || (trimmed.userType === "recruiter" ? "/employer/onboarding" : "/?welcome=true");
          runPostAuthNavigate(dest, { replace: true });
          authLoginSuccessHoldRef.current = false;
          return { ok: true };
        }
        if (data.user && !data.session) {
          authLoginSuccessHoldRef.current = false;
          setPendingVerificationEmail(trimmed.email);
          return { ok: true };
        }
        authLoginSuccessHoldRef.current = false;
        setAuthError("Signup could not be completed. Try again or use a different email.");
        return { ok: false };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed.email,
        password: trimmed.password,
      });
      if (error) {
        setAuthError(classifySignInError(error));
        return { ok: false };
      }
      if (!data.user) {
        setAuthError("generic");
        return { ok: false };
      }
      await ensureProfileRow(data.user);
      setUser({ name: extractName(data.user), email: data.user.email, id: data.user.id });
      setPendingVerificationEmail(null);
      authLoginSuccessHoldRef.current = true;
      // Fetch user_type to determine routing. The decision matrix lives in
      // resolveLoginRoute (src/lib/auth/loginRoute.js) — pure + unit-tested.
      let loginRoute = "/dashboard";
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", data.user.id)
          .single();
        loginRoute = resolveLoginRoute({
          intentUserType: trimmed.userType || null,
          profileUserType: prof?.user_type || null,
          lastPortal: getLastPortal(),
        });
      } catch {
        // Profile read failed — employer intent still resolves to
        // onboarding (which self-redirects recruiters); default otherwise.
        loginRoute = resolveLoginRoute({
          intentUserType: trimmed.userType || null,
          profileUserType: null,
          lastPortal: null,
        });
      }
      // Admin-email override: if the intended destination is /admin
      // (stashed in postAuthRedirect or the current URL), skip /hr and
      // go to /admin. Keeps /hr as the default for the same account
      // when no admin intent is signalled.
      if (trimmed.email === "connectingjunaidkhan@gmail.com") {
        let stored = null;
        try { stored = window.localStorage.getItem("postAuthRedirect"); } catch { /* noop */ }
        if (stored === "/admin" || (typeof window !== "undefined" && window.location.pathname === "/admin")) {
          loginRoute = "/admin";
        }
      }
      return { ok: true, loginShowSuccess: true, loginRoute };
    } catch (err) {
      console.error("handleAuth:", err);
      setAuthError(mapAuthError(err));
      return { ok: false };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = useCallback(async (email) => {
    if (!supabase) return { ok: false };
    const e = (email || "").trim().toLowerCase();
    if (!e) return { ok: false };
    const { error } = await supabase.auth.resend({ type: "signup", email: e });
    return { ok: !error };
  }, []);

  const handleForgotPassword = useCallback(async (email) => {
    if (!supabase) return { ok: false, reason: "generic" };
    const e = (email || "").trim().toLowerCase();
    if (!e) return { ok: false, reason: "empty" };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo: origin ? `${origin}/auth` : undefined,
    });
    if (error) return { ok: false, reason: "generic" };
    return { ok: true };
  }, []);

  const handleLogout = async () => {
    authLoginSuccessHoldRef.current = false;
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setIsPro(false);
    setProfile({
      is_pro: false,
      plan: "FREE",
      features: {},
      pro_access_expires_at: null,
      download_credits: 0,
    });
    navigate("/");
  };

  const handleEditResume = (record) => {
    setEditingResume(record);
    navigate("/builder");
  };

  const handleNewResume = (opts) => {
    setEditingResume(null);
    const sessionId = Date.now();
    const params = new URLSearchParams();
    params.set("new", sessionId);
    if (opts?.openFabGuide) {
      params.set("guide", "true");
      sessionStorage.removeItem("hasCompletedGuide");
    }
    navigate(`/builder?${params.toString()}`);
  };

  const currentPath = location.pathname.replace(/\/$/, "") || "/";

  const authPageSharedProps = {
    onAuth: handleAuth,
    user,
    loading: authLoading,
    error: authError,
    pendingVerificationEmail,
    onClearAuthError: () => setAuthError(null),
    onDelayedLoginNavigate: (path) => {
      authLoginSuccessHoldRef.current = false;
      const stored = consumePostAuthRedirect();
      const sessionReturn = consumeReturnPath();
      runPostAuthNavigate(stored || sessionReturn || path || "/dashboard", { replace: true });
    },
    onResendVerification: handleResendVerification,
    onForgotPassword: handleForgotPassword,
    onGoToSignUp: () => {
      setPendingVerificationEmail(null);
      setAuthMode("signup");
      navigate("/register");
    },
    onBackToSignIn: () => {
      setPendingVerificationEmail(null);
      setAuthMode("login");
      navigate("/auth");
    },
  };

  return {
    navigate,
    location,
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
    postAuthIntermission,
  };
}
