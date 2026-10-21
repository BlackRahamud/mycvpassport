// =============================================================
// src/components/hr/NotificationsBell.jsx
//
// Shared notifications bell for the HR portal.
// Full Glassmorphism, Card Layout, Multi-role Expansion,
// Match Score Pills, Live Tab Counts & Mobile Swipe Isolation.
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

const TYPE_CONFIG = {
  new_application: { label: "APPLICANT", badgeClass: "nb-tag--purple", icon: "👤" },
  viewed: { label: "VIEWED", badgeClass: "nb-tag--blue", icon: "👁" },
  shortlisted: { label: "VERDICT", badgeClass: "nb-tag--green", icon: "✓" },
  interview: { label: "INTERVIEW", badgeClass: "nb-tag--amber", icon: "📅" },
  urgent: { label: "URGENT", badgeClass: "nb-tag--red", icon: "⚠" },
  system: { label: "UPDATE", badgeClass: "nb-tag--slate", icon: "⚡" },
};

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

export function titleCaseName(s) {
  return String(s).replace(/[\p{L}\p{M}'’]+/gu, (w) => {
    if (/\p{Lu}/u.test(w) && /\p{Ll}/u.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

const DASH_SPLIT = /\s+[-–—]{1,2}\s+/;

function getInitials(name) {
  const clean = String(name || "").replace(/[^a-zA-Z\s]/g, "").trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2 && words[0][0] && words[1][0]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0] ? words[0].substring(0, 2).toUpperCase() : "HR";
}

export function formatNotification(n) {
  const raw = String(n?.title || "").trim();
  const parts = raw.split(DASH_SPLIT);
  const config = TYPE_CONFIG[n?.type] || TYPE_CONFIG.system;
  if (parts.length >= 2) {
    const candidateName = parts.slice(1).join(", ");
    return {
      label: config.label,
      main: titleCaseName(candidateName),
      initials: getInitials(candidateName),
    };
  }
  return { 
    label: config.label, 
    main: raw, 
    initials: getInitials(raw) 
  };
}

const BellIc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0-6 6v2.8c0 .9-.31 1.77-.88 2.47L4 15.58c-.5.62-.06 1.42.73 1.42h14.54c.79 0 1.23-.8.73-1.42l-1.12-1.31A3.94 3.94 0 0 1 18 11.8V9a6 6 0 0 0-6-6z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);
const CloseIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const MoreIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
  </svg>
);
const CheckIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const BellOffIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.6 3.6A6 6 0 0 1 18 8.6v3.2c0 .9.31 1.77.88 2.47" /><path d="M6 8v3.8c0 .9-.31 1.77-.88 2.47L4 15.58c-.5.62-.06 1.42.73 1.42H17" /><path d="M10 20a2 2 0 0 0 4 0" /><line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);
const TrashIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const HOVER_FINE_QUERY = "(hover: hover) and (pointer: fine)";

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

function RowMenu({ n, anchorRect, onClose, onDelete, onMute, onMarkRead }) {
  const menuRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);
  if (!anchorRect) return null;
  const style = {
    position: "fixed",
    top: Math.min(anchorRect.bottom + 4, window.innerHeight - 160),
    left: Math.min(anchorRect.left, window.innerWidth - 196),
    zIndex: 4100,
  };
  const typeLabel = TYPE_CONFIG[n.type]?.label || "THIS TYPE";
  return createPortal(
    <div ref={menuRef} className="nb-menu" role="menu" aria-label="Notification actions" style={style}>
      {!n.read && (
        <button type="button" role="menuitem" className="nb-menu__item" onClick={() => { onMarkRead(n); onClose(); }}>
          <CheckIc /> Mark as read
        </button>
      )}
      <button type="button" role="menuitem" className="nb-menu__item" onClick={() => { onMute(n); onClose(); }}>
        <BellOffIc /> Mute {typeLabel.toLowerCase()}
      </button>
      <button type="button" role="menuitem" className="nb-menu__item nb-menu__item--danger" onClick={() => { onDelete(n); onClose(); }}>
        <TrashIc /> Delete
      </button>
    </div>,
    document.body,
  );
}

const TILE_W = 56;
const TILE_GAP = 6;
const TILE_PAD = 8;

function NotificationCard({ n, revealed, anyRevealed, onReveal, onOpen, onDelete, onMute, onMarkRead, onMenu, hoverFine, reduce }) {
  const isUnread = !n.read;
  const tileCount = isUnread ? 3 : 2;
  const revealWidth = tileCount * TILE_W + (tileCount - 1) * TILE_GAP + TILE_PAD * 2;
  const draggingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const { label, main, initials } = formatNotification(n);
  const swipeable = !hoverFine && !reduce;
  const config = TYPE_CONFIG[n?.type] || TYPE_CONFIG.system;

  // Mock metadata for rich preview match
  const matchScore = n.match_score || (n.id ? (85 + (n.id.charCodeAt(0) % 12)) : 92);
  const mockRoles = n.roles || (n.type === "new_application" ? [
    { title: "IT Support Analyst L2", status: "Screening" },
    { title: "Senior React Developer", status: "Applied" },
  ] : null);

  return (
    <motion.div
      className="nb-card-wrapper"
      layout={reduce ? false : true}
      initial={false}
      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: 0.22, ease: EASE } }}
    >
      {/* Action tiles strictly isolated behind surface */}
      {!hoverFine && (
        <div className="nb-card__actions" style={{ width: revealWidth }} aria-hidden={!revealed}>
          {isUnread && (
            <button type="button" className="nb-tile" tabIndex={revealed ? 0 : -1} onClick={() => onMarkRead(n)}>
              <CheckIc /><span>Read</span>
            </button>
          )}
          <button type="button" className="nb-tile" tabIndex={revealed ? 0 : -1} onClick={() => onMute(n)}>
            <BellOffIc /><span>Mute</span>
          </button>
          <button type="button" className="nb-tile nb-tile--delete" tabIndex={revealed ? 0 : -1} onClick={() => onDelete(n)}>
            <TrashIc /><span>Delete</span>
          </button>
        </div>
      )}

      {/* Surface Card */}
      <motion.div
        className={`nb-card ${isUnread ? "nb-card--unread" : ""}`}
        drag={swipeable ? "x" : false}
        dragConstraints={{ left: -revealWidth, right: 0 }}
        dragElastic={0.05}
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
        <div 
          className="nb-card__main"
          onClick={() => {
            if (draggingRef.current) return;
            if (anyRevealed) { onReveal(null); return; }
            onOpen(n);
          }}
        >
          {/* Avatar with top-right anchored unread dot */}
          <div className={`nb-card__avatar ${config.badgeClass}`}>
            <span>{initials}</span>
            {isUnread && <span className="nb-card__unread-dot" />}
          </div>

          <div className="nb-card__content">
            <div className="nb-card__header-line">
              <span className="nb-card__title">{main}</span>
              <span className="nb-card__time">{timeAgo(n.created_at)}</span>
            </div>

            {n.body && <p className="nb-card__sub">{n.body}</p>}

            {/* Badges line: type + match pill + roles expander */}
            <div className="nb-card__pills">
              <span className={`nb-pill ${config.badgeClass}`}>
                {config.icon} {label}
              </span>
              <span className="nb-pill nb-pill--match">
                ⚡ {matchScore}% match
              </span>
              {mockRoles && mockRoles.length > 0 && (
                <button 
                  type="button" 
                  className="nb-pill nb-pill--expand"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                  }}
                >
                  {expanded ? "Hide roles ▲" : `View ${mockRoles.length + 1} roles ▼`}
                </button>
              )}
            </div>
          </div>

          {hoverFine && (
            <button
              type="button"
              className="nb-card__more"
              aria-label={`Actions for ${main}`}
              onClick={(e) => {
                e.stopPropagation();
                onMenu(n, e.currentTarget.getBoundingClientRect());
              }}
            >
              <MoreIc />
            </button>
          )}
        </div>

        {/* Collapsible Multi-Role Sub-Cards */}
        <AnimatePresence>
          {expanded && mockRoles && (
            <motion.div
              className="nb-roles-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {mockRoles.map((r, idx) => (
                <div key={idx} className="nb-role-item">
                  <span className="nb-role-item__title">{r.title}</span>
                  <span className="nb-role-item__status">{r.status}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function NotificationsBell({ userId, buttonClassName = "hjl-icon-btn" }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [muted, setMuted] = useState(() => readMutedTypes(userId));
  const [revealedId, setRevealedId] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const rootRef = useRef(null);

  const [hoverFine, setHoverFine] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(HOVER_FINE_QUERY).matches
      : true,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(HOVER_FINE_QUERY);
    const onChange = (e) => setHoverFine(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  useEffect(() => {
    if (!userId) return undefined;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [userId, load]);

  useEffect(() => {
    if (!open) { setRevealedId(null); setRowMenu(null); return undefined; }
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (floatingRef.current?.contains(e.target)) return;
      if (e.target.closest?.(".nb-menu")) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, floatingRef]);

  const allItems = (items || []).filter((n) => !muted.includes(n.type || "system"));
  const unreadCount = allItems.filter((n) => !n.read).length;

  const countApplicants = allItems.filter((n) => n.type === "new_application" || n.type === "shortlisted").length;
  const countUpdates = allItems.filter((n) => n.type !== "new_application" && n.type !== "shortlisted").length;

  const visible = allItems.filter((n) => {
    if (activeTab === "applicants") return n.type === "new_application" || n.type === "shortlisted";
    if (activeTab === "updates") return n.type !== "new_application" && n.type !== "shortlisted";
    return true;
  });

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
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

  const deleteRow = async (n) => {
    setRevealedId(null);
    setItems((prev) => (prev || []).filter((x) => x.id !== n.id));
    const { error } = await supabase.from("hr_notifications").delete().eq("id", n.id);
    if (error) load();
  };

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
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIc />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              className="nb-badge"
              key="badge"
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0, transition: { duration: 0.14, ease: EASE } }}
              transition={reduce ? { duration: 0 } : POP_SPRING}
            >
              <motion.span
                key={unreadCount}
                className="nb-badge__num"
                initial={reduce ? false : { scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={reduce ? { duration: 0 } : POP_SPRING}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
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
            {/* Header with Title, Unread Pill, Mark All Read, and Close Button */}
            <div className="nb-head">
              <div className="nb-head__left">
                <span className="nb-head__title">Notifications</span>
                {unreadCount > 0 && (
                  <span className="nb-head__unread-pill">{unreadCount} unread</span>
                )}
              </div>
              <div className="nb-head__right">
                {unreadCount > 0 && (
                  <button type="button" className="nb-head__mark" onClick={markAllRead}>
                    <CheckIc /> Mark read
                  </button>
                )}
                <button type="button" className="nb-head__close" onClick={() => setOpen(false)}>
                  <CloseIc />
                </button>
              </div>
            </div>

            {/* Category Filter Tabs with Live Item Counts */}
            <div className="nb-tabs">
              <button 
                type="button" 
                className={`nb-tab ${activeTab === "all" ? "nb-tab--active" : ""}`} 
                onClick={() => setActiveTab("all")}
              >
                All <span className="nb-tab__count">{allItems.length}</span>
              </button>
              <button 
                type="button" 
                className={`nb-tab ${activeTab === "applicants" ? "nb-tab--active" : ""}`} 
                onClick={() => setActiveTab("applicants")}
              >
                Applicants <span className="nb-tab__count">{countApplicants}</span>
              </button>
              <button 
                type="button" 
                className={`nb-tab ${activeTab === "updates" ? "nb-tab--active" : ""}`} 
                onClick={() => setActiveTab("updates")}
              >
                Updates <span className="nb-tab__count">{countUpdates}</span>
              </button>
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
                    <NotificationCard
                      key={n.id}
                      n={n}
                      revealed={revealedId === n.id}
                      anyRevealed={revealedId !== null}
                      onReveal={setRevealedId}
                      onOpen={openRow}
                      onDelete={deleteRow}
                      onMute={muteRow}
                      onMarkRead={markReadRow}
                      onMenu={(row, rect) => setRowMenu({ n: row, rect })}
                      hoverFine={hoverFine}
                      reduce={reduce}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {muted.length > 0 && (
              <div className="nb-muted">
                <span>Muted: {muted.map((t) => TYPE_CONFIG[t]?.label || t).join(", ")}</span>
                <button type="button" onClick={unmuteAll}>Unmute</button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}

      {rowMenu && (
        <RowMenu
          n={rowMenu.n}
          anchorRect={rowMenu.rect}
          onClose={() => setRowMenu(null)}
          onDelete={deleteRow}
          onMute={muteRow}
          onMarkRead={markReadRow}
        />
      )}
    </div>
  );
}