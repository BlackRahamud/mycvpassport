-- 010_transform_sessions.sql — Upload & Transform backend schema
--
-- One row per transform attempt. The frontend extracts CV text client-side
-- (unpdf for PDF, mammoth for DOCX) and posts text + a five-question
-- regional intake to /api/transform-upload, which inserts a row here.
-- Pro and Express Pass users land directly on status='paid'; Free tier
-- routes through /api/transform-pay → Ziina → webhook, which flips
-- status to 'paid' and stamps paid_at. /api/transform-run is gated on
-- status='paid', invokes Claude, and writes cv_data on success.
--
-- All semantic CV state (the shape Builder reads) lives in cv_data jsonb
-- — it conforms to cvShared.EMPTY_RESUME exactly. The session is the
-- audit + payment + diagnostic envelope around that single output.
--
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

-- ---------------------------------------------------------------------
-- Table: transform_sessions
-- ---------------------------------------------------------------------
create table transform_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  -- Lifecycle. created → awaiting_payment → paid → transforming →
  -- transformed | error. Pro / Express Pass users skip awaiting_payment
  -- and jump straight to 'paid' at upload time.
  status text not null default 'created' check (status in (
    'created', 'awaiting_payment', 'paid', 'transforming', 'transformed', 'error'
  )),

  -- Snapshot of the user's plan at session creation. Drives frontend
  -- messaging ("Free with your Active Hunter plan" vs "Unlock for AED 49")
  -- and gives an audit trail of how each tier consumed transforms over
  -- time, even if the user later up- or downgrades.
  user_plan text not null default 'free' check (user_plan in (
    'free', 'express', 'pro'
  )),

  -- Five-question regional intake captured in the modal before upload.
  -- Shape: { target_market, target_city, target_role, language_pref,
  --         experience_level }. Stored as jsonb so we can add intake
  -- questions without a migration.
  intake jsonb not null default '{}'::jsonb,

  -- Source file metadata + raw extracted text.
  -- source_sha256 lets us detect re-uploads of the same file (UX hint:
  -- "you already transformed this CV") and cluster regression evals.
  -- raw_extracted_text is cleared by /api/transform-run after a
  -- successful transform (TRANSFORM_RETAIN_RAW=0 default). For
  -- abandoned / errored / never-paid sessions, the periodic cleanup
  -- (see expires_at below) wipes raw_extracted_text after 72 hours
  -- so source CV text is never retained beyond its useful life.
  source_kind text check (source_kind in ('pdf', 'docx')),
  source_chars int,
  source_sha256 text,
  raw_extracted_text text,

  -- Final canonical Builder shape (cvShared.EMPTY_RESUME). Populated by
  -- transform-run on a successful Claude round-trip.
  cv_data jsonb,

  -- Claude metadata. model is the literal model id used (e.g.
  -- claude-sonnet-4-6); token counts come from the API response.
  model text,
  tokens_in int,
  tokens_out int,

  -- Payment linkage. amount_fils is the Ziina-native fils value
  -- (4900 = AED 49). NULL for Pro/Express sessions that didn't pay.
  -- payment_intent_id ties back to the Ziina intent; payment_url is
  -- the Ziina-hosted checkout link returned at intent creation, stored
  -- so /api/transform-pay can hand back the same URL on a retry
  -- without spinning up a second intent. The webhook flips
  -- status='paid' and stamps paid_at when it arrives.
  amount_fils int,
  payment_intent_id text,
  payment_url text,
  paid_at timestamp with time zone,

  -- Error state when status='error'. error_code is machine-readable
  -- ('extract_too_short', 'claude_failed', 'invalid_intake', ...);
  -- error_message is a human-readable line for the founder's logs.
  error_code text,
  error_message text,

  created_at timestamp with time zone default now(),

  -- Privacy expiry. The cleanup query (run via pg_cron or manually):
  --   update transform_sessions set raw_extracted_text = null
  --   where expires_at < now() and raw_extracted_text is not null;
  -- wipes source CV text 72 hours after the row was created. Successful
  -- transforms already null raw_extracted_text immediately; this is the
  -- safety net for abandoned / awaiting_payment / errored sessions.
  expires_at timestamp with time zone not null default (now() + interval '72 hours')
);

-- ---------------------------------------------------------------------
-- Indexes
--   1. (user_id, created_at desc) — "my recent transforms" lookups.
--   2. payment_intent_id (partial, unique) — webhook lookup by intent
--      and protection against double-processing the same Ziina event.
-- ---------------------------------------------------------------------
create index transform_sessions_user_created_idx
  on transform_sessions (user_id, created_at desc);

create unique index transform_sessions_payment_intent_idx
  on transform_sessions (payment_intent_id)
  where payment_intent_id is not null;

-- ---------------------------------------------------------------------
-- Row Level Security — SELECT-only for authenticated users.
--
-- Authenticated users can READ their own sessions (powers a future
-- "my transforms" UI, realtime subscriptions, polling fallbacks). They
-- CANNOT directly INSERT/UPDATE/DELETE — every write goes through the
-- service-role-keyed server endpoints so the payment gate, atomic
-- locks, and intake validation are enforced server-side. Without this
-- restriction a free user could UPDATE their own session.status='paid'
-- via the Supabase REST API and bypass /api/transform-pay entirely.
-- ---------------------------------------------------------------------
alter table transform_sessions enable row level security;

create policy "Users read their transform_sessions"
  on transform_sessions for select
  using (auth.uid() = user_id);
