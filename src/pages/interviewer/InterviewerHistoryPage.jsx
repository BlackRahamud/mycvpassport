import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AudioLines, Clock3, FileText, Plus, Trash2 } from "lucide-react";
import { deletePracticeSession, loadPracticeSessions } from "../../lib/candidatePractice";
import InterviewerShell from "./InterviewerShell";

export default function InterviewerHistoryPage({ user }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    loadPracticeSessions(user.id).then(setItems).catch(() => setError("Your interviews could not be loaded. Refresh to try again.")).finally(() => setLoading(false));
  }, [user.id]);
  useEffect(() => { refresh(); }, [refresh]);
  const remove = async (id) => {
    if (!window.confirm("Delete this practice interview and its answers? This cannot be undone.")) return;
    try { await deletePracticeSession(id); setItems((rows) => rows.filter((row) => row.id !== id)); }
    catch { setError("This interview could not be deleted. Try again."); }
  };
  return <InterviewerShell>
    <div className="civ-heading"><div><span className="civ-kicker"><Clock3 size={14} /> Your practice history</span><h1>My interviews</h1><p>Continue an in-progress session or review a completed report.</p></div><Link className="civ-button civ-button--primary" to="/interviewer/setup"><Plus size={16} /> New practice</Link></div>
    {error && <p className="civ-error" role="alert">{error}</p>}
    {loading ? <div className="civ-panel civ-empty">Loading your interviews…</div> : items.length === 0 ? <div className="civ-panel civ-empty"><span className="civ-empty__icon"><AudioLines size={22} /></span><h2>Your practice history starts here</h2><p>Prepare with your CV and a target role. Your sessions and feedback remain private to your account.</p><Link className="civ-button civ-button--primary" to="/interviewer/setup">Set up an interview</Link></div> : <div className="civ-history-list">{items.map((item) => <article className="civ-history-row" key={item.id}><span className="civ-history-icon">{item.mode === "voice" ? <AudioLines size={19} /> : <FileText size={19} />}</span><div className="civ-history-info"><h2>{item.role_title}</h2><p>{new Date(item.created_at).toLocaleDateString()} · {item.mode === "voice" ? "Voice" : "Text"} · {item.difficulty}</p></div><span className={`civ-status civ-status--${item.status}`}>{item.status === "completed" ? (item.report ? `${item.report.overall_score ?? "Done"}/100` : "Ended · report pending") : item.status === "in_progress" ? "In progress" : "Ready"}</span><Link className="civ-button civ-button--outline" to={item.status === "completed" ? `/interviewer/report/${item.id}` : `/interviewer/session/${item.id}`}>{item.status === "completed" ? (item.report ? "View report" : "Retry report") : "Continue"}</Link><button type="button" className="civ-icon-button" onClick={() => remove(item.id)} aria-label={`Delete ${item.role_title}`}><Trash2 size={17} /></button></article>)}</div>}
  </InterviewerShell>;
}
