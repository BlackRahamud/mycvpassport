import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import "./userMenu.css";

/**
 * UserMenu — global avatar pill + popover.
 *
 * Lifted from `pages/ScoutDashboard.jsx`'s inline UserMenu so HR
 * surfaces (`/hr/jobs`, `/hr/jobs/:id`) and the candidate side
 * (`/jobs`, `/jobs/:id`, future dashboards) share one pattern. The
 * component owns its anchor button — callers just drop it in the
 * top-right of their topbar and pass the user-shaped props.
 *
 * Surface/theme choice
 *   theme="light"  → matches the new HR portal ink-on-white tokens
 *                    (used by /hr/* and the public /jobs board).
 *   theme="dark"   → matches the OLED app shell (cover letter,
 *                    builder, dashboard) for when we wire it there.
 *
 * The popover is positioned absolutely under the anchor and closes on
 * outside-click + Escape. It does not portal — the topbar is already
 * the highest stacking context on every page that uses it.
 */
const PLAN_LABELS = {
  "free":          { label: "Free plan",      tone: "green" },
  "FREE":          { label: "Free plan",      tone: "green" },
  "express-pass":  { label: "Express Pass",   tone: "green" },
  "active-hunter": { label: "Active Hunter",  tone: "green" },
  "career-pro":    { label: "Career Pro",     tone: "gold"  },
};

function planFromString(plan) {
  if (!plan) return PLAN_LABELS.FREE;
  return PLAN_LABELS[plan] || { label: String(plan), tone: "green" };
}

function initialsFrom(name, email) {
  const src = (name || email || "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  // Single token (or just an email) — first two letters.
  return src.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
}

export default function UserMenu({
  email,
  name,
  plan,
  switchTo,             // { label, path } — optional
  settingsPath = "/account",
  supportHref = "mailto:hello@mycvpassport.com",
  roleLabel,            // optional — "Admin" / "Owner" line under the name in the trigger
  theme = "light",
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const planInfo = planFromString(plan);
  const initials = initialsFrom(name, email);
  const display = name || (email ? email.split("@")[0] : "Sign in");

  // Close on outside click + Escape. Anchor lives outside the popover,
  // so we ignore clicks inside the anchor (its own onClick is the
  // toggle).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (path) => () => {
    setOpen(false);
    if (path) navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // signOut already invalidates the local session even if the
      // network call fails — fall through to the redirect.
    }
    navigate("/");
  };

  return (
    <div className={`um-root um-root--${theme}`}>
      <button
        ref={anchorRef}
        type="button"
        className="um-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="um-avatar">{initials}</span>
        <span className="um-trigger__text">
          <span className="um-trigger__name">{display}</span>
          {roleLabel && <span className="um-trigger__role">{roleLabel}</span>}
        </span>
        <ChevronIcon open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            className="um-popover"
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            {email && (
              <div className="um-email" title={email}>{email}</div>
            )}

            <div className="um-divider" />

            <div className="um-plan">
              <span className={`um-plan-dot um-plan-dot--${planInfo.tone}`} />
              {planInfo.label}
            </div>

            <div className="um-divider" />

            <button type="button" role="menuitem" className="um-item" onClick={go(settingsPath)}>
              <SettingsIcon /> Settings
            </button>

            <a
              role="menuitem"
              className="um-item"
              href={supportHref}
              target={supportHref.startsWith("http") ? "_blank" : undefined}
              rel={supportHref.startsWith("http") ? "noreferrer noopener" : undefined}
              onClick={() => setOpen(false)}
            >
              <HelpIcon /> Help &amp; Support
            </a>

            {switchTo && switchTo.path && (
              <button type="button" role="menuitem" className="um-item" onClick={go(switchTo.path)}>
                <SwitchIcon /> {switchTo.label || "Switch view"}
              </button>
            )}

            <div className="um-divider" />

            <button
              type="button"
              role="menuitem"
              className="um-item um-item--logout"
              onClick={handleLogout}
            >
              <LogoutIcon /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Inline icons (no lucide dependency at the topbar) ───────── */
function ChevronIcon({ open }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 160ms cubic-bezier(0.4,0,0.2,1)", transform: open ? "rotate(180deg)" : "none" }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function SwitchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
