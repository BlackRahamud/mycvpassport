-- ═══════════════════════════════════════════════════════════════
-- 011 — Post-a-Job wizard fields
-- ═══════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor (project: evihcqpvoorsdmzjnvjz).
-- Adds columns the /hr/post wizard collects that weren't present in
-- the original 001_hr_jobs_schema. Idempotent — safe to re-run.
--
-- Wizard field → DB column mapping:
--   jobTitle              → title (existing)
--   position              → position (NEW)
--   jobType               → job_type (existing)
--   salaryMin / salaryMax → salary_min / salary_max (existing)
--   salaryUnit            → salary_unit (NEW)
--   educationLevel        → min_education (NEW)
--   relevantSkills        → skills (NEW jsonb)
--   tools                 → tools (NEW jsonb)
--   yearsExperience       → experience_min / experience_max (NEW;
--                           the existing experience_years int is
--                           kept for backward compat)
--   yearsExperiencePolicy → experience_policy (NEW)
--   workAuthPolicy        → work_auth_policy (NEW)
--   screeningQuestionGroups → screening_questions (NEW jsonb)
--   jobDescription (HTML) → description (existing — accepts HTML)
--
-- Plus:
--   source     — NEW. 'hr_portal' for jobs posted via /hr/post.
--                Distinguishes from Scout output and future imports.
--   status     — extended enum. Adds 'active' (per spec) alongside
--                the existing draft/published/closed values.
--                Public read RLS broadened to status IN
--                ('published','active') so wizard-posted jobs are
--                visible to candidates.

-- ─── New columns ───────────────────────────────────────────────

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source text DEFAULT 'hr_portal'
  CHECK (source IN ('hr_portal', 'scout', 'import'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS position text
  CHECK (position IN ('remote', 'hybrid', 'onsite'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_unit text DEFAULT 'per Hour';

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_education text;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_min integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_max integer;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_policy text DEFAULT 'required'
  CHECK (experience_policy IN ('required', 'prefer'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_auth_policy text DEFAULT 'required'
  CHECK (work_auth_policy IN ('required', 'prefer'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS screening_questions jsonb DEFAULT '[]';

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tools  jsonb DEFAULT '[]';

-- ─── Extend status enum to include 'active' ────────────────────

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'published', 'active', 'closed'));

-- ─── Index to back the 10-listing count check ──────────────────
-- Used by the wizard's pre-INSERT guard:
--   SELECT count(*) FROM jobs
--   WHERE hr_id = auth.uid()
--     AND status IN ('active','published')
--     AND source = 'hr_portal';

CREATE INDEX IF NOT EXISTS jobs_hr_status_idx ON jobs(hr_id, status, source);

-- ─── Broaden public read RLS to include 'active' ───────────────

DROP POLICY IF EXISTS "Public can read published jobs" ON jobs;
CREATE POLICY "Public can read live jobs" ON jobs
  FOR SELECT USING (status IN ('published', 'active'));

-- ─── Backfill source for any pre-existing rows that lack it ────
-- (column has DEFAULT 'hr_portal' so new rows are fine; this catches
--  rows inserted before this migration ran.)

UPDATE jobs SET source = 'hr_portal' WHERE source IS NULL;
