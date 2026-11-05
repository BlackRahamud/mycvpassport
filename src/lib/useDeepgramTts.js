import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../appSupabaseClient";

export default function useDeepgramTts() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const sequenceRef = useRef(0);

  const cleanupAudio = useCallback(() => {
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

  const cancel = useCallback(() => {
    sequenceRef.current += 1;
    cleanupAudio();
    setStatus("idle");
  }, [cleanupAudio]);

  const speak = useCallback(async (text, onEnded) => {
    if (typeof text !== "string" || !text.trim() || text.length > 1200) return false;
    const sequence = ++sequenceRef.current;
    cleanupAudio();
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
      if (!blob.size || (blob.type && !blob.type.includes("audio"))) throw new Error("Question audio could not be played. Read the question and continue when ready.");
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (sequence !== sequenceRef.current) return;
        cleanupAudio();
        setStatus("idle");
        onEnded?.();
      };
      audio.onerror = () => {
        if (sequence !== sequenceRef.current) return;
        cleanupAudio();
        setError("Question audio could not be played. Read the question and continue when ready.");
        setStatus("error");
      };
      await audio.play();
      if (sequence !== sequenceRef.current) return false;
      setStatus("speaking");
      return true;
    } catch (cause) {
      if (sequence !== sequenceRef.current) return false;
      cleanupAudio();
      const message = cause?.name === "NotAllowedError"
        ? "Browser audio was blocked. Use Hear Question again to allow playback, or read the question on screen."
        : cause?.message || "Question audio could not be played. Read the question and continue when ready.";
      setError(message);
      setStatus("error");
      return false;
    }
  }, [cleanupAudio]);

  useEffect(() => () => {
    sequenceRef.current += 1;
    cleanupAudio();
  }, [cleanupAudio]);

  return { speak, cancel, status, error };
}
