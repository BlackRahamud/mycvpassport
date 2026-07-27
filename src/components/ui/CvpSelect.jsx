// =============================================================
// src/components/ui/CvpSelect.jsx
//
// The ONE select control for the corridor fields — Gender, Marital
// status, Visa status, Driving license, Willing to relocate,
// Nationality. Ported from the Claude Design "UI fix pack"; every class
// name and every rule it needs lives in src/index.css (.cvp-select*).
//
//   - Desktop (>767px): a glass popover anchored to the trigger. Click,
//     ↑ ↓, Enter, Esc, outside-click. Flips up (data-placement="top")
//     when the trigger sits near the viewport bottom. Focus returns to
//     the trigger on close.
//   - Mobile (≤767px): a glass bottom sheet, portalled to <body> so it
//     is anchored to the viewport and never to a transformed ancestor.
//     The list is the ONLY scrolling part, and "Not listed? Type your
//     own" is pinned outside it — reachable at any list length — with
//     env(safe-area-inset-bottom) padding under it.
//
// Every field keeps its free-text fallback: an uploaded CV string like
// "Employment visa, transferable" is never dropped or coerced into one
// of the canned options.
// =============================================================

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SHEET_MQ = "(max-width: 767px)";
/* Popover max-height (336px) + the 8px gap. Below this much room the
   popover flips above the trigger instead of below it. */
const FLIP_THRESHOLD = 344;

function ChevronIcon() {
  return (
    <svg className="cvp-select__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg className="cvp-select__tick" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.7" y2="16.7" />
    </svg>
  );
}

/* Sheet on phones, popover everywhere else. Re-evaluated on change so a
   rotate or a resized desktop window swaps variant live. */
function useSheetVariant() {
  const read = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(SHEET_MQ).matches
      : false;
  const [isSheet, setIsSheet] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(SHEET_MQ);
    const onChange = (e) => setIsSheet(e.matches);
    setIsSheet(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);
  return isSheet;
}

export default function CvpSelect({
  label,
  value,
  options = [],
  placeholder = "Select…",
  onChange,
  searchable = false,
  searchPlaceholder,
  customLabel = "Not listed? Type your own",
  customPlaceholder,
  trailing,
  dimmed = false,
  disabled = false,
}) {
  const isSheet = useSheetVariant();
  const uid = useId();
  const labelId = `${uid}-label`;
  const listboxId = `${uid}-listbox`;
  const optionId = (i) => `${uid}-opt-${i}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState("bottom");
  const [atEnd, setAtEnd] = useState(true);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o).toLowerCase().includes(q));
  }, [options, query]);

  const close = useCallback((refocus) => {
    setOpen(false);
    setQuery("");
    setDraft("");
    if (refocus && triggerRef.current) triggerRef.current.focus();
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) return;
    const node = triggerRef.current;
    if (node && !isSheet) {
      const r = node.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setPlacement(below < FLIP_THRESHOLD && r.top > FLIP_THRESHOLD ? "top" : "bottom");
    } else {
      setPlacement("bottom");
    }
    const idx = options.indexOf(value);
    setActiveIndex(idx < 0 ? 0 : idx);
    setQuery("");
    setDraft("");
    setOpen(true);
  }, [disabled, isSheet, options, value]);

  const commit = useCallback(
    (val) => {
      onChange(val);
      setOpen(false);
      setQuery("");
      setDraft("");
      if (triggerRef.current) triggerRef.current.focus();
    },
    [onChange]
  );

  const commitCustom = useCallback(() => {
    const v = String(draft || "").trim();
    if (!v) return;
    commit(v);
  }, [commit, draft]);

  // Move focus into the panel so the keyboard model and the trap both work.
  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => { if (panelRef.current) panelRef.current.focus(); }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Body scroll-lock while the sheet is up — the list owns the scroll.
  useEffect(() => {
    if (!open || !isSheet) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, isSheet]);

  // Keep the active row in view, and keep the "more below" cue honest.
  const measureEnd = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measureEnd();
  }, [open, filtered, measureEnd]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const row = el.querySelector('[data-active="true"]');
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const move = (delta) => {
    if (!filtered.length) return;
    setActiveIndex((cur) => (cur + delta + filtered.length) % filtered.length);
  };

  const onTriggerKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) openPanel();
    }
  };

  const onPanelKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); move(-1); return; }
    if (e.key === "Enter") {
      // The two inputs own their own Enter (search filters, draft commits).
      if (e.target && e.target.tagName === "INPUT") return;
      e.preventDefault();
      const val = filtered[activeIndex];
      if (val !== undefined) commit(val);
      return;
    }
    if (e.key === "Tab") {
      const panel = panelRef.current;
      if (!panel) return;
      const f = Array.from(panel.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.disabled);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const countLabel =
    filtered.length === options.length
      ? `${options.length} option${options.length === 1 ? "" : "s"}`
      : `${filtered.length} of ${options.length}`;

  const search = searchable ? (
    <div className="cvp-select__search">
      <div className="cvp-select__search-box">
        <SearchIcon />
        <input
          type="text"
          placeholder={searchPlaceholder || `Search ${String(label).toLowerCase()}`}
          aria-label={`Search ${String(label).toLowerCase()}`}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
        />
      </div>
    </div>
  ) : null;

  const list = (
    <div className="cvp-select__scroll" data-at-end={atEnd ? "true" : undefined}>
      <ul className="cvp-select__list" id={listboxId} role="listbox" aria-labelledby={labelId} ref={listRef} onScroll={measureEnd}>
        {filtered.length === 0 ? (
          <li className="cvp-select__empty" role="presentation">
            Nothing matches “{query.trim()}”. Type it in below exactly as it reads and it goes on your CV as written.
          </li>
        ) : (
          filtered.map((opt, i) => (
            <li
              key={opt}
              id={optionId(i)}
              className="cvp-select__option"
              role="option"
              aria-selected={opt === value}
              data-active={i === activeIndex ? "true" : undefined}
              onClick={() => commit(opt)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="cvp-select__option-label">{opt}</span>
              {opt === value ? <TickIcon /> : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );

  const custom = (
    <div className="cvp-select__custom">
      <span className="cvp-select__custom-label">{customLabel}</span>
      <div className="cvp-select__custom-row">
        <div className="cvp-select__custom-field">
          <input
            type="text"
            placeholder={customPlaceholder || placeholder}
            aria-label={`Type your own ${String(label).toLowerCase()}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitCustom(); }
            }}
          />
        </div>
        <button type="button" className="cvp-select__custom-btn" disabled={!draft.trim()} onClick={commitCustom}>
          Use this
        </button>
      </div>
    </div>
  );

  const activeDescendant = open && filtered.length ? optionId(activeIndex) : undefined;

  const sheet = (
    <>
      <div className="cvp-select__scrim" data-variant="sheet" role="presentation" onClick={() => close(true)} />
      <div
        className="cvp-select__panel"
        data-variant="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={onPanelKey}
      >
        <div className="cvp-select__grabber" aria-hidden="true"><i /></div>
        <div className="cvp-select__head">
          <p className="cvp-select__title">{label}</p>
          <span className="cvp-select__count">{countLabel}</span>
        </div>
        {search}
        {list}
        {custom}
      </div>
    </>
  );

  const popover = (
    <>
      <div className="cvp-select__scrim" data-variant="popover" role="presentation" onClick={() => close(true)} />
      <div
        className="cvp-select__panel"
        data-variant="popover"
        data-placement={placement}
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={onPanelKey}
      >
        {search}
        {list}
        {custom}
      </div>
    </>
  );

  return (
    <div className="cvp-select">
      {trailing ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 5, minWidth: 0 }}>
          <span className="cvp-select__label" id={labelId} style={{ marginBottom: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          {trailing}
        </div>
      ) : (
        <span className="cvp-select__label" id={labelId}>{label}</span>
      )}

      <button
        type="button"
        className="cvp-select__trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeDescendant}
        disabled={disabled}
        ref={triggerRef}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={onTriggerKey}
        style={dimmed ? { opacity: 0.55 } : undefined}
      >
        <span className="cvp-select__value" data-placeholder={value ? undefined : "true"}>
          {value || placeholder}
        </span>
        <ChevronIcon />
      </button>

      {open && !isSheet ? popover : null}
      {open && isSheet && typeof document !== "undefined" ? createPortal(sheet, document.body) : null}
    </div>
  );
}
