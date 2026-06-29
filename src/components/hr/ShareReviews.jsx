// =============================================================
// ShareReviews
//
// Surfaces external reviewer feedback (Phase B) on the candidate it belongs
// to, inside the job-pipeline candidate detail view. Self-fetching like
// InterviewTimeline / OutreachHistory: given an application id, it reads
// share_feedback for the recruiter's own shares of that application.
//
// RLS on share_feedback is owner-only select (the row's share must resolve to
// candidate_shares.created_by = auth.uid()), so this only ever returns the
// signed-in recruiter's own feedback. Renders nothing when there is none.
// =============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../appSupabaseClient";

function timeAgo(s) {
  const t = new Date(s).getTime();
  if (!t) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

const VERDICT = {
  approve: { label: "Approved for interview", fg: "#047857", bg: "#ECFDF5", dot: "#10B981" },
  pass: { label: "Passed", fg: "#B91C1C", bg: "#FEF2F2", dot: "#DC2626" },
};

export default function ShareReviews({ applicationId }) {
  const [items, setItems] = useState(null); // null = loading

  useEffect(() => {
    if (!applicationId) { setItems([]); return undefined; }
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("share_feedback")
        .select("id, vote, feedback_text, created_at, candidate_shares!inner(application_id)")
        .eq("candidate_shares.application_id", applicationId)
        .order("created_at", { ascending: false });
      if (live) setItems(Array.isArray(data) ? data : []);
    })();
    return () => { live = false; };
  }, [applicationId]);

  if (!items || items.length === 0) return null;

  return (
    <section className="jpp-section">
      <h3 className="jpp-section__title">External reviews</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((r) => {
          const v = VERDICT[r.vote] || VERDICT.pass;
          return (
            <div key={r.id} style={{
              border: "1px solid var(--pj-border)", borderRadius: "var(--pj-radius-md)",
              padding: "12px 14px", background: "var(--pj-surface)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: v.bg, color: v.fg, padding: "3px 10px", borderRadius: 999,
                  fontSize: 12, fontWeight: 600, fontFamily: "var(--pj-font)",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.dot }} />
                  {v.label}
                </span>
                <span style={{ fontSize: 12, color: "var(--pj-muted)", fontFamily: "var(--pj-font)" }}>{timeAgo(r.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--pj-text)", lineHeight: 1.5, fontFamily: "var(--pj-font)", whiteSpace: "pre-wrap" }}>
                {r.feedback_text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
