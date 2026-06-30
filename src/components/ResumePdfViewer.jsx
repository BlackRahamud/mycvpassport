// =============================================================
// ResumePdfViewer
//
// Shared CV embed used by both the public share page (inside .shared-cand,
// where the --card/--border/--wash/--accent tokens resolve) and the
// recruiter CV drawer (where they fall back to neutral light values). It is
// the read surface only: each caller supplies its own header / download
// control around it.
//
// Mobile browsers (Safari + Chrome on phones) frequently refuse to render a
// PDF inside an iframe and show a blank box, so on mobile we skip the embed
// and show a clear "open CV" button instead. Desktop embeds inline, with an
// open-in-new-tab fallback.
// =============================================================
const IS_MOBILE = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

function DocIc({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export default function ResumePdfViewer({ src, height = "min(70vh, 640px)", accent = "#14131F" }) {
  if (!src) {
    return (
      <div style={{
        background: "var(--wash, #F4F4F7)", border: "1px solid var(--border, #E7E7EE)",
        borderRadius: 6, padding: "22px 24px", fontSize: 13, color: "var(--muted, #8A8A9B)",
      }}>This candidate has no resume file attached.</div>
    );
  }

  if (IS_MOBILE) {
    // Mobile read path: open the CV in the phone's native viewer.
    return (
      <a className="snap" href={src} target="_blank" rel="noreferrer noopener" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        background: accent, color: "#fff", textDecoration: "none",
        borderRadius: "var(--radius, 10px)", padding: "14px 18px", fontSize: 14, fontWeight: 600,
      }}>
        <DocIc /> Open CV
      </a>
    );
  }

  return (
    <>
      <iframe
        title="Resume preview"
        src={src}
        style={{ width: "100%", height, border: "1px solid var(--border, #E7E7EE)", borderRadius: 6, background: "var(--wash, #F4F4F7)", display: "block" }}
      />
      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted, #8A8A9B)" }}>
        Cannot see the CV here?{" "}
        <a href={src} target="_blank" rel="noreferrer noopener" style={{ color: "var(--text, #14131F)", textDecoration: "none", borderBottom: "1px solid var(--border, #E7E7EE)" }}>Open it in a new tab</a>.
      </div>
    </>
  );
}
