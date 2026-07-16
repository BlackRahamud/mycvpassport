// =============================================================
// src/components/ui/TopLoadingBar.jsx
//
// A 2px indeterminate hairline pinned to the top edge of the viewport,
// in the portal purple, for the route/data gap that happens before a
// skeleton can render. Belongs to BOTH products (board + portal).
//
//   - Holds ~250ms before showing: most loads finish inside that, and a
//     bar that flashes and vanishes reads as a glitch. Fast looks instant.
//   - On completion it finishes to full then fades, never blinks out, so
//     it feels completed rather than abandoned.
//   - Reduced motion is first class: it appears, holds, and fades, with
//     no travelling sweep.
//
// Drive it with a single `active` boolean (true while the gap is open).
// =============================================================

import { useEffect, useRef, useState } from "react";
import "./topLoadingBar.css";

export default function TopLoadingBar({ active }) {
  const [phase, setPhase] = useState("off"); // off | run | finish
  const holdRef = useRef(null);
  const doneRef = useRef(null);

  useEffect(() => {
    if (active) {
      clearTimeout(doneRef.current);
      // Hold before showing anything — a sub-250ms flash is worse than nothing.
      holdRef.current = setTimeout(() => setPhase("run"), 250);
      return () => clearTimeout(holdRef.current);
    }
    // Deactivating: if the bar never made it past the hold, stay dark; if it
    // was running, finish to full then fade.
    clearTimeout(holdRef.current);
    setPhase((p) => (p === "run" ? "finish" : "off"));
    return undefined;
  }, [active]);

  useEffect(() => {
    if (phase !== "finish") return undefined;
    doneRef.current = setTimeout(() => setPhase("off"), 340);
    return () => clearTimeout(doneRef.current);
  }, [phase]);

  useEffect(
    () => () => {
      clearTimeout(holdRef.current);
      clearTimeout(doneRef.current);
    },
    []
  );

  if (phase === "off") return null;
  return (
    <div className="tlb" aria-hidden="true">
      <div className={`tlb__bar tlb__bar--${phase}`} />
    </div>
  );
}
