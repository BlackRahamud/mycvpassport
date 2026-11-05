import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../appSupabaseClient";

const TARGET_RATE = 16000;
const CONNECT_TIMEOUT_MS = 12000;
const FINALIZE_TIMEOUT_MS = 8000;
const FLUX_ENDPOINT = "wss://api.deepgram.com/v2/listen";

export function isCurrentDeepgramEvent(activeId, activeSequence, eventId, eventSequence) {
  return Boolean(activeId) && activeId === eventId && activeSequence === eventSequence;
}

export function createFluxUrl() {
  const params = new URLSearchParams({
    model: "flux-general-en",
    encoding: "linear16",
    sample_rate: String(TARGET_RATE),
    eot_threshold: "1.0",
    eot_timeout_ms: "60000",
  });
  return `${FLUX_ENDPOINT}?${params.toString()}`;
}

export function appendFluxTurn(segments, seenTurnIds, payload) {
  if (payload?.type !== "TurnInfo" || payload.event !== "EndOfTurn") return { segments, seenTurnIds, changed: false };
  const text = String(payload.transcript || "").replace(/\s+/g, " ").trim();
  if (!text) return { segments, seenTurnIds, changed: false };
  const key = `${payload.turn_index ?? "unknown"}:${payload.audio_window_start ?? ""}:${payload.audio_window_end ?? ""}`;
  if (seenTurnIds.has(key)) return { segments, seenTurnIds, changed: false };
  const nextSeen = new Set(seenTurnIds);
  nextSeen.add(key);
  return { segments: [...segments, text], seenTurnIds: nextSeen, changed: true };
}

export function joinTranscriptSegments(segments, interim = "") {
  return [...segments, interim].map((part) => String(part || "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function mergePartialTranscript(previous, next) {
  const left = String(previous || "").trim();
  const right = String(next || "").trim();
  if (!left) return right;
  if (!right || left === right || left.endsWith(right)) return left;
  const leftWords = left.split(/\s+/);
  const rightWords = right.split(/\s+/);
  for (let overlap = Math.min(leftWords.length, rightWords.length); overlap > 0; overlap -= 1) {
    if (leftWords.slice(-overlap).join(" ").toLowerCase() === rightWords.slice(0, overlap).join(" ").toLowerCase()) {
      return [...leftWords, ...rightWords.slice(overlap)].join(" ");
    }
  }
  return `${left} ${right}`;
}

function resampleTo16k(input, inputRate) {
  if (inputRate === TARGET_RATE) return input;
  const ratio = inputRate / TARGET_RATE;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    output[i] = sum / Math.max(1, end - start);
  }
  return output;
}

function pcm16Buffer(samples) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
  }
  return buffer;
}

function errorCopy(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return "Microphone access was denied. You can type your answer instead.";
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") return "No microphone was found. Connect one or type your answer instead.";
  if (error?.name === "NotReadableError" || error?.name === "AbortError") return "The microphone is busy or unavailable. Try again or type your answer instead.";
  return "Voice connection was interrupted. Your transcript is preserved; retry or type your answer instead.";
}

export default function useDeepgramStream() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [inputLevel, setInputLevel] = useState(0);
  const activeIdRef = useRef(null);
  const sequenceRef = useRef(0);
  const finalizedRef = useRef([]);
  const seenTurnIdsRef = useRef(new Set());
  const interimRef = useRef("");
  const carryRef = useRef("");
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const silentGainRef = useRef(null);
  const finishPromiseRef = useRef(null);
  const acceptEventsRef = useRef(false);
  const activeTurnRef = useRef(false);
  const hasPendingAudioRef = useRef(false);
  const closeExpectedRef = useRef(false);

  const publishTranscript = useCallback(() => {
    setTranscript(joinTranscriptSegments(finalizedRef.current));
    setInterimTranscript(interimRef.current || carryRef.current);
  }, []);

  const stopCapture = useCallback(() => {
    setInputLevel(0);
    if (processorRef.current) processorRef.current.onaudioprocess = null;
    try { processorRef.current?.disconnect(); } catch { /* already disconnected */ }
    try { sourceRef.current?.disconnect(); } catch { /* already disconnected */ }
    try { silentGainRef.current?.disconnect(); } catch { /* already disconnected */ }
    processorRef.current = null;
    sourceRef.current = null;
    silentGainRef.current = null;
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    if (contextRef.current && contextRef.current.state !== "closed") contextRef.current.close().catch(() => {});
    contextRef.current = null;
  }, []);

  const closeSocket = useCallback((sendClose = false) => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) return;
    closeExpectedRef.current = true;
    if (sendClose && socket.readyState === WebSocket.OPEN) {
      try { socket.send(JSON.stringify({ type: "CloseStream" })); } catch { /* close below */ }
    }
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      try { socket.close(); } catch { /* already closed */ }
    }
  }, []);

  const connectSocket = useCallback(async (answerId, sequence) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Please sign in again to use voice interview.");
    const tokenResponse = await fetch("/api/deepgram-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
      body: JSON.stringify({ action: "stt_token" }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error || "Speech recognition could not be connected.");
    if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) throw new Error("This answer is no longer active.");

    const socket = new WebSocket(createFluxUrl(), ["bearer", tokenData.access_token]);
    socketRef.current = socket;
    closeExpectedRef.current = false;
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Speech recognition took too long to connect. Try again or type your answer.")), CONNECT_TIMEOUT_MS);
      socket.onopen = () => { window.clearTimeout(timeout); resolve(); };
      socket.onerror = () => { window.clearTimeout(timeout); reject(new Error("Speech recognition could not connect. Check your connection or type your answer.")); };
      socket.onclose = () => {
        window.clearTimeout(timeout);
        if (socketRef.current === socket) socketRef.current = null;
        if (socketRef.current === null && !closeExpectedRef.current && isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) {
          if (acceptEventsRef.current && interimRef.current) carryRef.current = mergePartialTranscript(carryRef.current, interimRef.current);
          interimRef.current = "";
          publishTranscript();
          stopCapture();
          const message = "Speech recognition disconnected. Your received transcript is preserved; retry or type your answer.";
          setError(message);
          setStatus("error");
        }
      };
      socket.onmessage = (event) => {
        if (!acceptEventsRef.current || !isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) return;
        let payload;
        try { payload = JSON.parse(event.data); } catch { return; }
        if (payload.type === "Error") {
          setError("Speech recognition encountered an error. Your received transcript is preserved; retry or type your answer.");
          setStatus("error");
          stopCapture();
          return;
        }
        if (payload.type !== "TurnInfo") return;
        if (payload.event === "StartOfTurn" || payload.event === "Update") {
          activeTurnRef.current = true;
          interimRef.current = mergePartialTranscript(carryRef.current, payload.transcript);
          publishTranscript();
          return;
        }
        if (payload.event === "TurnResumed") {
          activeTurnRef.current = true;
          interimRef.current = mergePartialTranscript(carryRef.current, payload.transcript);
          publishTranscript();
          return;
        }
        if (payload.event === "EndOfTurn") {
          const finalPayload = { ...payload, transcript: mergePartialTranscript(carryRef.current, payload.transcript || interimRef.current) };
          const appended = appendFluxTurn(finalizedRef.current, seenTurnIdsRef.current, finalPayload);
          finalizedRef.current = appended.segments;
          seenTurnIdsRef.current = appended.seenTurnIds;
          activeTurnRef.current = false;
          hasPendingAudioRef.current = false;
          interimRef.current = "";
          carryRef.current = "";
          publishTranscript();
          if (finishPromiseRef.current) finishPromiseRef.current.resolve();
        }
      };
    });
    if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) throw new Error("This answer is no longer active.");
  }, [publishTranscript, stopCapture]);

  const startCapture = useCallback(async (answerId, sequence) => {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!navigator.mediaDevices?.getUserMedia || !AudioContextType || typeof window.WebSocket !== "function") {
      throw new Error("Live voice is not supported in this browser. You can type your answer instead.");
    }
    await connectSocket(answerId, sequence);
    if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    const context = new AudioContextType();
    contextRef.current = context;
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const silentGain = context.createGain();
    silentGain.gain.value = 0;
    processor.onaudioprocess = (event) => {
      if (!acceptEventsRef.current || !isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) return;
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);
      let energy = 0;
      for (const sample of input) energy += sample * sample;
      setInputLevel(Math.min(1, Math.sqrt(energy / input.length) * 4));
      const samples = resampleTo16k(input, context.sampleRate);
      if (samples.length) socket.send(pcm16Buffer(samples));
      if (samples.length) hasPendingAudioRef.current = true;
    };
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(context.destination);
    sourceRef.current = source;
    processorRef.current = processor;
    silentGainRef.current = silentGain;
  }, [connectSocket]);

  const start = useCallback(async (answerId) => {
    if (!answerId || ["connecting", "listening", "finalizing"].includes(status)) return false;
    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    activeIdRef.current = answerId;
    finalizedRef.current = [];
    seenTurnIdsRef.current = new Set();
    interimRef.current = "";
    carryRef.current = "";
    finishPromiseRef.current = null;
    activeTurnRef.current = false;
    hasPendingAudioRef.current = false;
    acceptEventsRef.current = true;
    setTranscript("");
    setInterimTranscript("");
    setError("");
    setStatus("connecting");
    try {
      await startCapture(answerId, sequence);
      if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) return false;
      setStatus("listening");
      return true;
    } catch (cause) {
      if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) return false;
      acceptEventsRef.current = false;
      stopCapture();
      closeSocket(true);
      const message = errorCopy(cause);
      setError(message);
      setStatus("error");
      return false;
    }
  }, [closeSocket, startCapture, status, stopCapture]);

  const pause = useCallback(() => {
    if (status !== "listening") return;
    stopCapture();
    if (socketRef.current?.readyState === WebSocket.OPEN && (activeTurnRef.current || hasPendingAudioRef.current)) {
      try { socketRef.current.send(JSON.stringify({ type: "ForceEndTurn" })); } catch { /* retained transcript remains available */ }
    }
    setStatus("paused");
    setError("");
  }, [status, stopCapture]);

  const resume = useCallback(async (answerId) => {
    if ((status !== "paused" && status !== "error") || !answerId || answerId !== activeIdRef.current) return false;
    if (socketRef.current?.readyState !== WebSocket.OPEN) sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    acceptEventsRef.current = true;
    setError("");
    setStatus("connecting");
    try {
      await startCapture(answerId, sequence);
      if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) return false;
      setStatus("listening");
      return true;
    } catch (cause) {
      if (!isCurrentDeepgramEvent(activeIdRef.current, sequenceRef.current, answerId, sequence)) return false;
      acceptEventsRef.current = false;
      stopCapture();
      closeSocket(true);
      const message = errorCopy(cause);
      setError(message);
      setStatus("error");
      return false;
    }
  }, [closeSocket, startCapture, status, stopCapture]);

  const finish = useCallback(() => {
    if (finishPromiseRef.current?.promise) return finishPromiseRef.current.promise;
    if (status !== "listening" && status !== "paused" && status !== "error") return Promise.resolve(null);
    const answerId = activeIdRef.current;
    setStatus("finalizing");
    stopCapture();
    acceptEventsRef.current = true;
    const socket = socketRef.current;
    const promise = new Promise((resolve) => {
      let timeoutId;
      const settle = (ok, message = "") => {
        if (finishPromiseRef.current?.settled) return;
        if (timeoutId) window.clearTimeout(timeoutId);
        const frozen = joinTranscriptSegments(finalizedRef.current);
        const recoverable = joinTranscriptSegments(finalizedRef.current, interimRef.current || carryRef.current);
        if (ok) {
          acceptEventsRef.current = false;
          closeSocket(true);
          setTranscript(frozen);
          setInterimTranscript("");
          setStatus("idle");
        } else {
          acceptEventsRef.current = false;
          setTranscript(recoverable);
          setInterimTranscript("");
          setError(message);
          setStatus("error");
        }
        finishPromiseRef.current = { ...finishPromiseRef.current, settled: true };
        resolve(ok ? { answerId, transcript: frozen } : { answerId, transcript: recoverable, error: message });
      };
      finishPromiseRef.current = { promise: null, resolve: () => settle(true), settled: false };
      timeoutId = window.setTimeout(() => settle(false, "The final transcript did not arrive. Retry voice to continue, or use the transcript below as a text fallback."), FINALIZE_TIMEOUT_MS);
      if (socket?.readyState === WebSocket.OPEN) {
        if (!activeTurnRef.current && !hasPendingAudioRef.current) {
          if (carryRef.current) {
            settle(false, "The connection ended before the final transcript arrived. Retry voice or use the preserved text as a fallback.");
            return;
          }
          settle(true);
          return;
        }
        try { socket.send(JSON.stringify({ type: "ForceEndTurn" })); }
        catch { settle(false, "Voice finalization could not be sent. Retry voice or use text fallback."); }
      } else {
        settle(false, "The voice connection ended before final transcription. Retry voice or use text fallback.");
      }
    });
    finishPromiseRef.current.promise = promise;
    return promise;
  }, [closeSocket, status, stopCapture]);

  const dispose = useCallback(() => {
    sequenceRef.current += 1;
    activeIdRef.current = null;
    acceptEventsRef.current = false;
    finishPromiseRef.current = null;
    stopCapture();
    closeSocket(true);
    finalizedRef.current = [];
    seenTurnIdsRef.current = new Set();
    interimRef.current = "";
    carryRef.current = "";
    activeTurnRef.current = false;
    hasPendingAudioRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setError("");
    setStatus("idle");
  }, [closeSocket, stopCapture]);

  useEffect(() => () => {
    sequenceRef.current += 1;
    activeIdRef.current = null;
    acceptEventsRef.current = false;
    stopCapture();
    closeSocket(true);
  }, [closeSocket, stopCapture]);

  return { start, pause, resume, finish, dispose, transcript, interimTranscript, status, error, inputLevel };
}
