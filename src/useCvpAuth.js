import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./appSupabaseClient";
import { mapAuthError, trimAuthFields, classifySignInError } from "./authUtils";
import { loadUserResumes } from "./resumeDb";
import { EMPTY_RESUME, TEMPLATES } from "./cvShared";

const extractName = (u) => u.user_metadata?.name || u.user_metadata?.full_name || u.email.split("@")[0];

export function useCvpAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [profile, setProfile] = useState({ is_pro: false, plan: "FREE", features: {} });
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const authLoginSuccessHoldRef = useRef(false);
  const [editingResume, setEditingResume] = useState(null);
  const [resumeList, setResumeList] = useState([]);
  const [, setResume] = useState(EMPTY_RESUME);
  const [, setSelectedTemplate] = useState(TEMPLATES[0]);

  const ensureProfileRow = async (authUser) => {
    if (!supabase || !authUser?.id) return;
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
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
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
    const fetchProStatus = async (userId) => {
      try {
        const { data: row } = await supabase.from("profiles").select("is_pro, plan, features").eq("id", userId).single();
        if (!cancelled) {
          setIsPro(!!row?.is_pro);
          setProfile({
            is_pro: !!row?.is_pro,
            plan: row?.plan || "FREE",
            features: row?.features || {},
          });
        }
      } catch {
        if (!cancelled) {
          setIsPro(false);
          setProfile({ is_pro: false, plan: "FREE", features: {} });
        }
      }
    };
    const applySession = (session) => {
      if (cancelled) return;
      if (session?.user) {
        ensureProfileRow(session.user).catch((e) => console.error("ensureProfileRow:", e));
        setUser({ name: extractName(session.user), email: session.user.email, id: session.user.id });
        fetchProStatus(session.user.id);
      } else {
        setUser(null);
        setIsPro(false);
        setProfile({ is_pro: false, plan: "FREE", features: {} });
      }
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data: { session } }) => applySession(session)).catch((e) => {
      console.error("getSession:", e);
      if (!cancelled) setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
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
        .select("is_pro, plan, features")
        .eq("id", user.id)
        .single();
      setIsPro(!!row?.is_pro);
      setProfile({
        is_pro: !!row?.is_pro,
        plan: row?.plan || "FREE",
        features: row?.features || {},
      });
    } catch {
      /* leave current values on failure */
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authReady || !user) return;
    const clean = location.pathname.replace(/\/$/, "") || "/";
    if ((clean === "/auth" || clean === "/register") && authLoginSuccessHoldRef.current) return;
    if (clean === "/auth" || clean === "/register") {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!["/", "/pricing", "/walk-in", "/builder", "/ats", "/cover-letter", "/dashboard", "/admin", "/account", "/templates"].includes(clean)) {
      navigate("/dashboard", { replace: true });
    }
  }, [authReady, user, location.pathname, navigate]);

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
        const { data, error } = await supabase.auth.signUp({
          email: trimmed.email,
          password: trimmed.password,
          options: {
            emailRedirectTo,
            data: { name: trimmed.name || trimmed.email.split("@")[0] },
          },
        });
        if (error) {
          setAuthError(mapAuthError(error));
          return { ok: false };
        }
        if (data.session && data.user) {
          await ensureProfileRow(data.user);
          setUser({ name: trimmed.name || extractName(data.user), email: data.user.email, id: data.user.id });
          setIsPro(false);
          setPendingVerificationEmail(null);
          navigate("/dashboard", { replace: true });
          return { ok: true };
        }
        if (data.user && !data.session) {
          setPendingVerificationEmail(trimmed.email);
          return { ok: true };
        }
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
      return { ok: true, loginShowSuccess: true };
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
    setProfile({ is_pro: false, plan: "FREE", features: {} });
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
    loading: authLoading,
    error: authError,
    pendingVerificationEmail,
    onClearAuthError: () => setAuthError(null),
    onDelayedLoginNavigate: () => {
      authLoginSuccessHoldRef.current = false;
      navigate("/dashboard", { replace: true });
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
  };
}
