import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "../appSupabaseClient";
import CVPassportLogo from "../components/CVPassportLogo";

// ─── DESIGN TOKENS (matches JobPage.jsx) ─────────────────────────
const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  accent: "#635bff",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  green: "#1D9E75",
  amber: "#D97706",
  navy: "#0F3460",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── HELPERS ─────────────────────────────────────────────────────
function daysAgo(date) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Posted today";
  if (d === 1) return "Posted 1 day ago";
  return `Posted ${d} days ago`;
}

function formatSalary(min, max, market) {
  const currency = market === "india" ? "INR" : "AED";
  if (!min && !max) return null;
  const fmt = (n) =>
    Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  return `Up to ${currency} ${fmt(max)}`;
}

function hiringLabel(postedAt, hiringStatus) {
  if (hiringStatus === "closed") return { color: T.muted, label: "Closed" };
  const days = Math.floor(
    (Date.now() - new Date(postedAt).getTime()) / 86400000
  );
  if (days <= 7) return { color: T.green, label: "Actively hiring" };
  if (days <= 21) return { color: T.amber, label: "Few spots left" };
  return { color: T.muted, label: "Closing soon" };
}

// ─── JOB CARD ────────────────────────────────────────────────────
function JobCard({ job, onClick }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.market);
  const status = hiringLabel(job.posted_at, job.hiring_status);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.elevated : T.surface,
        border: `1px solid ${hovered ? "#3A3A3A" : T.border}`,
        borderRadius: 14,
        padding: "24px 28px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: "0 0 6px",
            fontSize: 17,
            fontWeight: 700,
            color: T.text,
            fontFamily: T.font,
            lineHeight: 1.3,
          }}>
            {job.title}
          </h3>
          {job.company && (
            <p style={{ margin: "0 0 10px", fontSize: 13, color: T.muted, fontFamily: T.font }}>
              {job.company}
            </p>
          )}
        </div>
        {/* Hiring badge */}
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: status.color,
          background: `${status.color}18`,
          border: `1px solid ${status.color}40`,
          borderRadius: 20,
          padding: "3px 10px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontFamily: T.font,
        }}>
          {status.label}
        </span>
      </div>

      {/* Meta chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[
          job.location,
          job.job_type,
          job.market === "india" ? "India" : "Gulf / UAE",
          job.visa_sponsored ? "Visa sponsored" : null,
        ]
          .filter(Boolean)
          .map((chip) => (
            <span
              key={chip}
              style={{
                fontSize: 12,
                color: T.muted,
                background: "#1E1E1E",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: "3px 9px",
                fontFamily: T.font,
              }}
            >
              {chip}
            </span>
          ))}
      </div>

      {/* Description snippet */}
      {job.description && (
        <p style={{
          margin: "0 0 14px",
          fontSize: 13,
          color: "#808080",
          lineHeight: 1.6,
          fontFamily: T.font,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {job.description}
        </p>
      )}

      {/* Bottom row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.accent, fontFamily: T.font }}>
          {salary || "Salary not disclosed"}
        </span>
        <span style={{ fontSize: 12, color: "#555", fontFamily: T.font }}>
          {daysAgo(job.posted_at)}
        </span>
      </div>
    </div>
  );
}

// ─── SKELETON CARD ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: "24px 28px",
    }}>
      {[120, 80, 200, 60].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : i === 2 ? 13 : 13,
          width: w,
          background: "#1E1E1E",
          borderRadius: 6,
          marginBottom: i === 3 ? 0 : 12,
          animation: "pulse 1.4s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function JobsListPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [visaOnly, setVisaOnly] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("jobs")
      .select("id, title, company, location, market, job_type, salary_min, salary_max, visa_sponsored, description, hiring_status, posted_at")
      .eq("status", "published")
      .neq("hiring_status", "closed")
      .order("posted_at", { ascending: false });

    if (market !== "all") q = q.eq("market", market);
    if (jobType !== "all") q = q.eq("job_type", jobType);
    if (visaOnly) q = q.eq("visa_sponsored", true);

    const { data, error } = await q;
    if (!error && data) setJobs(data);
    setLoading(false);
  }, [market, jobType, visaOnly]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (j.title || "").toLowerCase().includes(s) ||
      (j.company || "").toLowerCase().includes(s) ||
      (j.location || "").toLowerCase().includes(s) ||
      (j.description || "").toLowerCase().includes(s)
    );
  });

  const inputStyle = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.text,
    fontSize: 14,
    fontFamily: T.font,
    padding: "10px 14px",
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <div
        style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}
        aria-hidden="true"
      >
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::placeholder { color: #555; }
        select option { background: #1C1C1C; color: #fff; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
      }}>
        <div onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <CVPassportLogo size={28} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => navigate("/auth")}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.muted,
              fontSize: 13,
              padding: "7px 16px",
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/auth?mode=signup")}
            style={{
              background: T.accent,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 16px",
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        background: `linear-gradient(180deg, #0D0D1A 0%, ${T.bg} 100%)`,
        padding: "64px 24px 48px",
        textAlign: "center",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 600,
          color: T.accent,
          background: `${T.accent}18`,
          border: `1px solid ${T.accent}40`,
          borderRadius: 20,
          padding: "4px 14px",
          marginBottom: 20,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}>
          Gulf &amp; India Jobs
        </div>
        <h1 style={{
          margin: "0 0 16px",
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 800,
          color: T.text,
          letterSpacing: -1,
          lineHeight: 1.15,
        }}>
          Find your next role<br />
          <span style={{ color: T.accent }}>in the Gulf &amp; India</span>
        </h1>
        <p style={{ margin: "0 auto 32px", fontSize: 16, color: T.muted, maxWidth: 480, lineHeight: 1.6 }}>
          {loading ? "Loading jobs…" : `${filtered.length} open ${filtered.length === 1 ? "role" : "roles"} across UAE, Saudi Arabia, Qatar &amp; India`}
        </p>

        {/* Search bar */}
        <div style={{ maxWidth: 520, margin: "0 auto", position: "relative" }}>
          <Search
            size={18}
            strokeWidth={2}
            color={T.muted}
            style={{
              position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search job title, company, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...inputStyle,
              width: "100%",
              boxSizing: "border-box",
              paddingLeft: 44,
              fontSize: 15,
              borderRadius: 12,
            }}
          />
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div style={{
        display: "flex",
        gap: 10,
        padding: "16px 24px",
        flexWrap: "wrap",
        maxWidth: 1100,
        margin: "0 auto",
        alignItems: "center",
      }}>
        <select value={market} onChange={(e) => setMarket(e.target.value)} style={inputStyle}>
          <option value="all">All markets</option>
          <option value="gulf">Gulf / UAE</option>
          <option value="india">India</option>
        </select>

        <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={inputStyle}>
          <option value="all">All types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Freelance">Freelance</option>
        </select>

        <label style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: T.muted,
          cursor: "pointer",
          userSelect: "none",
          padding: "10px 14px",
          background: visaOnly ? `${T.accent}18` : T.surface,
          border: `1px solid ${visaOnly ? T.accent : T.border}`,
          borderRadius: 10,
          transition: "all 0.15s",
        }}>
          <input
            type="checkbox"
            checked={visaOnly}
            onChange={(e) => setVisaOnly(e.target.checked)}
            style={{ accentColor: T.accent, width: 14, height: 14 }}
          />
          <span style={{ color: visaOnly ? T.accent : T.muted }}>Visa sponsored</span>
        </label>

        {(market !== "all" || jobType !== "all" || visaOnly || search) && (
          <button
            onClick={() => { setMarket("all"); setJobType("all"); setVisaOnly(false); setSearch(""); }}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              color: T.muted,
              fontSize: 13,
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            Clear filters
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#555", fontFamily: T.font }}>
          {!loading && `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── JOB GRID ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 24px 80px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: "0 0 8px" }}>No jobs found</p>
            <p style={{ fontSize: 14, color: T.muted }}>Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filtered.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => navigate(`/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        padding: "24px",
        textAlign: "center",
        fontSize: 13,
        color: "#444",
        fontFamily: T.font,
      }}>
        © {new Date().getFullYear()} CVPassport · <span
          onClick={() => navigate("/")}
          style={{ color: T.accent, cursor: "pointer" }}
        >mycvpassport.com</span>
      </div>
      </div>
      </div>

      {/* ── COMING SOON OVERLAY ── */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          fontFamily: T.font,
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "36px 28px",
            boxShadow: "0 30px 80px -30px rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: T.amber,
              marginBottom: 14,
            }}
          >
            CVPassport Jobs
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 38px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: "0 0 14px 0",
              color: T.text,
            }}
          >
            Coming Soon
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: T.muted,
              margin: "0 0 20px 0",
            }}
          >
            We&apos;re working on this. You&apos;ll be able to find Gulf
            &amp; India jobs right here — stay tuned.
          </p>
          <div
            style={{
              fontSize: 13,
              color: "#6E6E73",
              borderTop: `1px solid ${T.border}`,
              paddingTop: 16,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Your feedback matters —{" "}
            <a
              href="mailto:support@mycvpassport.com"
              style={{
                color: T.amber,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              tell us what you need
            </a>
            .
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            marginTop: 18,
            background: "transparent",
            color: T.muted,
            border: `1px solid ${T.border}`,
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 13,
            fontFamily: T.font,
            cursor: "pointer",
          }}
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
}
