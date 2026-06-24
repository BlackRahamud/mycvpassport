// =============================================================
// src/components/hr/NotificationsBell.jsx
//
// Shared notifications bell for the HR portal (Jobs landing + pipeline).
// Reads hr_notifications where hr_id = auth.uid(), newest first, and
// wires the previously-dead bell button. Unread state uses the existing
// hr_notifications.read column (RLS FOR ALL lets the owning HR flip it).
// Clicking a row navigates to the relevant job pipeline.
//
// `buttonClassName` lets each page keep its own bell button styling
// (hjl-icon-btn on Jobs, jpp-icon-btn on the pipeline).
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import "./notificationsBell.css";

const EASE = [0.4, 0, 0.2, 1];

const BellIc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

export default function NotificationsBell({ userId, buttonClassName = "hjl-icon-btn" }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null); // null = loading
  const rootRef = useRef(null);

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

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const unread = (items || []).filter((n) => !n.read).length;

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
    if (n.job_id) navigate(`/hr/jobs/${n.job_id}`);
  };

  return (
    <div className="nb-root" ref={rootRef}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIc />
        {unread > 0 && <span className="nb-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nb-pop"
            role="menu"
            initial={reduce ? false : { opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.16, ease: EASE }}
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
              ) : items.length === 0 ? (
                <div className="nb-empty">
                  <p className="nb-empty__t">You're all caught up</p>
                  <p className="nb-empty__b">New applicants and updates will show here.</p>
                </div>
              ) : (
                items.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    className={`nb-item${n.read ? "" : " nb-item--unread"}`}
                    onClick={() => openRow(n)}
                  >
                    <span className="nb-item__dot" aria-hidden="true" />
                    <span className="nb-item__body">
                      <span className="nb-item__title">{n.title}</span>
                      {n.body && <span className="nb-item__sub">{n.body}</span>}
                      <span className="nb-item__time">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
