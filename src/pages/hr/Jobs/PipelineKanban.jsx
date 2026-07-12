import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import { STAGES, NEW_STATUSES } from "../../../lib/hr/stages";
import { scoreBand, BAND_COLORS } from "../../../lib/ats/scoreBand";
import "./pipelineKanban.css";

/*
 * Pipeline kanban — the board view of JobPipelinePage. Pure view layer:
 * persistence goes through the SAME updateStatus/buildStageMoveWrites
 * path as the stage list (via onMove), so history + RLS are identical.
 *
 * Motion rules (per design bar): transform/opacity only, 150-350ms,
 * springs on state change, nothing loops. Drag lift + column highlight
 * via dnd-kit; settle/reflow/spring-back via Framer layout animations.
 * All non-essential motion collapses when `reduce` is true.
 */

const EASE = [0.4, 0, 0.2, 1];

/* Null for a missing/bad date so callers can omit the line entirely —
   never an em dash in interface text. */
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/* ── ATS score badge — color-coded via the shared scoreBand tokens.
      One score format everywhere: N/100 (matches import rows, the CRM
      list pill, and the verdict ring — the walkthrough flagged "84%
      match" vs "84/100 fit" as the same number in four costumes). ── */
function ScoreBadge({ score, source }) {
  const band = scoreBand(score, source);
  const color = BAND_COLORS[band];
  return (
    <span
      className={`jpp-kb-score jpp-kb-score--${band}`}
      style={{ "--kb-band": color }}
      title={band === "none" ? "No match score yet" : `Match score ${score}/100`}
    >
      {band === "none" ? "No score" : `${score}/100`}
    </span>
  );
}

/* ── Six-dot grip — the visible "you can drag this" affordance, so the
      cursor is never the only signal. ── */
const GripIc = () => (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
    <circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" />
    <circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" />
    <circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" />
  </svg>
);

/* ── Score legend — one line above the board; thresholds mirror
      scoreBand (80/50), never restated numbers that could drift. ── */
function ScoreLegend() {
  const items = [
    { band: "high", text: "80 and up, strong" },
    { band: "mid", text: "50 to 79, maybe" },
    { band: "low", text: "under 50, weak" },
  ];
  return (
    <div className="jpp-kb-legend" aria-label="Match score legend">
      <span className="jpp-kb-legend__label">Match score:</span>
      {items.map((it) => (
        <span key={it.band} className="jpp-kb-legend__item">
          <span className="jpp-kb-legend__dot" style={{ background: BAND_COLORS[it.band] }} aria-hidden />
          {it.text}
        </span>
      ))}
    </div>
  );
}

/* ── Animated column count — crossfade/slide, never a hard swap ── */
function AnimatedCount({ value, reduce }) {
  return (
    <span className="jpp-kb-col__count" aria-label={`${value} candidates`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduce ? false : { y: 7, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: -7, opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ── Move-to-stage menu (keyboard path) — portaled so column scroll
      never clips it. ── */
function MoveMenu({ app, currentStageKey, onMove, onClose, anchorRect }) {
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
    top: Math.min(anchorRect.bottom + 6, window.innerHeight - 260),
    left: Math.min(anchorRect.left, window.innerWidth - 220),
    zIndex: 4000,
  };
  return createPortal(
    <div ref={menuRef} className="jpp-kb-menu" role="menu" aria-label="Move to stage" style={style}>
      <div className="jpp-kb-menu__label">Move to stage</div>
      {STAGES.map((s) => (
        <button
          key={s.key}
          type="button"
          role="menuitem"
          className="jpp-kb-menu__item"
          disabled={s.key === currentStageKey}
          onClick={() => { onMove(app.id, s.key); onClose(); }}
        >
          {s.label}
          {s.key === currentStageKey && <span className="jpp-kb-menu__here">current</span>}
        </button>
      ))}
      <div className="jpp-kb-menu__divider" />
      <button
        type="button"
        role="menuitem"
        className="jpp-kb-menu__item jpp-kb-menu__item--danger"
        onClick={() => { onMove(app.id, "rejected"); onClose(); }}
      >
        Pass (reject)
      </button>
    </div>,
    document.body,
  );
}

/* ── Card ── */
function KanbanCard({ app, stageKey, onOpen, onMenu, reduce, dragging, landed }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
    data: { stageKey },
  });
  const isNew = NEW_STATUSES.has(app.status);
  const appliedOn = fmtDate(app.applied_at);
  return (
    <motion.div
      layout={reduce ? false : "position"}
      layoutId={reduce ? undefined : `kb-${app.id}`}
      transition={{ type: "spring", stiffness: 480, damping: 38 }}
      className="jpp-kb-cardwrap"
      style={{ opacity: isDragging || dragging ? 0.35 : 1 }}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        role="button"
        tabIndex={0}
        className={`jpp-kb-card jpp-kb-card--grip${landed ? " jpp-kb-card--landed" : ""}`}
        onClick={() => onOpen(app.id, stageKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onOpen(app.id, stageKey); }
        }}
        aria-label={`${app.candidate_name || "Unnamed candidate"}, ${stageKey} stage. Enter to open, space to drag, or use the move menu.`}
      >
        <span className="jpp-kb-card__grip" aria-hidden><GripIc /></span>
        <div className="jpp-kb-card__top">
          <span className="jpp-kb-card__name">{app.candidate_name || "Unnamed candidate"}</span>
          <ScoreBadge score={app.ats_score} source={app.score_source} />
        </div>
        <div className="jpp-kb-card__meta">
          {appliedOn && <span>Applied {appliedOn}</span>}
          {isNew && <span className="jpp-kb-card__new">New</span>}
          {app.source === "imported" && <span className="jpp-kb-card__new jpp-kb-card__new--imported">Imported</span>}
        </div>
        <button
          type="button"
          className="jpp-kb-card__kebab"
          aria-label={`Move ${app.candidate_name || "candidate"} to another stage`}
          onClick={(e) => {
            e.stopPropagation();
            onMenu(app, stageKey, e.currentTarget.getBoundingClientRect());
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

/* ── Phone card — drag between columns is impractical at 393px, so the
      grip gives way to an explicit "Move to" button on each card,
      opening the same move menu the keyboard path uses. ── */
function PhoneCard({ app, stageKey, onOpen, onMenu }) {
  const isNew = NEW_STATUSES.has(app.status);
  const appliedOn = fmtDate(app.applied_at);
  return (
    <div
      role="button"
      tabIndex={0}
      className="jpp-kb-card jpp-kb-card--phone"
      onClick={() => onOpen(app.id, stageKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onOpen(app.id, stageKey); }
      }}
      aria-label={`${app.candidate_name || "Unnamed candidate"}, ${stageKey} stage. Enter to open.`}
    >
      <div className="jpp-kb-card__top">
        <span className="jpp-kb-card__name">{app.candidate_name || "Unnamed candidate"}</span>
        <ScoreBadge score={app.ats_score} source={app.score_source} />
      </div>
      <div className="jpp-kb-card__meta jpp-kb-card__meta--phone">
        <span className="jpp-kb-card__meta-left">
          {appliedOn && <span>Applied {appliedOn}</span>}
          {isNew && <span className="jpp-kb-card__new">New</span>}
          {app.source === "imported" && <span className="jpp-kb-card__new jpp-kb-card__new--imported">Imported</span>}
        </span>
        <button
          type="button"
          className="jpp-kb-card__moveto"
          aria-label={`Move ${app.candidate_name || "candidate"} to another stage`}
          onClick={(e) => {
            e.stopPropagation();
            onMenu(app, stageKey, e.currentTarget.getBoundingClientRect());
          }}
        >
          Move to
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Column ── */
function KanbanColumn({ stage, cards, onOpen, onMenu, reduce, draggingId, draggingFromStage, landedId, headerExtra, leadExtra }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  // The dashed landing slot only appears when the hovered card is coming
  // FROM another column — same-column hovers can't move anything.
  const showDropSlot = isOver && draggingFromStage && draggingFromStage !== stage.key;
  return (
    <section
      className={`jpp-kb-col jpp-kb-col--${stage.key}${isOver ? " jpp-kb-col--over" : ""}`}
      aria-label={`${stage.label}, ${cards.length} candidates`}
    >
      <header className="jpp-kb-col__head">
        <span className="jpp-kb-col__title">{stage.label}</span>
        <AnimatedCount value={cards.length} reduce={reduce} />
        {headerExtra}
      </header>
      <div ref={setNodeRef} className="jpp-kb-col__body">
        {leadExtra && cards.length > 0 && <div className="jpp-kb-col__lead">{leadExtra}</div>}
        {cards.map((app) => (
          <KanbanCard
            key={app.id}
            app={app}
            stageKey={stage.key}
            onOpen={onOpen}
            onMenu={onMenu}
            reduce={reduce}
            dragging={draggingId === app.id}
            landed={landedId === app.id}
          />
        ))}
        {showDropSlot && cards.length > 0 && (
          <div className="jpp-kb-dropslot" aria-hidden>Drop here</div>
        )}
        {cards.length === 0 && (
          <div className="jpp-kb-empty">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="7" r="4" /><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" />
            </svg>
            <p>{stage.key === "new" ? "New applicants land here" : `No one at ${stage.label} yet`}</p>
            <span className="jpp-kb-empty__drag-hint">Drag a card here to move them</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Skeleton while applications load ── */
export function KanbanSkeleton() {
  return (
    <div className="jpp-kb" aria-hidden>
      {STAGES.map((s, i) => (
        <section key={s.key} className="jpp-kb-col">
          <header className="jpp-kb-col__head">
            <span className="jpp-kb-skel jpp-kb-skel--title" />
          </header>
          <div className="jpp-kb-col__body">
            {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
              <div key={j} className="jpp-kb-card jpp-kb-card--skel">
                <span className="jpp-kb-skel jpp-kb-skel--name" />
                <span className="jpp-kb-skel jpp-kb-skel--meta" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* During a pointer-captured drag the browser ignores per-element cursor
   rules, so grab/grabbing must be pinned on <body> for the drag's whole
   lifetime — otherwise the cursor flickers back to default mid-flight. */
const setBodyDragging = (on) =>
  document.body.classList.toggle("jpp-kb-dragging", on);

/* ≤480px: drag is a thumb trap, so the board becomes one column at a time
   with a stage-chip pager (see PhonePager below). */
const PHONE_QUERY = "(max-width: 480px)";

export default function PipelineKanban({ stageBuckets, onMove, onOpen, reduce, headerExtras = {}, leadExtras = {} }) {
  const [draggingId, setDraggingId] = useState(null);
  const [landedId, setLandedId] = useState(null); // settle flash after a stage move
  const [menu, setMenu] = useState(null); // { app, stageKey, rect }
  const landedTimer = useRef(null);
  // Guarded: jsdom (unit tests) has no matchMedia.
  const [isPhone, setIsPhone] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(PHONE_QUERY).matches
      : false,
  );
  const [phoneStage, setPhoneStage] = useState(STAGES[0].key);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = (e) => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => () => {
    setBodyDragging(false);
    clearTimeout(landedTimer.current);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const draggingApp = draggingId
    ? Object.values(stageBuckets).flat().find((a) => a.id === draggingId) || null
    : null;

  /* Single move path for drag drops AND the keyboard menu, so both get
     the same settle flash. Rejected cards leave the board — no flash. */
  const handleMove = useCallback(
    (id, toStage) => {
      onMove(id, toStage);
      if (toStage === "rejected" || reduce) return;
      clearTimeout(landedTimer.current);
      setLandedId(id);
      landedTimer.current = setTimeout(() => setLandedId(null), 700);
    },
    [onMove, reduce],
  );

  const handleDragEnd = useCallback(
    (event) => {
      setDraggingId(null);
      setBodyDragging(false);
      const { active, over } = event;
      if (!over) return;
      const fromStage = active?.data?.current?.stageKey;
      const toStage = over.id;
      if (!toStage || toStage === fromStage) return;
      handleMove(active.id, toStage);
    },
    [handleMove],
  );

  /* ── Phone: stage-chip pager, one column at a time, swipe to switch ── */
  if (isPhone) {
    const stageIdx = STAGES.findIndex((s) => s.key === phoneStage);
    const cards = stageBuckets[phoneStage] || [];
    const activeStageDef = STAGES[stageIdx] || STAGES[0];
    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      if (touchStartX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < 48) return;
      const next = stageIdx + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < STAGES.length) setPhoneStage(STAGES[next].key);
    };
    return (
      <div className="jpp-kbm" role="region" aria-label="Pipeline board">
        <div className="jpp-kbm-chips" role="tablist" aria-label="Pipeline stages">
          {STAGES.map((s) => {
            const active = s.key === phoneStage;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`jpp-kbm-chip jpp-kbm-chip--${s.key}${active ? " jpp-kbm-chip--active" : ""}`}
                onClick={() => setPhoneStage(s.key)}
              >
                {s.label} {(stageBuckets[s.key] || []).length}
              </button>
            );
          })}
        </div>
        <div className="jpp-kbm-body" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {leadExtras[phoneStage] && cards.length > 0 && (
            <div className="jpp-kbm-extra">{leadExtras[phoneStage]}</div>
          )}
          {headerExtras[phoneStage] && (
            <div className="jpp-kbm-extra">{headerExtras[phoneStage]}</div>
          )}
          {cards.map((app) => (
            <PhoneCard
              key={app.id}
              app={app}
              stageKey={phoneStage}
              onOpen={onOpen}
              onMenu={(app2, stageKey, rect) => setMenu({ app: app2, stageKey, rect })}
            />
          ))}
          {cards.length === 0 && (
            <div className="jpp-kb-empty">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="7" r="4" /><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" />
              </svg>
              <p>{phoneStage === "new" ? "New applicants land here" : `No one at ${activeStageDef.label} yet`}</p>
              <span>Use Move to on a card to bring someone here</span>
            </div>
          )}
        </div>
        {menu && (
          <MoveMenu
            app={menu.app}
            currentStageKey={menu.stageKey}
            anchorRect={menu.rect}
            onMove={handleMove}
            onClose={() => setMenu(null)}
          />
        )}
      </div>
    );
  }

  const draggingFromStage = draggingApp
    ? (STAGES.find((s) => (stageBuckets[s.key] || []).some((a) => a.id === draggingId))?.key || null)
    : null;

  return (
    <LayoutGroup>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => { setDraggingId(e.active.id); setBodyDragging(true); }}
        onDragCancel={() => { setDraggingId(null); setBodyDragging(false); }}
        onDragEnd={handleDragEnd}
      >
        <ScoreLegend />
        <div className="jpp-kb" role="list" aria-label="Pipeline board">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              cards={stageBuckets[stage.key] || []}
              onOpen={onOpen}
              onMenu={(app, stageKey, rect) => setMenu({ app, stageKey, rect })}
              reduce={reduce}
              draggingId={draggingId}
              draggingFromStage={draggingFromStage}
              landedId={landedId}
              headerExtra={headerExtras[stage.key] || null}
              leadExtra={leadExtras[stage.key] || null}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={reduce ? null : { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }}>
          {draggingApp ? (
            <div className="jpp-kb-card jpp-kb-card--grip jpp-kb-card--lifted">
              <span className="jpp-kb-card__grip jpp-kb-card__grip--live" aria-hidden><GripIc /></span>
              <div className="jpp-kb-card__top">
                <span className="jpp-kb-card__name">{draggingApp.candidate_name || "Unnamed candidate"}</span>
                <ScoreBadge score={draggingApp.ats_score} source={draggingApp.score_source} />
              </div>
              <div className="jpp-kb-card__meta">
                {fmtDate(draggingApp.applied_at) && <span>Applied {fmtDate(draggingApp.applied_at)}</span>}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {menu && (
        <MoveMenu
          app={menu.app}
          currentStageKey={menu.stageKey}
          anchorRect={menu.rect}
          onMove={handleMove}
          onClose={() => setMenu(null)}
        />
      )}
    </LayoutGroup>
  );
}
