import "./FAB.css";
import { writeFabSeen, PROGRESS_COACH_LABEL_TO_NAV_KEY } from "./FABLogic";

/** Progress coach ring + label colour by completion band */
export function getRingColour(percent) {
  const p = Math.max(0, Math.min(100, percent));
  if (p <= 40) return "#EF4444";
  if (p <= 70) return "#F59E0B";
  if (p < 100) return "#3B82F6";
  return "#22C55E";
}

export function FabSparkIcon({ size = 24, stroke = "#fff" }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", margin: "0 auto" }}>
      <path
        d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PointIcon({ type }) {
  const inner = (() => {
    switch (type) {
      case "edit":
        return <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#fff" strokeWidth="1.2" fill="none" />;
      case "menu":
        return (
          <>
            <circle cx="5" cy="12" r="1" fill="#fff" />
            <circle cx="12" cy="12" r="1" fill="#fff" />
            <circle cx="19" cy="12" r="1" fill="#fff" />
          </>
        );
      case "bolt":
        return <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinejoin="round" />;
      case "plus":
        return (
          <>
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
          </>
        );
      case "filter":
        return <path d="M4 6h16M7 12h10M10 18h4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />;
      case "target":
        return (
          <>
            <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="1.2" fill="none" />
            <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.2" fill="none" />
          </>
        );
      case "paste":
        return <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v0z" stroke="#fff" strokeWidth="1" fill="none" />;
      case "letter":
        return (
          <>
            <path d="M4 4h16v16H4z" stroke="#fff" strokeWidth="1" fill="none" />
            <path d="M4 8l8 5 8-5" stroke="#fff" strokeWidth="1" fill="none" />
          </>
        );
      case "user":
        return (
          <>
            <path d="M20 21a8 8 0 0 0-16 0" stroke="#fff" strokeWidth="1.2" fill="none" />
            <circle cx="12" cy="7" r="4" stroke="#fff" strokeWidth="1.2" fill="none" />
          </>
        );
      default:
        return <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.2" fill="none" />;
    }
  })();
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#1C1C1C",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" aria-hidden>
        {inner}
      </svg>
    </div>
  );
}

function ProgressCoachRing({ percent }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const offset = c - (p / 100) * c;
  const strokeCol = getRingColour(p);
  return (
    <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 12px" }}>
      <svg width={88} height={88} viewBox="0 0 88 88" aria-hidden style={{ display: "block" }}>
        <circle cx={44} cy={44} r={r} fill="none" stroke="#2A2A2A" strokeWidth={8} />
        <circle
          cx={44}
          cy={44}
          r={r}
          fill="none"
          stroke={strokeCol}
          strokeWidth={8}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          fontWeight: 600,
          color: strokeCol,
        }}
      >
        {p}%
      </div>
    </div>
  );
}

/**
 * Bottom sheet: overlay + panel (slide-up via keyframes only)
 */
export default function FABSheet({
  open,
  onClose,
  title,
  points,
  tabStorageKey,
  onGotIt,
  proCtaLabel,
  onProCta,
  zOverlay = 200,
  zSheet = 201,
  showCoachPanels = true,
  showProgressCoach = true,
  showDownloadGatekeeper = true,
  progressCoach = null,
  downloadGatekeeper = null,
  onProgressCoachNavigate,
  onNavigateAuth,
  onNavigatePricing,
  sheetBodySlot = null,
  sheetFooterSlot = null,
  showGotItButton = true,
}) {
  if (!open) return null;

  const handleGotIt = () => {
    if (tabStorageKey) writeFabSeen(tabStorageKey);
    onGotIt?.();
    onClose();
  };

  const handlePro = () => {
    if (tabStorageKey === "ats") writeFabSeen("ats");
    onProCta?.();
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        className="cvp-fab-layer cvp-fab-sheet-overlay"
        style={{ zIndex: zOverlay }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="cvp-fab-layer cvp-fab-sheet-panel"
        style={{ zIndex: zSheet }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`cvp-fab-sheet-scroll${showGotItButton ? "" : " cvp-fab-sheet-scroll--no-sticky-footer"}`}
        >
          <FabSparkIcon size={24} stroke="#fff" />
          <div
            style={{
              color: "var(--text-primary, #FFF)",
              fontSize: 16,
              fontWeight: 500,
              marginTop: 12,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {title}
          </div>

          {sheetBodySlot ? (
            <div style={{ width: "100%", marginBottom: 16 }}>{sheetBodySlot}</div>
          ) : null}

          {showCoachPanels && showProgressCoach && !sheetBodySlot ? (
          <div
            style={{
              width: "100%",
              marginBottom: 16,
              padding: 14,
              boxSizing: "border-box",
              borderRadius: 12,
              background: "var(--bg-elevated, #1C1C1C)",
              border: "1px solid var(--border-default, #2A2A2A)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary, #A0A0A0)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, textAlign: "center" }}>
              Progress coach
            </div>
            {progressCoach && !progressCoach.hasCV ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", textAlign: "center", lineHeight: 1.45 }}>
                Start your CV to see progress
              </p>
            ) : progressCoach ? (
              <>
                <ProgressCoachRing percent={progressCoach.completionPercent} />
                <div style={{ fontSize: 12, color: "var(--text-secondary, #A0A0A0)", textAlign: "center", marginBottom: 10 }}>
                  {progressCoach.completedSections}/{progressCoach.totalSections} sections complete
                </div>
                {progressCoach.missingSections.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {progressCoach.missingSections.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          const key = PROGRESS_COACH_LABEL_TO_NAV_KEY[label];
                          if (key) onProgressCoachNavigate?.(key);
                          // TODO: deep-link optional sections (certifications, projects) when Progress Coach lists them
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          border: "1px solid var(--border-default, #2A2A2A)",
                          background: "var(--bg-surface, #141414)",
                          color: "var(--text-primary, #FFF)",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: onProgressCoachNavigate ? "pointer" : "default",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", textAlign: "center" }}>All tracked sections look good.</p>
                )}
              </>
            ) : null}
          </div>
        ) : null}

        {showDownloadGatekeeper && !sheetBodySlot ? (
          <div
            style={{
              width: "100%",
              marginBottom: 16,
              padding: 14,
              boxSizing: "border-box",
              borderRadius: 12,
              background: "var(--bg-elevated, #1C1C1C)",
              border: "1px solid var(--border-default, #2A2A2A)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary, #A0A0A0)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, textAlign: "center" }}>
              Download gatekeeper
            </div>
            {downloadGatekeeper == null ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", textAlign: "center" }}>Checking download status…</p>
            ) : (
              <>
                {downloadGatekeeper.isPaidUser ? (
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "var(--bg-surface, #141414)",
                        border: "1px solid var(--border-default, #2A2A2A)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-primary, #FFF)",
                      }}
                    >
                      {downloadGatekeeper.planName}
                    </span>
                  </div>
                ) : null}
                {downloadGatekeeper.canDownload ? (
                  <>
                    <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 500, color: "var(--text-primary, #FFF)", textAlign: "center" }}>You&apos;re clear to download</p>
                    <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary, #A0A0A0)" }}>
                      {Number.isFinite(downloadGatekeeper.downloadsLimit) ? (
                        <span>
                          {downloadGatekeeper.downloadsUsed}/{downloadGatekeeper.downloadsLimit} downloads used
                        </span>
                      ) : (
                        <span>Unlimited downloads</span>
                      )}
                    </div>
                  </>
                ) : null}
                {downloadGatekeeper.blockerReason === "limit_reached" ? (
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45 }}>
                      You&apos;ve used your free downloads. Upgrade for unlimited PDFs.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigatePricing?.()}
                      style={{
                        background: "var(--text-primary, #FFF)",
                        color: "#000",
                        borderRadius: 10,
                        padding: "10px 14px",
                        width: "100%",
                        fontWeight: 600,
                        fontSize: 13,
                        border: "1px solid var(--border-default, #2A2A2A)",
                        cursor: "pointer",
                        minHeight: 44,
                      }}
                    >
                      Upgrade to Active Hunter — AED 29/mo
                    </button>
                  </div>
                ) : null}
                {downloadGatekeeper.blockerReason === "not_signed_in" ? (
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45 }}>
                      Sign in to continue downloading
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigateAuth?.()}
                      style={{
                        background: "var(--text-primary, #FFF)",
                        color: "#000",
                        borderRadius: 10,
                        padding: "10px 14px",
                        width: "100%",
                        fontWeight: 600,
                        fontSize: 13,
                        border: "1px solid var(--border-default, #2A2A2A)",
                        cursor: "pointer",
                        minHeight: 44,
                      }}
                    >
                      Sign in
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

          <div>
            {!sheetBodySlot && points.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 10,
                  alignItems: "flex-start",
                }}
              >
                <PointIcon type={row.icon} />
                <span style={{ color: "var(--text-secondary, #A0A0A0)", fontSize: 13, lineHeight: 1.45, flex: 1 }}>{row.text}</span>
              </div>
            ))}
          </div>
          {sheetFooterSlot}
          {proCtaLabel && onProCta ? (
            <button
              type="button"
              onClick={handlePro}
              style={{
                background: "#fff",
                color: "#000",
                borderRadius: 10,
                padding: 12,
                width: "100%",
                fontWeight: 500,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                marginTop: 8,
                minHeight: 44,
              }}
            >
              {proCtaLabel}
            </button>
          ) : null}
        </div>
        {showGotItButton ? (
          <div className="cvp-fab-sheet-gotit-bar">
            <button
              type="button"
              onClick={handleGotIt}
              style={{
                background: "#fff",
                color: "#000",
                borderRadius: 10,
                padding: 12,
                width: "100%",
                fontWeight: 500,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                marginTop: 0,
                minHeight: 44,
              }}
            >
              Got it
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
