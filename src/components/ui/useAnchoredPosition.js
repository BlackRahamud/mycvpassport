import { useEffect, useRef, useState } from "react";
import { computePosition, autoUpdate, offset, flip, shift, size } from "@floating-ui/dom";

/**
 * useAnchoredPosition — shared positioning primitive for anchored menus.
 *
 * Built on the floating-ui/dom package (already in the tree via Tiptap). Fixes the
 * "menu clipped by an ancestor's overflow / card bounds" bug for any
 * dropdown whose menu is rendered in a portal to document.body.
 *
 * While `open`, it keeps the floating element anchored to the reference on
 * scroll/resize (autoUpdate) using:
 *   - offset(gap)  — preserve the existing gap under the trigger
 *   - flip()       — open upward when there's no room below
 *   - shift()      — nudge horizontally to stay on-screen near edges
 *   - size()       — cap max-height to the available space (the menu's own
 *                    overflow-y:auto then scrolls, so no option is ever cut)
 *
 * Returns refs to attach to the trigger + the floating menu, and a
 * `position:fixed` style object to spread onto the menu (React-controlled,
 * so it survives re-renders — no imperative style mutation).
 *
 * Usage:
 *   const { referenceRef, floatingRef, floatingStyle } = useAnchoredPosition({ open });
 *   <button ref={referenceRef} ... />
 *   createPortal(<ul ref={floatingRef} style={floatingStyle}>…</ul>, document.body)
 */
export function useAnchoredPosition({
  open,
  placement = "bottom-start",
  gap = 6,
  padding = 8,
  matchWidth = false,
  maxHeight,
} = {}) {
  const referenceRef = useRef(null);
  const floatingRef = useRef(null);
  const [floatingStyle, setFloatingStyle] = useState({ position: "fixed", top: 0, left: 0 });

  useEffect(() => {
    const ref = referenceRef.current;
    const float = floatingRef.current;
    if (!open || !ref || !float) return undefined;

    const update = () => {
      let sizeData = {};
      computePosition(ref, float, {
        strategy: "fixed",
        placement,
        middleware: [
          offset(gap),
          flip({ padding }),
          shift({ padding }),
          size({
            padding,
            apply({ availableHeight, rects }) {
              sizeData = { availableHeight, refWidth: rects.reference.width };
            },
          }),
        ],
      }).then(({ x, y }) => {
        const next = { position: "fixed", top: y, left: x };
        // Only cap height when a component opts in (Select). Others keep their
        // own CSS max-height / internal scroll, so layout is never changed.
        if (maxHeight != null) {
          const cap = Math.min(maxHeight, sizeData.availableHeight ?? maxHeight);
          if (Number.isFinite(cap)) next.maxHeight = cap;
        }
        if (matchWidth && sizeData.refWidth) next.minWidth = sizeData.refWidth;
        setFloatingStyle(next);
      });
    };

    // autoUpdate runs `update` now and on every scroll/resize/layout shift.
    return autoUpdate(ref, float, update);
  }, [open, placement, gap, padding, matchWidth, maxHeight]);

  return { referenceRef, floatingRef, floatingStyle };
}
