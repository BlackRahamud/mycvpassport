// Shared empty state for an HR detail pane (candidate detail, job pipeline).
// A centered muted people icon above a title and body. Container styling comes
// from the existing .jpp-detail / .jpp-detail--empty classes; the wording is
// passed in so each surface keeps its own copy.

function PeopleIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function PaneEmpty({ title, body, className = "" }) {
  return (
    <aside className={`jpp-detail jpp-detail--empty ${className}`.trim()}>
      <span className="jpp-empty-icon" aria-hidden><PeopleIcon /></span>
      <h3>{title}</h3>
      <p>{body}</p>
    </aside>
  );
}
