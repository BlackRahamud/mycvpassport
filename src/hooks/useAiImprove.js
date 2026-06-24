// =============================================================
// src/hooks/useAiImprove.js
//
// Direct "Improve with AI" flow shared by the Summary and Experience
// editors. One click fires a single, UNCACHED rewrite of the entire
// description text and returns three full alternatives. There is no
// pick-a-bullet step and no Continue button — generation starts on the
// click that opened the flow.
//
// "Always fresh": the call goes straight to POST /api/ai?action=tailor
// (section "description") with no query_cache / memo layer, so re-running
// it yields genuinely new phrasings. The server uses a high temperature
// and a per-call style seed; the client just has to NOT cache.
//
// Network: routed through safeFetch (the boot-captured pristine fetch) so
// a Clarity / analytics fetch monkey-patch can never leave the promise
// hanging after a 200. AbortController + a getSession() timeout race turn
// any hang into a visible, retryable error instead of an endless ring.
//
// Credits: each successful generation decrements one ai_credits_used
// credit server-side. A 402 (free tier exhausted) is surfaced to the
// caller via onExhausted() so the existing upgrade modal can open.
// =============================================================

import { useCallback, useRef, useState } from "react";
import { supabase } from "../appSupabaseClient";
import safeFetch from "../lib/net/safeFetch";

const SESSION_TIMEOUT_MS = 10000;
const FETCH_TIMEOUT_MS = 45000; // under api/ai.js maxDuration (60s)

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        const e = new Error(label || "Timed out");
        e.name = "TimeoutError";
        reject(e);
      }, ms)
    ),
  ]);
}

export default function useAiImprove({ onCreditsUpdate, onExhausted } = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState(null); // string[3] | null
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);

  const reset = useCallback(() => {
    setOptions(null);
    setError(null);
  }, []);

  // input: { text, field: 'summary'|'experience', role?, company?,
  //          target_role?, target_market?, name? }
  const improve = useCallback(
    async (input) => {
      if (inFlightRef.current) return;
      const text = String(input?.text || "").trim();
      if (!text) {
        setError("Add some text first, then improve it with AI.");
        return;
      }
      inFlightRef.current = true;
      setIsGenerating(true);
      setError(null);
      setOptions(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const { data: { session } = {} } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          "Session lookup timed out"
        );
        const token = session?.access_token;
        if (!token) {
          setError("Please sign in again.");
          return;
        }

        const res = await safeFetch("/api/ai?action=tailor", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ section: "description", input }),
        });

        let data = {};
        let rawBody = "";
        try {
          rawBody = await res.text();
          data = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          /* non-JSON body (HTML error page) — leave data as {} */
        }

        if (res.status === 402) {
          // Free tier exhausted — reflect 0 locally and hand off to upgrade.
          if (onCreditsUpdate) onCreditsUpdate(0);
          if (onExhausted) onExhausted();
          return;
        }

        if (!res.ok || !data.ok || !Array.isArray(data.alternatives) || data.alternatives.length < 3) {
          console.error("[builder AI improve] failed", res.status, data?.error || rawBody.slice(0, 300));
          setError(
            data?.error
              ? `${data.error} (${res.status})`
              : `AI request failed (${res.status}). Please try again.`
          );
          return;
        }

        setOptions(data.alternatives.slice(0, 3));
        if (onCreditsUpdate) onCreditsUpdate(data.credits_remaining);
      } catch (e) {
        const isTimeout = e?.name === "AbortError" || e?.name === "TimeoutError";
        console.error("[builder AI improve] threw", e?.name, e?.message || e);
        setError(
          isTimeout
            ? "Couldn't generate — the AI service didn't respond. Please try again."
            : "Couldn't reach the AI service. Check your connection and retry."
        );
      } finally {
        clearTimeout(timeoutId);
        inFlightRef.current = false;
        setIsGenerating(false);
      }
    },
    [onCreditsUpdate, onExhausted]
  );

  return { isGenerating, options, error, improve, reset };
}
