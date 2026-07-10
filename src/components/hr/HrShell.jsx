import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import NoIndex from "../seo/NoIndex";
import { supabase } from "../../appSupabaseClient";
import UserMenu from "../UserMenu/UserMenu";
import PortalLogo from "./PortalLogo";
import HrWelcomeRing from "./HrWelcomeRing";
import "../../pages/hr/PostJob/postJob.css"; // :root --pj-* tokens
import "./hrShell.css";

/* ───────── Rail nav ─────────
   Working routes only — no "coming soon" placeholders (design rule).
   Insights lives as the in-page toggle inside Jobs (Prompt 1), so it is
   intentionally NOT a rail item yet. /employer/jobs/:id (pipeline) keeps Jobs
   active. */
const NAV = [
  {
    key: "jobs",
    label: "Jobs",
    to: "/employer/jobs",
    isActive: (p) => p === "/employer/jobs" || p.startsWith("/employer/jobs/"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    key: "candidates",
    label: "Candidates",
    to: "/employer/candidates",
    isActive: (p) => p.startsWith("/employer/candidates"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "import",
    label: "Import",
    to: "/employer/import",
    isActive: (p) => p.startsWith("/employer/import"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    key: "post",
    label: "Post a Job",
    to: "/employer/post",
    isActive: (p) => p.startsWith("/employer/post"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    key: "pricing",
    label: "Plans",
    to: "/employer/pricing",
    isActive: (p) => p.startsWith("/employer/pricing"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
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
      <NoIndex />
      <motion.aside
        className="hrs-rail"
        initial={reduce ? false : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      >
        <button type="button" className="hrs-brand" aria-label="CVPassport Portal — go to dashboard" onClick={() => navigate("/employer/jobs")}><PortalLogo /></button>

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
            placement="up"
          />
        </div>
      </motion.aside>

      <div className="hrs-content">
        <Outlet />
      </div>

      <HrWelcomeRing />
    </div>
  );
}
