import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { A4_W, A4_H } from "../../lib/preview/printSim";
import "./docPreview.css";

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2.6;
const ZOOM_STEP = 0.15;

const ZoomOutIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
);
const ZoomInIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" /></svg>
);
const FitIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
);

/**
 * DocumentSheets — the paginated A4 document surface. Renders the print
 * simulation's HTML as true A4 sheets (white paper, soft shadow, the same
 * "Page x of y" folio Puppeteer prints in the bottom margin) on a calm
 * token-driven stage, with the CV viewer's toolbar vocabulary: fit-width
 * default, ± zoom, keyboard +/−/0.
 *
 * mode="panel"  — desktop split-view column
 * mode="overlay" — mobile full-screen (adds pinch-to-zoom + double-tap)
 */
export default function DocumentSheets({
  doc,
  pulse,
  mode = "panel",
  reduce = false,
  resetScrollKey,
  onSectionHold,
  toolbarExtra = null,
}) {
  const stageRef = useRef(null);
  const [fitScale, setFitScale] = useState(null);
  const [scale, setScale] = useState(null); // null = fit-width
  const [pageInView, setPageInView] = useState(1);
  const hoverRef = useRef(false);

  const pageCount = doc?.pageCount || 1;
  const geo = useMemo(
    () => doc?.geo || { topOffset: 37.8, usable: A4_H - 94.5 },
    [doc?.geo],
  );
  const z = scale ?? fitScale ?? 0.5;
  const zoomPct = Math.round(z * 100);

  /* fit-width from stage size */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const pad = mode === "overlay" ? 12 : 28;
    const apply = (w) => {
      if (!w || w < 40) return;
      const f = Math.min(Math.max((w - pad * 2) / A4_W, 0.15), 1.6);
      // Hysteresis wide enough to swallow a classic-scrollbar width
      // (~15px ≈ 0.019 of A4) — belt to scrollbar-gutter's braces, so a
      // gutter toggle can never oscillate the fit scale.
      setFitScale((prev) => (prev != null && Math.abs(prev - f) < 0.02 ? prev : f));
    };
    const ro = new ResizeObserver((entries) => apply(entries[0]?.contentRect?.width));
    ro.observe(el);
    apply(el.clientWidth);
    return () => ro.disconnect();
  }, [mode]);

  /* template switch → back to top, fit */
  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTo(0, 0);
    setScale(null);
  }, [resetScrollKey]);

  /* page indicator */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || pageCount < 1) return undefined;
    const sheets = Array.from(stage.querySelectorAll("[data-dp-page]"));
    if (!sheets.length) return undefined;
    const visible = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => visible.set(en.target, en.intersectionRatio));
        let best = null;
        let bestRatio = 0;
        visible.forEach((ratio, node) => {
          if (ratio > bestRatio) { bestRatio = ratio; best = node; }
        });
        if (best) setPageInView(Number(best.getAttribute("data-dp-page")));
      },
      { root: stage, threshold: [0.15, 0.4, 0.7] },
    );
    sheets.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pageCount, doc?.tick, z]);

  const zoomBy = useCallback((dir) => {
    setScale((s) => {
      const cur = s ?? fitScale ?? 1;
      return Math.min(Math.max(cur + dir * ZOOM_STEP, ZOOM_MIN), ZOOM_MAX);
    });
  }, [fitScale]);

  /* keyboard +/−/0 — never while the user is typing in a form field */
  useEffect(() => {
    const onKey = (e) => {
      if (mode !== "overlay" && !hoverRef.current) return;
      const t = e.target;
      if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomBy(1); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomBy(-1); }
      else if (e.key === "0") { e.preventDefault(); setScale(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, zoomBy]);

  /* ── overlay gestures: pinch + double-tap ─────────────────────── */
  const pointers = useRef(new Map());
  const pinchBase = useRef(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  const onPointerDown = (e) => {
    if (mode !== "overlay" || e.pointerType !== "touch") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchBase.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: z,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    }
  };
  const onPointerMove = (e) => {
    if (mode !== "overlay" || e.pointerType !== "touch") return;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchBase.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0 && pinchBase.current.dist > 0) {
        const next = Math.min(
          Math.max(pinchBase.current.scale * (dist / pinchBase.current.dist), ZOOM_MIN),
          ZOOM_MAX,
        );
        const stage = stageRef.current;
        if (stage) {
          const ratio = next / (scale ?? fitScale ?? 1);
          if (Number.isFinite(ratio) && ratio !== 1) {
            stage.scrollLeft = (stage.scrollLeft + pinchBase.current.midX) * ratio - pinchBase.current.midX;
            stage.scrollTop = (stage.scrollTop + pinchBase.current.midY) * ratio - pinchBase.current.midY;
          }
        }
        setScale(next);
      }
    }
  };
  const onPointerUpOrCancel = (e) => {
    if (mode !== "overlay" || e.pointerType !== "touch") return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchBase.current = null;
    // double-tap: toggle fit ↔ 1.35, single-finger taps only
    if (e.type === "pointerup" && pointers.current.size === 0) {
      const now = Date.now();
      const { t, x, y } = lastTap.current;
      if (now - t < 300 && Math.hypot(e.clientX - x, e.clientY - y) < 32) {
        setScale((s) => (s == null || Math.abs(s - (fitScale ?? 1)) < 0.01 ? 1.35 : null));
        lastTap.current = { t: 0, x: 0, y: 0 };
      } else {
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }
    }
  };

  /* two-finger moves must not scroll the stage while pinching */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || mode !== "overlay") return undefined;
    const onTouchMove = (e) => { if (e.touches.length > 1) e.preventDefault(); };
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => stage.removeEventListener("touchmove", onTouchMove);
  }, [mode]);

  /* ── long-press a section → jump to its form card (mobile flow) ── */
  const holdTimer = useRef(null);
  const holdMoved = useRef(false);
  const onHoldStart = (e) => {
    if (!onSectionHold) return;
    holdMoved.current = false;
    const target = e.target.closest("[data-section]");
    if (!target) return;
    holdTimer.current = setTimeout(() => {
      if (!holdMoved.current) onSectionHold(target.getAttribute("data-section"));
    }, 500);
  };
  const onHoldMove = () => {
    holdMoved.current = true;
    clearTimeout(holdTimer.current);
  };
  const onHoldEnd = () => clearTimeout(holdTimer.current);

  /* pulse band geometry */
  const contentScale = geo.contentScale || 1;

  const pulseBand = useMemo(() => {
    if (!pulse || reduce || !doc?.sectionRects) return null;
    const rect = doc.sectionRects[pulse.group];
    if (!rect) return null;
    const cs = geo.contentScale || 1;
    const page = Math.max(0, Math.floor(rect.y / geo.usable));
    const within = rect.y - page * geo.usable;
    return {
      page: page + 1,
      top: geo.topOffset + within * cs,
      height: Math.max(18, Math.min(rect.h, geo.usable - within) * cs),
      key: pulse.tick,
    };
  }, [pulse, doc, geo, reduce]);

  const sheets = [];
  for (let k = 0; k < pageCount; k += 1) {
    sheets.push(
      <div
        key={k}
        className="dp-sheetbox"
        data-dp-page={k + 1}
        style={{ width: A4_W * z, height: A4_H * z }}
      >
        <div className="dp-sheet" style={{ transform: `scale(${z})` }}>
          <div
            className="dp-clip"
            style={{
              top: geo.topOffset,
              left: geo.sideOffset || 0,
              right: geo.sideOffset || 0,
              height: geo.usable * contentScale,
            }}
          >
            {doc?.html ? (
              <div
                className="dp-slice"
                // Right-to-left composition: shift to the page's slice in
                // layout px, then apply the print shrink-to-fit scale (T11).
                style={{ transform: `scale(${contentScale}) translateY(${-k * geo.usable}px)` }}
                // The print simulation's own HTML — same DOM the PDF prints.
                dangerouslySetInnerHTML={{ __html: doc.html }}
              />
            ) : null}
          </div>
          {pulseBand && pulseBand.page === k + 1 && (
            <div
              key={pulseBand.key}
              className="dp-pulse"
              style={{ top: pulseBand.top, height: pulseBand.height }}
              aria-hidden="true"
            />
          )}
          <div className="dp-folio" aria-hidden="true">
            Page <span>{k + 1}</span> of <span>{pageCount}</span>
          </div>
        </div>
      </div>,
    );
  }

  return (
    <div
      className={`dp-root dp-root--${mode}`}
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      <div className="dp-toolbar">
        <span className="dp-toolbar__pages" aria-live="polite">
          Page {Math.min(pageInView, pageCount)} / {pageCount}
        </span>
        <span className="dp-toolbar__zoom">
          <button type="button" className="dp-tool" onClick={() => zoomBy(-1)} aria-label="Zoom out"><ZoomOutIc /></button>
          <span className="dp-toolbar__pct">{zoomPct}%</span>
          <button type="button" className="dp-tool" onClick={() => zoomBy(1)} aria-label="Zoom in"><ZoomInIc /></button>
          <button type="button" className="dp-tool" onClick={() => setScale(null)} aria-label="Fit to width"><FitIc /></button>
        </span>
        {toolbarExtra}
      </div>
      <div
        className="dp-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
        onTouchStart={onSectionHold ? onHoldStart : undefined}
        onTouchMove={onSectionHold ? onHoldMove : undefined}
        onTouchEnd={onSectionHold ? onHoldEnd : undefined}
      >
        <div className="dp-pages">
          {doc?.html ? sheets : (
            <div className="dp-sheetbox" style={{ width: A4_W * z, height: A4_H * z }}>
              <div className="dp-sheet dp-sheet--loading" style={{ transform: `scale(${z})` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
