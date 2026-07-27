// =============================================================
// src/components/account/AccountSheet.jsx
//
// 1a — mobile account bottom sheet, and 1c — the "Account & plan"
// sub-screen one level deeper. Ported verbatim from the approved design
// file "Account Sheet.dc.html" (Turn 1): row order, copy, icons, spacing
// and states are the design's, not reinterpreted.
//
// Replaces the old "Your plan" modal as the destination of the name tap
// and the Account tab on /dashboard.
//
// Build spec taken from the design's own routing notes:
//   - fixed, above the bottom tab bar (z 400/401 — the modal layer)
//   - max-height calc(100dvh - 44px), the sheet is the only scroller
//   - padding-bottom clears the iOS home bar via env(safe-area-inset-bottom)
//   - body scroll lock while open, scrollTop restored on close
//   - every row >= 52px, full-width tap target
//   - transform-only animation; prefers-reduced-motion drops the spring
//   - scrim tap / X / swipe down closes
//
// "Delete my account" is deliberately absent — it was dropped from the
// design in both the sheet and the sub-screen. Do not re-add it.
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../appSupabaseClient";
import {
  AcctIconArrowRight,
  AcctIconCard,
  AcctIconChevLeft,
  AcctIconChevRight,
  AcctIconClose,
  AcctIconGrid,
  AcctIconHelp,
  AcctIconHome,
  AcctIconSignOut,
  AcctIconTick,
} from "./accountIcons";
import "./accountSurfaces.css";

const SUPPORT_MAILTO = "mailto:support@mycvpassport.com";
/* Past this many pixels of downward drag the sheet dismisses instead of
   snapping back. */
const SWIPE_DISMISS_PX = 90;

export default function AccountSheet({
  open,
  onClose,
  user,
  isPaid,
  planLabel,
  initials,
  onSignOut,
  /* Paid-only. The EXISTING cancel flow, relocated here unchanged — the
     dashboard still owns the step state so the logic is untouched. */
  cancelStep = 0,
  onCancelStart,
  onCancelKeep,
}) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("root");
  const [paymentCount, setPaymentCount] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const sheetRef = useRef(null);
  const closeBtnRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const dragStartRef = useRef(null);

  /* Always land on the root screen; a sheet that reopens mid-flow is a
     mystery state. */
  useEffect(() => {
    if (open) setScreen("root");
  }, [open]);

  /* Body scroll lock + focus handling. Restores the scroll position and
     the previously focused element on close. */
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement;
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => { closeBtnRef.current?.focus(); }, 60);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
      window.clearTimeout(t);
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [open]);

  /* Esc closes. On the sub-screen it steps back first, matching the back
     arrow — Esc should never skip a level. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (screen === "account") setScreen("root");
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, screen, onClose]);

  /* Payment history caption. The design defines the empty state only, so
     anything non-empty just states the count. */
  useEffect(() => {
    if (!open || screen !== "account" || !supabase || !user?.id) return;
    let alive = true;
    /* limit(1) + exact count: the count header drives the caption, and the
       returned row is the fallback when a proxy strips content-range. */
    supabase
      .from("invoices")
      .select("id", { count: "exact" })
      .limit(1)
      .then(({ data, count, error }) => {
        if (!alive || error) return;
        if (typeof count === "number") setPaymentCount(count);
        else if (Array.isArray(data)) setPaymentCount(data.length === 0 ? 0 : null);
      });
    return () => { alive = false; };
  }, [open, screen, user?.id]);

  const go = useCallback((path) => { onClose(); navigate(path); }, [navigate, onClose]);

  const handleSignOut = useCallback(async () => {
    onClose();
    if (onSignOut) { await onSignOut(); return; }
    if (supabase) await supabase.auth.signOut();
    navigate("/");
  }, [navigate, onClose, onSignOut]);

  /* Swipe down to dismiss. Only engages when the sheet is scrolled to the
     top, so a drag inside a scrolled list still scrolls. */
  const onTouchStart = (e) => {
    const node = sheetRef.current;
    if (!node || node.scrollTop > 0) return;
    dragStartRef.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (dragStartRef.current === null) return;
    const dy = e.touches[0].clientY - dragStartRef.current;
    if (dy <= 0) { setDragY(0); return; }
    if (!dragging) setDragging(true);
    setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragStartRef.current === null) return;
    const dy = dragY;
    dragStartRef.current = null;
    setDragging(false);
    setDragY(0);
    if (dy > SWIPE_DISMISS_PX) onClose();
  };

  if (!open) return null;

  const displayName = user?.name || user?.email || "Your account";
  const email = user?.email || "";
  const planSub = isPaid ? `${planLabel} · manage` : "Free plan · see options";

  const paymentsMeta =
    paymentCount === null ? "" : paymentCount === 0 ? "No payments yet" : `${paymentCount} payment${paymentCount === 1 ? "" : "s"}`;

  return (
    <>
      <div
        className="cvp-acct-scrim"
        data-open="true"
        role="presentation"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="cvp-acct-sheet"
        data-open="true"
        data-dragging={dragging ? "true" : undefined}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={screen === "account" ? "Account and plan" : "Account"}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="cvp-acct-grabber" aria-hidden="true"><i /></div>

        {screen === "root" ? (
          <div className="cvp-acct-pad">
            {/* header: avatar · name · plan badge · email · close */}
            <div className="cvp-acct-head">
              <div className="cvp-acct-avatar" aria-hidden="true">{initials}</div>
              <div className="cvp-acct-idcol">
                <div className="cvp-acct-nameline">
                  <span className="cvp-acct-name">{displayName}</span>
                  <span className="cvp-acct-badge">{planLabel}</span>
                </div>
                {email ? <div className="cvp-acct-email">{email}</div> : null}
              </div>
              <button
                type="button"
                ref={closeBtnRef}
                className="cvp-acct-iconbtn"
                onClick={onClose}
                aria-label="Close"
              >
                <AcctIconClose />
              </button>
            </div>

            <div className="cvp-acct-rows">
              <button type="button" className="cvp-acct-row" onClick={() => go("/")}>
                <span className="cvp-acct-tile cvp-acct-tile--home"><AcctIconHome /></span>
                <span className="cvp-acct-rowtext">
                  <span className="cvp-acct-rowtitle">Home</span>
                  <span className="cvp-acct-rowsub">mycvpassport.com</span>
                </span>
                <AcctIconChevRight className="cvp-acct-chev" />
              </button>

              <button type="button" className="cvp-acct-row" onClick={() => go("/dashboard")}>
                <span className="cvp-acct-tile"><AcctIconGrid /></span>
                <span className="cvp-acct-rowtext">
                  <span className="cvp-acct-rowtitle">My CVs</span>
                  <span className="cvp-acct-rowsub">Your dashboard</span>
                </span>
                <AcctIconChevRight className="cvp-acct-chev" />
              </button>

              <button type="button" className="cvp-acct-row" onClick={() => setScreen("account")}>
                <span className="cvp-acct-tile"><AcctIconCard /></span>
                <span className="cvp-acct-rowtext">
                  <span className="cvp-acct-rowtitle">Account &amp; plan</span>
                  <span className="cvp-acct-rowsub">{planSub}</span>
                </span>
                <AcctIconChevRight className="cvp-acct-chev" />
              </button>

              <a className="cvp-acct-row" href={SUPPORT_MAILTO}>
                <span className="cvp-acct-tile"><AcctIconHelp /></span>
                <span className="cvp-acct-rowtext">
                  <span className="cvp-acct-rowtitle">Help &amp; contact</span>
                  <span className="cvp-acct-rowsub">support@mycvpassport.com</span>
                </span>
              </a>
            </div>

            <div className="cvp-acct-signout-wrap">
              <button type="button" className="cvp-acct-signout" onClick={handleSignOut}>
                <AcctIconSignOut />
                Sign out
              </button>
            </div>
            <div style={{ height: 8 }} />
          </div>
        ) : (
          <div className="cvp-acct-pad cvp-acct-pad--account">
            <div className="cvp-acct-subhead">
              <button
                type="button"
                className="cvp-acct-iconbtn"
                onClick={() => setScreen("root")}
                aria-label="Back"
              >
                <AcctIconChevLeft />
              </button>
              <span className="cvp-acct-subtitle">Account &amp; plan</span>
            </div>

            <div className="cvp-acct-body">
              {/* ── plan card ── free and paid states ── */}
              <div className="cvp-acct-plancard">
                <div className="cvp-acct-eyebrow">Current plan</div>
                {!isPaid ? (
                  <>
                    <div className="cvp-acct-planname">You&rsquo;re on the Free plan</div>
                    <div className="cvp-acct-planmeta">
                      No card on file. Nothing to cancel — build and download for free, forever.
                    </div>
                    <div className="cvp-acct-checks">
                      <div className="cvp-acct-check"><AcctIconTick />Every template, build for free</div>
                      <div className="cvp-acct-check"><AcctIconTick />1 free PDF download</div>
                      <div className="cvp-acct-check"><AcctIconTick />Basic ATS score, 3 AI rewrites a month</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cvp-acct-planname">{planLabel}</div>
                    <div className="cvp-acct-planmeta">
                      {user?.renewDate ? `Renews ${user.renewDate}` : "Active"}
                    </div>
                  </>
                )}
              </div>

              {/* Free user: the one optional upgrade path. */}
              {!isPaid ? (
                <div>
                  <button type="button" className="cvp-acct-cta" onClick={() => go("/pricing")}>
                    See plans and passes
                    <AcctIconArrowRight />
                  </button>
                  <div className="cvp-acct-ctanote">
                    From AED 19 one time. No subscription, cancel nothing.
                  </div>
                </div>
              ) : null}

              <div className="cvp-acct-links">
                <button type="button" className="cvp-acct-link" onClick={() => go("/account/invoices")}>
                  Payment history
                  {paymentsMeta ? <span className="cvp-acct-linkmeta">{paymentsMeta}</span> : null}
                </button>
                <a className="cvp-acct-link" href={SUPPORT_MAILTO}>Email support</a>
              </div>

              {/* ── Paid only: the EXISTING cancel flow, relocated here.
                     Same two steps, same copy, same mailto — the dashboard
                     still owns the step state. Free users never see it. ── */}
              {isPaid ? (
                cancelStep === 0 ? (
                  <button type="button" className="cvp-acct-cancel" onClick={onCancelStart}>
                    Cancel subscription
                  </button>
                ) : (
                  <div>
                    <div className="cvp-acct-cancelcopy">
                      Are you sure? Your plan continues until {user?.renewDate || "end of billing period"}. After that your account reverts to Free.
                    </div>
                    <button type="button" className="cvp-acct-keep" onClick={onCancelKeep}>
                      Keep my plan
                    </button>
                    <a
                      className="cvp-acct-yescancel"
                      href="mailto:support@mycvpassport.com?subject=Cancel Subscription"
                    >
                      Yes, cancel
                    </a>
                    <div className="cvp-acct-cancelnote">
                      Cancellation takes effect at end of billing period. Your CVs are kept for 30 days.
                    </div>
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
