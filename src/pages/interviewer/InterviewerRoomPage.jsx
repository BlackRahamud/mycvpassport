import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AudioLines, Check, ChevronRight, Lightbulb, LoaderCircle, Mic, MicOff, Pause, Play, Volume2 } from "lucide-react";
import { callPracticeAI, loadPracticeSession, loadPracticeTurns } from "../../lib/candidatePractice";
import InterviewerShell from "./InterviewerShell";

function SpeechApi() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function InterviewerRoomPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ready");
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const [showTip, setShowTip] = useState(true);
  const [timer, setTimer] = useState(0);
  const recognitionRef = useRef(null);
  const transcriptBaseRef = useRef("");
  const speechSupported = Boolean(SpeechApi());

  const refresh = useCallback(async () => {
    const [nextSession, nextTurns] = await Promise.all([loadPracticeSession(sessionId), loadPracticeTurns(sessionId)]);
    if (!nextSession) throw new Error("This interview could not be found in your account.");
    setSession(nextSession); setTurns(nextTurns);
    return { nextSession, nextTurns };
  }, [sessionId]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        let { nextSession, nextTurns } = await refresh();
        if (nextSession.status === "completed") { navigate(`/interviewer/report/${sessionId}`, { replace: true }); return; }
        if (!nextTurns.length) {
          setBusy(true);
          await callPracticeAI({ task: "generate", sessionId });
          ({ nextSession, nextTurns } = await refresh());
        }
        if (live && nextSession.mode === "voice" && !speechSupported) setStatus("text-fallback");
      } catch (e) { if (live) setError(e.message || "The interview could not be opened."); }
      finally { if (live) { setLoading(false); setBusy(false); } }
    })();
    return () => { live = false; recognitionRef.current?.stop?.(); window.speechSynthesis?.cancel?.(); };
  }, [refresh, sessionId, navigate, speechSupported]);

  useEffect(() => {
    if (status !== "listening") return undefined;
    const timerId = window.setInterval(() => setTimer((s) => s + 1), 1000);
    return () => window.clearInterval(timerId);
  }, [status]);

  const current = useMemo(() => turns.find((turn) => !turn.answer) || null, [turns]);
  const currentIndex = current ? turns.findIndex((turn) => turn.id === current.id) : turns.length;
  const progress = turns.length ? Math.round(((currentIndex + (current ? 0 : 1)) / turns.length) * 100) : 0;

  useEffect(() => { setDraft(""); setSelectedChoice(""); }, [current?.id]);

  const stopVoice = () => {
    recognitionRef.current?.stop?.(); recognitionRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
  };

  const readQuestion = () => {
    if (!current || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setError("Speech playback is not available in this browser."); return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(current.question);
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("ready");
    utterance.onerror = () => setStatus("ready");
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const Recognition = SpeechApi();
    if (!Recognition) { setStatus("text-fallback"); return; }
    setError(""); setTimer(0); setStatus("listening");
    transcriptBaseRef.current = draft.trim();
    const recognition = new Recognition();
    recognition.lang = "en-IN"; recognition.interimResults = true; recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const part = event.results[i][0]?.transcript || "";
        transcript += part;
      }
      setDraft(`${transcriptBaseRef.current}${transcriptBaseRef.current && transcript ? " " : ""}${transcript}`.slice(0, 12000));
    };
    recognition.onerror = (event) => {
      setStatus("text-fallback");
      setError(event.error === "not-allowed" ? "Microphone access was denied. You can type your answer instead." : "Speech recognition stopped. Check your microphone or type your answer.");
    };
    recognition.onend = () => { setStatus((old) => old === "listening" ? "ready" : old); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setStatus("text-fallback"); setError("Could not start speech recognition. Type your answer instead."); }
  };

  const pauseVoice = () => { stopVoice(); setStatus("paused"); };

  const submitAnswer = async () => {
    const answer = (selectedChoice || draft).trim();
    if (!current || !answer || busy) return;
    stopVoice(); setBusy(true); setError(""); setStatus("evaluating");
    try {
      const result = await callPracticeAI({ task: "evaluate", sessionId, turnId: current.id, answer });
      await refresh(); setDraft(""); setSelectedChoice("");
      setSubmittedFeedback({ question: current.question, answer, evaluation: result.evaluation, followUp: result.followUp });
      setStatus("review");
    } catch (e) {
      setError(e.message || "Your answer could not be evaluated yet. It is saved if submission reached the server.");
      setStatus("ready");
    } finally { setBusy(false); }
  };

  const finish = async () => {
    if (busy) return;
    stopVoice(); setBusy(true); setError("");
    try {
      const result = await callPracticeAI({ task: "report", sessionId });
      navigate(`/interviewer/report/${sessionId}`, { state: { report: result.report } });
    } catch (e) { setError(e.message || "The report could not be created. Your answers remain saved."); }
    finally { setBusy(false); }
  };

  const mmss = `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`;
  if (loading) return <InterviewerShell showNav={false}><div className="civ-panel civ-empty"><LoaderCircle className="civ-spin" size={22} />Preparing your interview…</div></InterviewerShell>;
  if (error && !session) return <InterviewerShell showNav={false}><div className="civ-panel civ-empty"><h2>Interview unavailable</h2><p>{error}</p><Link className="civ-button civ-button--outline" to="/interviewer/history">My interviews</Link></div></InterviewerShell>;
  const feedbackCard = submittedFeedback && <section className="civ-live-feedback" aria-live="polite"><div className="civ-live-feedback__head"><span><Check size={16} /> Answer reviewed</span><b>{submittedFeedback.evaluation.score}/100</b></div><p className="civ-live-feedback__question">{submittedFeedback.question}</p>{submittedFeedback.evaluation.strengths?.[0] && <p><strong>Strength:</strong> {submittedFeedback.evaluation.strengths[0]}</p>}{submittedFeedback.evaluation.improvements?.[0] && <p><strong>Try next:</strong> {submittedFeedback.evaluation.improvements[0]}</p>}{submittedFeedback.followUp && <p className="civ-live-feedback__followup">A follow-up question will clarify one part of your answer.</p>}<button type="button" className="civ-button civ-button--outline" onClick={() => setSubmittedFeedback(null)}>Continue to next question <ChevronRight size={15} /></button></section>;
  if (!current && session) return <InterviewerShell showNav={false}><div className="civ-end-state"><div className="civ-panel civ-empty"><h2>You have answered every question</h2><p>Your responses are saved. Create your report when you are ready.</p>{error && <p className="civ-error">{error}</p>}<button className="civ-button civ-button--primary" type="button" disabled={busy} onClick={finish}>{busy ? "Preparing report…" : "Finish interview and view report"}</button></div>{feedbackCard}</div></InterviewerShell>;

  const completedQuestions = turns.filter((turn) => turn.answer).length;
  const answerArea = <div className="civ-answer"><label htmlFor="civ-answer">Your answer</label>{current?.choices?.length > 0 && <fieldset className="civ-choices"><legend>Choose an option or write your own response</legend>{current.choices.map((choice) => <button key={choice} type="button" className={`civ-choice${selectedChoice === choice ? " is-selected" : ""}`} onClick={() => { setSelectedChoice(choice); setDraft(""); }}>{choice}</button>)}</fieldset>}<textarea id="civ-answer" value={draft} onChange={(e) => { setDraft(e.target.value); setSelectedChoice(""); }} placeholder="Use a specific example. You can edit your response before submitting." rows={6} maxLength={12000} /><div className="civ-answer__meta">{(selectedChoice || draft).length.toLocaleString()} characters</div><button className="civ-button civ-button--primary" type="button" onClick={submitAnswer} disabled={busy || Boolean(submittedFeedback) || !(selectedChoice || draft).trim()}>{busy ? "Evaluating your answer…" : "Submit answer"}<ChevronRight size={16} /></button></div>;

  return <InterviewerShell showNav={false} backTo="/interviewer/history">
    <div className="civ-room-head"><div><Link to="/interviewer/history" className="civ-room-back">← My interviews</Link><h1>{session?.role_title}</h1><p>{session?.mode === "voice" ? "Voice interview" : "Text interview"} · {session?.difficulty}</p></div><button className="civ-button civ-button--quiet" type="button" onClick={finish} disabled={busy}>End interview</button></div>
    <div className="civ-progress"><div className="civ-progress__label"><span>Interview progress</span><b>{Math.min(completedQuestions + 1, turns.length)} of {turns.length}</b></div><div className="civ-progress__track"><span style={{ width: `${progress}%` }} /></div></div>
    {session?.mode === "voice" ? <div className="civ-voice-layout">
      <section className="civ-voice-stage"><div className="civ-voice-stage__badge"><span /> AI interviewer</div><div className={`civ-interviewer-portrait civ-voice-visual--${status}`} role="img" aria-label="Illustration of a professional female interviewer"><img className="civ-interviewer-portrait__image" src="/assets/interviewer-portrait.png" alt="Professional female interviewer" /><div className="civ-voice-status" aria-live="polite">{status === "listening" ? <><AudioLines size={17} /> Listening · {mmss}</> : status === "speaking" ? <><Volume2 size={17} /> Reading question</> : status === "paused" ? <><Pause size={16} /> Paused</> : status === "evaluating" ? <><LoaderCircle className="civ-spin" size={16} /> Reviewing answer</> : <><AudioLines size={17} /> {speechSupported ? "Ready when you are" : "Use text input in this browser"}</>}</div></div></section>
      <section className="civ-voice-side">{feedbackCard}<div className="civ-question-panel"><span className="civ-label">{current.is_follow_up ? "Follow-up question" : `Question ${currentIndex + 1}`}</span><h2>{current.question}</h2><button type="button" className="civ-text-button" onClick={readQuestion}><Volume2 size={15} /> Read question aloud</button></div><div className="civ-waveform" aria-label="Microphone audio activity" role="img">{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ "--bar-height": `${12 + ((index * 37) % 32)}px` }} />)}</div><div className="civ-voice-controls">{speechSupported ? status === "listening" ? <button type="button" className="civ-button civ-button--outline" onClick={pauseVoice}><Pause size={16} /> Pause</button> : status === "paused" ? <button type="button" className="civ-button civ-button--outline" onClick={startListening}><Play size={16} /> Resume microphone</button> : <button type="button" className="civ-button civ-button--outline" onClick={startListening} disabled={busy || Boolean(submittedFeedback)}><Mic size={16} /> Start microphone</button> : <span><MicOff size={15} /> Speech recognition unavailable</span>}<span className="civ-voice-timer">{mmss}</span></div>{answerArea}{error && <p className="civ-error" role="alert">{error}</p>}</section>
    </div> : <div className="civ-text-layout"><section className="civ-conversation" aria-label="Interview conversation"><div className="civ-conversation__scroll">{turns.filter((turn) => turn.answer).map((turn) => <div className="civ-exchange" key={turn.id}><div className="civ-message civ-message--interviewer"><span>INTERVIEWER</span><p>{turn.question}</p></div><div className="civ-message civ-message--candidate"><span>YOU</span><p>{turn.answer}</p>{turn.evaluation && <span className="civ-score-pill">{turn.evaluation.score}/100</span>}</div></div>)}<div className="civ-message civ-message--interviewer civ-message--current"><span>INTERVIEWER · {current.is_follow_up ? "FOLLOW-UP" : "CURRENT QUESTION"}</span><p>{current.question}</p></div></div></section><aside className="civ-coach"><div className="civ-coach__head"><Lightbulb size={17} /><b>Coaching tools</b></div><button type="button" className="civ-tip-toggle" aria-expanded={showTip} onClick={() => setShowTip((value) => !value)}><span><b>STAR structure</b><small>Use Situation, Task, Action and Result for experience questions.</small></span><span className={`civ-switch${showTip ? " is-on" : ""}`} /></button>{showTip && <div className="civ-star"><span><b>S</b> Situation</span><span><b>T</b> Task</span><span><b>A</b> Action</span><span><b>R</b> Result</span></div>}{error && <p className="civ-error" role="alert">{error}</p>}</aside><section className="civ-text-compose">{feedbackCard}{answerArea}</section></div>}
  </InterviewerShell>;
}

