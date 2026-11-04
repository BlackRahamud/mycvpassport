import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AudioLines, Check, ChevronRight, Lightbulb, LoaderCircle, Mic, MicOff, Pause, Play } from "lucide-react";
import { callPracticeAI, loadPracticeSession, loadPracticeTurns } from "../../lib/candidatePractice";
import { initialPracticeVoiceState, practiceVoiceReducer } from "../../lib/practiceInterviewVoiceMachine";
import InterviewerShell from "./InterviewerShell";

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const SPEECH_RESTART_DELAY = 350;
const SPEECH_END_FALLBACK_DELAY = 1800;

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
  const [voiceState, dispatchVoice] = useReducer(practiceVoiceReducer, initialPracticeVoiceState);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const [showTip, setShowTip] = useState(true);
  const [timer, setTimer] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const recognitionRef = useRef(null);
  const recognitionIntentRef = useRef(null);
  const recognitionRestartRef = useRef(null);
  const finishFallbackRef = useRef(null);
  const voiceSessionActiveRef = useRef(false);
  const voiceListeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const meterFrameRef = useRef(null);
  const voicePhaseRef = useRef(voiceState.phase);
  const busyRef = useRef(false);
  const speechSupported = Boolean(getSpeechRecognition());
  const current = useMemo(() => turns.find((turn) => !turn.answer) || null, [turns]);
  const currentIndex = current ? turns.findIndex((turn) => turn.id === current.id) : turns.length;
  const progress = turns.length ? Math.round(((currentIndex + (current ? 0 : 1)) / turns.length) * 100) : 0;

  useEffect(() => { voicePhaseRef.current = voiceState.phase; }, [voiceState.phase]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  const refresh = useCallback(async () => {
    const [nextSession, nextTurns] = await Promise.all([loadPracticeSession(sessionId), loadPracticeTurns(sessionId)]);
    if (!nextSession) throw new Error("This interview could not be found in your account.");
    setSession(nextSession);
    setTurns(nextTurns);
    return { nextSession, nextTurns };
  }, [sessionId]);

  const stopMeter = useCallback(() => {
    if (meterFrameRef.current !== null) window.cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    setMicLevel(0);
  }, []);

  const releaseMicrophone = useCallback(() => {
    stopMeter();
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  }, [stopMeter]);

  const startMeter = useCallback((stream) => {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) return;
    try {
      const context = new AudioContextType();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      const samples = new Uint8Array(analyser.fftSize);
      const readLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const value = (sample - 128) / 128;
          sum += value * value;
        }
        setMicLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
        meterFrameRef.current = window.requestAnimationFrame(readLevel);
      };
      readLevel();
    } catch {
      // Speech recognition remains usable if the optional visual meter is unavailable.
      analyserRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback((intent) => {
    window.clearTimeout(recognitionRestartRef.current);
    recognitionRestartRef.current = null;
    recognitionIntentRef.current = intent;
    const recognition = recognitionRef.current;
    if (!recognition) return false;
    try { recognition.stop(); } catch { recognitionRef.current = null; }
    return true;
  }, []);

  const finalizeTranscript = useCallback(() => {
    window.clearTimeout(finishFallbackRef.current);
    finishFallbackRef.current = null;
    recognitionIntentRef.current = null;
    const transcript = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim().slice(0, 12000);
    setDraft(transcript);
    setSelectedChoice("");
    stopMeter();
    dispatchVoice({ type: "TRANSCRIPT_READY" });
    if (!transcript) setError("No speech was captured. Type your answer below or resume the microphone and try again.");
  }, [stopMeter]);

  const startRecognition = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition || !voiceSessionActiveRef.current || !voiceListeningRef.current || recognitionRef.current || busyRef.current) return;
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript?.trim() || "";
        if (!transcript) continue;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim().slice(0, 12000);
        } else {
          interim += `${interim ? " " : ""}${transcript}`;
        }
      }
      interimTranscriptRef.current = interim;
      setDraft(`${finalTranscriptRef.current}${finalTranscriptRef.current && interim ? " " : ""}${interim}`.slice(0, 12000));
    };
    recognition.onerror = (event) => {
      const fatal = ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(event.error);
      if (!fatal) return; // no-speech/aborted are normal browser session endings; onend restarts them.
      voiceSessionActiveRef.current = false;
      voiceListeningRef.current = false;
      recognitionIntentRef.current = "error";
      releaseMicrophone();
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone permission was denied. You can type your answer instead."
        : event.error === "audio-capture"
          ? "No microphone is available. Connect one or type your answer instead."
          : "Speech recognition is unavailable for this language. Type your answer instead.";
      setError(message);
      dispatchVoice({ type: "RECOGNITION_ERROR", message });
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      const intent = recognitionIntentRef.current;
      recognitionIntentRef.current = null;
      if (intent === "finish") {
        finalizeTranscript();
        return;
      }
      if (intent === "pause") {
        dispatchVoice({ type: "RECOGNITION_ENDED", intentional: "pause" });
        return;
      }
      if (intent === "error" || !voiceSessionActiveRef.current || !voiceListeningRef.current || busyRef.current) return;
      dispatchVoice({ type: "RECOGNITION_ENDED" });
      recognitionRestartRef.current = window.setTimeout(startRecognition, SPEECH_RESTART_DELAY);
    };
    recognitionRef.current = recognition;
    recognitionIntentRef.current = null;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      const message = "The microphone could not start. Try again or type your answer instead.";
      setError(message);
      dispatchVoice({ type: "RECOGNITION_ERROR", message });
      voiceListeningRef.current = false;
    }
  }, [dispatchVoice, finalizeTranscript, releaseMicrophone]);

  const speakQuestion = useCallback((question) => {
    if (!question || !voiceSessionActiveRef.current) return;
    const synth = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (!synth || !Utterance) {
      voiceListeningRef.current = true;
      dispatchVoice({ type: "SPEECH_FAILED", canListen: true, message: "Speech playback is unavailable; listening for your answer." });
      startRecognition();
      return;
    }
    window.clearTimeout(recognitionRestartRef.current);
    recognitionRestartRef.current = null;
    voiceListeningRef.current = false;
    stopRecognition("question");
    synth.cancel();
    const utterance = new Utterance(question);
    utterance.onstart = () => dispatchVoice({ type: "PERMISSION_GRANTED" });
    utterance.onend = () => {
      if (!voiceSessionActiveRef.current) return;
      // Leave a short acoustic gap so the recognition engine cannot capture the AI voice.
      window.setTimeout(() => {
        if (!voiceSessionActiveRef.current) return;
        voiceListeningRef.current = true;
        dispatchVoice({ type: "SPEECH_FINISHED" });
        startRecognition();
      }, SPEECH_RESTART_DELAY);
    };
    utterance.onerror = () => {
      if (!voiceSessionActiveRef.current) return;
      const message = "Question audio could not play. The microphone is ready, or you can read and type your answer.";
      setError(message);
      voiceListeningRef.current = true;
      dispatchVoice({ type: "SPEECH_FAILED", canListen: true, message });
      startRecognition();
    };
    synth.speak(utterance);
  }, [dispatchVoice, startRecognition, stopRecognition]);

  const startVoiceInterview = async () => {
    if (voiceSessionActiveRef.current || busy) return;
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      const message = "Continuous speech recognition is not supported in this browser. You can still type your answers.";
      setError(message);
      dispatchVoice({ type: "PERMISSION_DENIED", message });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "Microphone access is unavailable in this browser. You can still type your answers.";
      setError(message);
      dispatchVoice({ type: "PERMISSION_DENIED", message });
      return;
    }
    dispatchVoice({ type: "START" });
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      voiceSessionActiveRef.current = true;
      voiceListeningRef.current = false;
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      startMeter(stream);
      dispatchVoice({ type: "PERMISSION_GRANTED" });
      speakQuestion(current?.question);
    } catch (permissionError) {
      const message = permissionError?.name === "NotFoundError" || permissionError?.name === "DevicesNotFoundError"
        ? "No microphone was found. Connect one or type your answer instead."
        : "Microphone permission was denied. You can type your answer instead.";
      setError(message);
      dispatchVoice({ type: "PERMISSION_DENIED", message });
    }
  };

  const pauseVoice = () => {
    voiceListeningRef.current = false;
    stopMeter();
    stopRecognition("pause");
    dispatchVoice({ type: "PAUSE" });
  };

  const resumeVoice = () => {
    if (!voiceSessionActiveRef.current) return;
    setError("");
    if (mediaStreamRef.current) startMeter(mediaStreamRef.current);
    voiceListeningRef.current = true;
    dispatchVoice({ type: "RESUME" });
    startRecognition();
  };

  const finishAnswer = () => {
    if (voiceState.phase !== "listening") return;
    voiceListeningRef.current = false;
    stopMeter();
    dispatchVoice({ type: "FINISH_ANSWER" });
    const stopping = stopRecognition("finish");
    if (stopping) {
      finishFallbackRef.current = window.setTimeout(finalizeTranscript, SPEECH_END_FALLBACK_DELAY);
    } else {
      finalizeTranscript();
    }
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
        if (live && nextSession.mode === "voice" && !speechSupported) {
          const message = "Continuous speech recognition is not supported in this browser. You can still type your answers.";
          setError(message);
          dispatchVoice({ type: "PERMISSION_DENIED", message });
        }
      } catch (loadError) {
        if (live) setError(loadError.message || "The interview could not be opened.");
      } finally {
        if (live) { setLoading(false); setBusy(false); }
      }
    })();
    return () => {
      live = false;
      voiceSessionActiveRef.current = false;
      voiceListeningRef.current = false;
      window.clearTimeout(recognitionRestartRef.current);
      window.clearTimeout(finishFallbackRef.current);
      recognitionIntentRef.current = "pause";
      try { recognitionRef.current?.stop?.(); } catch { /* already stopped */ }
      recognitionRef.current = null;
      window.speechSynthesis?.cancel?.();
      releaseMicrophone();
    };
  }, [refresh, sessionId, navigate, speechSupported, releaseMicrophone]);

  useEffect(() => {
    if (voiceState.phase !== "listening") return undefined;
    const timerId = window.setInterval(() => setTimer((value) => value + 1), 1000);
    return () => window.clearInterval(timerId);
  }, [voiceState.phase]);

  useEffect(() => { setDraft(""); setSelectedChoice(""); }, [current?.id]);

  const submitAnswer = async () => {
    const answer = (selectedChoice || draft).trim();
    if (!current || !answer || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    voiceListeningRef.current = false;
    stopMeter();
    stopRecognition("pause");
    dispatchVoice({ type: "SUBMIT" });
    try {
      const result = await callPracticeAI({ task: "evaluate", sessionId, turnId: current.id, answer });
      const { nextTurns } = await refresh();
      setDraft("");
      setSelectedChoice("");
      setSubmittedFeedback({ question: current.question, answer, evaluation: result.evaluation, followUp: result.followUp });
      const voiceActive = voiceSessionActiveRef.current;
      dispatchVoice({ type: "EVALUATION_DONE", voiceActive });
      if (voiceActive) {
        finalTranscriptRef.current = "";
        interimTranscriptRef.current = "";
        const next = nextTurns.find((turn) => !turn.answer);
        if (next) speakQuestion(next.question);
      }
    } catch (submitError) {
      setError(submitError.message || "Your answer could not be reviewed. Any saved answer is safe; retry to continue.");
      dispatchVoice({ type: "RETRY_READY", voiceActive: voiceSessionActiveRef.current });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const endInterview = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    voiceSessionActiveRef.current = false;
    voiceListeningRef.current = false;
    stopMeter();
    stopRecognition("pause");
    window.speechSynthesis?.cancel?.();
    releaseMicrophone();
    dispatchVoice({ type: "END" });
    try {
      await callPracticeAI({ task: "end", sessionId });
      navigate(`/interviewer/report/${sessionId}`);
    } catch (endError) {
      setError(endError.message || "The interview could not be ended. Your saved answers are unchanged; please retry.");
      dispatchVoice({ type: "RETRY_READY", voiceActive: false });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const statusCopy = {
    ready: "Ready to begin voice interview",
    requesting_permission: "Allow microphone access to start",
    speaking: "AI interviewer is speaking",
    listening: "Listening to your answer",
    finalizing: "Finalizing transcript",
    editing: "Review and edit your transcript",
    evaluating: "Reviewing your answer",
    review: "Answer reviewed",
    paused: "Microphone paused",
    fallback: "Text answer available",
    ended: "Interview ended",
  };
  const mmss = `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`;

  if (loading) return <InterviewerShell showNav={false}><div className="civ-panel civ-empty"><LoaderCircle className="civ-spin" size={22} />Preparing your interview…</div></InterviewerShell>;
  if (error && !session) return <InterviewerShell showNav={false}><div className="civ-panel civ-empty"><h2>Interview unavailable</h2><p>{error}</p><Link className="civ-button civ-button--outline" to="/interviewer/history">My interviews</Link></div></InterviewerShell>;

  const feedbackCard = submittedFeedback && <section className="civ-live-feedback" aria-live="polite"><div className="civ-live-feedback__head"><span><Check size={16} /> Answer reviewed</span><b>{submittedFeedback.evaluation.score}/100</b></div><p className="civ-live-feedback__question">{submittedFeedback.question}</p>{submittedFeedback.evaluation.strengths?.[0] && <p><strong>Strength:</strong> {submittedFeedback.evaluation.strengths[0]}</p>}{submittedFeedback.evaluation.improvements?.[0] && <p><strong>Try next:</strong> {submittedFeedback.evaluation.improvements[0]}</p>}{submittedFeedback.followUp && <p className="civ-live-feedback__followup">A follow-up question will clarify one part of your answer.</p>}<button type="button" className="civ-button civ-button--outline" onClick={() => setSubmittedFeedback(null)}>Continue <ChevronRight size={15} /></button></section>;
  if (!current && session) return <InterviewerShell showNav={false}><div className="civ-end-state"><div className="civ-panel civ-empty"><h2>You have answered every question</h2><p>Your responses are saved. End the interview to open your report. Report generation can be retried later.</p>{error && <p className="civ-error" role="alert">{error}</p>}<button className="civ-button civ-button--primary" type="button" disabled={busy} onClick={endInterview}>{busy ? "Ending interview…" : "End interview and view report"}</button><Link className="civ-button civ-button--outline" to="/interviewer/history">My interviews</Link></div>{feedbackCard}</div></InterviewerShell>;

  const completedQuestions = turns.filter((turn) => turn.answer).length;
  const answerArea = <div className="civ-answer"><label htmlFor="civ-answer">{voiceState.phase === "editing" ? "Transcript preview — edit before submitting" : "Your answer"}</label>{current?.choices?.length > 0 && <fieldset className="civ-choices"><legend>Choose an option or write your own response</legend>{current.choices.map((choice) => <button key={choice} type="button" className={`civ-choice${selectedChoice === choice ? " is-selected" : ""}`} onClick={() => { setSelectedChoice(choice); setDraft(""); }}>{choice}</button>)}</fieldset>}<textarea id="civ-answer" value={draft} onChange={(event) => { setDraft(event.target.value); setSelectedChoice(""); }} placeholder={voiceSessionActiveRef.current ? "Your speech transcript appears here. You can edit it before submitting." : "Use a specific example. You can edit your response before submitting."} rows={6} maxLength={12000} /><div className="civ-answer__meta">{(selectedChoice || draft).length.toLocaleString()} characters</div><button className="civ-button civ-button--primary" type="button" onClick={submitAnswer} disabled={busy || Boolean(submittedFeedback) || !(selectedChoice || draft).trim()}>{busy ? "Evaluating your answer…" : "Submit answer"}<ChevronRight size={16} /></button></div>;

  return <InterviewerShell showNav={false} backTo="/interviewer/history">
    <div className="civ-room-head"><div><Link to="/interviewer/history" className="civ-room-back">← My interviews</Link><h1>{session?.role_title}</h1><p>{session?.mode === "voice" ? "Voice interview" : "Text interview"} · {session?.difficulty}</p></div><button className="civ-button civ-button--quiet" type="button" onClick={endInterview} disabled={busy}>{busy ? "Ending…" : "End interview"}</button></div>
    <div className="civ-progress"><div className="civ-progress__label"><span>Interview progress</span><b>{Math.min(completedQuestions + 1, turns.length)} of {turns.length}</b></div><div className="civ-progress__track"><span style={{ width: `${progress}%` }} /></div></div>
    {session?.mode === "voice" ? <div className="civ-voice-layout">
      <section className="civ-voice-stage"><div className="civ-voice-stage__badge"><span /> AI interviewer</div><div className={`civ-interviewer-portrait civ-voice-visual--${voiceState.phase}`} role="img" aria-label="Illustration of a professional female interviewer"><img className="civ-interviewer-portrait__image" src="/assets/interviewer-portrait.png" alt="Professional female interviewer" /><div className="civ-voice-status" aria-live="polite"><AudioLines size={17} /> {statusCopy[voiceState.phase] || "Voice interview"}</div></div></section>
      <section className="civ-voice-side">{feedbackCard}<div className="civ-question-panel"><span className="civ-label">{current.is_follow_up ? "Follow-up question" : `Question ${currentIndex + 1}`}</span><h2>{current.question}</h2>{!voiceSessionActiveRef.current && <p className="civ-voice-note">Start voice once to hear questions and answer hands-free. Speech recognition availability depends on your browser.</p>}</div>
        <div className={`civ-waveform${voiceState.phase === "listening" ? " is-listening" : ""}`} role="img" aria-label={analyserRef.current ? `Live microphone input level ${Math.round(micLevel * 100)} percent` : "Microphone level meter unavailable"}>{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ "--bar-height": `${8 + micLevel * (12 + ((index * 13) % 32))}px` }} />)}</div>
        <div className="civ-voice-controls">
          {!voiceSessionActiveRef.current && speechSupported ? <button type="button" className="civ-button civ-button--outline" onClick={startVoiceInterview} disabled={busy || voiceState.phase === "requesting_permission"}><Mic size={16} /> {voiceState.phase === "requesting_permission" ? "Requesting microphone…" : voiceState.phase === "fallback" ? "Try Voice Again" : "Start Voice Interview"}</button> : !voiceSessionActiveRef.current ? <span><MicOff size={15} /> Speech recognition is not supported; type your answer.</span> : voiceState.phase === "listening" ? <button type="button" className="civ-button civ-button--primary" onClick={finishAnswer}><Check size={16} /> Finish Answer</button> : voiceState.phase === "paused" ? <button type="button" className="civ-button civ-button--outline" onClick={resumeVoice}><Play size={16} /> Resume listening</button> : voiceState.phase === "editing" ? <span><Check size={16} /> Review and edit your transcript</span> : voiceState.phase === "evaluating" || voiceState.phase === "speaking" || voiceState.phase === "finalizing" ? <span><LoaderCircle className={voiceState.phase === "evaluating" || voiceState.phase === "finalizing" ? "civ-spin" : ""} size={16} /> {statusCopy[voiceState.phase]}</span> : <button type="button" className="civ-button civ-button--outline" onClick={pauseVoice}><Pause size={16} /> Pause microphone</button>}
          {voiceSessionActiveRef.current && voiceState.phase === "listening" && <button type="button" className="civ-button civ-button--quiet" onClick={pauseVoice}><Pause size={16} /> Pause</button>}
          {voiceState.phase === "listening" && <span className="civ-voice-timer">{mmss}</span>}
        </div>
        {voiceState.message && <p className="civ-error" role="status">{voiceState.message}</p>}
        {error && <p className="civ-error" role="alert">{error}</p>}
        {answerArea}
      </section>
    </div> : <div className="civ-text-layout"><section className="civ-conversation" aria-label="Interview conversation"><div className="civ-conversation__scroll">{turns.filter((turn) => turn.answer).map((turn) => <div className="civ-exchange" key={turn.id}><div className="civ-message civ-message--interviewer"><span>INTERVIEWER</span><p>{turn.question}</p></div><div className="civ-message civ-message--candidate"><span>YOU</span><p>{turn.answer}</p>{turn.evaluation && <span className="civ-score-pill">{turn.evaluation.score}/100</span>}</div></div>)}<div className="civ-message civ-message--interviewer civ-message--current"><span>CURRENT QUESTION</span><p>{current.question}</p></div></div></section><aside className="civ-coach"><div className="civ-coach__head"><Lightbulb size={17} /><b>Coaching tools</b></div><button type="button" className="civ-tip-toggle" aria-expanded={showTip} onClick={() => setShowTip((value) => !value)}><span><b>STAR structure</b><small>Use Situation, Task, Action and Result for experience questions.</small></span><span className={`civ-switch${showTip ? " is-on" : ""}`} /></button>{showTip && <div className="civ-star"><span><b>S</b> Situation</span><span><b>T</b> Task</span><span><b>A</b> Action</span><span><b>R</b> Result</span></div>}{error && <p className="civ-error" role="alert">{error}</p>}</aside><section className="civ-text-compose">{feedbackCard}{answerArea}</section></div>}
  </InterviewerShell>;
}
