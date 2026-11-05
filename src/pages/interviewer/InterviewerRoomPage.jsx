import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AudioLines, Check, ChevronRight, Lightbulb, LoaderCircle, Mic, Pause, Play } from "lucide-react";
import { callPracticeAI, loadPracticeSession, loadPracticeTurns } from "../../lib/candidatePractice";
import useDeepgramStream from "../../lib/useDeepgramStream";
import useDeepgramTts from "../../lib/useDeepgramTts";
import { initialPracticeVoiceState, practiceVoiceReducer } from "../../lib/practiceInterviewVoiceMachine";
import InterviewerShell from "./InterviewerShell";

export default function InterviewerRoomPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [manualTextFallback, setManualTextFallback] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceState, dispatchVoice] = useReducer(practiceVoiceReducer, initialPracticeVoiceState);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const [showTip, setShowTip] = useState(true);
  const [timer, setTimer] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const voiceEnabledRef = useRef(false);
  const playbackSequenceRef = useRef(0);
  const busyRef = useRef(false);
  const activeAnswerIdRef = useRef(null);
  const currentTurnIdRef = useRef(null);
  const voice = useDeepgramStream();
  const { speak: speakTts, cancel: cancelTts, error: ttsError, status: ttsStatus } = useDeepgramTts();
  const current = useMemo(() => turns.find((turn) => !turn.answer) || null, [turns]);
  const currentIndex = current ? turns.findIndex((turn) => turn.id === current.id) : turns.length;
  const progress = turns.length ? Math.round(((currentIndex + (current ? 0 : 1)) / turns.length) * 100) : 0;

  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  const refresh = useCallback(async () => {
    const [nextSession, nextTurns] = await Promise.all([loadPracticeSession(sessionId), loadPracticeTurns(sessionId)]);
    if (!nextSession) throw new Error("This interview could not be found in your account.");
    setSession(nextSession);
    setTurns(nextTurns);
    currentTurnIdRef.current = nextTurns.find((turn) => !turn.answer)?.id || null;
    return { nextSession, nextTurns };
  }, [sessionId]);

  const speakQuestion = useCallback((question, questionId) => {
    if (!question || !voiceEnabledRef.current) return;
    playbackSequenceRef.current += 1;
    const playbackId = playbackSequenceRef.current;
    setPlaybackError("");
    dispatchVoice({ type: "QUESTION_SPEAK" });
    cancelTts();
    speakTts(question, () => {
      if (playbackId !== playbackSequenceRef.current || currentTurnIdRef.current !== questionId || !voiceEnabledRef.current) return;
      dispatchVoice({ type: "SPEECH_FINISHED" });
    }).then((played) => {
      if (played || playbackId !== playbackSequenceRef.current || currentTurnIdRef.current !== questionId || !voiceEnabledRef.current) return;
      const message = ttsError || "Question audio could not play. Read the question and start when you're ready.";
      setPlaybackError(message);
      dispatchVoice({ type: "SPEECH_FAILED", message });
    });
  }, [cancelTts, speakTts, ttsError]);

  const startVoiceInterview = () => {
    if (voiceEnabledRef.current || busyRef.current || !current) return;
    voiceEnabledRef.current = true;
    setVoiceEnabled(true);
    dispatchVoice({ type: "START" });
    setError("");
    speakQuestion(current.question, current.id);
  };

  const startAnswer = async () => {
    if (!current || busyRef.current || voiceState.phase !== "ready") return;
    activeAnswerIdRef.current = current.id;
    setDraft("");
    setSelectedChoice("");
    setManualTextFallback(false);
    setError("");
    dispatchVoice({ type: "START_ANSWER", answerId: current.id });
    const started = await voice.start(current.id);
    if (!started) {
      dispatchVoice({ type: "ERROR", message: voice.error || "Voice connection failed. Retry or type your answer instead." });
      return;
    }
  };

  const pauseVoice = () => {
    if (voiceState.phase !== "listening") return;
    voice.pause();
    dispatchVoice({ type: "PAUSE", answerId: activeAnswerIdRef.current });
  };

  const resumeVoice = async () => {
    const answerId = activeAnswerIdRef.current;
    if (!answerId || (voiceState.phase !== "paused" && voiceState.phase !== "error")) return;
    setError("");
    dispatchVoice({ type: "RESUME", answerId });
    const resumed = await voice.resume(answerId);
    if (!resumed) {
      dispatchVoice({ type: "ERROR", message: voice.error || "Voice could not resume. Your transcript is preserved; retry or type your answer." });
      return;
    }
  };

  const submitAnswer = async (answerOverride, source = "text") => {
    const answer = (answerOverride ?? selectedChoice ?? draft).trim().slice(0, 12000);
    if (!current || !answer || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    const answerId = current.id;
    if (source === "text") dispatchVoice({ type: "SUBMIT_TEXT", answerId });
    try {
      const result = await callPracticeAI({ task: "evaluate", sessionId, turnId: answerId, answer });
      const { nextTurns } = await refresh();
      setDraft("");
      setSelectedChoice("");
      setManualTextFallback(false);
      activeAnswerIdRef.current = null;
      setSubmittedFeedback({ question: current.question, answer, evaluation: result.evaluation, followUp: result.followUp });
      dispatchVoice({ type: "EVALUATION_DONE", answerId });
      if (voiceEnabledRef.current) {
        const next = nextTurns.find((turn) => !turn.answer);
        if (next) speakQuestion(next.question, next.id);
      }
    } catch (submitError) {
      setError(submitError.message || "Your answer could not be reviewed. Any saved answer is safe; retry to continue.");
      dispatchVoice({ type: "ERROR", answerId, message: submitError.message || "Your answer could not be reviewed. The transcript is saved here; retry submission or edit it." });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const finishAnswer = async () => {
    if (voiceState.phase !== "listening" && voiceState.phase !== "paused" && voiceState.phase !== "error") return;
    const answerId = activeAnswerIdRef.current;
    if (!answerId || answerId !== current?.id || busyRef.current) return;
    dispatchVoice({ type: "FINISH_ANSWER", answerId });
    const result = await voice.finish();
    if (!result || result.answerId !== answerId) return;
    const frozenTranscript = result.transcript.slice(0, 12000);
    setDraft(frozenTranscript);
    setSelectedChoice("");
    if (result.error || !frozenTranscript) {
      const message = result.error || "No transcript was received. You can type your answer or retry voice.";
      setError(message);
      dispatchVoice({ type: "ERROR", answerId, message });
      return;
    }
    dispatchVoice({ type: "TRANSCRIPT_FINALIZED", answerId });
    await submitAnswer(frozenTranscript, "voice");
  };

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        let { nextSession, nextTurns } = await refresh();
        if (nextSession.status === "completed") {
          navigate(`/interviewer/report/${sessionId}`, { replace: true });
          return;
        }
        if (!nextTurns.length) {
          setBusy(true);
          await callPracticeAI({ task: "generate", sessionId });
          ({ nextSession, nextTurns } = await refresh());
        }
        if (live) setSession(nextSession);
      } catch (loadError) {
        if (live) setError(loadError.message || "The interview could not be opened.");
      } finally {
        if (live) { setLoading(false); setBusy(false); }
      }
    })();
    return () => {
      live = false;
      voiceEnabledRef.current = false;
      playbackSequenceRef.current += 1;
      cancelTts();
    };
  }, [refresh, sessionId, navigate, cancelTts]);

  useEffect(() => {
    if (voiceState.phase !== "listening") return undefined;
    const timerId = window.setInterval(() => setTimer((value) => value + 1), 1000);
    return () => window.clearInterval(timerId);
  }, [voiceState.phase]);

  useEffect(() => {
    setDraft("");
    setSelectedChoice("");
    setManualTextFallback(false);
    setTimer(0);
  }, [current?.id]);

  useEffect(() => {
    if (!current || current.id !== activeAnswerIdRef.current) return;
    if (voice.status === "listening" || voice.status === "connecting" || voice.status === "finalizing" || voice.status === "paused") {
      const visibleTranscript = [voice.transcript, voice.interimTranscript].filter(Boolean).join(" ").slice(0, 12000);
      setDraft(visibleTranscript);
    }
    if (voice.status === "error" && voice.error) {
      setError(voice.error);
      dispatchVoice({ type: "ERROR", answerId: current.id, message: voice.error });
    }
  }, [current, voice.status, voice.transcript, voice.interimTranscript, voice.error]);

  const endInterview = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    voiceEnabledRef.current = false;
    setVoiceEnabled(false);
    playbackSequenceRef.current += 1;
    voice.dispose();
    cancelTts();
    dispatchVoice({ type: "END" });
    try {
      await callPracticeAI({ task: "end", sessionId });
      navigate(`/interviewer/report/${sessionId}`);
    } catch (endError) {
      setError(endError.message || "The interview could not be ended. Your saved answers are unchanged; please retry.");
      dispatchVoice({ type: "ERROR", message: endError.message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const statusCopy = {
    ready: "Ready — start your answer when you are",
    speaking: "AI interviewer is speaking · microphone off",
    listening: "Listening to your answer",
    paused: "Answer paused · transcript preserved",
    finalizing: "Finalizing transcript · microphone off",
    evaluating: "Reviewing your answer · microphone off",
    error: "Voice interrupted · transcript preserved",
    ended: "Interview ended",
  };
  const mmss = `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`;

  if (loading) return <InterviewerShell showNav={false}><div className="civ-panel civ-empty"><LoaderCircle className="civ-spin" size={22} />Preparing your interview…</div></InterviewerShell>;
  if (error && !session) return <InterviewerShell showNav={false}><div className="civ-panel civ-empty"><h2>Interview unavailable</h2><p>{error}</p><Link className="civ-button civ-button--outline" to="/interviewer/history">My interviews</Link></div></InterviewerShell>;

  const feedbackCard = submittedFeedback && <section className="civ-live-feedback" aria-live="polite"><div className="civ-live-feedback__head"><span><Check size={16} /> Answer reviewed</span><b>{submittedFeedback.evaluation.score}/100</b></div><p className="civ-live-feedback__question">{submittedFeedback.question}</p>{submittedFeedback.evaluation.strengths?.[0] && <p><strong>Strength:</strong> {submittedFeedback.evaluation.strengths[0]}</p>}{submittedFeedback.evaluation.improvements?.[0] && <p><strong>Try next:</strong> {submittedFeedback.evaluation.improvements[0]}</p>}{submittedFeedback.followUp && <p className="civ-live-feedback__followup">A follow-up question will clarify one part of your answer.</p>}<button type="button" className="civ-button civ-button--outline" onClick={() => setSubmittedFeedback(null)}>Continue <ChevronRight size={15} /></button></section>;
  if (!current && session) return <InterviewerShell showNav={false}><div className="civ-end-state"><div className="civ-panel civ-empty"><h2>You have answered every question</h2><p>Your responses are saved. End the interview to open your report. Report generation can be retried later.</p>{error && <p className="civ-error" role="alert">{error}</p>}<button className="civ-button civ-button--primary" type="button" disabled={busy} onClick={endInterview}>{busy ? "Ending interview…" : "End interview and view report"}</button><Link className="civ-button civ-button--outline" to="/interviewer/history">My interviews</Link></div>{feedbackCard}</div></InterviewerShell>;

  const completedQuestions = turns.filter((turn) => turn.answer).length;
  const canSubmitAnswer = session?.mode !== "voice" || !voiceEnabled || !activeAnswerIdRef.current || voice.status === "idle" || (voiceState.phase === "error" && manualTextFallback);
  const answerArea = <div className="civ-answer"><label htmlFor="civ-answer">{voiceState.phase === "listening" ? "Live transcript" : "Your answer"}</label>{current?.choices?.length > 0 && <fieldset className="civ-choices" disabled={busy || voiceState.phase === "speaking" || voiceState.phase === "listening" || voiceState.phase === "finalizing" || voiceState.phase === "evaluating"}><legend>Choose an option or write your own response</legend>{current.choices.map((choice) => <button key={choice} type="button" className={`civ-choice${selectedChoice === choice ? " is-selected" : ""}`} onClick={() => { setSelectedChoice(choice); setDraft(""); setManualTextFallback(true); }}>{choice}</button>)}</fieldset>}<textarea id="civ-answer" value={draft} onChange={(event) => { setDraft(event.target.value); setSelectedChoice(""); setManualTextFallback(true); }} placeholder={voiceState.phase === "listening" ? "Your live transcript appears here…" : "Use a specific example. You can edit your response before submitting."} rows={6} maxLength={12000} readOnly={voiceState.phase === "listening" || voiceState.phase === "speaking" || voiceState.phase === "finalizing" || voiceState.phase === "evaluating" || voice.status === "connecting" || voice.status === "finalizing"} /><div className="civ-answer__meta">{(selectedChoice || draft).length.toLocaleString()} characters</div>{canSubmitAnswer && <button className="civ-button civ-button--primary" type="button" onClick={() => submitAnswer(undefined, "text")} disabled={busy || Boolean(submittedFeedback) || !(selectedChoice || draft).trim() || voiceState.phase === "listening" || voiceState.phase === "speaking" || voiceState.phase === "finalizing" || voiceState.phase === "evaluating"}>{busy ? "Evaluating your answer…" : "Submit answer"}<ChevronRight size={16} /></button>}</div>;

  return <InterviewerShell showNav={false} backTo="/interviewer/history">
    <div className="civ-room-head"><div><Link to="/interviewer/history" className="civ-room-back">← My interviews</Link><h1>{session?.role_title}</h1><p>{session?.mode === "voice" ? "Voice interview" : "Text interview"} · {session?.difficulty}</p></div><button className="civ-button civ-button--quiet" type="button" onClick={endInterview} disabled={busy}>{busy ? "Ending…" : "End interview"}</button></div>
    <div className="civ-progress"><div className="civ-progress__label"><span>Interview progress</span><b>{Math.min(completedQuestions + 1, turns.length)} of {turns.length}</b></div><div className="civ-progress__track"><span style={{ width: `${progress}%` }} /></div></div>
    {session?.mode === "voice" ? <div className="civ-voice-layout">
      <section className="civ-voice-stage"><div className="civ-voice-stage__badge"><span /> AI interviewer</div><div className={`civ-interviewer-portrait civ-voice-visual--${voiceState.phase}`} role="img" aria-label="Illustration of a professional female interviewer"><img className="civ-interviewer-portrait__image" src="/assets/interviewer-portrait.png" alt="Professional female interviewer" /><div className="civ-voice-status" aria-live="polite"><AudioLines size={17} /> {statusCopy[voiceState.phase] || "Voice interview"}</div></div></section>
      <section className="civ-voice-side">{feedbackCard}<div className="civ-question-panel"><span className="civ-label">{current.is_follow_up ? "Follow-up question" : `Question ${currentIndex + 1}`}</span><h2>{current.question}</h2>{!voiceEnabled && <p className="civ-voice-note">Start voice when you are ready. The microphone stays off until you choose Start Answer.</p>}{voiceState.phase === "ready" && voiceEnabled && <p className="civ-voice-note">Take a moment to think. Start answering whenever you are ready.</p>}</div>
        <div className={`civ-waveform${voiceState.phase === "listening" ? " is-listening" : ""}`} role="img" aria-label={voiceState.phase === "listening" ? `Live microphone input level ${Math.round(voice.inputLevel * 100)} percent` : "Microphone is off"}>{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ "--bar-height": `${8 + voice.inputLevel * (12 + ((index * 13) % 32))}px` }} />)}</div>
        <div className="civ-voice-controls">
          {!voiceEnabled ? <button type="button" className="civ-button civ-button--outline" onClick={startVoiceInterview} disabled={busy}><AudioLines size={16} /> Start Voice Interview</button>
            : voiceState.phase === "ready" ? <button type="button" className="civ-button civ-button--primary" onClick={startAnswer} disabled={busy}><Mic size={16} /> Start Answer</button>
              : voiceState.phase === "listening" && voice.status !== "listening" ? <span><LoaderCircle className="civ-spin" size={16} /> {voice.status === "connecting" ? "Connecting voice…" : "Preparing microphone…"}</span>
                : voiceState.phase === "listening" ? <><button type="button" className="civ-button civ-button--primary" onClick={finishAnswer} disabled={busy}><Check size={16} /> Finish Answer</button><button type="button" className="civ-button civ-button--quiet" onClick={pauseVoice} disabled={busy}><Pause size={16} /> Pause</button><span className="civ-voice-timer">{mmss}</span></>
                : voiceState.phase === "paused" ? <><button type="button" className="civ-button civ-button--outline" onClick={resumeVoice} disabled={busy}><Play size={16} /> Resume Answer</button><button type="button" className="civ-button civ-button--primary" onClick={finishAnswer} disabled={busy}><Check size={16} /> Finish Answer</button></>
                  : voiceState.phase === "error" && activeAnswerIdRef.current === current.id && voice.status !== "idle" ? <><button type="button" className="civ-button civ-button--outline" onClick={resumeVoice} disabled={busy}><Mic size={16} /> Retry Voice</button><button type="button" className="civ-button civ-button--primary" onClick={finishAnswer} disabled={busy || !(draft || voice.transcript || voice.interimTranscript).trim()}><Check size={16} /> Finish Answer</button></>
                    : <span><LoaderCircle className={voiceState.phase === "speaking" || voiceState.phase === "evaluating" || voiceState.phase === "finalizing" || voice.status === "finalizing" || ttsStatus === "loading" ? "civ-spin" : ""} size={16} /> {voice.status === "connecting" ? "Connecting voice…" : statusCopy[voiceState.phase]}</span>}
        </div>
        {(playbackError || ttsError) && <p className="civ-error" role="status">{playbackError || ttsError}</p>}
        {voiceState.message && <p className="civ-error" role="status">{voiceState.message}</p>}
        {error && <p className="civ-error" role="alert">{error}</p>}
        {answerArea}
        {voiceEnabled && voiceState.phase === "ready" && <div className="civ-voice-controls"><button type="button" className="civ-button civ-button--quiet" onClick={() => speakQuestion(current.question, current.id)} disabled={busy}><Play size={15} /> Hear question again</button></div>}
      </section>
    </div> : <div className="civ-text-layout"><section className="civ-conversation" aria-label="Interview conversation"><div className="civ-conversation__scroll">{turns.filter((turn) => turn.answer).map((turn) => <div className="civ-exchange" key={turn.id}><div className="civ-message civ-message--interviewer"><span>INTERVIEWER</span><p>{turn.question}</p></div><div className="civ-message civ-message--candidate"><span>YOU</span><p>{turn.answer}</p>{turn.evaluation && <span className="civ-score-pill">{turn.evaluation.score}/100</span>}</div></div>)}<div className="civ-message civ-message--interviewer civ-message--current"><span>CURRENT QUESTION</span><p>{current.question}</p></div></div></section><aside className="civ-coach"><div className="civ-coach__head"><Lightbulb size={17} /><b>Coaching tools</b></div><button type="button" className="civ-tip-toggle" aria-expanded={showTip} onClick={() => setShowTip((value) => !value)}><span><b>STAR structure</b><small>Use Situation, Task, Action and Result for experience questions.</small></span><span className={`civ-switch${showTip ? " is-on" : ""}`} /></button>{showTip && <div className="civ-star"><span><b>S</b> Situation</span><span><b>T</b> Task</span><span><b>A</b> Action</span><span><b>R</b> Result</span></div>}{error && <p className="civ-error" role="alert">{error}</p>}</aside><section className="civ-text-compose">{feedbackCard}{answerArea}</section></div>}
  </InterviewerShell>;
}
