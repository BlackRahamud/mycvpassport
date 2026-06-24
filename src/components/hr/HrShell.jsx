import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import UserMenu from "../UserMenu/UserMenu";
import "../../pages/hr/PostJob/postJob.css"; // :root --pj-* tokens
import "./hrShell.css";

/* ───────── Rail nav ─────────
   Working routes only — no "coming soon" placeholders (design rule).
   Insights lives as the in-page toggle inside Jobs (Prompt 1), so it is
   intentionally NOT a rail item yet. /hr/jobs/:id (pipeline) keeps Jobs
   active. */
const NAV = [
  {
    key: "jobs",
    label: "Jobs",
    to: "/hr/jobs",
    isActive: (p) => p === "/hr/jobs" || p.startsWith("/hr/jobs/"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    key: "post",
    label: "Post a Job",
    to: "/hr/post",
    isActive: (p) => p.startsWith("/hr/post"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
];

export default function HrShell() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  // profile.plan / full_name feed the UserMenu popover (mirrors the
  // best-effort fetch the pages already do).
  useEffect(() => {
    if (!user?.id) return undefined;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (live) setProfile(data || null);
    })();
    return () => { live = false; };
  }, [user?.id]);

  return (
    <div className="hrs-root">
      <motion.aside
        className="hrs-rail"
        initial={reduce ? false : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      >
        <a href="/" className="hrs-brand" aria-label="CVPassport home">CV<span>Passport</span></a>

        <nav className="hrs-nav" aria-label="HR portal">
          {NAV.map((item) => {
            const active = item.isActive(path);
            return (
              <button
                key={item.key}
                type="button"
                className={`hrs-navitem${active ? " hrs-navitem--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.to)}
              >
                <span className="hrs-navitem__icon">{item.icon}</span>
                <span className="hrs-navitem__label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hrs-rail__foot">
          <UserMenu
            email={user?.email || ""}
            name={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || ""}
            plan={profile?.plan}
            roleLabel="Admin"
            switchTo={{ label: "Switch to Candidate", path: "/dashboard" }}
            settingsPath="/account"
            theme="light"
          />
        </div>
      </motion.aside>

      <div className="hrs-content">
        <Outlet />
      </div>
    </div>
  );
}
