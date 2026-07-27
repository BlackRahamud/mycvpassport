// =============================================================
// src/components/account/AccountMenu.jsx
//
// 1b — desktop sidebar user popover. Anchored to the EXISTING sidebar
// user row in src/pages/DashboardPage.jsx (the .dashv2-sidebar bottom
// block); no new top bar is introduced. Opens UPWARD from bottom-left
// with the design's fade + scale spring (transform-origin: bottom left,
// ~300ms).
//
// Esc, outside click, or a second click on the row closes it; focus
// returns to the row. Ported verbatim from "Account Sheet.dc.html".
// =============================================================

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../appSupabaseClient";
import {
  AcctIconCard,
  AcctIconGrid,
  AcctIconHelp,
  AcctIconHome,
  AcctIconSignOut,
} from "./accountIcons";
import "./accountSurfaces.css";

const SUPPORT_MAILTO = "mailto:support@mycvpassport.com";

export default function AccountMenu({
  open,
  onClose,
  user,
  planLabel,
  initials,
  onSignOut,
  /* The sidebar user row, so an outside-click check can ignore the
     trigger itself (otherwise the row's own click would close and
     immediately reopen). */
  anchorRef,
  /* Optional ref forwarded by the host so its own outside-click handler
     can recognise this panel. */
  popoverRef,
  /* One optional extra row (dual-role employer doorway). Not part of the
     design's five rows — passed in by the host when it applies. */
  extraRow,
}) {
  const navigate = useNavigate();
  const ownRef = useRef(null);
  const popRef = popoverRef || ownRef;
  const firstRowRef = useRef(null);

  /* Esc + outside click. Focus returns to the trigger row on close, which
     is what the design's routing note asks for. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
      anchorRef?.current?.focus();
    };
    const onDown = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return; // the row toggles itself
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    const t = window.setTimeout(() => { firstRowRef.current?.focus(); }, 80);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.clearTimeout(t);
    };
  }, [open, onClose, anchorRef, popRef]);

  const go = (path) => { onClose(); navigate(path); };

  const handleSignOut = async () => {
    onClose();
    if (onSignOut) { await onSignOut(); return; }
    if (supabase) await supabase.auth.signOut();
    navigate("/");
  };

  const displayName = user?.name || user?.email || "Your account";
  const email = user?.email || "";

  return (
    <div
      ref={popRef}
      className="cvp-acct-pop"
      data-open={open ? "true" : undefined}
      role="menu"
      aria-label="Account menu"
      aria-hidden={open ? undefined : "true"}
    >
      <div className="cvp-acct-pophead">
        <div className="cvp-acct-popavatar" aria-hidden="true">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="cvp-acct-popname">{displayName}</span>
            <span className="cvp-acct-popbadge">{planLabel}</span>
          </div>
          {email ? <div className="cvp-acct-popemail">{email}</div> : null}
        </div>
      </div>

      <div className="cvp-acct-poprows">
        <button
          type="button"
          ref={firstRowRef}
          className="cvp-acct-poprow"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={() => go("/")}
        >
          <span><span style={{ color: "#8A6A2F", display: "flex" }}><AcctIconHome /></span>Back to homepage</span>
        </button>

        <button
          type="button"
          className="cvp-acct-poprow"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={() => go("/dashboard")}
        >
          <span><span style={{ color: "#52525B", display: "flex" }}><AcctIconGrid size={15} /></span>My CVs</span>
        </button>

        <button
          type="button"
          className="cvp-acct-poprow"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={() => go("/account")}
        >
          <span><span style={{ color: "#52525B", display: "flex" }}><AcctIconCard size={15} /></span>Account &amp; plan</span>
          <span className="cvp-acct-popmeta">{planLabel}</span>
        </button>

        <a
          className="cvp-acct-poprow"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          href={SUPPORT_MAILTO}
          onClick={onClose}
        >
          <span><span style={{ color: "#52525B", display: "flex" }}><AcctIconHelp size={15} /></span>Help &amp; contact</span>
        </a>

        {extraRow ? (
          <button
            type="button"
            className="cvp-acct-poprow"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            onClick={() => go(extraRow.to)}
          >
            <span>
              <span style={{ color: "#52525B", display: "flex" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </span>
              {extraRow.label}
            </span>
          </button>
        ) : null}
      </div>

      <div className="cvp-acct-popfoot">
        <button
          type="button"
          className="cvp-acct-popsignout"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={handleSignOut}
        >
          <AcctIconSignOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}
