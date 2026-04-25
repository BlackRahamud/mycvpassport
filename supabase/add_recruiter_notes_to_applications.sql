-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: recruiter notes (Apr 2026)
--
-- Apply via Supabase Studio → SQL Editor → Run.
--
-- Adds a JSONB column to public.applications for HR notes, plus an RPC
-- that appends a note atomically using the JSONB || operator. The RPC
-- runs with SECURITY INVOKER so the existing RLS policy
-- ("HR updates application status" — auth.uid() = hr_id) is enforced
-- naturally; only the row's owning recruiter can append.
--
-- Each note shape: { "text": string, "ts": ISO timestamp, "author": "HR" }
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS recruiter_notes jsonb DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.append_recruiter_note(
  p_app_id uuid,
  p_text   text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE public.applications
  SET
    recruiter_notes = COALESCE(recruiter_notes, '[]'::jsonb)
      || jsonb_build_array(
           jsonb_build_object(
             'text',   p_text,
             'ts',     now(),
             'author', 'HR'
           )
         ),
    updated_at = now()
  WHERE id = p_app_id
  RETURNING recruiter_notes;
$$;

GRANT EXECUTE ON FUNCTION public.append_recruiter_note(uuid, text)
  TO authenticated;
