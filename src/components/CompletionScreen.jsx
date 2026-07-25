// CompletionScreen — the post-download boarding pass, ported from the
// design project's `Cleared Boarding Pass.dc.html` (light passport system).
//
// The CV has cleared and been downloaded; this is the exit gate. Real data
// only: the holder's name, the template they used, their ATS score, and
// their real remaining downloads. The one forward action is in-tool
// ("Boost my ATS score") — this screen never sends anyone to a third party
// job board.
//
// The Boarding Soon card is the demand capture for the CVPassport Job
// Board. "Save my seat" writes a REAL row (public.job_board_waitlist,
// migration 052) — the opted-in state only shows after that write lands.
// The three listings inside it are clearly labelled sample roles: no live
// employers are enrolled yet, so nothing there is applyable.

import { useCallback, useEffect, useRef, useState } from "react";
import { isPrerender } from "../lib/prerender";
import { getEntitlements } from "../services/entitlements";
import { joinJobBoardWaitlist, isValidEmail } from "../lib/waitlist";
import {
  trackWaitlistJoined,
  trackBoostScoreClicked,
  trackShareClicked,
  trackSupportClicked,
} from "../lib/analytics/launchOfferEvents";
import "./boardingPass.css";

// Ziina — the sole gateway. TODO(founder): this coffee link is still the
// only payment URL living outside src/utils/paywall.js (pending item #2:
// "Coffee payment link — add to Ziina + paywall.js"). Carried over from the
// previous version of this screen unchanged.
const SUPPORT_URL = "https://pay.ziina.com/mycvpassport/WNqwzohwg";
const SHARE_URL = "https://mycvpassport.com";
const SHARE_TEXT = "My CV just cleared the ATS check on CVPassport — mycvpassport.com";

const MARKET_LABELS = [
  { id: "india", label: "India" },
  { id: "gulf", label: "Gulf" },
  { id: "both", label: "Both" },
];

// Sample roles — a preview of what the board will look like. Deliberately
// not live listings: no real employer is enrolled, so there is no status,
// no apply action, and the card carries a "Sample roles · preview" tag.
const SAMPLE_ROLES = [
  {
    tag: "NS", employer: "Nexa Systems", logo: "var(--text-primary)",
    title: "IT Support Analyst L2", salary: "4,000 to 7,000 AED per month",
    place: "Dubai, UAE", posted: "Posted 1 week ago", visa: false,
  },
  {
    tag: "TU", employer: "TalentBridge UAE", logo: "var(--amber-deep)",
    title: "IT support L1", salary: "5,000 to 6,000 AED per month",
    place: "Abu Dhabi", posted: "Posted last month", visa: true,
  },
  {
    tag: "TI", employer: "TalentBridge India", logo: "var(--accent-hover)",
    title: "Supply Chain Lead", salary: "₹75,000 per month",
    place: "Mumbai, India", posted: "Posted this week", visa: false,
  },
];

const FLAPS = [0.9, 0.55, 0.35, 0.8, 0.45, 0.7, 0.3];

function stampDate(now) {
  const d = now || new Date();
  return `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en", { month: "short" }).toUpperCase()} ${d.getFullYear()}`;
}

export default function CompletionScreen({
  atsScore,
  userName,
  templateName,
  downloadsUsed,
  downloadsTotal,
  user,
  onDashboard,
  onBoost,
}) {
  const score = Math.max(0, Math.min(100, Math.round(Number(atsScore) || 0)));
  const name = String(userName || "").trim() || "Your name";
  const firstName = name.split(/\s+/)[0] || "You";
  const template = String(templateName || "").trim() || "your";

  // Downloads counter is real. Props win; when the caller does not pass
  // them we read the same entitlements the server enforces.
  const [ent, setEnt] = useState(null);
  useEffect(() => {
    if (downloadsTotal != null && downloadsUsed != null) return undefined;
    let alive = true;
    getEntitlements()
      .then((e) => { if (alive) setEnt(e); })
      .catch(() => { /* counter falls back to the free plan shape */ });
    return () => { alive = false; };
  }, [downloadsTotal, downloadsUsed]);

  const rawLimit = downloadsTotal != null ? Number(downloadsTotal) : ent?.downloadsLimit;
  const unlimited = rawLimit != null && !Number.isFinite(rawLimit);
  const total = unlimited ? 0 : Math.max(1, Math.round(Number(rawLimit) || 3));
  const rawUsed = downloadsUsed != null
    ? Number(downloadsUsed)
    : (ent && Number.isFinite(ent.downloadsLeft) ? total - ent.downloadsLeft : 0);
  const used = unlimited ? 0 : Math.max(0, Math.min(Math.round(rawUsed) || 0, total));
  const left = unlimited ? Infinity : total - used;

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(null); // null | 'ok' | 'fail'
  const copyTimer = useRef(0);

  // Waitlist: idle → picking → saving → saved | error
  const accountEmail = (user && user.email) || "";
  const [seatState, setSeatState] = useState("idle");
  const [market, setMarket] = useState(null);
  const [email, setEmail] = useState(accountEmail);
  const [seatError, setSeatError] = useState("");

  const ctaRef = useRef(null);
  useEffect(() => {
    if (isPrerender()) return;
    ctaRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => { setEmail((e) => e || accountEmail); }, [accountEmail]);

  const share = useCallback((channel) => {
    trackShareClicked(channel);
    // Synchronous — never window.open after an await (popup blockers).
    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`, "_blank", "noopener");
      setShareOpen(false);
      return;
    }
    if (channel === "linkedin") {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
        "_blank",
        "noopener",
      );
      setShareOpen(false);
      return;
    }
    // Clipboard writes REJECT when the permission is denied (Safari, some
    // embedded webviews). Never claim "copied" until the write resolves —
    // and never leave the rejection unhandled.
    const flash = (state) => {
      setCopied(state);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    };
    let p = null;
    try { p = navigator.clipboard?.writeText(SHARE_URL); } catch (e) { p = null; }
    if (p && typeof p.then === 'function') {
      p.then(() => flash('ok')).catch(() => flash('fail'));
    } else {
      flash('fail');
    }
  }, []);

  const saveSeat = useCallback(async () => {
    const chosen = market;
    const addr = String(email || "").trim();
    if (!chosen) { setSeatError("Pick where you want roles first."); return; }
    if (!isValidEmail(addr)) { setSeatError("That email does not look right."); return; }

    setSeatError("");
    setSeatState("saving");
    const res = await joinJobBoardWaitlist({
      email: addr,
      market: chosen,
      source: "boarding_pass",
      userId: (user && user.id) || null,
    });
    if (res.ok) {
      trackWaitlistJoined(chosen);
      setSeatState("saved");
      return;
    }
    // Honest failure — the seat is NOT saved, so never show the saved state.
    setSeatState("picking");
    setSeatError(
      res.reason === "invalid_email"
        ? "That email does not look right."
        : "That did not save. Check your connection and try again.",
    );
  }, [market, email, user]);

  const boost = useCallback(() => {
    trackBoostScoreClicked();
    onBoost?.();
  }, [onBoost]);

  return (
    <div className="bpx-root" role="dialog" aria-label="Your CV is cleared and downloaded">
      <div className="bpx-pass">
        <div className="bpx-main">
          <div className="bpx-guilloche" aria-hidden="true" />

          <div className="bpx-head">
            <div className="bpx-brand">
              <Chevrons />
              <b>CVPassport</b>
            </div>
            <span className="bpx-eyebrow">Exit clearance</span>
          </div>

          <div className="bpx-hero">
            <div className="bpx-hero-text">
              <h2 className="bpx-title">
                {firstName}, you’re cleared.<br />Go get the job.
              </h2>
              <p className="bpx-sub">
                {`Saved to your device. ATS ${score} on the ${template} template. Your CV is ready to send.`}
              </p>
            </div>
            <div role="img" aria-label="Cleared stamp" className="bpx-stamp">
              <b>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2.5 7.2L5.4 10L11.5 4" stroke="var(--success-text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                CLEARED
              </b>
              <span>{stampDate()}</span>
            </div>
          </div>

          <div className="bpx-fields">
            {[
              { label: "Holder", value: name },
              { label: "Document", value: `${templateName || "CV"} PDF` },
              { label: "Route", value: "India & the Gulf" },
              { label: "Valid", value: "This version", quiet: true },
            ].map((f) => (
              <div key={f.label} style={{ minWidth: 0 }}>
                <p className="bpx-field-label">{f.label}</p>
                <p className="bpx-field-value" style={f.quiet ? { color: "var(--text-secondary)" } : undefined}>
                  {f.value}
                </p>
              </div>
            ))}
          </div>

          <div className="bpx-actions">
            <button type="button" ref={ctaRef} className="bpx-cta" onClick={boost}>
              <b>Boost my ATS score →</b>
              <i aria-hidden="true" />
            </button>

            <div className="bpx-row">
              <button
                type="button"
                className="bpx-ghost"
                aria-haspopup="true"
                aria-expanded={shareOpen}
                onClick={() => setShareOpen((v) => !v)}
              >
                {copied === 'ok' ? "Link copied ✓" : copied === 'fail' ? "Copy mycvpassport.com" : "Share my CV"}
              </button>
              <button type="button" className="bpx-ghost bpx-ghost--quiet" onClick={onDashboard}>
                Back to dashboard
              </button>
            </div>

            {shareOpen ? (
              <div className="bpx-share">
                <button type="button" onClick={() => share("whatsapp")}>WhatsApp</button>
                <button type="button" onClick={() => share("linkedin")}>LinkedIn</button>
                <button type="button" onClick={() => share("copy")}>
                  {copied === 'ok' ? "Copied ✓" : copied === 'fail' ? "Copy blocked" : "Copy link"}
                </button>
              </div>
            ) : null}
          </div>

          {/* ── Boarding soon: the job board demand capture ───────────── */}
          <div className="bpx-board">
            <div className="bpx-board-wash" aria-hidden="true" />
            <div className="bpx-board-hatch" aria-hidden="true" />

            <div className="bpx-board-inner">
              <div className="bpx-board-top">
                <p className="bpx-board-eyebrow">
                  <span aria-hidden="true" style={{ fontSize: 11 }}>🛂</span>
                  Boarding soon
                </p>
                <div className="bpx-flaps" aria-hidden="true">
                  {FLAPS.map((o, i) => <i key={i} style={{ opacity: o }} />)}
                  <span className="bpx-gate">{`GATE ${String(score).padStart(2, "0")}`}</span>
                </div>
              </div>

              <p className="bpx-board-title">The CVPassport Job Board</p>
              <p className="bpx-board-body">
                India &amp; Gulf roles, matched to your ATS-ready CV, all in one place.
                We’re building it now.
              </p>

              <div className="bpx-preview" aria-hidden="true">
                <div className="bpx-preview-head">
                  <span className="bpx-preview-tag">Sample roles · preview</span>
                </div>
                <div className="bpx-preview-list">
                  {SAMPLE_ROLES.map((r) => (
                    <div key={r.tag} className="bpx-job">
                      <div className="bpx-job-top">
                        <span className="bpx-job-logo" style={{ background: r.logo }}>{r.tag}</span>
                        <span className="bpx-job-employer">{r.employer}</span>
                      </div>
                      <p className="bpx-job-title">{r.title}</p>
                      <div className="bpx-job-meta">
                        {r.visa ? (
                          <span className="bpx-visa">
                            <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
                              <path d="M2.5 7.2L5.4 10L11.5 4" stroke="var(--success-text)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Visa sponsored
                          </span>
                        ) : null}
                        <span className="bpx-job-salary">{r.salary}</span>
                        <span className="bpx-job-place">{r.place}</span>
                        <span className="bpx-job-posted">{r.posted}</span>
                      </div>
                      <span className="bpx-job-apply">Apply</span>
                    </div>
                  ))}
                </div>
              </div>

              {seatState === "saved" ? (
                <div className="bpx-seated">
                  <span className="bpx-seated-icon" aria-hidden="true">✈️</span>
                  <div style={{ minWidth: 0 }}>
                    <b>You’re on the list.</b>
                    <span>We’ll email you the moment it opens.</span>
                  </div>
                  <span className="bpx-seat-no" aria-hidden="true">
                    <i>SEAT</i>
                    <b>{String(1000 + score).slice(-3)}</b>
                  </span>
                </div>
              ) : seatState === "idle" ? (
                <button type="button" className="bpx-seat-cta" onClick={() => setSeatState("picking")}>
                  Save my seat, notify me →
                </button>
              ) : (
                <div className="bpx-seat-form">
                  <p className="bpx-seat-q">Where do you want roles?</p>
                  <div className="bpx-markets">
                    {MARKET_LABELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="bpx-market"
                        aria-pressed={market === m.id}
                        onClick={() => { setMarket(m.id); setSeatError(""); }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {accountEmail ? null : (
                    <input
                      className="bpx-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@email.com"
                      aria-label="Email for the job board waitlist"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setSeatError(""); }}
                    />
                  )}

                  <button
                    type="button"
                    className="bpx-seat-cta"
                    disabled={seatState === "saving"}
                    onClick={saveSeat}
                  >
                    {seatState === "saving" ? "Saving your seat…" : "Save my seat, notify me →"}
                  </button>

                  <p className={`bpx-seat-note${seatError ? " bpx-seat-note--error" : ""}`}>
                    {seatError || (accountEmail
                      ? `We’ll email ${accountEmail} when the board opens.`
                      : "One email when the board opens. Nothing else.")}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bpx-foot">
            <a
              className="bpx-support"
              href={SUPPORT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={trackSupportClicked}
            >
              <i aria-hidden="true">♥</i>
              Support the build, keep it free
            </a>
            <p className="bpx-solo">Built solo in Dubai</p>
          </div>
        </div>

        <div className="bpx-stub">
          <span className="bpx-notch bpx-notch--a" aria-hidden="true" />
          <span className="bpx-notch bpx-notch--b" aria-hidden="true" />

          <div style={{ minWidth: 0 }}>
            <p className="bpx-field-label">Downloads used</p>
            <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
              {unlimited ? null : (
                <div className="bpx-dots" aria-hidden="true">
                  {Array.from({ length: total }, (_, i) => (
                    <i key={i} className={i < used ? "on" : undefined} />
                  ))}
                </div>
              )}
              <span className="bpx-used">{unlimited ? "Unlimited" : `${used} of ${total}`}</span>
            </div>
            <p className={`bpx-left${!unlimited && left <= 1 ? " bpx-left--low" : ""}`}>
              {unlimited
                ? "Unlimited downloads on your plan"
                : left <= 0
                  ? "No downloads left this month. Upgrade for unlimited."
                  : `${left} download${left === 1 ? "" : "s"} left this month`}
            </p>
          </div>

          <div className="bpx-stub-score">
            <div style={{ textAlign: "right" }}>
              <p className="bpx-field-label">ATS</p>
              <p>{score}</p>
            </div>
            <div className="bpx-barcode" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    width: (i * 7 + score) % 3 === 0 ? 3 : 1.5,
                    opacity: i % 4 === 0 ? 0.9 : i % 3 === 0 ? 0.45 : 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chevrons() {
  return (
    <svg width="27" height="18" viewBox="0 0 34 40" fill="none" aria-hidden="true">
      <path d="M 4 28 L 12 20 L 4 12" stroke="var(--text-primary)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 12 28 L 20 20 L 12 12" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 20 28 L 28 20 L 20 12" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}
