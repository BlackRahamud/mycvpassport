// =============================================================
// NoteText — recruiter note / review text with URLs collapsed into
// compact link chips instead of raw multi-line URL soup.
//
// Own share links (…/shared/candidate/…) label as "Shared candidate";
// anything else shows its domain. Chips open in a new tab and keep the
// full URL on hover / long-press via the title attribute. Plain anchors
// only — no window.open, so the portal's gesture rule is untouched.
// =============================================================

const URL_RE = /https?:\/\/[^\s<>"']+/g;

const LinkIc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

function chipLabel(url) {
  try {
    const u = new URL(url);
    const ownHost = /(^|\.)mycvpassport\.com$/i.test(u.hostname)
      || (typeof window !== "undefined" && u.origin === window.location.origin);
    if (ownHost && u.pathname.startsWith("/shared/")) return "Shared candidate";
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return "link";
  }
}

export default function NoteText({ text }) {
  const s = String(text || "");
  const parts = [];
  let last = 0;
  let key = 0;
  URL_RE.lastIndex = 0;
  let m;
  while ((m = URL_RE.exec(s))) {
    // Trailing punctuation belongs to the sentence, not the URL.
    const url = m[0].replace(/[.,;:!?)\]]+$/, "");
    if (!url) continue;
    if (m.index > last) parts.push(s.slice(last, m.index));
    parts.push(
      <a
        key={`u${key++}`}
        className="jpp-notelink"
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        title={url}
      >
        <LinkIc />
        <span className="jpp-notelink__label">{chipLabel(url)}</span>
        <span aria-hidden="true">↗</span>
      </a>
    );
    last = m.index + url.length;
    URL_RE.lastIndex = last;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}
