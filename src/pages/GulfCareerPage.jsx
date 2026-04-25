/* ═══════════════════════════════════════════════════════════════════════════
   src/pages/GulfCareerPage.jsx
   CVPassport · /gulf-career — Gulf Career Intelligence (4-act flow)

   Ported from the design export at .design-temp/{app,act1-intake,act234-report,
   styles,data}.* — see design README. Native Canvas API for 1080×1080 share
   PNG export (no html2canvas dep). Supabase persistence is best-effort: if the
   gulf_reports table is missing or the call fails, the report still renders;
   only the shareable /gulf/:id link breaks.

   View-by-id is served by the same component via the optional :reportId URL
   param. When present, we skip intake/curtain/flash and render the persisted
   report with a "Generate Yours" CTA pinned to the top.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  INDUSTRIES, CITIES, TIERS, KEYWORDS,
  compute, fmtAED, fmtK, genReportId,
} from "../lib/gulfData";
import { supabase } from "../supabaseClient";

const NOTICE_OPTIONS = [
  { id: "immediate", label: "Immediate", sub: "Ready now" },
  { id: "30",        label: "30 days",   sub: "1 month" },
  { id: "60",        label: "60 days",   sub: "2 months" },
  { id: "90",        label: "90 days",   sub: "3+ months" },
];

const FRESH_OPTIONS = [
  { id: "0_3m",    label: "Last 3 months", sub: "Fresh" },
  { id: "3_12m",   label: "3–12 months",   sub: "Stale-ish" },
  { id: "1y_plus", label: "Over a year",   sub: "Old" },
  { id: "never",   label: "Never updated", sub: "Default CV" },
];

const STATUS_OPTIONS = [
  { id: "india",   label: "🇮🇳 In India, eyeing the Gulf", sub: "Aspirant" },
  { id: "in_gulf", label: "🇦🇪 Already in the Gulf",       sub: "On-ground" },
];

const YEAR_BUCKETS = [
  { key: 1,  label: "0–1y",  range: "Junior" },
  { key: 4,  label: "2–5y",  range: "Mid" },
  { key: 8,  label: "6–10y", range: "Senior" },
  { key: 14, label: "10y+",  range: "Lead+" },
];

const REFINE_CERTS = [
  { id: "pmp",    label: "PMP" },           { id: "aws",  label: "AWS Certified" },
  { id: "cipd",   label: "CIPD L7" },       { id: "acca", label: "ACCA" },
  { id: "cfa",    label: "CFA" },           { id: "nebosh", label: "NEBOSH IGC" },
  { id: "dha",    label: "DHA / DOH" },     { id: "cips", label: "CIPS" },
  { id: "cissp",  label: "CISSP" },
];

const EMPTY_STATE = {
  status: "",
  industry: "",
  experience: 4,
  currentSalary: "",
  currency: "inr",
  notice: "",
  cvFresh: "",
  topSkill: "",
  exactTitle: "",
  city: "dubai_marina",
  family: "single",
  certs: {},
};

/* ── Supabase helpers (best-effort) ────────────────────────────── */

async function saveReport({ id, email, state, result }) {
  try {
    const { error } = await supabase.from("gulf_reports").insert({
      id, email,
      state, result,
    });
    if (error) {
      console.warn("[gulf] saveReport failed:", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[gulf] saveReport threw:", e?.message || e);
    return { ok: false };
  }
}

async function loadReport(id) {
  try {
    const { data, error } = await supabase
      .from("gulf_reports")
      .select("id, email, state, result, created_at")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/* ── Helper components ─────────────────────────────────────────── */

function CommandPalette({ open, onClose, items, onPick, placeholder }) {
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );
  const safeCur = Math.min(cur, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (open) {
      setQ("");
      setCur(0);
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCur((c) => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCur((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { const it = filtered[safeCur]; if (it) onPick(it); }
  };

  return (
    <div
      className={`gci-overlay${open ? " is-open" : ""}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="gci-palette" role="dialog">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setCur(0); }}
          onKeyDown={onKey}
          placeholder={placeholder || "Search…"}
          autoComplete="off"
        />
        <ul>
          {filtered.length === 0 ? (
            <li style={{ color: "#666" }}>No match.</li>
          ) : filtered.map((it, i) => (
            <li
              key={it.id}
              className={i === safeCur ? "is-sel" : ""}
              onMouseEnter={() => setCur(i)}
              onClick={() => onPick(it)}
            >
              <span className="gci-ri">{it.icon}</span>
              <span>{it.name}</span>
              {it.hint && (
                <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#6B6B70" }}>
                  {it.hint}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="gci-hint">
          <span>↑↓ navigate · ↵ select</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}

function ChipGroup({ options, value, onChange }) {
  return (
    <div className="gci-chips">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            className={`gci-chip${on ? " is-on" : ""}`}
            onClick={() => onChange(o.id)}
          >
            <span>{o.label}</span>
            {o.sub && <span style={{ opacity: 0.55, fontSize: 11.5 }}>· {o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

function YearSegment({ value, onChange }) {
  const idx = YEAR_BUCKETS.findIndex((b) => b.key === value);
  const safeIdx = idx < 0 ? 1 : idx;
  const widthPct = 100 / YEAR_BUCKETS.length;
  return (
    <div className="gci-seg" style={{ gridTemplateColumns: `repeat(${YEAR_BUCKETS.length}, 1fr)` }}>
      <div
        className="gci-seg-glider"
        style={{ width: `calc(${widthPct}% - 4px)`, transform: `translateX(${safeIdx * 100}%)` }}
      />
      {YEAR_BUCKETS.map((b, i) => (
        <button
          key={b.key}
          type="button"
          className={`gci-seg-btn${i === safeIdx ? " is-on" : ""}`}
          onClick={() => onChange(b.key)}
        >
          <span>{b.label}</span>
          <small>{b.range}</small>
        </button>
      ))}
    </div>
  );
}

/* ── Act 1 — Intake (light theme) ──────────────────────────────── */

function IntakeView({ state, setState, onCalculate }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ind = INDUSTRIES.find((i) => i.id === state.industry);

  const canSubmit =
    state.status && state.industry && state.experience != null &&
    state.currentSalary && state.notice && state.cvFresh && state.topSkill;

  const fields = ["status", "industry", "experience", "currentSalary", "notice", "cvFresh", "topSkill"];
  const filled = fields.filter((f) => {
    const v = state[f];
    return v !== "" && v !== null && v !== undefined;
  }).length;
  const pct = Math.round((filled / fields.length) * 100);

  const industryItems = INDUSTRIES.map((i) => ({
    id: i.id, icon: i.icon, name: i.name,
    hint: `AED ${fmtK(i.base)}–${fmtK(i.peak)}`,
  }));

  return (
    <div className="gci-light">
      <div className="gci-shell">
        <div className="gci-topbar">
          <button type="button" className="gci-logo">
            <span className="gci-dot">C</span> CVPassport
          </button>
          <span className="gci-beta">GULF · BETA</span>
        </div>

        <div className="gci-eyebrow">Gulf Career Intelligence · Free</div>
        <h1 className="gci-h1">
          What is your CV <em>actually worth</em> in the Gulf?
        </h1>
        <p className="gci-lede">
          Seven quick answers. We&rsquo;ll benchmark you against UAE market data &mdash;
          peer salary bands, recruiter friction points and employer tier match &mdash;
          and hand you a Negotiation Script you can paste straight into your next interview.
        </p>

        <div className="gci-progress">
          <span>Step</span>
          <span style={{ fontFamily: "ui-monospace, monospace", color: "#0A0A0A" }}>{filled}/{fields.length}</span>
          <div className="gci-progress-track"><div className="gci-progress-fill" style={{ width: `${pct}%` }} /></div>
          <span>{pct}%</span>
        </div>

        <div className="gci-intake-grid">
          <div className="gci-card span2">
            <div className="gci-q-label"><span className="gci-q-num">01</span> Where are you right now?</div>
            <ChipGroup options={STATUS_OPTIONS} value={state.status} onChange={(v) => setState((s) => ({ ...s, status: v }))} />
          </div>

          <div className="gci-card">
            <div className="gci-q-label"><span className="gci-q-num">02</span> Primary industry</div>
            <button className="gci-role-btn" onClick={() => setPaletteOpen(true)}>
              <span className="gci-role-label">
                <span className="gci-role-icon">{ind ? ind.icon : "⌕"}</span>
                <span className={ind ? "" : "gci-ph"}>{ind ? ind.name : "Pick your industry…"}</span>
              </span>
              <span className="gci-kbd">⌘K</span>
            </button>
          </div>

          <div className="gci-card">
            <div className="gci-q-label"><span className="gci-q-num">03</span> Years of experience</div>
            <YearSegment value={state.experience} onChange={(v) => setState((s) => ({ ...s, experience: v }))} />
          </div>

          <div className="gci-card">
            <div className="gci-q-label">
              <span className="gci-q-num">04</span> Current salary{" "}
              <span style={{ color: "#6B6B70", letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>· monthly</span>
            </div>
            <div className="gci-salary">
              <div className="gci-cur-toggle">
                <button type="button" className={`gci-cur-btn${state.currency === "inr" ? " is-on" : ""}`} onClick={() => setState((s) => ({ ...s, currency: "inr" }))}>₹ INR</button>
                <button type="button" className={`gci-cur-btn${state.currency === "aed" ? " is-on" : ""}`} onClick={() => setState((s) => ({ ...s, currency: "aed" }))}>AED</button>
              </div>
              <input
                className="gci-input"
                inputMode="numeric"
                placeholder={state.currency === "inr" ? "e.g. 95,000" : "e.g. 12,500"}
                value={state.currentSalary || ""}
                onChange={(e) => setState((s) => ({ ...s, currentSalary: e.target.value.replace(/[^0-9]/g, "") }))}
              />
            </div>
          </div>

          <div className="gci-card">
            <div className="gci-q-label"><span className="gci-q-num">05</span> Notice period</div>
            <ChipGroup options={NOTICE_OPTIONS} value={state.notice} onChange={(v) => setState((s) => ({ ...s, notice: v }))} />
          </div>

          <div className="gci-card">
            <div className="gci-q-label">
              <span className="gci-q-num">06</span> CV freshness{" "}
              <span style={{ color: "#6B6B70", letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>· last UAE update</span>
            </div>
            <ChipGroup options={FRESH_OPTIONS} value={state.cvFresh} onChange={(v) => setState((s) => ({ ...s, cvFresh: v }))} />
          </div>

          <div className="gci-card span2">
            <div className="gci-q-label">
              <span className="gci-q-num">07</span> Top skill{" "}
              <span style={{ color: "#6B6B70", letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>· the one thing you lead with</span>
            </div>
            <textarea
              className="gci-input"
              rows={2}
              placeholder={ind ? `e.g. ${(KEYWORDS[ind.id] || [])[0] || "PMP-certified project delivery"}` : "e.g. PMP-certified project delivery"}
              value={state.topSkill || ""}
              onChange={(e) => setState((s) => ({ ...s, topSkill: e.target.value }))}
              maxLength={120}
            />
          </div>
        </div>

        <div className="gci-cta-wrap">
          <button className="gci-cta" disabled={!canSubmit} onClick={onCalculate}>
            Calculate my Gulf market match
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p className="gci-legal-light">
          Free · No signup to see your match. <span style={{ color: "#0A0A0A" }}>~30 seconds.</span> Your data is never sold.
        </p>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={industryItems}
        placeholder="Search industries — e.g. Finance, Healthcare"
        onPick={(it) => { setState((s) => ({ ...s, industry: it.id })); setPaletteOpen(false); }}
      />
    </div>
  );
}

/* ── Shared: number count-up ───────────────────────────────────── */

function CountUp({ to, dur = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    let start;
    const step = (t) => {
      if (!start) start = t;
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setN(Math.round(to * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{n}</>;
}

/* ── Act 2 — Flash metrics + email gate ────────────────────────── */

function FlashMetric({ result }) {
  return (
    <div className="gci-flash">
      <div className="gci-flash-card">
        <div className="gci-flash-eyebrow"><span className="gci-pulse-dot" />MARKET MATCH</div>
        <div className="gci-flash-num">
          <CountUp to={result.match} /><small>%</small>
        </div>
        <div className="gci-flash-sub">
          You sit in the <b>top {Math.max(2, 100 - result.percentile)}%</b> of {result.industry.name} candidates currently surfacing to Gulf recruiters.
        </div>
      </div>
      <div className="gci-flash-card is-green">
        <div className="gci-flash-eyebrow"><span className="gci-pulse-dot" />ESTIMATED RANGE</div>
        <div className="gci-flash-num" style={{ fontSize: "clamp(40px, 8vw, 80px)" }}>
          <CountUp to={Math.round(result.lowAED / 1000)} />–<CountUp to={Math.round(result.highAED / 1000)} />
          <small>k AED / mo</small>
        </div>
        <div className="gci-flash-sub">
          Mid-point <b>{fmtAED(result.midAED)}</b> · {result.industry.name} · {result.city.label}
        </div>
      </div>
    </div>
  );
}

function EmailGate({ onUnlock }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  return (
    <div className="gci-gate">
      <h3>This is just the surface. Get your full Gulf Intelligence Report.</h3>
      <p>
        Negotiation Script you can paste into your next interview · Recruiter Friction Score ·
        Dubai cost-of-living net take-home · Tier-1/2/SME employer match · the AED gap
        closing your CV today. Sent to your inbox in 90 seconds.
      </p>
      <form
        className="gci-gate-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid || busy) return;
          setBusy(true);
          await onUnlock(email);
          setBusy(false);
        }}
      >
        <input
          type="email"
          placeholder="you@work-email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <button type="submit" className="gci-gate-btn" disabled={!valid || busy}>
          {busy ? "Unlocking…" : "Unlock my report"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </form>
      <div className="gci-gate-microtrust">
        <span>No spam — one report, then you&rsquo;re out</span>
        <span>GDPR + UAE data law compliant</span>
        <span>Unsubscribe in one tap</span>
      </div>
    </div>
  );
}

/* ── Act 3 · Section 1 — Financial Reality ─────────────────────── */

function FinancialSection({ result }) {
  const range = result.highAED - result.lowAED;
  const currentPct = range > 0
    ? Math.max(0, Math.min(100, ((result.currentAED - result.lowAED) / range) * 100))
    : 0;
  return (
    <div className="gci-d-card">
      <div className="gci-section-title">SECTION 01 · <b>FINANCIAL REALITY</b></div>
      <h2 className="gci-section-h">Peer-benchmarked salary range &mdash; and what&rsquo;s left after you live here.</h2>

      <div className="gci-fin-row">
        <div className="gci-fin-cell">
          <div className="gci-fin-cell-label">Floor</div>
          <div className="gci-fin-cell-num">{fmtAED(result.lowAED)}</div>
          <div className="gci-fin-cell-foot">10th percentile</div>
        </div>
        <div className="gci-fin-cell is-mid">
          <div className="gci-fin-cell-label">Market mid</div>
          <div className="gci-fin-cell-num">{fmtAED(result.midAED)}</div>
          <div className="gci-fin-cell-foot">where you should land</div>
        </div>
        <div className="gci-fin-cell">
          <div className="gci-fin-cell-label">Peak</div>
          <div className="gci-fin-cell-num">{fmtAED(result.highAED)}</div>
          <div className="gci-fin-cell-foot">90th percentile</div>
        </div>
      </div>

      <div className="gci-fin-rangebar">
        <div className="gci-fin-rangebar-track">
          <div className="gci-fin-rangebar-fill" style={{ left: "0%", right: "0%" }} />
          <div className="gci-fin-rangebar-current" style={{ left: `${currentPct}%` }}>
            <div className="gci-fin-rangebar-marker-label" style={{ color: "#FFFFFF" }}>YOU · {fmtAED(result.currentAED)}</div>
          </div>
          <div className="gci-fin-rangebar-target" style={{ left: "50%" }}>
            <div className="gci-fin-rangebar-marker-label" style={{ color: "rgba(255,255,255,0.55)", top: "-22px" }}>MARKET MID</div>
          </div>
        </div>
      </div>

      <div className="gci-fin-cost">
        <div className="gci-fin-cell-label" style={{ marginBottom: 12 }}>NET TAKE-HOME · {result.city.label}</div>
        <ul className="gci-fin-cost-list">
          <li><span>Gross (mid-point)</span><span>{fmtAED(result.midAED)}</span></li>
          <li><span>Rent (1BR)</span><span>&minus;{fmtAED(result.costs.rent)}</span></li>
          <li><span>Transport</span><span>&minus;{fmtAED(result.costs.transport)}</span></li>
          <li><span>Utilities + comms</span><span>&minus;{fmtAED(result.costs.utilities)}</span></li>
          <li><span>Food + groceries</span><span>&minus;{fmtAED(result.costs.food)}</span></li>
          {result.costs.schooling && <li><span>Schooling (per child)</span><span>&minus;{fmtAED(result.costs.schooling)}</span></li>}
          <li className="is-total"><span>Total cost of living</span><span>&minus;{fmtAED(result.totalCost)}</span></li>
          <li className="is-net"><span>NET — savings ceiling</span><span>{fmtAED(result.netSavings)}/mo</span></li>
        </ul>
      </div>
    </div>
  );
}

/* ── Act 3 · Section 2 — Recruiter Friction ────────────────────── */

function FrictionGauge({ value }) {
  const v = Math.max(0, Math.min(100, value));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    let start;
    const dur = 1500;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (t) => {
      if (!start) start = t;
      const k = Math.min(1, (t - start) / dur);
      setDisplay(Math.round(ease(k) * v));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  const color = v >= 65 ? "#FF5C66" : v < 35 ? "#1D9E75" : "#FFFFFF";
  const glow = v >= 65 ? "rgba(255,92,102,0.45)" : v < 35 ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.3)";
  const status = v >= 65 ? "HIGH FRICTION" : v < 35 ? "LOW FRICTION" : "MODERATE";
  return (
    <div className="gci-fring" style={{ "--gci-fring-color": color, "--gci-fring-glow": glow }}>
      <div aria-hidden className="gci-fring-conic" />
      <div className="gci-fring-inner">
        <div className="gci-fring-num">{display}</div>
        <div className="gci-fring-label">FRICTION</div>
        <div className="gci-fring-status">{status}</div>
      </div>
    </div>
  );
}

function FrictionSection({ result }) {
  const f = result.friction;
  const colorFor = (v) => (v >= 65 ? "#FF5C66" : v < 35 ? "#1D9E75" : "#FFFFFF");
  return (
    <div className="gci-d-card">
      <div className="gci-section-title">SECTION 02 · <b>RECRUITER FRICTION</b></div>
      <h2 className="gci-section-h">What&rsquo;s actively blocking your profile from a recruiter&rsquo;s screen.</h2>

      <div className="gci-gauge-wrap">
        <FrictionGauge value={f.overall} />
        <ul className="gci-friction-list">
          <li className="gci-friction-row">
            <span className="gci-friction-label">Notice period flexibility</span>
            <span className="gci-friction-val" style={{ color: colorFor(f.notice) }}>{f.notice}</span>
            <div className="gci-friction-bar"><div className="gci-friction-bar-fill" style={{ width: `${f.notice}%`, background: colorFor(f.notice) }} /></div>
          </li>
          <li className="gci-friction-row">
            <span className="gci-friction-label">CV format & freshness</span>
            <span className="gci-friction-val" style={{ color: colorFor(f.cvFormat) }}>{f.cvFormat}</span>
            <div className="gci-friction-bar"><div className="gci-friction-bar-fill" style={{ width: `${f.cvFormat}%`, background: colorFor(f.cvFormat) }} /></div>
          </li>
          <li className="gci-friction-row">
            <span className="gci-friction-label">Missing Gulf keywords</span>
            <span className="gci-friction-val" style={{ color: colorFor(f.keywords) }}>{f.keywords}</span>
            <div className="gci-friction-bar"><div className="gci-friction-bar-fill" style={{ width: `${f.keywords}%`, background: colorFor(f.keywords) }} /></div>
          </li>
        </ul>
      </div>

      <div className="gci-friction-keywords">
        <div className="gci-friction-keywords-h">MISSING FROM YOUR CV · {result.industry.name}</div>
        <div className="gci-kw-list">
          {f.keywordsList.map((k) => (
            <span key={k} className="gci-kw" data-tt="Our Gulf-Standard template includes these automatically.">{k}</span>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
          Each missing keyword is a recruiter&rsquo;s &ldquo;skim and skip&rdquo; trigger. Hover any chip — our Gulf-Standard template surfaces them where ATS engines look first.
        </div>
      </div>
    </div>
  );
}

/* ── Act 3 · Section 3 — Tier match ────────────────────────────── */

function TierSection({ result }) {
  const cur = result.tier;
  return (
    <div className="gci-d-card">
      <div className="gci-section-title">SECTION 03 · <b>EMPLOYER TIER MATCH</b></div>
      <h2 className="gci-section-h">Where your profile lands in the Gulf hiring pyramid.</h2>

      <div className="gci-tier-list">
        {TIERS.slice().reverse().map((t, i) => {
          const isCur = t.id === cur.id;
          const rank = TIERS.length - i;
          return (
            <div key={t.id} className={`gci-tier-item${isCur ? " is-current" : ""}`}>
              <div className="gci-tier-rank">T{rank}</div>
              <div>
                <div className="gci-tier-name">{t.label}</div>
                <div className="gci-tier-range">
                  {t.range} ·{" "}
                  {t.id === "t1" ? "Multinationals, regional HQs"
                    : t.id === "t2" ? "Regional champions, family conglomerates"
                    : "Startups, agencies, growth co's"}
                </div>
              </div>
              {isCur && <div className="gci-tier-flag">YOU FIT HERE</div>}
            </div>
          );
        })}
      </div>

      <div className="gci-tier-foot">
        To move up one tier, the data says: add <b>{result.indKeywords[0]}</b> or <b>{result.indKeywords[1]}</b> to your skill block, drop your notice period to <b>30 days max</b>, and <u>rebuild your CV in a Gulf-standard format</u>. Tier-1 recruiters scan in 6 seconds — the first half-page does all the work.
      </div>
    </div>
  );
}

/* ── Act 3 · Section 4 — Negotiation script ────────────────────── */

function NegotiationSection({ result, onToast }) {
  const [mode, setMode] = useState("paste");
  const [copied, setCopied] = useState(null);

  const baseAsk = result.midAED;
  const stretchAsk = Math.round(((result.midAED + result.highAED) / 2) / 500) * 500;

  const lines = [
    {
      paste: `Based on UAE peer benchmarks for ${result.industry.name} at my experience level, the market mid-point sits at ${fmtAED(result.midAED)}. Given my ${result.indKeywords[0]} background and immediate availability, I'd be looking at ${fmtAED(stretchAsk)} as a starting figure.`,
      explain: "Anchor on the market mid, not your current package. You're not negotiating against your old salary — you're negotiating against the role's value to them.",
    },
    {
      paste: `I understand the budget for this role tops at ${fmtAED(baseAsk - 1000)} — happy to align if we can build the housing allowance and annual flight home into a flat ${fmtAED(stretchAsk)} all-in. That keeps the gross optics clean for your finance team.`,
      explain: "Reframe the ask around package mechanics. UAE recruiters love this — it lets them say yes without their P&L line moving.",
    },
    {
      paste: `Two things I'd want clarity on before signing: (1) is there a 6-month review tied to delivering [your top metric], and (2) what's the path to ${result.tier.id === "t1" ? "regional director" : "Tier-1"} from this seat? I'd rather get the trajectory right than the rupee right.`,
      explain: "Pivot from money to growth — signals you're a 5-year hire, not a transactional one. Disarms the recruiter and unlocks a higher offer from the hiring manager.",
    },
  ];

  const copy = async (i) => {
    try {
      await navigator.clipboard.writeText(lines[i].paste);
      setCopied(i);
      onToast && onToast("Copied · paste it straight into WhatsApp or email");
      setTimeout(() => setCopied(null), 1800);
    } catch (_e) { /* clipboard may be blocked */ }
  };

  return (
    <div className="gci-d-card">
      <div className="gci-section-title">SECTION 04 · <b>NEGOTIATION SCRIPT</b></div>
      <h2 className="gci-section-h">Three lines you can paste right now.</h2>

      <div className="gci-neg-tabs">
        <button className={`gci-neg-tab${mode === "paste" ? " is-on" : ""}`} onClick={() => setMode("paste")}>Paste-ready</button>
        <button className={`gci-neg-tab${mode === "explain" ? " is-on" : ""}`} onClick={() => setMode("explain")}>With rationale</button>
      </div>

      <div className="gci-neg-list">
        {lines.map((l, i) => (
          <div key={`line-${i}`} className="gci-neg-item">
            <div className="gci-neg-no">LINE 0{i + 1}</div>
            <div className="gci-neg-quote">&ldquo;{l.paste}&rdquo;</div>
            {mode === "explain" && <div className="gci-neg-rationale">→ {l.explain}</div>}
            <button className={`gci-neg-copy${copied === i ? " is-copied" : ""}`} onClick={() => copy(i)}>
              {copied === i ? "COPIED ✓" : "COPY"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Act 3b — Live refinement ──────────────────────────────────── */

function RefineSection({ state, setState }) {
  const cities = Object.keys(CITIES);
  return (
    <div className="gci-refine">
      <div className="gci-refine-head">
        <h3>Refine your scenario</h3>
        <span className="gci-live">LIVE · numbers update on every change</span>
      </div>
      <div className="gci-refine-grid">
        <div className="gci-refine-item">
          <div className="gci-refine-l">EXACT JOB TITLE</div>
          <input
            className="gci-refine-input"
            placeholder={`e.g. Senior ${state.industry === "tech" ? "DevOps Engineer" : state.industry === "finance" ? "Tax Manager" : "Project Manager"}`}
            value={state.exactTitle || ""}
            onChange={(e) => setState((s) => ({ ...s, exactTitle: e.target.value }))}
          />
        </div>
        <div className="gci-refine-item">
          <div className="gci-refine-l">LOCATION</div>
          <div className="gci-refine-pills">
            {cities.map((c) => (
              <button key={c} className={`gci-refine-pill${state.city === c ? " is-on" : ""}`} onClick={() => setState((s) => ({ ...s, city: c }))}>
                {CITIES[c].label}
              </button>
            ))}
          </div>
        </div>
        <div className="gci-refine-item">
          <div className="gci-refine-l">
            FAMILY STATUS{" "}
            {state.family === "family" && <span style={{ color: "rgba(255,255,255,0.55)", marginLeft: 8 }}>· schooling cost added</span>}
          </div>
          <div className="gci-refine-pills">
            <button className={`gci-refine-pill${state.family === "single" ? " is-on" : ""}`} onClick={() => setState((s) => ({ ...s, family: "single" }))}>Single</button>
            <button className={`gci-refine-pill${state.family === "couple" ? " is-on" : ""}`} onClick={() => setState((s) => ({ ...s, family: "couple" }))}>Couple, no kids</button>
            <button className={`gci-refine-pill${state.family === "family" ? " is-on" : ""}`} onClick={() => setState((s) => ({ ...s, family: "family" }))}>Family with kids</button>
          </div>
        </div>
        <div className="gci-refine-item">
          <div className="gci-refine-l">GULF CERTIFICATIONS · stack them, watch tier shift</div>
          <div className="gci-refine-pills">
            {REFINE_CERTS.map((c) => (
              <button
                key={c.id}
                className={`gci-refine-pill${(state.certs || {})[c.id] ? " is-on" : ""}`}
                onClick={() => setState((s) => ({ ...s, certs: { ...(s.certs || {}), [c.id]: !(s.certs || {})[c.id] } }))}
              >
                +{c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Act 4 — Share card + AED gap ──────────────────────────────── */

function ShareCard({ result, format, reportId }) {
  const isPortrait = format === "portrait";
  return (
    <div className={`gci-share-canvas-wrap${isPortrait ? " is-portrait" : " is-square"}`}>
      <div className="gci-share-canvas-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: "#fff", color: "#0A0A0A", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>C</span>
            CVPassport · Gulf Intel
          </div>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.16em" }}>BETA</span>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
            {result.industry.name.toUpperCase()} · {result.city.label.toUpperCase()}
          </div>
          <div style={{
            fontSize: isPortrait ? 56 : 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.95,
            color: "#FFFFFF",
            background: "linear-gradient(180deg, #FFFFFF 0%, #B8B8BC 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {result.match}<span style={{ fontSize: "0.45em" }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: "#fff", marginTop: 6, fontWeight: 500 }}>Gulf Market Match</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 8 }}>
              <div style={{ fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>WORTH</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{fmtAED(result.midAED)}/mo</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 8 }}>
              <div style={{ fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>FRICTION</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: result.friction.overall >= 65 ? "#FF5C66" : result.friction.overall < 35 ? "#1D9E75" : "#FFFFFF" }}>{result.friction.overall}/100</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 8 }}>
              <div style={{ fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>TIER</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{result.tier.label.split(" ")[0]} {result.tier.label.split(" ")[1] || ""}</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 8 }}>
              <div style={{ fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>PERCENTILE</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>P{result.percentile}</div>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, fontSize: 9, color: "rgba(255,255,255,0.45)", fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
          mycvpassport.com/gulf/{reportId}
        </div>
      </div>
    </div>
  );
}

/* Native Canvas-based PNG export — 1080×1080 (square) or 1080×1350 (portrait) */
function exportShareImage({ result, reportId, format, onToast }) {
  if (!result) return;
  const isPortrait = format === "portrait";
  const W = 1080;
  const H = isPortrait ? 1350 : 1080;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#131316");
  g.addColorStop(0.65, "#0a0a0a");
  g.addColorStop(1, "#050507");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const cy = isPortrait ? 1100 : 880;
  const glow = ctx.createRadialGradient(W / 2, cy, 30, W / 2, cy, 800);
  glow.addColorStop(0, "rgba(255,255,255,0.10)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(80, 80, 56, 56, 14);
  else ctx.rect(80, 80, 56, 56);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.font = '800 30px -apple-system, system-ui, sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("C", 108, 109);
  ctx.fillStyle = "#fff";
  ctx.font = '600 26px -apple-system, system-ui, sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("CVPassport · Gulf Career Intelligence", 156, 109);
  ctx.fillStyle = "#A0A0A0";
  ctx.font = '600 18px ui-monospace, monospace';
  ctx.textAlign = "right";
  ctx.fillText("BETA", W - 80, 109);

  ctx.fillStyle = "#A0A0A0";
  ctx.font = '600 22px -apple-system, system-ui, sans-serif';
  ctx.textAlign = "center";
  const subY = isPortrait ? 320 : 280;
  ctx.fillText(`${result.industry.name.toUpperCase()} · ${result.city.label.toUpperCase()}`, W / 2, subY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '900 360px -apple-system, system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const matchY = isPortrait ? 560 : 480;
  ctx.fillText(`${result.match}`, W / 2 - 30, matchY);
  ctx.font = '700 120px -apple-system, system-ui, sans-serif';
  ctx.fillText(`%`, W / 2 + 200, matchY + 70);

  ctx.fillStyle = "#fff";
  ctx.font = '600 36px -apple-system, system-ui, sans-serif';
  ctx.fillText("GULF MARKET MATCH", W / 2, matchY + 220);

  const statsY = isPortrait ? 920 : 760;
  const cellW = (W - 240) / 2;
  const cellH = 130;
  const drawCell = (x, y, label, val, valColor) => {
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + cellW - 20, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = '600 18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, y + 16);
    ctx.fillStyle = valColor || "#fff";
    ctx.font = '700 38px -apple-system, system-ui, sans-serif';
    ctx.fillText(val, x, y + 50);
  };
  drawCell(120, statsY, "WORTH", `${fmtAED(result.midAED)}/mo`);
  drawCell(120 + cellW, statsY, "FRICTION", `${result.friction.overall}/100`,
    result.friction.overall >= 65 ? "#FF5C66" : result.friction.overall < 35 ? "#1D9E75" : "#FFFFFF");
  drawCell(120, statsY + cellH, "TIER", result.tier.label);
  drawCell(120 + cellW, statsY + cellH, "PERCENTILE", `P${result.percentile}`);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '500 18px ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.fillText(`mycvpassport.com/gulf/${reportId}`, W / 2, H - 80);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = '500 14px -apple-system, system-ui, sans-serif';
  ctx.fillText("Generate yours · 30 seconds, free", W / 2, H - 50);

  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gulf-intel-${reportId}-${format}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onToast && onToast(`Saved · <b>${format === "portrait" ? "1080×1350" : "1080×1080"}</b> ready to share`);
  }, "image/png");
}

function ShareSection({ result, onExport, reportId }) {
  const [fmt, setFmt] = useState("square");
  return (
    <div className="gci-share-zone">
      <div className="gci-act-header">
        <span className="gci-act-tag">ACT 04</span>
        <span>THE CLOSE · YOUR SHAREABLE</span>
      </div>
      <div className="gci-share-tabs">
        <button className={`gci-share-tab${fmt === "square" ? " is-on" : ""}`} onClick={() => setFmt("square")}>Square · 1080×1080</button>
        <button className={`gci-share-tab${fmt === "portrait" ? " is-on" : ""}`} onClick={() => setFmt("portrait")}>Portrait · 1080×1350</button>
      </div>
      <div className="gci-share-stage">
        <ShareCard result={result} format={fmt} reportId={reportId} />
        <div className="gci-share-info">
          <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.012em" }}>
            People screenshot this. <em style={{ fontStyle: "normal", color: "rgba(255,255,255,0.55)" }}>Then they share it.</em>
          </div>
          <div className="gci-share-meta">
            One-tap export to PNG. Drop it in your WhatsApp status or LinkedIn. Anyone who opens the link sees a &ldquo;Generate Yours&rdquo; CTA — that&rsquo;s how this thing spreads.
          </div>
          <div className="gci-share-url">
            🔗 mycvpassport.com/gulf/{reportId}
          </div>
          <button className="gci-share-cta" onClick={() => onExport(fmt)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v14" />
            </svg>
            Export as PNG · {fmt === "square" ? "1080×1080" : "1080×1350"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GapCloser({ result, onCta }) {
  const monthly = result.gap;
  const annual = result.annualGap;
  return (
    <div className="gci-gap">
      <div className="gci-gap-eyebrow">THE NUMBER YOU CAME HERE FOR</div>
      <div className="gci-gap-line">
        You&rsquo;re worth <b>{fmtAED(result.midAED)}</b>. Your CV is getting you <b>{fmtAED(result.currentAED)}</b>.
      </div>
      <div className="gci-gap-line" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
        That&rsquo;s <b>{fmtAED(monthly)}/month</b> sitting on the table.
      </div>
      <div className="gci-gap-annual">
        {fmtAED(annual)}<small>/year</small>
      </div>
      <button className="gci-gap-cta" onClick={onCta}>
        Fix my CV on CVPassport
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/* ── DarkReport — wraps acts 2/3/3b/4 ──────────────────────────── */

function DarkReport({
  state, setState, result,
  stage, email,
  reportId, onUnlock, onExport, onToast, onReset,
  isShared,
}) {
  return (
    <div className="gci-dark">
      <div className="gci-shell-d">
        <div className="gci-topbar">
          <button type="button" className="gci-logo" onClick={onReset}>
            <span className="gci-dot">C</span> CVPassport
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="gci-beta">REPORT · {reportId}</span>
          </div>
        </div>

        {isShared && (
          <div className="gci-shared-banner">
            <div>
              <div className="gci-shared-eyebrow">SHARED REPORT</div>
              <div className="gci-shared-line">You&rsquo;re viewing someone else&rsquo;s Gulf Intelligence Report.</div>
            </div>
            <button type="button" className="gci-shared-cta" onClick={onReset}>
              Generate Yours
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="gci-act-header">
          <span className="gci-act-tag">FLASH</span>
          <span>YOUR INSTANT GULF SNAPSHOT</span>
        </div>
        <FlashMetric result={result} />

        {stage === "flash" && <EmailGate onUnlock={onUnlock} />}

        {stage === "report" && (
          <>
            <ShareSection result={result} onExport={onExport} reportId={reportId} />

            <div className="gci-act-header" style={{ marginTop: 32 }}>
              <span className="gci-act-tag">ACT 03</span>
              <span>FULL INTELLIGENCE REPORT{email ? <> · LIVE FOR <b style={{ color: "#fff" }}>{email}</b></> : null}</span>
            </div>
            <div className="gci-report-grid">
              <FinancialSection result={result} />
              <FrictionSection result={result} />
            </div>
            <div className="gci-report-grid" style={{ marginTop: 16 }}>
              <TierSection result={result} />
              <NegotiationSection result={result} onToast={onToast} />
            </div>

            {!isShared && <RefineSection state={state} setState={setState} />}

            <GapCloser
              result={result}
              onCta={() => onToast(`Heading to the builder · let's close that <b>${fmtAED(result.gap)}/mo</b> gap`)}
            />

            <p className="gci-legal">
              This is an AI-powered peer-benchmarking tool based on community data and current Gulf market sentiment. Values are estimates for guidance only and do not constitute legal, financial, or recruitment advice. MyCVPassport is an independent platform not affiliated with any government or regulatory body. Pre-tax INR figures convert at AED 1 ≈ ₹22.99; AED is shown tax-free.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Page orchestrator ─────────────────────────────────────────── */

export default function GulfCareerPage() {
  const navigate = useNavigate();
  const { reportId: urlReportId } = useParams();

  // intake → curtain → flash → report
  const [stage, setStage] = useState(urlReportId ? "loading-shared" : "intake");
  const [state, setState] = useState(EMPTY_STATE);
  const [email, setEmail] = useState("");
  const [reportId, setReportId] = useState(() => urlReportId || genReportId());
  const [toast, setToast] = useState("");
  const [toastVis, setToastVis] = useState(false);
  const [isShared, setIsShared] = useState(!!urlReportId);
  const toastTimer = useRef(null);

  const result = useMemo(
    () => (state.industry ? compute(state) : null),
    [state]
  );

  const showToast = useCallback((msg) => {
    setToast(msg);
    setToastVis(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVis(false), 2400);
  }, []);

  // Load shared report on mount when URL has :reportId
  useEffect(() => {
    if (!urlReportId) return;
    let cancelled = false;
    (async () => {
      const row = await loadReport(urlReportId);
      if (cancelled) return;
      if (!row) {
        navigate("/gulf-career", { replace: true });
        return;
      }
      setState(row.state || EMPTY_STATE);
      setEmail(row.email || "");
      setReportId(row.id);
      setIsShared(true);
      setStage("report");
    })();
    return () => { cancelled = true; };
  }, [urlReportId, navigate]);

  const onCalculate = useCallback(() => {
    setStage("curtain");
    setTimeout(() => {
      setStage("flash");
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 1800);
  }, []);

  const onUnlock = useCallback(async (em) => {
    setEmail(em);
    setStage("report");
    showToast(`Report unlocked · sent to <b>${em}</b>`);
    if (result) {
      const { ok } = await saveReport({ id: reportId, email: em, state, result });
      if (ok && typeof window !== "undefined") {
        // Update URL to the persistent share link without reload
        window.history.replaceState({}, "", `/gulf/${reportId}`);
      }
    }
  }, [reportId, state, result, showToast]);

  const onExport = useCallback(
    (format) => exportShareImage({ result, reportId, format, onToast: showToast }),
    [result, reportId, showToast]
  );

  const onReset = useCallback(() => {
    setStage("intake");
    setState(EMPTY_STATE);
    setEmail("");
    setIsShared(false);
    setReportId(genReportId());
    navigate("/gulf-career", { replace: true });
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }, [navigate]);

  const showLight = stage === "intake";
  const showCurtain = stage === "curtain";
  const showFlashOrReport = stage === "flash" || stage === "report";

  return (
    <>
      <Helmet>
        <title>Gulf Career Intelligence — what is your CV worth in the UAE? | CVPassport</title>
        <meta name="description" content="Free 30-second tool. Benchmark your CV against UAE market data — peer salary bands, recruiter friction, employer tier match and a paste-ready negotiation script." />
        <meta name="keywords" content="UAE salary calculator, Dubai CV worth, Gulf job market, expat salary, ATS UAE, Gulf hiring intelligence" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://mycvpassport.com${urlReportId ? `/gulf/${urlReportId}` : "/gulf-career"}`} />
        <meta property="og:title" content="Gulf Career Intelligence | CVPassport" />
        <meta property="og:description" content="Benchmark your CV against UAE market data in 30 seconds — free." />
        <meta property="og:url" content="https://mycvpassport.com/gulf-career" />
        <meta property="og:type" content="website" />
      </Helmet>

      <style>{CSS_TEXT}</style>

      {stage === "loading-shared" && (
        <div className="gci-dark">
          <div className="gci-shell-d" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
            <div className="gci-curtain-line" style={{ color: "#fff" }}>
              LOADING SHARED REPORT · {urlReportId}
            </div>
          </div>
        </div>
      )}

      {showLight && (
        <IntakeView state={state} setState={setState} onCalculate={onCalculate} />
      )}

      {showCurtain && <div className="gci-light"><div className="gci-shell" style={{ minHeight: "60vh" }} /></div>}

      {showFlashOrReport && result && (
        <DarkReport
          state={state} setState={setState}
          result={result} stage={stage}
          email={email}
          reportId={reportId}
          onUnlock={onUnlock} onExport={onExport}
          onToast={showToast}
          onReset={onReset}
          isShared={isShared}
        />
      )}

      <div className={`gci-curtain${showCurtain ? " is-up" : ""}`}>
        <div className="gci-curtain-content">
          <div>
            <div className="gci-curtain-line">
              ANALYSING · <span>{result ? result.industry.name : "your profile"}</span> · UAE benchmarks
            </div>
            <div className="gci-curtain-bars">
              <span className="gci-curtain-bar" />
              <span className="gci-curtain-bar" />
              <span className="gci-curtain-bar" />
              <span className="gci-curtain-bar" />
              <span className="gci-curtain-bar" />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`gci-toast${toastVis ? " is-show" : ""}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: toast }}
      />
    </>
  );
}

/* ── CSS ───────────────────────────────────────────────────────── */

const CSS_TEXT = `
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
:root {
  --l-bg: #F5F5F7; --l-surface: #FFFFFF; --l-elev: #EBEBED; --l-border: #D8D8DC;
  --l-text: #0A0A0A; --l-muted: #6B6B70;
  --l-green: #1D9E75; --l-blue: #378ADD; --l-amber: #D97706;
  --d-bg: #0A0A0A; --d-surface: #141414; --d-elev: #1C1C1C; --d-border: #2A2A2A;
  --d-text: #FFFFFF; --d-muted: #A0A0A0;
  --d-amber: #D97706; --d-green: #1D9E75; --d-blue: #378ADD; --d-red: #E63946;
  --gci-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --gci-easeOut: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.gci-light { background: var(--l-bg); color: var(--l-text); min-height: 100vh; min-height: 100dvh; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.gci-shell { width: 100%; max-width: 720px; margin: 0 auto; padding: 24px 20px 64px; }
@media (min-width: 760px) { .gci-shell { max-width: 880px; padding: 48px 32px 80px; } }

.gci-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.gci-logo { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; background: none; border: 0; padding: 0; color: inherit; cursor: pointer; font-family: inherit; }
.gci-logo .gci-dot { width: 24px; height: 24px; border-radius: 7px; background: #0A0A0A; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff; }
.gci-beta { font-size: 10px; color: var(--l-muted); border: 1px solid var(--l-border); padding: 3px 7px; border-radius: 999px; letter-spacing: 0.14em; }

.gci-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600; color: var(--l-blue); margin-bottom: 12px; }
.gci-eyebrow::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--l-blue); box-shadow: 0 0 10px rgba(55,138,221,0.4); }
.gci-h1 { font-size: clamp(32px, 6.4vw, 56px); line-height: 1.02; letter-spacing: -0.03em; font-weight: 600; margin: 0 0 16px; text-wrap: pretty; }
.gci-h1 em { font-style: normal; color: var(--l-green); }
.gci-lede { font-size: clamp(15px, 2vw, 17px); line-height: 1.5; color: var(--l-muted); margin: 0; max-width: 560px; }

.gci-progress { display: flex; align-items: center; gap: 8px; margin: 28px 0 18px; font-size: 11px; color: var(--l-muted); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; }
.gci-progress-track { flex: 1; height: 4px; background: var(--l-elev); border-radius: 999px; overflow: hidden; }
.gci-progress-fill { height: 100%; background: linear-gradient(90deg, var(--l-blue), var(--l-green)); border-radius: 999px; transition: width .4s var(--gci-ease); }

.gci-card { background: var(--l-surface); border: 1px solid var(--l-border); border-radius: 20px; padding: 22px; }
@media (min-width: 760px) { .gci-card { padding: 28px; } }
.gci-q-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--l-muted); font-weight: 600; margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
.gci-q-label .gci-q-num { font-family: ui-monospace, "SF Mono", monospace; color: var(--l-text); background: var(--l-elev); padding: 2px 7px; border-radius: 5px; font-size: 10.5px; }

.gci-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.gci-chip { background: var(--l-surface); border: 1px solid var(--l-border); border-radius: 11px; padding: 11px 14px; font-family: inherit; font-size: 14px; color: var(--l-text); cursor: pointer; transition: border-color .18s var(--gci-ease), background-color .18s var(--gci-ease); display: inline-flex; align-items: center; gap: 8px; }
.gci-chip:hover { border-color: #B0B0B8; }
.gci-chip.is-on { background: #0A0A0A; color: #fff; border-color: #0A0A0A; }

.gci-role-btn { width: 100%; background: var(--l-elev); border: 1px solid var(--l-border); border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: space-between; font-family: inherit; font-size: 15px; color: var(--l-text); cursor: pointer; transition: border-color .18s var(--gci-ease); }
.gci-role-btn:hover { border-color: #B0B0B8; }
.gci-role-icon { width: 30px; height: 30px; border-radius: 8px; background: #E8E8EC; display: grid; place-items: center; font-size: 16px; }
.gci-role-label { display: flex; align-items: center; gap: 12px; }
.gci-role-label .gci-ph { color: var(--l-muted); }
.gci-kbd { font-family: ui-monospace, "SF Mono", monospace; font-size: 11px; color: var(--l-muted); border: 1px solid var(--l-border); border-radius: 5px; padding: 2px 6px; }

.gci-seg { position: relative; display: grid; gap: 0; background: var(--l-elev); border: 1px solid var(--l-border); border-radius: 12px; overflow: hidden; height: 52px; }
.gci-seg-glider { position: absolute; top: 4px; left: 4px; bottom: 4px; background: #0A0A0A; border-radius: 9px; transition: transform .28s var(--gci-ease), width .28s var(--gci-ease); box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1; }
.gci-seg-btn { z-index: 2; background: none; border: 0; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; color: var(--l-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; transition: color .18s var(--gci-ease); padding: 0; }
.gci-seg-btn small { font-size: 10px; opacity: 0.7; font-weight: 400; }
.gci-seg-btn.is-on { color: #fff; }

.gci-salary { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: stretch; }
.gci-cur-toggle { background: var(--l-elev); border: 1px solid var(--l-border); border-radius: 12px; display: grid; grid-template-rows: 1fr 1fr; padding: 4px; gap: 4px; }
.gci-cur-btn { background: none; border: 0; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--l-muted); cursor: pointer; transition: background-color .18s var(--gci-ease), color .18s var(--gci-ease); display: flex; align-items: center; justify-content: center; gap: 6px; }
.gci-cur-btn.is-on { background: #0A0A0A; color: #fff; }
.gci-input { background: var(--l-elev); border: 1px solid var(--l-border); border-radius: 12px; padding: 0 16px; font-family: inherit; font-size: 16px; color: var(--l-text); outline: 0; min-height: 56px; font-variant-numeric: tabular-nums; }
.gci-input::placeholder { color: var(--l-muted); }
.gci-input:focus { border-color: #0A0A0A; }
textarea.gci-input { padding: 14px 16px; resize: none; line-height: 1.4; }

.gci-cta-wrap { position: relative; margin-top: 24px; padding: 2px; border-radius: 16px; overflow: hidden; }
.gci-cta-wrap::before { content: ""; position: absolute; inset: -50%; background: conic-gradient(from 0deg, #0A0A0A, #888888, #0A0A0A, #cccccc, #0A0A0A); animation: gci-spin 3.5s linear infinite; }
.gci-cta-wrap::after { content: ""; position: absolute; inset: 2px; border-radius: 14px; background: var(--l-bg); }
.gci-cta { position: relative; z-index: 2; width: 100%; padding: 18px; background: #0A0A0A; border: 0; border-radius: 13px; color: #fff; font-weight: 700; font-size: 16px; letter-spacing: -0.005em; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: transform .12s var(--gci-ease); }
.gci-cta:active { transform: scale(0.985); }
.gci-cta:disabled { opacity: 0.45; cursor: not-allowed; }
@keyframes gci-spin { to { transform: rotate(360deg); } }

.gci-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.32); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); z-index: 1000; display: none; align-items: flex-start; justify-content: center; padding: 80px 16px 16px; }
.gci-overlay.is-open { display: flex; }
.gci-palette { width: 100%; max-width: 480px; background: #fff; border: 1px solid var(--l-border); border-radius: 14px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.18); animation: gci-pop .18s var(--gci-ease); }
@keyframes gci-pop { from { transform: translateY(-6px); opacity: 0; } to { transform: none; opacity: 1; } }
.gci-palette input { width: 100%; background: transparent; border: 0; outline: 0; padding: 16px 18px; font-size: 15px; font-family: inherit; color: #0A0A0A; border-bottom: 1px solid var(--l-border); }
.gci-palette ul { list-style: none; margin: 0; padding: 6px; max-height: 380px; overflow-y: auto; }
.gci-palette li { padding: 11px 12px; border-radius: 9px; cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 14px; }
.gci-palette li.is-sel, .gci-palette li:hover { background: #F5F5F7; }
.gci-palette li .gci-ri { width: 28px; height: 28px; border-radius: 7px; background: #F0F0F2; display: grid; place-items: center; font-size: 14px; }
.gci-palette .gci-hint { padding: 10px 14px; border-top: 1px solid var(--l-border); font-size: 11px; color: var(--l-muted); display: flex; justify-content: space-between; }

.gci-curtain { position: fixed; inset: 0; z-index: 900; pointer-events: none; background: #0A0A0A; transform: translateY(100%); transition: transform .9s var(--gci-ease); }
.gci-curtain.is-up { transform: translateY(0); }
.gci-curtain-content { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; opacity: 0; transition: opacity .4s var(--gci-ease) .35s; }
.gci-curtain.is-up .gci-curtain-content { opacity: 1; }
.gci-curtain-line { font-family: ui-monospace, "SF Mono", monospace; font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 0.28em; text-transform: uppercase; text-align: center; }
.gci-curtain-line span { color: #fff; }
.gci-curtain-bars { margin-top: 18px; display: flex; gap: 4px; justify-content: center; }
.gci-curtain-bar { width: 3px; height: 16px; background: rgba(255,255,255,0.85); border-radius: 2px; animation: gci-pulse 0.9s var(--gci-ease) infinite; }
.gci-curtain-bar:nth-child(2) { animation-delay: .12s; }
.gci-curtain-bar:nth-child(3) { animation-delay: .24s; }
.gci-curtain-bar:nth-child(4) { animation-delay: .36s; }
.gci-curtain-bar:nth-child(5) { animation-delay: .48s; }
@keyframes gci-pulse { 0%,100% { opacity: 0.25; transform: scaleY(0.6); } 50% { opacity: 1; transform: scaleY(1); } }

.gci-dark { background: #0A0A0A; color: #FFFFFF; min-height: 100vh; min-height: 100dvh; position: relative; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.gci-dark::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(900px 500px at 12% -10%, rgba(255,255,255,0.045), transparent 60%), radial-gradient(700px 400px at 110% 20%, rgba(255,255,255,0.03), transparent 60%), radial-gradient(800px 600px at 50% 110%, rgba(255,255,255,0.025), transparent 65%); }
.gci-dark > * { position: relative; z-index: 1; }
.gci-dark .gci-shell-d { width: 100%; max-width: 1200px; margin: 0 auto; padding: 24px 16px 80px; }
@media (min-width: 760px) { .gci-dark .gci-shell-d { padding: 40px 32px 96px; } }
.gci-dark .gci-topbar { color: #FFFFFF; }
.gci-dark .gci-logo .gci-dot { background: rgba(255,255,255,0.95); color: #0A0A0A; }
.gci-dark .gci-beta { color: rgba(255,255,255,0.55); border-color: rgba(255,255,255,0.14); font-family: ui-monospace, "SF Mono", monospace; }

.gci-shared-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); margin-bottom: 18px; flex-wrap: wrap; }
.gci-shared-eyebrow { font-size: 10px; letter-spacing: 0.22em; color: rgba(255,255,255,0.55); font-weight: 700; font-family: ui-monospace, "SF Mono", monospace; }
.gci-shared-line { font-size: 14.5px; color: #fff; margin-top: 4px; font-weight: 500; }
.gci-shared-cta { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(180deg, #FFFFFF 0%, #DCDCE0 100%); color: #0A0A0A; border: 0; border-radius: 10px; padding: 10px 16px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 6px 18px rgba(0,0,0,0.4); transition: transform .12s var(--gci-ease); }
.gci-shared-cta:active { transform: scale(0.97); }

.gci-d-card, .gci-flash-card, .gci-gate, .gci-refine, .gci-share-stage { background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.018) 100%); border: 1px solid rgba(255,255,255,0.09); border-radius: 18px; -webkit-backdrop-filter: blur(20px) saturate(140%); backdrop-filter: blur(20px) saturate(140%); box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 0.5px rgba(255,255,255,0.04), 0 24px 60px -20px rgba(0,0,0,0.6); }

.gci-flash { margin: 24px 0 16px; display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 760px) { .gci-flash { grid-template-columns: 1fr 1fr; gap: 20px; } }
.gci-flash-card { border-radius: 20px; padding: 28px; position: relative; overflow: hidden; }
.gci-flash-card::before { content: ""; position: absolute; top: 0; left: 16px; right: 16px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); }
.gci-flash-eyebrow { font-size: 10.5px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.55); font-weight: 600; margin-bottom: 14px; font-family: ui-monospace, "SF Mono", monospace; display: flex; align-items: center; gap: 8px; }
.gci-flash-eyebrow .gci-pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 0 14px rgba(255,255,255,0.6); animation: gci-blink 1.6s var(--gci-ease) infinite; }
.gci-flash-card.is-green .gci-pulse-dot { background: #1D9E75; box-shadow: 0 0 14px rgba(29,158,117,0.7); }
@keyframes gci-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.gci-flash-num { font-size: clamp(60px, 11vw, 116px); line-height: 0.95; font-weight: 800; letter-spacing: -0.045em; font-variant-numeric: tabular-nums; color: #FFFFFF; background: linear-gradient(180deg, #FFFFFF 0%, #B8B8BC 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.gci-flash-num small { font-size: 0.32em; font-weight: 600; color: rgba(255,255,255,0.45); letter-spacing: 0; vertical-align: 12%; margin-left: 4px; -webkit-text-fill-color: rgba(255,255,255,0.45); }
.gci-flash-sub { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 12px; line-height: 1.45; }
.gci-flash-sub b { color: #FFFFFF; font-weight: 600; }

.gci-gate { margin: 28px 0; padding: 28px; }
.gci-gate h3 { font-size: clamp(22px, 3.4vw, 32px); font-weight: 600; line-height: 1.15; letter-spacing: -0.022em; margin: 0 0 12px; max-width: 580px; color: #FFFFFF; }
.gci-gate p { color: rgba(255,255,255,0.6); font-size: 15px; line-height: 1.5; margin: 0 0 20px; max-width: 560px; }
.gci-gate-row { display: grid; gap: 10px; grid-template-columns: 1fr; }
@media (min-width: 600px) { .gci-gate-row { grid-template-columns: 1fr auto; } }
.gci-gate input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px 18px; font-family: inherit; font-size: 15px; color: #FFFFFF; outline: 0; transition: border-color .18s var(--gci-ease), background-color .18s var(--gci-ease); }
.gci-gate input::placeholder { color: rgba(255,255,255,0.4); }
.gci-gate input:focus { border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.06); }
.gci-gate-btn { position: relative; background: linear-gradient(180deg, #FFFFFF 0%, #DCDCE0 100%); color: #0A0A0A; border: 0; border-radius: 12px; padding: 16px 22px; font-family: inherit; font-size: 15px; font-weight: 700; letter-spacing: -0.005em; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: transform .12s var(--gci-ease), box-shadow .18s var(--gci-ease); white-space: nowrap; box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 6px 18px rgba(0,0,0,0.4); }
.gci-gate-btn:hover { box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px rgba(255,255,255,0.18); }
.gci-gate-btn:active { transform: scale(0.98); }
.gci-gate-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.gci-gate-microtrust { margin-top: 14px; font-size: 11.5px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-family: ui-monospace, "SF Mono", monospace; letter-spacing: 0.04em; }
.gci-gate-microtrust span::before { content: "✓ "; color: #1D9E75; }

.gci-report-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 980px) { .gci-report-grid { grid-template-columns: 1.4fr 1fr; gap: 20px; } }
.gci-section-title { font-size: 10.5px; letter-spacing: 0.26em; text-transform: uppercase; color: rgba(255,255,255,0.45); font-weight: 600; margin: 0 0 8px; font-family: ui-monospace, "SF Mono", monospace; }
.gci-section-title b { color: #FFFFFF; font-weight: 600; }
.gci-section-h { font-size: clamp(22px, 3vw, 28px); font-weight: 600; line-height: 1.18; letter-spacing: -0.02em; margin: 0 0 18px; color: #FFFFFF; }

.gci-d-card { padding: 22px; }
@media (min-width: 760px) { .gci-d-card { padding: 26px; } }
.gci-d-card + .gci-d-card { margin-top: 16px; }

.gci-fin-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.02); }
.gci-fin-cell { padding: 16px 14px; border-right: 1px solid rgba(255,255,255,0.08); }
.gci-fin-cell:last-child { border-right: 0; }
.gci-fin-cell.is-mid { background: rgba(255,255,255,0.045); position: relative; }
.gci-fin-cell.is-mid::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); }
.gci-fin-cell-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.45); font-weight: 600; margin-bottom: 6px; font-family: ui-monospace, "SF Mono", monospace; }
.gci-fin-cell-num { font-size: clamp(20px, 3.2vw, 26px); font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: #FFFFFF; }
.gci-fin-cell-foot { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 4px; }

.gci-fin-rangebar { margin-top: 22px; padding-top: 6px; }
.gci-fin-rangebar-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; position: relative; overflow: visible; border: 1px solid rgba(255,255,255,0.05); }
.gci-fin-rangebar-fill { position: absolute; top: 0; bottom: 0; background: linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.55)); border-radius: 999px; }
.gci-fin-rangebar-current, .gci-fin-rangebar-target { position: absolute; top: -6px; width: 2px; height: 18px; }
.gci-fin-rangebar-current { background: #FFFFFF; box-shadow: 0 0 8px rgba(255,255,255,0.6); }
.gci-fin-rangebar-target { background: rgba(255,255,255,0.5); }
.gci-fin-rangebar-marker-label { position: absolute; top: 22px; transform: translateX(-50%); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-family: ui-monospace, "SF Mono", monospace; white-space: nowrap; color: rgba(255,255,255,0.7); }

.gci-fin-cost { margin-top: 22px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; }
.gci-fin-cost-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.gci-fin-cost-list li { display: flex; justify-content: space-between; align-items: baseline; font-size: 13.5px; font-variant-numeric: tabular-nums; }
.gci-fin-cost-list li span:first-child { color: rgba(255,255,255,0.55); }
.gci-fin-cost-list li span:last-child { color: #FFFFFF; }
.gci-fin-cost-list li.is-total { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; margin-top: 4px; font-weight: 700; font-size: 14.5px; }
.gci-fin-cost-list li.is-net { color: #1D9E75; font-weight: 700; font-size: 16px; }
.gci-fin-cost-list li.is-net span { color: #1D9E75 !important; }

@property --gci-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes gci-spin-ring { to { --gci-angle: 360deg; } }
.gci-gauge-wrap { display: grid; grid-template-columns: auto 1fr; gap: 28px; align-items: center; }
@media (max-width: 600px) { .gci-gauge-wrap { grid-template-columns: 1fr; gap: 20px; justify-items: center; } }
.gci-fring { position: relative; width: 168px; height: 168px; flex-shrink: 0; filter: drop-shadow(0 0 18px var(--gci-fring-glow, rgba(255,255,255,0.18))); transition: filter .3s var(--gci-ease); }
.gci-fring-conic { position: absolute; inset: 0; border-radius: 50%; padding: 2px; background: conic-gradient(from var(--gci-angle, 0deg), transparent 60%, var(--gci-fring-color, #FFFFFF) 80%, transparent 100%); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; animation: gci-spin-ring 3s linear infinite; }
.gci-fring-inner { position: absolute; inset: 2px; border-radius: 50%; background: radial-gradient(circle at 50% 30%, rgba(255,255,255,0.04), #0A0A0A 60%); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); }
.gci-fring-num { font-family: -apple-system, "SF Pro Display", system-ui, sans-serif; font-size: 56px; font-weight: 800; line-height: 1; letter-spacing: -0.04em; color: var(--gci-fring-color, #FFFFFF); font-variant-numeric: tabular-nums; transition: color .2s var(--gci-ease); }
.gci-fring-label { font-size: 9.5px; letter-spacing: 0.26em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 6px; font-weight: 600; font-family: ui-monospace, "SF Mono", monospace; }
.gci-fring-status { font-size: 10.5px; letter-spacing: 0.06em; margin-top: 4px; font-weight: 600; color: var(--gci-fring-color, #FFFFFF); font-family: ui-monospace, "SF Mono", monospace; }

.gci-friction-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; width: 100%; }
.gci-friction-row { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; align-items: baseline; }
.gci-friction-row .gci-friction-label { font-size: 13px; color: rgba(255,255,255,0.7); }
.gci-friction-row .gci-friction-val { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; font-family: ui-monospace, "SF Mono", monospace; }
.gci-friction-bar { grid-column: 1 / -1; height: 3px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
.gci-friction-bar-fill { height: 100%; border-radius: 999px; transition: width .6s var(--gci-ease); }
.gci-friction-keywords { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.08); }
.gci-friction-keywords-h { font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.45); font-weight: 600; margin-bottom: 12px; font-family: ui-monospace, "SF Mono", monospace; }
.gci-kw-list { display: flex; flex-wrap: wrap; gap: 8px; }
.gci-kw { font-family: ui-monospace, "SF Mono", monospace; font-size: 11.5px; padding: 5px 10px; border-radius: 6px; background: rgba(230,57,70,0.10); color: #FF8088; border: 1px solid rgba(230,57,70,0.32); position: relative; cursor: help; letter-spacing: 0.02em; }

.gci-tier-list { display: grid; gap: 10px; }
.gci-tier-item { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.02); position: relative; transition: border-color .2s var(--gci-ease), background-color .2s var(--gci-ease); }
.gci-tier-item.is-current { border-color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.06); box-shadow: 0 0 0 0.5px rgba(255,255,255,0.2), 0 8px 24px rgba(0,0,0,0.4); }
.gci-tier-rank { width: 34px; height: 34px; border-radius: 8px; background: rgba(255,255,255,0.04); display: grid; place-items: center; font-family: ui-monospace, "SF Mono", monospace; font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 700; border: 1px solid rgba(255,255,255,0.08); letter-spacing: 0.04em; }
.gci-tier-item.is-current .gci-tier-rank { background: linear-gradient(180deg, #FFFFFF 0%, #C8C8CC 100%); color: #0A0A0A; border-color: rgba(255,255,255,0.6); box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset; }
.gci-tier-name { font-size: 14.5px; font-weight: 600; color: #FFFFFF; }
.gci-tier-range { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; font-variant-numeric: tabular-nums; }
.gci-tier-flag { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 700; color: #FFFFFF; font-family: ui-monospace, "SF Mono", monospace; }
.gci-tier-foot { margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 13.5px; line-height: 1.55; color: rgba(255,255,255,0.6); }
.gci-tier-foot b { color: #FFFFFF; font-weight: 600; }
.gci-tier-foot u { color: #FFFFFF; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.4); }

.gci-neg-tabs { display: inline-flex; padding: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 16px; }
.gci-neg-tab { background: none; border: 0; border-radius: 7px; padding: 8px 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.55); cursor: pointer; transition: background-color .18s var(--gci-ease), color .18s var(--gci-ease); letter-spacing: -0.005em; }
.gci-neg-tab.is-on { background: rgba(255,255,255,0.92); color: #0A0A0A; box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset; }
.gci-neg-list { display: grid; gap: 10px; }
.gci-neg-item { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; display: grid; gap: 8px; position: relative; }
.gci-neg-item .gci-neg-no { font-family: ui-monospace, "SF Mono", monospace; font-size: 10.5px; color: rgba(255,255,255,0.5); letter-spacing: 0.22em; font-weight: 600; }
.gci-neg-item .gci-neg-quote { font-size: 14.5px; line-height: 1.55; color: #FFFFFF; font-style: italic; letter-spacing: -0.005em; padding-right: 70px; }
.gci-neg-item .gci-neg-rationale { font-size: 12.5px; color: rgba(255,255,255,0.55); line-height: 1.5; }
.gci-neg-copy { position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); border-radius: 7px; font-family: ui-monospace, "SF Mono", monospace; font-size: 10px; font-weight: 700; padding: 6px 10px; cursor: pointer; letter-spacing: 0.12em; transition: color .18s var(--gci-ease), border-color .18s var(--gci-ease), background-color .18s var(--gci-ease); }
.gci-neg-copy:hover { color: #FFFFFF; border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.08); }
.gci-neg-copy.is-copied { color: #1D9E75; border-color: rgba(29,158,117,0.5); background: rgba(29,158,117,0.08); }

.gci-refine { margin-top: 24px; padding: 22px; }
.gci-refine-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.gci-refine-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: #FFFFFF; letter-spacing: -0.01em; }
.gci-refine-head .gci-live { font-family: ui-monospace, "SF Mono", monospace; font-size: 10px; color: #1D9E75; letter-spacing: 0.22em; display: inline-flex; align-items: center; gap: 6px; }
.gci-refine-head .gci-live::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #1D9E75; box-shadow: 0 0 10px #1D9E75; animation: gci-blink 1.4s var(--gci-ease) infinite; }
.gci-refine-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 700px) { .gci-refine-grid { grid-template-columns: 1fr 1fr; } }
.gci-refine-item .gci-refine-l { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.45); font-weight: 600; margin-bottom: 8px; font-family: ui-monospace, "SF Mono", monospace; }
.gci-refine-item .gci-refine-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.gci-refine-pill { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; font-family: inherit; font-size: 12.5px; color: rgba(255,255,255,0.65); cursor: pointer; transition: border-color .18s var(--gci-ease), color .18s var(--gci-ease), background-color .18s var(--gci-ease); }
.gci-refine-pill:hover { color: #FFFFFF; border-color: rgba(255,255,255,0.25); }
.gci-refine-pill.is-on { background: linear-gradient(180deg, #FFFFFF 0%, #DCDCE0 100%); color: #0A0A0A; border-color: rgba(255,255,255,0.6); font-weight: 700; box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset; }
.gci-refine-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; font-family: inherit; font-size: 13.5px; color: #FFFFFF; outline: 0; transition: border-color .18s var(--gci-ease); }
.gci-refine-input::placeholder { color: rgba(255,255,255,0.35); }
.gci-refine-input:focus { border-color: rgba(255,255,255,0.4); }

.gci-share-zone { margin-top: 24px; }
.gci-share-tabs { display: inline-flex; padding: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 14px; }
.gci-share-tab { background: none; border: 0; border-radius: 7px; padding: 8px 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.55); cursor: pointer; transition: background-color .18s var(--gci-ease), color .18s var(--gci-ease); }
.gci-share-tab.is-on { background: rgba(255,255,255,0.92); color: #0A0A0A; box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset; }
.gci-share-stage { padding: 22px; display: grid; gap: 22px; grid-template-columns: 1fr; }
@media (min-width: 900px) { .gci-share-stage { grid-template-columns: auto 1fr; align-items: center; } }
.gci-share-canvas-wrap { background: #000; border-radius: 14px; padding: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); }
.gci-share-canvas-wrap.is-square { aspect-ratio: 1; max-width: 360px; }
.gci-share-canvas-wrap.is-portrait { aspect-ratio: 4/5; max-width: 320px; }
.gci-share-canvas-inner { width: 100%; height: 100%; background: radial-gradient(120% 80% at 50% 110%, rgba(255,255,255,0.08), transparent 65%), linear-gradient(180deg, #131316 0%, #050507 100%); border-radius: 8px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; font-family: -apple-system, system-ui, sans-serif; color: #fff; border: 1px solid rgba(255,255,255,0.06); }
.gci-share-info { display: grid; gap: 14px; }
.gci-share-cta { position: relative; background: linear-gradient(180deg, #FFFFFF 0%, #DCDCE0 100%); color: #0A0A0A; border: 0; border-radius: 12px; padding: 14px 18px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: transform .12s var(--gci-ease), box-shadow .18s var(--gci-ease); box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 6px 18px rgba(0,0,0,0.4); letter-spacing: -0.005em; }
.gci-share-cta:hover { box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px rgba(255,255,255,0.18); }
.gci-share-cta:active { transform: scale(0.98); }
.gci-share-meta { font-size: 12.5px; color: rgba(255,255,255,0.55); line-height: 1.55; }
.gci-share-url { font-family: ui-monospace, "SF Mono", monospace; font-size: 11px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: rgba(255,255,255,0.6); display: inline-flex; align-items: center; gap: 8px; word-break: break-all; letter-spacing: 0.02em; }

.gci-gap { margin-top: 28px; background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 100%); border: 1px solid rgba(255,255,255,0.14); border-radius: 22px; padding: 36px 28px; text-align: center; position: relative; overflow: hidden; -webkit-backdrop-filter: blur(20px) saturate(140%); backdrop-filter: blur(20px) saturate(140%); box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 24px 60px -20px rgba(0,0,0,0.6); }
.gci-gap::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); }
.gci-gap-eyebrow { font-size: 10.5px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(255,255,255,0.55); font-weight: 600; margin-bottom: 16px; font-family: ui-monospace, "SF Mono", monospace; position: relative; }
.gci-gap-line { font-size: clamp(20px, 3.4vw, 28px); font-weight: 600; line-height: 1.3; letter-spacing: -0.022em; max-width: 720px; margin: 0 auto 8px; position: relative; color: #FFFFFF; }
.gci-gap-line b { color: #FFFFFF; font-weight: 700; }
.gci-gap-annual { font-size: clamp(40px, 6vw, 64px); font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; background: linear-gradient(180deg, #FFFFFF 0%, #A8A8AC 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin: 18px 0 8px; position: relative; }
.gci-gap-annual small { font-size: 0.32em; color: rgba(255,255,255,0.45); font-weight: 600; letter-spacing: 0.04em; margin-left: 6px; -webkit-text-fill-color: rgba(255,255,255,0.45); }
.gci-gap-cta { position: relative; margin-top: 28px; background: linear-gradient(180deg, #FFFFFF 0%, #DCDCE0 100%); color: #0A0A0A; border: 0; border-radius: 14px; padding: 18px 30px; font-family: inherit; font-size: 16px; font-weight: 700; letter-spacing: -0.005em; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: transform .12s var(--gci-ease), box-shadow .18s var(--gci-ease); box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px rgba(0,0,0,0.5); }
.gci-gap-cta:hover { box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 12px 36px rgba(255,255,255,0.22); }
.gci-gap-cta:active { transform: scale(0.98); }

.gci-legal { margin-top: 36px; padding: 20px 24px; border-radius: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); font-size: 11.5px; line-height: 1.6; color: rgba(255,255,255,0.45); text-align: center; font-family: ui-monospace, "SF Mono", monospace; letter-spacing: 0.02em; }
.gci-legal-light { margin-top: 28px; font-size: 10.5px; line-height: 1.55; color: var(--l-muted); text-align: center; }

.gci-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px); background: rgba(20,20,24,0.92); border: 1px solid rgba(255,255,255,0.14); color: #fff; padding: 12px 18px; border-radius: 999px; font-size: 13px; -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); opacity: 0; pointer-events: none; transition: opacity .25s var(--gci-ease), transform .25s var(--gci-ease); z-index: 2000; box-shadow: 0 12px 36px rgba(0,0,0,0.6); }
.gci-toast.is-show { opacity: 1; transform: translateX(-50%) translateY(0); }
.gci-toast b { color: #FFFFFF; }

.gci-act-header { display: flex; align-items: center; gap: 12px; margin: 24px 0 14px; font-family: ui-monospace, "SF Mono", monospace; font-size: 10.5px; color: rgba(255,255,255,0.5); letter-spacing: 0.26em; }
.gci-act-header .gci-act-tag { background: rgba(255,255,255,0.92); color: #0A0A0A; padding: 3px 8px; border-radius: 5px; font-weight: 700; letter-spacing: 0.16em; box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset; }

.gci-intake-grid { display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 760px) { .gci-intake-grid { grid-template-columns: 1fr 1fr; gap: 16px; } .gci-intake-grid > .span2 { grid-column: 1 / -1; } }
`;
