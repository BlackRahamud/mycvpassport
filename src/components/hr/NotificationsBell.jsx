// =============================================================
// src/components/hr/NotificationsBell.jsx
//
// Shared notifications bell for the HR portal (Jobs landing + pipeline).
// Reads hr_notifications where hr_id = auth.uid(), newest first. The
// hr_notifications RLS policy is FOR ALL on the owning HR, so read
// flips and row deletes are plain client writes — no new backend.
//
// iOS-style UX (design brief Jul 2026):
// - red dot badge (#FF3B30) with a spring pop when the count changes;
//   no badge at zero. List refreshes every 60s so arrivals pop in.
// - panel opens with a spring fade + drop + scale from the bell corner.
// - rows render "New applicant" as a small label with the candidate's
//   name (Title Cased) as the line — the stored "title — name" em dash
//   is parsed out and NEVER rendered.
// - per-row actions like iOS Mail: swipe left (touch/pointer drag) or
//   the hover "…" button reveal Read / Mute / Delete. Delete removes
//   the DB row and collapses the row out. Mute hides that notification
//   TYPE on this device (localStorage, viewPref pattern) — a footer
//   line shows what's muted with one-tap Unmute, no mystery states.
//
// `buttonClassName` lets each page keep its own bell button styling
// (hjl-icon-btn on Jobs, jpp-icon-btn on the pipeline).
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import { useAnchoredPosition } from "../ui/useAnchoredPosition";
import "./notificationsBell.css";

const EASE = [0.4, 0, 0.2, 1];
const POP_SPRING = { type: "spring", stiffness: 520, damping: 18 };
const PANEL_SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 };
const ROW_SPRING = { type: "spring", stiffness: 420, damping: 34 };

/* Human labels per hr_notifications.type — the small line above the name. */
const TYPE_LABELS = {
  new_application: "New applicant",
  viewed: "Application viewed",
  shortlisted: "Shortlisted",
  job_closed: "Job closed",
  system: "Update",
};

/* Mute preference — per user, per device (localStorage, same pattern as
   cvp_pipeline_view). Muted TYPES are hidden from the list and badge. */
const mutedKey = (userId) => `cvp_notif_muted_${userId || "anon"}`;
export function readMutedTypes(userId) {
  try {
    const v = JSON.parse(window.localStorage?.getItem(mutedKey(userId)) || "[]");
    return Array.isArray(v) ? v.filter((t) => typeof t === "string") : [];
  } catch { return []; }
}
export function writeMutedTypes(userId, types) {
  try { window.localStorage?.setItem(mutedKey(userId), JSON.stringify(types)); } catch { /* private mode */ }
}

/* Title Case a NAME: fix all-lower/ALL-UPPER words ("junaid khan" ->
   "Junaid Khan", "AL-BALUSHI" -> "Al-Balushi") but leave deliberate
   mixed case ("McDonald", "van der Berg" keeps "van"? no — only words
   that already mix cases are preserved). */
export function titleCaseName(s) {
  return String(s).replace(/[\p{L}\p{M}'’]+/gu, (w) => {
    if (/\p{Lu}/u.test(w) && /\p{Ll}/u.test(w)) return w; // mixed case — intentional
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

/* Strip any spaced dash separator (hyphen, en, em, double hyphen) that
   the stored strings may carry — never rendered per the copy rule.
   Hyphenated names (no surrounding spaces) are untouched. */
const DASH_SPLIT = /\s+[-–—]{1,2}\s+/;
const stripDashes = (s) => String(s).replace(new RegExp(DASH_SPLIT.source, "g"), ", ");

/* "New applicant — junaid khan" -> { label: "New applicant", main: "Junaid Khan" }.
   No-dash titles keep their text and get a label from the type map. */
export function formatNotification(n) {
  const raw = String(n?.title || "").trim();
  const parts = raw.split(DASH_SPLIT);
  if (parts.length >= 2) {
    return {
      label: TYPE_LABELS[n?.type] || parts[0],
      main: titleCaseName(parts.slice(1).join(", ")),
    };
  }
  return { label: TYPE_LABELS[n?.type] || null, main: raw };
}

const BellIc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0-6 6v2.8c0 .9-.31 1.77-.88 2.47L4 15.58c-.5.62-.06 1.42.73 1.42h14.54c.79 0 1.23-.8.73-1.42l-1.12-1.31A3.94 3.94 0 0 1 18 11.8V9a6 6 0 0 0-6-6z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);
const MoreIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
  </svg>
);

function timeAgo(s) {
  const t = new Date(s).getTime();
  if (!t) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

/* ── One notification row: swipe left (or "…") reveals Read/Mute/Delete ── */
function NotificationRow({ n, revealed, onReveal, onOpen, onDelete, onMute, onMarkRead, reduce }) {
  const isUnread = !n.read;
  const revealWidth = isUnread ? 168 : 116;
  const draggingRef = useRef(false);
  const { label, main } = formatNotification(n);
  return (
    <motion.div
      className="nb-row"
      layout={reduce ? false : true}
      initial={false}
      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: 0.22, ease: EASE } }}
    >
      <div className="nb-row__actions" style={{ width: revealWidth }} aria-hidden={!revealed}>
        {isUnread && (
          <button type="button" className="nb-act nb-act--read" tabIndex={revealed ? 0 : -1} onClick={() => onMarkRead(n)}>
            Read
          </button>
        )}
        <button type="button" className="nb-act nb-act--mute" tabIndex={revealed ? 0 : -1} onClick={() => onMute(n)}>
          Mute
        </button>
        <button type="button" className="nb-act nb-act--delete" tabIndex={revealed ? 0 : -1} onClick={() => onDelete(n)}>
          Delete
        </button>
      </div>
      <motion.div
        className="nb-row__content"
        drag={reduce ? false : "x"}
        dragConstraints={{ left: -revealWidth, right: 0 }}
        dragElastic={0.06}
        dragDirectionLock
        onDragStart={() => { draggingRef.current = true; }}
        onDragEnd={(e, info) => {
          setTimeout(() => { draggingRef.current = false; }, 0);
          const opened = info.offset.x < -revealWidth / 2 || info.velocity.x < -300;
          onReveal(opened ? n.id : null);
        }}
        animate={{ x: revealed ? -revealWidth : 0 }}
        transition={reduce ? { duration: 0 } : ROW_SPRING}
      >
        <button
          type="button"
          className={`nb-item${isUnread ? " nb-item--unread" : ""}`}
          onClick={() => {
            if (draggingRef.current) return;
            if (revealed) { onReveal(null); return; }
            onOpen(n);
          }}
        >
          <span className="nb-item__dot" aria-hidden="true" />
          <span className="nb-item__body">
            {label && <span className="nb-item__label">{label}</span>}
            <span className="nb-item__title">{main}</span>
            {n.body && <span className="nb-item__sub">{stripDashes(n.body)}</span>}
            <span className="nb-item__time">{timeAgo(n.created_at)}</span>
          </span>
        </button>
        <button
          type="button"
          className="nb-item__more"
          aria-label={`Actions for ${main}`}
          aria-expanded={!!revealed}
          onClick={(e) => { e.stopPropagation(); onReveal(revealed ? null : n.id); }}
        >
          <MoreIc />
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function NotificationsBell({ userId, buttonClassName = "hjl-icon-btn" }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null); // null = loading
  const [muted, setMuted] = useState(() => readMutedTypes(userId));
  const [revealedId, setRevealedId] = useState(null);
  const rootRef = useRef(null);

  // Portal + Floating UI so the popover can't be clipped by a topbar/card.
  const { referenceRef, floatingRef, floatingStyle } = useAnchoredPosition({
    open, placement: "bottom-end", gap: 8, padding: 8,
  });

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("hr_notifications")
      .select("id, title, body, type, job_id, candidate_id, application_id, read, created_at")
      .eq("hr_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data || []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setMuted(readMutedTypes(userId)); }, [userId]);

  // Light refresh so a new arrival pops the badge without a reload.
  useEffect(() => {
    if (!userId) return undefined;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [userId, load]);

  useEffect(() => {
    if (!open) { setRevealedId(null); return undefined; }
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (floatingRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, floatingRef]);

  const visible = (items || []).filter((n) => !muted.includes(n.type || "system"));
  const unread = visible.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    setItems((prev) => (prev || []).map((n) => ({ ...n, read: true })));
    await supabase.from("hr_notifications").update({ read: true }).eq("hr_id", userId).eq("read", false);
  };

  const openRow = (n) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => (prev || []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      supabase.from("hr_notifications").update({ read: true }).eq("id", n.id).then(() => {}, () => {});
    }
    if (n.job_id) navigate(`/employer/jobs/${n.job_id}`);
  };

  const markReadRow = (n) => {
    setRevealedId(null);
    if (n.read) return;
    setItems((prev) => (prev || []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    supabase.from("hr_notifications").update({ read: true }).eq("id", n.id).then(() => {}, () => {});
  };

  // Real delete — RLS (FOR ALL on hr_id) permits it. Optimistic removal
  // with the row collapse; on failure the list reloads (no silent loss).
  const deleteRow = async (n) => {
    setRevealedId(null);
    setItems((prev) => (prev || []).filter((x) => x.id !== n.id));
    const { error } = await supabase.from("hr_notifications").delete().eq("id", n.id);
    if (error) load();
  };

  // Mute this notification TYPE on this device.
  const muteRow = (n) => {
    setRevealedId(null);
    const t = n.type || "system";
    const next = [...new Set([...muted, t])];
    writeMutedTypes(userId, next);
    setMuted(next);
  };

  const unmuteAll = () => {
    writeMutedTypes(userId, []);
    setMuted([]);
  };

  return (
    <div className="nb-root" ref={rootRef}>
      <button
        ref={referenceRef}
        type="button"
        className={buttonClassName}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIc />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              className="nb-badge"
              key="badge"
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0, transition: { duration: 0.14, ease: EASE } }}
              transition={reduce ? { duration: 0 } : POP_SPRING}
            >
              <motion.span
                key={unread}
                className="nb-badge__num"
                initial={reduce ? false : { scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={reduce ? { duration: 0 } : POP_SPRING}
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {createPortal(
        <AnimatePresence>
        {open && (
          <motion.div
            ref={floatingRef}
            className="nb-pop"
            role="menu"
            style={{ ...floatingStyle, transformOrigin: "top right" }}
            initial={reduce ? false : { opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.15, ease: EASE } }}
            transition={reduce ? { duration: 0 } : PANEL_SPRING}
          >
            <div className="nb-head">
              <span className="nb-head__title">Notifications</span>
              {unread > 0 && (
                <button type="button" className="nb-head__mark" onClick={markAllRead}>Mark all read</button>
              )}
            </div>
            <div className="nb-list">
              {items === null ? (
                <div className="nb-empty"><p className="nb-empty__t">Loading…</p></div>
              ) : visible.length === 0 ? (
                <div className="nb-empty">
                  <p className="nb-empty__t">You're all caught up</p>
                  <p className="nb-empty__b">New applicants and updates will show here.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {visible.map((n) => (
                    <NotificationRow
                      key={n.id}
                      n={n}
                      revealed={revealedId === n.id}
                      onReveal={setRevealedId}
                      onOpen={openRow}
                      onDelete={deleteRow}
                      onMute={muteRow}
                      onMarkRead={markReadRow}
                      reduce={reduce}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
            {muted.length > 0 && (
              <div className="nb-muted">
                <span>Muted: {muted.map((t) => TYPE_LABELS[t] || t).join(", ")}</span>
                <button type="button" onClick={unmuteAll}>Unmute</button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
