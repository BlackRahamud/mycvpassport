import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Apple Watch–style milestone toast: fixed left of FAB, auto-dismiss, CSS-only motion.
 * Styles live in FAB.css (imported by FAB.jsx).
 */
export default function FABMilestonePopup({ message, visible, onDismiss, onExitComplete }) {
  const [inDom, setInDom] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dismissT = useRef(null);

  const clearDismiss = () => {
    if (dismissT.current != null) {
      clearTimeout(dismissT.current);
      dismissT.current = null;
    }
  };

  useEffect(() => {
    if (visible && message) {
      setExiting(false);
      setInDom(true);
      setAnimateIn(false);
      clearDismiss();
      dismissT.current = window.setTimeout(() => onDismiss?.(), 3000);
      return clearDismiss;
    }
    clearDismiss();
    return undefined;
  }, [visible, message, onDismiss]);

  useLayoutEffect(() => {
    if (inDom && !exiting && visible) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [inDom, exiting, visible]);

  useEffect(() => {
    if (!visible && inDom && !exiting) {
      setAnimateIn(false);
      setExiting(true);
      const t = window.setTimeout(() => {
        setInDom(false);
        setExiting(false);
        onExitComplete?.();
      }, 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible, inDom, exiting, onExitComplete]);

  useEffect(() => {
    if (!message) {
      setInDom(false);
      setExiting(false);
      setAnimateIn(false);
    }
  }, [message]);

  if (!inDom || !message) return null;

  const cls = [
    "fab-milestone-popup",
    exiting ? "fab-milestone-popup--out" : "",
    !exiting && animateIn ? "fab-milestone-popup--in" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} role="status" aria-live="polite">
      <span className="fab-milestone-popup__label">Guide</span>
      <p className="fab-milestone-popup__text">{message}</p>
    </div>
  );
}
