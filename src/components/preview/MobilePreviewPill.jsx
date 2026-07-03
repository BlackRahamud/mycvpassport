import { useEffect, useRef, useState } from "react";
import { A4_W, A4_H } from "../../lib/preview/printSim";
import "./docPreview.css";

const THUMB_W = 34;

/**
 * MobilePreviewPill — persistent, thumb-reachable entry to the full-screen
 * document preview. Shows a LIVE miniature of page 1 (the real paginated
 * render, scaled down) and gives a soft refresh nudge when a debounced
 * edit lands, so the user knows the document moved without a toast.
 */
export default function MobilePreviewPill({ doc, onOpen, reduce = false }) {
  const [nudge, setNudge] = useState(false);
  const firstTick = useRef(true);
  const scale = THUMB_W / A4_W;

  useEffect(() => {
    if (!doc?.tick) return undefined;
    if (firstTick.current) { firstTick.current = false; return undefined; }
    if (reduce) return undefined;
    setNudge(true);
    const t = setTimeout(() => setNudge(false), 650);
    return () => clearTimeout(t);
  }, [doc?.tick, reduce]);

  return (
    <button
      type="button"
      className={`dp-pill${nudge ? " dp-pill--nudge" : ""}`}
      onClick={onOpen}
      aria-label={`Preview your CV${doc?.pageCount ? ` — ${doc.pageCount} page${doc.pageCount > 1 ? "s" : ""}` : ""}`}
    >
      <span className="dp-pill__thumb" aria-hidden="true">
        {doc?.html ? (
          <span
            className="dp-pill__thumb-slice"
            style={{ transform: `scale(${scale})`, width: A4_W, height: A4_H }}
            dangerouslySetInnerHTML={{ __html: doc.html }}
          />
        ) : null}
      </span>
      <span className="dp-pill__label">Preview</span>
      {doc?.pageCount > 1 && <span className="dp-pill__pages">{doc.pageCount}p</span>}
    </button>
  );
}
