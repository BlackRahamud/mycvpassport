import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowUpRight, Check, Download, Lightbulb, MessageCircle, Sparkles } from "lucide-react";
import { callPracticeAI, loadPracticeSession, loadPracticeTurns } from "../../lib/candidatePractice";
import InterviewerShell from "./InterviewerShell";

const TABS = [{ id: "answers", label: "Questions & answers" }, { id: "takeaways", label: "Key takeaways" }, { id: "plan", label: "Improvement plan" }];

export default function InterviewerReportPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [report, setReport] = useState(location.state?.report || null);
  const [activeTab, setActiveTab] = useState("answers");
  const [activeTurnId, setActiveTurnId] = useState(null);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");
  const [retryingReport, setRetryingReport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const row = await loadPracticeSession(sessionId);
        if (!row) throw new Error("This report could not be found in your account.");
        const answers = await loadPracticeTurns(sessionId);
        if (!live) return;
        setSession(row); setReport(row.report || report); setTurns(answers.filter((turn) => turn.answer));
        setActiveTurnId(answers.find((turn) => turn.answer)?.id || null);
        if (!row.report && !report) {
          try {
            const result = await callPracticeAI({ task: "report", sessionId });
            if (live) setReport(result.report);
          } catch (reportFailure) {
            if (live) setReportError(reportFailure.message || "The interview is ended and your answers are safe. Retry report generation when ready.");
          }
        }
      } catch (e) { if (live) setError(e.message || "Your report could not be loaded."); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
    // Session id and initial navigation state define this report load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const activeTurn = turns.find((turn) => turn.id === activeTurnId) || turns[0];
  const reportHasNoEvaluatedAnswers = /needs at least one evaluated answer/i.test(reportError);
  const retryReport = async () => {
    if (retryingReport) return;
    setRetryingReport(true);
    setReportError("");
    try {
      const result = await callPracticeAI({ task: "report", sessionId });
      setReport(result.report);
      const updatedSession = await loadPracticeSession(sessionId);
      if (updatedSession) setSession(updatedSession);
    } catch (reportFailure) {
      setReportError(reportFailure.message || "The report could not be saved. Your interview answers remain safe; try again.");
    } finally {
      setRetryingReport(false);
    }
  };
  const downloadReport = () => {
    if (!report || !session) return;
    const sections = [
      `Interview practice report: ${session.role_title}`,
      `Overall score: ${report.overall_score}/100`,
      "", report.summary, "",
      "Strongest areas", ...(report.strongest_areas || []).map((x) => `• ${x}`), "",
      "Areas to improve", ...(report.areas_to_improve || []).map((x) => `• ${x}`), "",
      "Improvement plan", ...(report.improvement_plan || []).map((x) => `• ${x.topic}: ${x.action}`),
      "", "Questions and answers", ...turns.map((t, i) => `${i + 1}. ${t.question}\nYour answer: ${t.answer}\nScore: ${t.evaluation?.score ?? "Not evaluated"}/100`),
    ];
    const blob = new Blob([sections.join("\n")], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = href; anchor.download = `interview-report-${session.role_title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`; anchor.click(); URL.revokeObjectURL(href);
  };

  if (loading) return <InterviewerShell><div className="civ-panel civ-empty">Preparing your report…</div></InterviewerShell>;
  if (error) return <InterviewerShell><div className="civ-panel civ-empty"><h2>Report unavailable</h2><p>{error}</p><Link className="civ-button civ-button--outline" to="/interviewer/history">My interviews</Link></div></InterviewerShell>;

  return <InterviewerShell>
    <div className="civ-report-top"><Link className="civ-room-back" to="/interviewer/history">← My interviews</Link><div className="civ-report-actions"><button type="button" className="civ-button civ-button--outline" onClick={downloadReport} disabled={!report}><Download size={16} /> Download report</button><Link className="civ-button civ-button--primary" to="/interviewer/setup">Practise again <ArrowUpRight size={16} /></Link></div></div>
    <div className="civ-report-title"><span className="civ-kicker"><Sparkles size={14} /> Practice complete</span><h1>{session?.role_title}</h1><p>Your answers and feedback, saved for you to revisit.</p></div>
    {!report && <section className="civ-panel civ-report-retry" aria-live="polite"><h2>Your interview is safely ended</h2><p>{reportError || "Your answers are saved. The report is not ready yet."}</p>{!reportHasNoEvaluatedAnswers && <button type="button" className="civ-button civ-button--primary" onClick={retryReport} disabled={retryingReport}>{retryingReport ? "Retrying report…" : "Retry report generation"}</button>}<Link className="civ-button civ-button--outline" to="/interviewer/history">Return to interview history</Link></section>}
    {report && <section className="civ-report-summary"><div className="civ-score-ring" style={{ "--score-pct": `${report.overall_score || 0}%` }}><div><b>{report.overall_score ?? "—"}</b><span>out of 100</span></div></div><div className="civ-report-summary__copy"><h2>Interview performance</h2><p>{report.summary}</p><div className="civ-category-scores">{Object.entries(report.category_scores || {}).map(([name, score]) => <span key={name}><b>{score}</b> {name.replace(/_/g, " ")}</span>)}</div></div></section>}
    <div className="civ-report-tabs" role="tablist" aria-label="Report sections">{TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>
    {activeTab === "answers" && <div className="civ-report-answers"><nav className="civ-report-question-list" aria-label="Interview questions">{turns.map((turn, i) => <button key={turn.id} type="button" className={activeTurn?.id === turn.id ? "is-active" : ""} onClick={() => setActiveTurnId(turn.id)}><span>{String(i + 1).padStart(2, "0")}</span><b>{turn.question}</b><strong>{turn.evaluation?.score ?? "—"}</strong></button>)}</nav>{activeTurn && <article className="civ-answer-detail"><span className="civ-label">Your answer</span><h2>{activeTurn.question}</h2><blockquote>{activeTurn.answer}</blockquote>{activeTurn.evaluation && <><div className="civ-answer-detail__score"><b>{activeTurn.evaluation.score}/100</b><span>Answer score</span></div><div className="civ-answer-rubric"><b>Evaluation criteria</b><div>{Object.entries(activeTurn.evaluation.criteria || {}).filter(([, score]) => score != null).map(([criterion, score]) => <span key={criterion}><strong>{score}/5</strong>{criterion}</span>)}</div></div><div className="civ-feedback-columns"><section><h3>What worked</h3>{activeTurn.evaluation.strengths?.length ? <ul>{activeTurn.evaluation.strengths.map((x) => <li key={x}><Check size={15} />{x}</li>)}</ul> : <p>Keep using clear, relevant examples.</p>}</section><section><h3>Try next time</h3>{activeTurn.evaluation.improvements?.length ? <ul>{activeTurn.evaluation.improvements.map((x) => <li key={x}><Lightbulb size={15} />{x}</li>)}</ul> : <p>Your answer covered the main points.</p>}</section></div>{activeTurn.evaluation.missing_evidence?.length > 0 && <div className="civ-feedback-note"><b>Evidence to add</b><p>{activeTurn.evaluation.missing_evidence.join(" · ")}</p></div>}<div className="civ-suggested-answer"><h3><MessageCircle size={16} /> Example of a stronger answer</h3><p>{activeTurn.evaluation.suggested_answer}</p><small>Use this as a guide. Keep your own experience and details accurate.</small></div></>}</article>}</div>}
    {activeTab === "takeaways" && <div className="civ-takeaway-grid"><section className="civ-panel"><h2>Strongest areas</h2>{report?.strongest_areas?.length ? <ul>{report.strongest_areas.map((x) => <li key={x}><Check size={16} />{x}</li>)}</ul> : <p>Use the answer feedback to identify what felt strongest.</p>}</section><section className="civ-panel"><h2>Areas to improve</h2>{report?.areas_to_improve?.length ? <ul>{report.areas_to_improve.map((x) => <li key={x}><Lightbulb size={16} />{x}</li>)}</ul> : <p>Keep practising with specific examples and clear structure.</p>}</section><section className="civ-panel civ-panel--wide"><h2>What stood out</h2>{report?.observations?.length ? <ul>{report.observations.map((x) => <li key={x}>{x}</li>)}</ul> : <p>Your interview report is based on the answers you submitted.</p>}</section></div>}
    {activeTab === "plan" && <div className="civ-plan-list">{report?.improvement_plan?.length ? report.improvement_plan.map((item, i) => <article className="civ-plan-item" key={`${item.topic}-${i}`}><span>{String(i + 1).padStart(2, "0")}</span><div><h2>{item.topic}</h2><p>{item.action}</p></div></article>) : <div className="civ-panel civ-empty"><h2>Keep building your confidence</h2><p>Review your answer feedback and practise again with a new role focus.</p></div>}</div>}
  </InterviewerShell>;
}
