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

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/* ── ATS score badge — color-coded via the shared scoreBand tokens ── */
function ScoreBadge({ score, source }) {
  const band = scoreBand(score, source);
  const color = BAND_COLORS[band];
  return (
    <span
      className={`jpp-kb-score jpp-kb-score--${band}`}
      style={{ "--kb-band": color }}
      title={band === "none" ? "No ATS score yet" : `ATS match ${score}%`}
    >
      {band === "none" ? "—" : `${score}%`}
    </span>
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
function KanbanCard({ app, stageKey, onOpen, onMenu, reduce, dragging }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
    data: { stageKey },
  });
  const isNew = NEW_STATUSES.has(app.status);
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
        className="jpp-kb-card"
        onClick={() => onOpen(app.id, stageKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onOpen(app.id, stageKey); }
        }}
        aria-label={`${app.candidate_name || "Unnamed candidate"}, ${stageKey} stage. Enter to open, space to drag, or use the move menu.`}
      >
        <div className="jpp-kb-card__top">
          <span className="jpp-kb-card__name">{app.candidate_name || "Unnamed candidate"}</span>
          <ScoreBadge score={app.ats_score} source={app.score_source} />
        </div>
        <div className="jpp-kb-card__meta">
          <span>Applied {fmtDate(app.applied_at)}</span>
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

/* ── Column ── */
function KanbanColumn({ stage, cards, onOpen, onMenu, reduce, draggingId, headerExtra }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <section
      className={`jpp-kb-col${isOver ? " jpp-kb-col--over" : ""}`}
      aria-label={`${stage.label}, ${cards.length} candidates`}
    >
      <header className="jpp-kb-col__head">
        <span className="jpp-kb-col__title">{stage.label}</span>
        <AnimatedCount value={cards.length} reduce={reduce} />
        {headerExtra}
      </header>
      <div ref={setNodeRef} className="jpp-kb-col__body">
        {cards.map((app) => (
          <KanbanCard
            key={app.id}
            app={app}
            stageKey={stage.key}
            onOpen={onOpen}
            onMenu={onMenu}
            reduce={reduce}
            dragging={draggingId === app.id}
          />
        ))}
        {cards.length === 0 && (
          <div className="jpp-kb-empty">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="7" r="4" /><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" />
            </svg>
            <p>{stage.key === "shortlist" ? "New applicants land here" : `No one at ${stage.label} yet`}</p>
            <span>Drag a card here to move them</span>
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

export default function PipelineKanban({ stageBuckets, onMove, onOpen, reduce, headerExtras = {} }) {
  const [draggingId, setDraggingId] = useState(null);
  const [menu, setMenu] = useState(null); // { app, stageKey, rect }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const draggingApp = draggingId
    ? Object.values(stageBuckets).flat().find((a) => a.id === draggingId) || null
    : null;

  const handleDragEnd = useCallback(
    (event) => {
      setDraggingId(null);
      const { active, over } = event;
      if (!over) return;
      const fromStage = active?.data?.current?.stageKey;
      const toStage = over.id;
      if (!toStage || toStage === fromStage) return;
      onMove(active.id, toStage);
    },
    [onMove],
  );

  return (
    <LayoutGroup>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setDraggingId(e.active.id)}
        onDragCancel={() => setDraggingId(null)}
        onDragEnd={handleDragEnd}
      >
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
              headerExtra={headerExtras[stage.key] || null}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={reduce ? null : { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }}>
          {draggingApp ? (
            <div className="jpp-kb-card jpp-kb-card--lifted">
              <div className="jpp-kb-card__top">
                <span className="jpp-kb-card__name">{draggingApp.candidate_name || "Unnamed candidate"}</span>
                <ScoreBadge score={draggingApp.ats_score} source={draggingApp.score_source} />
              </div>
              <div className="jpp-kb-card__meta">
                <span>Applied {fmtDate(draggingApp.applied_at)}</span>
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
          onMove={onMove}
          onClose={() => setMenu(null)}
        />
      )}
    </LayoutGroup>
  );
}
