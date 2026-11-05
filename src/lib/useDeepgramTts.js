import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../appSupabaseClient";

const AUDIO_ERROR = "Question audio could not be played. Read the question and continue when ready.";

export default function useDeepgramTts() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const sequenceRef = useRef(0);  

  const cleanupPlayback = useCallback(() => {
    const source = sourceRef.current;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* already stopped */ }
      try { source.disconnect(); } catch { /* already disconnected */ }
    }
    sourceRef.current = null;

    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    audioRef.current = null;

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  // Call directly inside the user's Start Voice Interview click handler.
  // Resuming here preserves the browser's user-activation permission while
  // the greeting and audio are fetched asynchronously.
  const unlock = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return Promise.resolve(false);

    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContextClass();
      }
      const context = audioContextRef.current;
      if (context.state === "running") return Promise.resolve(true);
      return context.resume().then(() => context.state === "running").catch(() => false);
    } catch {
      return Promise.resolve(false);
    }
  }, []);

  const cancel = useCallback(() => {
    sequenceRef.current += 1;
    cleanupPlayback();
    setStatus("idle");
  }, [cleanupPlayback]);

  const speak = useCallback(async (text, onEnded) => {
    if (typeof text !== "string" || !text.trim() || text.length > 1200) return false;
    const sequence = ++sequenceRef.current;
    cleanupPlayback();
    setError("");
    setStatus("loading");

    try {
      const { data: { session } = {} } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again to play interview audio.");

      const response = await fetch("/api/deepgram-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
        body: JSON.stringify({ action: "tts", text: text.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Question audio could not be generated.");
      }

      const blob = await response.blob();
      if (sequence !== sequenceRef.current) return false;
      if (!blob.size || (blob.type && !blob.type.includes("audio"))) throw new Error(AUDIO_ERROR);

      const context = audioContextRef.current;
      if (context && context.state !== "closed") {
        if (context.state === "suspended") await context.resume();
        if (sequence !== sequenceRef.current) return false;
        const buffer = await context.decodeAudioData(await blob.arrayBuffer());
        if (sequence !== sequenceRef.current) return false;

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.onended = () => {
          if (sequence !== sequenceRef.current) return;
          cleanupPlayback();
          setStatus("idle");
          onEnded?.();
        };
        sourceRef.current = source;
        source.start(0);
        setStatus("speaking");
        return true;
      }

      // Compatibility fallback for browsers without Web Audio support.
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (sequence !== sequenceRef.current) return;
        cleanupPlayback();
        setStatus("idle");
        onEnded?.();
      };
      audio.onerror = () => {
        if (sequence !== sequenceRef.current) return;
        cleanupPlayback();
        setError(AUDIO_ERROR);
        setStatus("error");
      };
      await audio.play();
      if (sequence !== sequenceRef.current) return false;
      setStatus("speaking");
      return true;
    } catch (cause) {
      if (sequence !== sequenceRef.current) return false;
      cleanupPlayback();
      const message = cause?.name === "NotAllowedError"
        ? "Browser audio was blocked. Select Hear question again or read the question on screen."
        : cause?.message || AUDIO_ERROR;
      setError(message);
      setStatus("error");
      return false;
    }
  }, [cleanupPlayback]);

  useEffect(() => () => {
    sequenceRef.current += 1;
    cleanupPlayback();
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") context.close().catch(() => {});
  }, [cleanupPlayback]);

  return { speak, unlock, cancel, status, error };
}
